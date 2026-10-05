import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, ShieldAlert, Copy, Check, ChevronLeft, ArrowRight, CircleAlert, Info, Smartphone } from 'lucide-react';
import { listMfaFactors, enrollMfaFactor, verifyMfaEnrollment, unenrollMfaFactor, IS_DEMO } from '../../lib/supabase.js';
import { ICON, fmt } from '../V2Layout.jsx';
import { useAdmin, L, SwapL, Confirm, copyText } from './adminKit.jsx';

export default function V2Mfa() {
  const { t, profile, email, isSuperadmin, notify, mfaSetup, refreshProfile } = useAdmin();
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
    // Amb la verificació feta, la sessió ja té el segon pas: es desbloqueja la resta del panell
    if (mfaSetup) refreshProfile();
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
          <L as="h1" className="v2-ph-title" k="mTitle" />
          <L as="p" className="v2-ph-lead" k="mLead" />
        </div>
      </header>

      {mfaSetup && (
        <div className="v2-note" role="note">
          <ShieldAlert {...ICON} />
          <p>{t.mfaRequiredTitle}<small><L k="mfaRequiredText" /></small></p>
        </div>
      )}

      {factors === null ? (
        <div className="v2-sec" aria-hidden="true">
          <div className="v2-mfa-state"><span className="v2-skel is-avatar" /><div><span className="v2-skel" style={{ width: 260, height: 18 }} /><span className="v2-skel" style={{ width: '90%', marginTop: 10 }} /></div></div>
        </div>
      ) : step === 'status' ? (
        <section className={`v2-sec v2-mfa-card ${verified ? 'is-on' : 'is-off'}`} aria-labelledby="v2-mfa-t">
          <div className="v2-mfa-state">
            <span className="v2-mfa-icon">{verified ? <ShieldCheck {...ICON} /> : <ShieldAlert {...ICON} />}</span>
            <div>
              <L as="h2" className="v2-sec-h" id="v2-mfa-t" k={verified ? 'mOnTitle' : 'mOffTitle'} />
              <L as="p" className="v2-sec-lead" k={verified ? 'mOnText' : 'mOffText'} />
            </div>
          </div>
          <div className="v2-mfa-actions">
            {verified ? (
              <p className="v2-sec-lead"><Info {...ICON} /><L k="mOnRequired" /></p>
            ) : (
              <button type="button" className="v2-btn v2-btn-primary v2-btn-sm icon-lead" onClick={start} aria-busy={busy}>
                <Smartphone {...ICON} /><L k="mEnable" />
              </button>
            )}
          </div>
          {error && <p className="v2-err" role="alert"><CircleAlert {...ICON} />{error}</p>}
        </section>
      ) : (
        <section className="v2-sec v2-mfa-setup" aria-labelledby="v2-setup-t">
          <L as="p" className="v2-mfa-step v2-num" pick={x => fmt(x.stepOf, { n: step === 'scan' ? 1 : 2 })} />
          <div className="v2-mfa-bar" aria-hidden="true"><span className="is-on" /><span className={step === 'code' ? 'is-on' : ''} /></div>

          {IS_DEMO && <div className="v2-note is-quiet v2-mfa-demo"><Info {...ICON} /><L as="p" k="demoMfa" /></div>}

          {step === 'scan' ? (
            <>
              <L as="h2" className="v2-sec-h" id="v2-setup-t" ref={headRef} tabIndex={-1} k="s1Title" />
              <L as="p" className="v2-sec-lead" k="s1Text" />
              <div className="v2-qr-row">
                <div className="v2-qr"><img src={enroll.qrCode} alt={t.qrAlt} width="168" height="168" /></div>
                <div className="v2-qr-key">
                  <L as="p" k="manualKey" />
                  <code className="v2-secret">{secretShown}</code>
                  <button type="button" className="v2-mini-btn" onClick={async () => { if (await copyText(secret)) { setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000); } }}>
                    {keyCopied ? <Check {...ICON} /> : <Copy {...ICON} />}<SwapL on={keyCopied} k="copyKey" kOn="copied" />
                  </button>
                </div>
              </div>
              <div className="v2-mfa-nav">
                <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm" onClick={cancelSetup}><L k="cancel" /></button>
                <button type="button" className="v2-btn v2-btn-primary v2-btn-sm icon-trail" onClick={() => setStep('code')}><L k="next" /><ArrowRight {...ICON} /></button>
              </div>
            </>
          ) : (
            <form onSubmit={verify} noValidate>
              <L as="h2" className="v2-sec-h" id="v2-setup-t" k="s2Title" />
              <L as="p" className="v2-sec-lead" k="s2Text" />
              <div className="v2-field v2-otp-field">
                <label htmlFor="v2-otp"><L k="codeLabel" /></label>
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
                  placeholder="000000"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'v2-otp-err' : undefined}
                />
                {error && <p className="v2-err" id="v2-otp-err" role="alert"><CircleAlert {...ICON} />{error}</p>}
              </div>
              <div className="v2-mfa-nav">
                <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm icon-lead" onClick={() => { setStep('scan'); setError(''); }}><ChevronLeft {...ICON} /><L k="backStep" /></button>
                <button type="submit" className="v2-btn v2-btn-primary v2-btn-sm" disabled={code.length !== 6} aria-busy={busy}><L k={busy ? 'verifying' : 'verify'} /></button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="v2-sec" aria-labelledby="v2-acc-t">
        <L as="h2" className="v2-sec-h" id="v2-acc-t" k="account" />
        <dl className="v2-kv is-account">
          <div><L as="dt" k="fullName" /><dd>{profile?.full_name || t.notProvided}</dd></div>
          <div><L as="dt" k="email" /><dd>{email || t.notProvided}</dd></div>
          <div><L as="dt" k="role" /><L as="dd" k={isSuperadmin ? 'roleSuperadmin' : 'roleManager'} /></div>
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
        <L as="p" k="disableText" />
        {offErr && <p className="v2-err" role="alert"><CircleAlert {...ICON} />{offErr}</p>}
      </Confirm>
    </div>
  );
}
