import React, { forwardRef, useId } from 'react';
import { CircleAlert } from 'lucide-react';
import { cx } from './text.jsx';

/**
 * Campo con su etiqueta, su ayuda y su error. as: input | textarea | select (las opciones, como hijos).
 * size: md (54) | sm (44). plain: sin borde, para tarjetas grises. warn: ámbar, con la ayuda como aviso.
 * code: la casilla enorme del código secreto. onReport: el campo va directamente sobre el azul.
 * tag: «opcional», junto a la etiqueta.
 */
const Field = forwardRef(function Field(
  { as: Tag = 'input', label, hideLabel = false, tag, help, error, size = 'md', plain = false, warn = false, code = false, onReport = false, id: idProp, className, children, ...rest }, ref,
) {
  const auto = useId();
  const id = idProp ?? auto;
  const described = [help && `${id}-h`, error && `${id}-e`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx('ds-field', size === 'sm' && 'is-sm', plain && 'is-plain', warn && 'is-warn', code && 'is-code', onReport && 'is-on-report', className)}>
      <label className={hideLabel ? 'ds-vh' : 'ds-field-label'} htmlFor={id}>{label}{tag && <span className="ds-field-tag"> · {tag}</span>}</label>
      <Tag ref={ref} id={id} className="ds-input" aria-invalid={error ? true : undefined} aria-describedby={described} {...rest}>{children}</Tag>
      {help && <p className="ds-field-help" id={`${id}-h`}>{help}</p>}
      {error && <p className="ds-field-error" id={`${id}-e`} role="alert"><CircleAlert size={16} strokeWidth={2.2} aria-hidden="true" />{error}</p>}
    </div>
  );
});

export default Field;
