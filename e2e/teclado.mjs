// Recorrido SOLO con teclado: Tab, Shift+Tab, Enter, Espacio y Esc. Sin un solo clic de ratón.
import { chromium } from './lib/playwright.mjs';
const browser = await chromium.launch();
const B = 'http://localhost:3111';
const problems = []; let checks = 0;
const ok = (name, v, extra = '') => { checks++; console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(`${name} ${extra}`); };
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' });
const page = await ctx.newPage();
page.on('pageerror', e => problems.push(`error: ${e.message.slice(0, 200)}`));
await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
await page.addInitScript(() => { if (!location.pathname.startsWith('/admin/login')) { sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); } localStorage.setItem('reportia-panel-lang', 'es'); });

// Qué tiene el foco: nombre, si el foco se ve, si está en pantalla y si está dentro de un diálogo abierto
const focused = () => page.evaluate(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  const after = getComputedStyle(el, '::after');
  const sib = el.matches('input[type=checkbox], input[type=radio], input[type=file]') ? el.nextElementSibling ?? el.parentElement : null;
  const ring = (c) => c && c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 2;
  const visible = ring(cs) || ring(after) || (sib && ring(getComputedStyle(sib))) || (el.parentElement && ring(getComputedStyle(el.parentElement)));
  const label = el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby').split(' ')[0])?.innerText)
    || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.innerText) || el.closest('label')?.innerText || el.innerText || el.getAttribute('title') || el.getAttribute('placeholder') || '';
  const r = el.getBoundingClientRect();
  return { tag: el.tagName.toLowerCase(), name: label.replace(/\s+/g, ' ').trim().slice(0, 44), visible, inDialog: !!el.closest('dialog[open]'), y: Math.round(r.top + scrollY), x: Math.round(r.left), onScreen: r.bottom > 0 && r.top < innerHeight && r.width > 0, fixed: !!el.closest('.ds-nav') && getComputedStyle(el.closest('.ds-nav')).position === 'fixed', html: el.outerHTML.slice(0, 80) };
});
/** Da la vuelta entera con Tab y comprueba cada parada. Devuelve la lista de paradas. */
async function tour(name, { max = 90, inDialog = false } = {}) {
  const stops = []; const bad = []; let wraps = 0;
  // Se empieza desde arriba, sin nada enfocado (dentro de un diálogo, desde donde esté el foco)
  if (!inDialog) await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const f = await focused();
    if (!f) { if (++wraps > 1) break; continue; } // el foco pasa por la barra del navegador y vuelve
    const key = f.html + f.y + ':' + f.x;
    if (stops.length && stops[stops.length - 1].key === key) continue;
    if (stops.some(s => s.key === key)) break; // vuelta completa
    if (stops.length && /ds-skip/.test(f.html)) break; // otra vez el primer enlace: vuelta completa
    stops.push({ ...f, key });
    if (!f.name) bad.push(`sin nombre: ${f.html}`);
    if (!f.visible) bad.push(`foco que no se ve: ${f.name || f.html}`);
    if (!f.onScreen) bad.push(`el foco queda fuera de la pantalla: ${f.name || f.html}`);
    if (inDialog && !f.inDialog) bad.push(`el foco se sale del diálogo: ${f.name || f.html}`);
  }
  // Orden: de arriba abajo; se avisa si el foco salta hacia arriba más de 300 px (salvo al dar la vuelta)
  for (let i = 1; i < stops.length && !inDialog; i++) if (stops[i].y < stops[i - 1].y - 300 && stops[i].x <= stops[i - 1].x + 40 && !/ds-tab|ds-nav-item/.test(stops[i].html) && !/ds-tab/.test(stops[i - 1].html)) bad.push(`salto hacia arriba: «${stops[i - 1].name}» → «${stops[i].name}»`);
  if (process.env.DBG) console.log('   · ' + stops.map(x => x.name || x.html.slice(0, 30)).join(' | '));
  ok(`${name}: ${stops.length} paradas con nombre, foco visible y orden lógico`, bad.length === 0 && stops.length > 0, bad.slice(0, 6).join(' · '));
  return stops;
}
/** Lleva el foco con Tab hasta el control cuyo nombre contiene el texto */
async function tabTo(text, max = 120) {
  for (let i = 0; i < max; i++) { await page.keyboard.press('Tab'); const f = await focused(); if (f && f.name.includes(text)) return f; }
  throw new Error(`no llego con Tab a «${text}»`);
}
/** Un diálogo abierto: el foco entra, no sale al dar la vuelta, Esc lo cierra y el foco vuelve a quien lo abrió */
async function dialogCheck(name, openerText) {
  await page.locator('dialog[open]').waitFor({ timeout: 6000 });
  await page.waitForTimeout(250);
  await tour(`${name} (diálogo)`, { inDialog: true, max: 40 });
  await page.keyboard.press('Shift+Tab');
  ok(`${name}: Shift+Tab tampoco sale del diálogo`, (await focused())?.inDialog === true);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
  const closed = await page.locator('dialog[open]').count() === 0;
  const f = await focused();
  ok(`${name}: Esc lo cierra y el foco vuelve`, closed && !!f && (!openerText || f.name.includes(openerText)), f ? `foco en «${f.name}»` : 'foco perdido');
}

// ══ LADO DENUNCIAR ══
await page.goto(`${B}/canal/demo?lang=es`, { waitUntil: 'networkidle' });
await page.waitForSelector('.entry-main');
await page.keyboard.press('Tab');
ok('entrada: lo primero es «Ir al contenido»', ((await focused())?.name ?? '').includes('Ir al contenido'), (await focused())?.name);
await page.goto(`${B}/canal/demo?lang=es`, { waitUntil: 'networkidle' });
await page.waitForSelector('.entry-main');
await tour('entrada del canal');
await tabTo('Canales externos');
await page.keyboard.press('Enter');
await dialogCheck('canales externos', 'Canales externos');
await tabTo('Qué guardamos');
await page.keyboard.press('Space');
await dialogCheck('qué guardamos y qué no', 'Qué guardamos');
// Denuncia entera sin ratón
await page.goto(`${B}/canal/demo?lang=es`, { waitUntil: 'networkidle' });
await page.waitForSelector('.entry-main');
await tabTo('Empezar');
await page.keyboard.press('Enter');
await page.waitForURL(/denuncia/);
await page.waitForSelector('.cats');
await tour('paso 1: qué ha pasado');
await page.goto(`${B}/canal/demo/denuncia?lang=es`, { waitUntil: 'networkidle' });
await page.waitForSelector('.cats');
await tabTo('Fraude');
await page.keyboard.press('Space');
await page.waitForTimeout(500);
if (!/Cuéntalo|cuéntalo/.test(await page.locator('h1').first().innerText())) { await tabTo('Continuar'); await page.keyboard.press('Enter'); }
await page.locator('textarea').first().waitFor();
ok('paso 2: se llega eligiendo el tema con el teclado', true);
await tour('paso 2: cuéntalo');
await page.locator('textarea').first().focus();
await page.keyboard.type('Prueba hecha solo con el teclado: un proveedor factura servicios que no se han prestado.');
await tabTo('Continuar');
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
await tour('paso 3: identidad y envío');
await tabTo('Creo que lo que cuento');
await page.keyboard.press('Space');
await tabTo('Enviar');
await page.keyboard.press('Enter');
await page.locator('.code-big, .sent-code, [class*="code"]').first().waitFor({ timeout: 10000 });
ok('denuncia enviada sin tocar el ratón', /enviad|Guarda/i.test(await page.locator('h1').first().innerText()), await page.locator('h1').first().innerText());
await tour('denuncia enviada');
// Mi caso
await page.goto(`${B}/canal/demo/consulta?lang=es`, { waitUntil: 'networkidle' });
await page.getByLabel('Tu código').waitFor();
await tabTo('Tu código');
await page.keyboard.type('T8GH5RWD');
await page.keyboard.press('Enter');
await page.waitForSelector('.mc');
await tour('mi caso');

// ══ LADO GESTIONAR ══
await page.evaluate(() => { sessionStorage.removeItem('reportia-demo-session'); sessionStorage.removeItem('reportia-demo-aal'); });
await page.goto(`${B}/admin/login?from=demo&lang=es`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ac-form');
await tour('acceso');
await tabTo('Correo');
await page.keyboard.type('laura.puig@empresa-demo.es');
await page.keyboard.press('Tab');
await page.keyboard.type('una-contraseña');
await page.keyboard.press('Enter');
await page.waitForSelector('.ds-otp');
await tour('verificación en dos pasos');
await page.locator('.ds-otp-box').first().focus();
await page.keyboard.type('481902', { delay: 90 });
await page.waitForURL(/\/admin\/?$/, { timeout: 10000 });
await page.waitForSelector('.ds-case');
ok('entrar al panel solo con teclado', true);
await page.waitForTimeout(600);
await tour('tablero', { max: 140 });
await page.goto(`${B}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-case');
await tabTo('Buscar');
await page.keyboard.press('Enter');
await dialogCheck('buscar un caso', 'Buscar');
await tabTo('Filtrar');
await page.keyboard.press('Enter');
await dialogCheck('filtros', 'Filtrar');
await tabTo('Más acciones');
await page.keyboard.press('Enter');
ok('menú «···»: se abre con Enter', await page.locator('.ds-menu-panel').count() === 1);
await page.keyboard.press('Tab');
ok('menú «···»: Tab entra en sus opciones', ((await focused())?.name ?? '').includes('Excel'), (await focused())?.name);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
ok('menú «···»: Esc lo cierra y el foco vuelve al botón', await page.locator('.ds-menu-panel').count() === 0 && ((await focused())?.name ?? '').includes('Más acciones'));
// Ficha del caso
await page.goto(`${B}/admin/complaints/c-vk7p2mqa`, { waitUntil: 'networkidle' });
await page.waitForSelector('.cs-desc');
await tour('ficha del caso', { max: 140 });
await page.goto(`${B}/admin/complaints/c-vk7p2mqa`, { waitUntil: 'networkidle' });
await page.waitForSelector('.cs-desc');
await tabTo('Enviar el acuse de recibo');
await page.keyboard.press('Enter');
await dialogCheck('acuse de recibo', 'Enviar el acuse');
await tabTo('Añadir nota interna');
await page.keyboard.press('Space');
await dialogCheck('nota interna', 'Añadir nota');
// Registrar, informe, compartir, ajustes y seguridad
for (const [path, sel, name] of [['/admin/nueva', '.rg-form', 'registrar una denuncia'], ['/admin/report', '.rp-figs dd', 'informe'], ['/admin/integration', '.sh-list', 'compartir el canal'], ['/admin/ajustes', '.tm-list li', 'equipo y ajustes'], ['/admin/mfa', '.sg-state', 'verificación (ajustes)']]) {
  await page.goto(`${B}${path}`, { waitUntil: 'networkidle' });
  await page.waitForSelector(sel);
  await page.waitForTimeout(400);
  await tour(name, { max: 140 });
}
await page.goto(`${B}/admin/ajustes`, { waitUntil: 'networkidle' });
await page.waitForSelector('.tm-list li');
await tabTo('Invitar');
await page.keyboard.press('Enter');
await dialogCheck('invitar', 'Invitar');
await tabTo('Cambiar los permisos de Daniel');
await page.keyboard.press('Enter');
await page.waitForSelector('.tm-perms');
await tabTo('Ver: Medio ambiente');
await page.keyboard.press('Space');
ok('permisos: la casilla se marca con Espacio', await page.getByRole('checkbox', { name: 'Ver: Medio ambiente' }).isChecked());
await page.keyboard.press('Escape');
await page.getByText('Hay cambios sin guardar.').waitFor();
ok('permisos: Esc con cambios pregunta antes de cerrar', true);
await tabTo('Salir sin guardar');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
ok('permisos: se cierra y no queda ningún diálogo abierto', await page.locator('dialog[open]').count() === 0);
await tabTo('Contratar');
await page.keyboard.press('Enter');
await dialogCheck('planes y precios', 'Contratar');
// Menú de la cuenta: idioma y salir
await page.goto(`${B}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-case');
await tabTo('Laura Puig');
await page.keyboard.press('Enter');
await tabTo('Cerrar sesión', 12);
await page.keyboard.press('Enter');
await page.waitForURL(/\/admin\/login/);
ok('cerrar sesión con el teclado', true);

console.log(problems.length ? `\nPROBLEMAS (${problems.length} de ${checks}):\n${problems.join('\n')}` : `\n${checks} comprobaciones de teclado, sin problemas`);
await browser.close();
