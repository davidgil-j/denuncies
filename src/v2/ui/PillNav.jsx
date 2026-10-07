import React from 'react';
import { Link } from 'react-router-dom';
import { cx } from './text.jsx';

/**
 * Menú del panel. En el ordenador, píldoras; en el móvil, barra fija abajo con icono y nombre corto.
 * items: [{ to, label, short, icon: Componente, active }]
 */
export default function PillNav({ items, label, className }) {
  return (
    <nav className={cx('ds-nav', className)} aria-label={label}>
      {items.map(({ to, label: text, short, icon: Icon, active }) => (
        <Link key={to} className="ds-nav-item" to={to} aria-current={active ? 'page' : undefined}>
          {Icon && <span className="ds-nav-ico" aria-hidden="true"><Icon size={20} strokeWidth={2} /></span>}
          <span className={short ? 'ds-nav-long' : undefined}>{text}</span>
          {short && <span className="ds-nav-short">{short}</span>}
        </Link>
      ))}
    </nav>
  );
}
