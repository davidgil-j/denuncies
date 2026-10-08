import React from 'react';
import { cx } from './text.jsx';

/**
 * Las dos mitades. active: null (la entrada, las dos tarjetas iguales) | 'report' | 'manage'.
 * El lado elegido ocupa la pantalla y el otro se pliega en su franja (reportTab o manageTab, un <SideTab>).
 * Los dos lados son siempre los mismos elementos: así la anchura se anima al pasar de la entrada a un lado.
 * top y bottom: cabecera y pie de la entrada, fuera de las tarjetas. banner: aviso a todo el ancho, encima
 * de todo. skip: texto del enlace «Ir al contenido» para quien navega con el teclado.
 */
export default function SplitShell({ active = null, report, manage, reportTab, manageTab, reportLabel, manageLabel, top, bottom, banner, skip, className }) {
  const entry = !active;
  const pane = (side, content, tab, label) => {
    const folded = !entry && active !== side;
    return (
      <div
        className={cx('ds-pane', `is-${side}`, side === 'report' ? 'ds-on-report' : 'ds-on-white', folded && 'is-tab')}
        role={folded ? undefined : entry ? 'region' : 'main'}
        aria-label={entry ? label : undefined}
        id={!entry && !folded ? 'ds-main' : undefined}
        tabIndex={!entry && !folded ? -1 : undefined}
      >
        {folded ? tab : <div className="ds-pane-body">{content}</div>}
      </div>
    );
  };
  return (
    <div className={cx('ds ds-split', entry && 'is-entry', top && 'has-top', banner && 'has-banner', className)}>
      {skip && <a className="ds-skip" href="#ds-main">{skip}</a>}
      {banner && <div className="ds-split-banner">{banner}</div>}
      {top && <header className="ds-split-top">{top}</header>}
      <div className="ds-split-panes" role={entry ? 'main' : undefined} id={entry ? 'ds-main' : undefined} tabIndex={entry ? -1 : undefined}>
        {pane('report', report, reportTab, reportLabel)}
        {pane('manage', manage, manageTab, manageLabel)}
      </div>
      {bottom && <footer className="ds-split-bottom">{bottom}</footer>}
    </div>
  );
}
