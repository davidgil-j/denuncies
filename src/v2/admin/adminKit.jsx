import React, { useEffect, useId, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  CircleDot, CircleDashed, CircleDotDashed, MessageSquareReply, CircleCheck, CircleCheckBig, Archive,
  SignalHigh, OctagonAlert, CircleAlert, Hourglass, Clock, ChevronDown,
} from 'lucide-react';
import { ICON, fmt } from '../V2Layout.jsx';

// ── Constants ───────────────────────────────────────────────────────────
export const STATUS_ORDER = ['received', 'reviewing', 'investigating', 'waiting', 'resolved', 'closed', 'archived'];
export const OPEN = ['received', 'reviewing', 'investigating', 'waiting'];
export const ANSWERED = ['resolved', 'closed', 'archived'];
export const PRIORITIES = ['low', 'normal', 'high', 'critical'];
export const PRIO_RANK = { low: 0, normal: 1, high: 2, critical: 3 };
export const PERMS = ['can_view', 'can_edit', 'can_reply', 'can_delete'];

// Llindars de "propers a vèncer" (s'expliquen al text del panell)
export const ACK_DAYS = 7;
export const RESP_MONTHS = 3;
const SOON_ACK = 2;
const SOON_RESP = 14;
const DAY = 86400000;

export const useAdmin = () => useOutletContext();

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
export function fNum(iso, lang) {
  // Un sol format curt a tot el panell ("23 jun 2026")
  return fDate(iso, lang);
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
 * Terminis de la Llei 2/2023 calculats des de la recepció (created_at):
 * acusament de recepció en 7 dies naturals i resposta en un màxim de 3 mesos.
 * L'acusament es dona per fet quan la denúncia surt de "received"; la resposta, quan passa
 * a resolved/closed/archived (data aproximada: updated_at, o la del registre si se li passa).
 */
export function deadlineInfo(c, now = new Date(), { answeredAt: answeredOverride } = {}) {
  const received = new Date(c.created_at);
  const ackDue = new Date(received.getTime() + ACK_DAYS * DAY);
  const respDue = addMonths(received, RESP_MONTHS);
  const acked = c.status !== 'received';
  const answered = ANSWERED.includes(c.status);
  const answeredAt = answered ? new Date(answeredOverride || c.updated_at || c.created_at) : null;
  const ackDays = daysBetween(now, ackDue);
  const respDays = daysBetween(now, respDue);
  const state = (days, soon) => (days < 0 ? 'overdue' : days <= soon ? 'soon' : 'pending');

  const ack = acked ? { state: 'done', due: ackDue } : { state: state(ackDays, SOON_ACK), days: ackDays, due: ackDue };
  const resp = answered
    ? { state: daysBetween(answeredAt, respDue) >= 0 ? 'met' : 'late', at: answeredAt, due: respDue }
    : { state: state(respDays, SOON_RESP), days: respDays, due: respDue };
  const next = answered ? { kind: 'resp', ...resp } : !acked ? { kind: 'ack', ...ack } : { kind: 'resp', ...resp };

  return {
    received, ackDue, respDue, ack, resp, next,
    totalDays: daysBetween(received, respDue),
    elapsed: daysBetween(received, now),
    // clau d'ordenació: el més urgent primer; les respostes ja donades, al final
    sortKey: answered ? Number.MAX_SAFE_INTEGER - received.getTime() / DAY : next.due.getTime(),
  };
}

/** Text principal d'un termini: "Queden 6 dies", "Vençut fa 2 dies", "En termini"… */
export function dlMain(t, d) {
  if (d.state === 'met') return t.dlMet;
  if (d.state === 'late') return t.dlLate;
  if (d.state === 'done') return t.ackDone;
  if (d.days < 0) return d.days === -1 ? t.dlOverdueOne : fmt(t.dlOverdue, { n: -d.days });
  if (d.days === 0) return t.dlToday;
  if (d.days === 1) return t.dlLeftOne;
  return fmt(t.dlLeft, { n: d.days });
}

const DL_ICON = { overdue: CircleAlert, soon: Hourglass, pending: Clock, met: CircleCheck, late: CircleAlert, done: CircleCheck };

/** Cel·la de termini per al llistat: estat i, a sota, quin termini és i la data */
export function Deadline({ info, t, lang }) {
  const n = info.next;
  const Icon = DL_ICON[n.state];
  const date = fShort(n.at ?? n.due, lang);
  return (
    <span className={`v2-dl is-${n.state}`}>
      <Icon {...ICON} />
      <span className="v2-dl-txt">
        <b>{dlMain(t, n)}</b>
        <small>{n.kind === 'ack' ? t.kAckShort : t.kResp}<span aria-hidden="true"> · </span>{date}</small>
      </span>
    </span>
  );
}

// ── Estat i prioritat ───────────────────────────────────────────────────
const STATUS_ICON = {
  received: CircleDot, reviewing: CircleDashed, investigating: CircleDotDashed,
  waiting: MessageSquareReply, resolved: CircleCheck, closed: CircleCheckBig, archived: Archive,
};
export function StatusPill({ status, t }) {
  const Icon = STATUS_ICON[status] ?? CircleDot;
  return (
    <span className={`v2-st is-${status}`}>
      <Icon {...ICON} />{t.status[status] ?? status}
    </span>
  );
}

// Icona només on aporta: baixa i normal es llegeixen millor sense
const PRIO_ICON = { high: SignalHigh, critical: OctagonAlert };
export function Priority({ priority, t }) {
  const Icon = PRIO_ICON[priority];
  return (
    <span className={`v2-prio is-${priority}`}>
      {Icon && <Icon {...ICON} />}{t.priority[priority] ?? priority}
    </span>
  );
}

// ── Controls ────────────────────────────────────────────────────────────
/** Desplegable natiu amb l'aspecte del sistema (el menú és el del sistema operatiu) */
export function Select({ label, hideLabel = false, value, onChange, options, className = '', disabled, id: idProp }) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className={`v2-sel ${className}`}>
      <label htmlFor={id} className={hideLabel ? 'v2-vh' : 'v2-sel-label'}>{label}</label>
      <div className="v2-sel-box">
        <select id={id} value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown {...ICON} />
      </div>
    </div>
  );
}

/** Diàleg de confirmació amb <dialog> natiu: focus protegit, Esc tanca */
export function Confirm({ open, title, children, confirmLabel, busyLabel, cancelLabel, busy = false, onConfirm, onCancel }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="v2-dialog"
      aria-labelledby={titleId}
      onCancel={e => { e.preventDefault(); if (!busy) onCancel(); }}
      onClick={e => { if (e.target === ref.current && !busy) onCancel(); }}
    >
      {open && (
        <div className="v2-dialog-body">
          <h2 id={titleId} className="v2-dialog-title">{title}</h2>
          <div className="v2-dialog-text">{children}</div>
          <div className="v2-dialog-actions">
            <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
            <button type="button" className="v2-btn v2-btn-danger v2-btn-sm" onClick={onConfirm} aria-busy={busy}>
              {busy ? busyLabel : confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

/** Estat buit que explica què hi anirà i com arribar-hi */
export function Empty({ icon: Icon, title, children, actions }) {
  return (
    <div className="v2-empty">
      {Icon && <span className="v2-empty-icon"><Icon {...ICON} /></span>}
      <h2 className="v2-empty-title">{title}</h2>
      {children && <p>{children}</p>}
      {actions && <div className="v2-empty-actions">{actions}</div>}
    </div>
  );
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export function catLabel(tr, value) {
  return tr.categories.find(c => c.value === value)?.label ?? value;
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
  if (log.action === 'note_added') return who ? fmt(t.aNote, { who }) : t.aNoteAnon;
  return t.aOther;
}
