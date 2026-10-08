import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { KeyRound, MailCheck, Link2Off, Check, Circle, CircleAlert, ArrowLeft } from 'lucide-react';
import { translations } from '../../translations.js';
import { sendPasswordReset, updatePassword, onAuthEvent, getPasswordLinkState } from '../../lib/supabase.js';
import { fmt } from '../V2Layout.jsx';
import { EMAIL_RE, authErrorKey } from '../site/fields.jsx';
import { Button, Field, Skeleton } from '../ui/index.js';
import PasswordField from './PasswordField.jsx';
import { Tp } from './kit.jsx';

const MIN = 8;
// Si en este tiempo no llega ningún aviso de invitación o de recuperación, el enlace no es válido
const LINK_TIMEOUT = 10000;

/** Recuperar la contraseña: se pide el correo y se envía un enlace. Mismo diseño que el acceso. */
export function Recuperar() {
  const { lang, org, from } = useOutletContext();
  const p = translations[lang].panel;
  const t = p.pw;
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const sentRef = useRef(null);
  const loginTo = `/admin/login${from ? `?from=${from}` : ''}`;

  useEffect(() => { document.title = `${t.fgTitle} · ${org?.name ?? 'Reportia'}`; }, [t, org]);
  useEffect(() => { if (sent) sentRef.current?.focus(); }, [sent]);

  async function submit(e) {
    e.preventDefault();
    if (loading) return;
    setSubmitError('');
    if (!EMAIL_RE.test(email.trim())) { setEmailError(true); document.getElementById('pw-email')?.focus(); return; }
    setLoading(true);
    const { error } = await sendPasswordReset(email.trim());
    setLoading(false);
    if (error) {
      // Solo se muestran errores que no revelan si el correo tiene cuenta (formato, límite, red)
      const key = authErrorKey(error);
      if (key === 'errEmail') { setEmailError(true); document.getElementById('pw-email')?.focus(); return; }
      setSubmitError(key === 'errRate' ? p.errRate : key === 'errNetwork' ? t.errNetwork : t.fgErr);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="ac-form" aria-live="polite">
        <span className="ac-ico" aria-hidden="true"><MailCheck size={34} strokeWidth={1.6} /></span>
        <div className="ac-title">
          <Tp as="h1" className="ds-h1 is-sm" lang={lang} pick={x => x.pw.sentTitle} ref={sentRef} tabIndex={-1} />
          <p className="ac-lead">{fmt(t.sentText, { email: email.trim() })}</p>
        </div>
        <p className="ac-note">{t.sentSpam}</p>
        <Button variant="ink" size="lg" full to={loginTo} icon={<ArrowLeft size={20} strokeWidth={2.2} aria-hidden="true" />}><Tp lang={lang} pick={x => x.pw.back} /></Button>
      </div>
    );
  }

  return (
    <form className="ac-form" onSubmit={submit} noValidate>
      <span className="ac-ico" aria-hidden="true"><KeyRound size={34} strokeWidth={1.6} /></span>
      <div className="ac-title">
        <Tp as="h1" className="ds-h1 is-sm" lang={lang} pick={x => x.pw.fgTitle} />
        <Tp as="p" className="ac-lead" lang={lang} pick={x => x.pw.fgLead} />
      </div>
      <div className="ac-fields">
        <Field
          id="pw-email" type="email" inputMode="email" label={p.email} value={email} error={emailError ? p.errEmail : ''}
          autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
          onChange={e => { setEmail(e.target.value); setEmailError(false); }}
        />
        {submitError && <p className="ac-error" role="alert"><CircleAlert size={18} strokeWidth={2.2} aria-hidden="true" />{submitError}</p>}
        <Button type="submit" variant="ink" size="lg" full busy={loading}><Tp lang={lang} pick={x => (loading ? x.pw.fgSending : x.pw.fgSend)} /></Button>
        <div className="ac-row"><Link className="ac-link" to={loginTo}>{t.back}</Link></div>
      </div>
    </form>
  );
}

/**
 * Crear o cambiar la contraseña desde el enlace del correo (invitación o recuperación).
 * La lógica es la de siempre: Supabase redirige aquí con el permiso en la dirección.
 */
export function Cambiar() {
  const { lang, org } = useOutletContext();
  const p = translations[lang].panel;
  const t = p.pw;
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking | ready | invalid
  const [isInvite, setIsInvite] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => { document.title = `${t.titleReset} · ${org?.name ?? 'Reportia'}`; }, [t, org]);

  useEffect(() => {
    // Dos formas posibles según la configuración de Supabase:
    // · implícita: el permiso llega en el hash (#access_token=...&type=invite|recovery)
    // · PKCE: un código de un solo uso en la dirección (?code=...)
    // Supabase lo procesa al arrancar la aplicación, antes de que esta pantalla exista: por eso no basta
    // con escuchar el aviso. Primero se mira si la sesión del enlace ya está; el aviso queda de respaldo.
    let alive = true;
    let settled = false;
    const settle = (next, invite = false) => { if (!alive || settled) return; settled = true; setIsInvite(invite); setStatus(next); };
    getPasswordLinkState().then(({ state, invite }) => { if (state !== 'wait') settle(state, invite); });
    const stop = onAuthEvent((event) => { if (event === 'PASSWORD_RECOVERY') settle('ready'); });
    const timer = setTimeout(() => settle('invalid'), LINK_TIMEOUT);
    return () => { alive = false; stop(); clearTimeout(timer); };
  }, []);

  useEffect(() => { if (status !== 'checking') titleRef.current?.focus(); }, [status]);

  async function submit(e) {
    e.preventDefault();
    if (loading) return;
    const er = {};
    if (password.length < MIN) er.password = t.errLength;
    else if (password !== confirm) er.confirm = t.errMatch;
    setErrors(er);
    setSubmitError('');
    if (er.password) { document.getElementById('pw-new')?.focus(); return; }
    if (er.confirm) { document.getElementById('pw-confirm')?.focus(); return; }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      const key = authErrorKey(error);
      setSubmitError(key === 'errSame' ? t.errSame : key === 'errWeak' ? t.errWeak : key === 'errNetwork' ? t.errNetwork : t.errUpdate);
      return;
    }
    navigate('/admin', { replace: true });
  }

  if (status === 'checking') {
    return <div className="ac-form" role="status" aria-live="polite"><Skeleton width={72} height={72} /><p className="ac-lead">{t.checking}</p></div>;
  }

  if (status === 'invalid') {
    return (
      <div className="ac-form">
        <span className="ac-ico" aria-hidden="true"><Link2Off size={34} strokeWidth={1.6} /></span>
        <div className="ac-title">
          <Tp as="h1" className="ds-h1 is-sm" lang={lang} pick={x => x.pw.invalidTitle} ref={titleRef} tabIndex={-1} />
          <Tp as="p" className="ac-lead" lang={lang} pick={x => x.pw.invalidText} />
        </div>
        <Button variant="ink" size="lg" full to="/admin/forgot-password"><Tp lang={lang} pick={x => x.pw.invalidCta} /></Button>
      </div>
    );
  }

  const lenOk = password.length >= MIN;
  const matchOk = password.length > 0 && password === confirm;
  const eye = { show: p.showPw, hide: p.hidePw };

  return (
    <form className="ac-form" onSubmit={submit} noValidate>
      <span className="ac-ico" aria-hidden="true"><KeyRound size={34} strokeWidth={1.6} /></span>
      <div className="ac-title">
        <Tp as="h1" className="ds-h1 is-sm" lang={lang} pick={x => (isInvite ? x.pw.titleInvite : x.pw.titleReset)} ref={titleRef} tabIndex={-1} />
        <Tp as="p" className="ac-lead" lang={lang} pick={x => (isInvite ? x.pw.leadInvite : x.pw.leadReset)} />
      </div>
      <div className="ac-fields">
        <PasswordField
          id="pw-new" labels={eye} label={t.newPw} value={password} error={errors.password} autoComplete="new-password" aria-describedby="pw-reqs"
          onChange={e => { setPassword(e.target.value); if (errors.password) setErrors({}); }}
        />
        <PasswordField
          id="pw-confirm" labels={eye} label={t.confirmPw} value={confirm} error={errors.confirm} autoComplete="new-password"
          onChange={e => { setConfirm(e.target.value); if (errors.confirm) setErrors({}); }}
        />
        <ul className="ac-reqs" id="pw-reqs" aria-label={t.reqTitle}>
          {[[lenOk, t.reqLength], [matchOk, t.reqMatch]].map(([ok, label], i) => (
            <li key={i} className={ok ? 'is-ok' : undefined}>
              {ok ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : <Circle size={16} strokeWidth={2} aria-hidden="true" />}
              <span>{label}<span className="ds-vh">: {ok ? t.reqOk : t.reqPending}</span></span>
            </li>
          ))}
        </ul>
        {submitError && <p className="ac-error" role="alert"><CircleAlert size={18} strokeWidth={2.2} aria-hidden="true" />{submitError}</p>}
        <Button type="submit" variant="ink" size="lg" full busy={loading}><Tp lang={lang} pick={x => (isInvite ? x.pw.saveInvite : x.pw.saveReset)} /></Button>
      </div>
    </form>
  );
}
