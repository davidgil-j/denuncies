import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, ShieldAlert, Copy, Check, ChevronLeft, ArrowRight, CircleAlert, Info, Smartphone } from 'lucide-react';
import { listMfaFactors, enrollMfaFactor, verifyMfaEnrollment, unenrollMfaFactor, IS_DEMO } from '../../lib/supabase.js';
import { ICON, fmt } from '../V2Layout.jsx';
import { useAdmin, Confirm, copyText } from './adminKit.jsx';

export default function V2Mfa() {
  const { t, profile, email, isSuperadmin, notify } = useAdmin();
  const [factors, setFactors] = useState(null);
  const [step, setStep] = useState('status'); // status | scan | code
  const [enroll, setEnroll] = useState(null); // { factorId, qrCode, secret }
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [offErr, setOffErr] = useState('');
  const codeRef = useRef(null);
  const headRef = useRef(null);

  useEffect(() => { document.title = `${t.mTitle} · ${t.panelName}`; }, [t]);

  async function load() {
    const { factors: list } = await listMfaFactors();
    setFactors(list ?? []);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
    if (step === 'scan') headRef.current?.focus();
  }, [step]);

  const verified = factors?.find(f => f.status === 'verified');

  async function start() {
    setError('');
    setBusy(true);
    const res = await enrollMfaFactor();
    setBusy(false);
    if (res.error || !res.qrCode) { setError(t.startErr); return; }
    setEnroll(res);
    setCode('');
    setStep('scan');
  }

  async function verify(e) {
    e.preventDefault();
    if (code.length !== 6 || busy) return;
    setError('');
    setBusy(true);
    const { error: err } = await verifyMfaEnrollment(enroll.factorId, code);
    setBusy(false);
    if (err) { setError(t.codeErr); setCode(''); codeRef.current?.focus(); return; }
    setStep('status');
    setEnroll(null);
    notify(t.enabledOk);
    load();
  }

  async function disable() {
    setBusy(true);
    setOffErr('');
    const { error: err } = await unenrollMfaFactor(verified.id);
    setBusy(false);
    if (err) { setOffErr(t.disableErr); return; }
    setConfirmOff(false);
    notify(t.disabledOk);
    load();
  }

  // En cancel·lar, es dona de baixa el factor a mig configurar perquè no se n'acumulin
  function cancelSetup() {
    if (enroll?.factorId) unenrollMfaFactor(enroll.factorId);
    setEnroll(null);
    setError('');
    setStep('status');
  }

  const secret = (enroll?.secret ?? '').replace(/\s/g, '');
  const secretShown = secret.replace(/(.{4})/g, '$1 ').trim();

  return (
    <div className="v2-page v2-narrow">
      <header className="v2-ph">
        <div className="v2-ph-main">
          <h1 className="v2-ph-title">{t.mTitle}</h1>
          <p className="v2-ph-lead">{t.mLead}</p>
        </div>
      </header>

      {factors === null ? (
        <div className="v2-sec" aria-hidden="true">
          <div className="v2-mfa-state"><span className="v2-skel is-avatar" /><div><span className="v2-skel" style={{ width: 260, height: 18 }} /><span className="v2-skel" style={{ width: '90%', marginTop: 10 }} /></div></div>
        </div>
      ) : step === 'status' ? (
        <section className={`v2-sec v2-mfa-card ${verified ? 'is-on' : 'is-off'}`} aria-labelledby="v2-mfa-t">
          <div className="v2-mfa-state">
            <span className="v2-mfa-icon">{verified ? <ShieldCheck {...ICON} /> : <ShieldAlert {...ICON} />}</span>
            <div>
              <h2 className="v2-sec-h" id="v2-mfa-t">{verified ? t.mOnTitle : t.mOffTitle}</h2>
              <p className="v2-sec-lead">{verified ? t.mOnText : t.mOffText}</p>
            </div>
          </div>
          <div className="v2-mfa-actions">
            {verified ? (
              <button type="button" className="v2-btn v2-btn-ghost-danger v2-btn-sm" onClick={() => { setOffErr(''); setConfirmOff(true); }}>{t.mDisable}</button>
            ) : (
              <button type="button" className="v2-btn v2-btn-primary v2-btn-sm icon-lead" onClick={start} aria-busy={busy}>
                <Smartphone {...ICON} />{t.mEnable}
              </button>
            )}
          </div>
          {error && <p className="v2-err" role="alert"><CircleAlert {...ICON} />{error}</p>}
        </section>
      ) : (
        <section className="v2-sec v2-mfa-setup" aria-labelledby="v2-setup-t">
          <p className="v2-mfa-step v2-num">{fmt(t.stepOf, { n: step === 'scan' ? 1 : 2 })}</p>
          <div className="v2-mfa-bar" aria-hidden="true"><span className="is-on" /><span className={step === 'code' ? 'is-on' : ''} /></div>

          {IS_DEMO && <div className="v2-note is-quiet v2-mfa-demo"><Info {...ICON} /><p>{t.demoMfa}</p></div>}

          {step === 'scan' ? (
            <>
              <h2 className="v2-sec-h" id="v2-setup-t" ref={headRef} tabIndex={-1}>{t.s1Title}</h2>
              <p className="v2-sec-lead">{t.s1Text}</p>
              <div className="v2-qr-row">
                <div className="v2-qr"><img src={enroll.qrCode} alt={t.qrAlt} width="168" height="168" /></div>
                <div className="v2-qr-key">
                  <p>{t.manualKey}</p>
                  <code className="v2-secret">{secretShown}</code>
                  <button type="button" className="v2-mini-btn" onClick={async () => { if (await copyText(secret)) { setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000); } }}>
                    {keyCopied ? <Check {...ICON} /> : <Copy {...ICON} />}{keyCopied ? t.copied : t.copyKey}
                  </button>
                </div>
              </div>
              <div className="v2-mfa-nav">
                <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm" onClick={cancelSetup}>{t.cancel}</button>
                <button type="button" className="v2-btn v2-btn-primary v2-btn-sm icon-trail" onClick={() => setStep('code')}>{t.next}<ArrowRight {...ICON} /></button>
              </div>
            </>
          ) : (
            <form onSubmit={verify} noValidate>
              <h2 className="v2-sec-h" id="v2-setup-t">{t.s2Title}</h2>
              <p className="v2-sec-lead">{t.s2Text}</p>
              <div className="v2-field v2-otp-field">
                <label htmlFor="v2-otp">{t.codeLabel}</label>
                <input
                  ref={codeRef}
                  id="v2-otp"
                  className="v2-input v2-otp"
                  value={code}
                  onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  enterKeyHint="done"
                  maxLength={6}
                  placeholder="000000"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'v2-otp-err' : undefined}
                />
                {error && <p className="v2-err" id="v2-otp-err" role="alert"><CircleAlert {...ICON} />{error}</p>}
              </div>
              <div className="v2-mfa-nav">
                <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" onClick={() => { setStep('scan'); setError(''); }}><ChevronLeft {...ICON} />{t.backStep}</button>
                <button type="submit" className="v2-btn v2-btn-primary v2-btn-sm" disabled={code.length !== 6} aria-busy={busy}>{busy ? t.verifying : t.verify}</button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="v2-sec" aria-labelledby="v2-acc-t">
        <h2 className="v2-sec-h" id="v2-acc-t">{t.account}</h2>
        <dl className="v2-kv is-account">
          <div><dt>{t.fullName}</dt><dd>{profile?.full_name || t.notProvided}</dd></div>
          <div><dt>{t.email}</dt><dd>{email || t.notProvided}</dd></div>
          <div><dt>{t.role}</dt><dd>{isSuperadmin ? t.roleSuperadmin : t.roleManager}</dd></div>
        </dl>
      </section>

      <Confirm
        open={confirmOff}
        title={t.disableTitle}
        confirmLabel={t.mDisable}
        busyLabel={t.disabling}
        cancelLabel={t.cancel}
        busy={busy}
        onConfirm={disable}
        onCancel={() => setConfirmOff(false)}
      >
        <p>{t.disableText}</p>
        {offErr && <p className="v2-err" role="alert"><CircleAlert {...ICON} />{offErr}</p>}
      </Confirm>
    </div>
  );
}
