// Imagen de la vista previa al compartir el enlace (public/og.jpg, 1200 × 630, menos de 300 KB): WhatsApp, LinkedIn, correo.
// En castellano y con el diseño de la portada: azul noche, el logotipo de Reportia en verde con el nombre del
// producto (src/v2/config/producto.js), la franja de la Autoridad y el titular, todo en la letra de la web (Switzer, que
// se descarga al compilar: scripts/vite-portada.mjs).
// Uso: PLAYWRIGHT=/ruta/a/playwright/index.mjs node scripts/og-image.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const root = new URL('..', import.meta.url);
const b64 = (p) => readFileSync(fileURLToPath(new URL(p, root))).toString('base64');
const { ensureSwitzer, SWITZER } = await import(new URL('scripts/vite-portada.mjs', root));
await ensureSwitzer(fileURLToPath(root));
const sans = b64(SWITZER);
const logo = b64('public/marca/reportia-logo.svg');
const { NOMBRE_PRODUCTO, EMPRESA } = await import(new URL('src/v2/config/producto.js', root));
const { siteTexts } = await import(new URL('src/translations-site.js', root));
const T = siteTexts.es.v2site.portada;
const suffix = NOMBRE_PRODUCTO.startsWith(EMPRESA) ? NOMBRE_PRODUCTO.slice(EMPRESA.length).trim() : '';

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: M; src: url(data:font/woff2;base64,${sans}) format('woff2'); font-weight: 100 900; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; font-family: M, sans-serif; color: #fff; background: #0B1230; overflow: hidden; }
header { display: flex; align-items: center; gap: 18px; height: 112px; padding: 0 72px; }
header img { height: 40px; width: auto; display: block; }
header span { padding-left: 18px; border-left: 2px solid rgba(255,255,255,.4); font-size: 30px; font-weight: 500; line-height: 38px; color: #fff; }
.alert { display: flex; align-items: center; gap: 14px; padding: 16px 72px; background: #FEF3F2; box-shadow: inset 0 -2px 0 #FAD4D0; color: #B42318; font-size: 20px; font-weight: 500; }
main { padding: 64px 72px 0; }
h1 { max-width: 16em; font-size: 68px; line-height: 1.04; font-weight: 600; letter-spacing: -.03em; }
</style></head><body>
<header><img src="data:image/svg+xml;base64,${logo}" alt="${EMPRESA}">${suffix ? `<span>${suffix}</span>` : ''}</header>
<div class="alert">${T.alert}</div>
<main><h1>${T.title}</h1></main>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
writeFileSync(fileURLToPath(new URL('public/og.jpg', root)), await page.screenshot({ type: 'jpeg', quality: 86 }));
await browser.close();
console.log('public/og.jpg');
