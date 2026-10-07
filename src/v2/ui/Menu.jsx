import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cx } from './text.jsx';

/**
 * Menú desplegable (el «···» y el del avatar). trigger recibe las propiedades del botón que lo abre:
 *   <Menu label="Más acciones" trigger={p => <IconButton label="Más acciones" {...p}>…</IconButton>}>
 * Se cierra con Esc, al pulsar fuera y al elegir una opción (<MenuItem>).
 */
export default function Menu({ label, trigger, align = 'end', children, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('[aria-expanded]')?.focus(); } };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key); };
  }, [open]);
  return (
    <div className={cx('ds-menu', className)} ref={ref}>
      {trigger({ 'aria-expanded': open, 'aria-haspopup': 'true', onClick: () => setOpen(o => !o) })}
      {open && (
        <div className={cx('ds-menu-panel ds-on-white', align === 'start' && 'is-start')} role="group" aria-label={label} onClick={e => { if (e.target.closest('[data-close]')) setOpen(false); }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, danger = false, to, href, className, children, ...rest }) {
  const props = { className: cx('ds-menu-item', danger && 'is-danger', className), 'data-close': '', ...rest };
  const inner = <>{icon}<span>{children}</span></>;
  if (to) return <Link to={to} {...props}>{inner}</Link>;
  if (href) return <a href={href} {...props}>{inner}</a>;
  return <button type="button" {...props}>{inner}</button>;
}
