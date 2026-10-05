import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowRight, Check, CircleAlert, MailCheck, UserRoundCog, Hourglass } from 'lucide-react';
import { translations } from '../../translations.js';
import { signUpOrganization } from '../../lib/supabase.js';
import { ICON, fmt, stableOf } from '../V2Layout.jsx';
import { TRIAL_DAYS } from './plans.js';
import { EMAIL_RE, FieldError, PwInput, authErrorKey } from './fields.jsx';

const EMPTY = { companyName: '', fullName: '', email: '', password: '', terms: false };

// Text que reserva l'espai de l'idioma més llarg: en canviar d'idioma, la pàgina no es mou
const S = stableOf(T => T.v2site.signup);

export default function V2Signup() {
  const { lang } = useOutletContext();
  const t = translations[lang].v2site.signup;
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const doneRef = useRef(null);
  const refs = { companyName: useRef(null), fullName: useRef(null), email: useRef(null), password: useRef(null), terms: useRef(null) };

  useEffect(() => { document.title = t.docTitle; }, [t]);
  useEffect(() => { if (done) doneRef.current?.focus(); }, [done]);

  function update(field) {
    return e => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm(f => ({ ...f, [field]: value }));
      if (errors[field]) setErrors(er => ({ ...er, [field]: null }));
    };
  }

  function validate() {
    const er = {};
    if (!form.companyName.trim()) er.companyName = 'errCompany';
    if (!form.fullName.trim()) er.fullName = 'errName';
    if (!EMAIL_RE.test(form.email.trim())) er.email = 'errEmail';
    // Contrasenya de 8 caràcters o més, que no siguin només espais
    if (form.password.length < 8 || !form.password.trim()) er.password = 'errPassword';
    if (!form.terms) er.terms = 'errTerms';
    return er;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    const er = validate();
    setErrors(er);
    setSubmitError('');
    const first = Object.keys(EMPTY).find(k => er[k]);
    if (first) { refs[first].current?.focus(); return; }

    setLoading(true);
    const { needsConfirmation, error } = await signUpOrganization({
      companyName: form.companyName.trim(),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
    });
    setLoading(false);

    if (error) {
      const key = authErrorKey(error);
      if (key === 'errEmail') { setErrors({ email: 'errEmail' }); refs.email.current?.focus(); return; }
      setSubmitError(t[key] || t.errGeneric);
      return;
    }
    if (needsConfirmation) setDone(true);
    else navigate('/admin', { replace: true });
  }

  const err = k => (errors[k] ? t[errors[k]] : '');
  const described = (k, help) => [help && `v2-su-${k}-help`, errors[k] && `v2-su-${k}-err`].filter(Boolean).join(' ') || undefined;

  return (
    <div className="v2-auth v2-wrap">
      <div className="v2-auth-grid">
        <header className="v2-auth-head">
          <S as="h1" className="v2-h1" k="title" />
          <S as="p" className="v2-lead" k="lead" />
        </header>

        <div className="v2-auth-main">
          <div className="v2-auth-panel">
            {done ? (
              <div className="v2-auth-done" aria-live="polite">
                <span className="v2-auth-done-icon" aria-hidden="true"><MailCheck {...ICON} /></span>
                <h2 tabIndex={-1} ref={doneRef}>{t.doneTitle}</h2>
                <p>{fmt(t.doneText, { email: form.email.trim() })}<small>{t.doneSpam}</small></p>
                <Link className="v2-btn v2-btn-secondary icon-trail" to="/admin/login">{t.doneCta}<ArrowRight {...ICON} /></Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="v2-fields">
                  <div className="v2-field">
                    <label htmlFor="v2-su-company">{t.company}</label>
                    <S as="p" className="v2-help" id="v2-su-companyName-help" k="companyHelp" />
                    <input
                      ref={refs.companyName} id="v2-su-company" className="v2-input" type="text" maxLength={120}
                      value={form.companyName} onChange={update('companyName')} autoComplete="organization"
                      aria-invalid={!!errors.companyName || undefined} aria-describedby={described('companyName', true)}
                    />
                    <FieldError id="v2-su-companyName-err">{err('companyName')}</FieldError>
                  </div>
                  <div className="v2-field">
                    <label htmlFor="v2-su-name">{t.fullName}</label>
                    <input
                      ref={refs.fullName} id="v2-su-name" className="v2-input" type="text" maxLength={120}
                      value={form.fullName} onChange={update('fullName')} autoComplete="name"
                      aria-invalid={!!errors.fullName || undefined} aria-describedby={described('fullName', false)}
                    />
                    <FieldError id="v2-su-fullName-err">{err('fullName')}</FieldError>
                  </div>
                  <div className="v2-field">
                    <label htmlFor="v2-su-email">{t.email}</label>
                    <S as="p" className="v2-help" id="v2-su-email-help" k="emailHelp" />
                    <input
                      ref={refs.email} id="v2-su-email" className="v2-input" type="email" inputMode="email"
                      value={form.email} onChange={update('email')} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      aria-invalid={!!errors.email || undefined} aria-describedby={described('email', true)}
                    />
                    <FieldError id="v2-su-email-err">{err('email')}</FieldError>
                  </div>
                  <div className="v2-field">
                    <label htmlFor="v2-su-pw">{t.password}</label>
                    <S as="p" className="v2-help" id="v2-su-password-help" k="passwordHelp" />
                    <PwInput
                      id="v2-su-pw" inputRef={refs.password} value={form.password} onChange={update('password')}
                      autoComplete="new-password" invalid={!!errors.password} describedBy={described('password', true)}
                      labels={{ show: t.showPw, hide: t.hidePw }}
                    />
                    <FieldError id="v2-su-password-err">{err('password')}</FieldError>
                  </div>
                </div>

                <label className={`v2-check${form.terms ? ' is-on' : ''}${errors.terms ? ' is-invalid' : ''}`}>
                  <input
                    ref={refs.terms} id="v2-su-terms" type="checkbox" checked={form.terms} onChange={update('terms')}
                    aria-invalid={!!errors.terms || undefined} aria-describedby={errors.terms ? 'v2-su-terms-err' : undefined}
                  />
                  <span className="v2-box" aria-hidden="true"><Check strokeWidth={3} aria-hidden="true" /></span>
                  <S pick={x => <>{x.terms} <Link className="v2-link" to="/privacitat" target="_blank" tabIndex={x === t ? undefined : -1}>{x.termsLink}</Link>.</>} />
                </label>
                <FieldError id="v2-su-terms-err">{err('terms')}</FieldError>

                <p className="v2-su-trial"><Hourglass {...ICON} /><S pick={x => fmt(x.trialNote, { days: TRIAL_DAYS })} /></p>

                {submitError && <div className="v2-note is-error" role="alert"><CircleAlert {...ICON} /><p>{submitError}</p></div>}

                <button type="submit" className="v2-btn v2-btn-primary v2-auth-submit" aria-busy={loading}>
                  <S k={loading ? 'submitting' : 'submit'} />
                </button>
              </form>
            )}
          </div>
          {!done && (
            <S as="p" className="v2-auth-alt" pick={x => <>{x.haveAccount} <Link className="v2-link" to="/admin/login" tabIndex={x === t ? undefined : -1}>{x.login}</Link></>} />
          )}
        </div>

        <aside className="v2-auth-aside" aria-labelledby="v2-su-inc">
          <S as="h2" id="v2-su-inc" k="incTitle" />
          <ul className="v2-auth-inc">
            {t.incItems.map((item, i) => <li key={i}><Check {...ICON} /><S pick={x => x.incItems[i]} /></li>)}
          </ul>
          <div className="v2-note is-quiet"><UserRoundCog {...ICON} /><S as="p" k="incNote" /></div>
        </aside>
      </div>
    </div>
  );
}
