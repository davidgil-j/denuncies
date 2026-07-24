import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import './global.css';
import { translations } from './translations.js';
import { getAdminSession, getOrganizationBySlug } from './lib/supabase.js';
import { AdminAuthProvider } from './contexts/AdminAuth.jsx';
import ComplaintForm from './pages/ComplaintForm.jsx';
import TrackingPortal from './pages/TrackingPortal.jsx';
import LandingPage from './pages/LandingPage.jsx';
import Signup from './pages/Signup.jsx';
import AdminLogin from './pages/admin/Login.jsx';
import AdminDashboard from './pages/admin/Dashboard.jsx';
import ComplaintDetail from './pages/admin/ComplaintDetail.jsx';
import ForgotPassword from './pages/admin/ForgotPassword.jsx';
import ResetPassword from './pages/admin/ResetPassword.jsx';
import Users from './pages/admin/Users.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import MFASetup from './pages/admin/MFASetup.jsx';

const LANGS = ['ca', 'es', 'en'];

// ── Public app ────────────────────────────────────────────────────
function PublicApp() {
  const { slug } = useParams();
  const [lang, setLang] = useState('ca');
  const [view, setView] = useState('choice');
  const [trackCode, setTrackCode] = useState('');
  const [org, setOrg] = useState(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgNotFound, setOrgNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setOrgNotFound(true); setOrgLoading(false); return; }
    getOrganizationBySlug(slug).then(({ organization }) => {
      if (organization) setOrg(organization);
      else setOrgNotFound(true);
      setOrgLoading(false);
    });
  }, [slug]);

  const t = translations[lang];

  function goToTrack(code = '') { setTrackCode(code); setView('track'); }
  function goToForm() { setView('form'); setTrackCode(''); }
  function goToChoice() { setView('choice'); setTrackCode(''); }

  if (orgLoading) return (
    <div className="page">
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div className="spinner" />
      </div>
    </div>
  );

  if (orgNotFound) return (
    <div className="page">
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <p style={{ color: 'var(--text-muted)' }}>Canal no trobat.</p>
        <a href="/" style={{ color: 'var(--primary)', fontSize: 13 }}>← Tornar</a>
      </div>
    </div>
  );

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
          <span className="admin-wordmark">Reportia</span>
          <h1>{org.name}</h1>
          <p className="subtitle">{t.subtitle}</p>
          <span className="legal-badge">{t.legalBadge}</span>
        </div>

        {view === 'choice' && (
          <div className="card-body choice-screen">
            <div className="choice-title">{t.choiceTitle}</div>
            <div className="choice-grid">
              <button type="button" className="choice-card" onClick={goToForm}>
                <div className="choice-icon">✉</div>
                <div className="choice-name">{t.choiceSubmit}</div>
                <div className="choice-desc">{t.choiceSubmitDesc}</div>
              </button>
              <button type="button" className="choice-card" onClick={() => goToTrack('')}>
                <div className="choice-icon">🔍</div>
                <div className="choice-name">{t.choiceTrack}</div>
                <div className="choice-desc">{t.choiceTrackDesc}</div>
              </button>
            </div>
          </div>
        )}
        {view === 'form'  && <ComplaintForm lang={lang} onTrack={goToTrack} organizationId={org.id} />}
        {view === 'track' && <TrackingPortal lang={lang} initialCode={trackCode} onBack={goToChoice} />}
      </div>

      {(view === 'form' || view === 'choice') && (
        <div className="page-footer">
          <a href={`/privacitat?lang=${lang}`} style={{ color: 'rgba(255,255,255,.4)', fontSize: '11px', textDecoration: 'underline' }}>
            {t.privacyLink}
          </a>
        </div>
      )}
    </div>
  );
}

// ── Admin guard ───────────────────────────────────────────────────
function AdminGuard({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    getAdminSession()
      .then(s => setSession(s))
      .catch(() => setSession(null));
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
          <Route path="/" element={<LandingPage />} />
          <Route path="/canal/:slug" element={<PublicApp />} />
          <Route path="/crear-compte" element={<Signup />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
          <Route path="/admin/complaints/:id" element={<AdminGuard><ComplaintDetail /></AdminGuard>} />
          <Route path="/admin/users" element={<AdminGuard><Users /></AdminGuard>} />
          <Route path="/admin/mfa" element={<AdminGuard><MFASetup /></AdminGuard>} />
          <Route path="/privacitat" element={<PrivacyPolicy />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
