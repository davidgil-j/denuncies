// Dirección propia del canal de una empresa (canal.acme.es; migración 017). En una dirección así solo vive su canal:
// la raíz lleva a él, y el panel y la web de Reportia se abren en la dirección principal.
import { PUBLIC_ORIGIN } from '../site/origin.js';

const MAIN_HOST = (() => { try { return new URL(PUBLIC_ORIGIN).hostname; } catch { return ''; } })();

/** true si la página se ve en una dirección de Reportia (la principal, las de Vercel, reportia.es o el ordenador) */
export function isOwnHost(host = window.location.hostname) {
  const h = String(host).toLowerCase();
  return !h || h === MAIN_HOST || h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost')
    || h.endsWith('.vercel.app') || h === 'reportia.es' || h.endsWith('.reportia.es');
}

/** La misma ruta en la dirección principal (para salir de la dirección propia de una empresa) */
export const onMainSite = (path) => `${PUBLIC_ORIGIN}${path}`;

/** Una ruta que sale del canal: tal cual en la dirección principal; en la dirección propia de una empresa, a la principal */
export const leaveCanal = (path) => (isOwnHost() ? path : onMainSite(path));
