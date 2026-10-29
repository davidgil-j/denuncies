// Plugin de Vite para la portada estática (src/v2/landing): fase 5 de docs/PLAN_FASES.md.
//  · En desarrollo, sirve la portada al vuelo en «/» (con ?lang= o según el idioma del navegador, como en Vercel).
//  · Al compilar, escribe dist/inicio-es.html, inicio-ca.html e inicio-en.html, el JavaScript y la tipografía con
//    huella en el nombre, robots.txt y sitemap.xml, y renombra la aplicación (index.html) a app.html: en Vercel los
//    archivos tienen prioridad sobre las reescrituras, y así la raíz la deciden las reglas de vercel.json (idioma y
//    dirección propia de cada cliente).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// La letra de la web (portada, alta, privacidad y «no encontrada»): Switzer, de Fontshare, en un solo archivo variable.
// Su licencia (ITF Free Font License) permite alojarla en la web propia pero no publicar el archivo en un repositorio
// público, así que no va en git: se descarga al compilar (o al arrancar `npm run dev`) a src/v2/fonts, que está en
// .gitignore, y la web la sirve con huella en el nombre como cualquier otro archivo. Si no se puede descargar (sin red),
// se usa una copia de Manrope con ese nombre y se avisa: la web sale igual, con la letra del producto
export const SWITZER = 'src/v2/fonts/Switzer-Variable.woff2';
const MANROPE = 'node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2';
const SWITZER_CSS = 'https://api.fontshare.com/v2/css?f[]=switzer@1&display=swap';

/** Deja Switzer en src/v2/fonts (una vez: si ya está, no la vuelve a pedir). Devuelve true si es Switzer de verdad */
export async function ensureSwitzer(root = process.cwd()) {
  const file = path.join(root, SWITZER);
  const marca = `${file}.ok`;
  if (fs.existsSync(file) && fs.existsSync(marca)) return true;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    const css = await (await fetch(SWITZER_CSS)).text();
    const url = /url\('([^']+\.woff2)'\)/.exec(css)?.[1];
    if (!url) throw new Error('no encuentro el archivo en la hoja de Fontshare');
    const res = await fetch(url.startsWith('//') ? `https:${url}` : url);
    if (!res.ok) throw new Error(`Fontshare respondió ${res.status}`);
    const font = Buffer.from(await res.arrayBuffer());
    // Un woff2 empieza por «wOF2»: si llega otra cosa (una página de error), no se guarda
    if (font.subarray(0, 4).toString('latin1') !== 'wOF2') throw new Error('lo descargado no es una tipografía');
    fs.writeFileSync(file, font);
    fs.writeFileSync(marca, '');
    return true;
  } catch (e) {
    console.warn(`AVISO: no se ha podido descargar Switzer (${e.message}). La web usará Manrope hasta la próxima compilación con red.`);
    if (!fs.existsSync(file)) fs.copyFileSync(path.join(root, MANROPE), file);
    return false;
  }
}
const LANGS = ['es', 'ca', 'en'];
/**
 * Los vídeos de la demo (public/landing/video, hechos con scripts/video-demo.mjs), uno por idioma: el del ordenador
 * (4K, 3840×2160) y la versión del móvil (2160×3840, el producto en el móvil), cada uno con su primera imagen como póster.
 * Cada portada lleva solo los de su idioma (generar.js elige con VIDEOS[lang])
 */
const video = (n, l) => ({ src: `/landing/video/${n}-${l}.mp4`, light: `/landing/video/${n}-${l}-movil.mp4`, poster: `/landing/video/${n}-${l}.webp`, posterLight: `/landing/video/${n}-${l}-movil.webp` });
export const VIDEOS = Object.fromEntries(LANGS.map(l => [l, { report: video('denuncia', l), manage: video('gestion', l) }]));

/** El idioma de la portada: el de ?lang= o, si no, el primero del navegador (castellano si no es ninguno de los tres) */
export function landingLang(query, acceptLanguage = '') {
  if (LANGS.includes(query)) return query;
  const first = String(acceptLanguage).trim().toLowerCase();
  if (first.startsWith('ca')) return 'ca';
  if (first.startsWith('en')) return 'en';
  return 'es';
}

// Los textos de un idioma con los de la web (src/translations-site.js), como los ve la web al cargarlos (src/v2/site/texts.js)
const withSite = (translations, siteTexts, lang) => ({ ...translations[lang], v2site: { ...translations[lang].v2site, ...siteTexts[lang].v2site } });

// Quita comentarios y espacios del CSS (va dentro del HTML)
const minifyCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};:,>])\s*/g, '$1').replace(/;}/g, '}').trim();
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 8);

/** origin: la dirección pública (la de VITE_PUBLIC_ORIGIN, como el index.html), para el canonical, og:image y el sitemap */
export default function portada({ origin } = {}) {
  let root = process.cwd();
  return {
    name: 'reportia-portada',
    enforce: 'post',
    configResolved(c) { root = c.root; },
    // Antes de compilar o de servir nada, la letra en su sitio (la piden la portada y el CSS de la web)
    async buildStart() { await ensureSwitzer(root); },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://x');
        if (req.method !== 'GET' || url.pathname !== '/' || !String(req.headers.accept ?? '').includes('text/html')) return next();
        try {
          const lang = landingLang(url.searchParams.get('lang'), req.headers['accept-language']);
          const { translations } = await server.ssrLoadModule('/src/translations.js');
          const { siteTexts } = await server.ssrLoadModule('/src/translations-site.js');
          const P = await server.ssrLoadModule('/src/v2/config/producto.js');
          const { generarPortada } = await server.ssrLoadModule('/src/v2/landing/generar.js');
          const html = generarPortada({
            lang, T: withSite(translations, siteTexts, lang), P,
            assets: { css: fs.readFileSync(path.join(root, 'src/v2/landing/landing.css'), 'utf8'), js: '/src/v2/landing/landing.js', font: `/${SWITZER}`, video: VIDEOS, origin },
          });
          res.setHeader('content-type', 'text/html; charset=utf-8');
          res.setHeader('cache-control', 'no-store');
          res.end(html);
        } catch (e) {
          next(e);
        }
      });
    },
    async generateBundle(_options, bundle) {
      const load = (p) => import(`${pathToFileURL(path.join(root, p)).href}?v=${Date.now()}`);
      const { translations } = await load('src/translations.js');
      const { siteTexts } = await load('src/translations-site.js');
      const P = await load('src/v2/config/producto.js');
      const { generarPortada } = await load('src/v2/landing/generar.js');
      const js = fs.readFileSync(path.join(root, 'src/v2/landing/landing.js'));
      const jsName = `assets/portada-${hash(js)}.js`;
      this.emitFile({ type: 'asset', fileName: jsName, source: js });
      // La tipografía: el mismo archivo que usa la web dentro de la aplicación (quien pasa de la portada al alta no la baja
      // dos veces); si la aplicación no la tuviera, una copia propia
      let fontName = Object.keys(bundle).find(f => /Switzer-Variable-[\w-]+\.woff2$/.test(f));
      if (!fontName) {
        const font = fs.readFileSync(path.join(root, SWITZER));
        fontName = `assets/Switzer-Variable-${hash(font)}.woff2`;
        this.emitFile({ type: 'asset', fileName: fontName, source: font });
      }
      const css = minifyCss(fs.readFileSync(path.join(root, 'src/v2/landing/landing.css'), 'utf8'));
      for (const lang of LANGS) {
        const html = generarPortada({ lang, T: withSite(translations, siteTexts, lang), P, assets: { css, js: `/${jsName}`, font: `/${fontName}`, video: VIDEOS, origin } });
        this.emitFile({ type: 'asset', fileName: `inicio-${lang}.html`, source: html });
      }
      // Buscadores: solo con INDEXAR_WEB (src/v2/config/producto.js). El canal y el panel llevan «noindex» siempre
      const site = (origin || `https://${P.DOMINIO}`).replace(/\/+$/, '');
      const robots = P.INDEXAR_WEB
        ? `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`
        : 'User-agent: *\nDisallow: /\n';
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
      // Solo la portada en sus tres idiomas: el resto de la web, el canal y el panel llevan «noindex» siempre
      const urls = [`${site}/`, `${site}/?lang=ca`, `${site}/?lang=en`];
      this.emitFile({
        type: 'asset', fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u.replace(/&/g, '&amp;')}</loc></url>`).join('\n')}\n</urlset>\n`,
      });
      // La aplicación (index.html) pasa a app.html: la raíz la deciden las reescrituras de vercel.json
      if (bundle['index.html']) bundle['index.html'].fileName = 'app.html';
    },
  };
}
