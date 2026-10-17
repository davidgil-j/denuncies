import React from 'react';
import { cx } from './text.jsx';

/**
 * El logo de la empresa («Tu marca»), si lo tiene. Sin logo no pinta nada: entonces solo se ve el nombre.
 * El texto alternativo va vacío porque el nombre de la empresa sale siempre al lado, escrito.
 */
export default function BrandLogo({ org, className }) {
  if (!org?.brand_logo) return null;
  return <span className={cx('ds-brand-logo', className)}><img src={org.brand_logo} alt="" decoding="async" /></span>;
}
