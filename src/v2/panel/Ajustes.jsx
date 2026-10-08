import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Circle, CircleAlert, Mail } from 'lucide-react';
import { updatePassword } from '../../lib/supabase.js';
import { AIPI_URL, ANTIFRAU_URL, LANGS, fmt } from '../V2Layout.jsx';
import { translations } from '../../translations.js';
import { planInfo, fLong } from '../admin/adminKit.jsx';
import { PLANS, CONTACT_EMAIL, formatPrice } from '../site/plans.js';
import { EMAIL_RE, authErrorKey } from '../site/fields.jsx';
import { isoDay } from '../../lib/businessDays.js';
import { Button, Card, Dialog, Field, Segmented, cx } from '../ui/index.js';
import { usePanel, Tp } from './kit.jsx';
import { aipiInfo, hasOnboarding } from './primeros.jsx';
import Equipo from './Equipo.jsx';
import PasswordField from './PasswordField.jsx';

const MIN_PASSWORD = 8;
const HTTPS = /^https:\/\/[^\s<>"]+$/;
const mailto = (subject, body) => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
const alertIcon = <CircleAlert size={18} strokeWidth={2.2} aria-hidden="true" />;

/** Avisa antes de cerrar la pestaña con cambios sin guardar */
function useUnsavedGuard(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const onBefore = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty]);
}

/**
 * Equipo y ajustes, en una sola página: a la izquierda el Responsable del Sistema y el plan; a la derecha
 * quién gestiona, tu seguridad y los datos de la empresa. Quien no administra solo ve «Tu seguridad».
 */
export default function Ajustes() {
  const { lang, p, org, isSuperadmin } = usePanel();
  useEffect(() => { document.title = `${p.nav.settings} · ${org?.name ?? ''}`; }, [p, org]);
  return (
    <div className="pn-page st">
      <Tp as="h1" className="ds-h1 is-sm" lang={lang} pick={x => x.set.title} />
      {isSuperadmin ? (
        <div className="st-grid">
          <div className="st-col is-wide"><Responsable />{org?.plan && <Plan />}</div>
          <div className="st-col"><Equipo /><TuSeguridad /><Empresa /></div>
        </div>
      ) : (
        <div className="st-col is-solo"><TuSeguridad /></div>
      )}
    </div>
  );
}

// ── Responsable del Sistema ──────────────────────────────────────────────
function authOf(org) {
  if (!org?.regional_authority_url) return 'none';
  return org.regional_authority_url === ANTIFRAU_URL ? 'antifrau' : 'other';
}
const respForm = (org) => ({
  responsible_name: org?.responsible_name ?? '',
  responsible_role: org?.responsible_role ?? '',
  responsible_appointed_at: org?.responsible_appointed_at ?? '',
  aipi_notified_at: org?.aipi_notified_at ?? '',
  auth: authOf(org),
  authName: authOf(org) === 'other' ? org.regional_authority_name ?? '' : '',
  authUrl: authOf(org) === 'other' ? org.regional_authority_url ?? '' : '',
});

function Responsable() {
  const { lang, p, org, saveOrg, notify } = usePanel();
  const s = p.set;
  const saved = useMemo(() => respForm(org), [org]);
  const [form, setForm] = useState(saved);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { setForm(saved); }, [saved]);

  // Sin las migraciones que traen estas columnas, sus campos no se enseñan (no se podrían guardar)
  const withDates = hasOnboarding(org);
  const withAuthority = !!org && 'regional_authority_url' in org;
  const dirty = Object.keys(saved).some(k => String(form[k]).trim() !== String(saved[k]).trim());
  useUnsavedGuard(dirty);

  const set = (k) => (e) => {
    const { value } = e.target;
    setForm(f => ({ ...f, [k]: value }));
    if (errors.auth && k.startsWith('auth')) setErrors({});
  };
  const today = isoDay(new Date());

  // La cuenta atrás se calcula con lo que hay escrito, sin esperar a guardar
  const aipi = withDates ? aipiInfo({ ...org, responsible_name: form.responsible_name, responsible_appointed_at: form.responsible_appointed_at, aipi_notified_at: form.aipi_notified_at }) : null;
  const aipiHelp = !aipi || aipi.state === 'done' || aipi.state === 'none' ? undefined
    : aipi.state === 'undated' ? s.needAppointed
    : aipi.state === 'overdue' ? fmt(s.overdue, { date: fLong(aipi.due, lang) })
    : aipi.left === 0 ? s.dueToday
    : aipi.left === 1 ? s.daysLeft1
    : fmt(s.daysLeftN, { n: aipi.left });
  const counting = aipi?.state === 'pending' || aipi?.state === 'overdue';

  async function save(e) {
    e.preventDefault();
    if (busy) return;
    const name = form.authName.trim();
    const url = form.authUrl.trim();
    if (withAuthority && form.auth === 'other' && (!name || !HTTPS.test(url))) {
      setErrors({ auth: s.errAuth });
      document.getElementById(name ? 'st-auth-url' : 'st-auth-name')?.focus();
      return;
    }
    const changes = { responsible_name: form.responsible_name, responsible_role: form.responsible_role };
    if (withDates) Object.assign(changes, { responsible_appointed_at: form.responsible_appointed_at, aipi_notified_at: form.aipi_notified_at });
    if (withAuthority) {
      Object.assign(changes, form.auth === 'none' ? { regional_authority_name: '', regional_authority_url: '' }
        : form.auth === 'antifrau' ? { regional_authority_name: s.authAntifrau, regional_authority_url: ANTIFRAU_URL }
        : { regional_authority_name: name, regional_authority_url: url });
    }
    setBusy(true);
    const { error } = await saveOrg(changes);
    setBusy(false);
    if (error) { notify(s.saveErr, 'err'); return; }
    notify(p.saved);
  }

  return (
    <Card as="form" tone="bg" className="st-card" aria-labelledby="st-resp-t" onSubmit={save} noValidate>
      <h2 className="st-h" id="st-resp-t">{s.respT}</h2>
      <p className="st-p">{s.respLead}</p>
      <div className="st-two">
        <Field size="sm" plain label={s.respName} value={form.responsible_name} onChange={set('responsible_name')} autoComplete="off" maxLength={120} />
        <Field size="sm" plain label={s.respRole} value={form.responsible_role} onChange={set('responsible_role')} autoComplete="off" maxLength={120} />
        {withDates && (
          <>
            <Field size="sm" plain type="date" label={s.appointed} value={form.responsible_appointed_at} max={today} onChange={set('responsible_appointed_at')} />
            <Field
              size="sm" plain type="date" label={s.notified} value={form.aipi_notified_at} max={today} min={form.responsible_appointed_at || undefined}
              onChange={set('aipi_notified_at')} help={aipiHelp} warn={!!aipiHelp && aipi.state !== 'overdue'} className={aipi?.state === 'overdue' ? 'is-late' : undefined}
            />
          </>
        )}
      </div>
      {counting && <p className="st-small">{s.noHolidays}</p>}
      {withAuthority && (
        <>
          <Field as="select" size="sm" plain label={s.authority} value={form.auth} onChange={set('auth')}>
            <option value="none">{s.authNone}</option>
            <option value="antifrau">{s.authAntifrau}</option>
            <option value="other">{s.authOther}</option>
          </Field>
          {form.auth === 'other' && (
            <div className="st-two">
              <Field id="st-auth-name" size="sm" plain label={s.authName} value={form.authName} onChange={set('authName')} autoComplete="off" maxLength={160} aria-invalid={errors.auth ? true : undefined} />
              <Field id="st-auth-url" size="sm" plain type="url" inputMode="url" label={s.authUrl} placeholder="https://" value={form.authUrl} onChange={set('authUrl')} autoComplete="off" spellCheck={false} maxLength={300} aria-invalid={errors.auth ? true : undefined} />
            </div>
          )}
          {errors.auth && <p className="ac-error" role="alert">{alertIcon}{errors.auth}</p>}
        </>
      )}
      <div className="st-foot">
        <a className="st-ext" href={AIPI_URL} target="_blank" rel="noopener noreferrer">{s.howAipi}<ArrowUpRight size={16} strokeWidth={2.4} aria-hidden="true" /></a>
        <Button type="submit" variant="ink" size="sm" busy={busy} disabled={!dirty}>{busy ? p.saving : p.save}</Button>
      </div>
    </Card>
  );
}

// ── Plan ─────────────────────────────────────────────────────────────────
const billForm = (org) => ({ billing_name: org?.billing_name ?? '', billing_tax_id: org?.billing_tax_id ?? '', billing_email: org?.billing_email ?? '' });

function Plan() {
  const { lang, t, tr, p, org, saveOrg, notify, channelPath } = usePanel();
  const s = p.set;
  const [pricing, setPricing] = useState(false);
  const [billing, setBilling] = useState(false);
  const [form, setForm] = useState(() => billForm(org));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const plan = planInfo(org);
  const names = tr.v2site.landing;
  const planName = plan && plan.plan !== 'trial' ? (names.plans[plan.plan]?.name ?? plan.plan) : '';
  const date = plan?.until ? fLong(plan.until, lang) : '';
  const paying = !!plan && plan.plan !== 'trial';
  // El estado del plan, en palabras. Aunque la prueba o el plan terminen, el canal público sigue abierto
  const state = !plan ? { title: s.trial, text: '' }
    : plan.state === 'trial' ? { warn: plan.days <= 7, title: s.trial, text: plan.days === 0 ? s.trialToday : plan.days === 1 ? s.trialLeft1 : fmt(s.trialLeftN, { n: plan.days }) }
    : plan.state === 'trialEnded' ? { late: true, title: s.trialEnded, text: fmt(s.trialEndedText, { date }) }
    : plan.state === 'expired' ? { late: true, title: fmt(s.expired, { plan: planName }), text: fmt(s.expiredText, { date }) }
    : {
      warn: plan.renewSoon, title: fmt(s.active, { plan: planName }),
      text: !plan.until ? s.activeOpen : !plan.renewSoon ? fmt(s.activeUntil, { date }) : plan.days === 0 ? s.renewToday : fmt(plan.days === 1 ? s.renew1 : s.renewN, { n: plan.days, date }),
    };

  const orgName = org?.name ?? '';
  const url = `${import.meta.env.VITE_PUBLIC_ORIGIN || window.location.origin}${channelPath}`;
  const contractHref = mailto(fmt(t.aMailSubject, { org: orgName }), fmt(t.aMailBody, { org: orgName, url }));
  const dpaHref = mailto(fmt(s.dpaSubject, { org: orgName }), fmt(s.dpaBody, { org: orgName }));

  const openBilling = () => { setForm(billForm(org)); setErrors({}); setBilling(true); };
  const set = (k) => (e) => {
    const { value } = e.target;
    setForm(f => ({ ...f, [k]: value }));
    if (errors[k]) setErrors(er => ({ ...er, [k]: undefined }));
  };
  async function saveBilling(e) {
    e.preventDefault();
    if (busy) return;
    const er = {};
    // NIF, NIE o CIF (o un identificador fiscal europeo): letras y cifras, de 8 a 14
    const tax = form.billing_tax_id.replace(/[\s.-]/g, '').toUpperCase();
    if (tax && !/^[A-Z]{0,2}[A-Z0-9]{8,12}$/.test(tax)) er.billing_tax_id = s.errTax;
    if (form.billing_email.trim() && !EMAIL_RE.test(form.billing_email.trim())) er.billing_email = p.errEmail;
    setErrors(er);
    const first = Object.keys(er)[0];
    if (first) { document.getElementById(`st-${first}`)?.focus(); return; }
    setBusy(true);
    const { error } = await saveOrg(form);
    setBusy(false);
    if (error) { notify(s.saveErr, 'err'); return; }
    setBilling(false);
    notify(p.saved);
  }

  return (
    <Card as="section" tone="bg" className="st-card" aria-labelledby="st-plan-t">
      <h2 className="st-h" id="st-plan-t">{s.planT}</h2>
      <div className="st-tile">
        <span className="st-tile-txt">
          <b>{state.title}</b>
          {state.text && <span className={cx(state.warn && 'is-warn', state.late && 'is-late')}>{state.text}</span>}
        </span>
        <Button variant="ink" size="xs" onClick={() => setPricing(true)}>{paying ? s.renew : s.contract}</Button>
      </div>
      <div className="st-links">
        <button type="button" className="st-link" onClick={openBilling}>{s.billing}</button>
        <a className="st-link" href={dpaHref}>{s.dpa}</a>
      </div>

      <Dialog side open={pricing} onClose={() => setPricing(false)} title={s.plansT} closeLabel={p.close}
        actions={<Button variant="ink" size="md" href={contractHref} icon={<Mail size={18} strokeWidth={2} aria-hidden="true" />}>{paying ? s.renewByMail : s.byMail}</Button>}
      >
        <ul className="st-plans">
          {PLANS.map(pl => {
            const current = plan?.plan === pl.id;
            return (
              <li key={pl.id} className={current ? 'is-current' : undefined}>
                <span className="st-plan-name">
                  <b>{names.plans[pl.id].name}</b>
                  {current && <span className="st-plan-tag"><Check size={14} strokeWidth={3} aria-hidden="true" />{s.yourPlan}</span>}
                </span>
                <span className="st-plan-size">{names.plans[pl.id].size}</span>
                <span className="st-plan-price">{pl.price != null ? <><b>{formatPrice(pl.price, lang)}</b> {names.perYear}, {names.plusVat}</> : <b>{names.custom}</b>}</span>
              </li>
            );
          })}
        </ul>
        <p>{s.plansHow}</p>
      </Dialog>

      <Dialog side open={billing} onClose={() => { if (!busy) setBilling(false); }} title={s.billing} closeLabel={p.close}>
        <form className="st-form" onSubmit={saveBilling} noValidate>
          <p>{s.billLead}</p>
          <Field id="st-billing_name" size="sm" label={s.billName} value={form.billing_name} onChange={set('billing_name')} autoComplete="organization" maxLength={160} />
          <Field id="st-billing_tax_id" size="sm" label={s.billTax} value={form.billing_tax_id} onChange={set('billing_tax_id')} error={errors.billing_tax_id} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={20} />
          <Field id="st-billing_email" size="sm" type="email" inputMode="email" label={s.billEmail} tag={p.optional.toLowerCase()} value={form.billing_email} onChange={set('billing_email')} error={errors.billing_email} autoComplete="email" spellCheck={false} maxLength={160} />
          <div className="ds-dialog-actions">
            <Button variant="soft" size="md" onClick={() => setBilling(false)} disabled={busy}>{p.cancel}</Button>
            <Button type="submit" variant="ink" size="md" busy={busy}>{busy ? p.saving : p.save}</Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}

// ── La empresa ───────────────────────────────────────────────────────────
function Empresa() {
  const { p, org, saveOrg, notify, channelPath } = usePanel();
  const s = p.set;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const address = `${import.meta.env.VITE_PUBLIC_ORIGIN || window.location.origin}${channelPath}`.replace(/^https?:\/\//, '');

  async function save(e) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) { setError(s.errOrgName); document.getElementById('st-org-name')?.focus(); return; }
    setBusy(true);
    const { error: err } = await saveOrg({ name });
    setBusy(false);
    if (err) { notify(s.saveErr, 'err'); return; }
    setEditing(false);
    notify(p.saved);
  }

  return (
    <Card as="section" tone="bg" className="st-card" aria-labelledby="st-org-t">
      <h2 className="st-h" id="st-org-t">{s.orgT}</h2>
      <div className="st-tile">
        <span className="st-tile-txt"><span>{s.orgName}</span><b>{org?.name}</b></span>
        <button type="button" className="st-link" onClick={() => { setName(org?.name ?? ''); setError(''); setEditing(true); }}>{s.change}<span className="ds-vh">: {s.orgName}</span></button>
      </div>
      <div className="st-tile">
        <span className="st-tile-txt"><span>{s.orgAddress}</span><b className="st-address">{address}</b><small>{s.orgAddressHelp}</small></span>
      </div>

      <Dialog open={editing} onClose={() => { if (!busy) setEditing(false); }} title={s.orgName}>
        <form className="st-form" onSubmit={save} noValidate>
          <Field id="st-org-name" size="sm" label={s.orgName} hideLabel value={name} error={error} help={s.orgNameHelp} autoComplete="organization" maxLength={120} autoFocus onChange={e => { setName(e.target.value); setError(''); }} />
          <div className="ds-dialog-actions">
            <Button variant="soft" size="md" onClick={() => setEditing(false)} disabled={busy}>{p.cancel}</Button>
            <Button type="submit" variant="ink" size="md" busy={busy}>{busy ? p.saving : p.save}</Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}

// ── Tu seguridad ─────────────────────────────────────────────────────────
function TuSeguridad() {
  const { lang, setLang, p, mfaSetup, notify } = usePanel();
  const s = p.set;
  const w = p.pw;
  const [changing, setChanging] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const lenOk = password.length >= MIN_PASSWORD;
  const matchOk = password.length > 0 && password === confirm;
  const eye = { show: p.showPw, hide: p.hidePw };
  const open = () => { setPassword(''); setConfirm(''); setErrors({}); setChanging(true); };

  async function save(e) {
    e.preventDefault();
    if (busy) return;
    const er = {};
    if (!lenOk) er.password = w.errLength;
    else if (!matchOk) er.confirm = w.errMatch;
    setErrors(er);
    if (er.password) { document.getElementById('st-pw-new')?.focus(); return; }
    if (er.confirm) { document.getElementById('st-pw-confirm')?.focus(); return; }
    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) {
      const key = authErrorKey(error);
      setErrors({ form: key === 'errSame' ? w.errSame : key === 'errWeak' ? w.errWeak : key === 'errNetwork' ? w.errNetwork : s.pwdErr });
      return;
    }
    setChanging(false);
    notify(s.pwdOk);
  }

  return (
    <Card as="section" tone="bg" className="st-card" aria-labelledby="st-sec-t">
      <h2 className="st-h" id="st-sec-t">{s.secT}</h2>
      <div className="st-tile">
        <span className="st-tile-row"><span className={cx('st-dot', mfaSetup && 'is-off')} aria-hidden="true" /><b>{mfaSetup ? s.mfaOff : s.mfaOn}</b></span>
        <Link className="st-link" to="/admin/mfa">{s.manage}<span className="ds-vh">: {p.sec.title}</span></Link>
      </div>
      <div className="st-tile">
        <span className="st-tile-row"><b>{s.pwd}</b></span>
        <button type="button" className="st-link" onClick={open}>{s.change}<span className="ds-vh">: {s.pwd}</span></button>
      </div>
      <div className="st-tile">
        <span className="st-tile-row"><b>{p.language}</b></span>
        <Segmented tone="bg" label={p.language} value={lang} onChange={setLang} options={LANGS.map(l => ({ value: l, label: l.toUpperCase(), ariaLabel: translations[l].langName, lang: l }))} />
      </div>

      <Dialog open={changing} onClose={() => { if (!busy) setChanging(false); }} title={s.pwdT}>
        <form className="st-form" onSubmit={save} noValidate>
          <PasswordField
            id="st-pw-new" labels={eye} label={w.newPw} value={password} error={errors.password} autoComplete="new-password" aria-describedby="st-pw-reqs" autoFocus
            onChange={e => { setPassword(e.target.value); if (errors.password || errors.form) setErrors({}); }}
          />
          <PasswordField
            id="st-pw-confirm" labels={eye} label={w.confirmPw} value={confirm} error={errors.confirm} autoComplete="new-password"
            onChange={e => { setConfirm(e.target.value); if (errors.confirm || errors.form) setErrors({}); }}
          />
          <ul className="ac-reqs" id="st-pw-reqs" aria-label={w.reqTitle}>
            {[[lenOk, w.reqLength], [matchOk, w.reqMatch]].map(([ok, label], i) => (
              <li key={i} className={ok ? 'is-ok' : undefined}>
                {ok ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : <Circle size={16} strokeWidth={2} aria-hidden="true" />}
                <span>{label}<span className="ds-vh">: {ok ? w.reqOk : w.reqPending}</span></span>
              </li>
            ))}
          </ul>
          {errors.form && <p className="ac-error" role="alert">{alertIcon}{errors.form}</p>}
          <div className="ds-dialog-actions">
            <Button variant="soft" size="md" onClick={() => setChanging(false)} disabled={busy}>{p.cancel}</Button>
            <Button type="submit" variant="ink" size="md" busy={busy}>{busy ? p.saving : w.saveReset}</Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}
