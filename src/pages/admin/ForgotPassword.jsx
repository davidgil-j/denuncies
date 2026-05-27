import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordReset } from '../../lib/supabase.js';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await sendPasswordReset(email);
    setLoading(false);
    if (err) setError('No s\'ha pogut enviar el correu. Verifica l\'adreça.');
    else setSent(true);
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <img src="/logo.png" alt="Reportia" className="admin-login-logo" />
        <h1 className="admin-login-title">Recuperar contrasenya</h1>

        {sent ? (
          <>
            <p style={{ fontSize: 14, color: 'var(--success)', marginBottom: 24, lineHeight: 1.6 }}>
              T'hem enviat un correu a <strong>{email}</strong> amb les instruccions per restablir la contrasenya.
            </p>
            <Link to="/admin/login" className="admin-login-back">← Tornar al login</Link>
          </>
        ) : (
          <>
            <p className="admin-login-sub">Introdueix el teu correu i t'enviarem un enllaç per restablir la contrasenya.</p>
            <form onSubmit={handleSubmit} className="admin-login-form">
              <div className="field">
                <label className="field-label">Correu electrònic</label>
                <input
                  className="field-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@empresa.com"
                  required
                />
              </div>
              {error && <div className="admin-login-error">{error}</div>}
              <button type="submit" className="btn btn-submit" disabled={loading}>
                {loading ? 'Enviant...' : 'Enviar enllaç'}
              </button>
            </form>
            <Link to="/admin/login" className="admin-login-back">← Tornar al login</Link>
          </>
        )}
      </div>
    </div>
  );
}
