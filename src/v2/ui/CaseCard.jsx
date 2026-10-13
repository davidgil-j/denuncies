import React from 'react';
import { Link } from 'react-router-dom';
import { Check, CircleAlert, ArrowRight, Eraser, Flag } from 'lucide-react';
import { Chip } from './Chip.jsx';
import { Button } from './Button.jsx';
import DeadlineChip, { deadlineLook } from './DeadlineChip.jsx';
import { translations } from '../../translations.js';
import { fmt } from '../V2Layout.jsx';
import { cx, Txt } from './text.jsx';

/**
 * Tarjeta de un caso en el tablero.
 *   title (referencia y tema, o el título que le puso el equipo), meta («Anónima · hace 9 días»), to (la ficha) y
 *   linkState (para volver con los filtros). deadline: { kind, days }. meeting, wrote: avisos.
 *   priority: high (gris, con su icono) | critical (la única en rojo). overdue: algo vencido.
 *   La barra de la izquierda sale sola: roja si hay un plazo vencido, ámbar si vence pronto.
 *   done: onTime | late | erased (datos suprimidos), para las cerradas (sustituye a las etiquetas).
 *   move: { col, onMove }, el botón que la pasa a la columna siguiente sin arrastrar.
 */
export default function CaseCard({
  lang, title, meta, to, linkState, deadline, meeting = false, wrote = false, priority, overdue = false,
  selected = false, done, move, short = false, dragging = false, className, children,
  today, onBg, ...rest // ya no se pintan: se aceptan para no romper a quien los pase
}) {
  const t = translations[lang].ds;
  const moveLabel = move ? (move.label || fmt(t.moveTo, { col: move.col })) : '';
  const tone = !done && deadline ? deadlineLook(deadline.kind, deadline.days).tone : 'neutral';
  const bar = done ? null : overdue || tone === 'danger' ? 'overdue' : tone === 'warn' ? 'soon' : null;
  const hasMarks = deadline || meeting || wrote || priority === 'high' || priority === 'critical' || children;
  const flag = <Flag size={13} strokeWidth={2} aria-hidden="true" />;
  return (
    <article className={cx('ds-case', bar && `is-${bar}`, selected && 'is-selected', dragging && 'is-dragging', move && 'has-move', className)} {...rest}>
      <h3 className="ds-case-title">
        {to ? <Link className="ds-case-link" to={to} state={linkState} draggable={false}>{title}</Link> : title}
      </h3>
      {meta && <p className="ds-case-meta">{meta}</p>}
      {done === 'erased' ? (
        <p className="ds-case-marks"><span className="ds-case-plain"><Eraser size={13} strokeWidth={2} aria-hidden="true" />{t.erased}</span></p>
      ) : done ? (
        <p className="ds-case-marks">
          <span className={cx('ds-case-plain', done === 'late' && 'is-late')}>
            {done === 'late' ? <CircleAlert size={13} strokeWidth={2} aria-hidden="true" /> : <Check size={13} strokeWidth={2.4} aria-hidden="true" />}
            <Txt lang={lang} k={done === 'late' ? 'late' : 'onTime'} />
          </span>
          {/* En un caso cerrado, si quien informa vuelve a escribir, se avisa igual */}
          {wrote && <span className="ds-case-new">{t.wrote}</span>}
        </p>
      ) : hasMarks ? (
        <p className="ds-case-marks">
          {deadline && <DeadlineChip lang={lang} kind={deadline.kind} days={deadline.days} short={short} />}
          {meeting && <Chip tone="report">{t.meeting}</Chip>}
          {priority === 'high' && <span className="ds-case-plain">{flag}{t.prioHigh}</span>}
          {priority === 'critical' && <Chip tone="danger" icon={flag}>{t.prioCritical}</Chip>}
          {wrote && <span className="ds-case-new">{t.wrote}</span>}
          {children}
        </p>
      ) : null}
      {move && (
        <Button className="ds-case-move" variant="soft" size="xs" aria-label={moveLabel} title={moveLabel} onClick={move.onMove}>
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </Button>
      )}
    </article>
  );
}
