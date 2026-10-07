import React from 'react';
import { Chip } from './Chip.jsx';
import { Txt } from './text.jsx';

// A partir de cuántos días un plazo se considera cercano (ámbar)
const SOON = { ack: 6, meeting: 6, resp: 14 };
const PREFIX = { ack: 'ack', meeting: 'meet', resp: 'resp' };

/** Color y texto de un plazo según los días que quedan */
export function deadlineLook(kind, days, { short = false, soon = SOON[kind] } = {}) {
  const p = PREFIX[kind];
  if (days < 0) return { tone: 'danger', k: `${p}Over${days === -1 ? 'One' : 'Many'}`, n: -days };
  if (days === 0) return { tone: 'warn', k: `${p}Today`, n: 0 };
  const tone = days <= soon ? 'warn' : 'neutral';
  const many = days === 1 ? 'One' : 'Many';
  if (kind === 'resp' && tone === 'neutral') return { tone, k: 'respFar', n: days };
  return { tone, k: `${p}${kind === 'ack' && short ? 'Short' : ''}${many}`, n: days };
}

/**
 * Chip de un plazo legal. kind: ack (acuse, 7 días) | meeting (reunión, 7 días) | resp (respuesta, 3 meses).
 * days: días que quedan; negativo si ya ha vencido. short: texto corto para el móvil. onBg: va sobre una tarjeta gris.
 */
export default function DeadlineChip({ lang, kind = 'resp', days, short = false, soon, onBg = false, size }) {
  const { tone, k, n } = deadlineLook(kind, days, { short, soon });
  return <Chip tone={tone === 'neutral' && onBg ? 'white' : tone} size={size}><Txt lang={lang} k={k} vars={{ n }} /></Chip>;
}
