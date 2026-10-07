import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CircleAlert, LockKeyhole } from 'lucide-react';
import { registerComplaint } from '../../lib/supabase.js';
import { Swap } from '../V2Layout.jsx';
import { EMAIL_RE } from '../site/fields.jsx';
import { Button, Card, Field, Segmented } from '../ui/index.js';
import { usePanel, Tp, CHANNELS } from './kit.jsx';

// Fecha y hora locales para <input type="datetime-local">
function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
const EMPTY = { channel: 'phone', receivedAt: '', category: '', description: '', department: '', when: '', involvedPeople: '', isAnonymous: true, name: '', email: '', phone: '' };

/** Registrar una denuncia que llega por teléfono, en persona, por correo o por carta */
export default function Registrar() {
  const { lang, tr, p, org, profile, email, can, canRegister, channelPath } = usePanel();
  const [form, setForm] = useState(() => ({ ...EMPTY, receivedAt: localNow() }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(null); // { id, trackingCode }
  const [copied, setCopied] = useState(false);
  const headRef = useRef(null);
  // Al corregir un campo, su aviso de error desaparece
  const set = (patch) => {
    setForm(f => ({ ...f, ...patch }));
    setErrors(e => (Object.keys(patch).some(k => e[k]) ? Object.fromEntries(Object.entries(e).filter(([k]) => !(k in patch))) : e));
  };
  const cats = Object.keys(tr.canal.cats).filter(v => can('edit', v));

  useEffect(() => { document.title = `${p.regTitle} · ${org?.name ?? ''}`; }, [p, org]);
  useEffect(() => { if (done) headRef.current?.focus({ preventScroll: true }); }, [done]);

  // El foco va al primer campo con error en cuanto se pinta el aviso
  const errorFocus = useRef(null);
  useEffect(() => {
    const k = errorFocus.current;
    errorFocus.current = null;
    if (k) document.getElementById(`rg-${k}`)?.focus();
  }, [errors]);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const er = {};
    const at = form.receivedAt ? new Date(form.receivedAt) : null;
    if (!at || Number.isNaN(at.getTime()) || at.getTime() > Date.now() + 5 * 60000 || at.getTime() < Date.now() - 365 * 86400000) er.receivedAt = p.errDate;
    if (!form.category) er.category = p.errTopic;
    if (form.description.trim().length < 20) er.description = p.errDesc;
    if (!form.isAnonymous && form.email.trim() && !EMAIL_RE.test(form.email.trim())) er.email = p.errEmail;
    errorFocus.current = Object.keys(er)[0] ?? null;
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setFailed(false);
    const { id, trackingCode, error } = await registerComplaint(
      { ...form, receivedAt: at.toISOString(), language: lang, whenLabel: p.when }, profile.full_name || email,
    );
    setBusy(false);
    if (error || !trackingCode) { setFailed(true); return; }
    setDone({ id, trackingCode });
  }

  async function copy() {
    try { await navigator.clipboard.writeText(done.trackingCode); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* sin portapapeles: el código se puede seleccionar */ }
  }

  if (!canRegister) {
    return <div className="pn-page"><Card tone="bg" className="pn-empty"><LockKeyhole size={28} strokeWidth={1.7} aria-hidden="true" /><p>{p.regNoPerm}</p><Button variant="ink" size="sm" to="/admin">{p.toBoard}</Button></Card></div>;
  }

  if (done) {
    const url = `${import.meta.env.VITE_PUBLIC_ORIGIN || window.location.origin}${channelPath}/consulta`;
    return (
      <div className="pn-page rg-done">
        <span className="rg-ok" aria-hidden="true"><Check size={28} strokeWidth={2.6} /></span>
        <Tp as="h1" className="ds-h1 is-sm" lang={lang} k="doneTitle" ref={headRef} tabIndex={-1} />
        <Tp as="p" className="ds-lead" lang={lang} k="doneLead" />
        <Card tone="bg" radius="xl" className="rg-code" id="print-area">
          <span className="code-label">{p.codeLabel}</span>
          <span className="code-big" aria-hidden="true">{done.trackingCode}</span>
          <span className="ds-vh">{done.trackingCode.split('').join(' ')}</span>
          <div className="code-actions">
            <Button variant="ink" size="md" onClick={copy}><Swap lang={lang} on={copied} pick={T => T.panel.copy} pickOn={T => T.panel.copied} /></Button>
            <Button variant="white" size="md" onClick={() => window.print()}>{p.printReceipt}</Button>
          </div>
          <p className="print-only">{p.printNote} {url}</p>
        </Card>
        <div className="rg-next">
          <Button variant="bg" size="md" to="/admin">{p.toBoard}</Button>
          <Button variant="report" size="md" to={`/admin/complaints/${done.id}`}>{p.openCase}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pn-page">
      <div className="pn-hello">
        <Link className="pn-back" to="/admin"><ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />{p.back}</Link>
        <Tp as="h1" className="ds-h1 is-sm" lang={lang} k="regTitle" />
        <Tp as="p" className="pn-lead" lang={lang} k="regLead" />
      </div>
      <div className="rg">
        <Card as="form" tone="bg" className="rg-form" onSubmit={submit} noValidate>
          <div className="rg-group">
            <span className="rg-label" id="rg-how">{p.how}</span>
            <Segmented mode="radio" loose label={p.how} value={form.channel} onChange={channel => set({ channel })} options={CHANNELS.map(v => ({ value: v, label: p.chan[v] }))} />
          </div>
          <div className="rg-two">
            <Field id="rg-receivedAt" size="sm" plain type="datetime-local" label={p.receivedAt} value={form.receivedAt} max={localNow()} error={errors.receivedAt} onChange={e => set({ receivedAt: e.target.value })} />
            <Field id="rg-category" as="select" size="sm" plain label={p.topic} value={form.category} error={errors.category} onChange={e => set({ category: e.target.value })}>
              <option value="">{p.topicPick}</option>
              {cats.map(v => <option key={v} value={v}>{tr.canal.cats[v][0]}</option>)}
            </Field>
          </div>
          <Field id="rg-description" as="textarea" size="sm" plain rows={5} label={p.told} value={form.description} error={errors.description} onChange={e => set({ description: e.target.value })} />
          <div className="rg-three">
            <Field size="sm" plain label={p.where} placeholder={p.optional} value={form.department} onChange={e => set({ department: e.target.value })} />
            <Field size="sm" plain label={p.when} placeholder={p.optional} value={form.when} maxLength={120} onChange={e => set({ when: e.target.value })} />
            <Field size="sm" plain label={p.who} placeholder={p.optional} value={form.involvedPeople} onChange={e => set({ involvedPeople: e.target.value })} />
          </div>
          <div className="rg-group">
            <span className="rg-label">{p.gaveName}</span>
            <Segmented mode="radio" loose label={p.gaveName} value={form.isAnonymous ? 'no' : 'yes'} onChange={v => set({ isAnonymous: v === 'no' })} options={[{ value: 'no', label: p.noAnon }, { value: 'yes', label: p.yesData }]} />
          </div>
          {!form.isAnonymous && (
            <div className="rg-three">
              <Field size="sm" plain label={p.name} value={form.name} autoComplete="off" onChange={e => set({ name: e.target.value })} />
              <Field id="rg-email" size="sm" plain type="email" label={p.email} value={form.email} autoComplete="off" error={errors.email} onChange={e => set({ email: e.target.value })} />
              <Field size="sm" plain type="tel" label={p.phone} value={form.phone} autoComplete="off" onChange={e => set({ phone: e.target.value })} />
            </div>
          )}
          {failed && <p className="pn-error" role="alert"><CircleAlert size={20} strokeWidth={2.2} aria-hidden="true" /><span>{p.regErr}</span></p>}
          <div className="rg-actions">
            <Button variant="white" size="md" to="/admin">{p.cancel}</Button>
            <Button type="submit" variant="report" size="md" busy={busy}><Tp lang={lang} k={busy ? 'regBusy' : 'regDo'} /></Button>
          </div>
        </Card>
        <Card as="aside" tone="ink" className="rg-aside">
          <span className="ds-card-title">{p.whatHappens}</span>
          <ol>{p.wh.map((text, i) => <li key={i}><span aria-hidden="true">{i + 1}</span><p>{text}</p></li>)}</ol>
        </Card>
      </div>
    </div>
  );
}
