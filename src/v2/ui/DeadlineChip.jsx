import React from 'react';
import { Chip } from './Chip.jsx';
import { translations } from '../../translations.js';
import { fmt } from '../V2Layout.jsx';

// A partir de cuántos días un plazo se considera cercano (ámbar)
const SOON = { ack: 6, meeting: 6, resp: 14 };
const PREFIX = { ack: 'ack', meeting: 'meet', resp: 'resp' };

/** Color y textos (largo y corto) de un plazo según los días que quedan */
export function deadlineLook(kind, days, { soon = SOON[kind] } = {}) {
  const p = PREFIX[kind];
  if (days < 0) { const k = `${p}Over${days === -1 ? 'One' : 'Many'}`; return { tone: 'danger', k, kShort: k, n: -days }; }
  if (days === 0) return { tone: 'warn', k: `${p}Today`, kShort: `${p}Today`, n: 0 };
  const many = days === 1 ? 'One' : 'Many';
  const k = `${p}${many}`;
  // En el móvil: «6 días para acusar» y «79 días»
  const kShort = kind === 'ack' ? `ackShort${many}` : kind === 'resp' ? (days === 1 ? k : 'respFar') : k;
  return { tone: days <= soon ? 'warn' : 'neutral', k, kShort, n: days };
}

/**
 * Chip de un plazo legal. kind: ack (acuse, 7 días) | meeting (reunión, 7 días) | resp (respuesta, 3 meses).
 * days: días que quedan; negativo si ya ha vencido. En el móvil el texto se acorta solo; short lo acorta siempre.
 * onBg: va sobre una tarjeta gris.
 */
export default function DeadlineChip({ lang, kind = 'resp', days, short = false, soon, onBg = false, size }) {
  const { tone, k, kShort, n } = deadlineLook(kind, days, { soon });
  const same = short || k === kShort;
  // Los chips se ajustan a su texto: no reservan el ancho de los otros idiomas
  const text = (key) => fmt(translations[lang].ds[key], { n });
  return (
    <Chip tone={tone === 'neutral' && onBg ? 'white' : tone} size={size}>
      {same ? text(short ? kShort : k) : <><span className="ds-wide">{text(k)}</span><span className="ds-narrow">{text(kShort)}</span></>}
    </Chip>
  );
}
