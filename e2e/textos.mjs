// Ninguna pantalla con «undefined», «[object Object]», «NaN» o un {hueco} sin rellenar, en los tres idiomas
import { chromium } from './lib/playwright.mjs';
const b = await chromium.launch(); const bad = []; let n = 0;
const PAGES = [['/', 'main, h1'], ['/crear-compte', 'form'], ['/privacitat', 'h1'], ['/no-existe', 'h1'], ['/canal/demo', '.ds-hero'], ['/canal/demo/denuncia', '.cats'], ['/canal/demo/consulta', 'form'], ['/canal/demo/privacidad', '.priv-sec'], ['/canal/no-existe', '.canal-lost'],
  ['/admin/login?from=demo', '.ac-form'], ['/admin/forgot-password', '.ac-form'], ['/admin/reset-password', '.ac-form'], ['/admin', '.ds-case'], ['/admin/complaints/c-w2lc9pxa', '.cs-desc'], ['/admin/complaints/c-f4qj7mbn', '.cs-desc'], ['/admin/complaints/no-existe', 'h1'], ['/admin/nueva', '.rg-form'], ['/admin/report', '.rp-figs dd'], ['/admin/integration', '.sh-list'], ['/admin/ajustes', '.tm-list li'], ['/admin/mfa', '.sg-state']];
for (const lang of ['es', 'ca', 'en']) {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage();
  p.on('pageerror', e => bad.push(`${lang} error: ${e.message.slice(0, 120)}`));
  await p.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
  await p.addInitScript((l) => { localStorage.setItem('reportia-panel-lang', l); localStorage.setItem('reportia-lang', l); }, lang);
  for (const [path, sel] of PAGES) {
    const anon = /login|password|^\/(?!admin)/.test(path);
    await p.evaluate((a) => { if (a) { sessionStorage.removeItem('reportia-demo-session'); } else { sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); } }, anon).catch(() => {});
    if (!anon && n === 0) await p.goto('http://localhost:3111/canal/demo', { waitUntil: 'networkidle' });
    await p.evaluate((a) => { if (!a) { sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); } }, anon).catch(() => {});
    const url = `http://localhost:3111${path}${path.includes('?') ? '&' : '?'}lang=${lang}`;
    await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForSelector(sel, { timeout: 15000 }); await p.waitForTimeout(600); n++;
    // Abre los paneles y menús que haya para mirar también su texto
    const txt = await p.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('[aria-label],[title],[placeholder],img[alt]')].map(e => (e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('title') || '') + ' ' + (e.getAttribute('placeholder') || '') + ' ' + (e.getAttribute('alt') || '')).join(' ') + ' ' + document.title);
    const hit = txt.match(/undefined|\[object Object\]|\bNaN\b|\{[a-z]+\}/i);
    if (hit) bad.push(`${lang} ${path}: «${txt.slice(Math.max(0, hit.index - 40), hit.index + 30).replace(/\s+/g, ' ')}»`);
  }
  await ctx.close();
}
console.log(bad.length ? 'PROBLEMAS:\n' + bad.join('\n') : `${n} pantallas en 3 idiomas sin huecos ni «undefined»`);
await b.close();
