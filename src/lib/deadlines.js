// Plazos de la Ley 2/2023 (art. 9.2) en días de calendario de Madrid: la misma cuenta que hace la base
// de datos al ampliar un plazo (extend_response_deadline). Así un caso se ve igual desde cualquier zona
// horaria y la fecha que promete la ampliación es la que se guarda.
// Sin dependencias: lo usan el panel, el canal, las exportaciones y las pruebas (node).

export const TZ = 'Europe/Madrid';
export const ACK_DAYS = 7;
export const RESP_MONTHS = 3;
export const EXT_MONTHS = 6;
export const ANSWERED = ['resolved', 'closed', 'archived'];
const DAY = 86400000;

const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const dayOf = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DAY);

/** Día de calendario (días desde 1970-01-01) en Madrid de un instante, o de una fecha 'AAAA-MM-DD' */
export function madridDay(value) {
  const s = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (s) return dayOf(+s[1], +s[2], +s[3]);
  const p = Object.fromEntries(ymd.formatToParts(new Date(value)).map(x => [x.type, x.value]));
  return dayOf(+p.year, +p.month, +p.day);
}

/** Suma meses a un día como la base de datos: 31 de mayo + 3 = 31 de agosto; 30 de noviembre + 3 = 28 o 29 de febrero */
export function addMonthsDay(day, n) {
  const x = new Date(day * DAY);
  const y = x.getUTCFullYear(), m = x.getUTCMonth() + n;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Math.round(Date.UTC(y, m, Math.min(x.getUTCDate(), last)) / DAY);
}

/** Un día de calendario como fecha a mediodía local: se muestra con ese mismo día en cualquier zona */
export function dayToDate(day) {
  const x = new Date(day * DAY);
  return new Date(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate(), 12);
}

/** 'AAAA-MM-DD' de un día de calendario */
export const dayToIso = (day) => new Date(day * DAY).toISOString().slice(0, 10);

/** Días de calendario (en Madrid) de una fecha a otra */
export function daysBetween(from, to) { return madridDay(to) - madridDay(from); }

/** Hasta cuándo llega el plazo si se amplía: 6 meses desde la recepción (art. 9.2 d), como la base de datos */
export function extensionUntil(createdAt) { return dayToDate(addMonthsDay(madridDay(createdAt), EXT_MONTHS)); }

/**
 * Plazos de un caso, contados desde la recepción (created_at): acuse en 7 días naturales y respuesta en
 * un máximo de 3 meses, o hasta la fecha ampliada (extended_until). Las fechas de acuse y de respuesta
 * las guarda la base de datos (acknowledged_at, answered_at); sin ellas, se deducen del estado.
 * Un caso reabierto conserva la fecha de su primera respuesta: no vuelve a tener cuenta atrás.
 * soonAck y soonResp: a partir de cuántos días un plazo está «a punto de vencer».
 */
export function deadlineInfo(c, now = new Date(), { answeredAt: answeredOverride, ackAt: ackOverride, soonAck = 2, soonResp = 14 } = {}) {
  const received = new Date(c.created_at);
  const recDay = madridDay(c.created_at);
  const ackDueDay = recDay + ACK_DAYS;
  const baseDueDay = addMonthsDay(recDay, RESP_MONTHS);
  const respDueDay = c.extended_until ? madridDay(c.extended_until) : baseDueDay;
  const today = madridDay(now);
  const ackDue = dayToDate(ackDueDay);
  const respDue = dayToDate(respDueDay);

  const ackAt = c.acknowledged_at ?? ackOverride ?? null;
  const acked = !!ackAt || c.status !== 'received';
  const answered = !!c.answered_at || ANSWERED.includes(c.status);
  const answeredAt = answered ? new Date(c.answered_at || answeredOverride || c.updated_at || c.created_at) : null;
  const state = (days, soon) => (days < 0 ? 'overdue' : days <= soon ? 'soon' : 'pending');

  const ack = acked
    ? { state: 'done', due: ackDue, at: ackAt ? new Date(ackAt) : null, late: ackAt ? madridDay(ackAt) > ackDueDay : false }
    : { state: state(ackDueDay - today, soonAck), days: ackDueDay - today, due: ackDue };
  const resp = answered
    ? { state: madridDay(answeredAt) <= respDueDay ? 'met' : 'late', at: answeredAt, due: respDue }
    : { state: state(respDueDay - today, soonResp), days: respDueDay - today, due: respDue };
  const next = answered ? { kind: 'resp', ...resp } : !acked ? { kind: 'ack', ...ack } : { kind: 'resp', ...resp };

  return {
    received, ackDue, respDue, baseDue: dayToDate(baseDueDay), extended: !!c.extended_until, ack, resp, next,
    // Plazo de respuesta vencido sin responder: no se puede ampliar (lo rechaza también la base de datos)
    canExtend: !c.extended_until && !answered && respDueDay - today >= 0,
    totalDays: respDueDay - recDay,
    elapsed: today - recDay,
    // clave de orden: lo más urgente primero; las respuestas ya dadas, al final
    sortKey: answered ? Number.MAX_SAFE_INTEGER - received.getTime() / DAY : next.due.getTime(),
  };
}
