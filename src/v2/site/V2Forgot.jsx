import React, { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ChevronLeft, CircleAlert, MailCheck } from 'lucide-react';
import { translations } from '../../translations.js';
import { sendPasswordReset } from '../../lib/supabase.js';
import { ICON, fmt, stableOf } from '../V2Layout.jsx';
import { EMAIL_RE, FieldError, authErrorKey } from './fields.jsx';

// Text que reserva l'espai de l'idioma més llarg: en canviar d'idioma, la pantalla no es mou
const S = stableOf(T => T.v2site.forgot);

export default function V2Forgot() {
  const { lang } = useOutletContext();
  const t = translations[lang].v2site.forgot;
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const emailRef = useRef(null);
  const sentRef = useRef(null);

  useEffect(() => { document.title = t.docTitle; }, [t]);
  useEffect(() => { if (sent) sentRef.current?.focus(); }, [sent]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setSubmitError('');
    if (!EMAIL_RE.test(email.trim())) { setEmailError(true); emailRef.current?.focus(); return; }

    setLoading(true);
    const { error } = await sendPasswordReset(email.trim());
    setLoading(false);
    if (error) {
      // Només es mostren errors que no revelen si el correu té compte (format, límit, xarxa)
      const key = authErrorKey(error);
      if (key === 'errEmail') { setEmailError(true); emailRef.current?.focus(); return; }
      setSubmitError(t[key] || t.errGeneric);
      return;
    }
    setSent(true);
  }

  return (
    <div className="v2-auth v2-wrap">
      <div className="v2-auth-narrow">
        <header className="v2-auth-head">
          <S as="h1" className="v2-h1" k="title" />
          {!sent && <S as="p" className="v2-lead" k="lead" />}
        </header>

        <div className="v2-auth-panel">
          {sent ? (
            <div className="v2-auth-done" aria-live="polite">
              <span className="v2-auth-done-icon" aria-hidden="true"><MailCheck {...ICON} /></span>
              <S as="h2" tabIndex={-1} ref={sentRef} k="sentTitle" />
              <p>{fmt(t.sentText, { email: email.trim() })}<small><S k="sentSpam" /></small></p>
              <Link className="v2-btn v2-btn-secondary icon-lead" to="/admin/login"><ChevronLeft {...ICON} /><S k="back" /></Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="v2-field">
                <label htmlFor="v2-fg-email"><S k="email" /></label>
                <input
                  ref={emailRef} id="v2-fg-email" className="v2-input" type="email" inputMode="email"
                  value={email} onChange={e => { setEmail(e.target.value); setEmailError(false); }}
                  autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  aria-invalid={emailError || undefined} aria-describedby={emailError ? 'v2-fg-email-err' : undefined}
                />
                <FieldError id="v2-fg-email-err">{emailError ? t.errEmail : ''}</FieldError>
              </div>

              {submitError && <div className="v2-note is-error" role="alert"><CircleAlert {...ICON} /><p>{submitError}</p></div>}

              <button type="submit" className="v2-btn v2-btn-primary v2-auth-submit" aria-busy={loading}>
                {loading ? t.submitting : t.submit}
              </button>
            </form>
          )}
        </div>

        {!sent && (
          <p className="v2-auth-alt">
            <Link className="v2-btn v2-btn-quiet icon-lead v2-auth-back" to="/admin/login"><ChevronLeft {...ICON} /><S k="back" /></Link>
          </p>
        )}
      </div>
    </div>
  );
}
