import React, { useState } from 'react';
import { Eye, EyeOff, CircleAlert } from 'lucide-react';
import { ICON } from '../V2Layout.jsx';

// Correo: sin espacios ni caracteres de lista o de etiqueta, dominio con partes no vacías y extensión de 2 letras o más
export const EMAIL_RE = /^[^\s@,;:<>()[\]\\"]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

export function FieldError({ id, children }) {
  if (!children) return null;
  return <p className="v2-err" id={id}><CircleAlert {...ICON} />{children}</p>;
}

/** Campo de contraseña con botón de mostrar u ocultar (el botón recibe el foco y anuncia su estado). */
export function PwInput({ id, value, onChange, autoComplete, invalid, describedBy, labels, inputRef }) {
  const [show, setShow] = useState(false);
  return (
    <div className="v2-pw">
      <input
        ref={inputRef}
        id={id}
        className="v2-input"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        className="v2-pw-toggle"
        aria-label={show ? labels.hide : labels.show}
        aria-pressed={show}
        aria-controls={id}
        onClick={() => setShow(v => !v)}
      >
        {show ? <EyeOff {...ICON} /> : <Eye {...ICON} />}
      </button>
    </div>
  );
}

/**
 * Traduce los errores de Supabase Auth a una clave de los textos (v2site.signup y panel).
 * Nunca se muestra el mensaje original (en inglés) a la persona usuaria.
 */
export function authErrorKey(err) {
  const msg = (err?.message || '').toLowerCase();
  const code = (err?.code || '').toLowerCase();
  // Supabase Auth con la protección contra robots encendida (n.º 71): sin token, o caducado
  if (msg.includes('captcha') || code.includes('captcha')) return 'errCaptcha';
  if (msg.includes('already registered') || msg.includes('user already exists') || code === 'user_already_exists') return 'errInUse';
  if (msg.includes('email not confirmed') || code === 'email_not_confirmed') return 'errUnconfirmed';
  if (msg.includes('invalid login credentials') || code === 'invalid_credentials') return 'errCredentials';
  if (code === 'weak_password' || msg.includes('password should') || msg.includes('weak')) return 'errWeak';
  if (code === 'same_password' || msg.includes('different from the old')) return 'errSame';
  if (err?.status === 429 || msg.includes('rate limit') || msg.includes('security purposes') || code.includes('rate_limit')) return 'errRate';
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed')) return 'errNetwork';
  if (msg.includes('invalid') && msg.includes('email')) return 'errEmail';
  return 'errGeneric';
}
