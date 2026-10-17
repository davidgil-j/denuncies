import React, { forwardRef, useCallback, useLayoutEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../translations.js';
// Manrope (la misma del producto) también en la web pública
import '@fontsource-variable/manrope';
import './v2.css';
import { replaceTop } from './lib/frame.js';

export const LANGS = ['ca', 'es', 'en'];
export const BOE_URL = 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-4513';
// Enlace a un artículo de la ley en el texto consolidado del BOE. Las anclas del BOE no son el
// número de artículo: hasta el 9 son a5, a9…; a partir del 10 son a1-2 (art. 10), a3-8 (art. 36)…
export const boeArt = (n) => `${BOE_URL}#a${n < 10 ? n : `${Math.floor(n / 10)}-${(n % 10) + 2}`}`;
// Canales externos de información (art. 7.2): autoridad estatal y, en Cataluña, la Oficina Antifrau
export const AIPI_URL = 'https://www.proteccioninformante.gob.es';
export const ANTIFRAU_URL = 'https://www.antifrau.cat';
const EXIT_URL = 'https://www.google.com/';

// Sustituye {clave} por valores: fmt('Paso {n} de {total}', { n: 1, total: 4 })
// Si el valor ya acaba en punto («Empresa, S.L.») y el texto pone otro, no salen dos
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

// Idioma inicial: el del navegador si es uno de los tres; si no, catalán
/** Idioma elegido en la web de Reportia o en el panel, si lo hay. Solo se lee: el canal no escribe nada ahí. */
export function savedLang() {
  try { const l = localStorage.getItem('reportia-panel-lang'); return LANGS.includes(l) ? l : null; } catch { return null; }
}

export function detectLang() {
  const nav = (typeof navigator !== 'undefined' && navigator.language || '').toLowerCase();
  // Gallego y euskera: castellano, que es el idioma del producto que les queda más cerca (G-3)
  if (nav.startsWith('es') || nav.startsWith('gl') || nav.startsWith('eu')) return 'es';
  if (nav.startsWith('en')) return 'en';
  return 'ca';
}

// Salir rápido: sustituye la entrada del historial para que «atrás» no vuelva al canal.
// Funciona porque dentro del canal toda la navegación sustituye la entrada (replace): el canal
// solo ocupa una en el historial, y es la que se sustituye aquí. Si el canal está dentro de la web
// de la empresa (un iframe), sale de la ventana entera, no solo del recuadro.
export function quickExit() {
  window.__v2Exiting = true;
  replaceTop(EXIT_URL);
}

export const ICON = { strokeWidth: 1.75, 'aria-hidden': true };

/**
 * Texto que ocupa siempre el espacio del idioma más largo: al cambiar de idioma, nada se mueve.
 * Pinta las tres versiones en la misma celda; solo la del idioma activo se ve y se lee
 * (las otras van con visibility: hidden y aria-hidden). pick recibe los textos de un idioma:
 *   <Stable lang={lang} pick={T => T.v2.title} />
 * as = etiqueta del elemento (por defecto span); con as="h1" o "p" hace de bloque, y con
 * block también un span. inner = clase de cada versión (por ejemplo, una fila de etiquetas).
 */
const ANCHORS = 'h1, h2, h3, h4, p, li, tr, dt, figure, fieldset, label, details, .v2-card';
/**
 * Al cambiar de idioma, la página no salta: se recuerda qué había arriba en la pantalla y,
 * con los textos nuevos ya pintados, se vuelve a dejar a la misma altura. Devuelve la función
 * que hay que llamar justo antes de cambiar el idioma.
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
    if (window.scrollY < 4) return; // arriba del todo, se queda arriba
    const main = document.getElementById('v2-main');
    if (!main) return;
    // Debajo de la cabecera pegada, si la hay
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
  // Dentro de un div puede ir cualquier contenido (párrafos, listas): las versiones también son div
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
 * Etiqueta que cambia al hacer una acción (Copiar → Copiado) sin que el botón cambie de tamaño: pinta
 * los dos textos en los tres idiomas, en la misma celda, y solo enseña el que toca. El texto
 * que se lee (y que se anuncia al cambiar) va en una región aparte, solo para lectores de pantalla.
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
 * Hace el componente de texto estable de una pantalla, ligado a su apartado de los textos y al idioma
 * que le llega por <Outlet context>:
 *   const S = stableOf(T => T.v2site.signup);   →   <S k="title" as="h1" />
 * k = clave dentro del apartado. pick(apartado, todos los textos, idioma) cuando el texto se compone.
 */
export function stableOf(scope) {
  return forwardRef(function StableText({ k, pick, ...rest }, ref) {
    const { lang } = useOutletContext();
    return <Stable ref={ref} lang={lang} pick={(T, l) => (pick ? pick(scope(T), T, l) : scope(T)[k])} {...rest} />;
  });
}
