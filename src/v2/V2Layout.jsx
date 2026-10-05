import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { LogOut, Lock } from 'lucide-react';
import { translations } from '../translations.js';
import './v2.css';

export const LANGS = ['ca', 'es', 'en'];
export const BOE_URL = 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-4513';
// Enllaç a un article de la llei al text consolidat del BOE. Les àncores del BOE no són el
// número d'article: fins al 9 són a5, a9…; a partir del 10 són a1-2 (art. 10), a3-8 (art. 36)…
export const boeArt = (n) => `${BOE_URL}#a${n < 10 ? n : `${Math.floor(n / 10)}-${(n % 10) + 2}`}`;
// Canals externs d'informació (art. 7.2): autoritat estatal i, a Catalunya, l'Oficina Antifrau
export const AIPI_URL = 'https://www.proteccioninformante.gob.es';
export const ANTIFRAU_URL = 'https://www.antifrau.cat';
const EXIT_URL = 'https://www.google.com/';

// Sustitueix {clau} per valors: fmt('Pas {n} de {total}', { n: 1, total: 4 })
// Si el valor ja acaba en punt («Empresa, S.L.») i el text en posa un altre, no en surten dos
export function fmt(str, vars = {}) {
  return str.replace(/\{(\w+)\}(\.?)/g, (m, k, dot) => {
    if (!(k in vars)) return m;
    const v = String(vars[k]);
    return dot && v.endsWith('.') ? v : v + dot;
  });
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

// Sortir ràpidament: substitueix l'entrada de l'historial perquè "enrere" no torni al canal.
// Funciona perquè dins del canal tota la navegació substitueix l'entrada (replace): el canal
// només n'ocupa una a l'historial, i és la que es substitueix aquí.
export function quickExit() {
  window.__v2Exiting = true;
  window.location.replace(EXIT_URL);
}

export const ICON = { strokeWidth: 1.75, 'aria-hidden': true };

/**
 * Text que ocupa sempre l'espai de l'idioma més llarg: en canviar d'idioma, res no es mou.
 * Pinta les tres versions a la mateixa cel·la; només la de l'idioma actiu es veu i es llegeix
 * (les altres van amb visibility: hidden i aria-hidden). pick rep els textos d'un idioma:
 *   <Stable lang={lang} pick={T => T.v2.title} />
 * as = etiqueta de l'element (per defecte span); amb as="h1" o "p" fa de bloc, i amb
 * block també un span. inner = classe de cada versió (per exemple, una fila d'etiquetes).
 */
const ANCHORS = 'h1, h2, h3, h4, p, li, tr, dt, figure, fieldset, label, details, .v2-card';
/**
 * En canviar d'idioma, la pàgina no salta: es recorda què hi havia a dalt de la pantalla i,
 * amb els textos nous ja pintats, es torna a deixar a la mateixa alçada. Retorna la funció
 * que s'ha de cridar just abans de canviar l'idioma.
 */
export function useLangAnchor(lang) {
  const held = useRef(null);
  useLayoutEffect(() => {
    const h = held.current;
    held.current = null;
    if (!h || !h.el.isConnected) return;
    const delta = h.el.getBoundingClientRect().top - h.top;
    if (Math.abs(delta) >= 1) window.scrollBy({ top: delta, behavior: 'instant' });
  }, [lang]);
  return useCallback(() => {
    held.current = null;
    if (window.scrollY < 4) return; // a dalt de tot, es queda a dalt
    const main = document.getElementById('v2-main');
    if (!main) return;
    // Sota la capçalera enganxada, si n'hi ha
    const head = document.querySelector('.v2-site-header, .v2-topbar');
    const box = head && getComputedStyle(head).position === 'sticky' ? head.getBoundingClientRect() : null;
    const min = box && box.height ? Math.max(0, box.bottom) : 0;
    for (const el of main.querySelectorAll(ANCHORS)) {
      const r = el.getBoundingClientRect();
      if (!r.height || r.top < min) continue;
      if (r.top < window.innerHeight) held.current = { el, top: r.top };
      break;
    }
  }, []);
}

export const Stable = forwardRef(function Stable({ lang, pick, as: Tag = 'span', block = false, inner = '', className = '', ...rest }, ref) {
  // Dins d'un div hi pot anar qualsevol contingut (paràgrafs, llistes): les versions també són div
  const V = Tag === 'div' ? 'div' : 'span';
  return (
    <Tag ref={ref} className={`v2-stable${block ? ' is-block' : ''}${className ? ` ${className}` : ''}`} {...rest}>
      {LANGS.map(l => (
        <V key={l} className={`v2-stable-v${inner ? ` ${inner}` : ''}`} aria-hidden={l === lang ? undefined : true} lang={l === lang ? undefined : l}>
          {pick(translations[l], l)}
        </V>
      ))}
    </Tag>
  );
});

/**
 * Etiqueta que canvia en fer una acció (Copiar → Copiat) sense que el botó canviï de mida: pinta
 * els dos textos en els tres idiomes, a la mateixa cel·la, i només ensenya el que toca. El text
 * que es llegeix (i que s'anuncia en canviar) va en una regió a part, només per a lectors de pantalla.
 */
export function Swap({ lang, on, pick, pickOn }) {
  const text = (state, l) => (state ? pickOn : pick)(translations[l], l);
  return (
    <span className="v2-stable">
      {[false, true].flatMap(state => LANGS.map(l => (
        <span key={`${state}-${l}`} className="v2-swap-v" aria-hidden="true" data-off={state === !!on && l === lang ? undefined : ''}>
          {text(state, l)}
        </span>
      )))}
      <span className="v2-vh" aria-live="polite">{text(!!on, lang)}</span>
    </span>
  );
}

/**
 * Fa el component de text estable d'una pantalla, lligat al seu apartat dels textos i a l'idioma
 * que li arriba per <Outlet context>:
 *   const S = stableOf(T => T.v2site.login);   →   <S k="title" as="h1" />
 * k = clau dins l'apartat. pick(apartat, tots els textos, idioma) quan el text es compon.
 */
export function stableOf(scope) {
  return forwardRef(function StableText({ k, pick, ...rest }, ref) {
    const { lang } = useOutletContext();
    return <Stable ref={ref} lang={lang} pick={(T, l) => (pick ? pick(scope(T), T, l) : scope(T)[k])} {...rest} />;
  });
}

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
  const holdScroll = useLangAnchor(lang);
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
      <a className="v2-skip" href="#v2-main">{t.skip}</a>

      <div className="v2-strip">
        <div className="v2-wrap">
          <EuFlag className="v2-flag" width={24} height={16} label={t.euFlag} />
          <span className="v2-strip-text">
            <span className="v2-only-wide"><b>{t.stripSystem}</b> {t.stripConform} </span>
            <a href={BOE_URL} target="_blank" rel="noopener noreferrer">{t.lawShort}</a>
          </span>
          <button type="button" className="v2-exit" onClick={quickExit}>
            <LogOut {...ICON} /><Stable lang={lang} pick={T => T.v2.quickExit} />
          </button>
        </div>
      </div>

      <header className="v2-header">
        <div className="v2-wrap">
          {org ? (
            <Link className="v2-brand" to={homeTo} replace>
              <span className="v2-mark" aria-hidden="true">{initials(org.name)}</span>
              <span className="v2-brand-txt">
                <span className="v2-brand-name">{org.name}</span>
                <Stable lang={lang} pick={T => T.v2.channelName} className="v2-brand-sub" />
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
                onClick={() => { holdScroll(); setLang(l); }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main id="v2-main" tabIndex={-1}>{children}</main>

      <footer className="v2-footer">
        <div className="v2-wrap">
          <span className="grow">{org ? `${org.name} · ${t.channelName}` : t.channelName}</span>
          <span className="secure"><Lock {...ICON} />{t.footerSecure}</span>
          <a href={BOE_URL} target="_blank" rel="noopener noreferrer">{t.footerLaw}</a>
          {org ? <Link to={`${homeTo}/privacidad`} replace>{t.privacy}</Link> : <a href={`/privacitat?lang=${lang}`}>{t.privacy}</a>}
        </div>
      </footer>
    </div>
  );
}
