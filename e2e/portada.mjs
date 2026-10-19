// La portada (src/v2/landing): compila la web como en producción y la sirve con las reglas de vercel.json (e2e/lib/vercel.mjs,
// puerto 4192). Comprueba lo que pide la fase 5:
//   · la raíz da la página del idioma (?lang= manda; si no, el del navegador; castellano si no es ninguno de los tres) y, en
//     la dirección propia de una empresa, su canal;
//   · las etiquetas para buscadores y para compartir, y robots.txt y sitemap.xml según INDEXAR_WEB;
//   · sin JavaScript se lee entera y las pestañas del vídeo, las preguntas y el menú funcionan;
//   · el vídeo: cada pantalla baja su versión y su póster, se reproduce solo al verse y se para al salir; con «reducir
//     movimiento», nada se mueve;
//   · CLS 0 (nada salta al cargar ni al bajar por la página);
//   · Lighthouse en el móvil: rendimiento, accesibilidad y buenas prácticas ≥ 95 (si Lighthouse está instalado, ver
//     e2e/README.md). Las cifras quedan en <salida>/lighthouse-*.json.
// Nada sale del ordenador.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwright.mjs';
import { loadLighthouse } from './lib/lighthouse.mjs';
import { serveLikeVercel } from './lib/vercel.mjs';

const OUT = process.argv[2] ?? os.tmpdir();
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = await import(path.join(ROOT, 'src/v2/config/producto.js'));
const problems = [];
const ok = (name, v, extra = '') => { console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(name); };

// ── Compilar como en producción (con la dirección pública de producción) y servir como Vercel ──
const ORIGIN = 'https://canal.reportia.es';
const DIST = fs.mkdtempSync(path.join(os.tmpdir(), 'reportia-portada-'));
const build = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', DIST, '--emptyOutDir'], {
  cwd: ROOT, encoding: 'utf8', env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', VITE_PUBLIC_ORIGIN: ORIGIN },
});
if (build.status !== 0) { console.log(`PROBLEMAS: no compila\n${build.stderr.slice(-800)}`); process.exit(1); }
const server = await serveLikeVercel({ dist: DIST, port: 4192 });
const APP = 'http://localhost:4192';
const get = (p, headers = {}) => new Promise((resolve, reject) => http.get(`${APP}${p}`, { headers }, r => { let d = ''; r.on('data', c => { d += c; }); r.on('end', () => resolve({ status: r.statusCode, headers: r.headers, body: d })); }).on('error', reject));
const htmlLang = (b) => /<html lang="(\w+)"/.exec(b)?.[1];

// ── 1 · Qué página da la raíz ──
for (const [al, q, want] of [['es-ES,es;q=0.9', '', 'es'], ['ca-ES,ca;q=0.9,es;q=0.8', '', 'ca'], ['en-GB,en;q=0.9', '', 'en'], ['fr-FR,fr;q=0.9', '', 'es'], ['', '', 'es'], ['ca-ES', '?lang=en', 'en'], ['en-GB', '?lang=es', 'es'], ['es-ES', '?lang=ca', 'ca']]) {
  const r = await get(`/${q}`, al ? { 'accept-language': al } : {});
  ok(`raíz con «${al || 'sin idioma'}»${q ? ` y ${q}` : ''} → portada en ${want}`, r.status === 200 && htmlLang(r.body) === want && /class="lp-hero"/.test(r.body), htmlLang(r.body));
}
const root = await get('/', { 'accept-language': 'es-ES' });
ok('raíz: varía según el idioma del navegador (Vary)', /accept-language/i.test(root.headers.vary ?? ''));
ok('raíz: sin la aplicación (página estática, sin #root)', !/id="root"/.test(root.body));
const own = await get('/', { host: 'canal.acme.es' });
ok('dirección propia de una empresa: la raíz da su canal (canal.html, sin Reportia)', own.status === 200 && /id="root"/.test(own.body) && !/reportia/i.test(own.body.split('</head>')[0]));
const app = await get('/crear-compte');
ok('el resto de la web sigue siendo la aplicación (app.html)', app.status === 200 && /id="root"/.test(app.body));

// ── 2 · Buscadores y vista previa al compartir ──
for (const lang of ['es', 'ca', 'en']) {
  const b = (await get(`/?lang=${lang}`)).body;
  const meta = (re) => re.exec(b)?.[1];
  const url = lang === 'es' ? `${ORIGIN}/` : `${ORIGIN}/?lang=${lang}`;
  ok(`${lang}: título con el nombre del producto`, (meta(/<title>([^<]+)<\/title>/) ?? '').startsWith(P.NOMBRE_PRODUCTO), meta(/<title>([^<]+)<\/title>/));
  ok(`${lang}: canonical y los tres idiomas enlazados`, meta(/rel="canonical" href="([^"]+)"/) === url && ['es', 'ca', 'en', 'x-default'].every(h => b.includes(`hreflang="${h}"`)));
  ok(`${lang}: imagen para compartir con dirección completa`, meta(/property="og:image" content="([^"]+)"/) === `${ORIGIN}/og.jpg`);
  ok(`${lang}: descripción`, (meta(/name="description" content="([^"]+)"/) ?? '').length > 60);
  ok(`${lang}: robots según INDEXAR_WEB (${P.INDEXAR_WEB})`, meta(/name="robots" content="([^"]+)"/) === (P.INDEXAR_WEB ? 'index, follow' : 'noindex, nofollow'));
}
const robots = (await get('/robots.txt')).body;
const sitemap = (await get('/sitemap.xml')).body;
ok('robots.txt según INDEXAR_WEB', P.INDEXAR_WEB ? /Allow: \/\nSitemap: https:\/\/canal\.reportia\.es\/sitemap\.xml/.test(robots) : /Disallow: \/$/m.test(robots), robots.trim().replace(/\n/g, ' · '));
ok('sitemap.xml con la portada en los tres idiomas', (sitemap.match(/<loc>/g) ?? []).length === 3 && sitemap.includes(`${ORIGIN}/?lang=ca`));
ok('el JavaScript y la tipografía de la portada llevan huella en el nombre (caché larga)', /src="\/assets\/portada-[0-9a-f]{8}\.js"/.test(root.body) && /href="\/assets\/manrope-latin-[\w-]+\.woff2"/.test(root.body));

// ── Navegador ──
const browser = await chromium.launch();
const local = (ctx) => ctx.route(u => !u.toString().startsWith(APP) && !/^(data|blob):/.test(u.toString()), r => r.abort());
// La página se desplaza con suavidad (scroll-behavior: smooth) y el desplazamiento automático de Playwright no se lleva bien
// con eso (reintenta sin parar). Se baja como una persona, con la rueda, hasta tenerlo a la vista
async function bringIntoView(page, loc) {
  const vh = page.viewportSize().height;
  for (let i = 0; i < 80; i++) {
    const b = await loc.boundingBox();
    if (b && b.y >= 90 && b.y + Math.min(b.height, vh / 2) <= vh - 20) break;
    const delta = b ? b.y - vh / 3 : 600;
    await page.mouse.wheel(0, Math.max(-700, Math.min(700, delta)));
    await page.waitForTimeout(140);
  }
  await page.waitForTimeout(500);
}

// ── 3 · Sin JavaScript ──
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, javaScriptEnabled: false, locale: 'es-ES', isMobile: w < 700, hasTouch: w < 700 });
  await local(ctx);
  const page = await ctx.newPage();
  await page.goto(`${APP}/?lang=es`, { waitUntil: 'networkidle' });
  ok(`sin JavaScript (${w}): el titular y las siete partes se ven`, await page.locator('.lp-hero h1').isVisible()
    && (await page.locator('main > section').count()) >= 7 && await page.locator('#precios .lp-plans li').count() === 3);
  ok(`sin JavaScript (${w}): «Quien denuncia» a la vista y «Quien gestiona» escondido`, await page.locator('.lp-video-report').isVisible() && !(await page.locator('.lp-video-manage').isVisible()));
  await bringIntoView(page, page.locator('label[for="lp-v-manage"]'));
  await page.locator('label[for="lp-v-manage"]').click();
  ok(`sin JavaScript (${w}): la pestaña «Quien gestiona» cambia el vídeo`, await page.locator('.lp-video-manage').isVisible() && !(await page.locator('.lp-video-report').isVisible()));
  const q = page.locator('#preguntas details').first();
  await bringIntoView(page, q.locator('summary'));
  await q.locator('summary').click();
  ok(`sin JavaScript (${w}): las preguntas se abren`, await q.evaluate(d => d.open));
  if (w < 700) {
    await bringIntoView(page, page.locator('.lp-menu > summary'));
    await page.locator('.lp-menu > summary').click();
    ok('sin JavaScript (390): el menú del móvil se abre y lleva a las secciones', await page.locator('.lp-menu a[href="#precios"]').isVisible());
  }
  await ctx.close();
}

// ── 4 · El vídeo: cada pantalla con su versión; se reproduce al verse y se para al salir ──
for (const [w, h, file, poster] of [[1440, 900, '/landing/video/denuncia.mp4', '/landing/video/denuncia.webp'], [390, 844, '/landing/video/denuncia-movil.mp4', '/landing/video/denuncia-movil.webp']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'es-ES', reducedMotion: 'no-preference', isMobile: w < 700, hasTouch: w < 700 });
  await local(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const videoRequests = [];
  page.on('request', r => { if (/\/landing\/video\//.test(r.url())) videoRequests.push(new URL(r.url()).pathname); });
  await page.goto(`${APP}/?lang=es`, { waitUntil: 'networkidle' });
  ok(`vídeo (${w}): al cargar no se baja ningún vídeo`, !videoRequests.some(u => u.endsWith('.mp4')), videoRequests.join(' '));
  await bringIntoView(page, page.locator('#funciona .lp-video-stage'));
  await page.waitForTimeout(2000);
  const state = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('video[data-video]')].map(v => [v.dataset.video, { src: new URL(v.currentSrc || 'http://x/').pathname, paused: v.paused, t: v.currentTime }])));
  let s = await state();
  ok(`vídeo (${w}): «Quien denuncia» se reproduce al verse, con su versión (${path.basename(file)})`, !s.report.paused && s.report.t > 0.5 && s.report.src === file, JSON.stringify(s.report));
  const posterSrc = await page.locator('.lp-video-report video').evaluate(v => new URL(v.poster).pathname);
  ok(`vídeo (${w}): su póster es el de esa pantalla`, posterSrc === poster, posterSrc);
  await page.locator('label[for="lp-v-manage"]').click();
  await page.waitForTimeout(1500);
  s = await state();
  ok(`vídeo (${w}): la otra pestaña reproduce el otro y para el primero`, s.report.paused && !s.manage.paused && s.manage.t > 0.3, JSON.stringify(s));
  await bringIntoView(page, page.locator('#precios .lp-plans'));
  await page.waitForTimeout(800);
  s = await state();
  ok(`vídeo (${w}): al salir de la vista se para`, s.report.paused && s.manage.paused);
  ok(`vídeo (${w}): sin errores en la página`, errors.length === 0, errors.join(' · '));
  await ctx.close();
}
// Los archivos: H.264 en MP4 sin sonido, menos de 10 MB cada uno
for (const f of fs.readdirSync(path.join(ROOT, 'public/landing/video')).filter(f => f.endsWith('.mp4'))) {
  const size = fs.statSync(path.join(ROOT, 'public/landing/video', f)).size;
  ok(`vídeo ${f}: menos de 10 MB`, size < 10 * 1024 * 1024, `${(size / 1048576).toFixed(2)} MB`);
}

// ── 5 · Con «reducir movimiento», nada se mueve ──
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES', reducedMotion: 'reduce' });
  await local(ctx);
  const page = await ctx.newPage();
  await page.goto(`${APP}/?lang=es`, { waitUntil: 'networkidle' });
  await bringIntoView(page, page.locator('#funciona .lp-video-stage'));
  await page.waitForTimeout(1500);
  const calm = await page.evaluate(() => ({
    playing: [...document.querySelectorAll('video')].filter(v => !v.paused).length,
    anims: document.getAnimations().filter(a => a.playState === 'running').length,
    smooth: getComputedStyle(document.documentElement).scrollBehavior,
  }));
  ok('movimiento reducido: ningún vídeo se reproduce solo, ninguna animación y el desplazamiento no es suave', calm.playing === 0 && calm.anims === 0 && calm.smooth !== 'smooth', JSON.stringify(calm));
  ok('movimiento reducido: el vídeo tiene sus controles para verlo si se quiere', await page.locator('.lp-video-report video').evaluate(v => v.controls));
  // Lo que se ve en la caja del vídeo sin reproducir es su póster, no un recuadro gris: se mide el color del centro
  const shot = await page.locator('.lp-video-report .lp-video-box').screenshot();
  const gray = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, Math.floor(img.height * 0.8)).data; // sin la barra de controles de abajo
    let same = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 51) < 4 && Math.abs(d[i + 1] - 51) < 4 && Math.abs(d[i + 2] - 51) < 4) same++;
    return same / (d.length / 4);
  }, shot.toString('base64'));
  ok('movimiento reducido: en la caja del vídeo se ve su póster (no el recuadro gris del navegador)', gray < 0.2, `${Math.round(gray * 100)} % gris`);
  await ctx.close();
}

// ── 5b · El texto sobre las fotos (inicio y cierre, y la cabecera encima): contraste medido en los píxeles de verdad ──
// Se esconde el texto, se hace una captura y, detrás de cada línea, se toma el 5 % de píxeles más claros (el peor caso)
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'es-ES', reducedMotion: 'reduce', isMobile: w < 700, hasTouch: w < 700 });
  await local(ctx);
  const page = await ctx.newPage();
  await page.goto(`${APP}/?lang=es`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.querySelectorAll('.lp-hero img, .lp-end img')].map(i => { i.loading = 'eager'; return i.decode().catch(() => {}); })); });
  const texts = await page.evaluate(() => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!n.textContent.trim() || !el.closest('.lp-top, .lp-hero, .lp-end') || el.closest('.lp-btn, .lp-menu-panel, .lp-vh, [aria-current]')) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width < 2 || r.height < 2) continue;
        const cs = getComputedStyle(el);
        out.push({ text: n.textContent.trim().slice(0, 30), x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, color: cs.color, size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight) });
      }
    }
    return out;
  });
  await page.addStyleTag({ content: '.lp-top *, .lp-hero *, .lp-end * { color: transparent !important; text-decoration-color: transparent !important; } .lp-btn, .lp-top svg, .lp-hero svg, .lp-end svg { visibility: hidden !important; }' });
  const shot = (await page.screenshot({ fullPage: true })).toString('base64');
  const worst = await page.evaluate(async ({ shot, texts }) => {
    const img = new Image(); img.src = `data:image/png;base64,${shot}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
    return texts.map(t => {
      const d = g.getImageData(Math.round(t.x), Math.round(t.y), Math.max(1, Math.round(t.w)), Math.max(1, Math.round(t.h))).data;
      const lums = []; for (let i = 0; i < d.length; i += 4) lums.push(L(d[i], d[i + 1], d[i + 2]));
      lums.sort((a, b) => a - b);
      const bg = lums[Math.floor(lums.length * 0.95)] ?? 0;
      const m = t.color.match(/[\d.]+/g).map(Number); const fg = L(m[0], m[1], m[2]);
      const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      const big = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700);
      return { text: t.text, ratio: Number(ratio.toFixed(2)), min: big ? 3 : 4.5 };
    }).filter(r => r.ratio < r.min);
  }, { shot, texts });
  ok(`texto sobre las fotos (${w}): contraste medido en píxeles (${texts.length} líneas)`, texts.length > 5 && worst.length === 0, worst.map(x => `«${x.text}» ${x.ratio}:1`).join(' · '));
  await ctx.close();
}

// ── 6 · CLS 0: nada salta al cargar ni al bajar por la página (móvil y ordenador, en los tres idiomas) ──
for (const [w, h] of [[390, 844], [1440, 900]]) {
  for (const lang of ['es', 'ca', 'en']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: `${lang}-ES`, isMobile: w < 700, hasTouch: w < 700 });
    await local(ctx);
    await ctx.addInitScript(() => {
      window.__cls = 0;
      window.__shifts = [];
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push(e.sources?.map(s => s.node?.className || s.node?.nodeName).join(',')); } }).observe({ type: 'layout-shift', buffered: true });
    });
    const page = await ctx.newPage();
    await page.goto(`${APP}/?lang=${lang}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    for (let y = 0; y < 30; y++) { await page.mouse.wheel(0, h * 0.6); await page.waitForTimeout(90); }
    await page.waitForTimeout(600);
    const cls = await page.evaluate(() => ({ v: window.__cls, s: window.__shifts }));
    ok(`CLS 0 (${w}, ${lang})`, cls.v === 0, cls.v ? `${cls.v.toFixed(4)} · ${cls.s.join(' | ')}` : '');
    await ctx.close();
  }
}

// ── 7 · Enlaces: con el idioma; los de fuera, en otra pestaña y sin pasar datos ──
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await local(ctx);
  const page = await ctx.newPage();
  await page.goto(`${APP}/?lang=ca`, { waitUntil: 'networkidle' });
  const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => ({ href: a.getAttribute('href'), target: a.target, rel: a.rel })));
  ok('enlaces: el alta, la demo y el acceso llevan el idioma', ['/crear-compte?lang=ca', '/canal/demo?lang=ca', '/admin/login?lang=ca'].every(h => links.some(l => l.href === h)));
  ok('enlaces: los del BOE, en otra pestaña con noopener', links.filter(l => l.href.startsWith('https://www.boe.es')).every(l => l.target === '_blank' && /noopener/.test(l.rel)) && links.some(l => l.href.includes('#a6-7')));
  ok('enlaces: el correo de contacto', links.some(l => l.href === `mailto:${P.CORREO_CONTACTO}`));
  await page.locator('a[href="/crear-compte?lang=ca"]').first().click();
  await page.waitForSelector('form');
  ok('de la portada al alta: la aplicación, en catalán', new URL(page.url()).pathname === '/crear-compte' && (await page.getAttribute('html', 'lang')) === 'ca');
  await page.locator('.v2-site-brand').click();
  await page.waitForSelector('.lp-hero h1');
  ok('y del alta a la portada, en el mismo idioma', (await page.getAttribute('html', 'lang')) === 'ca' && await page.locator('#root').count() === 0);
  await ctx.close();
}

// ── 8 · Lighthouse en el móvil ──
const lh = await loadLighthouse();
if (!lh) {
  console.log('AVISO Lighthouse no está instalado: no se mide (npm i --prefix ~/.reportia-e2e lighthouse@12, ver e2e/README.md)');
} else {
  const chrome = await lh.launcher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
  try {
    for (const lang of ['es', 'ca', 'en']) {
      const r = await lh.lighthouse(`${APP}/?lang=${lang}`, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] });
      fs.writeFileSync(path.join(OUT, `lighthouse-${lang}.json`), r.report);
      const score = (c) => Math.round((r.lhr.categories[c]?.score ?? 0) * 100);
      const a = r.lhr.audits;
      const facts = `rendimiento ${score('performance')} · accesibilidad ${score('accessibility')} · buenas prácticas ${score('best-practices')} · SEO ${score('seo')} · LCP ${a['largest-contentful-paint'].displayValue} · CLS ${a['cumulative-layout-shift'].displayValue} · TBT ${a['total-blocking-time'].displayValue}`;
      ok(`Lighthouse móvil (${lang}): rendimiento, accesibilidad y buenas prácticas ≥ 95`, ['performance', 'accessibility', 'best-practices'].every(c => score(c) >= 95), facts);
      // SEO: con INDEXAR_WEB apagado, la página dice «noindex» a propósito y esa comprobación no puede pasar
      const seoFails = Object.values(a).filter(x => r.lhr.categories.seo.auditRefs.some(ref => ref.id === x.id && ref.weight > 0) && x.score === 0).map(x => x.id);
      ok(`Lighthouse móvil (${lang}): SEO sin fallos salvo el «noindex» elegido`, seoFails.every(id => id === 'is-crawlable' && !P.INDEXAR_WEB), seoFails.join(', '));
    }
  } finally {
    await chrome.kill();
  }
}

await browser.close();
server.close();
fs.rmSync(DIST, { recursive: true, force: true });
console.log(problems.length ? `PROBLEMAS: ${problems.join(' · ')}` : 'Portada: idiomas, etiquetas, sin JavaScript, vídeo, movimiento reducido, CLS 0 y Lighthouse, bien');
process.exit(problems.length ? 1 : 0);
