import React from 'react';
import { EMPRESA, LOGO_SOBRE_BLANCO } from '../config/producto.js';
import { cx } from './text.jsx';

/**
 * La marca oficial de Reportia donde firma Reportia (n.º 37 y 83): el acceso sin empresa, «Contraseña nueva» y el pie
 * del panel. Sobre blanco, el icono oficial y el nombre en tinta (el logotipo verde sobre blanco no llega al contraste
 * mínimo); con LOGO_SOBRE_BLANCO = 'logotipo', el logotipo. Nunca en el canal de un cliente (marca blanca).
 * size: alto del icono en px. withName: false deja solo el icono (el nombre ya está escrito al lado).
 */
export default function ReportiaMark({ size = 28, withName = true, className }) {
  if (LOGO_SOBRE_BLANCO === 'logotipo') {
    return <span className={cx('ds-rmark', className)}><img src="/marca/reportia-logo.svg" height={size * 0.75} width={size * 3.6} alt={EMPRESA} /></span>;
  }
  return (
    <span className={cx('ds-rmark', className)}>
      <img src="/marca/reportia-icono-64.png" width={size} height={size} alt={withName ? '' : EMPRESA} />
      {withName && <b>{EMPRESA}</b>}
    </span>
  );
}
