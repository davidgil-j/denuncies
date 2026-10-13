import React from 'react';
import { cx, Txt } from './text.jsx';

/**
 * Progreso por segmentos: «Paso 1 de 3». Con `names` es el estado de un caso, con el nombre de cada paso
 * debajo: tone="line", puntos unidos por una línea (la ficha); tone="ink", segmentos sobre una banda oscura.
 * current: el paso en el que se está (1…total); los anteriores y él mismo se pintan hechos.
 */
export default function StepBar({ lang, total, current, names, tone = 'report', compact = false, label, className }) {
  const n = names?.length ?? total;
  if (names) {
    return (
      <ol className={cx('ds-steps', 'ds-steps-bar', tone !== 'report' && `is-${tone}`, className)} aria-label={label}>
        {names.map((name, i) => (
          <li key={i} className={cx('ds-steps-seg', i < current && 'is-done')} aria-current={i === current - 1 ? 'step' : undefined}>
            <span className="ds-steps-name">{name}</span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div className={cx('ds-steps', tone === 'ink' && 'is-ink', compact && 'is-compact', className)}>
      <div className="ds-steps-bar" aria-hidden="true">
        {Array.from({ length: n }, (_, i) => <span key={i} className={cx('ds-steps-seg', i < current && 'is-done')} />)}
      </div>
      <Txt lang={lang} k="stepOf" vars={{ n: current, total: n }} className="ds-steps-count" />
    </div>
  );
}
