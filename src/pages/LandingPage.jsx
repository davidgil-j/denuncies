import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <div className="landing-inner">
        <div className="landing-logo">
          <img src="/logo.png" alt="Reportia" />
        </div>
        <h1 className="landing-title">Canal Ètic</h1>
        <p className="landing-sub">Selecciona una opció per continuar</p>

        <div className="landing-cards">
          <button className="landing-card" onClick={() => navigate('/canal')}>
            <div className="landing-card-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div className="landing-card-text">
              <span className="landing-card-title">Presentar una denúncia</span>
              <span className="landing-card-desc">Envia una denúncia de forma segura i confidencial</span>
            </div>
            <span className="landing-card-arrow">→</span>
          </button>

          <button className="landing-card landing-card-admin" onClick={() => navigate('/admin')}>
            <div className="landing-card-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <div className="landing-card-text">
              <span className="landing-card-title">Panel de control</span>
              <span className="landing-card-desc">Accés restringit per a gestors autoritzats</span>
            </div>
            <span className="landing-card-arrow">→</span>
          </button>
        </div>

        <p className="landing-footer">
          Totes les comunicacions estan protegides per xifratge d'extrem a extrem
        </p>
      </div>
    </div>
  );
}
