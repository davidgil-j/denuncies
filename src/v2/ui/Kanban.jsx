import React, { useId, useState } from 'react';
import { translations } from '../../translations.js';
import Segmented from './Segmented.jsx';
import { cx, Txt } from './text.jsx';

/**
 * Tablero de columnas. En el móvil las columnas son pestañas en píldora («Nuevas · 2»).
 *   columns: [{ id, title (lo que se ve), name (texto, para pestañas y avisos), items, total, footer, empty }]
 *   renderCard(item, { column, move, dragging }): devuelve la <CaseCard>; `move` ya trae la columna siguiente.
 *   onMove(item, from, to): al soltar una tarjeta en otra columna o pulsar su botón de mover.
 *   canMove(item, from, to): si ese paso está permitido (por defecto, cualquiera).
 * Arrastrar es un atajo: lo mismo se hace con el botón de cada tarjeta, que funciona con el teclado.
 */
export default function Kanban({ lang, columns, renderCard, onMove, canMove = () => true, getId = item => item.id, className }) {
  const uid = useId();
  const [tab, setTab] = useState(columns[0]?.id);
  const [drag, setDrag] = useState(null); // { id, from }
  const [over, setOver] = useState(null);
  const t = translations[lang].ds;
  const current = columns.some(c => c.id === tab) ? tab : columns[0]?.id;
  const countOf = (c) => c.total ?? c.items.length;

  function drop(e, col) {
    e.preventDefault();
    setOver(null);
    if (!drag || drag.from === col.id) { setDrag(null); return; }
    const from = columns.find(c => c.id === drag.from);
    const item = from?.items.find(i => getId(i) === drag.id);
    setDrag(null);
    if (item && canMove(item, from.id, col.id)) onMove?.(item, from.id, col.id);
  }

  return (
    <div className={cx('ds-kanban-wrap', className)}>
      <Segmented
        className="ds-kanban-tabs" mode="tabs" loose scroll tone="bg" label={t.boardTabs} value={current} onChange={setTab}
        options={columns.map(c => ({ value: c.id, label: `${c.name} · ${countOf(c)}`, controls: `${uid}-${c.id}` }))}
      />
      <div className="ds-kanban">
        {columns.map((col, i) => {
          const next = columns[i + 1];
          return (
            <section
              key={col.id} id={`${uid}-${col.id}`} className={cx('ds-kcol', over === col.id && drag?.from !== col.id && 'is-over')}
              data-off={col.id === current ? undefined : ''} aria-labelledby={`${uid}-${col.id}-t`}
              onDragOver={e => { if (drag) { e.preventDefault(); setOver(col.id); } }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null); }}
              onDrop={e => drop(e, col)}
            >
              <div className="ds-kcol-head">
                <h2 className="ds-kcol-title" id={`${uid}-${col.id}-t`}>{col.title ?? col.name}</h2>
                <span className="ds-kcol-n">{countOf(col)}</span>
              </div>
              {col.items.length === 0 ? (
                <p className="ds-kcol-empty">{col.empty ?? <Txt lang={lang} k="colEmpty" />}</p>
              ) : (
                <ul className="ds-kcol-list">
                  {col.items.map(item => {
                    const id = getId(item);
                    const movable = !!onMove && !!next && canMove(item, col.id, next.id);
                    return (
                      <li
                        key={id} draggable={!!onMove}
                        onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(id)); setDrag({ id, from: col.id }); }}
                        onDragEnd={() => { setDrag(null); setOver(null); }}
                      >
                        {renderCard(item, {
                          column: col,
                          dragging: drag?.id === id,
                          move: movable ? { col: next.name, onMove: () => onMove(item, col.id, next.id) } : undefined,
                        })}
                      </li>
                    );
                  })}
                </ul>
              )}
              {col.footer && <div className="ds-kcol-foot">{col.footer}</div>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
