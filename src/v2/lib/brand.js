// «Tu marca» y «Apariencia»: las ocho paletas cerradas de cada empresa y los colores de cada modo (claro y oscuro).
// Es la única fuente de los colores del canal y del panel: ds.css lleva por defecto los de la azul en claro (para
// las páginas que no aplican marca) y scripts/test-logica.mjs comprueba que coinciden con estos y que todas las
// combinaciones pasan el contraste. Los valores salen de docs/AUDITORIA_ESTETICA.md §7 y §10.
import { useEffect, useLayoutEffect, useState } from 'react';

export const PALETTE_IDS = ['azul', 'marino', 'petroleo', 'bosque', 'burdeos', 'violeta', 'teja', 'grafito'];
export const DEFAULT_PALETTE = 'azul';
export const APPEARANCES = ['light', 'dark', 'system'];

// accent: botón principal, enlace activo y lo seleccionado · on: el texto sobre el botón principal
// soft / softInk: el único tinte (lo seleccionado, el siguiente paso, la cabecera de la conversación) y su texto
const P = {
  azul:     { light: { accent: '#2F54EB', on: '#FFFFFF', soft: '#E8EDFF', softInk: '#1F3FC4' }, dark: { accent: '#8FA6FF', on: '#0E1220', soft: '#1C2750', softInk: '#B7C5FF' } },
  marino:   { light: { accent: '#1E3A8A', on: '#FFFFFF', soft: '#E6ECF8', softInk: '#1E3A8A' }, dark: { accent: '#9DB4F0', on: '#0E1220', soft: '#1B2540', softInk: '#BDCDF5' } },
  petroleo: { light: { accent: '#0F5E6B', on: '#FFFFFF', soft: '#E1F0F2', softInk: '#0C4F5A' }, dark: { accent: '#6CC5D1', on: '#0E1220', soft: '#12323A', softInk: '#9ADAE3' } },
  bosque:   { light: { accent: '#17694A', on: '#FFFFFF', soft: '#E1F2EA', softInk: '#125239' }, dark: { accent: '#6FCF9F', on: '#0E1220', soft: '#123226', softInk: '#9BE0BE' } },
  burdeos:  { light: { accent: '#8E1F3C', on: '#FFFFFF', soft: '#F8E6EB', softInk: '#7A1A33' }, dark: { accent: '#F09AB0', on: '#0E1220', soft: '#3A1722', softInk: '#F5B9C8' } },
  violeta:  { light: { accent: '#5B3FD9', on: '#FFFFFF', soft: '#ECE8FD', softInk: '#4A31BD' }, dark: { accent: '#B3A4FF', on: '#0E1220', soft: '#261F52', softInk: '#CBC0FF' } },
  teja:     { light: { accent: '#A0401C', on: '#FFFFFF', soft: '#F8E9E2', softInk: '#873616' }, dark: { accent: '#F0A27F', on: '#0E1220', soft: '#3A1E12', softInk: '#F5BEA6' } },
  grafito:  { light: { accent: '#1F2937', on: '#FFFFFF', soft: '#E9ECF1', softInk: '#1F2937' }, dark: { accent: '#D5DAE3', on: '#0E1220', soft: '#262C3A', softInk: '#E3E7EE' } },
};

/** La paleta de una empresa (la azul si no tiene, o si el valor no es uno de los ocho) */
export const paletteOf = (id) => P[id] ?? P[DEFAULT_PALETTE];
export const validPalette = (id) => (PALETTE_IDS.includes(id) ? id : DEFAULT_PALETTE);

const chevron = (hex) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23${hex.slice(1)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

// Lo que no depende de la paleta. «ink» es el color del texto: en oscuro es claro, así que lo que va SOBRE la tinta
// (avisos flotantes, el aviso del canal de ejemplo) usa los «on-ink».
export const BASE = {
  light: {
    bg: '#F6F7F9', surface: '#FFFFFF', ink: '#0D1530', muted: '#4D5672', line: '#E3E6ED',
    'field-line': '#8A93AD', 'field-line-strong': '#7E87A3', 'input-bg': '#FFFFFF', soft: '#F1F3F7', 'soft-hover': '#E7EAF0',
    'ink-hover': '#1A2547', 'on-ink': '#FFFFFF', 'on-ink-muted': '#C9D3F5', 'on-ink-warn': '#FFC46B', 'on-ink-danger': '#FFB4AB', 'on-ink-glass': 'rgba(255, 255, 255, .14)',
    'warn-bg': '#FFF3D6', 'warn-ink': '#8A5A00', 'danger-bg': '#FDECEA', 'danger-ink': '#B42318', 'danger-line': '#F3B5AE',
    'note-bg': '#FFF8E5', 'note-line': '#EBD79B', 'chart-1': '#D7DCE6', 'chart-2': '#A7AEC2',
    backdrop: 'rgba(13, 21, 48, .5)', 'shadow-picked': '0 8px 24px rgba(13, 21, 48, .14)', 'select-chevron': chevron('#4D5672'),
    // Detrás del logo: nada sobre blanco; una placa blanca sobre el color o sobre oscuro (el logo se hizo para fondo claro)
    'logo-plate': 'transparent', 'logo-pad': '0px',
  },
  dark: {
    bg: '#0E1220', surface: '#171C2B', ink: '#EEF1F7', muted: '#A8B1C6', line: '#2B3348',
    'field-line': '#7480A0', 'field-line-strong': '#8A95B5', 'input-bg': '#0E1220', soft: '#1F2537', 'soft-hover': '#283048',
    'ink-hover': '#D5DAE3', 'on-ink': '#0E1220', 'on-ink-muted': '#3D4660', 'on-ink-warn': '#7A4F00', 'on-ink-danger': '#B42318', 'on-ink-glass': 'rgba(13, 21, 48, .12)',
    'warn-bg': '#3A2D12', 'warn-ink': '#F2C063', 'danger-bg': '#3B1B19', 'danger-ink': '#FF9B8F', 'danger-line': '#6B2F2A',
    'note-bg': '#2E2614', 'note-line': '#5A4A22', 'chart-1': '#3A4359', 'chart-2': '#5C6680',
    backdrop: 'rgba(0, 0, 0, .6)', 'shadow-picked': '0 8px 24px rgba(0, 0, 0, .45)', 'select-chevron': chevron('#A8B1C6'),
    'logo-plate': '#FFFFFF', 'logo-pad': '4px 7px',
  },
};

/** Mezcla de dos colores #RRGGBB: p es cuánto del primero */
export function mix(a, b, p) {
  const ch = (h, i) => parseInt(h.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map(i => Math.round(ch(a, i) * p + ch(b, i) * (1 - p)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
/** [r, g, b] de un color #RRGGBB (para los PDF) */
export const rgbOf = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

/**
 * Todas las variables de color de una paleta en un modo, con su nombre de CSS (--report, --bg…).
 * «solid» es el color de la mitad de Denunciar en la entrada: el acento de la paleta en claro, también en oscuro
 * (con texto blanco, que pasa el contraste en las ocho).
 */
export function themeVars(paletteId, mode = 'light') {
  const pal = paletteOf(paletteId);
  const c = pal[mode === 'dark' ? 'dark' : 'light'];
  const dark = mode === 'dark';
  const vars = {
    ...BASE[dark ? 'dark' : 'light'],
    report: c.accent, 'on-report': c.on, 'report-soft': c.soft, 'report-soft-ink': c.softInk,
    // Al pasar el ratón: en claro, el acento algo más oscuro; en oscuro, algo más claro
    'report-hover': dark ? mix(c.accent, '#FFFFFF', 0.82) : mix(c.accent, '#000000', 0.88),
    'report-soft-hover': mix(c.soft, c.accent, 0.93),
    'report-link-hover': dark ? mix(c.softInk, '#FFFFFF', 0.7) : mix(c.softInk, '#000000', 0.78),
    solid: pal.light.accent, 'on-solid': '#FFFFFF',
  };
  return Object.fromEntries(Object.entries(vars).map(([k, v]) => [`--${k}`, v]));
}

// ── Aplicarla a la página ───────────────────────────────────────────
// Las variables van en <html>: así las heredan también los diálogos y los avisos, y el fondo de la página.
const KEYS = Object.keys(themeVars(DEFAULT_PALETTE, 'light'));

export function applyTheme(paletteId, mode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(themeVars(paletteId, mode))) root.style.setProperty(k, v);
  root.dataset.theme = mode;
  // Los controles del navegador (calendario, barras de desplazamiento) en el mismo modo
  root.style.colorScheme = mode;
}

export function clearTheme() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const k of KEYS) root.style.removeProperty(k);
  delete root.dataset.theme;
  root.style.removeProperty('color-scheme');
}

const DARK_QUERY = '(prefers-color-scheme: dark)';
/** true si el sistema de quien mira está en modo oscuro (y se actualiza si lo cambia) */
export function useSystemDark() {
  const [dark, setDark] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(DARK_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(DARK_QUERY);
    if (!mq) return undefined;
    const on = () => setDark(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return dark;
}

/** El modo que toca: el que ha elegido la persona o, con «como el sistema», el del sistema */
export const resolveMode = (appearance, systemDark) => (appearance === 'dark' || (appearance !== 'light' && systemDark) ? 'dark' : 'light');

/**
 * Pinta la página con la paleta de la empresa y el modo que toca mientras la pantalla está abierta; al salir, la
 * deja como estaba (la web de Reportia no lleva marca). Devuelve el modo aplicado.
 * En el canal, appearance es siempre 'system': sigue el sistema de quien denuncia y no se guarda nada.
 */
export function useBrandTheme(paletteId, appearance = 'system') {
  const systemDark = useSystemDark();
  const mode = resolveMode(appearance, systemDark);
  const palette = validPalette(paletteId);
  useLayoutEffect(() => {
    applyTheme(palette, mode);
    return clearTheme;
  }, [palette, mode]);
  return mode;
}
