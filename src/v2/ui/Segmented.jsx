import React, { useRef } from 'react';
import { cx } from './text.jsx';

/**
 * Opciones en píldora. mode:
 *   toggle: botones independientes con uno marcado (el selector de idioma);
 *   radio: grupo de radio de verdad, con las flechas del teclado;
 *   tabs: pestañas (las columnas del tablero en el móvil); cada opción puede llevar `controls`.
 * options: [{ value, label, ariaLabel, lang }]. loose: cada opción es su propia píldora. tone: white | bg.
 */
export default function Segmented({ options, value, onChange, mode = 'toggle', label, loose = false, scroll = false, tone = 'white', className }) {
  const ref = useRef(null);
  const roving = mode !== 'toggle';

  function onKeyDown(e) {
    if (!roving) return;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    const edge = { Home: 0, End: options.length - 1 }[e.key];
    if (step === undefined && edge === undefined) return;
    e.preventDefault();
    const at = Math.max(0, options.findIndex(o => o.value === value));
    const next = edge ?? (at + step + options.length) % options.length;
    onChange(options[next].value);
    ref.current?.querySelectorAll('button')[next]?.focus();
  }

  const role = { toggle: 'group', radio: 'radiogroup', tabs: 'tablist' }[mode];
  const none = roving && !options.some(o => o.value === value);
  return (
    <div ref={ref} role={role} aria-label={label} className={cx('ds-seg', loose && 'is-loose', scroll && 'is-scroll', tone === 'bg' && 'is-bg', className)} onKeyDown={onKeyDown}>
      {options.map((o, i) => {
        const on = o.value === value;
        const state = mode === 'toggle' ? { 'aria-pressed': on }
          : mode === 'radio' ? { role: 'radio', 'aria-checked': on }
          : { role: 'tab', 'aria-selected': on, 'aria-controls': o.controls };
        return (
          <button
            key={o.value} type="button" className="ds-seg-item" lang={o.lang} aria-label={o.ariaLabel}
            tabIndex={roving ? (on || (none && i === 0) ? 0 : -1) : undefined}
            onClick={() => onChange(o.value)} {...state}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
