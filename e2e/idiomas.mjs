// Pasada por las pantallas del recorrido en catalán e inglés, con captura (1440 y 375)
import { chromium } from './lib/playwright.mjs';
const OUT = process.argv[2];
const b = await chromium.launch(); const problems = [];
for (const lang of ['ca', 'en']) for (const w of [1440, 375]) {
  const mobile = w < 700;
  const ctx = await b.newContext({ viewport: { width: w, height: mobile ? 812 : 900 }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile });
  const p = await ctx.newPage(); p.on('pageerror', e => problems.push(e.message.slice(0, 120)));
  await p.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
  await p.addInitScript((l) => { localStorage.setItem('reportia-panel-lang', l); if (!location.pathname.startsWith('/admin/login')) { sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); } }, lang);
  let n = 0;
  const shot = async (name) => { await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400); const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) problems.push(`${lang} ${w} ${name}: desborda ${o}px`); await p.screenshot({ path: `${OUT}/${lang}-${w}-${String(++n).padStart(2, '0')}-${name}.png` }); };
  for (const [path, sel, name] of [['/admin/login?from=demo&lang=' + lang, '.ac-form', 'acceso'], [`/canal/demo?lang=${lang}`, '.ds-hero', 'entrada'], [`/canal/demo/denuncia?lang=${lang}`, '.cats', 'paso-1'], [`/canal/demo/consulta?lang=${lang}`, 'form', 'codigo'], ['/admin', '.ds-case', 'tablero'], ['/admin/complaints/c-w2lc9pxa', '.cs-desc', 'caso'], ['/admin/nueva', '.rg-form', 'registrar'], ['/admin/report', '.rp-figs dd', 'informe'], ['/admin/integration', '.sh-list', 'compartir'], ['/admin/ajustes', '.tm-list li', 'ajustes']]) {
    await p.goto('http://localhost:3111' + path, { waitUntil: 'networkidle' }); await p.waitForSelector(sel); await shot(name);
    const h = await p.locator('html').getAttribute('lang'); if (h !== lang) problems.push(`${lang} ${name}: html lang=${h}`);
  }
  // Mi caso
  await p.goto(`http://localhost:3111/canal/demo/consulta?lang=${lang}`, { waitUntil: 'networkidle' }); await p.locator('input').first().fill('T8GH5RWD'); await p.locator('form button[type=submit]').click(); await p.waitForSelector('.mc'); await shot('mi-caso');
  await ctx.close();
}
console.log(problems.length ? 'PROBLEMAS:\n' + problems.join('\n') : 'catalán e inglés: 44 pantallas, sin problemas');
await b.close();
