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
// Justificante de quien denuncia: en Manrope (versión ligera) y sin la hora en los metadatos
await save(() => p.evaluate(() => import('/src/v2/lib/receipt.js').then(m => m.downloadReceipt({
  code: 'K7QX-2MPD', title: 'Justificant d’enviament', rows: [['Codi', 'K7QX-2MPD'], ['Enviada', '9 d’octubre de 2026, 10:24'], ['Adreça', 'https://exemple/canal/demo/consulta']],
  nextTitle: 'Què passa ara', next: [['Et confirmen que l’han rebuda', 'Com a tard el 16 d’octubre'], ['La investiguen', '—'], ['Et responen', 'Com a tard el 9 de gener']],
  notes: ['Guarda aquest codi: és l’única manera de tornar.', '«Ningú no pot prendre represàlies» · l·l · ç'],
}))), 'justificant-ca.pdf');
const rc = (await import('node:fs')).readFileSync(`${OUT}/justificant-ca.pdf`, 'latin1');
// (jsPDF declara siempre las 14 letras de serie, aunque no las use: se comprueba que lleva Manrope)
if (!/\/BaseFont \/[A-Z+]*Manrope/.test(rc)) errs.push('el justificante no va en Manrope');
if (!/CreationDate \(D:\d{8}000000\+00'00'\)/.test(rc)) errs.push('el justificante lleva la hora o la zona horaria');
console.log(errs.length ? 'PROBLEMAS: ' + errs.join(' | ') : 'PDF del caso, informe, cartel y justificante con Manrope, sin errores');
await b.close();
