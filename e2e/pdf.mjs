import { chromium } from './lib/playwright.mjs';
const OUT = process.argv[2];
const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true, locale: 'es-ES' }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/React DevTools/.test(m.text())) errs.push(m.text().slice(0, 200)); });
await p.addInitScript(() => { sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); localStorage.setItem('reportia-panel-lang', 'ca'); });
// Nombre con letras del latín extendido para comprobar que se dibujan
await p.goto('http://localhost:3111/admin/ajustes', { waitUntil: 'networkidle' }); await p.waitForSelector('.tm-list li');
await p.evaluate(() => { const s = JSON.parse(sessionStorage.getItem('reportia-demo-store-v4')); s.org.name = 'Cooperativa Łódź-Žilina, S.C.C.L. · «Paŭlo» Ĝirono’s €'; sessionStorage.setItem('reportia-demo-store-v4', JSON.stringify(s)); });
const save = async (fn, name) => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 40000 }), fn()]); await d.saveAs(`${OUT}/${name}`); };
await p.goto('http://localhost:3111/admin/complaints/c-w2lc9pxa', { waitUntil: 'networkidle' }); await p.waitForSelector('.cs-desc');
await save(() => p.getByRole('button', { name: /Exportar PDF/ }).click(), 'caso-ca.pdf');
await p.goto('http://localhost:3111/admin/report', { waitUntil: 'networkidle' }); await p.waitForSelector('.rp-figs dd');
await save(() => p.getByRole('button', { name: /PDF/ }).click(), 'informe-ca.pdf');
await p.goto('http://localhost:3111/admin/integration', { waitUntil: 'networkidle' }); await p.waitForSelector('.sh-qr img');
await save(() => p.locator('.sh-poster').getByRole('button', { name: /PDF/ }).click(), 'cartell-ca.pdf');
console.log(errs.length ? 'PROBLEMAS: ' + errs.join(' | ') : 'PDF del caso, informe y cartel con Manrope, sin errores');
await b.close();
