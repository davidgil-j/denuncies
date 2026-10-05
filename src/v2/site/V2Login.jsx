import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { CircleAlert, FilePlus2, ShieldCheck, Info } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { translations } from '../../translations.js';
import { signInAdmin, getAdminSession, getMfaState, verifyLoginCode, signOutAdmin, IS_DEMO } from '../../lib/supabase.js';
import { ICON, stableOf } from '../V2Layout.jsx';
import { EMAIL_RE, FieldError, PwInput, authErrorKey } from './fields.jsx';

// Text que reserva l'espai de l'idioma més llarg: en canviar d'idioma, la pantalla no es mou
const S = stableOf(T => T.v2site.login);

const PANEL = '/admin';
// Si la verificació no carrega en aquest temps (bloquejada, sense xarxa), no impedeix entrar:
// la contrasenya de Supabase continua sent la barrera real (mateix criteri que el login actual).
const TURNSTILE_TIMEOUT = 12000;

export default function V2Login() {
  const { lang } = useOutletContext();
  const t = translations[lang].v2site.login;
  const navigate = useNavigate();
  const location = useLocation();
  // Si s'hi ha arribat des d'una pàgina del panell, s'hi torna després d'entrar
  const target = typeof location.state?.from === 'string' && location.state.from.startsWith('/admin') ? location.state.from : PANEL;
  const [step, setStep] = useState('password'); // password | code
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const codeRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  // En mode demo no hi ha verificació (el giny de proves de Cloudflare no s'ha d'ensenyar)
  const [turnstileFailed, setTurnstileFailed] = useState(IS_DEMO || !import.meta.env.VITE_TURNSTILE_SITE_KEY);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const turnstileRef = useRef(null);
  // A 360 px el giny normal (300 px) no cap dins del formulari: es fa servir el compacte
  const [narrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 379px)').matches);
  const emailRef = useRef(null);
  const pwRef = useRef(null);

  useEffect(() => { document.title = t.docTitle; }, [t]);

  // Amb sessió oberta: si falta el codi de la verificació en dos passos es demana; si no, al panell
  useEffect(() => {
    let cancelled = false;
    getAdminSession().then(async s => {
      if (!s || cancelled) return;
      const mfa = await getMfaState();
      if (cancelled) return;
      if (mfa.needsCode) setStep('code');
      else navigate(target, { replace: true });
    });
    return () => { cancelled = true; };
  }, [navigate, target]);

  useEffect(() => { if (step === 'code') codeRef.current?.focus(); }, [step]);

  async function submitCode(e) {
    e.preventDefault();
    if (loading) return;
    if (code.length !== 6) { setCodeErr(t.codeErrLength); codeRef.current?.focus(); return; }
    setLoading(true);
    const { error } = await verifyLoginCode(code);
    setLoading(false);
    if (error) { setCodeErr(t.codeErr); setCode(''); codeRef.current?.focus(); return; }
    navigate(target, { replace: true });
  }

  async function otherAccount() {
    await signOutAdmin();
    setStep('password');
    setCode('');
    setCodeErr('');
    setPassword('');
  }

  useEffect(() => {
    if (widgetLoaded || turnstileFailed) return undefined;
    const id = setTimeout(() => setTurnstileFailed(true), TURNSTILE_TIMEOUT);
    return () => clearTimeout(id);
  }, [widgetLoaded, turnstileFailed]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    const er = {};
    if (!EMAIL_RE.test(email.trim())) er.email = 'errEmail';
    if (!password) er.password = 'errPassword';
    setErrors(er);
    setSubmitError('');
    if (er.email) { emailRef.current?.focus(); return; }
    if (er.password) { pwRef.current?.focus(); return; }
    if (!turnstileToken && !turnstileFailed) { setSubmitError(t.errCaptcha); return; }

    setLoading(true);
    const { error } = await signInAdmin(email.trim(), password);
    setLoading(false);

    if (error) {
      const key = authErrorKey(error);
      setSubmitError(t[key] || t.errGeneric);
      setTurnstileToken(null);
      turnstileRef.current?.reset();
      return;
    }
    // Segon pas: si té la verificació activada, cal el codi abans d'entrar
    const mfa = await getMfaState();
    if (mfa.needsCode) { setStep('code'); return; }
    navigate(target, { replace: true });
  }

  const err = k => (errors[k] ? t[errors[k]] : '');
  const canSubmit = !!turnstileToken || turnstileFailed;

  if (step === 'code') {
    return (
      <div className="v2-auth v2-wrap">
        <div className="v2-auth-narrow">
          <header className="v2-auth-head">
            <S as="h1" className="v2-h1" k="codeTitle" />
            <S as="p" className="v2-lead" k="codeLead" />
          </header>
          {IS_DEMO && <div className="v2-note is-quiet" role="note"><Info {...ICON} /><S as="p" k="codeDemo" /></div>}
          <div className="v2-auth-panel">
            <form onSubmit={submitCode} noValidate>
              <div className="v2-field">
                <label htmlFor="v2-li-code"><S k="codeLabel" /></label>
                <input
                  ref={codeRef} id="v2-li-code" className="v2-input v2-otp" value={code}
                  onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setCodeErr(''); }}
                  inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" enterKeyHint="done" placeholder="000000"
                  aria-invalid={!!codeErr || undefined} aria-describedby={codeErr ? 'v2-li-code-err' : undefined}
                />
                <FieldError id="v2-li-code-err">{codeErr}</FieldError>
              </div>
              <button type="submit" className="v2-btn v2-btn-primary v2-auth-submit icon-lead" aria-busy={loading}>
                <ShieldCheck {...ICON} /><S k={loading ? 'codeSubmitting' : 'codeSubmit'} />
              </button>
            </form>
          </div>
          <p className="v2-auth-alt"><button type="button" className="v2-link v2-link-btn" onClick={otherAccount}><S k="codeOther" /></button></p>
        </div>
      </div>
    );
  }

  return (
    <div className="v2-auth v2-wrap">
      <div className="v2-auth-narrow">
        <header className="v2-auth-head">
          <S as="h1" className="v2-h1" k="title" />
          <S as="p" className="v2-lead" k="lead" />
        </header>

        <div className="v2-note" role="note">
          <FilePlus2 {...ICON} />
          <p>{t.wrongTitle}<small><S k="wrongText" /></small></p>
        </div>

        <div className="v2-auth-panel">
          <form onSubmit={handleSubmit} noValidate>
            <div className="v2-fields">
              <div className="v2-field">
                <label htmlFor="v2-li-email"><S k="email" /></label>
                <input
                  ref={emailRef} id="v2-li-email" className="v2-input" type="email" inputMode="email"
                  value={email} onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(x => ({ ...x, email: null })); }}
                  autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  aria-invalid={!!errors.email || undefined} aria-describedby={errors.email ? 'v2-li-email-err' : undefined}
                />
                <FieldError id="v2-li-email-err">{err('email')}</FieldError>
              </div>
              <div className="v2-field">
                <label htmlFor="v2-li-pw"><S k="password" /></label>
                <PwInput
                  id="v2-li-pw" inputRef={pwRef} value={password}
                  onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(x => ({ ...x, password: null })); }}
                  autoComplete="current-password" invalid={!!errors.password}
                  describedBy={errors.password ? 'v2-li-pw-err' : undefined}
                  labels={{ show: translations[lang].v2site.signup.showPw, hide: translations[lang].v2site.signup.hidePw }}
                />
                <FieldError id="v2-li-pw-err">{err('password')}</FieldError>
                <Link className="v2-link v2-auth-forgot" to="/admin/forgot-password"><S k="forgot" /></Link>
              </div>
            </div>

            {!turnstileFailed && (
              <div className="v2-turnstile" aria-label={t.verifying}>
                <Turnstile
                  ref={turnstileRef}
                  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                  options={{ language: lang, size: narrow ? 'compact' : 'normal' }}
                  scriptOptions={{ onError: () => setTurnstileFailed(true) }}
                  onWidgetLoad={() => setWidgetLoaded(true)}
                  onSuccess={token => setTurnstileToken(token)}
                  onError={() => { setTurnstileToken(null); setTurnstileFailed(true); }}
                  onUnsupported={() => setTurnstileFailed(true)}
                  onExpire={() => setTurnstileToken(null)}
                />
              </div>
            )}

            {submitError && <div className="v2-note is-error" role="alert"><CircleAlert {...ICON} /><p>{submitError}</p></div>}

            <button
              type="submit"
              className="v2-btn v2-btn-primary v2-auth-submit"
              disabled={!canSubmit && !loading}
              aria-busy={loading}
            >
              {loading ? t.submitting : t.submit}
            </button>
          </form>
        </div>

        <S as="p" className="v2-auth-alt" pick={x => <>{x.noAccount} <Link className="v2-link" to="/crear-compte">{x.signup}</Link></>} />
      </div>
    </div>
  );
}
