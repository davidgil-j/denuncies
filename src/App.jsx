import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './global.css';
import { translations } from './translations.js';
import { getAdminSession } from './lib/supabase.js';
import { AdminAuthProvider } from './contexts/AdminAuth.jsx';
import ComplaintForm from './pages/ComplaintForm.jsx';
import TrackingPortal from './pages/TrackingPortal.jsx';
import AdminLogin from './pages/admin/Login.jsx';
import AdminDashboard from './pages/admin/Dashboard.jsx';
import ComplaintDetail from './pages/admin/ComplaintDetail.jsx';
import ForgotPassword from './pages/admin/ForgotPassword.jsx';
import ResetPassword from './pages/admin/ResetPassword.jsx';
import Users from './pages/admin/Users.jsx';

const LANGS = ['ca', 'es', 'en'];

// ── Public app ────────────────────────────────────────────────────
function PublicApp() {
  const [lang, setLang] = useState('ca');
  const [view, setView] = useState('form');
  const [trackCode, setTrackCode] = useState('');

  const t = translations[lang];

  function goToTrack(code = '') { setTrackCode(code); setView('track'); }
  function goToForm() { setView('form'); setTrackCode(''); }

  return (
    <div className="page">
      <div className="lang-bar">
        {LANGS.map(l => (
          <button key={l} className={`lang-btn ${lang === l ? 'active' : ''}`} onClick={() => setLang(l)}>
            {translations[l].langName}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="logo-wrap">
            <img src="/logo.png" alt="Reportia" />
          </span>
          <h1>{t.title}</h1>
          <p className="subtitle">{t.subtitle}</p>
          <span className="legal-badge">⚖️ {t.legalBadge}</span>
        </div>

        {view === 'form'  && <ComplaintForm lang={lang} onTrack={goToTrack} />}
        {view === 'track' && <TrackingPortal lang={lang} initialCode={trackCode} onBack={goToForm} />}
      </div>

      {view === 'form' && (
        <div className="page-footer">
          <button
            type="button"
            onClick={() => goToTrack('')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', fontFamily: 'inherit' }}
          >
            🔍 {t.trackStatus}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Admin guard ───────────────────────────────────────────────────
function AdminGuard({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    getAdminSession().then(s => setSession(s));
  }, []);

  if (session === undefined) return null;
  if (!session) return <Navigate to="/admin/login" replace />;
  return children;
}

// ── Root ──────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          <Route path="/" element={<PublicApp />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
          <Route path="/admin/complaints/:id" element={<AdminGuard><ComplaintDetail /></AdminGuard>} />
          <Route path="/admin/users" element={<AdminGuard><Users /></AdminGuard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
