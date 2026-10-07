import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button.jsx';
import { cx } from './text.jsx';

/**
 * Diálogo propio (nunca confirm() del navegador): confirmaciones y paneles de información.
 * Usa <dialog>: el foco no sale de él y Esc lo cierra. side: panel lateral en el ordenador.
 * En el móvil sube desde abajo. closeLabel: si se da, muestra la X para cerrar. actions: los botones.
 */
export default function Dialog({ open, onClose, title, children, actions, side = false, closeLabel, className }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref} className={cx('ds ds-dialog', side && 'is-side', className)} aria-labelledby={titleId}
      onCancel={e => { e.preventDefault(); onClose(); }}
      onClick={e => { if (e.target === ref.current) onClose(); }}
    >
      {open && (
        <div className="ds-dialog-body ds-on-white">
          <div className="ds-dialog-head">
            <h2 className="ds-dialog-title" id={titleId}>{title}</h2>
            {closeLabel && <IconButton variant="bg" label={closeLabel} onClick={onClose}><X size={18} strokeWidth={2.2} aria-hidden="true" /></IconButton>}
          </div>
          <div className="ds-dialog-text">{children}</div>
          {actions && <div className="ds-dialog-actions">{actions}</div>}
        </div>
      )}
    </dialog>
  );
}
