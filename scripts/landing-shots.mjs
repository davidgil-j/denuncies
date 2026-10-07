// Capturas reales del producto para la portada (public/landing/*.webp), en los tres idiomas.
// Se hacen sobre la demo local, así que no tocan ningún dato real. Para repetirlas cuando cambie
// la interfaz: npm run dev (sin credenciales de Supabase) y, en otra terminal,
//   PLAYWRIGHT=/ruta/a/playwright/index.mjs node scripts/landing-shots.mjs
// Necesita Playwright (npx playwright install chromium) y cwebp (brew install webp).
//
// Los cuatro pasos de «Cómo funciona» se capturan en una pantalla estrecha (360 px) y recortados
// a la parte que importa (360 × 640, la proporción de un móvil), porque se enseñan dentro de un móvil.
// «panel-lista» es la lista de denuncias en un ordenador (1280 × 800): la imagen grande bajo los pasos.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = new URL('../public/landing/', import.meta.url).pathname;
// La dirección que se lee en la captura del panel: la pública, no la del ordenador donde se hace la captura
const PUBLIC_HOST = process.env.PUBLIC_HOST || 'reportia-canal.vercel.app';
mkdirSync(OUT, { recursive: true });

const TEXT = {
  ca: 'Des de fa setmanes, un responsable del torn fa comentaris vexatoris a dues persones de l’equip davant de la resta.',
  es: 'Desde hace semanas, un responsable del turno hace comentarios vejatorios a dos personas del equipo delante del resto.',
  en: 'For weeks, a shift supervisor has been making degrading remarks to two members of the team in front of everyone.',
};
// Lo que no debe salir en una captura: avisos de demo y animaciones a medias
const CLEAN = '.v2-example, .v2-side-tags, .v2-retention { display: none !important; } *, *::before, *::after { animation: none !important; transition: none !important; }';
const CROP = { width: 360, height: 640 };

const browser = await chromium.launch();
/** Guarda una captura. target: selector de la pieza a recortar, o la altura (px) desde la que se recorta la pantalla. */
async function shot(page, name, lang, target, crop = CROP) {
  await page.addStyleTag({ content: CLEAN });
  await page.waitForTimeout(250);
  const png = `${OUT}${name}-${lang}.png`;
  if (typeof target === 'string') await page.locator(target).first().screenshot({ path: png });
  else {
    await page.evaluate(y => window.scrollTo(0, y), target);
    await page.waitForTimeout(150);
    await page.screenshot({ path: png, clip: { x: 0, y: 0, ...crop } });
  }
  execFileSync('cwebp', ['-quiet', '-q', '82', png, '-o', png.replace(/\.png$/, '.webp')]);
  rmSync(png);
  console.log(`${name}-${lang}.webp`);
}
const session = (lang) => (l) => {
  sessionStorage.setItem('reportia-demo-session', '1');
  sessionStorage.setItem('reportia-demo-aal', '2');
  localStorage.setItem('reportia-panel-lang', l);
};

for (const lang of ['ca', 'es', 'en']) {
  // ── Pasos 1 a 3: el canal público en un móvil estrecho ──
  const phone = await browser.newContext({ viewport: { width: 360, height: 720 }, deviceScaleFactor: 2.25, locale: lang });
  const p = await phone.newPage();
  await p.goto(`${BASE}/canal/demo?lang=${lang}`, { waitUntil: 'networkidle' });
  await shot(p, 'canal', lang, 0);

  await p.goto(`${BASE}/canal/demo/denuncia?lang=${lang}`, { waitUntil: 'networkidle' });
  await shot(p, 'formulario', lang, 118);

  const next = () => p.locator('.v2-actionbar button[type=submit]').click();
  await next();
  await p.locator('input[name="v2-category"]').nth(1).check({ force: true });
  await p.locator('#v2-f-description').fill(TEXT[lang]);
  await next();
  await next();
  await p.locator('#v2-f-privacy').check({ force: true });
  await next();
  await p.waitForSelector('.v2-bigcode');
  await shot(p, 'codigo', lang, 112);
  await phone.close();

  // ── Paso 4: la ficha de la denuncia en el panel, también en un móvil estrecho ──
  const hand = await browser.newContext({ viewport: { width: 360, height: 720 }, deviceScaleFactor: 2.25, locale: lang });
  await hand.addInitScript(session(lang), lang);
  const h = await hand.newPage();
  await h.goto(`${BASE}/admin/complaints/c-vk7p2mqa`, { waitUntil: 'networkidle' });
  await h.waitForTimeout(700);
  await shot(h, 'panel', lang, 64);
  await hand.close();

  // ── «Así lo ve su empresa»: la lista de denuncias en un ordenador ──
  const wide = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: lang });
  await wide.addInitScript(session(lang), lang);
  const w = await wide.newPage();
  await w.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await w.waitForTimeout(700);
  await w.evaluate((host) => { document.querySelectorAll('a[href^="/canal/"]').forEach(a => { a.textContent = a.textContent.replace(location.host, host); }); }, PUBLIC_HOST);
  await shot(w, 'panel-lista', lang, 0, { width: 1280, height: 800 });
  await wide.close();
}
await browser.close();
