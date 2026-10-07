import { translations } from '../../translations.js';

// Adreça pública del lloc: la que surt a la vista prèvia en compartir un enllaç (og:image, og:url)
// i al canonical. El mateix valor per defecte es fa servir a vite.config.js per a l'index.html.
export const PUBLIC_ORIGIN = (import.meta.env.VITE_PUBLIC_ORIGIN || 'https://reportia-canal.vercel.app').replace(/\/+$/, '');

/** Adreça absoluta d'un camí del lloc, sense paràmetres */
export const publicUrl = (path = '/') => `${PUBLIC_ORIGIN}${path}`;

function setMeta(selector, content) {
  const el = document.head.querySelector(selector);
  if (el && el.getAttribute('content') !== content) el.setAttribute('content', content);
}

// og:url no és a l'index.html: allà seria la mateixa per a totes les rutes i un canal compartit
// comptaria com la portada. Es crea aquí, amb l'adreça de la pàgina que s'està veient.
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
  const desc = translations[lang].v2site.metaDesc;
  setMeta('meta[name="description"]', desc);
  setMeta('meta[property="og:description"]', desc);
  setMeta('meta[property="og:title"]', document.title);
  setOgUrl(publicUrl(window.location.pathname));
  setMeta('meta[property="og:image"]', publicUrl('/og.png'));
}

/**
 * Manté la descripció i les etiquetes og: al dia amb l'idioma i el títol de cada pàgina.
 * Cada pantalla ja posa el seu títol i el seu <html lang>: aquí només s'escolten aquests dos canvis.
 */
export function watchShareMeta() {
  sync();
  const obs = new MutationObserver(sync);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  const title = document.head.querySelector('title');
  if (title) obs.observe(title, { childList: true, characterData: true, subtree: true });
}
