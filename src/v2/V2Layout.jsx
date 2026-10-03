import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Lock } from 'lucide-react';
import { translations } from '../translations.js';
import './v2.css';

export const LANGS = ['ca', 'es', 'en'];
export const BOE_URL = 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-4513';
const EXIT_URL = 'https://www.google.com/';

// Sustitueix {clau} per valors: fmt('Pas {n} de {total}', { n: 1, total: 4 })
export function fmt(str, vars = {}) {
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? '').concat(parts[1]?.[0] ?? '').toUpperCase() || 'R';
}

// Idioma inicial: el del navegador si és un dels tres, si no català
export function detectLang() {
  const nav = (typeof navigator !== 'undefined' && navigator.language || '').toLowerCase();
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('en')) return 'en';
  return 'ca';
}

// Sortir ràpidament: substitueix l'entrada de l'historial perquè "enrere" no torni al canal
export function quickExit() {
  window.__v2Exiting = true;
  window.location.replace(EXIT_URL);
}

export const ICON = { strokeWidth: 1.75, 'aria-hidden': true };

export function EuSymbol() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <symbol id="v2-eu" viewBox="0 0 30 20">
        <rect width="30" height="20" fill="#0B3D91" />
        <path fill="#FFD23F" d="M15.000 2.222L15.249 2.990L16.057 2.990L15.404 3.464L15.653 4.232L15.000 3.758L14.347 4.232L14.596 3.464L13.943 2.990L14.751 2.990ZM18.333 3.115L18.583 3.883L19.390 3.883L18.737 4.358L18.986 5.125L18.333 4.651L17.680 5.125L17.930 4.358L17.277 3.883L18.084 3.883ZM20.774 5.556L21.023 6.323L21.830 6.323L21.177 6.798L21.427 7.566L20.774 7.091L20.120 7.566L20.370 6.798L19.717 6.323L20.524 6.323ZM21.667 8.889L21.916 9.657L22.723 9.657L22.070 10.131L22.320 10.899L21.667 10.424L21.014 10.899L21.263 10.131L20.610 9.657L21.417 9.657ZM20.774 12.222L21.023 12.990L21.830 12.990L21.177 13.464L21.427 14.232L20.774 13.758L20.120 14.232L20.370 13.464L19.717 12.990L20.524 12.990ZM18.333 14.662L18.583 15.430L19.390 15.430L18.737 15.905L18.986 16.672L18.333 16.198L17.680 16.672L17.930 15.905L17.277 15.430L18.084 15.430ZM15.000 15.556L15.249 16.323L16.057 16.323L15.404 16.798L15.653 17.566L15.000 17.091L14.347 17.566L14.596 16.798L13.943 16.323L14.751 16.323ZM11.667 14.662L11.916 15.430L12.723 15.430L12.070 15.905L12.320 16.672L11.667 16.198L11.014 16.672L11.263 15.905L10.610 15.430L11.417 15.430ZM9.226 12.222L9.476 12.990L10.283 12.990L9.630 13.464L9.880 14.232L9.226 13.758L8.573 14.232L8.823 13.464L8.170 12.990L8.977 12.990ZM8.333 8.889L8.583 9.657L9.390 9.657L8.737 10.131L8.986 10.899L8.333 10.424L7.680 10.899L7.930 10.131L7.277 9.657L8.084 9.657ZM9.226 5.556L9.476 6.323L10.283 6.323L9.630 6.798L9.880 7.566L9.226 7.091L8.573 7.566L8.823 6.798L8.170 6.323L8.977 6.323ZM11.667 3.115L11.916 3.883L12.723 3.883L12.070 4.358L12.320 5.125L11.667 4.651L11.014 5.125L11.263 4.358L10.610 3.883L11.417 3.883Z" />
      </symbol>
    </svg>
  );
}

export function EuFlag({ className, width, height, label }) {
  return (
    <svg className={className} width={width} height={height} viewBox="0 0 30 20" role="img" aria-label={label}>
      <use href="#v2-eu" />
    </svg>
  );
}

/**
 * Marc comú del canal v2: franja legal, capçalera, peu.
 * Afegeix .v2-body al <body> mentre està muntat.
 */
export default function V2Layout({ lang, setLang, org, homeTo, children }) {
  const t = translations[lang].v2;

  useEffect(() => {
    document.body.classList.add('v2-body');
    return () => document.body.classList.remove('v2-body');
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <div className="v2">
      <EuSymbol />

      <div className="v2-strip">
        <div className="v2-wrap">
          <EuFlag className="v2-flag" width={24} height={16} label={t.euFlag} />
          <span className="v2-strip-text">
            <span className="v2-only-wide"><b>{t.stripSystem}</b> {t.stripConform} </span>
            <a href={BOE_URL} target="_blank" rel="noopener noreferrer">{t.lawShort}</a>
          </span>
          <button type="button" className="v2-exit" onClick={quickExit}>
            <LogOut {...ICON} />{t.quickExit}
          </button>
        </div>
      </div>

      <header className="v2-header">
        <div className="v2-wrap">
          {org ? (
            <Link className="v2-brand" to={homeTo}>
              <span className="v2-mark" aria-hidden="true">{initials(org.name)}</span>
              <span className="v2-brand-txt">
                <span className="v2-brand-name">{org.name}</span>
                <span className="v2-brand-sub">{t.channelName}</span>
              </span>
            </Link>
          ) : <span />}
          <div className="v2-lang" role="group" aria-label={t.langGroup}>
            {LANGS.map(l => (
              <button
                key={l}
                type="button"
                lang={l}
                aria-pressed={lang === l}
                aria-label={translations[l].langName}
                onClick={() => setLang(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="v2-footer">
        <div className="v2-wrap">
          <span className="grow">{org ? `${org.name} · ${t.channelName}` : t.channelName}</span>
          <span className="secure"><Lock {...ICON} />{t.footerSecure}</span>
          <a href={BOE_URL} target="_blank" rel="noopener noreferrer">{t.footerLaw}</a>
          <a href={`/privacitat?lang=${lang}`}>{t.privacy}</a>
        </div>
      </footer>
    </div>
  );
}
