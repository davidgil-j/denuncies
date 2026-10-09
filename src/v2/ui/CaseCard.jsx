import React from 'react';
import { Link } from 'react-router-dom';
import { Check, CircleAlert, ArrowRight, Eraser } from 'lucide-react';
import { Chip, Chips } from './Chip.jsx';
import { Button } from './Button.jsx';
import DeadlineChip from './DeadlineChip.jsx';
import { translations } from '../../translations.js';
import { fmt } from '../V2Layout.jsx';
import { cx, Txt } from './text.jsx';

/**
 * Tarjeta de un caso en el tablero.
 *   title, meta («Acoso laboral · Anónima · ayer»), to (la ficha) y linkState (para volver con los filtros).
 *   today: cuenta para «N casos te necesitan hoy». deadline: { kind, days }. meeting, wrote: avisos.
 *   priority: high | critical. overdue: borde rojo. selected: borde azul.
 *   done: onTime | late | erased (datos suprimidos), para las cerradas (sustituye a los chips).
 *   move: { col, onMove }, el botón que la pasa a la columna siguiente sin arrastrar.
 *   onBg: la tarjeta es gris (el tablero en el móvil).
 */
export default function CaseCard({
  lang, title, meta, to, linkState, today = false, deadline, meeting = false, wrote = false, priority, overdue = false,
  selected = false, done, move, onBg = false, short = false, dragging = false, className, children, ...rest
}) {
  const t = translations[lang].ds;
  const moveLabel = move ? fmt(t.moveTo, { col: move.col }) : '';
  const hasChips = today || deadline || meeting || wrote || priority === 'high' || priority === 'critical' || children;
  return (
    <article className={cx('ds-case', onBg && 'is-bg', overdue && 'is-overdue', selected && 'is-selected', dragging && 'is-dragging', move && 'has-move', className)} {...rest}>
      <h3 className="ds-case-title">
        {to ? <Link className="ds-case-link" to={to} state={linkState} draggable={false}>{title}</Link> : title}
      </h3>
      {meta && <p className="ds-case-meta">{meta}</p>}
      {done === 'erased' ? (
        <Chips><Chip icon={<Eraser size={13} strokeWidth={2.4} aria-hidden="true" />}>{t.erased}</Chip></Chips>
      ) : done ? (
        <p className={cx('ds-case-done', done === 'late' && 'is-late')}>
          {done === 'late' ? <CircleAlert size={14} strokeWidth={2.6} aria-hidden="true" /> : <Check size={14} strokeWidth={3} aria-hidden="true" />}
          <Txt lang={lang} k={done === 'late' ? 'late' : 'onTime'} />
        </p>
      ) : null}
      {/* En un caso cerrado, si quien informa vuelve a escribir, se avisa igual */}
      {done && done !== 'erased' && wrote && <Chips><Chip tone="report">{t.wrote}</Chip></Chips>}
      {!done && hasChips && (
        <Chips>
          {today && <Chip tone="ink">{t.today}</Chip>}
          {deadline && <DeadlineChip lang={lang} kind={deadline.kind} days={deadline.days} short={short} onBg={onBg} />}
          {meeting && <Chip tone="report">{t.meeting}</Chip>}
          {wrote && <Chip tone="report">{t.wrote}</Chip>}
          {priority === 'high' && <Chip tone="warn">{t.prioHigh}</Chip>}
          {priority === 'critical' && <Chip tone="danger">{t.prioCritical}</Chip>}
          {children}
        </Chips>
      )}
      {move && (
        <Button
          className="ds-case-move" variant={onBg ? 'white' : 'soft'} size="xs" aria-label={moveLabel} title={moveLabel}
          onClick={move.onMove}
        >
          <ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" />
        </Button>
      )}
    </article>
  );
}
