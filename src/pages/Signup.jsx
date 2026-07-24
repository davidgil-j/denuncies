import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { signUpOrganization } from '../lib/supabase.js';
import { translations } from '../translations.js';

const LANGS = ['ca', 'es', 'en'];

export default function Signup() {
  const navigate = useNavigate();
  const [lang, setLang] = useState('ca');
  const [form, setForm] = useState({ companyName: '', fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const t = translations[lang].signup;

  function update(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { needsConfirmation, error: err } = await signUpOrganization({
      companyName: form.companyName,
      fullName: form.fullName,
      email: form.email,
      password: form.password,
    });

    setLoading(false);

    if (err) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('user already exists')) {
        setError(t.errorEmailInUse);
      } else {
        setError(t.errorGeneric + err.message);
      }
      return;
    }

    if (needsConfirmation) {
      setDone(true);
    } else {
      navigate('/admin', { replace: true });
    }
  }

  return (
    <div className="page">
      <div className="lang-bar">
        {LANGS.map(l => (
          <button key={l} className={`lang-btn ${lang === l ? 'active' : ''}`} onClick={() => setLang(l)}>
            {translations[l].langName}
          </button>
        ))}
      </div>

      <div className="admin-login-card">
        <span className="admin-wordmark admin-wordmark--card">Reportia</span>
        <h1 className="admin-login-title">{t.pageTitle}</h1>
        <p className="admin-login-sub">{t.pageSubtitle}</p>

        {done ? (
          <>
            <h2 className="admin-login-title" style={{ fontSize: '18px', marginTop: 16 }}>{t.confirmEmailTitle}</h2>
            <p className="admin-login-sub">{t.confirmEmailDesc.replace('{email}', form.email)}</p>
            <div style={{ marginTop: 16 }}>
              <Link to="/" className="admin-login-back" style={{ margin: 0 }}>← {t.backToChannel}</Link>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="admin-login-form">
              <div className="field">
                <label className="field-label">{t.companyNameLabel}</label>
                <input
                  className="field-input"
                  type="text"
                  value={form.companyName}
                  onChange={update('companyName')}
                  placeholder={t.companyNamePlaceholder}
                  autoComplete="organization"
                  required
                />
              </div>
              <div className="field">
                <label className="field-label">{t.fullNameLabel}</label>
                <input
                  className="field-input"
                  type="text"
                  value={form.fullName}
                  onChange={update('fullName')}
                  placeholder={t.fullNamePlaceholder}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="field">
                <label className="field-label">{t.emailLabel}</label>
                <input
                  className="field-input"
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  placeholder={t.emailPlaceholder}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="field">
                <label className="field-label">{t.passwordLabel}</label>
                <div className="pw-wrap">
                  <input
                    className={`field-input${!showPw ? ' pw-masked' : ''}`}
                    type="text"
                    value={form.password}
                    onChange={update('password')}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <small style={{ color: 'var(--text-muted, #888)' }}>{t.passwordHint}</small>
              </div>

              {error && <div className="admin-login-error">{error}</div>}

              <button type="submit" className="btn btn-submit" disabled={loading}>
                {loading ? t.submitting : t.submitButton}
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <span className="admin-login-back" style={{ margin: 0 }}>
                {t.loginLinkText} <Link to="/admin/login">{t.loginLinkAction}</Link>
              </span>
              <Link to="/" className="admin-login-back" style={{ margin: 0 }}>← {t.backToChannel}</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
