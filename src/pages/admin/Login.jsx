import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInAdmin, getAdminSession } from '../../lib/supabase.js';
import { supabase } from '../../lib/supabase.js';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // MFA step
  const [mfaStep, setMfaStep]         = useState(false);
  const [mfaCode, setMfaCode]         = useState('');
  const [factorId, setFactorId]       = useState('');
  const [challengeId, setChallengeId] = useState('');
  const mfaInputRef = useRef();

  useEffect(() => {
    getAdminSession().then(s => { if (s) navigate('/admin', { replace: true }); });
  }, []);

  useEffect(() => {
    if (mfaStep) mfaInputRef.current?.focus();
  }, [mfaStep]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: err } = await signInAdmin(email, password);
    setLoading(false);

    if (err) {
      setError('Credencials incorrectes. Torna-ho a provar.');
      return;
    }

    // Check if user has MFA factors enrolled
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.totp?.[0];

    if (totpFactor) {
      // MFA required — create challenge
      const { data: challenge, error: chalErr } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });
      if (chalErr) { setError('Error en iniciar MFA.'); return; }
      setFactorId(totpFactor.id);
      setChallengeId(challenge.id);
      setMfaStep(true);
    } else {
      navigate('/admin', { replace: true });
    }
  }

  async function handleMFAVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: mfaCode.replace(/\s/g, ''),
    });

    setLoading(false);

    if (verifyErr) {
      setError('Codi incorrecte. Torna-ho a provar.');
      setMfaCode('');
    } else {
      navigate('/admin', { replace: true });
    }
  }

  // ── MFA verification screen ───────────────────────────────────
  if (mfaStep) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card">
          <img src="/logo.png" alt="Reportia" className="admin-login-logo" />
          <h1 className="admin-login-title">Verificació en dos passos</h1>
          <p className="admin-login-sub">
            Introdueix el codi de 6 dígits de la teva app d'autenticació (Google Authenticator, Authy...).
          </p>

          <form onSubmit={handleMFAVerify} className="admin-login-form">
            <div className="field">
              <label className="field-label">Codi d'autenticació</label>
              <input
                ref={mfaInputRef}
                className="field-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9 ]*"
                maxLength={7}
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value)}
                placeholder="000 000"
                style={{ fontSize: 24, letterSpacing: '.3em', textAlign: 'center', fontWeight: 700 }}
                autoComplete="one-time-code"
                required
              />
            </div>
            {error && <div className="admin-login-error">⚠️ {error}</div>}
            <button type="submit" className="btn btn-submit" disabled={loading || mfaCode.replace(/\s/g,'').length < 6}>
              {loading ? '⏳ Verificant...' : '🔐 Verificar'}
            </button>
          </form>
          <button
            type="button"
            className="admin-login-back"
            onClick={() => { setMfaStep(false); setMfaCode(''); setError(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: 16 }}
          >
            ← Tornar al login
          </button>
        </div>
      </div>
    );
  }

  // ── Login screen ──────────────────────────────────────────────
  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <img src="/logo.png" alt="Reportia" className="admin-login-logo" />
        <h1 className="admin-login-title">Panel d'administració</h1>
        <p className="admin-login-sub">Canal Ètic · Accés restringit</p>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="field">
            <label className="field-label">Correu electrònic</label>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@empresa.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label className="field-label">Contrasenya</label>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div className="admin-login-error">⚠️ {error}</div>}

          <button type="submit" className="btn btn-submit" disabled={loading}>
            {loading ? '⏳ Entrant...' : '🔐 Entrar'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          <Link to="/admin/forgot-password" className="admin-login-back" style={{ margin: 0 }}>
            He oblidat la contrasenya
          </Link>
          <a href="/" className="admin-login-back" style={{ margin: 0 }}>← Canal públic</a>
        </div>
      </div>
    </div>
  );
}
