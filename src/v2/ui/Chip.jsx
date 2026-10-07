import React from 'react';
import { cx } from './text.jsx';

/** Etiqueta corta. tone: neutral | report | warn | danger | ok | ink | white | shade (sobre azul). size: sm | md | lg. */
export function Chip({ tone = 'neutral', size = 'sm', icon, className, children, ...rest }) {
  return <span className={cx('ds-chip', tone !== 'neutral' && `is-${tone}`, size !== 'sm' && `is-${size}`, className)} {...rest}>{icon}{children}</span>;
}

export function Chips({ size, className, children, ...rest }) {
  return <span className={cx('ds-chips', size === 'lg' && 'is-lg', className)} {...rest}>{children}</span>;
}
