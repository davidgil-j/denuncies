import { chromium } from './lib/playwright.mjs';
const [OUT, W] = [process.argv[2], Number(process.argv[3])];
const H = W === 1440 ? 900 : 812;
const BASE = 'http://localhost:3111';
const mobile = W <= 640;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'], locale: 'es-ES' });
const page = await ctx.newPage();
const problems = [];
const ok = (name, v, extra = '') => { console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(name); };
page.on('console', m => { if (m.type() === 'error') problems.push(`consola: ${m.text().slice(0, 300)}`); });
page.on('pageerror', e => problems.push(`error: ${e.message.slice(0, 300)}`));
await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
await page.addInitScript(() => { if (!location.pathname.startsWith('/admin/login')) { sessionStorage.setItem('reportia-demo-session', '1'); if (!sessionStorage.getItem('f4-no-aal')) sessionStorage.setItem('reportia-demo-aal', '2'); } if (!localStorage.getItem('reportia-panel-lang')) localStorage.setItem('reportia-panel-lang', 'es'); });
let n = 0;
async function shot(name, { view = false } = {}) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(450);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 0) problems.push(`desbordamiento horizontal de ${over}px en ${name}`);
  const path = `${OUT}/${W}-${String(++n).padStart(2, '0')}-${name}.png`;
  if (view) await page.screenshot({ path });
  else if (mobile) {
    const tall = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: W, height: Math.max(H, tall) });
    await page.waitForTimeout(250);
    await page.screenshot({ path });
    await page.setViewportSize({ width: W, height: H });
  } else await page.screenshot({ path, fullPage: true });
}
const toast = async (text) => { await page.locator('.pn-toast', { hasText: text }).first().waitFor({ timeout: 8000 }); await page.locator('.pn-toast').waitFor({ state: 'detached', timeout: 8000 }); };
const store = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('reportia-demo-store-v4')));
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// 1 · Canal de ejemplo: «Gestionar» lleva a crear cuenta, no al acceso
await page.goto(`${BASE}/canal/demo?lang=es`, { waitUntil: 'networkidle' });
await page.waitForSelector('.entry-main');
const manageHref = await page.locator(mobile ? '.entry-compact' : '.entry-wide .ds-btn').getAttribute('href');
ok('canal de ejemplo: «Gestionar» lleva a /crear-compte', manageHref === '/crear-compte?lang=es', manageHref);
ok('canal de ejemplo: el botón lo dice', mobile ? await page.getByText('Crea el canal de tu empresa').isVisible() : await page.getByText('Crear mi canal').isVisible());
ok('canal de ejemplo: ningún enlace al acceso real', await page.locator('a[href*="/admin/login"]').count() === 0);
await shot('00-entrada-canal-de-ejemplo');
await page.goto(`${BASE}/canal/demo/denuncia?lang=es`, { waitUntil: 'networkidle' });
await page.waitForSelector('.flow');
if (!mobile) ok('canal de ejemplo: la franja «Gestionar» también lleva a /crear-compte', (await page.locator('.ds-tab.is-manage').getAttribute('href')) === '/crear-compte?lang=es');
ok('en la denuncia tampoco hay enlace al acceso real', await page.locator('a[href*="/admin/login"]').count() === 0);
await page.goto(`${BASE}${manageHref}`, { waitUntil: 'networkidle' });
ok('la página de crear cuenta abre en castellano', await page.evaluate(() => document.documentElement.lang) === 'es');

// 2 · Tablero: anillo de primeros pasos
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-case');
await page.waitForSelector('.pn-steps');
ok('tablero: saluda a Laura (como las maquetas)', (await page.locator('.pn-hello > span').innerText()).includes('Laura'));
ok('tablero: anillo 3/5', (await page.locator('.pn-ring b').innerText()) === '3/5');
ok('tablero: dice lo que falta', (await page.locator('.pn-steps-txt').innerText()).includes('Falta: cartel con QR y comunicar a la AIPI'));
ok('tablero: el anillo lleva a Compartir', (await page.locator('.pn-steps').getAttribute('href')) === '/admin/integration');
ok('tablero: sin aviso rojo de la AIPI mientras hay plazo', await page.locator('.pn-banner.is-danger').count() === 0);
await shot('G2-tablero-primeros-pasos', { view: true });

// 3 · Compartir
await page.locator('.pn-steps').click();
await page.waitForURL(/\/admin\/integration/);
await page.waitForSelector('.sh-qr img');
await page.waitForSelector('.sh-list');
ok('compartir: 3 de 5', (await page.locator('.sh-steps-head > span').innerText()) === '3 de 5');
ok('compartir: tres pasos hechos y dos pendientes', await page.locator('.sh-list li.is-done').count() === 3 && await page.locator('.sh-list li').count() === 5);
ok('compartir: lo siguiente es el cartel', await page.getByText('Imprime el cartel y cuélgalo en los tablones y zonas comunes.').isVisible());
ok('compartir: el QR es de verdad', (await page.locator('.sh-qr img').getAttribute('src')).startsWith('data:image/png'));
await shot('G4-compartir');
await page.locator('.sh-cards').getByRole('button', { name: 'Copiar enlace' }).click();
ok('copiar enlace: va al portapapeles', (await page.evaluate(() => navigator.clipboard.readText())) === `${BASE}/canal/demo`);
await page.getByRole('button', { name: 'Copiar el código' }).click();
const code1 = await page.evaluate(() => navigator.clipboard.readText());
ok('copiar el código: botón azul con el enlace del canal', code1.includes(`href="${BASE}/canal/demo"`) && code1.includes('#2F54EB') && code1.includes('rel="noopener noreferrer"') && code1.includes('>Canal ético<'), code1.slice(0, 80));
await page.getByRole('group', { name: 'Formato' }).getByRole('button', { name: 'Enlace de texto' }).click();
await page.locator('.sh-cards > section').nth(2).getByRole('button', { name: 'Català' }).click();
await page.getByRole('button', { name: 'Copiar el código' }).click();
const code2 = await page.evaluate(() => navigator.clipboard.readText());
ok('formato enlace en catalán: sin estilos y con el texto en catalán', !code2.includes('style=') && code2.includes('>Canal ètic<'), code2);
await page.getByText('Ver el código').click();
ok('ver el código: es el mismo que se copia', (await page.locator('.sh-code code').innerText()) === code2);
await page.locator('.sh-cards > section').nth(3).getByRole('button', { name: 'English' }).click();
await page.getByRole('button', { name: 'Copiar el texto' }).click();
const legal = await page.evaluate(() => navigator.clipboard.readText());
ok('texto legal en inglés con la empresa y la dirección', legal.startsWith('Empresa Demo has an internal') && legal.endsWith(`${BASE}/canal/demo`));
// Cartel en PDF y QR sueltos
const [poster] = await Promise.all([page.waitForEvent('download'), page.locator('.sh-poster').getByRole('button', { name: 'Descargar PDF' }).click()]);
ok('cartel: se descarga un PDF', poster.suggestedFilename().endsWith('.pdf'), poster.suggestedFilename());
await toast('Cartel descargado.');
await page.getByRole('button', { name: 'Más formatos del QR' }).click();
const [png] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'QR suelto en PNG' }).click()]);
ok('QR en PNG', png.suggestedFilename() === 'canal-qr-demo.png', png.suggestedFilename());
await page.getByRole('button', { name: 'Más formatos del QR' }).click();
const [svg] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'QR suelto en SVG' }).click()]);
ok('QR en SVG', svg.suggestedFilename() === 'canal-qr-demo.svg', svg.suggestedFilename());
// Marcar a mano un paso, y desmarcarlo
await page.getByRole('button', { name: 'Ya está hecho' }).click();
await page.locator('.sh-steps-head > span', { hasText: '4 de 5' }).waitFor();
ok('«Ya está hecho» marca el cartel y se guarda en la empresa', (await store()).org.onboarding.poster === true);
ok('lo siguiente pasa a ser la AIPI', await page.getByText('Comunica a la AIPI quién es la persona responsable').isVisible());
ok('paso de la AIPI: enlace a la autoridad y a los ajustes', (await page.locator('.sh-next a[href="https://www.proteccioninformante.gob.es"]').count()) === 1 && (await page.locator('.sh-next a[href="/admin/ajustes"]').count()) === 1);
await shot('G4-compartir-siguiente-paso-AIPI');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.sh-list');
ok('el paso marcado sigue ahí al recargar', (await page.locator('.sh-steps-head > span').innerText()) === '4 de 5');
await page.locator('.sh-list button[aria-pressed="true"]', { hasText: 'Colgar el cartel con el QR' }).click();
await page.locator('.sh-steps-head > span', { hasText: '3 de 5' }).waitFor();
ok('un paso a mano se puede desmarcar', (await store()).org.onboarding.poster === false);

// 4 · Equipo y ajustes
await page.goto(`${BASE}/admin/ajustes`, { waitUntil: 'networkidle' });
await page.waitForSelector('.tm-list li');
ok('ajustes: quedan 6 días hábiles, en ámbar', await page.getByText('Quedan 6 días hábiles').isVisible() && await page.locator('.ds-field.is-warn').count() === 1);
ok('ajustes: avisa de que no descuenta festivos', await page.getByText('La cuenta salta sábados y domingos, pero no descuenta los festivos.').isVisible());
ok('ajustes: la prueba dice que el canal sigue abierto', await page.getByText(/Quedan 21 días · el canal sigue abierto aunque acabe/).isVisible());
ok('ajustes: tres personas, la primera eres tú', await page.locator('.tm-list li').count() === 3 && (await page.locator('.tm-list li').first().innerText()).includes('Laura Puig Ferrer · tú'));
ok('ajustes: tú no tienes «Cambiar»', await page.locator('.tm-list li').first().locator('.st-link').count() === 0);
ok('ajustes: «Guardar» apagado sin cambios', await page.locator('form[aria-labelledby="st-resp-t"] button[type="submit"]').isDisabled());
await shot('G5-ajustes');

// Permisos de un gestor
await page.getByRole('button', { name: 'Cambiar los permisos de Daniel Ortega Ruiz' }).click();
await page.waitForSelector('.tm-perms');
ok('permisos: tabla de 9 temas + «Todos los temas»', await page.locator('.tm-perms tbody tr').count() === 10);
ok('permisos: «Guardar permisos» apagado sin cambios', await page.getByRole('button', { name: 'Guardar permisos' }).isDisabled());
await shot('G5-permisos', { view: true });
await page.getByRole('checkbox', { name: 'Responder: Datos personales' }).check({ force: true });
ok('permisos: marcar Responder activa Ver', await page.getByRole('checkbox', { name: 'Ver: Datos personales' }).isChecked());
await page.getByRole('checkbox', { name: 'Ver: Medio ambiente' }).check({ force: true });
await page.keyboard.press('Escape');
ok('permisos: cerrar con cambios pregunta antes (diálogo propio)', await page.getByText('Hay cambios sin guardar.').isVisible());
await page.getByRole('button', { name: 'Seguir editando' }).click();
ok('permisos: al seguir editando los cambios siguen', await page.getByRole('checkbox', { name: 'Ver: Medio ambiente' }).isChecked());
await page.getByRole('button', { name: 'Guardar permisos' }).click();
await toast('Permisos guardados.');
const dperm = (await store()).permissions.filter(x => x.manager_id === 'mgr-daniel');
ok('permisos: guardados', dperm.some(x => x.category === 'environmental' && x.can_view) && dperm.find(x => x.category === 'data').can_reply === true, String(dperm.length));
ok('permisos: la lista resume los temas', (await page.locator('.tm-list li', { hasText: 'Daniel Ortega Ruiz' }).innerText()).includes('+2'));
// Quitar «Ver» los quita todos, y la columna entera
await page.getByRole('button', { name: 'Cambiar los permisos de Daniel Ortega Ruiz' }).click();
await page.waitForSelector('.tm-perms');
await page.getByRole('checkbox', { name: 'Ver: Datos personales' }).uncheck({ force: true });
ok('permisos: quitar Ver quita los demás', !(await page.getByRole('checkbox', { name: 'Responder: Datos personales' }).isChecked()));
await page.getByRole('checkbox', { name: 'Eliminar: Todos los temas' }).check({ force: true });
ok('permisos: «Todos los temas» marca la columna y activa Ver', await page.getByRole('checkbox', { name: 'Eliminar: Otra cosa o no lo sé' }).isChecked() && await page.getByRole('checkbox', { name: 'Ver: Datos personales' }).isChecked());
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Salir sin guardar' }).click();
ok('permisos: salir sin guardar no cambia nada', (await store()).permissions.filter(x => x.manager_id === 'mgr-daniel' && x.can_delete).length === 1);

// Invitar
await page.getByRole('button', { name: 'Invitar' }).click();
await page.getByRole('button', { name: 'Enviar la invitación' }).click();
ok('invitar: pide el nombre', await page.getByText('Escribe el nombre y apellidos.').isVisible());
await page.locator('#tm-inv-name').fill('Marta Vila Roca');
await page.locator('#tm-inv-email').fill('marta.vila');
await page.getByRole('button', { name: 'Enviar la invitación' }).click();
ok('invitar: pide un correo válido', await page.getByText('Escribe un correo válido.').isVisible());
await page.locator('#tm-inv-email').fill('d.ortega@empresa-demo.es');
await page.getByRole('button', { name: 'Enviar la invitación' }).click();
await page.getByText('Ya hay alguien con este correo.').waitFor();
ok('invitar: avisa si el correo ya está', true);
await page.locator('#tm-inv-email').fill('marta.vila@empresa-demo.es');
await shot('G5-invitar', { view: true });
await page.getByRole('button', { name: 'Enviar la invitación' }).click();
await toast('Invitación enviada a marta.vila@empresa-demo.es.');
await page.getByRole('heading', { name: 'Permisos de Marta Vila Roca' }).waitFor();
ok('invitar: después se abren sus permisos', true);
await page.getByRole('checkbox', { name: 'Ver: Otra cosa o no lo sé' }).check({ force: true });
await page.getByRole('button', { name: 'Guardar permisos' }).click();
await toast('Permisos guardados.');
ok('invitar: aparece en la lista como pendiente', (await page.locator('.tm-list li', { hasText: 'Marta Vila Roca' }).innerText()).includes('invitación pendiente'));
// Hacer administradora, quitar como administradora y quitar el acceso
await page.getByRole('button', { name: 'Cambiar los permisos de Marta Vila Roca' }).click();
await page.waitForSelector('.tm-perms');
await page.getByRole('button', { name: 'Hacer administrador' }).click();
ok('hacer administrador: explica por qué conviene que haya dos', await page.getByText('Conviene que haya dos personas administradoras').isVisible());
await page.locator('.ds-dialog-actions').getByRole('button', { name: 'Hacer administrador' }).click();
await toast('Marta Vila Roca ya administra el canal.');
await page.locator('.tm-list li', { hasText: 'Marta Vila Roca' }).getByText('Administración · ve todo').waitFor();
await page.getByRole('button', { name: 'Cambiar los permisos de Marta Vila Roca' }).click();
await page.getByRole('heading', { name: '¿Quitar como administrador a Marta Vila Roca?' }).waitFor();
await shot('G5-quitar-administrador', { view: true });
await page.getByRole('button', { name: 'Quitar como administrador' }).click();
await toast('Marta Vila Roca ya no administra el canal.');
await page.locator('.tm-list li', { hasText: 'Marta Vila Roca' }).getByText(/Gestión/).waitFor();
await page.getByRole('button', { name: 'Cambiar los permisos de Marta Vila Roca' }).click();
await page.waitForSelector('.tm-perms');
await page.getByRole('button', { name: 'Quitar el acceso' }).click();
ok('quitar acceso: confirma en un diálogo propio', await page.getByText('Ya no podrá entrar en el panel y se borrarán sus permisos. No se puede deshacer.').isVisible());
await page.locator('.ds-dialog-actions').getByRole('button', { name: 'Quitar el acceso' }).click();
await toast('Se ha quitado el acceso a Marta Vila Roca.');
await page.locator('.tm-list li').nth(3).waitFor({ state: 'detached' });
ok('quitar acceso: desaparece de la lista', await page.locator('.tm-list li').count() === 3);

// Plan, facturación y contrato de encargado
await page.getByRole('button', { name: 'Contratar' }).click();
await page.getByRole('heading', { name: 'Planes y precios' }).waitFor();
ok('contratar: panel con los tres planes y sus precios', await page.locator('.st-plans li').count() === 3 && (await page.locator('.st-plans').innerText()).includes('390'));
const mail = await page.getByRole('link', { name: 'Contratar por correo' }).getAttribute('href');
ok('contratar: es el correo de siempre', mail.startsWith('mailto:info@reportia.es?subject=') && decodeURIComponent(mail).includes('Empresa Demo'), mail.slice(0, 60));
await shot('G5-planes', { view: true });
await page.getByRole('button', { name: 'Cerrar' }).click();
await page.getByRole('button', { name: 'Datos de facturación' }).click();
await page.locator('#st-billing_tax_id').fill('12');
await page.locator('#st-billing_email').fill('facturas@');
await page.getByRole('button', { name: 'Guardar' }).last().click();
ok('facturación: valida el NIF', await page.getByText('Escribe un NIF válido').isVisible());
await page.locator('#st-billing_tax_id').fill('B12345678');
await page.getByRole('button', { name: 'Guardar' }).last().click();
ok('facturación: valida el correo', await page.getByText('Escribe un correo válido.').isVisible());
await page.locator('#st-billing_email').fill('facturas@empresa-demo.es');
await shot('G5-facturacion', { view: true });
await page.getByRole('button', { name: 'Guardar' }).last().click();
await toast('Guardado.');
ok('facturación: guardada', (await store()).org.billing_tax_id === 'B12345678' && (await store()).org.billing_email === 'facturas@empresa-demo.es');
const dpa = await page.getByRole('link', { name: 'Contrato de encargado del tratamiento' }).getAttribute('href');
ok('contrato de encargado: se pide por correo', decodeURIComponent(dpa).includes('Contrato de encargado del tratamiento · Empresa Demo'));

// Tu seguridad y la empresa
await page.locator('section[aria-labelledby="st-sec-t"]').getByRole('button', { name: /Cambiar/ }).click();
await page.locator('#st-pw-new').fill('corta');
await page.getByRole('button', { name: 'Guardar la contraseña' }).click();
ok('contraseña: mínimo 8 caracteres', await page.getByText('La contraseña debe tener al menos 8 caracteres.').isVisible());
await page.locator('#st-pw-new').fill('una-frase-larga-2026');
await page.locator('#st-pw-confirm').fill('una-frase-larga-2027');
await page.getByRole('button', { name: 'Guardar la contraseña' }).click();
ok('contraseña: las dos deben coincidir', await page.getByText('Las contraseñas no coinciden.').isVisible());
await page.locator('#st-pw-confirm').fill('una-frase-larga-2026');
await shot('G5-contrasena', { view: true });
await page.getByRole('button', { name: 'Guardar la contraseña' }).click();
await toast('Contraseña cambiada.');
ok('seguridad: el enlace lleva a la verificación', (await page.locator('section[aria-labelledby="st-sec-t"] a').getAttribute('href')) === '/admin/mfa');
await page.locator('section[aria-labelledby="st-org-t"]').getByRole('button', { name: /Cambiar/ }).click();
await page.locator('#st-org-name').fill('');
await page.getByRole('button', { name: 'Guardar' }).last().click();
ok('empresa: el nombre no puede quedar vacío', await page.getByText('Escribe el nombre de la empresa.').isVisible());
await page.locator('#st-org-name').fill('Empresa Demo Logística');
await page.getByRole('button', { name: 'Guardar' }).last().click();
await toast('Guardado.');
ok('empresa: el nombre nuevo sale en la cabecera', (await page.locator('.pn-brand b').innerText()) === 'Empresa Demo Logística');

// Autoridad autonómica: otra, con nombre y enlace https
const resp = page.locator('form[aria-labelledby="st-resp-t"]');
await resp.getByLabel('Autoridad autonómica que se muestra en el canal').selectOption('other');
await resp.locator('#st-auth-name').fill('Agencia Valenciana Antifraude');
await resp.locator('#st-auth-url').fill('http://www.antifraucv.es');
await resp.getByRole('button', { name: 'Guardar' }).click();
ok('autoridad: el enlace tiene que ser https', await page.getByText('Escribe el nombre y un enlace que empiece por https://.').isVisible());
await resp.locator('#st-auth-url').fill('https://www.antifraucv.es');
await resp.getByRole('button', { name: 'Guardar' }).click();
await toast('Guardado.');
await page.goto(`${BASE}/canal/demo?lang=es`, { waitUntil: 'networkidle' });
await page.waitForSelector('.entry-links');
ok('el canal enseña el nombre nuevo y la autoridad elegida', (await page.locator('.entry-brand b').innerText()) === 'Empresa Demo Logística' && (mobile || (await page.locator('.entry-links').innerText()).includes('Agencia Valenciana Antifraude')));
await page.goto(`${BASE}/admin/ajustes`, { waitUntil: 'networkidle' });
await page.waitForSelector('.tm-list li');
ok('autoridad: al volver sigue «Otra…» con sus datos', (await resp.locator('#st-auth-name').inputValue()) === 'Agencia Valenciana Antifraude');
await resp.getByLabel('Autoridad autonómica que se muestra en el canal').selectOption('antifrau');
await resp.getByRole('button', { name: 'Guardar' }).click();
await toast('Guardado.');
await page.locator('section[aria-labelledby="st-org-t"]').getByRole('button', { name: /Cambiar/ }).click();
await page.locator('#st-org-name').fill('Empresa Demo');
await page.getByRole('button', { name: 'Guardar' }).last().click();
await toast('Guardado.');

// Plazo de la AIPI vencido: rojo aquí y aviso en el tablero
const appointedBefore = (await store()).org.responsible_appointed_at;
await resp.getByLabel('Nombrada el').fill('2026-09-01');
await page.getByText(/El plazo venció el 15 de septiembre de 2026/).waitFor();
ok('plazo vencido: el campo pasa a rojo', await page.locator('.ds-field.is-late').count() === 1 && await page.locator('.ds-field.is-warn').count() === 0);
await shot('G5-ajustes-plazo-AIPI-vencido');
await resp.getByRole('button', { name: 'Guardar' }).click();
await toast('Guardado.');
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-case');
await page.waitForSelector('.pn-banner.is-danger');
ok('tablero: aviso rojo de la AIPI con la fecha', (await page.locator('.pn-banner.is-danger').innerText()).includes('El plazo de 10 días hábiles venció el 15 de septiembre de 2026'));
await shot('G2-tablero-aviso-AIPI', { view: true });
await page.locator('.pn-banner.is-danger a').click();
await page.waitForURL(/\/admin\/ajustes/);
await page.waitForSelector('.tm-list li');
// Al anotar la fecha de comunicación, desaparece el aviso y se marca el paso
await resp.getByLabel('Comunicado a la AIPI').fill('2026-09-10');
ok('con la fecha anotada ya no hay cuenta atrás', await page.locator('.ds-field.is-late, .ds-field.is-warn').count() === 0);
await resp.getByRole('button', { name: 'Guardar' }).click();
await toast('Guardado.');
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('.pn-steps');
ok('tablero: sin aviso rojo y con 4/5', await page.locator('.pn-banner.is-danger').count() === 0 && (await page.locator('.pn-ring b').innerText()) === '4/5');
// Con los cinco pasos hechos, el anillo desaparece y Compartir dice «Todo listo»
await page.goto(`${BASE}/admin/integration`, { waitUntil: 'networkidle' });
await page.waitForSelector('.sh-list');
await page.getByRole('button', { name: 'Ya está hecho' }).click();
await page.getByText('Todo listo').waitFor();
ok('compartir: 5 de 5 y «Todo listo»', (await page.locator('.sh-steps-head > span').innerText()) === '5 de 5');
await shot('G4-compartir-todo-listo', { view: true });
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-case');
await page.waitForTimeout(600);
ok('tablero: con 5 de 5 el anillo desaparece', await page.locator('.pn-steps').count() === 0);
// Se deja la demo como estaba (3 de 5, AIPI pendiente)
await page.evaluate((d) => { const s = JSON.parse(sessionStorage.getItem('reportia-demo-store-v4')); s.org.responsible_appointed_at = d; s.org.aipi_notified_at = null; s.org.onboarding = { web: true }; sessionStorage.setItem('reportia-demo-store-v4', JSON.stringify(s)); }, appointedBefore);

// 5 · Informe
await page.goto(`${BASE}/admin/report`, { waitUntil: 'networkidle' });
await page.waitForSelector('.rp-figs dd');
const year = new Date().getFullYear();
ok('informe: titular con el año', (await page.locator('h1').first().innerText()).trim().startsWith(`${year}, de un vistazo`));
const figs = await page.locator('.rp-figs dd').allInnerTexts();
ok('informe: cuatro cifras', figs.length === 4 && /^\d+$/.test(figs[0]) && /de \d+/.test(figs[1]) && /%/.test(figs[2]), figs.join(' | '));
const bars = await page.locator('.rp-bar').count();
const rowsM = await page.locator('section[aria-labelledby="rp-series"] table tbody tr').count();
ok('informe: barras por mes con su tabla oculta', bars > 1 && bars === rowsM && await page.locator('.rp-bars').getAttribute('aria-hidden') === 'true', `${bars} barras`);
ok('informe: el mes con más denuncias, en azul fuerte', await page.locator('.rp-bar.is-max').count() >= 1);
const sumM = (await page.locator('section[aria-labelledby="rp-series"] table tbody td:nth-child(2)').allInnerTexts()).reduce((a, b) => a + Number(b), 0);
ok('informe: los meses suman las recibidas', sumM === Number(figs[0]), `${sumM} / ${figs[0]}`);
const sumT = (await page.locator('section[aria-labelledby="rp-topics"] table tbody td:nth-child(2)').allInnerTexts()).reduce((a, b) => a + Number(b), 0);
ok('informe: los temas suman las recibidas', sumT === Number(figs[0]));
ok('informe: las tablas no se ven pero existen', await page.locator('table.ds-vh').count() === 2);
ok('informe: enlace a las denuncias del periodo', (await page.locator('.rp-see').getAttribute('href')) === `/admin?from=${year}-01-01&to=${year}-12-31`);
await shot('G6-informe');
const [xls] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Libro-registro (Excel)' }).click()]);
ok('informe: libro-registro en Excel', xls.suggestedFilename().endsWith('.xlsx'), xls.suggestedFilename());
const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Informe para dirección (PDF)' }).click()]);
ok('informe: PDF para dirección', pdf.suggestedFilename().endsWith('.pdf'), pdf.suggestedFilename());
await page.getByLabel('Periodo').selectOption('all');
await page.getByRole('heading', { name: 'Todo el historial, de un vistazo' }).waitFor();
ok('informe: todo el historial agrupa por año', await page.getByRole('heading', { name: 'Denuncias por año' }).isVisible() && (await page.locator('.rp-see').getAttribute('href')) === '/admin');
await page.locator('.rp-see').click();
await page.waitForURL(/\/admin\/?$/);
await page.waitForSelector('.ds-case');

// 6 · Direcciones de antes
await page.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle' });
await page.waitForURL(/\/admin\/ajustes$/);
await page.goto(`${BASE}/admin/account`, { waitUntil: 'networkidle' });
await page.waitForURL(/\/admin\/ajustes$/);
ok('/admin/users y /admin/account llevan a Equipo y ajustes', true);
await page.goto(`${BASE}/admin/ajustes?invitar=1`, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'Invitar a alguien del equipo' }).waitFor();
ok('desde «Primeros pasos» se abre la invitación y la dirección queda limpia', !page.url().includes('invitar'));
await page.keyboard.press('Escape');

// 7 · Verificación en dos pasos: estado y alta
await page.goto(`${BASE}/admin/mfa`, { waitUntil: 'networkidle' });
await page.waitForSelector('.sg-state');
ok('seguridad: activada, sin botón de desactivar', await page.getByRole('heading', { name: 'Activada' }).isVisible() && await page.getByRole('button', { name: /Desactivar/ }).count() === 0);
ok('seguridad: sin códigos de recuperación, dice a quién pedirla', await page.getByText('pide a un administrador de tu empresa o a Reportia que te la restablezca').isVisible());
await shot('seguridad-activada');
// Una cuenta que aún no la tiene: solo puede ver esta pantalla hasta activarla
await page.evaluate(() => { const s = JSON.parse(sessionStorage.getItem('reportia-demo-store-v4')); s.mfa = []; sessionStorage.setItem('reportia-demo-store-v4', JSON.stringify(s)); sessionStorage.setItem('f4-no-aal', '1'); sessionStorage.removeItem('reportia-demo-aal'); });
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.waitForURL(/\/admin\/mfa$/);
await page.getByText('Activa la verificación en dos pasos para continuar').waitFor();
ok('sin verificación: el panel lleva a activarla y no enseña nada más', await page.locator('.ds-nav a').count() === 1 && await page.locator('.pn-back').count() === 0);
await shot('seguridad-obligatoria');
await page.getByRole('button', { name: 'Activar la verificación' }).click();
await page.getByRole('heading', { name: 'Escanea el código QR' }).waitFor();
ok('alta, paso 1: QR y clave manual', await page.locator('.sg-qr').isVisible() && (await page.locator('.sg-key code').innerText()).replace(/\s/g, '').length >= 16);
await shot('seguridad-paso-1');
await page.getByRole('button', { name: 'Continuar' }).click();
await page.getByRole('heading', { name: 'Escribe el código de 6 cifras' }).waitFor();
ok('alta, paso 2: «Verificar» apagado sin las 6 cifras', await page.getByRole('button', { name: 'Verificar y activar' }).isDisabled());
await page.locator('.ds-otp-box').first().focus();
await page.keyboard.type('48190', { delay: 90 });
await shot('seguridad-paso-2');
await page.waitForTimeout(150);
await page.keyboard.type('2');
await toast('Verificación en dos pasos activada.');
await page.getByRole('heading', { name: 'Activada' }).waitFor();
await page.locator('.ds-nav a').nth(2).waitFor();
ok('alta hecha: se desbloquea el resto del panel', await page.locator('.ds-nav a').count() === 4);
await page.evaluate(() => sessionStorage.removeItem('f4-no-aal'));

// 8 · Catalán e inglés
await page.evaluate(() => localStorage.setItem('reportia-panel-lang', 'ca'));
await page.goto(`${BASE}/admin/ajustes`, { waitUntil: 'networkidle' });
await page.waitForSelector('.tm-list li');
ok('catalán: ajustes', await page.getByRole('heading', { name: 'Equip i ajustos' }).isVisible() && await page.getByText('Queden 6 dies hàbils').isVisible());
await shot('G5-ajustes-catala');
await page.goto(`${BASE}/admin/integration`, { waitUntil: 'networkidle' });
await page.waitForSelector('.sh-qr img');
await page.waitForSelector('.sh-list');
await shot('G4-compartir-catala');
await page.evaluate(() => localStorage.setItem('reportia-panel-lang', 'en'));
await page.goto(`${BASE}/admin/report`, { waitUntil: 'networkidle' });
await page.waitForSelector('.rp-figs dd');
ok('inglés: informe', (await page.locator('h1').first().innerText()).includes('at a glance'));
await shot('G6-informe-english');
await page.goto(`${BASE}/admin/ajustes`, { waitUntil: 'networkidle' });
await page.waitForSelector('.tm-list li');
ok('inglés: ajustes', await page.getByText('6 working days left').isVisible());
await shot('G5-ajustes-english');

console.log(problems.length ? `\nPROBLEMAS (${problems.length}):\n${problems.join('\n')}` : '\nsin problemas');
await browser.close();
process.exit(problems.length ? 1 : 0);
