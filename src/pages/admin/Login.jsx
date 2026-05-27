import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { signInAdmin, getAdminSession } from '../../lib/supabase.js';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);

  useEffect(() => {
    getAdminSession().then(s => { if (s) navigate('/admin', { replace: true }); });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!turnstileToken) {
      setError('Completa la verificació de seguretat.');
      return;
    }
    setError('');
    setLoading(true);

    const { error: err } = await signInAdmin(email, password);
    setLoading(false);

    if (err) {
      setError('Credencials incorrectes. Torna-ho a provar.');
      setTurnstileToken(null);
      return;
    }

    navigate('/admin', { replace: true });
  }

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

          <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
            <Turnstile
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
              onSuccess={token => setTurnstileToken(token)}
              onError={() => setTurnstileToken(null)}
              onExpire={() => setTurnstileToken(null)}
            />
          </div>

          {error && <div className="admin-login-error">⚠️ {error}</div>}

          <button type="submit" className="btn btn-submit" disabled={loading || !turnstileToken}>
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
