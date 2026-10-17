import React, { useEffect, useRef } from 'react';
import { cx } from './text.jsx';

/**
 * Las dos mitades. active: null (la entrada, dos mitades iguales de borde a borde) | 'report' | 'manage'.
 * Al elegir un lado, el otro desaparece y el elegido cubre la página.
 * top y bottom: cabecera y pie, fuera de las mitades. reportFoot y manageFoot: la última línea de cada mitad
 * en la entrada. banner: aviso a todo el ancho, encima de todo. skip: texto del enlace «Ir al contenido»
 * para quien navega con el teclado.
 * mainId: el lado elegido pone él mismo su <main> con ese id (el panel: la cabecera y el menú quedan fuera,
 * y «Ir al contenido» se los salta).
 */
export default function SplitShell({ active = null, report, manage, reportLabel, manageLabel, reportFoot, manageFoot, top, bottom, banner, skip, mainId, className }) {
  const entry = !active;
  // El aviso de arriba puede ocupar más de una línea (zoom, textos largos): su alto real se guarda en
  // --banner-h para que lo que va fijo o a pantalla completa lo descuente
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
  const pane = (side, content, label, foot) => {
    if (!entry && active !== side) return null;
    if (entry) {
      // Denunciar solo va sobre el color en la entrada: al elegirlo, el formulario va sobre blanco
      return (
        <div className={cx('ds-pane', `is-${side}`, side === 'report' ? 'ds-on-report' : 'ds-on-white')}>
          <div className="ds-pane-body" role="region" aria-label={label}>{content}</div>
          {foot && <div className="ds-pane-foot">{foot}</div>}
        </div>
      );
    }
    return (
      <div className={cx('ds-pane', `is-${side}`, 'ds-on-white')} role={mainId ? undefined : 'main'} id={mainId ? undefined : 'ds-main'} tabIndex={mainId ? undefined : -1}>
        <div className="ds-pane-body">{content}</div>
      </div>
    );
  };
  return (
    <div ref={rootRef} className={cx('ds ds-split', entry ? 'is-entry' : `is-${active}`, top && 'has-top', banner && 'has-banner', className)}>
      {skip && <a className="ds-skip" href={`#${mainId ?? 'ds-main'}`}>{skip}</a>}
      {banner && <div ref={bannerRef} className="ds-split-banner">{banner}</div>}
      {top && <header className="ds-split-top">{top}</header>}
      <div className="ds-split-panes" role={entry ? 'main' : undefined} id={entry ? 'ds-main' : undefined} tabIndex={entry ? -1 : undefined}>
        {pane('report', report, reportLabel, reportFoot)}
        {pane('manage', manage, manageLabel, manageFoot)}
      </div>
      {bottom && <footer className="ds-split-bottom">{bottom}</footer>}
    </div>
  );
}
