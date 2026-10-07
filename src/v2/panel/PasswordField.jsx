import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Field, IconButton } from '../ui/index.js';

/** Campo de contraseña con el botón de mostrar u ocultar (el botón recibe el foco y anuncia su estado) */
export default function PasswordField({ labels, id, ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div className="ac-pw">
      <Field id={id} type={show ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} {...rest} />
      <IconButton variant="bg" size="xs" className="ac-pw-eye" label={show ? labels.hide : labels.show} aria-pressed={show} aria-controls={id} onClick={() => setShow(s => !s)}>
        {show ? <EyeOff size={18} strokeWidth={2} aria-hidden="true" /> : <Eye size={18} strokeWidth={2} aria-hidden="true" />}
      </IconButton>
    </div>
  );
}
