import React, { forwardRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Stable, fmt } from '../V2Layout.jsx';
import { deadlineInfo, daysBetween, auditText } from '../admin/adminKit.jsx';

export const usePanel = () => useOutletContext();

/** Texto del lado «Gestionar» (apartado «panel»): para títulos y botones grandes, sin que se muevan al cambiar de idioma */
export const Tp = forwardRef(function Tp({ lang, k, vars, pick, ...rest }, ref) {
  return <Stable ref={ref} lang={lang} pick={(T, l) => (pick ? pick(T.panel, T, l) : fmt(T.panel[k], vars))} {...rest} />;
});

export const NEW = ['received'];
export const OPEN = ['reviewing', 'investigating', 'waiting'];
export const CLOSED = ['resolved', 'closed', 'archived'];
export const columnOf = (c) => (NEW.includes(c.status) ? 'new' : OPEN.includes(c.status) ? 'open' : 'closed');
export const OUTCOMES = ['founded', 'unfounded', 'inadmissible', 'out_of_scope', 'duplicate'];
export const CHANNELS = ['phone', 'in_person', 'mail', 'email', 'other'];
const MEETING_DAYS = 7;

/** Título del caso: el que puso el equipo o, si no hay, las primeras palabras de lo que contó */
export function caseTitle(c, p) {
  if (c.title) return c.title;
  if (c.anonymized_at) return `${p.suppressed} · ${c.reference}`;
  const words = (c.description ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return c.reference;
  return words.length > 9 ? `${words.slice(0, 9).join(' ').replace(/[,;:.]$/, '')}…` : words.join(' ');
}

/** Reunión presencial: el plazo legal son 7 días desde que se pidió (art. 7.2) */
export function meetingInfo(c, now = new Date()) {
  if (!c.meeting_requested) return null;
  const from = new Date(c.meeting_requested_at ?? c.created_at);
  const due = new Date(from);
  due.setDate(due.getDate() + MEETING_DAYS);
  return { pending: !c.meeting_held_at && !CLOSED.includes(c.status), heldAt: c.meeting_held_at ?? null, due, days: daysBetween(now, due) };
}

/**
 * Todo lo que el tablero y la ficha necesitan saber de un caso: plazos, columna, y si «te necesita
 * hoy»: acuse pendiente, mensaje sin leer, reunión pendiente o un plazo vencido o a menos de 7 días.
 */
export function caseState(c, now = new Date()) {
  const dl = deadlineInfo(c, now);
  const column = columnOf(c);
  const meeting = meetingInfo(c, now);
  const closed = column === 'closed' || !!c.anonymized_at;
  const next = dl.next;
  const urgent = !closed && ['overdue', 'soon', 'pending'].includes(next.state) && next.days < 7;
  const today = !closed && (column === 'new' || (c.unread ?? 0) > 0 || !!meeting?.pending || urgent);
  const deadline = closed ? null : { kind: next.kind, days: next.days };
  return { dl, column, meeting, closed, today, deadline, overdue: !closed && next.state === 'overdue', done: column === 'closed' ? (dl.resp.state === 'late' ? 'late' : 'onTime') : null };
}

export function relDay(iso, p) {
  const n = daysBetween(iso, new Date());
  return n <= 0 ? p.today : n === 1 ? p.yesterday : fmt(p.daysAgo, { n });
}

/** Texto de una entrada del historial: las de siempre, más las del rediseño */
export function historyText(p, t, log) {
  const d = log.details ?? {};
  if (log.action === 'meeting_requested') return p.aMeetReq;
  if (log.action === 'assigned') {
    if (!d.to) return p.aUnassigned;
    return d.actor_name ? fmt(p.aAssigned, { who: d.actor_name, to: d.to_name ?? '' }) : fmt(p.aAssignedAnon, { to: d.to_name ?? '' });
  }
  return auditText(t, log);
}
