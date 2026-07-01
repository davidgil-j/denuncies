import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from '../../lib/supabase.js';
import { supabase } from '../../lib/supabase.js';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [ready, setReady]         = useState(false);
  const [isInvite, setIsInvite]   = useState(false);

  useEffect(() => {
    // Supabase uses two different flows depending on project config:
    // · Implicit flow: tokens arrive in the URL hash → #access_token=...&type=invite
    // · PKCE flow:     a one-time code arrives as query param → ?code=...
    const hashParams  = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    const urlType = hashParams.get('type');       // 'invite' | 'recovery' | null
    const hasCode = Boolean(queryParams.get('code')); // PKCE flow

    // Implicit flow — invitation token directly in hash
    if (urlType === 'invite') {
      setIsInvite(true);
      setReady(true);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // Password reset (both flows)
      if (event === 'PASSWORD_RECOVERY') setReady(true);
      // Invitation via PKCE: SDK exchanges the code and fires SIGNED_IN
      if (event === 'SIGNED_IN' && hasCode) {
        setIsInvite(true);
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError('Les contrasenyes no coincideixen.'); return; }
    if (password.length < 8)  { setError('La contrasenya ha de tenir mínim 8 caràcters.'); return; }

    setError('');
    setLoading(true);
    const { error: err } = await updatePassword(password);
    setLoading(false);

    if (err) setError('Error en actualitzar la contrasenya. Torna a sol·licitar l\'enllaç.');
    else navigate('/admin', { replace: true });
  }

  if (!ready) return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <span className="admin-wordmark admin-wordmark--card">Reportia</span>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>⏳ Verificant l'enllaç...</p>
      </div>
    </div>
  );

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <span className="admin-wordmark admin-wordmark--card">Reportia</span>
        <h1 className="admin-login-title">{isInvite ? 'Benvingut/da' : 'Nova contrasenya'}</h1>
        <p className="admin-login-sub">{isInvite ? 'Estableix la teva contrasenya per accedir al panell.' : 'Introdueix la teva nova contrasenya.'}</p>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="field">
            <label className="field-label">Nova contrasenya</label>
            <input className="field-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="Mínim 8 caràcters" required />
          </div>
          <div className="field">
            <label className="field-label">Confirmar contrasenya</label>
            <input className="field-input" type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)} placeholder="Repeteix la contrasenya" required />
          </div>
          {error && <div className="admin-login-error">⚠️ {error}</div>}
          <button type="submit" className="btn btn-submit" disabled={loading}>
            {loading ? 'Guardant...' : 'Establir contrasenya'}
          </button>
        </form>
      </div>
    </div>
  );
}
