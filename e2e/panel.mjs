import { chromium } from './lib/playwright.mjs';
import { readFileSync } from 'node:fs';
const [OUT, TMP, W] = [process.argv[2], process.argv[3], Number(process.argv[4])];
const H = W === 1440 ? 900 : 812;
const BASE = 'http://localhost:3111';
const mobile = W <= 640;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
const problems = [];
const ok = (name, v, extra = '') => { console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(name); };
page.on('console', m => { if (m.type() === 'error') problems.push(`consola: ${m.text().slice(0, 220)}`); });
page.on('pageerror', e => problems.push(`error: ${e.message.slice(0, 220)}`));
const outside = [];
await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => { outside.push(r.request().url()); r.abort(); });
let n = 0;
async function shot(name, { full = true } = {}) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 0) problems.push(`desbordamiento horizontal de ${over}px en ${name}`);
  const path = `${OUT}/${W}-${String(++n).padStart(2, '0')}-${name}.png`;
  if (mobile && full) {
    const tall = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: W, height: Math.max(H, tall) });
    await page.waitForTimeout(250);
    await page.screenshot({ path });
    await page.setViewportSize({ width: W, height: H });
  } else await page.screenshot({ path, fullPage: full });
}
const toast = async (text) => { await page.getByText(text).first().waitFor({ timeout: 8000 }); };

// 1 · Acceso sin empresa y con empresa
await page.addInitScript(() => { try { localStorage.setItem('reportia-panel-lang', 'es'); } catch {} });
await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ac-form');
ok('acceso sin empresa: «Gestionar» sin nombre', await page.getByText('Entra con tu correo de trabajo.').isVisible());
if (!mobile) ok('sin empresa, la franja lleva a la portada', (await page.locator('.ds-tab').getAttribute('href')).startsWith('/?'));
await shot('G1-acceso-sin-empresa');
await page.goto(`${BASE}/admin/login?from=demo`, { waitUntil: 'networkidle' });
await page.getByText('Entra con tu correo de Empresa Demo.').waitFor();
if (!mobile) ok('con empresa, la franja lleva al paso 1', (await page.locator('.ds-tab').getAttribute('href')).startsWith('/canal/demo/denuncia'));
await page.getByRole('button', { name: 'Entrar' }).click();
ok('acceso: avisa si falta el correo', await page.getByText('Escribe un correo válido.').isVisible());
await page.getByLabel('Correo').fill('laura.puig@empresa-demo.es');
await page.locator('#ac-pw').fill('una-contraseña');
await shot('G1-acceso');
await page.getByRole('button', { name: 'Entrar' }).click();

// 2 · Verificación en dos pasos
await page.waitForSelector('.ds-otp');
await page.getByRole('button', { name: 'No tengo el móvil a mano' }).click();
ok('sin códigos de recuperación: texto de ayuda', await page.getByText('pide a un administrador de tu empresa o a Reportia').isVisible());
await page.locator('.ds-otp-box').first().focus();
await page.keyboard.type('4819');
await shot('G1b-verificacion');
await page.locator('.ds-otp-box').first().focus();
await page.evaluate(() => { const dt = new DataTransfer(); dt.setData('text', '481 902'); document.activeElement.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
await page.waitForURL(/\/admin\/?$/, { timeout: 10000 });
ok('pegar el código rellena las 6 casillas y entra solo', true);

// 3 · Tablero
await page.waitForSelector('.ds-case');
const h1 = (await page.locator('h1').first().innerText()).trim();
ok('tablero: titular con los casos que necesitan algo hoy', /casos? te necesitan? hoy|Todo al día/.test(h1), h1);
ok('tres columnas con casos', await page.locator('.ds-kcol').count() === 3);
ok('chip de plazo lejano con «para responder»', mobile || await page.locator('.ds-chip', { hasText: /\d+ días para responder/ }).count() > 0);
ok('aviso de casos que deben suprimirse', await page.locator('.pn-banner').count() >= 0);
if (!mobile) {
  const rows = async () => page.evaluate(() => { const h = document.querySelector('.pn-head'); const tops = new Set([...h.children].map(c => Math.round(c.getBoundingClientRect().top / 30))); return tops.size; });
  ok('cabecera del panel en una sola línea a 1440 px', await rows() === 1, `alto ${await page.locator('.pn-head').evaluate(el => Math.round(el.getBoundingClientRect().height))}px`);
}
await shot(mobile ? 'M4-tablero' : 'G2-tablero');
if (mobile) {
  await page.getByRole('tab', { name: /En curso/ }).click();
  await shot('M4-tablero-en-curso');
  await page.getByRole('tab', { name: /Nuevas/ }).click();
} else {
  const card = page.locator('.ds-kcol').first().locator('.ds-case').first();
  ok('«Mover a…» oculto hasta pasar el ratón', await card.locator('.ds-case-move').evaluate(el => getComputedStyle(el).opacity === '0'));
  await card.hover();
  await page.waitForTimeout(200);
  ok('«Mover a…» aparece al pasar el ratón (como flecha, sin tapar los chips)', await card.locator('.ds-case-move').evaluate(el => getComputedStyle(el).opacity === '1' && el.getBoundingClientRect().width <= 44));
  await shot('G2-tablero-mover', { full: false });
}
// Filtrar
await page.getByRole('button', { name: /^Filtrar/ }).click();
await page.getByLabel('Prioridad').selectOption('high');
if (await page.getByLabel('Solo los míos').count()) ok('filtro «solo los míos» disponible', true);
await shot('G2-filtrar', { full: false });
await page.getByRole('button', { name: 'Listo' }).click();
ok('el filtro queda en la dirección', /pr=high/.test(page.url()));
await shot('G2-tablero-filtrado');
await page.getByRole('button', { name: 'Quitar filtros' }).click();
// Menú «···» y exportaciones
await page.getByRole('button', { name: 'Más acciones' }).click();
await shot('G2-menu-exportar', { full: false });
const [xls] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('button', { name: 'Libro-registro (Excel)' }).click()]);
await xls.saveAs(`${TMP}/libro-${W}.xlsx`);
ok('libro-registro en Excel', readFileSync(`${TMP}/libro-${W}.xlsx`).length > 5000, xls.suggestedFilename());
// Buscar por texto
await page.getByRole('button', { name: 'Buscar' }).click();
await page.getByPlaceholder('Referencia o texto').fill('carretilla');
await page.locator('.pn-found button').first().waitFor();
ok('buscar por texto encuentra el caso', await page.locator('.pn-found').getByText(/Carretilla/).isVisible());
await shot('G2-buscar', { full: false });
await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();

// 4 · Mover con el teclado abre la ficha con el acuse preparado
if (!mobile) {
  const move = page.locator('.ds-kcol').first().locator('.ds-case', { hasText: 'Comentarios sexuales' }).getByRole('button', { name: /Mover a «En curso»/ });
  await page.locator('.ds-kcol').first().locator('.ds-case', { hasText: 'Comentarios sexuales' }).getByRole('link').focus();
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  ok('con Tab, el foco llega al botón «Mover a…»', await move.evaluate(el => document.activeElement === el));
  ok('«Mover a…» visible (flecha con nombre) al llegar con el teclado', await move.evaluate(el => getComputedStyle(el).opacity === '1' && /Mover a/.test(el.getAttribute('title'))));
  await shot('G2-tablero-mover-con-teclado', { full: false });
  await page.keyboard.press('Enter');
} else {
  await page.locator('.ds-case', { hasText: 'Comentarios sexuales' }).getByRole('link').click();
}
await page.waitForSelector('.cs');
if (!mobile) {
  ok('mover no envía nada: abre el acuse preparado', await page.getByRole('dialog').getByText('Acuse de recibo').isVisible());
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
}
ok('ficha: siguiente paso = enviar el acuse', await page.locator('.cs-next').getByRole('button', { name: 'Enviar el acuse de recibo' }).isVisible());
ok('ficha: plazo legal de la reunión y lo que queda', await page.locator('.cs-deadlines').getByText(/para la reunión \(plazo legal: 7 días\)/).isVisible());
ok('ficha: el «cuándo» en su casilla', await page.locator('.cs-facts').getByText('Desde septiembre').isVisible());
await shot('G3-caso');

// 5 · El recorrido del caso: acuse → reunión → investigación → respuesta y cierre
await page.locator('.cs-next').getByRole('button', { name: 'Enviar el acuse de recibo' }).click();
await shot('G3-acuse', { full: false });
await page.getByRole('dialog').getByRole('button', { name: 'Enviar el acuse', exact: true }).click();
await toast('Acuse enviado');
await page.locator('.cs-next').getByRole('button', { name: 'Proponer la reunión' }).waitFor();
ok('tras el acuse: «Proponer la reunión»', true);
await page.locator('.cs-next').getByRole('button', { name: 'Proponer la reunión' }).click();
ok('la propuesta queda escrita para revisarla, sin enviar', (await page.locator('#cs-msg').inputValue()).includes('[día]'));
await page.locator('#cs-msg').fill('Te proponemos reunirnos el jueves a las 10:00 en la sala 2. Si no te va bien, dinos otro momento.');
await page.locator('.ds-compose').getByRole('button', { name: 'Enviar' }).click();
await page.locator('.cs-next').getByRole('button', { name: 'Marcar la reunión como hecha' }).waitFor();
await shot('G3-caso-reunion');
await page.locator('.cs-next').getByRole('button', { name: 'Marcar la reunión como hecha' }).click();
await toast('Reunión marcada como hecha');
await page.locator('.cs-next').getByRole('button', { name: 'Iniciar la investigación' }).click();
await toast('Investigación iniciada');
// Estados del menú «···»
await page.getByRole('button', { name: 'Más acciones' }).click();
await shot('G3-menu', { full: false });
await page.getByRole('button', { name: 'Esperar a quien informa' }).click();
await page.locator('.ds-chip', { hasText: 'Esperando a quien informa' }).waitFor();
ok('«···»: esperar a quien informa', true);
await page.getByRole('button', { name: 'Más acciones' }).click();
await page.getByRole('button', { name: 'Ampliar el plazo de respuesta' }).click();
await page.getByRole('dialog').locator('textarea').fill('Hay que revisar la documentación de tres turnos.');
await shot('G3-ampliar-plazo', { full: false });
await page.getByRole('dialog').getByRole('button').last().click();
await page.locator('.ds-chip', { hasText: 'Plazo ampliado' }).waitFor();
ok('«···»: ampliar el plazo con motivo', true);
// Título, asignación, prioridad y nota
if (await page.getByRole('button', { name: 'Cambiar el título' }).count()) {
  await page.getByRole('button', { name: 'Cambiar el título' }).click();
  await page.getByLabel('Título del caso').fill('Comentarios sexuales del responsable del turno de noche');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'Comentarios sexuales del responsable del turno de noche' }).waitFor();
  ok('título editable con el lápiz', true);
}
await page.getByLabel('Quién lo lleva').selectOption({ label: 'Núria Soler Vidal' });
await page.locator('.cs-hist').getByText(/asignado a Núria Soler Vidal/).waitFor();
ok('quién lo lleva: se guarda y queda en el historial', true);
await page.getByRole('button', { name: 'Añadir nota interna' }).click();
await page.getByRole('dialog').locator('textarea').fill('Hablar con RR. HH. antes del jueves.');
await page.getByRole('dialog').getByRole('button', { name: 'Guardar nota', exact: true }).click();
await toast('Nota guardada');
// Responder y cerrar
await page.locator('.cs-next').getByRole('button', { name: 'Responder y cerrar' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Enviar y cerrar', exact: true }).click();
ok('no cierra sin resultado', await page.getByText('Elige un resultado.').isVisible());
await page.getByRole('dialog').getByLabel('Resultado').selectOption('founded');
await page.getByRole('dialog').locator('textarea').fill('Hemos comprobado los hechos y se han tomado medidas. Gracias por contarlo.');
await shot('G3-responder-y-cerrar', { full: false });
await page.getByRole('dialog').getByRole('button', { name: 'Enviar y cerrar', exact: true }).click();
await toast('Respuesta enviada');
await page.locator('.cs-next-note.is-done').waitFor();
ok('caso cerrado con resultado y respuesta final', (await page.locator('.cs-next-note.is-done').innerText()).startsWith('Cerrada el'));
await shot('G3-caso-cerrado');
// Remitir al Fiscal: diálogo propio
await page.getByRole('button', { name: 'Remitir al Ministerio Fiscal' }).click();
ok('remitir al Fiscal avisa de que no se puede deshacer', await page.getByRole('dialog').getByText('No se puede deshacer').isVisible());
await shot('G3-fiscal', { full: false });
await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
// PDF del caso
const [pdf] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('button', { name: 'Exportar PDF' }).click()]);
await pdf.saveAs(`${TMP}/caso-${W}.pdf`);
ok('PDF del caso', readFileSync(`${TMP}/caso-${W}.pdf`).subarray(0, 5).toString() === '%PDF-', pdf.suggestedFilename());
await page.getByRole('link', { name: 'Tablero' }).first().click();
await page.waitForSelector('.ds-case');
if (mobile) await page.getByRole('tab', { name: /Cerradas/ }).click();
ok('el caso cerrado está en «Cerradas»', await page.locator('.ds-kcol').nth(2).getByText('Comentarios sexuales del responsable').isVisible());

// 6 · Identidad con registro (caso con datos)
await page.goto(`${BASE}/admin/complaints/c-w2lc9pxa`, { waitUntil: 'networkidle' });
await page.waitForSelector('.cs');
if (await page.getByRole('button', { name: 'Ver la identidad' }).count()) {
  await page.getByRole('button', { name: 'Ver la identidad' }).click();
  await page.locator('.cs-ident').waitFor();
  ok('ver la identidad queda anotado en el historial', await page.locator('.cs-hist').getByText(/ha consultado la identidad/).first().waitFor({ timeout: 5000 }).then(() => true, () => false));
  await shot('G3-caso-con-datos');
}

// 7 · Registrar un caso telefónico
await page.goto(`${BASE}/admin/nueva`, { waitUntil: 'networkidle' });
await page.waitForSelector('.rg-form');
await page.getByRole('button', { name: 'Registrar y obtener el código' }).click();
ok('registrar: pide tema y texto', await page.getByText('Elige un tema.').isVisible());
await page.getByLabel('Tema').selectOption('safety');
await page.locator('#rg-description').fill('Llama una persona del muelle de carga: la carretilla elevadora del turno de tarde no tiene revisión desde marzo y los frenos fallan.');
await page.getByLabel('Dónde').fill('Muelle de carga');
await page.getByLabel('Cuándo').fill('Desde marzo');
ok('G7 cita el art. 26 para el libro-registro', await page.locator('.rg-aside').getByText(/art\. 26 de la Ley 2\/2023/).isVisible());
await shot('G7-registrar');
await page.getByRole('button', { name: 'Registrar y obtener el código' }).click();
await page.waitForSelector('.rg-code');
const code = (await page.locator('.rg-code .code-big').textContent()).trim();
ok('registrada: código para entregar, con aviso de que no se vuelve a mostrar', /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code) && await page.getByText('No se volverá a mostrar').isVisible(), code);
await shot('G7-registrada');
await page.getByRole('link', { name: 'Abrir el caso' }).click();
await page.waitForSelector('.cs');
ok('el caso registrado consta como recibido por teléfono', await page.locator('.cs-meta').innerText().then(t => /por teléfono/.test(t)));
ok('el código secreto no aparece en el panel', !(await page.locator('body').innerText()).includes(code));
// Con ese código, quien informa puede seguir el caso
await page.goto(`${BASE}/canal/demo/consulta?lang=es`, { waitUntil: 'networkidle' });
await page.getByLabel('Tu código').fill(code);
await page.getByRole('button', { name: 'Ver mi caso' }).click();
await page.waitForSelector('.mc');
ok('quien informa abre el caso registrado con su código', true);

await page.goto(`${BASE}/admin/forgot-password?from=demo`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ac-form');
await page.getByRole('button', { name: 'Enviar el enlace' }).click();
ok('recuperar contraseña: pide un correo válido', await page.getByText('Escribe un correo válido.').isVisible());
await page.getByLabel('Correo').fill('laura.puig@empresa-demo.es');
await shot('G1-recuperar-contrasena');
await page.getByRole('button', { name: 'Enviar el enlace' }).click();
await page.getByText('Revisa tu correo').waitFor();
await shot('G1-recuperar-contrasena-enviado');
await page.goto(`${BASE}/admin/reset-password`, { waitUntil: 'networkidle' });
await page.getByLabel('Contraseña nueva').waitFor();
await page.getByLabel('Contraseña nueva').fill('una-clave-larga');
await page.getByLabel('Repite la contraseña').fill('una-clave-larg');
await page.getByRole('button', { name: 'Guardar la contraseña' }).click();
ok('cambiar contraseña: avisa si no coinciden', await page.getByText('Las contraseñas no coinciden.').isVisible());
await shot('G1-cambiar-contrasena');

// 9 · Otro idioma y cierre de sesión
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-case');
await page.locator('.pn-avatar').click();
await shot('G2-menu-cuenta', { full: false });
await page.getByRole('button', { name: 'English' }).click();
await page.keyboard.press('Escape');
await page.getByText(/need you today|All up to date/).waitFor();
await shot('G2-tablero-ingles');
await page.locator('.pn-avatar').click();
await page.getByRole('button', { name: 'Sign out' }).click();
await page.waitForURL(/\/admin\/login/);
ok('cerrar sesión vuelve al acceso', true);

ok('ninguna petición sale del ordenador', outside.length === 0, outside.slice(0, 3).join(' '));
console.log(problems.length ? `\nPROBLEMAS (${problems.length}):\n- ${[...new Set(problems)].join('\n- ')}` : '\nSin problemas');
await browser.close();
