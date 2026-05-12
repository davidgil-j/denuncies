import React, { useState } from 'react';
import './global.css';
import { translations } from './translations.js';
import ComplaintForm from './pages/ComplaintForm.jsx';
import TrackingPortal from './pages/TrackingPortal.jsx';

const LANGS = ['ca', 'es', 'en'];

export default function App() {
  const [lang, setLang] = useState('ca');
  const [view, setView] = useState('form'); // 'form' | 'track'
  const [trackCode, setTrackCode] = useState('');

  const t = translations[lang];

  function goToTrack(code = '') {
    setTrackCode(code);
    setView('track');
  }

  function goToForm() {
    setView('form');
    setTrackCode('');
  }

  return (
    <div className="page">
      {/* Language switcher */}
      <div className="lang-bar">
        {LANGS.map(l => (
          <button
            key={l}
            className={`lang-btn ${lang === l ? 'active' : ''}`}
            onClick={() => setLang(l)}
          >
            {translations[l].langName}
          </button>
        ))}
      </div>

      {/* Main card */}
      <div className="card">
        {/* Header */}
        <div className="card-header">
          <span className="logo-wrap">
            <img src="/logo.png" alt="Reportia" />
          </span>
          <h1>{t.title}</h1>
          <p className="subtitle">{t.subtitle}</p>
          <span className="legal-badge">⚖️ {t.legalBadge}</span>
        </div>

        {/* Views */}
        {view === 'form' && (
          <ComplaintForm lang={lang} onTrack={goToTrack} />
        )}
        {view === 'track' && (
          <TrackingPortal lang={lang} initialCode={trackCode} onBack={goToForm} />
        )}
      </div>

      {/* Footer nav */}
      {view === 'form' && (
        <div className="page-footer">
          <button
            type="button"
            onClick={() => goToTrack('')}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,.4)', cursor: 'pointer',
              fontSize: '11px', textDecoration: 'underline',
              fontFamily: 'inherit',
            }}
          >
            🔍 {t.trackStatus}
          </button>
        </div>
      )}
    </div>
  );
}
