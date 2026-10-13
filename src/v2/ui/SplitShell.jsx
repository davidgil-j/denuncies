import React, { useEffect, useRef } from 'react';
import { cx } from './text.jsx';

/**
 * Las dos mitades. active: null (la entrada, las dos tarjetas iguales) | 'report' | 'manage'.
 * El lado elegido ocupa la pantalla y el otro se pliega en su franja (reportTab o manageTab, un <SideTab>).
 * Los dos lados son siempre los mismos elementos: así la anchura se anima al pasar de la entrada a un lado.
 * top y bottom: cabecera y pie de la entrada, fuera de las tarjetas. banner: aviso a todo el ancho, encima
 * de todo. skip: texto del enlace «Ir al contenido» para quien navega con el teclado.
 * mainId: el lado elegido pone él mismo su <main> con ese id (el panel: la cabecera y el menú quedan fuera,
 * y «Ir al contenido» se los salta).
 */
export default function SplitShell({ active = null, report, manage, reportTab, manageTab, reportLabel, manageLabel, top, bottom, banner, skip, mainId, className }) {
  const entry = !active;
  // El aviso de arriba puede ocupar más de una línea (zoom, textos largos): su alto real se guarda en
  // --banner-h para que las franjas fijas empiecen justo debajo
  const rootRef = useRef(null);
  const bannerRef = useRef(null);
  useEffect(() => {
    const el = bannerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const set = () => rootRef.current?.style.setProperty('--banner-h', `${Math.ceil(el.getBoundingClientRect().height)}px`);
    const ro = new ResizeObserver(set);
    ro.observe(el);
    set();
    return () => ro.disconnect();
  }, [!!banner]);
  const pane = (side, content, tab, label) => {
    const folded = !entry && active !== side;
    return (
      <div
        className={cx('ds-pane', `is-${side}`, side === 'report' ? 'ds-on-report' : 'ds-on-white', folded && 'is-tab')}
        role={folded || mainId ? undefined : entry ? 'region' : 'main'}
        aria-label={entry ? label : undefined}
        id={!entry && !folded && !mainId ? 'ds-main' : undefined}
        tabIndex={!entry && !folded && !mainId ? -1 : undefined}
      >
        {folded ? tab : <div className="ds-pane-body">{content}</div>}
      </div>
    );
  };
  return (
    <div ref={rootRef} className={cx('ds ds-split', entry && 'is-entry', top && 'has-top', banner && 'has-banner', className)}>
      {skip && <a className="ds-skip" href={`#${mainId ?? 'ds-main'}`}>{skip}</a>}
      {banner && <div ref={bannerRef} className="ds-split-banner">{banner}</div>}
      {top && <header className="ds-split-top">{top}</header>}
      <div className="ds-split-panes" role={entry ? 'main' : undefined} id={entry ? 'ds-main' : undefined} tabIndex={entry ? -1 : undefined}>
        {pane('report', report, reportTab, reportLabel)}
        {pane('manage', manage, manageTab, manageLabel)}
      </div>
      {bottom && <footer className="ds-split-bottom">{bottom}</footer>}
    </div>
  );
}
