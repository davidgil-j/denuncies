import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Check, Circle, CircleAlert, LinkIcon } from 'lucide-react';
import { translations } from '../../translations.js';
import { updatePassword, onAuthEvent } from '../../lib/supabase.js';
import { ICON } from '../V2Layout.jsx';
import { FieldError, PwInput, authErrorKey } from './fields.jsx';

const MIN = 8;
// Si en aquest temps no arriba cap esdeveniment d'invitació o recuperació, l'enllaç no és vàlid
const LINK_TIMEOUT = 10000;

/**
 * Crear o canviar la contrasenya des de l'enllaç del correu (invitació o recuperació).
 * Mateixa lògica que src/pages/admin/ResetPassword.jsx. Nota: avui Supabase redirigeix a
 * /admin/reset-password; aquesta pàgina queda preparada per quan es canviï l'adreça.
 */
export default function V2Reset() {
  const { lang } = useOutletContext();
  const t = translations[lang].v2site.reset;
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking | ready | invalid
  const [isInvite, setIsInvite] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const pwRef = useRef(null);
  const confirmRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => { document.title = t.docTitle; }, [t]);

  useEffect(() => {
    // Dos fluxos possibles segons la configuració de Supabase:
    // · implícit: tokens al hash (#access_token=...&type=invite|recovery)
    // · PKCE: un codi d'un sol ús a la query (?code=...)
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const hasCode = Boolean(new URLSearchParams(window.location.search).get('code'));

    if (hashParams.get('type') === 'invite') {
      setIsInvite(true);
      setStatus('ready');
      return undefined;
    }

    let settled = false;
    const stop = onAuthEvent((event) => {
      if (event === 'PASSWORD_RECOVERY') { settled = true; setStatus('ready'); }
      if (event === 'SIGNED_IN' && hasCode) { settled = true; setIsInvite(true); setStatus('ready'); }
    });
    const timer = setTimeout(() => { if (!settled) setStatus(s => (s === 'checking' ? 'invalid' : s)); }, LINK_TIMEOUT);
    return () => { stop(); clearTimeout(timer); };
  }, []);

  useEffect(() => { if (status !== 'checking') titleRef.current?.focus(); }, [status]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    const er = {};
    if (password.length < MIN) er.password = t.errLength;
    else if (password !== confirm) er.confirm = t.errMatch;
    setErrors(er);
    setSubmitError('');
    if (er.password) { pwRef.current?.focus(); return; }
    if (er.confirm) { confirmRef.current?.focus(); return; }

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      const key = authErrorKey(error);
      setSubmitError(key === 'errSame' || key === 'errNetwork' || key === 'errWeak' ? (t[key] || t.errUpdate) : t.errUpdate);
      return;
    }
    navigate('/admin', { replace: true });
  }

  if (status === 'checking') {
    return (
      <div className="v2-center" role="status" aria-live="polite">
        <div className="v2-auth-checking">
          <div className="v2-spinner" />
          <p>{t.checking}</p>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="v2-auth v2-wrap">
        <div className="v2-auth-narrow">
          <div className="v2-auth-panel v2-auth-done">
            <span className="v2-auth-done-icon" aria-hidden="true"><LinkIcon {...ICON} /></span>
            <h1 className="v2-h1" tabIndex={-1} ref={titleRef}>{t.invalidTitle}</h1>
            <p>{t.invalidText}</p>
            <Link className="v2-btn v2-btn-primary" to="/admin/forgot-password">{t.invalidCta}</Link>
          </div>
        </div>
      </div>
    );
  }

  const lenOk = password.length >= MIN;
  const matchOk = password.length > 0 && password === confirm;
  const pwLabels = { show: t.showPw, hide: t.hidePw };

  return (
    <div className="v2-auth v2-wrap">
      <div className="v2-auth-narrow">
        <header className="v2-auth-head">
          <h1 className="v2-h1" tabIndex={-1} ref={titleRef}>{isInvite ? t.titleInvite : t.titleReset}</h1>
          <p className="v2-lead">{isInvite ? t.leadInvite : t.leadReset}</p>
        </header>

        <div className="v2-auth-panel">
          <form onSubmit={handleSubmit} noValidate>
            <div className="v2-fields">
              <div className="v2-field">
                <label htmlFor="v2-rs-pw">{t.newPw}</label>
                <PwInput
                  id="v2-rs-pw" inputRef={pwRef} value={password}
                  onChange={e => { setPassword(e.target.value); if (errors.password) setErrors({}); }}
                  autoComplete="new-password" invalid={!!errors.password}
                  describedBy={['v2-rs-reqs', errors.password && 'v2-rs-pw-err'].filter(Boolean).join(' ')}
                  labels={pwLabels}
                />
                <FieldError id="v2-rs-pw-err">{errors.password}</FieldError>
              </div>
              <div className="v2-field">
                <label htmlFor="v2-rs-confirm">{t.confirmPw}</label>
                <PwInput
                  id="v2-rs-confirm" inputRef={confirmRef} value={confirm}
                  onChange={e => { setConfirm(e.target.value); if (errors.confirm) setErrors({}); }}
                  autoComplete="new-password" invalid={!!errors.confirm}
                  describedBy={errors.confirm ? 'v2-rs-confirm-err' : undefined}
                  labels={pwLabels}
                />
                <FieldError id="v2-rs-confirm-err">{errors.confirm}</FieldError>
              </div>
            </div>

            <ul className="v2-reqs" id="v2-rs-reqs" aria-label={t.reqTitle}>
              {[[lenOk, t.reqLength], [matchOk, t.reqMatch]].map(([ok, label]) => (
                <li key={label} className={ok ? 'is-ok' : undefined}>
                  {ok ? <Check {...ICON} /> : <Circle {...ICON} />}
                  <span>{label}<span className="v2-vh">: {ok ? t.reqOk : t.reqPending}</span></span>
                </li>
              ))}
            </ul>

            {submitError && <div className="v2-note is-error" role="alert"><CircleAlert {...ICON} /><p>{submitError}</p></div>}

            <button type="submit" className="v2-btn v2-btn-primary v2-auth-submit" aria-busy={loading}>
              {loading ? t.submitting : (isInvite ? t.submitInvite : t.submitReset)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
