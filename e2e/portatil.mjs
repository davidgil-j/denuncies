// Mide cada pantalla en tamaños de portátil al 100 %: si cabe sin scroll, botones partidos en dos líneas,
// textos cortados y si la franja lateral se queda fija. Guarda una captura de lo que se ve al entrar.
import { chromium } from './lib/playwright.mjs';
const [OUT, ONLY] = [process.argv[2], process.argv[3]];
const B = 'http://localhost:3111';
const SIZES = [[1470, 800], [1440, 760], [1366, 768], [1280, 720], [1280, 700], [1440, 900]].filter(s => !ONLY || `${s[0]}x${s[1]}` === ONLY);
const browser = await chromium.launch();
const SCREENS = [
  ['canal-entrada', '/canal/demo?lang=es', '.ds-hero', { fit: true }],
  ['canal-paso-1', '/canal/demo/denuncia?lang=es', '.cats', { fit: true }],
  ['canal-paso-2', null, '#dn-description', { fit: true, step: 2 }],
  ['canal-paso-3', null, '.review', { fit: true, step: 3 }],
  ['canal-codigo', '/canal/demo/consulta?lang=es', '.codebox, form', { fit: true }],
  ['canal-mi-caso', null, '.mc', { mycase: true }],
  ['acceso', '/admin/login?from=demo&lang=es', '.ac-form', { fit: true, anon: true }],
  ['acceso-recuperar', '/admin/forgot-password?from=demo', '.ac-form', { fit: true, anon: true }],
  ['tablero', '/admin', '.ds-case', { board: true }],
  ['caso', '/admin/complaints/c-vk7p2mqa', '.cs-desc', {}],
  ['registrar', '/admin/nueva', '.rg-form', {}],
  ['informe', '/admin/report', '.rp-figs dd', {}],
  ['compartir', '/admin/integration', '.sh-qr img', {}],
  ['ajustes', '/admin/ajustes', '.tm-list li', {}],
  ['seguridad', '/admin/mfa', '.sg-state', {}],
];
const rows = [];
for (const [w, h] of SIZES) {
  for (const [name, path, sel, o] of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'es-ES' });
    const page = await ctx.newPage();
    await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
    if (!o.anon) await page.addInitScript(() => { sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); });
    await page.addInitScript(() => localStorage.setItem('reportia-panel-lang', 'es'));
    if (o.step) {
      await page.goto(`${B}/canal/demo/denuncia?lang=es`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.cats');
      await page.getByRole('radio', { name: /Fraude/ }).click();
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.waitForSelector('#dn-description');
      if (o.step === 3) {
        await page.fill('#dn-description', 'Un proveedor factura cada mes servicios de limpieza que no se prestan en la nave 2 desde marzo.');
        await page.getByLabel('Dónde o en qué área').fill('Nave 2, compras');
        await page.getByRole('button', { name: 'Continuar' }).click();
      }
    } else if (o.mycase) {
      await page.goto(`${B}/canal/demo/consulta?lang=es`, { waitUntil: 'networkidle' });
      await page.getByLabel('Tu código').fill('T8GH5RWD');
      await page.getByRole('button', { name: 'Ver mi caso' }).click();
    } else await page.goto(B + path, { waitUntil: 'networkidle' });
    await page.waitForSelector(sel, { timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    const m = await page.evaluate(() => {
      const vis = el => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
      const lines = el => { const tops = new Set(); const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) { const pe = n.parentElement; if (!n.textContent.trim() || !pe || pe.closest('[data-off], .ds-vh, .v2-vh, [aria-hidden="true"]') || getComputedStyle(pe).visibility === 'hidden') continue; const r = document.createRange(); r.selectNodeContents(n); for (const b of r.getClientRects()) if (b.width > 1) tops.add(Math.round(b.top / 6)); } return tops.size; };
      const txt = el => (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 30);
      const wrapped = [...document.querySelectorAll('.ds-btn, .ds-seg-item, .ds-nav-item, .ds-chip, .ds-tab-label')].filter(vis).filter(el => !el.closest('[aria-hidden="true"]')).filter(el => { const inner = [...el.querySelectorAll('.v2-stable > :not([data-off]), .v2-swap-v:not([data-off])')].filter(vis); const t = inner.length ? inner[0] : el; return (el.innerText || '').trim() && lines(el) > 1; }).map(txt);
      const clipped = [...document.querySelectorAll('.ds-btn, .ds-seg-item, .ds-chip, h1, .ds-card-title, .st-h')].filter(vis).filter(el => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis').map(txt);
      const cols = [...document.querySelectorAll('.ds-kcol')].filter(vis).map(k => [...k.querySelectorAll('.ds-case')].filter(c => c.getBoundingClientRect().bottom <= innerHeight).length);
      const tab = document.querySelector('.ds-pane.is-tab');
      return { scroll: document.documentElement.scrollHeight - innerHeight, over: document.documentElement.scrollWidth - innerWidth, wrapped: [...new Set(wrapped)], clipped: [...new Set(clipped)], cols, tab: tab ? (() => { const b = tab.getBoundingClientRect(); const d = tab.querySelector('.ds-tab-dot')?.getBoundingClientRect(); return { top: Math.round(b.top), h: Math.round(b.height), dot: d ? Math.round(d.top + d.height / 2) : null }; })() : null };
    });
    // La franja, al bajar al final de la página
    let tabAfter = null;
    if (m.tab && m.scroll > 40) {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(200);
      tabAfter = await page.evaluate(() => { const tab = document.querySelector('.ds-pane.is-tab'); const b = tab.getBoundingClientRect(); const d = tab.querySelector('.ds-tab-dot')?.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(innerHeight - b.bottom), dot: d ? Math.round(d.top + d.height / 2) : null }; });
      if (name === 'caso' && w === 1470) await page.screenshot({ path: `${OUT}/${w}x${h}-${name}-al-bajar.png` });
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await page.screenshot({ path: `${OUT}/${w}x${h}-${name}.png` });
    const issues = [];
    if (m.over > 0) issues.push(`desborda ${m.over}px a lo ancho`);
    if (o.fit && m.scroll > 0) issues.push(`no cabe: faltan ${m.scroll}px de alto`);
    if (o.board && (m.cols.length !== 3 || m.cols.some(n => n < 2))) issues.push(`tarjetas a la vista por columna: ${m.cols.join('/')}`);
    if (m.wrapped.length) issues.push(`en dos líneas: ${m.wrapped.join(' | ')}`);
    if (m.clipped.length) issues.push(`cortado: ${m.clipped.join(' | ')}`);
    if (m.tab && Math.abs(m.tab.dot - h / 2) > 90) issues.push(`flecha de la franja a ${m.tab.dot}px (centro ${h / 2})`);
    if (tabAfter && (tabAfter.top < 0 || Math.abs(tabAfter.dot - m.tab.dot) > 3)) issues.push(`franja al bajar: arriba ${tabAfter.top}px, flecha a ${tabAfter.dot}px`);
    rows.push(`${issues.length ? 'MAL ' : 'ok  '} ${w}×${h} ${name.padEnd(18)} ${issues.join(' · ')}`);
    await ctx.close();
  }
}
console.log(rows.filter(r => r.startsWith('MAL')).join('\n'));
console.log(`\n${rows.filter(r => r.startsWith('MAL')).length} de ${rows.length} con algo que arreglar`);
await browser.close();
