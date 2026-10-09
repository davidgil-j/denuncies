import { fmt } from '../V2Layout.jsx';
import { daysBetween } from '../../lib/deadlines.js';

// Terminis de la Llei 2/2023, en dies de calendari de Madrid (com la base de dades): src/lib/deadlines.js
export { deadlineInfo, daysBetween, ACK_DAYS, RESP_MONTHS } from '../../lib/deadlines.js';

// ── Constants ───────────────────────────────────────────────────────────
export const STATUS_ORDER = ['received', 'reviewing', 'investigating', 'waiting', 'resolved', 'closed', 'archived'];
export const OPEN = ['received', 'reviewing', 'investigating', 'waiting'];
export { ANSWERED } from '../../lib/deadlines.js';
export const PRIORITIES = ['low', 'normal', 'high', 'critical'];
export const PERMS = ['can_view', 'can_edit', 'can_reply', 'can_delete'];


export function localeOf(lang) {
  return lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'ca-ES';
}

export function fDate(iso, lang, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(localeOf(lang), opts);
}
export function fDateTime(iso, lang) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(localeOf(lang), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function fShort(iso, lang) {
  return fDate(iso, lang, { day: 'numeric', month: 'short' });
}
export function fLong(iso, lang) {
  return fDate(iso, lang, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function relDay(iso, t) {
  const n = daysBetween(iso, new Date());
  if (n <= 0) return t.today;
  if (n === 1) return t.yesterday;
  return fmt(t.daysAgo, { n });
}

// ── Pla de l'organització ───────────────────────────────────────────────
/**
 * Estat del pla a partir de les columnes d'organizations (migració 009).
 * Retorna null si l'organització encara no té pla (migració pendent): llavors no es mostra res.
 * { plan, state: trial | trialEnded | active | expired, days, until, renewSoon }
 */
export function planInfo(org, now = new Date()) {
  if (!org?.plan) return null;
  if (org.plan === 'trial') {
    if (!org.trial_ends_at) return null;
    const until = new Date(org.trial_ends_at);
    const days = daysBetween(now, until);
    const ended = until.getTime() <= now.getTime();
    return { plan: 'trial', state: ended ? 'trialEnded' : 'trial', days: Math.max(days, 0), until: org.trial_ends_at, renewSoon: false };
  }
  if (!org.paid_until) return { plan: org.plan, state: 'active', days: null, until: null, renewSoon: false };
  const days = daysBetween(now, String(org.paid_until).slice(0, 10));
  return { plan: org.plan, state: days < 0 ? 'expired' : 'active', days: Math.max(days, 0), until: `${org.paid_until}T12:00:00`, renewSoon: days >= 0 && days <= 30 };
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** Text d'una entrada del registre d'activitat */
export function auditText(t, log) {
  const d = log.details ?? {};
  const who = d.actor_name;
  const st = (s) => t.status[s] ?? s;
  if (log.action === 'created') return t.aCreated;
  if (log.action === 'status_changed') return who ? fmt(t.aStatus, { who, to: st(d.to) }) : fmt(t.aStatusAnon, { to: st(d.to) });
  const legacy = /^status_changed_to_(\w+)$/.exec(log.action ?? '');
  if (legacy) return fmt(t.aStatusAnon, { to: st(legacy[1]) });
  if (log.action === 'priority_changed') {
    const to = t.priority[d.to] ?? d.to;
    return who ? fmt(t.aPriority, { who, to }) : fmt(t.aPriorityAnon, { to });
  }
  if (log.action === 'message_sent') return who ? fmt(t.aMessage, { who }) : t.aMessageAnon;
  if (log.action === 'reporter_message') return t.aReporterMsg;
  if (log.action === 'note_added') return who ? fmt(t.aNote, { who }) : t.aNoteAnon;
  if (log.action === 'deadline_extended') return who ? fmt(t.aExtended, { who }) : t.aExtendedAnon;
  if (log.action === 'anonymized') return who ? fmt(t.aAnonymized, { who }) : t.aAnonymizedAnon;
  if (log.action === 'identity_viewed') return who ? fmt(t.aIdentity, { who }) : t.aIdentityAnon;
  if (log.action === 'registered') return who ? fmt(t.aRegistered, { who }) : t.aRegisteredAnon;
  if (log.action === 'meeting_held') return who ? fmt(t.aMeeting, { who }) : t.aMeetingAnon;
  if (log.action === 'fiscal_referral') return who ? fmt(t.aFiscal, { who }) : t.aFiscalAnon;
  if (log.action === 'outcome_set') return who ? fmt(t.aOutcome, { who }) : t.aOutcomeAnon;
  return t.aOther;
}
