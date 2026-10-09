// Móvil real: 360×640 y 390×844, y con el teclado en pantalla (la altura útil baja a ~45 %).
// Que «Continuar» y «Enviar» se puedan alcanzar y pulsar, y que ningún diálogo quede cortado.
import { chromium } from './lib/playwright.mjs';
const OUT = process.argv[2];
const B = 'http://localhost:3111';
const browser = await chromium.launch();
const problems = []; let checks = 0;
const ok = (name, v, extra = '') => { checks++; if (!v) { problems.push(`${name} ${extra}`); console.log(`FALLA ${name} ${extra}`); } };
for (const [w, h] of [[360, 640], [390, 844]]) {
  const kb = Math.round(h * 0.46); // alto que queda con el teclado abierto
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'es-ES' });
  const page = await ctx.newPage();
  page.on('pageerror', e => problems.push(`${w}: ${e.message.slice(0, 160)}`));
  await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
  await page.addInitScript(() => { localStorage.setItem('reportia-panel-lang', 'es'); });
  const T = `${w}×${h}`;
  const over = async (name) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(`${T} ${name}: sin desbordar a lo ancho`, o <= 0, `${o}px`); };
  /** El botón se puede traer a la vista y nada fijo lo tapa */
  const reachable = async (locator, name) => {
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const r = await locator.evaluate(el => { const b = el.getBoundingClientRect(); const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return { inView: b.top >= 0 && b.bottom <= innerHeight, hit: !!top && (el === top || el.contains(top)), wraps: b.height > 70 }; });
    ok(`${T} ${name}: se alcanza y se puede pulsar`, r.inView && r.hit && !r.wraps, JSON.stringify(r));
  };
  /** El diálogo abierto cabe en la pantalla y, si es largo, se puede recorrer */
  const dialogFits = async (name) => {
    await page.locator('dialog[open]').waitFor();
    await page.waitForTimeout(300);
    const r = await page.locator('dialog[open]').evaluate(el => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { top: Math.round(b.top), bottom: Math.round(innerHeight - b.bottom), left: Math.round(b.left), right: Math.round(innerWidth - b.right), scrolls: el.scrollHeight <= el.clientHeight + 1 || /auto|scroll/.test(cs.overflowY) }; });
    ok(`${T} ${name}: el diálogo no queda cortado`, r.top >= 0 && r.bottom >= 0 && r.left >= 0 && r.right >= 0 && r.scrolls, JSON.stringify(r));
    // Sus botones se alcanzan
    const last = page.locator('dialog[open] .ds-dialog-actions .ds-btn').last();
    if (await last.count()) { await last.scrollIntoViewIfNeeded(); const v = await last.evaluate(el => { const b = el.getBoundingClientRect(); return b.top >= -1 && b.bottom <= innerHeight + 1; }); ok(`${T} ${name}: sus botones se alcanzan`, v); }
  };
  const withKeyboard = async (fn) => { await page.setViewportSize({ width: w, height: kb }); await page.waitForTimeout(200); await fn(); await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(150); };

  // ── Denunciar ──
  await page.goto(`${B}/canal/demo?lang=es`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.ds-hero');
  await over('entrada');
  await reachable(page.getByRole('link', { name: 'Empezar a denunciar' }), 'entrada · Empezar');
  await page.screenshot({ path: `${OUT}/movil-${w}x${h}-entrada.png` });
  await page.locator('.entry-linkbtn').first().click();
  await dialogFits('canales externos');
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Empezar a denunciar' }).click();
  await page.waitForSelector('.cats');
  await over('paso 1');
  await page.getByRole('radio', { name: /Fraude/ }).click();
  await reachable(page.getByRole('button', { name: 'Continuar' }), 'paso 1 · Continuar');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.waitForSelector('#dn-description');
  await page.locator('#dn-description').focus();
  await page.keyboard.type('Un proveedor factura cada mes servicios de limpieza que no se prestan en la nave 2.');
  await withKeyboard(async () => {
    await page.screenshot({ path: `${OUT}/movil-${w}x${h}-paso-2-con-teclado.png` });
    await reachable(page.getByRole('button', { name: 'Continuar' }), 'paso 2 con teclado · Continuar');
    await over('paso 2 con teclado');
  });
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.waitForSelector('.opts');
  await page.getByRole('radio', { name: /Sí, con mis datos/ }).check({ force: true });
  await page.locator('#dn-email').focus();
  await page.keyboard.type('prueba@example.com');
  await withKeyboard(async () => { await reachable(page.getByRole('button', { name: 'Enviar denuncia' }), 'paso 3 con teclado · Enviar'); });
  await page.getByRole('radio', { name: /No, prefiero el anonimato/ }).check({ force: true });
  await page.locator('#dn-privacy').check();
  await over('paso 3');
  await reachable(page.getByRole('button', { name: 'Enviar denuncia' }), 'paso 3 · Enviar');
  await page.screenshot({ path: `${OUT}/movil-${w}x${h}-paso-3.png` });
  await page.getByRole('button', { name: 'Enviar denuncia' }).click();
  await page.waitForSelector('.code-big');
  await over('enviada');
  await reachable(page.getByRole('button', { name: 'Ver mi caso' }), 'enviada · Ver mi caso');
  await page.getByRole('button', { name: 'Ver mi caso' }).click();
  await dialogFits('¿has guardado el código?');
  await page.locator('dialog[open] .ds-dialog-actions .ds-btn').last().click();
  await page.waitForSelector('.mc');
  await page.locator('#mc-msg').focus();
  await page.keyboard.type('Puedo aportar más datos.');
  await withKeyboard(async () => { await reachable(page.locator('.mc-compose button[type=submit]'), 'mi caso con teclado · Enviar'); await page.screenshot({ path: `${OUT}/movil-${w}x${h}-mi-caso-con-teclado.png` }); });
  await over('mi caso');
  await page.getByRole('button', { name: 'Más opciones' }).click();
  await dialogFits('menú de mi caso');
  await page.keyboard.press('Escape');

  // ── Gestionar ──
  await page.goto(`${B}/admin/login?from=demo&lang=es`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.ac-form');
  await page.getByLabel('Correo').fill('laura.puig@empresa-demo.es');
  await page.locator('#ac-pw').focus();
  await page.keyboard.type('una-contraseña');
  await withKeyboard(async () => { await reachable(page.getByRole('button', { name: 'Entrar' }), 'acceso con teclado · Entrar'); });
  await over('acceso');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForSelector('.ds-otp');
  await page.locator('.ds-otp-box').first().focus();
  await withKeyboard(async () => { await page.evaluate(() => document.activeElement.scrollIntoView({ block: 'center' })); const b = await page.locator('.ds-otp').evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }); ok(`${T} verificación con teclado: las casillas se ven`, b); await over('verificación'); });
  await page.keyboard.type('481902', { delay: 90 });
  await page.waitForURL(/\/admin\/?$/, { timeout: 10000 });
  await page.waitForSelector('.ds-case');
  await over('tablero');
  // La barra de abajo no tapa la última tarjeta
  const lastCard = page.locator('.ds-case:visible').last();
  await lastCard.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  ok(`${T} tablero: la barra de abajo no tapa la última tarjeta`, await lastCard.evaluate(el => { const b = el.getBoundingClientRect(); const nav = document.querySelector('.ds-nav').getBoundingClientRect(); return b.bottom <= nav.top + 1; }));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await dialogFits('filtros');
  await page.screenshot({ path: `${OUT}/movil-${w}x${h}-filtros.png` });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await page.getByPlaceholder('Referencia o texto').focus();
  await withKeyboard(async () => { await dialogFits('buscar con teclado'); });
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await page.goto(`${B}/admin/complaints/c-vk7p2mqa`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cs-desc');
  await over('ficha del caso');
  await page.locator('.cs-next').getByRole('button', { name: 'Enviar el acuse de recibo' }).click();
  await dialogFits('acuse de recibo');
  await page.locator('dialog[open] textarea').focus();
  await withKeyboard(async () => { await dialogFits('acuse con teclado'); await page.screenshot({ path: `${OUT}/movil-${w}x${h}-acuse-con-teclado.png` }); });
  await page.getByRole('dialog').getByRole('button', { name: 'Enviar el acuse', exact: true }).click();
  await page.locator('.cs-next').getByRole('button', { name: 'Proponer la reunión' }).waitFor();
  await page.locator('#cs-msg').focus();
  await withKeyboard(async () => { await reachable(page.locator('.ds-compose button[type=submit]'), 'ficha con teclado · Enviar mensaje'); });
  await page.goto(`${B}/admin/complaints/c-j6yb3kmv`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cs-desc');
  await page.locator('.cs-next').getByRole('button', { name: 'Responder y cerrar' }).click();
  await dialogFits('responder y cerrar');
  await page.locator('dialog[open] textarea').focus();
  await withKeyboard(async () => { await dialogFits('responder y cerrar con teclado'); });
  await page.keyboard.press('Escape');
  await page.goto(`${B}/admin/nueva`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.rg-form');
  await over('registrar');
  await page.locator('#rg-description').focus();
  await withKeyboard(async () => { await reachable(page.getByRole('button', { name: 'Registrar y obtener el código' }), 'registrar con teclado · Registrar'); });
  await page.goto(`${B}/admin/ajustes`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.tm-list li');
  await over('ajustes');
  await page.getByRole('button', { name: 'Invitar' }).click();
  await page.locator('#tm-inv-email').focus();
  await withKeyboard(async () => { await dialogFits('invitar con teclado'); });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Cambiar los permisos de Daniel Ortega Ruiz' }).click();
  await page.waitForSelector('.tm-perms');
  await dialogFits('permisos');
  ok(`${T} permisos: la tabla cabe a lo ancho`, await page.locator('.tm-perms').evaluate(el => el.getBoundingClientRect().right <= innerWidth));
  await page.screenshot({ path: `${OUT}/movil-${w}x${h}-permisos.png` });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Contratar' }).click();
  await dialogFits('planes');
  await page.keyboard.press('Escape');
  for (const [path, sel, name] of [['/admin/report', '.rp-figs dd', 'informe'], ['/admin/integration', '.sh-list', 'compartir'], ['/admin/mfa', '.sg-state', 'seguridad']]) { await page.goto(B + path, { waitUntil: 'networkidle' }); await page.waitForSelector(sel); await over(name); }
  await page.screenshot({ path: `${OUT}/movil-${w}x${h}-compartir.png` });
  await ctx.close();
}
console.log(problems.length ? `\nPROBLEMAS (${problems.length} de ${checks})` : `\n${checks} comprobaciones en móvil, sin problemas`);
await browser.close();
