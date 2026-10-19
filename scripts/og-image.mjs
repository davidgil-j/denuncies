// Imagen de la vista previa al compartir el enlace (public/og.jpg, 1200 × 630, menos de 300 KB): WhatsApp, LinkedIn, correo.
// En castellano, con la tipografía del producto (Manrope), la foto del inicio de la portada y el logotipo oficial de Reportia
// con el nombre del producto (src/v2/config/producto.js), como en la cabecera de la portada.
// Uso: PLAYWRIGHT=/ruta/a/playwright/index.mjs node scripts/og-image.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const root = new URL('..', import.meta.url);
const font = readFileSync(fileURLToPath(new URL('node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2', root))).toString('base64');
const photo = readFileSync(fileURLToPath(new URL('public/landing/inicio-1-d.webp', root))).toString('base64');
const logo = readFileSync(fileURLToPath(new URL('public/marca/reportia-logo.svg', root))).toString('base64');
const { NOMBRE_PRODUCTO, EMPRESA } = await import(new URL('src/v2/config/producto.js', root));
const suffix = NOMBRE_PRODUCTO.startsWith(EMPRESA) ? NOMBRE_PRODUCTO.slice(EMPRESA.length).trim() : '';

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: M; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 200 800; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; font-family: M, sans-serif; color: #fff; background: #0D1530 url(data:image/webp;base64,${photo}) center 40% / cover; position: relative; overflow: hidden; }
body::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(13,21,48,.96) 0%, rgba(13,21,48,.86) 46%, rgba(13,21,48,.25) 100%); }
main { position: absolute; inset: 0; padding: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; }
.law { font-size: 22px; font-weight: 600; color: #C9D3F5; }
h1 { display: flex; align-items: center; gap: 22px; }
h1 img { height: 74px; width: auto; display: block; }
h1 span { padding-left: 22px; border-left: 2px solid rgba(255,255,255,.4); font-size: 52px; font-weight: 600; letter-spacing: -.02em; line-height: 1; color: #fff; }
p { margin-top: 34px; font-size: 56px; font-weight: 700; letter-spacing: -.025em; line-height: 1.08; max-width: 13em; }
.bar { display: flex; align-items: center; gap: 14px; margin-top: 30px; }
.chip { padding: 10px 22px; border-radius: 10px; background: #2F54EB; font-size: 24px; font-weight: 700; }
.chip.is-line { background: none; box-shadow: inset 0 0 0 2px rgba(255,255,255,.5); }
</style></head><body><main>
<div class="law">Ley 2/2023 · Directiva (UE) 2019/1937</div>
<div><h1><img src="data:image/svg+xml;base64,${logo}" alt="${EMPRESA}">${suffix ? `<span>${suffix}</span>` : ''}</h1><p>Canal de denuncias para tu empresa</p>
<div class="bar"><span class="chip">Anónimo o con nombre</span><span class="chip is-line">Plazos legales a la vista</span></div></div>
</main></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
writeFileSync(fileURLToPath(new URL('public/og.jpg', root)), await page.screenshot({ type: 'jpeg', quality: 86 }));
await browser.close();
console.log('public/og.jpg');
