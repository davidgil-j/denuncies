import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CircleAlert, Minus, Check, Plus, ShieldMinus, ShieldPlus, UserRoundX } from 'lucide-react';
import { getAllProfiles, getManagerPermissions, setManagerPermissions, inviteManager, updateProfile, deleteManager } from '../../lib/supabase.js';
import { fmt } from '../V2Layout.jsx';
import { PERMS } from '../admin/adminKit.jsx';
import { EMAIL_RE } from '../site/fields.jsx';
import { CATEGORIES } from '../canal/shared.jsx';
import { Avatar, Button, Card, Dialog, Field, Skeleton } from '../ui/index.js';
import { usePanel } from './kit.jsx';

const emptyPerms = () => CATEGORIES.map(category => ({ category, can_view: false, can_edit: false, can_reply: false, can_delete: false }));
const nameOf = (person) => person?.full_name || person?.email || '';
const SHOWN_CATS = 3;

/** Casilla de la tabla de permisos; `mixed` es el estado intermedio de la fila «Todos los temas» */
function Tick({ checked, mixed = false, onChange, label, disabled }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = mixed; }, [mixed]);
  return (
    <label className="tm-tick">
      <input ref={ref} type="checkbox" checked={checked} onChange={onChange} aria-label={label} disabled={disabled} />
      <span aria-hidden="true">{mixed ? <Minus size={14} strokeWidth={3.5} /> : <Check size={14} strokeWidth={3.5} />}</span>
    </label>
  );
}

/**
 * «Quién gestiona»: las personas con acceso al panel. Desde aquí se invita, se reparten los temas y
 * los permisos de cada gestor, se nombra o se quita a un administrador y se retira el acceso.
 * Solo lo ve quien administra.
 */
export default function Equipo() {
  const { tr, p, profile, notify, setMembers } = usePanel();
  const s = p.set;
  const [params, setParams] = useSearchParams();
  const catName = (v) => tr.canal.cats[v]?.[0] ?? v;

  const [people, setPeople] = useState(null);
  const [failed, setFailed] = useState(false);
  const [cats, setCats] = useState({}); // id del gestor → categorías que ve

  // Panel de una persona. view: perms | promote | demote | remove | discard
  const [target, setTarget] = useState(null);
  const [view, setView] = useState('perms');
  const [perms, setPerms] = useState(emptyPerms);
  const [original, setOriginal] = useState('');
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [inviting, setInviting] = useState(false);
  const [inv, setInv] = useState({ name: '', email: '' });
  const [invErr, setInvErr] = useState({});
  const [sending, setSending] = useState(false);

  async function load() {
    setFailed(false);
    const { profiles, error: err } = await getAllProfiles();
    if (err) { setFailed(true); setPeople([]); return []; }
    const list = profiles ?? [];
    setPeople(list);
    setMembers(list.length);
    // Resumen de temas de cada gestor para la lista
    const managers = list.filter(x => x.role === 'manager');
    const res = await Promise.all(managers.map(m => getManagerPermissions(m.id)));
    setCats(Object.fromEntries(managers.map((m, i) => [m.id, (res[i].permissions ?? []).filter(x => x.can_view).map(x => x.category)])));
    return list;
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Desde «Primeros pasos» se llega con ?invitar=1: se abre la invitación y se limpia la dirección
  useEffect(() => {
    if (params.get('invitar') !== '1') return;
    setInviting(true);
    const next = new URLSearchParams(params);
    next.delete('invitar');
    setParams(next, { replace: true });
  }, [params, setParams]);

  const dirty = !!target && view !== 'demote' && !loadingPerms && JSON.stringify(perms) !== original;
  useEffect(() => {
    if (!dirty) return undefined;
    const onBefore = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty]);

  async function open(person) {
    setTarget(person);
    setError('');
    if (person.role !== 'manager') { setView('demote'); return; }
    setView('perms');
    setLoadingPerms(true);
    const { permissions } = await getManagerPermissions(person.id);
    const merged = emptyPerms().map(ep => {
      const ex = (permissions ?? []).find(x => x.category === ep.category);
      return ex ? { category: ep.category, can_view: !!ex.can_view, can_edit: !!ex.can_edit, can_reply: !!ex.can_reply, can_delete: !!ex.can_delete } : ep;
    });
    setPerms(merged);
    setOriginal(JSON.stringify(merged));
    setLoadingPerms(false);
  }
  const close = () => { setTarget(null); setError(''); setBusy(false); };
  // Cerrar con cambios sin guardar los perdería: se pregunta antes
  const askClose = () => { if (busy) return; if (dirty && view === 'perms') setView('discard'); else if (view === 'perms' || view === 'demote') close(); else { setError(''); setView(target.role === 'manager' ? 'perms' : 'demote'); } };

  // «Ver» es la base: activar cualquier otro permiso lo activa; quitarlo los quita todos
  function setPerm(row, key, value) {
    const next = { ...row, [key]: value };
    if (key === 'can_view' && !value) { next.can_edit = false; next.can_reply = false; next.can_delete = false; }
    if (key !== 'can_view' && value) next.can_view = true;
    return next;
  }
  const toggle = (i, key) => setPerms(prev => prev.map((row, j) => (j === i ? setPerm(row, key, !row[key]) : row)));
  const toggleCol = (key) => {
    const allOn = perms.every(row => row[key]);
    setPerms(prev => prev.map(row => setPerm(row, key, !allOn)));
  };
  const colState = useMemo(() => Object.fromEntries(PERMS.map(k => {
    const on = perms.filter(row => row[k]).length;
    return [k, { all: on === perms.length, mixed: on > 0 && on < perms.length }];
  })), [perms]);

  async function savePerms() {
    if (busy) return;
    setBusy(true);
    setError('');
    const active = perms.filter(row => PERMS.some(k => row[k]));
    let err = null;
    try { ({ error: err } = await setManagerPermissions(target.id, active)); } catch (e) { err = e; }
    setBusy(false);
    if (err) { setError(s.permsErr); return; }
    setCats(c => ({ ...c, [target.id]: perms.filter(row => row.can_view).map(row => row.category) }));
    notify(s.permsSaved);
    close();
  }

  // Segundo administrador: el canal no debe depender de una sola persona (art. 8.3, relevo del responsable)
  async function doRole(to) {
    if (busy) return;
    setBusy(true);
    setError('');
    let err = null;
    try { ({ error: err } = await updateProfile(target.id, { role: to })); } catch (e) { err = e; }
    setBusy(false);
    if (err) { setError(s.roleErr); return; }
    notify(fmt(to === 'superadmin' ? s.promoted : s.demoted, { name: nameOf(target) }));
    close();
    load();
  }

  async function doRemove() {
    if (busy) return;
    setBusy(true);
    setError('');
    let err = null;
    try { ({ error: err } = await deleteManager(target.id)); } catch (e) { err = e; }
    setBusy(false);
    if (err) { setError(s.removeErr); return; }
    notify(fmt(s.removed, { name: nameOf(target) }));
    close();
    load();
  }

  const closeInvite = () => { if (sending) return; setInviting(false); setInvErr({}); };
  async function sendInvite(e) {
    e.preventDefault();
    if (sending) return;
    const name = inv.name.trim();
    const email = inv.email.trim().toLowerCase();
    const er = {};
    if (!name) er.name = s.errName;
    if (!EMAIL_RE.test(email)) er.email = p.errEmail;
    setInvErr(er);
    if (er.name) { document.getElementById('tm-inv-name')?.focus(); return; }
    if (er.email) { document.getElementById('tm-inv-email')?.focus(); return; }
    setSending(true);
    let res = {};
    // Un error de red o de sesión no debe dejar el botón para siempre en «Enviando…»
    try { res = await inviteManager(email, name); } catch (err) { res = { error: err }; }
    setSending(false);
    // Los errores de la función llegan sin traducir: se muestra siempre un texto propio
    if (res.error) { setInvErr({ form: /already|exist|registered|ja existeix/i.test(res.error.message ?? '') ? s.inviteExists : s.inviteErr }); return; }
    setInv({ name: '', email: '' });
    setInviting(false);
    notify(fmt(s.inviteOk, { email }));
    // Lo siguiente es decirle qué temas lleva: se abre su panel de permisos
    const list = await load();
    const added = list.find(x => x.id === res.userId) ?? list.find(x => x.email === email);
    if (added?.role === 'manager') open(added);
  }

  const summary = (person) => {
    if (person.role !== 'manager') return `${s.roleAdmin} · ${s.seesAll}`;
    const mine = cats[person.id];
    if (!mine) return s.roleManager;
    const names = mine.length > SHOWN_CATS + 1 ? [...mine.slice(0, SHOWN_CATS).map(catName), `+${mine.length - SHOWN_CATS}`] : mine.map(catName);
    return `${s.roleManager} · ${names.length ? names.join(', ') : s.catsNone}`;
  };

  const who = nameOf(target);
  const title = !target ? ''
    : view === 'promote' ? fmt(s.promoteT, { name: who })
    : view === 'demote' ? fmt(s.demoteT, { name: who })
    : view === 'remove' ? fmt(s.removeT, { name: who })
    : fmt(s.permsT, { name: who });
  const back = () => { setError(''); setView('perms'); };
  const actions = !target ? null
    : view === 'perms' ? <Button variant="ink" size="md" onClick={savePerms} busy={busy} disabled={!dirty || loadingPerms}>{busy ? p.saving : s.savePerms}</Button>
    : view === 'discard' ? <><Button variant="soft" size="md" onClick={close}>{s.discard}</Button><Button variant="ink" size="md" onClick={back}>{s.keepEditing}</Button></>
    : view === 'promote' ? <><Button variant="soft" size="md" onClick={back} disabled={busy}>{p.cancel}</Button><Button variant="ink" size="md" onClick={() => doRole('superadmin')} busy={busy}>{s.promote}</Button></>
    : view === 'demote' ? <><Button variant="soft" size="md" onClick={close} disabled={busy}>{p.cancel}</Button><Button variant="danger" size="md" onClick={() => doRole('manager')} busy={busy}>{s.demote}</Button></>
    : <><Button variant="soft" size="md" onClick={back} disabled={busy}>{p.cancel}</Button><Button variant="danger" size="md" onClick={doRemove} busy={busy}>{busy ? s.removing : s.remove}</Button></>;

  return (
    <Card as="section" tone="bg" className="st-card" aria-labelledby="tm-t">
      <div className="st-head">
        <h2 className="st-h" id="tm-t">{s.teamT}</h2>
        <Button variant="report" size="xs" onClick={() => { setInvErr({}); setInviting(true); }} icon={<Plus size={16} strokeWidth={2.8} aria-hidden="true" />}>{s.invite}</Button>
      </div>

      {people === null ? (
        <div role="status" aria-live="polite" className="tm-list"><span className="ds-vh">{p.loading}</span>{[0, 1, 2].map(i => <Skeleton key={i} height={62} className="tm-skel" />)}</div>
      ) : failed ? (
        <div className="pn-error" role="alert"><CircleAlert size={20} strokeWidth={2.2} aria-hidden="true" /><span>{s.teamErr}</span><Button variant="white" size="xs" onClick={() => { setPeople(null); load(); }}>{p.retry}</Button></div>
      ) : (
        <ul className="tm-list">
          {people.map((person, i) => {
            const me = person.id === profile.id;
            return (
              <li key={person.id} className="st-tile">
                <Avatar name={nameOf(person)} tint={i % 4} size="sm" />
                <span className="tm-txt">
                  <b>{nameOf(person)}{me && <span className="tm-you"> · {s.you}</span>}</b>
                  <span>{summary(person)}{person.invited && ` · ${s.invited}`}</span>
                </span>
                {!me && <button type="button" className="st-link" aria-label={fmt(s.changeAria, { name: nameOf(person) })} onClick={() => open(person)}>{s.change}</button>}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog side={target?.role === 'manager'} open={!!target} onClose={askClose} title={title} closeLabel={view === 'perms' ? p.close : undefined} actions={actions} className="tm-dialog">
        {target && view === 'perms' && (
          <>
            {target.email && <p className="tm-mail">{target.email}</p>}
            <p>{s.permsLead}</p>
            {loadingPerms ? <Skeleton height={320} /> : (
              <table className="tm-perms">
                <thead>
                  <tr><td />{PERMS.map(k => <th key={k} scope="col">{s.perm[k]}</th>)}</tr>
                </thead>
                <tbody>
                  <tr className="is-all">
                    <th scope="row">{s.allTopics}</th>
                    {PERMS.map(k => <td key={k}><Tick checked={colState[k].all} mixed={colState[k].mixed} onChange={() => toggleCol(k)} label={fmt(s.permAria, { perm: s.perm[k], cat: s.allTopics })} disabled={busy} /></td>)}
                  </tr>
                  {perms.map((row, i) => (
                    <tr key={row.category}>
                      <th scope="row">{catName(row.category)}</th>
                      {PERMS.map(k => <td key={k}><Tick checked={row[k]} onChange={() => toggle(i, k)} label={fmt(s.permAria, { perm: s.perm[k], cat: catName(row.category) })} disabled={busy} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="tm-hint">{s.permHint}</p>
            {error && <p className="ac-error" role="alert"><CircleAlert size={18} strokeWidth={2.2} aria-hidden="true" />{error}</p>}
            <div className="tm-more">
              <Button variant="bg" size="sm" onClick={() => { setError(''); setView('promote'); }} icon={<ShieldPlus size={16} strokeWidth={2.2} aria-hidden="true" />}>{s.promote}</Button>
              <Button variant="bg" size="sm" className="tm-remove" onClick={() => { setError(''); setView('remove'); }} icon={<UserRoundX size={16} strokeWidth={2.2} aria-hidden="true" />}>{s.remove}</Button>
            </div>
          </>
        )}
        {target && view === 'discard' && <p>{s.unsaved}</p>}
        {target && view === 'promote' && <p>{s.promoteText}</p>}
        {target && view === 'demote' && (
          <>
            {target.email && <p className="tm-mail">{target.email}</p>}
            <p className="tm-role"><ShieldMinus size={18} strokeWidth={2} aria-hidden="true" /><span>{s.adminNote}</span></p>
            <p>{s.demoteText}</p>
          </>
        )}
        {target && view === 'remove' && <p>{s.removeText}</p>}
        {target && view !== 'perms' && error && <p className="ac-error" role="alert"><CircleAlert size={18} strokeWidth={2.2} aria-hidden="true" />{error}</p>}
      </Dialog>

      <Dialog open={inviting} onClose={closeInvite} title={s.inviteT}>
        <form className="tm-invite" onSubmit={sendInvite} noValidate>
          <p>{s.inviteLead}</p>
          <Field
            id="tm-inv-name" size="sm" label={s.fullName} value={inv.name} error={invErr.name} autoComplete="off" maxLength={120} autoFocus
            onChange={e => { setInv(v => ({ ...v, name: e.target.value })); if (invErr.name) setInvErr(er => ({ ...er, name: undefined })); }}
          />
          <Field
            id="tm-inv-email" size="sm" type="email" inputMode="email" label={p.email} value={inv.email} error={invErr.email} autoComplete="off" spellCheck={false} maxLength={160}
            onChange={e => { setInv(v => ({ ...v, email: e.target.value })); if (invErr.email) setInvErr(er => ({ ...er, email: undefined })); }}
          />
          {invErr.form && <p className="ac-error" role="alert"><CircleAlert size={18} strokeWidth={2.2} aria-hidden="true" />{invErr.form}</p>}
          <div className="ds-dialog-actions">
            <Button variant="soft" size="md" onClick={closeInvite} disabled={sending}>{p.cancel}</Button>
            <Button type="submit" variant="ink" size="md" busy={sending}>{sending ? s.sending : s.sendInvite}</Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}
