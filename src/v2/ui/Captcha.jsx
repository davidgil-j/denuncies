import React, { useCallback, useEffect, useRef, useState } from 'react';
import { translations } from '../../translations.js';
import './captcha.css';

/**
 * Comprobación contra robots (Cloudflare Turnstile) del acceso de gestores, del alta y de «He olvidado la contraseña»
 * (docs/PLAN_FASES.md n.º 71). NUNCA en el canal: denunciar no puede depender de que cargue un servicio de terceros.
 *
 * Sin VITE_TURNSTILE_SITE_KEY (o en la demo) no se pinta nada y los formularios funcionan como siempre. Con la clave,
 * el token viaja a Supabase Auth y sin él no se deja pasar (con la protección encendida, Supabase lo rechazaría igual):
 * si el script no carga, se dice con claridad y se puede reintentar.
 */
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const TIMEOUT = 12000;

/** true si hay que pedir la comprobación (hay clave y no es la demo) */
export const captchaRequired = (demo) => !!SITE_KEY && !demo;

let loading = null;
/** Carga el script de Turnstile una vez. Con force, lo vuelve a pedir desde cero (después de un fallo) */
function loadTurnstile(force = false) {
  if (!force && window.turnstile) return Promise.resolve(window.turnstile);
  if (!force && loading) return loading;
  document.querySelectorAll('script[data-turnstile]').forEach(s => s.remove());
  if (force) {
    try { delete window.turnstile; } catch { window.turnstile = undefined; }
  }
  loading = new Promise((resolve, reject) => {
    const cb = `reportiaTurnstile${Date.now()}`;
    const done = (fn) => { clearTimeout(timer); delete window[cb]; fn(); };
    const timer = setTimeout(() => done(() => reject(new Error('turnstile-timeout'))), TIMEOUT);
    window[cb] = () => done(() => resolve(window.turnstile));
    const s = document.createElement('script');
    s.src = `${SCRIPT}?render=explicit&onload=${cb}`;
    s.async = true;
    s.defer = true;
    s.dataset.turnstile = '1';
    s.onerror = () => done(() => reject(new Error('turnstile-load')));
    document.head.appendChild(s);
  }).catch((e) => { loading = null; throw e; });
  return loading;
}

/**
 * onToken(token | null): el token cuando está listo; null si caduca o falla. resetKey: al cambiar, se pide uno nuevo
 * (después de un intento fallido el token ya no vale). className: para colocarlo en cada formulario.
 */
export default function Captcha({ lang, demo = false, onToken, resetKey, className }) {
  const box = useRef(null);
  const widget = useRef(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [attempt, setAttempt] = useState(0);
  const required = captchaRequired(demo);
  const t = translations[lang]?.v2 ?? translations.es.v2;
  const tokenRef = useRef(onToken);
  tokenRef.current = onToken;

  useEffect(() => {
    if (!required) return undefined;
    let alive = true;
    setState('loading');
    tokenRef.current?.(null);
    loadTurnstile(attempt > 0).then((ts) => {
      if (!alive || !box.current) return;
      const narrow = window.matchMedia?.('(max-width: 420px)').matches;
      widget.current = ts.render(box.current, {
        sitekey: SITE_KEY, language: lang, theme: 'auto', size: narrow ? 'compact' : 'normal',
        callback: (token) => { if (alive) { setState('ready'); tokenRef.current?.(token); } },
        'expired-callback': () => tokenRef.current?.(null),
        'error-callback': () => { if (alive) { setState('error'); tokenRef.current?.(null); } },
        'timeout-callback': () => tokenRef.current?.(null),
      });
      setState('ready');
    }).catch(() => { if (alive) setState('error'); });
    return () => {
      alive = false;
      if (widget.current != null) { try { window.turnstile?.remove(widget.current); } catch { /* ya no está */ } }
      widget.current = null;
    };
  }, [required, attempt, lang]);

  // Después de un intento fallido, un token nuevo
  useEffect(() => {
    if (!required || resetKey === undefined || widget.current == null) return;
    tokenRef.current?.(null);
    try { window.turnstile?.reset(widget.current); } catch { /* se volverá a pedir al reintentar */ }
  }, [resetKey, required]);

  const retry = useCallback(() => setAttempt(n => n + 1), []);
  if (!required) return null;
  return (
    <div className={['ds-captcha', className].filter(Boolean).join(' ')} aria-label={t.verifying}>
      <div ref={box} className="ds-captcha-box" hidden={state === 'error'} />
      {state === 'error' && (
        <div className="ds-captcha-err" role="alert">
          <p>{t.captchaErr}</p>
          <button type="button" className="ds-captcha-retry" onClick={retry}>{t.captchaRetry}</button>
        </div>
      )}
    </div>
  );
}
