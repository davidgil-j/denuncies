import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cx } from './text.jsx';

/**
 * Botón en píldora. variant: white | ink | report | soft | bg | tint | shade (sobre azul) | glass (sobre oscuro) | danger.
 * size: xl (64) | lg (58) | md (48) | sm (44) | xs (40). Con `to` es un enlace de la aplicación y con `href`, uno normal.
 */
export const Button = forwardRef(function Button(
  { variant = 'ink', size = 'md', to, href, icon, iconEnd, full = false, busy = false, disabled = false, className, children, ...rest }, ref,
) {
  const cls = cx('ds-btn', `is-${variant}`, `is-${size}`, full && 'is-full', className);
  const inner = <>{icon}{children}{iconEnd}</>;
  if (to || href) {
    const off = disabled ? { 'aria-disabled': true, tabIndex: -1, onClick: e => e.preventDefault() } : {};
    return to
      ? <Link ref={ref} className={cls} to={to} {...rest} {...off}>{inner}</Link>
      : <a ref={ref} className={cls} href={href} {...rest} {...off}>{inner}</a>;
  }
  // Ocupado: un segundo clic no hace nada. No se desactiva, para que el foco no se pierda
  const guard = busy ? { onClick: (e) => e.preventDefault(), 'aria-disabled': true } : {};
  return <button ref={ref} type="button" className={cls} disabled={disabled} aria-busy={busy || undefined} {...rest} {...guard}>{inner}</button>;
});

/** Botón redondo que solo lleva un icono: el nombre (`label`) es obligatorio para quien no lo ve. */
export const IconButton = forwardRef(function IconButton({ label, size = 'sm', className, children, ...rest }, ref) {
  return <Button ref={ref} size={size} className={cx('is-icon', className)} aria-label={label} title={label} {...rest}>{children}</Button>;
});
