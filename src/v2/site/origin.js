import { translations } from '../../translations.js';

// Dirección pública del sitio: la que sale en la vista previa al compartir un enlace (og:image, og:url)
// y en el canonical. El mismo valor por defecto se usa en vite.config.js para el index.html.
export const PUBLIC_ORIGIN = (import.meta.env.VITE_PUBLIC_ORIGIN || 'https://reportia-canal.vercel.app').replace(/\/+$/, '');

/** Dirección absoluta de una ruta del sitio, sin parámetros */
export const publicUrl = (path = '/') => `${PUBLIC_ORIGIN}${path}`;

function setMeta(selector, content) {
  const el = document.head.querySelector(selector);
  if (el && el.getAttribute('content') !== content) el.setAttribute('content', content);
}

// og:url no está en el index.html: allí sería la misma para todas las rutas y un canal compartido
// contaría como la portada. Se crea aquí, con la dirección de la página que se está viendo.
function setOgUrl(content) {
  let el = document.head.querySelector('meta[property="og:url"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', 'og:url');
    document.head.querySelector('meta[property="og:image"]')?.before(el);
    if (!el.isConnected) document.head.append(el);
  }
  if (el.getAttribute('content') !== content) el.setAttribute('content', content);
}

function sync() {
  const lang = translations[document.documentElement.lang] ? document.documentElement.lang : 'ca';
  // El canal de cada empresa es marca blanca (canal.html): su propia descripción y ninguna imagen de Reportia
  const canal = window.location.pathname.startsWith('/canal/');
  const desc = canal ? translations[lang].canal.metaDesc : translations[lang].v2site.metaDesc;
  setMeta('meta[name="description"]', desc);
  setMeta('meta[property="og:description"]', desc);
  setMeta('meta[property="og:title"]', document.title);
  setOgUrl(publicUrl(window.location.pathname));
  if (!canal) setMeta('meta[property="og:image"]', publicUrl('/og.jpg'));
}

/**
 * Mantiene la descripción y las etiquetas og: al día con el idioma y el título de cada página.
 * Cada pantalla ya pone su título y su <html lang>: aquí solo se escuchan esos dos cambios.
 */
export function watchShareMeta() {
  sync();
  const obs = new MutationObserver(sync);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  const title = document.head.querySelector('title');
  if (title) obs.observe(title, { childList: true, characterData: true, subtree: true });
}
