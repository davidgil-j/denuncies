import React from 'react';
import { initials } from '../V2Layout.jsx';
import { cx } from './text.jsx';

const CONTEXT = { ink: 'ds-on-ink', report: 'ds-on-report', shade: 'ds-on-report', dashed: 'ds-on-report' };

/**
 * Tarjeta. tone: white | bg | ink | report | outline | shade y dashed (las dos, sobre el azul).
 * radius: xl (32) | lg (24) | md (20). picked: la única sombra permitida, la de la tarjeta elegida.
 */
export function Card({ as: Tag = 'div', tone = 'white', radius = 'lg', picked = false, className, children, ...rest }) {
  return (
    <Tag className={cx('ds-card', tone !== 'white' && `is-${tone}`, radius !== 'lg' && `r-${radius}`, picked && 'is-picked', CONTEXT[tone] ?? 'ds-on-white', className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Marca de la empresa: sus iniciales en un cuadrado */
export function OrgMark({ name, className }) {
  return <span className={cx('ds-mark', className)} aria-hidden="true">{initials(name)}</span>;
}

/** Avatar de una persona: sus iniciales. tint: 0 a 3, para distinguir a varias en una lista */
export function Avatar({ name, tint = 0, size, className }) {
  return <span className={cx('ds-avatar', tint > 0 && `t-${tint}`, size === 'sm' && 'is-sm', className)} aria-hidden="true">{initials(name)}</span>;
}

export function Skeleton({ width = '100%', height, className }) {
  return <span className={cx('ds-skel', className)} style={{ width, height }} aria-hidden="true" />;
}
