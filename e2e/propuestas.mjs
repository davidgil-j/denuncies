import { chromium } from './lib/playwright.mjs';
const OUT = process.argv[2];
const b = await chromium.launch();
const problems = []; const ok = (n, v, x = '') => { console.log(`${v ? 'OK   ' : 'FALLA'} ${n} ${x}`); if (!v) problems.push(n); };
for (const [w, h] of [[1440, 900], [1366, 768], [1280, 720], [1280, 700], [1180, 800], [1024, 768], [375, 812]]) {
  const mobile = w < 700;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile, locale: 'es-ES' });
  const p = await ctx.newPage();
  p.on('pageerror', e => problems.push(e.message));
  await p.addInitScript(() => { sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); localStorage.setItem('reportia-panel-lang', 'es'); });
  await p.goto('http://localhost:3111/admin', { waitUntil: 'networkidle' }); await p.waitForSelector('.ds-case'); await p.waitForTimeout(400);
  const head = await p.evaluate(() => { const h = document.querySelector('.pn-head'); const rows = new Set([...h.children].filter(c => getComputedStyle(c).position !== 'fixed').map(c => Math.round(c.getBoundingClientRect().top / 30))).size; const chips = [...document.querySelectorAll('.pn-brand .ds-chip')].filter(c => c.getBoundingClientRect().width > 0).length; const cols = [...document.querySelectorAll('.ds-kcol')].filter(k => k.getBoundingClientRect().width > 0).map(k => [...k.querySelectorAll('.ds-case')].filter(c => c.getBoundingClientRect().bottom <= innerHeight).length); const reg = getComputedStyle(document.querySelector('.pn-register')).backgroundColor; return { rows, chips, cols, reg, over: document.documentElement.scrollWidth - innerWidth }; });
  if (!mobile) {
    if (w >= 1180) ok(`${w}×${h} cabecera en una fila`, head.rows === 1, `${head.rows} filas`);
    ok(`${w}×${h} chips «Demo»/«Prueba» ${w > 1367 ? 'visibles' : 'escondidos'}`, w > 1367 ? head.chips === 2 : head.chips === 0, String(head.chips));
    if (h <= 768 && w >= 1280) ok(`${w}×${h} dos tarjetas por columna`, head.cols.length === 3 && head.cols.every(n => n >= 2), head.cols.join('/'));
  }
  ok(`${w}×${h} sin desbordar`, head.over <= 0);
  ok(`${w}×${h} «Registrar caso» azul en el tablero`, /47, 84, 235/.test(head.reg), head.reg);
  await p.screenshot({ path: `${OUT}/${w}x${h}-P3-tablero-cabecera.png` });
  await p.goto('http://localhost:3111/admin/report', { waitUntil: 'networkidle' }); await p.waitForSelector('.rp-figs dd');
  ok(`${w}×${h} «Registrar caso» gris fuera del tablero`, !/47, 84, 235/.test(await p.evaluate(() => getComputedStyle(document.querySelector('.pn-register')).backgroundColor)));
  if (w === 1440 || mobile) {
    await p.screenshot({ path: `${OUT}/${w}-P1-registrar-gris-en-informe.png` });
    await p.goto('http://localhost:3111/admin/nueva', { waitUntil: 'networkidle' }); await p.waitForSelector('.rg-form');
    const txt = await p.locator('.pn-page').innerText();
    ok(`${w} P2 · «Registrar un caso» y sin «denuncia» en la pantalla`, txt.includes('Registrar un caso') && !/denuncia/i.test(txt) && txt.includes('Recibido el'), (txt.match(/[^\n]*denuncia[^\n]*/i) ?? [''])[0]);
    await p.screenshot({ path: `${OUT}/${w}-P2-registrar-un-caso.png` });
    await p.goto('http://localhost:3111/admin/ajustes', { waitUntil: 'networkidle' }); await p.waitForSelector('.tm-list li');
    const sec = p.locator('section[aria-labelledby="st-sec-t"]');
    await sec.getByRole('button', { name: 'English' }).click();
    await p.getByRole('heading', { name: 'Team and settings' }).waitFor();
    ok(`${w} P4 · idioma desde «Tu seguridad»`, true);
    await sec.scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/${w}-P4-idioma-en-tu-seguridad.png` });
    await sec.getByRole('button', { name: 'Español' }).click(); await p.getByRole('heading', { name: 'Equipo y ajustes' }).waitFor();
    // P5 · Cerradas de 10 en 10: se añaden casos cerrados a la demo
    await p.evaluate(() => { const s = JSON.parse(sessionStorage.getItem('reportia-demo-store-v4')); const base = s.complaints.find(c => c.status === 'closed'); for (let i = 0; i < 18; i++) s.complaints.push({ ...base, id: `c-extra-${i}`, reference: `REF-EXT${String(i).padStart(3, '0')}`, title: `Caso cerrado de prueba ${i + 1}` }); sessionStorage.setItem('reportia-demo-store-v4', JSON.stringify(s)); });
    await p.goto('http://localhost:3111/admin', { waitUntil: 'networkidle' }); await p.waitForSelector('.ds-case');
    if (mobile) await p.getByRole('tab', { name: /Cerradas/ }).click();
    const closedCol = p.locator('.ds-kcol').filter({ has: p.locator('.ds-case') }).last();
    const count = async () => p.locator('.ds-kcol', { hasText: 'Cerradas' }).last().locator('.ds-case').count();
    const c0 = await count();
    const more = p.getByRole('button', { name: /^Ver \d+ más \(de \d+\)$/ });
    ok(`${w} P5 · «Cerradas» empieza con 2 y ofrece «Ver 10 más»`, c0 === 2 && (await more.innerText()) === 'Ver 10 más (de 24)', `${c0} · ${await more.innerText().catch(() => '')}`);
    await more.click(); const c1 = await count();
    await more.click(); const c2 = await count();
    ok(`${w} P5 · de 10 en 10 hasta el final, luego «Ver menos»`, c1 === 12 && c2 === 22 && (await more.innerText()) === 'Ver 2 más (de 24)', `${c1} · ${c2}`);
    await more.click(); ok(`${w} P5 · todas y «Ver menos»`, await count() === 24 && await p.getByRole('button', { name: 'Ver menos' }).count() === 1);
    await p.locator('.ds-kcol', { hasText: 'Cerradas' }).last().screenshot({ path: `${OUT}/${w}-P5-cerradas-de-10-en-10.png` });
    await p.getByRole('button', { name: 'Ver menos' }).click(); ok(`${w} P5 · «Ver menos» vuelve a 2`, await count() === 2);
  }
  await ctx.close();
}
console.log(problems.length ? `\nPROBLEMAS: ${problems.length}` : '\nsin problemas');
await b.close();
