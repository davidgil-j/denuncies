import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, signOutAdmin } from '../../lib/supabase.js';
import { useAdminAuth } from '../../contexts/AdminAuth.jsx';

export default function MFASetup() {
  const navigate = useNavigate();
  const { profile } = useAdminAuth();

  const [factors, setFactors]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [qrCode, setQrCode]       = useState('');
  const [secret, setSecret]       = useState('');
  const [factorId, setFactorId]   = useState('');
  const [code, setCode]           = useState('');
  const [step, setStep]           = useState('status'); // status | setup | verify
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => { loadFactors(); }, []);

  async function loadFactors() {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
    setLoading(false);
  }

  const verifiedFactor = factors.find(f => f.status === 'verified');

  async function handleStartSetup() {
    setError('');
    setSaving(true);
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Reportia Canal Ètic' });
    setSaving(false);
    if (err) { setError('Error en iniciar la configuració: ' + err.message); return; }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
    setStep('setup');
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    // Create challenge first
    const { data: challenge, error: chalErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chalErr) { setError('Error en crear el repte.'); setSaving(false); return; }

    // Verify
    const { error: verErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.replace(/\s/g, ''),
    });
    setSaving(false);

    if (verErr) {
      setError('Codi incorrecte. Comprova que l\'hora del dispositiu és correcta.');
      setCode('');
    } else {
      setSuccess('MFA activat correctament. A partir d\'ara necessitaràs el codi en cada login.');
      setStep('status');
      loadFactors();
    }
  }

  async function handleDisable() {
    if (!window.confirm('Segur que vols desactivar la verificació en dos passos?')) return;
    setSaving(true);
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
    setSaving(false);
    if (err) setError('Error en desactivar MFA: ' + err.message);
    else { setSuccess('MFA desactivat.'); loadFactors(); }
  }

  async function handleLogout() {
    await signOutAdmin();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo"><span className="admin-wordmark">Reportia</span></div>
        <nav className="admin-nav">
          <div className="admin-nav-item" onClick={() => navigate('/admin')} style={{ cursor: 'pointer' }}>🗂 Denúncies</div>
          {profile?.role === 'superadmin' && (
            <div className="admin-nav-item" onClick={() => navigate('/admin/users')} style={{ cursor: 'pointer' }}>👥 Usuaris</div>
          )}
          <div className="admin-nav-item active">🔐 Seguretat</div>
        </nav>
        <button className="admin-logout-btn" onClick={handleLogout}>↩ Tancar sessió</button>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <button className="admin-back-btn" onClick={() => navigate('/admin')}>← Tornar</button>
          <h1 className="admin-page-title">Verificació en dos passos (MFA)</h1>
        </div>

        <div style={{ maxWidth: 520 }}>
          {success && <div className="msg-feedback ok" style={{ marginBottom: 16 }}>✅ {success}</div>}
          {error   && <div className="msg-feedback err" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

          {loading ? (
            <div className="admin-loading">⏳</div>
          ) : step === 'status' ? (
            <div className="admin-section">
              <div className="admin-section-title">Estat actual</div>

              {verifiedFactor ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', marginBottom: 16 }}>
                    <span style={{ fontSize: 28 }}>✅</span>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--success)' }}>MFA activat</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Cada login requereix codi de l'app d'autenticació
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-ghost" onClick={handleDisable} disabled={saving} style={{ width: '100%', padding: 12 }}>
                    {saving ? '⏳ Desactivant...' : '🗑 Desactivar MFA'}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', marginBottom: 16 }}>
                    <span style={{ fontSize: 28 }}>⚠️</span>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--warning)' }}>MFA no activat</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Recomanat per a comptes amb accés a dades sensibles
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={handleStartSetup} disabled={saving} style={{ width: '100%', padding: 12 }}>
                    {saving ? '⏳ Preparant...' : '🔐 Activar MFA'}
                  </button>
                </>
              )}
            </div>
          ) : step === 'setup' ? (
            <div className="admin-section">
              <div className="admin-section-title">Pas 1 — Escaneja el codi QR</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                Obre <strong>Google Authenticator</strong>, <strong>Authy</strong> o qualsevol app TOTP i escaneja el codi:
              </p>

              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <img src={qrCode} alt="QR MFA" style={{ width: 180, height: 180, border: '4px solid var(--border)', borderRadius: 12 }} />
              </div>

              <details style={{ marginBottom: 20 }}>
                <summary style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                  No pots escanejar? Introdueix manualment
                </summary>
                <code style={{ display: 'block', marginTop: 8, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, letterSpacing: '.1em', wordBreak: 'break-all' }}>
                  {secret}
                </code>
              </details>

              <button className="btn btn-primary" onClick={() => setStep('verify')} style={{ width: '100%', padding: 12 }}>
                Ja he escaneiat → Continuar
              </button>
            </div>
          ) : (
            <div className="admin-section">
              <div className="admin-section-title">Pas 2 — Verifica el codi</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                Introdueix el codi de 6 dígits que apareix a la teva app per confirmar la configuració:
              </p>

              <form onSubmit={handleVerify}>
                <div className="field">
                  <input
                    className="field-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={7}
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="000 000"
                    style={{ fontSize: 28, letterSpacing: '.3em', textAlign: 'center', fontWeight: 700 }}
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setStep('setup')} style={{ flex: 1, padding: 12 }}>
                    ← Enrere
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving || code.replace(/\s/g,'').length < 6} style={{ flex: 2, padding: 12 }}>
                    {saving ? '⏳ Verificant...' : '✅ Activar MFA'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
