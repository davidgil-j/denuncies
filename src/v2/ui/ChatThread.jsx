import React from 'react';
import { Send } from 'lucide-react';
import { translations } from '../../translations.js';
import { Button, IconButton } from './Button.jsx';
import { cx, Txt } from './text.jsx';

/**
 * Hilo de mensajes. Los de la otra parte, a la izquierda en gris; los propios (mine), a la derecha en azul.
 * messages: [{ id, mine, author, when, text, isNew }]. empty: qué se dice cuando no hay ninguno.
 * onBg: el hilo va sobre el fondo gris (el móvil) y las burbujas ajenas son blancas.
 */
export function ChatThread({ lang, messages, empty, onBg = false, label, className, children }) {
  const t = translations[lang].ds;
  return (
    <div className={cx('ds-chat', onBg && 'is-on-bg', className)} role="log" aria-live="polite" aria-label={label ?? t.chatLabel}>
      {messages.length === 0 && empty && <p className="ds-chat-empty">{empty}</p>}
      {messages.map(m => (
        <div key={m.id} className={cx('ds-chat-msg', m.mine && 'is-mine', m.isNew && 'is-new')}>
          <span className="ds-chat-meta">{m.mine && !m.author ? t.chatYou : m.author}{m.when && <> · {m.when}</>}</span>
          <p className="ds-chat-bubble">{m.text}</p>
        </div>
      ))}
      {children}
    </div>
  );
}

/**
 * Caja para escribir. En línea: texto y botón redondo de enviar. stacked: el texto arriba y, debajo,
 * las acciones (`actions`, a la izquierda) y «Enviar» (sendLabel). Ctrl o ⌘ + Intro también envía.
 */
export function ChatComposer({ lang, value, onChange, onSend, placeholder, busy = false, stacked = false, actions, sendLabel, rows, id = 'ds-compose', maxLength = 10000, className }) {
  const t = translations[lang].ds;
  const can = value.trim().length > 0 && !busy;
  const send = () => { if (can) onSend(value.trim()); };
  const area = (
    <>
      <label className="ds-vh" htmlFor={id}>{placeholder ?? t.chatWrite}</label>
      <textarea
        id={id} className="ds-input" rows={rows ?? (stacked ? 3 : 2)} placeholder={placeholder ?? t.chatWrite} value={value} maxLength={maxLength}
        readOnly={busy} aria-busy={busy || undefined}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } }}
      />
    </>
  );
  if (stacked) {
    return (
      <form className={cx('ds-compose is-stacked', className)} onSubmit={e => { e.preventDefault(); send(); }}>
        {area}
        <div className="ds-compose-row">
          <span className="ds-chips">{actions}</span>
          <Button type="submit" variant="report" size="sm" disabled={!can} busy={busy}>{sendLabel ?? <Txt lang={lang} k="chatSend" />}</Button>
        </div>
      </form>
    );
  }
  return (
    <form className={cx('ds-compose', className)} onSubmit={e => { e.preventDefault(); send(); }}>
      {area}
      <IconButton type="submit" variant="report" size="md" label={t.chatSend} disabled={!can} busy={busy}><Send size={20} strokeWidth={2} aria-hidden="true" /></IconButton>
    </form>
  );
}
