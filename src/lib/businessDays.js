// Días hábiles para los plazos de la Ley 2/2023 que se cuentan así (art. 8.3: comunicar el
// Responsable del Sistema en 10 días hábiles). Se saltan sábados y domingos; los festivos NO se
// descuentan (dependen del municipio), y la pantalla lo avisa.

const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

/** Fecha de calendario a mediodía (un cambio de hora no la mueve). Acepta Date o 'AAAA-MM-DD'. */
export function calendarDay(value) {
  const d = value instanceof Date ? new Date(value) : new Date(`${String(value).slice(0, 10)}T12:00:00`);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** 'AAAA-MM-DD' de una fecha, en la hora local */
export function isoDay(value) {
  const d = calendarDay(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** La fecha que resulta de sumar (o restar, con n negativo) n días hábiles. El día de partida no cuenta. */
export function addBusinessDays(from, n) {
  const d = calendarDay(from);
  const step = n < 0 ? -1 : 1;
  for (let left = Math.abs(n); left > 0;) {
    d.setDate(d.getDate() + step);
    if (!isWeekend(d)) left -= 1;
  }
  return d;
}

/** Días hábiles que quedan desde `from` (sin contarlo) hasta `to` (contándolo). 0 si `to` no es posterior. */
export function businessDaysLeft(from, to) {
  const d = calendarDay(from);
  const end = calendarDay(to);
  let n = 0;
  while (d < end) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) n += 1;
  }
  return n;
}
