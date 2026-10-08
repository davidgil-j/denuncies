import { fmt } from '../V2Layout.jsx';

// ── Constants ───────────────────────────────────────────────────────────
export const STATUS_ORDER = ['received', 'reviewing', 'investigating', 'waiting', 'resolved', 'closed', 'archived'];
export const OPEN = ['received', 'reviewing', 'investigating', 'waiting'];
export const ANSWERED = ['resolved', 'closed', 'archived'];
export const PRIORITIES = ['low', 'normal', 'high', 'critical'];
export const PERMS = ['can_view', 'can_edit', 'can_reply', 'can_delete'];

// Llindars de "propers a vèncer" (s'expliquen al text del panell)
export const ACK_DAYS = 7;
export const RESP_MONTHS = 3;
const SOON_ACK = 2;
const SOON_RESP = 14;
const DAY = 86400000;

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

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
/** Dies naturals entre dues dates (comptant per data de calendari) */
export function daysBetween(from, to) { return Math.round((startOfDay(to) - startOfDay(from)) / DAY); }
function addMonths(d, n) {
  const x = new Date(d);
  const day = x.getDate();
  x.setMonth(x.getMonth() + n);
  if (x.getDate() < day) x.setDate(0); // 31 de maig + 3 mesos = 31 d'agost; 30 de novembre + 3 = 28/29 de febrer
  return x;
}

export function relDay(iso, t) {
  const n = daysBetween(iso, new Date());
  if (n <= 0) return t.today;
  if (n === 1) return t.yesterday;
  return fmt(t.daysAgo, { n });
}

/**
 * Terminis de la Llei 2/2023 calculats des de la recepció (created_at), en dies de calendari
 * (un canvi d'hora no els desplaça): acusament de recepció en 7 dies naturals i resposta en un
 * màxim de 3 mesos, o fins a la data ampliada (extended_until, art. 9.2 d).
 * Les dates d'acusament i de resposta les desa la base de dades (acknowledged_at, answered_at,
 * migració 010); sense elles, es dedueixen de l'estat.
 */
export function deadlineInfo(c, now = new Date(), { answeredAt: answeredOverride, ackAt: ackOverride } = {}) {
  const received = new Date(c.created_at);
  const ackDue = new Date(received);
  ackDue.setDate(ackDue.getDate() + ACK_DAYS);
  const baseDue = addMonths(received, RESP_MONTHS);
  const respDue = c.extended_until ? new Date(`${c.extended_until}T12:00:00`) : baseDue;
  const ackAt = c.acknowledged_at ?? ackOverride ?? null;
  const acked = !!ackAt || c.status !== 'received';
  const answered = !!c.answered_at || ANSWERED.includes(c.status);
  const answeredAt = answered ? new Date(c.answered_at || answeredOverride || c.updated_at || c.created_at) : null;
  const ackDays = daysBetween(now, ackDue);
  const respDays = daysBetween(now, respDue);
  const state = (days, soon) => (days < 0 ? 'overdue' : days <= soon ? 'soon' : 'pending');

  const ack = acked
    ? { state: 'done', due: ackDue, at: ackAt ? new Date(ackAt) : null, late: ackAt ? daysBetween(ackAt, ackDue) < 0 : false }
    : { state: state(ackDays, SOON_ACK), days: ackDays, due: ackDue };
  const resp = answered
    ? { state: daysBetween(answeredAt, respDue) >= 0 ? 'met' : 'late', at: answeredAt, due: respDue }
    : { state: state(respDays, SOON_RESP), days: respDays, due: respDue };
  const next = answered ? { kind: 'resp', ...resp } : !acked ? { kind: 'ack', ...ack } : { kind: 'resp', ...resp };

  return {
    received, ackDue, respDue, baseDue, extended: !!c.extended_until, ack, resp, next,
    totalDays: daysBetween(received, respDue),
    elapsed: daysBetween(received, now),
    // clau d'ordenació: el més urgent primer; les respostes ja donades, al final
    sortKey: answered ? Number.MAX_SAFE_INTEGER - received.getTime() / DAY : next.due.getTime(),
  };
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
  const days = daysBetween(now, new Date(`${org.paid_until}T12:00:00`));
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
