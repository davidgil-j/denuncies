import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { CircleAlert, FilePlus2 } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { translations } from '../../translations.js';
import { signInAdmin, getAdminSession, IS_DEMO } from '../../lib/supabase.js';
import { ICON } from '../V2Layout.jsx';
import { EMAIL_RE, FieldError, PwInput, authErrorKey } from './fields.jsx';

const PANEL = '/admin';
// Si la verificació no carrega en aquest temps (bloquejada, sense xarxa), no impedeix entrar:
// la contrasenya de Supabase continua sent la barrera real (mateix criteri que el login actual).
const TURNSTILE_TIMEOUT = 12000;

export default function V2Login() {
  const { lang } = useOutletContext();
  const t = translations[lang].v2site.login;
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  // En mode demo no hi ha verificació (el giny de proves de Cloudflare no s'ha d'ensenyar)
  const [turnstileFailed, setTurnstileFailed] = useState(IS_DEMO);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const turnstileRef = useRef(null);
  // A 360 px el giny normal (300 px) no cap dins del formulari: es fa servir el compacte
  const [narrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 379px)').matches);
  const emailRef = useRef(null);
  const pwRef = useRef(null);

  useEffect(() => { document.title = t.docTitle; }, [t]);

  // Amb sessió oberta, directament al panell
  useEffect(() => {
    let cancelled = false;
    getAdminSession().then(s => { if (s && !cancelled) navigate(PANEL, { replace: true }); });
    return () => { cancelled = true; };
  }, [navigate]);

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
    navigate(PANEL, { replace: true });
  }

  const err = k => (errors[k] ? t[errors[k]] : '');
  const canSubmit = !!turnstileToken || turnstileFailed;

  return (
    <div className="v2-auth v2-wrap">
      <div className="v2-auth-narrow">
        <header className="v2-auth-head">
          <h1 className="v2-h1">{t.title}</h1>
          <p className="v2-lead">{t.lead}</p>
        </header>

        <div className="v2-note" role="note">
          <FilePlus2 {...ICON} />
          <p>{t.wrongTitle}<small>{t.wrongText}</small></p>
        </div>

        <div className="v2-auth-panel">
          <form onSubmit={handleSubmit} noValidate>
            <div className="v2-fields">
              <div className="v2-field">
                <label htmlFor="v2-li-email">{t.email}</label>
                <input
                  ref={emailRef} id="v2-li-email" className="v2-input" type="email" inputMode="email"
                  value={email} onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(x => ({ ...x, email: null })); }}
                  autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  aria-invalid={!!errors.email || undefined} aria-describedby={errors.email ? 'v2-li-email-err' : undefined}
                />
                <FieldError id="v2-li-email-err">{err('email')}</FieldError>
              </div>
              <div className="v2-field">
                <label htmlFor="v2-li-pw">{t.password}</label>
                <PwInput
                  id="v2-li-pw" inputRef={pwRef} value={password}
                  onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(x => ({ ...x, password: null })); }}
                  autoComplete="current-password" invalid={!!errors.password}
                  describedBy={errors.password ? 'v2-li-pw-err' : undefined}
                  labels={{ show: translations[lang].v2site.signup.showPw, hide: translations[lang].v2site.signup.hidePw }}
                />
                <FieldError id="v2-li-pw-err">{err('password')}</FieldError>
                <Link className="v2-link v2-auth-forgot" to="/admin/forgot-password">{t.forgot}</Link>
              </div>
            </div>

            {!turnstileFailed && (
              <div className="v2-turnstile" aria-label={t.verifying}>
                <Turnstile
                  ref={turnstileRef}
                  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
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

        <p className="v2-auth-alt">{t.noAccount} <Link className="v2-link" to="/crear-compte">{t.signup}</Link></p>
      </div>
    </div>
  );
}
