import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../translations.js';
import { Lock, LayoutDashboard, Scale, Zap, ShieldCheck, ArrowRight } from 'lucide-react';

const LANGS = ['ca', 'es', 'en'];

export default function LandingPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState('ca');
  const t = translations[lang].landing;

  return (
    <div className="sl-page">

      {/* Navbar */}
      <nav className="sl-nav">
        <div className="sl-nav-inner">
          <span className="sl-wordmark">Reportia</span>
          <div className="sl-nav-right">
            <div className="sl-langs">
              {LANGS.map(l => (
                <button
                  key={l}
                  className={`sl-lang-btn${lang === l ? ' active' : ''}`}
                  onClick={() => setLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button className="sl-btn-ghost" onClick={() => navigate('/admin/login')}>
              {t.navLogin}
            </button>
            <button className="sl-btn-primary" onClick={() => navigate('/crear-compte')}>
              {t.navSignup} →
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="sl-hero">
        <div className="sl-hero-grid" aria-hidden="true" />
        <div className="sl-hero-glow" aria-hidden="true" />
        <div className="sl-hero-inner">
          <span className="sl-badge">
            <ShieldCheck size={13} />
            {t.heroBadge}
          </span>
          <h1 className="sl-hero-title">{t.heroTitle}</h1>
          <p className="sl-hero-sub">{t.heroSub}</p>
          <div className="sl-hero-ctas">
            <button className="sl-cta-main" onClick={() => navigate('/crear-compte')}>
              {t.heroCta}
              <ArrowRight size={16} />
            </button>
            <button className="sl-cta-ghost" onClick={() => navigate('/admin/login')}>
              {t.heroLogin}
            </button>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div className="sl-trust">
        <div className="sl-trust-inner">
          {[
            { Icon: Lock,        label: t.trust1 },
            { Icon: Scale,       label: t.trust2 },
            { Icon: ShieldCheck, label: t.trust3 },
            { Icon: Zap,         label: t.trust4 },
          ].map(({ Icon, label }) => (
            <div key={label} className="sl-trust-item">
              <Icon size={15} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="sl-features">
        <div className="sl-features-inner">
          <div className="sl-feat-card">
            <div className="sl-feat-icon"><Lock size={22} /></div>
            <h3>{t.feat1Title}</h3>
            <p>{t.feat1Desc}</p>
          </div>
          <div className="sl-feat-card">
            <div className="sl-feat-icon"><LayoutDashboard size={22} /></div>
            <h3>{t.feat2Title}</h3>
            <p>{t.feat2Desc}</p>
          </div>
          <div className="sl-feat-card">
            <div className="sl-feat-icon"><Scale size={22} /></div>
            <h3>{t.feat3Title}</h3>
            <p>{t.feat3Desc}</p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="sl-cta-section">
        <div className="sl-cta-inner">
          <h2>{t.ctaTitle}</h2>
          <p>{t.ctaDesc}</p>
          <button className="sl-cta-main" onClick={() => navigate('/crear-compte')}>
            {t.ctaButton}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="sl-footer">
        <span>{t.footer}</span>
      </footer>

    </div>
  );
}
