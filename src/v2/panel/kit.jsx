import React, { forwardRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Stable, fmt } from '../V2Layout.jsx';
import { deadlineInfo, daysBetween, auditText } from '../admin/adminKit.jsx';
import { madridDay, dayToDate } from '../../lib/deadlines.js';
import { AI_ENABLED } from '../../lib/supabase.js';

export const usePanel = () => useOutletContext();

/** Texto del lado «Gestionar» (apartado «panel»): para títulos y botones grandes, sin que se muevan al cambiar de idioma */
export const Tp = forwardRef(function Tp({ lang, k, vars, pick, ...rest }, ref) {
  return <Stable ref={ref} lang={lang} pick={(T, l) => (pick ? pick(T.panel, T, l) : fmt(T.panel[k], vars))} {...rest} />;
});

export const NEW = ['received'];
export const OPEN = ['reviewing', 'investigating', 'waiting'];
export const CLOSED = ['resolved', 'closed', 'archived'];
// Un caso con los datos suprimidos (art. 32) ya no tiene nada que gestionar: va a «Cerradas» sea cual sea su estado
export const columnOf = (c) => (c.anonymized_at ? 'closed' : NEW.includes(c.status) ? 'new' : OPEN.includes(c.status) ? 'open' : 'closed');
export const OUTCOMES = ['founded', 'unfounded', 'inadmissible', 'out_of_scope', 'duplicate'];
export const CHANNELS = ['phone', 'in_person', 'mail', 'email', 'other'];
const MEETING_DAYS = 7;

/**
 * Título del caso: el que puso el equipo; si no hay, el que propuso la IA (solo con la IA encendida)
 * y, si tampoco, las primeras palabras de lo que contó.
 */
export function caseTitle(c, p) {
  if (c.title) return c.title;
  if (AI_ENABLED && c.ai_title && !c.anonymized_at) return c.ai_title;
  if (c.anonymized_at) return `${p.suppressed} · ${c.reference}`;
  const words = (c.description ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return c.reference;
  return words.length > 9 ? `${words.slice(0, 9).join(' ').replace(/[,;:.]$/, '')}…` : words.join(' ');
}

/** Reunión presencial: el plazo legal son 7 días desde que se pidió (art. 7.2) */
export function meetingInfo(c, now = new Date()) {
  if (!c.meeting_requested) return null;
  // En días de calendario de Madrid, como el resto de plazos
  const dueDay = madridDay(c.meeting_requested_at ?? c.created_at) + MEETING_DAYS;
  return { pending: !c.meeting_held_at && !CLOSED.includes(c.status), heldAt: c.meeting_held_at ?? null, due: dayToDate(dueDay), days: dueDay - madridDay(now) };
}

/**
 * Todo lo que el tablero y la ficha necesitan saber de un caso (done: onTime | late | erased, para las cerradas): plazos, columna, y si «te necesita
 * hoy»: acuse pendiente, mensaje sin leer, reunión pendiente o un plazo vencido o a menos de 7 días.
 */
export function caseState(c, now = new Date()) {
  const dl = deadlineInfo(c, now);
  const column = columnOf(c);
  const meeting = meetingInfo(c, now);
  const closed = column === 'closed' || !!c.anonymized_at;
  const next = dl.next;
  const urgent = !closed && ['overdue', 'soon', 'pending'].includes(next.state) && next.days < 7;
  // Un mensaje sin leer cuenta siempre, también en un caso cerrado (puede ser un aviso de represalia)
  const today = (c.unread ?? 0) > 0 || (!closed && (column === 'new' || !!meeting?.pending || urgent));
  // Un caso reabierto ya tiene su primera respuesta: no vuelve a tener cuenta atrás
  const deadline = closed || next.days === undefined ? null : { kind: next.kind, days: next.days };
  return { dl, column, meeting, closed, today, deadline, overdue: !closed && next.state === 'overdue', done: c.anonymized_at ? 'erased' : column === 'closed' ? (dl.resp.state === 'late' ? 'late' : 'onTime') : null };
}

export function relDay(iso, p) {
  const n = daysBetween(iso, new Date());
  return n <= 0 ? p.today : n === 1 ? p.yesterday : fmt(p.daysAgo, { n });
}

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
/** ¿El título es justo el nombre de una columna del tablero («Nuevas», «En curso», «Cerradas»), en cualquier idioma? */
export function sameAsColumn(title, tr) {
  const t = norm(title);
  if (!t) return false;
  const all = Object.values(tr.panel?.cols ?? {});
  return [...all, 'Nuevas', 'En curso', 'Cerradas', 'Noves', 'En curs', 'Tancades', 'New', 'In progress', 'Closed'].some(c => norm(c) === t);
}

const LOCALES = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };
/** «1 ene» o «1 ene 2026»: día y mes abreviado, sin «de» ni punto, en el idioma */
function shortDay(iso, lang, withYear) {
  const d = new Date(`${iso}T12:00:00`);
  const month = d.toLocaleDateString(LOCALES[lang] ?? 'es-ES', { month: 'short' }).replace(/^(de |d’|d')/, '').replace(/\.$/, '');
  return `${d.getDate()} ${month}${withYear ? ` ${d.getFullYear()}` : ''}`;
}
/** Cómo se dice un filtro de fechas: «Año 2026» si es el año entero; si no, «1 ene – 31 dic 2026» */
export function rangeLabel(from, to, lang, p) {
  if (from && to) {
    const [y1, y2] = [from.slice(0, 4), to.slice(0, 4)];
    if (y1 === y2 && from.slice(5) === '01-01' && to.slice(5) === '12-31') return fmt(p.yearN, { year: y1 });
    return `${shortDay(from, lang, y1 !== y2)} – ${shortDay(to, lang, true)}`;
  }
  return from ? fmt(p.sinceD, { date: shortDay(from, lang, true) }) : fmt(p.untilD, { date: shortDay(to, lang, true) });
}

/** Los huecos de una plantilla que siguen sin rellenar: «[día]», «[hora]»… (también en los borradores de IA) */
export const blanks = (text) => [...new Set(String(text ?? '').match(/\[[^\[\]\n]{1,60}\]/g) ?? [])];
/** El aviso que bloquea el envío mientras queden huecos, o '' si no queda ninguno */
export const blanksError = (text, p) => { const left = blanks(text); return left.length ? fmt(p.fillBlanks, { list: left.join(', ') }) : ''; };

/** Texto de una entrada del historial: las de siempre, más las del rediseño */
export function historyText(p, t, log) {
  const d = log.details ?? {};
  if (log.action === 'meeting_requested') return p.aMeetReq;
  if (log.action === 'ai_summary') return d.actor_name ? fmt(p.ai.hist, { who: d.actor_name }) : p.ai.histAnon;
  if (log.action === 'assigned') {
    if (!d.to) return p.aUnassigned;
    return d.actor_name ? fmt(p.aAssigned, { who: d.actor_name, to: d.to_name ?? '' }) : fmt(p.aAssignedAnon, { to: d.to_name ?? '' });
  }
  return auditText(t, log);
}
