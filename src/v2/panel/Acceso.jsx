import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { LayoutDashboard, Smartphone, ArrowRight, CircleAlert } from 'lucide-react';
import { translations } from '../../translations.js';
import { signInAdmin, getAdminSession, getMfaState, verifyLoginCode, signOutAdmin, getOrganizationBySlug, IS_DEMO } from '../../lib/supabase.js';
import { LANGS, detectLang, fmt } from '../V2Layout.jsx';
import { EMAIL_RE, authErrorKey } from '../site/fields.jsx';
import { SplitShell, SideTab, Button, Field, OrgMark, OtpInput, Segmented } from '../ui/index.js';
import PasswordField from './PasswordField.jsx';
import { Tp } from './kit.jsx';
import './panel.css';

const LANG_KEY = 'reportia-panel-lang';
// Si la comprobación contra robots no carga en este tiempo (bloqueada, sin red), no impide entrar:
// la contraseña y los dos pasos siguen siendo la barrera real
const TURNSTILE_TIMEOUT = 12000;
const AUTH_ERR = { errCredentials: 'errLogin', errUnconfirmed: 'errConfirm', errRate: 'errRate' };

/**
 * Marco de «Gestionar · Acceso»: la franja azul «Denunciar» y la tarjeta blanca. Lo usan el acceso,
 * la verificación y las pantallas de recuperar y cambiar la contraseña (Contrasena.jsx). Si se llega desde un canal
 * (?from=slug) se ve el nombre de esa empresa y la franja lleva a su paso 1; si no, a la portada.
 */
export function AccessLayout() {
  const [params] = useSearchParams();
  const from = (params.get('from') ?? '').replace(/[^a-z0-9-]/gi, '');
  const urlLang = params.get('lang');
  const [lang, setLangState] = useState(() => {
    if (LANGS.includes(urlLang)) return urlLang;
    try { const saved = localStorage.getItem(LANG_KEY); if (LANGS.includes(saved)) return saved; } catch { /* nada */ }
    return detectLang();
  });
  const [org, setOrg] = useState(null);
  const p = translations[lang].panel;
  const setLang = setLangState;

  // El idioma del acceso (el del canal desde el que se llega, o el elegido aquí) es el del panel al entrar
  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* nada */ }
  }, [lang]);
  useEffect(() => {
    if (!from) return undefined;
    let alive = true;
    getOrganizationBySlug(from).then(({ organization }) => { if (alive) setOrg(organization ?? null); });
    return () => { alive = false; };
  }, [from]);

  const tab = org
    ? <SideTab side="report" label={p.report} icon="back" to={`/canal/${org.slug}/denuncia?lang=${lang}`} ariaLabel={p.reportAria} />
    : <SideTab side="report" label={p.home} icon="back" to={`/?lang=${lang}`} ariaLabel={p.homeAria} />;

  return (
    <SplitShell
      className="ac" active="manage" skip={translations[lang].v2.skip} reportTab={tab}
      manage={(
        <>
          <div className="ac-head">
            <div className="pn-brand">{org ? <><OrgMark name={org.name} /><b>{org.name}</b></> : <><OrgMark name="Reportia" /><b>Reportia</b></>}</div>
            <Segmented
              tone="bg" label={p.language} value={lang} onChange={setLang}
              options={LANGS.map(l => ({ value: l, label: l.toUpperCase(), ariaLabel: translations[l].langName, lang: l }))}
            />
          </div>
          <div className="ac-body"><Outlet context={{ lang, org, from }} /></div>
          <div className="ac-foot">
            <span>{p.noChannel} <Link to={`/crear-compte?lang=${lang}`}>{p.createFree}</Link></span>
            <Link className="ac-by" to={`/?lang=${lang}`}>{p.byReportia}</Link>
          </div>
        </>
      )}
    />
  );
}

export default function Acceso() {
  const { lang, org, from } = useOutletContext();
  const p = translations[lang].panel;
  const navigate = useNavigate();
  const location = useLocation();
  // Si se llegó desde una pantalla del panel, se vuelve a ella después de entrar
  const target = typeof location.state?.from === 'string' && location.state.from.startsWith('/admin') ? location.state.from : '/admin';
  const [step, setStep] = useState('password'); // password | code
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [help, setHelp] = useState(false);
  const [token, setToken] = useState(null);
  // En la demo no hay comprobación contra robots
  const [captchaOff, setCaptchaOff] = useState(IS_DEMO || !import.meta.env.VITE_TURNSTILE_SITE_KEY);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const turnstileRef = useRef(null);
  const [narrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 420px)').matches);

  useEffect(() => { document.title = `${p.manage} · ${org?.name ?? 'Reportia'}`; }, [p, org]);

  // Con la sesión abierta: si falta el código de los dos pasos, se pide; si no, al panel
  useEffect(() => {
    let cancelled = false;
    getAdminSession().then(async s => {
      if (!s || cancelled) return;
      const mfa = await getMfaState();
      if (cancelled) return;
      if (mfa.needsCode) setStep('code'); else navigate(target, { replace: true });
    });
    return () => { cancelled = true; };
  }, [navigate, target]);

  useEffect(() => {
    if (widgetLoaded || captchaOff) return undefined;
    const id = setTimeout(() => setCaptchaOff(true), TURNSTILE_TIMEOUT);
    return () => clearTimeout(id);
  }, [widgetLoaded, captchaOff]);

  async function submit(e) {
    e.preventDefault();
    if (loading) return;
    const er = {};
    if (!EMAIL_RE.test(email.trim())) er.email = p.errEmail;
    if (!password) er.password = p.errPassword;
    setErrors(er);
    setSubmitError('');
    if (er.email) { document.getElementById('ac-email')?.focus(); return; }
    if (er.password) { document.getElementById('ac-pw')?.focus(); return; }
    if (!token && !captchaOff) { setSubmitError(p.errCaptcha); return; }
    setLoading(true);
    const { error } = await signInAdmin(email.trim(), password);
    setLoading(false);
    if (error) {
      setSubmitError(p[AUTH_ERR[authErrorKey(error)] ?? 'errGeneric']);
      setToken(null);
      turnstileRef.current?.reset();
      return;
    }
    const mfa = await getMfaState();
    if (mfa.needsCode) { setStep('code'); return; }
    navigate(target, { replace: true });
  }

  async function verify(value = code) {
    if (loading || value.length !== 6) return;
    setLoading(true);
    const { error } = await verifyLoginCode(value);
    setLoading(false);
    if (error) { setCodeErr(p.codeErr); setCode(''); requestAnimationFrame(() => document.querySelector('.ds-otp-box')?.focus()); return; }
    navigate(target, { replace: true });
  }

  async function backToPassword() {
    await signOutAdmin();
    setStep('password');
    setCode('');
    setCodeErr('');
    setPassword('');
    setHelp(false);
  }

  if (step === 'code') {
    return (
      <form className="ac-form" onSubmit={e => { e.preventDefault(); verify(); }} noValidate>
        <span className="ac-ico" aria-hidden="true"><Smartphone size={34} strokeWidth={1.6} /></span>
        <div className="ac-title">
          <Tp as="h1" className="ds-h1 is-sm" lang={lang} k="codeTitle" />
          <Tp as="p" className="ac-lead" lang={lang} k="codeLead" />
        </div>
        {IS_DEMO && <p className="ac-note">{p.codeDemo}</p>}
        <OtpInput value={code} onChange={v => { setCode(v); setCodeErr(''); }} onComplete={verify} label={p.codeGroup} digitLabel={p.digit} invalid={!!codeErr} describedBy={codeErr ? 'ac-code-e' : undefined} autoFocus />
        {codeErr && <p className="ds-field-error" id="ac-code-e" role="alert"><CircleAlert size={16} strokeWidth={2.2} aria-hidden="true" />{codeErr}</p>}
        <Button type="submit" variant="ink" size="lg" full busy={loading} disabled={code.length !== 6}><Tp lang={lang} k={loading ? 'entering' : 'enter'} /></Button>
        <div className="ac-row">
          <button type="button" className="ac-link" onClick={backToPassword}>{p.codeBack}</button>
          <button type="button" className="ac-link" aria-expanded={help} aria-controls="ac-help" onClick={() => setHelp(h => !h)}>{p.noPhone}</button>
        </div>
        {help && <p className="ac-note" id="ac-help" role="status">{p.noPhoneText}</p>}
      </form>
    );
  }

  return (
    <form className="ac-form" onSubmit={submit} noValidate>
      <span className="ac-ico" aria-hidden="true"><LayoutDashboard size={34} strokeWidth={1.6} /></span>
      <div className="ac-title">
        <Tp as="h1" className="ds-h1" lang={lang} k="manage" />
        <Tp as="p" className="ac-lead" lang={lang} pick={x => (org ? fmt(x.accessLead, { org: org.name }) : x.accessLeadNoOrg)} />
      </div>
      <div className="ac-fields">
        <Field
          id="ac-email" type="email" inputMode="email" label={p.email} value={email} error={errors.email}
          autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
          onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(x => ({ ...x, email: null })); }}
        />
        <PasswordField
          id="ac-pw" labels={{ show: p.showPw, hide: p.hidePw }} label={p.password} value={password} error={errors.password} autoComplete="current-password"
          onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(x => ({ ...x, password: null })); }}
        />
        {!captchaOff && (
          <div className="ac-captcha" aria-label={translations[lang].v2.verifying}>
            <Turnstile
              ref={turnstileRef} siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              options={{ language: lang, size: narrow ? 'compact' : 'normal' }}
              scriptOptions={{ onError: () => setCaptchaOff(true) }}
              onWidgetLoad={() => setWidgetLoaded(true)} onSuccess={setToken}
              onError={() => { setToken(null); setCaptchaOff(true); }} onUnsupported={() => setCaptchaOff(true)} onExpire={() => setToken(null)}
            />
          </div>
        )}
        {submitError && <p className="ac-error" role="alert"><CircleAlert size={18} strokeWidth={2.2} aria-hidden="true" />{submitError}</p>}
        <Button type="submit" variant="ink" size="lg" full busy={loading} disabled={!token && !captchaOff && !loading} iconEnd={<ArrowRight size={20} strokeWidth={2.2} aria-hidden="true" />}>
          <Tp lang={lang} k={loading ? 'entering' : 'enter'} />
        </Button>
        <div className="ac-row">
          <Link className="ac-link" to={`/admin/forgot-password${from ? `?from=${from}` : ''}`}>{p.forgot}</Link>
          <span className="ac-hint">{p.thenCode}</span>
        </div>
      </div>
      <p className="ac-note">{p.wrongA}<b>{p.wrongB}</b>{p.wrongC}</p>
    </form>
  );
}
