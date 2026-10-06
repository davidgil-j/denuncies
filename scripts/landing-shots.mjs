// Capturas reales del producto para la portada (public/landing/*.webp), en los tres idiomas.
// Se hacen sobre la demo local, así que no tocan ningún dato real. Para repetirlas cuando cambie
// la interfaz: npm run dev (sin credenciales de Supabase) y, en otra terminal,
//   PLAYWRIGHT=/ruta/a/playwright/index.mjs node scripts/landing-shots.mjs
// Necesita Playwright (npx playwright install chromium) y cwebp (brew install webp).
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = new URL('../public/landing/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const TEXT = {
  ca: 'Des de fa setmanes, un responsable del torn fa comentaris vexatoris a dues persones de l’equip davant de la resta.',
  es: 'Desde hace semanas, un responsable del turno hace comentarios vejatorios a dos personas del equipo delante del resto.',
  en: 'For weeks, a shift supervisor has been making degrading remarks to two members of the team in front of everyone.',
};
// Lo que no debe salir en una captura: avisos de demo y animaciones a medias
const CLEAN = '.v2-example, .v2-side-tags { display: none !important; } *, *::before, *::after { animation: none !important; transition: none !important; }';

const browser = await chromium.launch();
async function shot(page, name, lang, selector) {
  await page.addStyleTag({ content: CLEAN });
  await page.waitForTimeout(250);
  const png = `${OUT}${name}-${lang}.png`;
  // Con selector se recorta esa pieza; sin él, lo que se ve en pantalla
  if (selector) await page.locator(selector).first().screenshot({ path: png });
  else await page.screenshot({ path: png });
  execFileSync('cwebp', ['-quiet', '-q', '84', png, '-o', png.replace(/\.png$/, '.webp')]);
  rmSync(png);
  console.log(`${name}-${lang}.webp`);
}

for (const lang of ['ca', 'es', 'en']) {
  // ── Canal público, en un móvil ──
  const phone = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, locale: lang });
  const p = await phone.newPage();
  await p.goto(`${BASE}/canal/demo?lang=${lang}`, { waitUntil: 'networkidle' });
  await shot(p, 'canal', lang);

  await p.goto(`${BASE}/canal/demo/denuncia?lang=${lang}`, { waitUntil: 'networkidle' });
  await shot(p, 'formulario', lang);

  const next = () => p.locator('.v2-actionbar button[type=submit]').click();
  await next();
  await p.locator('input[name="v2-category"]').nth(1).check({ force: true });
  await p.locator('#v2-f-description').fill(TEXT[lang]);
  await next();
  await next();
  await p.locator('#v2-f-privacy').check({ force: true });
  await next();
  await p.waitForSelector('.v2-bigcode');
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot(p, 'codigo', lang);

  await phone.close();

  // ── Panel de gestión: la ficha con sus plazos, a tamaño legible ──
  const desk = await browser.newContext({ viewport: { width: 600, height: 900 }, deviceScaleFactor: 2, locale: lang });
  await desk.addInitScript((l) => {
    sessionStorage.setItem('reportia-demo-session', '1');
    sessionStorage.setItem('reportia-demo-aal', '2');
    localStorage.setItem('reportia-panel-lang', l);
  }, lang);
  const d = await desk.newPage();
  await d.goto(`${BASE}/admin/complaints/c-vk7p2mqa`, { waitUntil: 'networkidle' });
  await d.waitForTimeout(700);
  await shot(d, 'plazos', lang, '.v2-exp');
  await desk.close();

  // ── La misma ficha en un móvil: el cuarto paso del recorrido ──
  const hand = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, locale: lang });
  await hand.addInitScript((l) => {
    sessionStorage.setItem('reportia-demo-session', '1');
    sessionStorage.setItem('reportia-demo-aal', '2');
    localStorage.setItem('reportia-panel-lang', l);
  }, lang);
  const h = await hand.newPage();
  await h.goto(`${BASE}/admin/complaints/c-vk7p2mqa`, { waitUntil: 'networkidle' });
  await h.waitForTimeout(700);
  await shot(h, 'panel', lang);
  await hand.close();
}
await browser.close();
