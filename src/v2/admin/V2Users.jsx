import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { UserPlus, Check, Minus, CircleAlert, CircleCheck, X, ShieldCheck, UserRoundMinus, Send, ShieldPlus, ShieldMinus } from 'lucide-react';
import { getAllProfiles, getManagerPermissions, setManagerPermissions, inviteManager, deleteManager, updateProfile } from '../../lib/supabase.js';
import { EMAIL_RE } from '../site/fields.jsx';
import { ICON, fmt, initials } from '../V2Layout.jsx';
import { useAdmin, L, Confirm, PERMS } from './adminKit.jsx';

const PERM_LABEL = { can_view: ['pView', 'pViewHelp'], can_edit: ['pEdit', 'pEditHelp'], can_reply: ['pReply', 'pReplyHelp'], can_delete: ['pDelete', 'pDeleteHelp'] };

function emptyPerms(categories) {
  return categories.map(c => ({ category: c.value, can_view: false, can_edit: false, can_reply: false, can_delete: false }));
}

/** Casella de verificació amb l'aspecte del sistema; admet estat mixt per a "totes les categories" */
function Box({ checked, mixed = false, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = mixed; }, [mixed]);
  return (
    <label className={`v2-cbox${checked ? ' is-on' : ''}${mixed ? ' is-mixed' : ''}`}>
      <input ref={ref} type="checkbox" checked={checked} onChange={onChange} aria-label={label} />
      <span className="v2-box" aria-hidden="true">{mixed ? <Minus strokeWidth={2.5} /> : <Check strokeWidth={2.5} />}</span>
    </label>
  );
}

export default function V2Users() {
  const { t, tr, isSuperadmin, profile, notify } = useAdmin();
  const categories = tr.categories;

  const [profiles, setProfiles] = useState(null);
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState(null);
  const [perms, setPerms] = useState(() => emptyPerms(categories));
  const [original, setOriginal] = useState('');
  const [permsLoading, setPermsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permsFb, setPermsFb] = useState(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inv, setInv] = useState({ name: '', email: '' });
  const [invErr, setInvErr] = useState({}); // { name, email, form }
  const inviteBtn = useRef(null);
  const [roleTarget, setRoleTarget] = useState(null); // { person, to }
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleErr, setRoleErr] = useState('');
  const [inviting, setInviting] = useState(false);

  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [removeErr, setRemoveErr] = useState('');
  const permsRef = useRef(null);

  useEffect(() => { document.title = `${t.uTitle} · ${t.panelName}`; }, [t]);

  async function loadProfiles() {
    const { profiles: list } = await getAllProfiles();
    setProfiles(list ?? []);
    // Resum de categories per gestor per a la llista
    const managers = (list ?? []).filter(p => p.role === 'manager');
    const res = await Promise.all(managers.map(m => getManagerPermissions(m.id)));
    setCounts(Object.fromEntries(managers.map((m, i) => [m.id, (res[i].permissions ?? []).filter(p => p.can_view).length])));
  }
  useEffect(() => { if (isSuperadmin) loadProfiles(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isSuperadmin]);

  async function selectManager(p) {
    if (selected?.id === p.id) return;
    // Canviar de gestor amb canvis sense desar els perdria: es pregunta
    if (dirty && !window.confirm(t.leaveUnsaved)) return;
    setSelected(p);
    setPermsFb(null);
    setPermsLoading(true);
    const { permissions } = await getManagerPermissions(p.id);
    const merged = emptyPerms(categories).map(ep => {
      const ex = (permissions ?? []).find(x => x.category === ep.category);
      return ex ? { category: ep.category, can_view: !!ex.can_view, can_edit: !!ex.can_edit, can_reply: !!ex.can_reply, can_delete: !!ex.can_delete } : ep;
    });
    setPerms(merged);
    setOriginal(JSON.stringify(merged));
    setPermsLoading(false);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => permsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  // "Veure" és la base: activar qualsevol altre permís l'activa; treure'l ho treu tot
  function setPerm(row, key, value) {
    const next = { ...row, [key]: value };
    if (key === 'can_view' && !value) { next.can_edit = false; next.can_reply = false; next.can_delete = false; }
    if (key !== 'can_view' && value) next.can_view = true;
    return next;
  }
  const toggle = (i, key) => setPerms(prev => prev.map((p, j) => (j === i ? setPerm(p, key, !p[key]) : p)));
  const toggleCol = (key) => {
    const allOn = perms.every(p => p[key]);
    setPerms(prev => prev.map(p => setPerm(p, key, !allOn)));
  };

  const dirty = selected && JSON.stringify(perms) !== original;
  useEffect(() => {
    if (!dirty) return undefined;
    const onBefore = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty]);

  async function savePerms() {
    setSaving(true);
    setPermsFb(null);
    const active = perms.filter(p => PERMS.some(k => p[k]));
    let error = null;
    try { ({ error } = await setManagerPermissions(selected.id, active)); } catch (err) { error = err; }
    setSaving(false);
    if (error) { setPermsFb({ ok: false, text: t.permsErr }); return; }
    setOriginal(JSON.stringify(perms));
    setCounts(c => ({ ...c, [selected.id]: perms.filter(p => p.can_view).length }));
    setPermsFb({ ok: true, text: t.permsSaved });
    setTimeout(() => setPermsFb(null), 3000);
  }

  function closeInvite() {
    setShowInvite(false);
    setInvErr({});
    requestAnimationFrame(() => inviteBtn.current?.focus());
  }

  async function sendInvite(e) {
    e.preventDefault();
    const name = inv.name.trim();
    const email = inv.email.trim().toLowerCase();
    const er = {};
    if (!name) er.name = t.inviteErrName;
    if (!EMAIL_RE.test(email)) er.email = t.inviteErrEmail;
    setInvErr(er);
    if (er.name) { document.getElementById('v2-inv-name')?.focus(); return; }
    if (er.email) { document.getElementById('v2-inv-email')?.focus(); return; }
    setInviting(true);
    let error = null;
    // Un error de xarxa o de sessió no ha de deixar el botó per sempre a «Enviant…»
    try { ({ error } = await inviteManager(email, name)); } catch (err) { error = err; }
    setInviting(false);
    // Els errors de la funció arriben sense traduir: es mostra sempre un text propi
    if (error) { setInvErr({ form: /already|exist|registered|ja existeix/i.test(error.message ?? '') ? t.inviteExists : t.inviteErr }); return; }
    setInv({ name: '', email: '' });
    closeInvite();
    notify(fmt(t.inviteOk, { email }));
    loadProfiles();
  }

  // Segon administrador: el compte no ha de dependre d'una sola persona (art. 8.3, relleu del responsable)
  async function doRole() {
    setRoleBusy(true);
    setRoleErr('');
    let error = null;
    try { ({ error } = await updateProfile(roleTarget.person.id, { role: roleTarget.to })); } catch (err) { error = err; }
    setRoleBusy(false);
    if (error) { setRoleErr(t.roleErr); return; }
    const name = roleTarget.person.full_name || roleTarget.person.email;
    notify(fmt(roleTarget.to === 'superadmin' ? t.promoted : t.demoted, { name }));
    if (selected?.id === roleTarget.person.id) setSelected(null);
    setRoleTarget(null);
    loadProfiles();
  }

  async function doRemove() {
    setRemoving(true);
    setRemoveErr('');
    let error = null;
    try { ({ error } = await deleteManager(removeTarget.id)); } catch (err) { error = err; }
    setRemoving(false);
    if (error) { setRemoveErr(t.removeErr); return; }
    const name = removeTarget.full_name || removeTarget.email;
    if (selected?.id === removeTarget.id) setSelected(null);
    setRemoveTarget(null);
    notify(fmt(t.removed, { name }));
    loadProfiles();
  }

  const colState = useMemo(() => Object.fromEntries(PERMS.map(k => {
    const on = perms.filter(p => p[k]).length;
    return [k, { all: on === perms.length, mixed: on > 0 && on < perms.length }];
  })), [perms]);

  const selName = selected ? (selected.full_name || selected.email) : '';
  if (!isSuperadmin) return <Navigate to="/admin" replace />;

  return (
    <div className="v2-page">
      <header className="v2-ph">
        <div className="v2-ph-main">
          <L as="h1" className="v2-ph-title" k="uTitle" />
          <L as="p" className="v2-ph-lead" k="uLead" />
        </div>
        {!showInvite && (
          <div className="v2-ph-actions">
            <button ref={inviteBtn} type="button" className="v2-btn v2-btn-primary v2-btn-sm icon-lead" onClick={() => { setShowInvite(true); setInvErr({}); }}>
              <UserPlus {...ICON} /><L k="invite" />
            </button>
          </div>
        )}
      </header>

      {showInvite && (
        <form className="v2-sec v2-invite" onSubmit={sendInvite} noValidate aria-labelledby="v2-inv-t">
          <div className="v2-invite-head">
            <div>
              <L as="h2" className="v2-sec-h" id="v2-inv-t" k="inviteTitle" />
              <L as="p" className="v2-sec-lead" k="inviteLead" />
            </div>
            <button type="button" className="v2-icon-btn is-plain" onClick={closeInvite} aria-label={t.cancel}><X {...ICON} /></button>
          </div>
          <div className="v2-invite-fields">
            <div className="v2-field">
              <label htmlFor="v2-inv-name"><L k="fullName" /></label>
              <input
                id="v2-inv-name" className="v2-input v2-input-sm" autoComplete="off" maxLength={120} value={inv.name} autoFocus
                onChange={e => { setInv(v => ({ ...v, name: e.target.value })); setInvErr(x => ({ ...x, name: '', form: '' })); }}
                aria-invalid={!!invErr.name || undefined} aria-describedby={invErr.name ? 'v2-inv-name-e' : undefined}
              />
              {invErr.name && <p className="v2-err" id="v2-inv-name-e"><CircleAlert {...ICON} />{invErr.name}</p>}
            </div>
            <div className="v2-field">
              <label htmlFor="v2-inv-email"><L k="email" /></label>
              <input
                id="v2-inv-email" className="v2-input v2-input-sm" type="email" inputMode="email" autoComplete="off" spellCheck={false} maxLength={200} value={inv.email}
                onChange={e => { setInv(v => ({ ...v, email: e.target.value })); setInvErr(x => ({ ...x, email: '', form: '' })); }}
                aria-invalid={!!invErr.email || undefined} aria-describedby={invErr.email ? 'v2-inv-email-e' : undefined}
              />
              {invErr.email && <p className="v2-err" id="v2-inv-email-e"><CircleAlert {...ICON} />{invErr.email}</p>}
            </div>
            <div className="v2-invite-actions">
              <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm" onClick={closeInvite}><L k="cancel" /></button>
              <button type="submit" className="v2-btn v2-btn-primary v2-btn-sm icon-trail" aria-busy={inviting}>
                <L k={inviting ? 'sending' : 'sendInvite'} /><Send {...ICON} />
              </button>
            </div>
          </div>
          {invErr.form && <p className="v2-err" role="alert"><CircleAlert {...ICON} />{invErr.form}</p>}
        </form>
      )}

      <div className="v2-users">
        <section className="v2-sec v2-people" aria-labelledby="v2-people-t">
          <h2 className="v2-sec-h" id="v2-people-t">{t.peopleTitle}{profiles && <span className="v2-sec-n">{profiles.length}</span>}</h2>
          {profiles === null ? (
            <div aria-hidden="true">{[0, 1, 2].map(i => <div key={i} className="v2-person is-skel"><span className="v2-skel is-avatar" /><span className="v2-skel" style={{ width: '60%' }} /></div>)}</div>
          ) : (
            <ul className="v2-people-list">
              {profiles.map(p => {
                const isMe = p.id === profile.id;
                const isMgr = p.role === 'manager';
                const n = counts[p.id] ?? 0;
                const summary = !isMgr ? t.fullAccess : n === 0 ? t.catsNone : n === 1 ? t.catsOne : fmt(t.catsMany, { n });
                const body = (
                  <>
                    <span className="v2-person-avatar" aria-hidden="true">{initials(p.full_name || p.email)}</span>
                    <span className="v2-person-txt">
                      <span className="v2-person-name">{p.full_name || p.email}{isMe && <span className="v2-tag">{t.you}</span>}</span>
                      {p.email && <span className="v2-person-mail">{p.email}</span>}
                      <span className="v2-person-role">
                        {isMgr ? t.roleManager : t.roleSuperadmin}<span aria-hidden="true"> · </span>{summary}
                        {p.invited && <><span aria-hidden="true"> · </span>{t.invited}</>}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={p.id}>
                    {isMgr ? (
                      <button type="button" className="v2-person" aria-pressed={selected?.id === p.id} onClick={() => selectManager(p)}>{body}</button>
                    ) : (
                      <div className="v2-person is-static">
                        {body}
                        {isMe ? <ShieldCheck className="v2-person-shield" {...ICON} /> : (
                          <button type="button" className="v2-mini-btn" onClick={() => { setRoleErr(''); setRoleTarget({ person: p, to: 'manager' }); }}>
                            <ShieldMinus {...ICON} /><L k="demote" />
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="v2-sec v2-perms" ref={permsRef} aria-labelledby="v2-perms-t" aria-busy={permsLoading}>
          {!selected ? (
            <div className="v2-perms-empty">
              <L as="h2" className="v2-sec-h" id="v2-perms-t" k="permsHeading" />
              <L as="p" k="pickManager" />
              <p className="v2-perms-super"><ShieldCheck {...ICON} /><span><b>{t.roleSuperadmin}.</b> {t.superNote}</span></p>
            </div>
          ) : (
            <>
              <div className="v2-perms-head">
                <div>
                  <L as="h2" className="v2-sec-h" id="v2-perms-t" pick={x => fmt(x.permsTitle, { name: selName })} />
                  <L as="p" className="v2-sec-lead" k="permsLead" />
                </div>
                <div className="v2-perms-acts">
                  <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" onClick={() => { setRoleErr(''); setRoleTarget({ person: selected, to: 'superadmin' }); }}>
                    <ShieldPlus {...ICON} /><L k="promote" />
                  </button>
                  <button type="button" className="v2-btn v2-btn-ghost-danger v2-btn-sm icon-lead" onClick={() => { setRemoveErr(''); setRemoveTarget(selected); }}>
                    <UserRoundMinus {...ICON} /><L k="remove" />
                  </button>
                </div>
              </div>

              {/* Escriptori: matriu categoria × permís */}
              <table className="v2-matrix">
                <thead>
                  <tr>
                    <th className="m-cat"><L className="v2-vh" k="fCategory" /></th>
                    {PERMS.map(k => (
                      <th key={k}><span className="m-h">{t[PERM_LABEL[k][0]]}</span><span className="m-help">{t[PERM_LABEL[k][1]]}</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="m-all">
                    <th scope="row"><L k="allCats" /></th>
                    {PERMS.map(k => (
                      <td key={k}>
                        <Box checked={colState[k].all} mixed={colState[k].mixed} onChange={() => toggleCol(k)} label={fmt(t.permAria, { perm: t[PERM_LABEL[k][0]], cat: t.allCats })} />
                      </td>
                    ))}
                  </tr>
                  {perms.map((p, i) => {
                    const label = categories.find(c => c.value === p.category)?.label ?? p.category;
                    return (
                      <tr key={p.category} className={p.can_view ? 'is-on' : ''}>
                        <th scope="row">{label}</th>
                        {PERMS.map(k => (
                          <td key={k}><Box checked={p[k]} onChange={() => toggle(i, k)} label={fmt(t.permAria, { perm: t[PERM_LABEL[k][0]], cat: label })} /></td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mòbil: una fitxa per categoria */}
              <ul className="v2-mperms">
                {perms.map((p, i) => {
                  const label = categories.find(c => c.value === p.category)?.label ?? p.category;
                  return (
                    <li key={p.category} className={p.can_view ? 'is-on' : ''}>
                      <fieldset>
                      <legend className="v2-mperms-cat">{label}</legend>
                      <div className="v2-mperms-grid">
                        {PERMS.map(k => (
                          <label key={k} className={`v2-chip${p[k] ? ' is-on' : ''}`}>
                            <input type="checkbox" checked={p[k]} onChange={() => toggle(i, k)} aria-label={fmt(t.permAria, { perm: t[PERM_LABEL[k][0]], cat: label })} />
                            <span className="v2-box" aria-hidden="true"><Check strokeWidth={2.5} /></span>
                            {t[PERM_LABEL[k][0]]}
                          </label>
                        ))}
                      </div>
                      </fieldset>
                    </li>
                  );
                })}
              </ul>

              <L as="p" className="v2-perm-hint" k="permHint" />

              <div className={`v2-savebar${dirty ? ' is-dirty' : ''}`}>
                <span role="status" className="v2-savebar-status">
                  {permsFb ? (
                    <span className={`v2-feedback ${permsFb.ok ? 'is-ok' : 'is-err'}`}>{permsFb.ok ? <CircleCheck {...ICON} /> : <CircleAlert {...ICON} />}{permsFb.text}</span>
                  ) : dirty ? <L className="v2-unsaved" k="unsaved" /> : null}
                </span>
                <div className="v2-savebar-actions">
                  {dirty && <button type="button" className="v2-btn v2-btn-quiet v2-btn-sm" onClick={() => setPerms(JSON.parse(original))}><L k="discard" /></button>}
                  <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => { if (dirty) savePerms(); }} aria-disabled={!dirty} aria-busy={saving}>
                    {saving ? t.saving : t.savePerms}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Confirm
        open={!!roleTarget}
        title={roleTarget ? fmt(roleTarget.to === 'superadmin' ? t.promoteTitle : t.demoteTitle, { name: roleTarget.person.full_name || roleTarget.person.email }) : ''}
        confirmLabel={roleTarget?.to === 'superadmin' ? t.promote : t.demote}
        busyLabel={t.saving}
        cancelLabel={t.cancel}
        busy={roleBusy}
        tone="primary"
        onConfirm={doRole}
        onCancel={() => setRoleTarget(null)}
      >
        <p>{roleTarget?.to === 'superadmin' ? t.promoteText : t.demoteText}</p>
        {roleErr && <p className="v2-err" role="alert"><CircleAlert {...ICON} />{roleErr}</p>}
      </Confirm>

      <Confirm
        open={!!removeTarget}
        title={removeTarget ? fmt(t.removeTitle, { name: removeTarget.full_name || removeTarget.email }) : ''}
        confirmLabel={t.remove}
        busyLabel={t.removing}
        cancelLabel={t.cancel}
        busy={removing}
        onConfirm={doRemove}
        onCancel={() => setRemoveTarget(null)}
      >
        <L as="p" k="removeText" />
        {removeErr && <p className="v2-err" role="alert"><CircleAlert {...ICON} />{removeErr}</p>}
      </Confirm>
    </div>
  );
}
