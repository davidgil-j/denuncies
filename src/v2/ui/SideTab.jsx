import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { cx } from './text.jsx';

const ICONS = { forward: ArrowRight, back: ArrowLeft, external: ArrowUpRight };

/**
 * La franja vertical de 76 px del lado que no se ha elegido. side: de qué lado es (report, azul; manage, blanca).
 * icon: forward | back | external. Con `to` navega dentro de la aplicación; con `href`, a otra página.
 * onClick puede cancelar la navegación (e.preventDefault) para pedir confirmación antes de salir.
 */
export default function SideTab({ side, label, icon = 'forward', to, href, ariaLabel, className, ...rest }) {
  const Icon = ICONS[icon] ?? ArrowRight;
  const dot = <span className="ds-tab-dot" aria-hidden="true"><Icon size={16} strokeWidth={2.2} /></span>;
  const text = <span className="ds-tab-label">{label}</span>;
  // En el lado azul (a la izquierda) el círculo va arriba; en el blanco (a la derecha), abajo
  const inner = side === 'report' ? <>{dot}{text}</> : <>{text}{dot}</>;
  const props = { className: cx('ds-tab', `is-${side}`, className), 'aria-label': ariaLabel, ...rest };
  if (to) return <Link to={to} {...props}>{inner}</Link>;
  if (href) return <a href={href} {...props}>{inner}</a>;
  return <button type="button" {...props}>{inner}</button>;
}
