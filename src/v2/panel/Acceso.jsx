import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CircleAlert } from 'lucide-react';
import { translations } from '../../translations.js';
import './texts.js'; // textos del panel (lado Gestionar)
import { signInAdmin, getAdminSession, getMfaState, verifyLoginCode, signOutAdmin, getOrganizationBySlug, IS_DEMO } from '../../lib/supabase.js';
import { LANGS, detectLang, fmt } from '../V2Layout.jsx';
import { EMAIL_RE, authErrorKey } from '../site/fields.jsx';
import { SplitShell, BrandLogo, Button, Card, Field, OtpInput, ReportiaMark, Segmented } from '../ui/index.js';
import Captcha, { captchaRequired } from '../ui/Captcha.jsx';
import { useBrandTheme } from '../lib/brand.js';
import PasswordField from './PasswordField.jsx';
import { Tp } from './kit.jsx';
import './panel.css';

const LANG_KEY = 'reportia-panel-lang';
const AUTH_ERR = { errCredentials: 'errLogin', errUnconfirmed: 'errConfirm', errRate: 'errRate' };

/**
 * Marco del acceso al panel: una barra con la empresa y el idioma, y una tarjeta de 400 px en el centro. Lo usan
 * el acceso, la verificación y las pantallas de recuperar y cambiar la contraseña (Contrasena.jsx). Si se llega
 * desde un canal (?from=slug) se ve el nombre de esa empresa y, debajo, «Volver al inicio del canal»; si no, se
 * vuelve a la portada. Aquí no se vende nada: es la puerta del equipo de un cliente.
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
  // Desde el canal de una empresa, el acceso lleva su paleta; el modo, el del sistema (aún no se sabe quién entra)
  useBrandTheme(org?.brand_palette, 'light'); // 8b: el acceso al panel siempre en claro

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

  const T = translations[lang];
  return (
    <SplitShell
      className="ac" active="manage" skip={T.v2.skip}
      manage={(
        <>
          <header className="ac-head">
            <div className="pn-brand">{org ? <span className="ds-brand"><BrandLogo org={org} /><b title={org.name}>{org.name}</b></span> : <ReportiaMark />}</div>
            <Segmented
              tone="plain" label={p.language} value={lang} onChange={setLang}
              options={LANGS.map(l => ({ value: l, label: l.toUpperCase(), ariaLabel: `${l.toUpperCase()} · ${translations[l].langName}`, lang: l }))}
            />
          </header>
          <div className="ac-body">
            <Card className="ac-card"><Outlet context={{ lang, org, from }} /></Card>
            {org
              ? <Link className="ac-back" to={`/canal/${org.slug}?lang=${lang}`}><ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />{T.canal.backHome}</Link>
              : <Link className="ac-back" reloadDocument to={`/?lang=${lang}`}><ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />{p.homeAria}</Link>}
          </div>
          <div className="ac-foot"><Link className="ac-by" reloadDocument to={`/?lang=${lang}`}>{p.byReportia}</Link></div>
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
  // Se acaba de cerrar la sesión por inactividad (A1-13)
  const idle = new URLSearchParams(location.search).get('idle') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [help, setHelp] = useState(false);
  // La comprobación contra robots (n.º 71): con la clave puesta, sin token no se entra (Supabase lo rechazaría igual)
  const needsCaptcha = captchaRequired(IS_DEMO);
  const [token, setToken] = useState(null);
  const [captchaRound, setCaptchaRound] = useState(0);

  useEffect(() => { document.title = `${step === 'code' ? p.codeTitle : p.accessTitle} · ${org?.name ?? 'Reportia'}`; }, [p, org, step]);

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
    if (needsCaptcha && !token) { setSubmitError(p.errCaptcha); return; }
    setLoading(true);
    const { error } = await signInAdmin(email.trim(), password, needsCaptcha ? token : undefined);
    setLoading(false);
    if (error) {
      const key = authErrorKey(error);
      setSubmitError(key === 'errCaptcha' ? translations[lang].v2.captchaRejected : p[AUTH_ERR[key] ?? 'errGeneric']);
      // El token ya se ha gastado: se pide otro
      if (needsCaptcha) setCaptchaRound(n => n + 1);
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
        <div className="ac-title">
          <Tp as="h1" className="ds-h1 is-sm" lang={lang} k="codeTitle" />
          <Tp as="p" className="ac-lead" lang={lang} k="codeLead" />
        </div>
        {IS_DEMO && <p className="ac-note">{p.codeDemo}</p>}
        <OtpInput value={code} onChange={v => { setCode(v); setCodeErr(''); }} onComplete={verify} label={p.codeGroup} digitLabel={p.digit} invalid={!!codeErr} describedBy={codeErr ? 'ac-code-e' : undefined} autoFocus />
        {codeErr && <p className="ds-field-error" id="ac-code-e" role="alert"><CircleAlert size={16} strokeWidth={1.8} aria-hidden="true" />{codeErr}</p>}
        <Button type="submit" variant="report" size="lg" full busy={loading} disabled={code.length !== 6}><Tp lang={lang} k={loading ? 'entering' : 'enter'} /></Button>
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
      <div className="ac-title">
        <Tp as="h1" className="ds-h1 is-sm" lang={lang} k="accessTitle" />
        <Tp as="p" className="ac-lead" lang={lang} pick={x => (org ? fmt(x.accessLead, { org: org.name }) : x.accessLeadNoOrg)} />
      </div>
      {idle && <p className="ac-idle" role="status">{p.idleOut}</p>}
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
        <Captcha lang={lang} demo={IS_DEMO} onToken={setToken} resetKey={captchaRound} className="ac-captcha" />
        {submitError && <p className="ac-error" role="alert"><CircleAlert size={16} strokeWidth={1.8} aria-hidden="true" />{submitError}</p>}
        <Button type="submit" variant="report" size="lg" full busy={loading} disabled={needsCaptcha && !token && !loading} iconEnd={<ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />}>
          <Tp lang={lang} k={loading ? 'entering' : 'enter'} />
        </Button>
        <div className="ac-row">
          <Link className="ac-link" to={`/admin/forgot-password${from ? `?from=${from}` : ''}`}>{p.forgot}</Link>
        </div>
        <p className="ac-hint">{p.thenCode}</p>
      </div>
    </form>
  );
}
