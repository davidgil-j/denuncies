import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CircleAlert, ShieldAlert, ShieldCheck, Smartphone } from 'lucide-react';
import { listMfaFactors, enrollMfaFactor, verifyMfaEnrollment, unenrollMfaFactor, IS_DEMO } from '../../lib/supabase.js';
import { Swap, fmt } from '../V2Layout.jsx';
import { copyText } from '../admin/adminKit.jsx';
import { Button, Card, OtpInput, Skeleton } from '../ui/index.js';
import { usePanel, Tp } from './kit.jsx';

const NONE = '–';

/**
 * Verificación en dos pasos (/admin/mfa): su estado y el alta, en dos pasos (escanear y escribir el código).
 * Es obligatoria: quien entra sin tenerla solo ve esta pantalla hasta activarla. No se puede desactivar
 * desde aquí ni hay códigos de recuperación: si se pierde el móvil, la restablece un administrador o Reportia.
 */
export default function Seguridad() {
  const { lang, t, p, org, profile, email, isSuperadmin, notify, mfaSetup, refreshProfile } = usePanel();
  const s = p.sec;
  const [factors, setFactors] = useState(null);
  const [step, setStep] = useState('status'); // status | scan | code
  const [enroll, setEnroll] = useState(null); // { factorId, qrCode, secret }
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);
  const headRef = useRef(null);
  const otpRef = useRef(null);

  useEffect(() => { document.title = `${s.title} · ${org?.name ?? ''}`; }, [s, org]);

  async function load() {
    const { factors: list } = await listMfaFactors();
    setFactors(list ?? []);
  }
  useEffect(() => { load(); }, []);
  // Al cambiar de paso, el foco va a su título: quien no ve la pantalla sabe que ha avanzado
  useEffect(() => { if (step !== 'status') headRef.current?.focus(); }, [step]);

  const verified = factors?.find(f => f.status === 'verified');

  async function start() {
    if (busy) return;
    setError('');
    setBusy(true);
    const res = await enrollMfaFactor();
    setBusy(false);
    if (res.error || !res.qrCode) { setError(s.startErr); return; }
    setEnroll(res);
    setCode('');
    setStep('scan');
  }

  async function verify(value = code) {
    if (value.length !== 6 || busy) return;
    setError('');
    setBusy(true);
    const { error: err } = await verifyMfaEnrollment(enroll.factorId, value);
    setBusy(false);
    if (err) { setError(s.codeErr); setCode(''); otpRef.current?.querySelector('input')?.focus(); return; }
    setStep('status');
    setEnroll(null);
    notify(s.enabledOk);
    load();
    // Con la verificación hecha, la sesión ya tiene el segundo paso: se desbloquea el resto del panel
    if (mfaSetup) refreshProfile();
  }

  // Al cancelar, se da de baja el factor a medio configurar para que no se acumulen
  function cancelSetup() {
    if (enroll?.factorId) unenrollMfaFactor(enroll.factorId);
    setEnroll(null);
    setError('');
    setStep('status');
  }

  async function copyKey() {
    if (!(await copyText(secret))) return;
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  }

  const secret = (enroll?.secret ?? '').replace(/\s/g, '');
  const secretShown = secret.replace(/(.{4})/g, '$1 ').trim();

  return (
    <div className="pn-page sg">
      {!mfaSetup && <Link className="pn-back" to="/admin/ajustes"><ArrowLeft size={16} strokeWidth={2.4} aria-hidden="true" />{s.back}</Link>}
      <div className="pn-hello">
        <Tp as="h1" className="ds-h1 is-sm" lang={lang} pick={x => x.sec.title} />
        <Tp as="p" className="pn-lead" lang={lang} pick={x => x.sec.lead} />
      </div>

      {mfaSetup && (
        <section className="pn-banner" aria-labelledby="sg-req-t">
          <ShieldAlert size={20} strokeWidth={2} aria-hidden="true" />
          <div><h2 id="sg-req-t">{s.requiredT}</h2><p>{s.requiredText}</p></div>
        </section>
      )}

      <div className="sg-grid">
        {factors === null ? (
          <Card tone="bg" className="sg-main" role="status" aria-live="polite"><span className="ds-vh">{p.loading}</span><Skeleton width={220} height={22} /><Skeleton width="80%" /><Skeleton width={180} height={44} /></Card>
        ) : step === 'status' ? (
          <Card as="section" tone="bg" className="sg-main" aria-labelledby="sg-state-t">
            <div className="sg-state">
              <span className={verified ? 'sg-ico is-on' : 'sg-ico'} aria-hidden="true">{verified ? <ShieldCheck size={26} strokeWidth={1.8} /> : <ShieldAlert size={26} strokeWidth={1.8} />}</span>
              <div>
                <h2 className="sg-h" id="sg-state-t">{verified ? s.onT : s.offT}</h2>
                <p className="sg-p">{verified ? s.onText : s.offText}</p>
              </div>
            </div>
            {verified ? <p className="sg-note">{s.onNote}</p> : (
              <>
                {error && <p className="ac-error" role="alert"><CircleAlert size={18} strokeWidth={2.2} aria-hidden="true" />{error}</p>}
                <Button variant="ink" size="md" className="sg-go" onClick={start} busy={busy} icon={<Smartphone size={18} strokeWidth={2} aria-hidden="true" />}>{s.enable}</Button>
              </>
            )}
            {IS_DEMO && !verified && <p className="sg-note">{s.demo}</p>}
          </Card>
        ) : step === 'scan' ? (
          <Card as="section" tone="bg" className="sg-main" aria-labelledby="sg-scan-t">
            <span className="sg-step">{fmt(s.stepOf, { n: 1 })}</span>
            <h2 className="sg-h" id="sg-scan-t" ref={headRef} tabIndex={-1}>{s.s1T}</h2>
            <p className="sg-p">{s.s1Text}</p>
            <div className="sg-scan">
              <img className="sg-qr" src={enroll.qrCode} alt={s.qrAlt} width="180" height="180" />
              <div className="sg-key">
                <p className="sg-p">{s.manualKey}</p>
                <code>{secretShown}</code>
                <Button variant="white" size="xs" onClick={copyKey}><Swap lang={lang} on={keyCopied} pick={T => T.panel.sec.copyKey} pickOn={T => T.panel.sec.keyCopied} /></Button>
              </div>
            </div>
            {IS_DEMO && <p className="sg-note">{s.demo}</p>}
            <div className="sg-btns">
              <Button variant="white" size="md" onClick={cancelSetup}>{p.cancel}</Button>
              <Button variant="ink" size="md" onClick={() => setStep('code')} iconEnd={<ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />}>{s.cont}</Button>
            </div>
          </Card>
        ) : (
          <Card as="form" tone="bg" className="sg-main" aria-labelledby="sg-code-t" onSubmit={e => { e.preventDefault(); verify(); }} noValidate>
            <span className="sg-step">{fmt(s.stepOf, { n: 2 })}</span>
            <h2 className="sg-h" id="sg-code-t" ref={headRef} tabIndex={-1}>{s.s2T}</h2>
            <p className="sg-p" id="sg-code-h">{s.s2Text}</p>
            <div className="sg-otp" ref={otpRef}>
              <OtpInput value={code} onChange={v => { setCode(v); setError(''); }} onComplete={verify} label={s.s2T} digitLabel={p.digit} invalid={!!error} describedBy={error ? 'sg-code-e' : 'sg-code-h'} />
            </div>
            {error && <p className="ac-error" id="sg-code-e" role="alert"><CircleAlert size={18} strokeWidth={2.2} aria-hidden="true" />{error}</p>}
            {IS_DEMO && <p className="sg-note">{s.demo}</p>}
            <div className="sg-btns">
              <Button variant="white" size="md" onClick={() => { setError(''); setStep('scan'); }}>{s.backStep}</Button>
              <Button type="submit" variant="ink" size="md" busy={busy} disabled={code.length !== 6}>{busy ? s.verifying : s.verify}</Button>
            </div>
          </Card>
        )}

        <Card as="section" tone="bg" className="sg-side" aria-labelledby="sg-acc-t">
          <h2 className="ds-card-title" id="sg-acc-t">{s.accountT}</h2>
          <dl className="sg-acc">
            <div><dt>{s.name}</dt><dd>{profile.full_name || NONE}</dd></div>
            <div><dt>{p.email}</dt><dd>{email || NONE}</dd></div>
            <div><dt>{s.role}</dt><dd>{isSuperadmin ? t.roleSuperadmin : t.roleManager}</dd></div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
