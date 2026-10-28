// Contraste medido (WCAG): cada texto visible contra el fondo real que tiene detrás (componiendo las
// transparencias), y los bordes de los campos e iconos contra su fondo. Mínimos: 4,5:1 en texto (3:1 si es
// grande), 3:1 en bordes de campos e iconos. Con «oscuro» (node contraste.mjs oscuro), lo mismo con el sistema en modo
// oscuro. 8b: el canal y el acceso al panel SIEMPRE se ven en claro (dan igual con el sistema en oscuro); el panel
// sí tiene modo oscuro, así que en la tanda «oscuro» se pone la apariencia del perfil en «dark» para medirlo.
import { chromium } from './lib/playwright.mjs';
import { audit } from './lib/contraste.mjs';
const B = 'http://localhost:3111';
const DARK = process.argv[2] === 'oscuro';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES', colorScheme: DARK ? 'dark' : 'light' });
const page = await ctx.newPage();
await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
await page.addInitScript(() => { if (!location.pathname.startsWith('/admin/login') && !location.pathname.includes('password')) { sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); } localStorage.setItem('reportia-panel-lang', 'es'); });
let total = 0; const seen = new Set();
const check = async (name) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(350); const res = (await page.evaluate(audit)).filter(x => { const k = x.split(' — ')[0]; if (seen.has(k)) return false; seen.add(k); return true; }); total += res.length; console.log(`${res.length ? 'MAL' : 'ok '} ${name}${res.length ? '\n   · ' + res.join('\n   · ') : ''}`); };
const go = async (path, sel) => { await page.goto(B + path, { waitUntil: 'networkidle' }); await page.waitForSelector(sel); };
// La portada (página estática): toda la página y después con las preguntas y la ley desplegadas
await go('/?lang=es', '.lp-hero h1'); await check('portada');
await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; })); await check('portada · desplegables abiertos');
await go('/canal/demo?lang=es', '.ds-hero'); await check('canal · entrada');
await page.locator('.entry-linkbtn').first().click(); await page.locator('dialog[open]').waitFor(); await check('canal · canales externos'); await page.keyboard.press('Escape');
await page.locator('.entry-linkbtn').nth(1).click(); await page.locator('dialog[open]').waitFor(); await check('canal · qué guardamos'); await page.keyboard.press('Escape');
await go('/canal/demo/formulario?lang=es', '.cats'); await check('canal · paso 1');
await page.getByRole('radio', { name: /Fraude/ }).click(); await check('canal · paso 1 con tema elegido');
await page.getByRole('button', { name: 'Continuar' }).click(); await page.waitForSelector('#dn-description');
await page.locator('input[type=file]').setInputFiles({ name: 'prueba.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') }); await check('canal · paso 2 con un archivo');
await page.getByRole('button', { name: 'Qué datos se quitan de los archivos' }).click(); await page.locator('dialog[open]').waitFor(); await check('canal · qué datos se quitan'); await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Continuar' }).click(); await check('canal · paso 2 con error');
await page.fill('#dn-description', 'Un proveedor factura cada mes servicios de limpieza que no se prestan en la nave 2 desde marzo.'); await check('canal · paso 2');
await page.getByRole('button', { name: 'Continuar' }).click(); await page.waitForSelector('.opts');
await page.getByRole('button', { name: 'Enviar denuncia' }).click(); await check('canal · paso 3 con error');
await page.getByRole('radio', { name: /Sí, con mis datos/ }).check({ force: true }); await check('canal · paso 3 con datos');
await page.getByRole('radio', { name: /No, prefiero el anonimato/ }).check({ force: true }); await page.locator('#dn-privacy').check();
await page.getByRole('button', { name: 'Enviar denuncia' }).click(); await page.waitForSelector('.code-big'); await check('canal · enviada');
await page.getByRole('button', { name: 'Ver mi caso' }).click(); await page.locator('dialog[open]').waitFor(); await check('canal · ¿has guardado el código?'); await page.locator('dialog[open] .ds-dialog-actions .ds-btn').last().click();
await page.waitForSelector('.mc'); await check('canal · mi caso recién enviada');
await go('/canal/demo/consulta?lang=es', 'form'); await check('canal · escribir el código');
await page.getByLabel('Tu código').fill('ZZZZ9999'); await page.getByRole('button', { name: 'Ver mi caso' }).click(); await page.waitForTimeout(900); await check('canal · código que no existe');
await page.getByLabel('Tu código').fill('F4QJ7MBN'); await page.getByRole('button', { name: 'Ver mi caso' }).click(); await page.waitForSelector('.mc'); await check('canal · mi caso cerrado');
await go('/canal/demo/consulta?lang=es', 'form'); await page.getByLabel('Tu código').fill('T8GH5RWD'); await page.getByRole('button', { name: 'Ver mi caso' }).click(); await page.waitForSelector('.mc-wait'); await check('canal · mi caso esperando tu respuesta');
await go('/canal/demo/privacidad?lang=es', '.priv-sec'); await check('canal · privacidad');
await go('/canal/no-existe?lang=es', '.canal-lost'); await check('canal · no existe');
await page.evaluate(() => { sessionStorage.clear(); });
await go('/admin/login?from=demo&lang=es', '.ac-form'); await check('panel · acceso');
await page.getByRole('button', { name: 'Entrar' }).click(); await check('panel · acceso con error');
await page.getByLabel('Correo').fill('laura.puig@empresa-demo.es'); await page.locator('#ac-pw').fill('una-contraseña'); await page.getByRole('button', { name: 'Entrar' }).click(); await page.waitForSelector('.ds-otp'); await check('panel · verificación');
await go('/admin/forgot-password?from=demo', '.ac-form'); await check('panel · recuperar contraseña');
await go('/admin/reset-password', '.ac-form'); await page.waitForTimeout(500); await check('panel · contraseña nueva');
await page.evaluate(() => { sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); });
await go('/admin', '.ds-case');
// 8b: el panel por defecto es claro; para medir el contraste en oscuro se pone la apariencia del perfil en «dark»
if (DARK) { await page.evaluate(() => { const s = JSON.parse(sessionStorage.getItem('reportia-demo-store-v4') || 'null'); if (s) { const p = (s.profiles || []).find(x => x.id === 'demo-user'); if (p) { p.appearance = 'dark'; sessionStorage.setItem('reportia-demo-store-v4', JSON.stringify(s)); } } }); await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('.ds-case'); await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark').catch(() => {}); }
await check('panel · tablero');
await page.locator('.ds-case').first().hover(); await check('panel · tablero con el ratón en una tarjeta');
await page.getByRole('button', { name: 'Filtrar' }).click(); await page.locator('dialog[open]').waitFor(); await check('panel · filtros'); await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Exportar', exact: true }).click(); await check('panel · menú «Exportar»'); await page.keyboard.press('Escape');
for (const n of await page.locator('.pn-notice-line').all()) await n.click();
await check('panel · avisos desplegados');
await page.locator('.pn-avatar').click(); await check('panel · menú de la cuenta'); await page.keyboard.press('Escape');
await go('/admin?cat=other&pr=low&st=archived', '.pn-filtered'); await check('panel · tablero filtrado y vacío');
await go('/admin/complaints/c-vk7p2mqa', '.cs-desc'); await check('panel · ficha de un caso nuevo');
await page.locator('.cs-next').getByRole('button', { name: 'Enviar el acuse de recibo' }).click(); await page.locator('dialog[open]').waitFor(); await page.getByRole('dialog').locator('textarea').fill(''); await page.getByRole('dialog').getByRole('button', { name: 'Enviar el acuse', exact: true }).click(); await check('panel · acuse con error'); await page.keyboard.press('Escape');
await go('/admin/complaints/c-w2lc9pxa', '.cs-desc'); await check('panel · ficha con datos y mensajes');
await go('/admin/complaints/c-f4qj7mbn', '.cs-desc'); await check('panel · ficha de un caso cerrado');
await go('/admin/complaints/c-p3ve8nqc', '.cs-desc'); await check('panel · ficha en investigación (crítica, vencida)');
await go('/admin/complaints/no-existe', 'h1'); await page.waitForTimeout(500); await check('panel · caso que no existe');
await go('/admin/nueva', '.rg-form'); await page.getByRole('button', { name: 'Registrar y obtener el código' }).click(); await check('panel · registrar con errores');
await go('/admin/report', '.rp-figs dd'); await check('panel · informe');
await go('/admin/integration', '.sh-qr img'); await check('panel · compartir');
await page.locator('.sh-steps-see').click(); await page.waitForSelector('.sh-list'); await check('panel · compartir con los pasos desplegados');
await page.getByRole('button', { name: 'Otras formas de ponerlo en tu web' }).click(); await page.locator('dialog[open]').waitFor(); await check('panel · guía para ponerlo en la web'); await page.keyboard.press('Escape');
await go('/admin/ajustes', '.tm-list li'); await check('panel · equipo y ajustes');
await page.getByRole('button', { name: 'Cambiar los permisos de Daniel Ortega Ruiz' }).click(); await page.waitForSelector('.tm-perms'); await check('panel · permisos'); await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Contratar' }).click(); await page.locator('dialog[open]').waitFor(); await check('panel · planes'); await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Invitar' }).click(); await page.getByRole('button', { name: 'Enviar la invitación' }).click(); await check('panel · invitar con errores'); await page.keyboard.press('Escape');
await go('/admin/mfa', '.sg-state'); await check('panel · verificación en dos pasos');
console.log(`\n${total} combinaciones por debajo del mínimo${DARK ? ' (modo oscuro)' : ''}`);
await browser.close();
