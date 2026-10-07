import React, { useRef } from 'react';
import { fmt } from '../V2Layout.jsx';

/**
 * Código de 6 cifras, una por casilla. Pegar el código entero rellena todas, y al completar la
 * última se avisa con onComplete (para enviar sin pulsar nada). label: nombre del grupo;
 * digitLabel: «Cifra {n}», el nombre de cada casilla para quien no las ve.
 */
export default function OtpInput({ value, onChange, onComplete, length = 6, label, digitLabel, invalid = false, describedBy, autoFocus = false }) {
  const ref = useRef(null);
  const boxes = () => [...(ref.current?.querySelectorAll('input') ?? [])];
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  function set(next, focusAt) {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    const at = Math.min(focusAt ?? clean.length, length - 1);
    requestAnimationFrame(() => boxes()[at]?.focus());
    if (clean.length === length) onComplete?.(clean);
  }

  function onKeyDown(e, i) {
    if (e.key === 'Backspace') { e.preventDefault(); const cut = digits[i] ? i : Math.max(0, i - 1); set(value.slice(0, cut), cut); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); boxes()[Math.max(0, i - 1)]?.focus(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); boxes()[Math.min(length - 1, i + 1)]?.focus(); }
  }

  return (
    <div className="ds-otp" role="group" aria-label={label} ref={ref} aria-describedby={describedBy}>
      {digits.map((d, i) => (
        <input
          key={i} className="ds-otp-box" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={length} value={d}
          autoComplete={i === 0 ? 'one-time-code' : 'off'} autoFocus={autoFocus && i === 0}
          aria-label={fmt(digitLabel ?? '{n}', { n: i + 1 })} aria-invalid={invalid || undefined}
          onFocus={e => e.target.select()}
          onKeyDown={e => onKeyDown(e, i)}
          onPaste={e => { e.preventDefault(); set(e.clipboardData.getData('text')); }}
          // Una cifra tecleada va a su casilla; varias de golpe (autorrelleno del sistema) rellenan desde aquí
          onChange={e => { const typed = e.target.value.replace(/\D/g, ''); if (typed) set(value.slice(0, i) + typed); }}
        />
      ))}
    </div>
  );
}
