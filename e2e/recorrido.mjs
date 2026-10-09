// Comprobación final (sección 10): el recorrido completo de 7 puntos en modo demo, en una sola sesión.
import { chromium } from './lib/playwright.mjs';
const [OUT, DOCS, W] = [process.argv[2], process.argv[3], Number(process.argv[4])];
const H = W === 1440 ? 900 : W === 1366 ? 768 : 812;
const B = 'http://localhost:3111';
const mobile = W <= 640;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile, acceptDownloads: true, locale: 'es-ES', permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
const problems = []; let checks = 0;
const ok = (name, v, extra = '') => { checks++; console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(`${name} ${extra}`); };
page.on('console', m => { if (m.type() === 'error') problems.push(`consola: ${m.text().slice(0, 240)}`); });
page.on('pageerror', e => problems.push(`error: ${e.message.slice(0, 240)}`));
await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
await page.addInitScript(() => { if (!localStorage.getItem('reportia-panel-lang')) localStorage.setItem('reportia-panel-lang', 'es'); });
let n = 0;
async function shot(name, { view = false } = {}) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(450);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 0) problems.push(`desbordamiento horizontal de ${over}px en ${name}`);
  const path = `${OUT}/${W}-${String(++n).padStart(2, '0')}-${name}.png`;
  if (view) await page.screenshot({ path });
  else if (mobile) { const tall = await page.evaluate(() => document.documentElement.scrollHeight); await page.setViewportSize({ width: W, height: Math.max(H, tall) }); await page.waitForTimeout(250); await page.screenshot({ path }); await page.setViewportSize({ width: W, height: H }); }
  else await page.screenshot({ path, fullPage: true });
}
const toast = async (text) => { await page.locator('.pn-toast', { hasText: text }).first().waitFor({ timeout: 9000 }); await page.locator('.pn-toast').waitFor({ state: 'detached', timeout: 9000 }); };
const save = async (trigger, name) => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 40000 }), trigger()]); const ext = d.suggestedFilename().split('.').pop(); await d.saveAs(`${DOCS}/${W}-${name}.${ext}`); return d.suggestedFilename(); };
const col = async (name) => { if (mobile) await page.getByRole('tab', { name: new RegExp(name) }).click(); };
const TEXT = 'Desde hace semanas, uno de los responsables del turno de noche hace comentarios sexuales a varias compañeras y se les acerca cuando están solas en los pasillos.';

// ── 1 · Entrar al canal, denunciar de forma anónima con una reunión pedida y guardar el código ──
await page.goto(`${B}/canal/demo?lang=es`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-hero');
await shot('1a-entrada-del-canal');
await page.getByRole('link', { name: 'Empezar a denunciar' }).click();
await page.waitForSelector('.cats');
await page.getByRole('radio', { name: /Acoso/ }).click();
await shot('1b-que-ha-pasado');
await page.getByRole('button', { name: 'Continuar' }).click();
await page.waitForSelector('#dn-description');
await page.fill('#dn-description', TEXT);
if (mobile) await page.getByRole('button', { name: 'Añadir pruebas o detalles' }).click();
await page.getByLabel('Dónde o en qué área').fill('Almacén central, turno de noche');
await page.getByPlaceholder('Por ejemplo, desde septiembre').fill('Desde septiembre');
await shot('1c-cuentalo');
await page.getByRole('button', { name: 'Continuar' }).click();
await page.waitForSelector('.opts');
await page.getByRole('radio', { name: /No, prefiero el anonimato/ }).check({ force: true });
await page.getByLabel(/También quiero explicarlo en persona/).check();
await page.locator('#dn-privacy').check();
await shot('1d-anonima-con-reunion');
await page.getByRole('button', { name: 'Enviar denuncia' }).click();
await page.waitForSelector('.code-big');
const code = (await page.locator('.code-big').textContent()).trim();
ok('1 · denuncia anónima enviada, con su código', /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code), code);
await shot('1e-enviada-con-el-codigo');
const receipt = await save(() => page.getByRole('button', { name: 'Descargar justificante' }).click(), 'justificante');
ok('1 · justificante en PDF con nombre neutro', receipt.endsWith('.pdf') && !/denuncia|reportia|canal/i.test(receipt), receipt);
await page.getByRole('button', { name: 'Copiar' }).click();
ok('1 · el código se copia', (await page.evaluate(() => navigator.clipboard.readText())) === code);
ok('1 · nada del borrador ni del código queda en el navegador', await page.evaluate((c) => !JSON.stringify({ ...localStorage }).includes(c) && !Object.keys(sessionStorage).some(k => !k.startsWith('reportia-demo')), code));

// ── 2 · Abrir «Mi caso» y escribir un mensaje ──
await page.getByRole('button', { name: 'Ver mi caso' }).click();
await page.waitForSelector('.mc');
ok('2 · mi caso: consta la reunión pedida', await page.getByText(/Has pedido una reunión en persona/).count() > 0);
await page.fill('#mc-msg', 'Puedo aportar más capturas si hacen falta.');
await page.getByRole('button', { name: 'Enviar mensaje' }).click();
await page.waitForSelector('.ds-chat-msg.is-mine');
ok('2 · mensaje enviado desde «Mi caso»', await page.locator('.ds-chat-msg.is-mine').count() === 1);
await shot('2-mi-caso-con-mensaje');

// ── 3 · Entrar como gestor y ver el caso en «Nuevas» ──
await page.goto(`${B}/admin/login?from=demo&lang=es`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ac-form');
await page.getByLabel('Correo').fill('laura.puig@empresa-demo.es');
await page.locator('#ac-pw').fill('una-contraseña');
await shot('3a-acceso');
await page.getByRole('button', { name: 'Entrar' }).click();
await page.waitForSelector('.ds-otp');
await page.locator('.ds-otp-box').first().focus();
await page.keyboard.type('4819', { delay: 90 });
await shot('3b-verificacion-en-dos-pasos');
await page.keyboard.type('02', { delay: 90 });
await page.waitForURL(/\/admin\/?$/, { timeout: 10000 });
await page.waitForSelector('.ds-case');
await col('Nuevas');
const card = page.locator('.ds-kcol').first().locator('.ds-case', { hasText: 'Desde hace semanas, uno de los responsables' }).first();
ok('3 · el caso nuevo está en «Nuevas», con «Pide reunión» y «Te ha escrito»', await card.count() === 1 && await card.getByText('Pide reunión').count() === 1 && await card.getByText('Te ha escrito').count() === 1);
await shot('3c-tablero-caso-en-nuevas');

// ── 4 · Enviar el acuse y verlo pasar a «En curso» ──
await card.getByRole('link').first().click();
await page.waitForSelector('.cs-desc');
ok('4 · la ficha no enseña el código de quien informa', !(await page.locator('.cs').innerText()).includes(code));
await shot('4a-ficha-del-caso');
await page.locator('.cs-next').getByRole('button', { name: 'Enviar el acuse de recibo' }).click();
await shot('4b-acuse-preparado', { view: true });
await page.getByRole('dialog').getByRole('button', { name: 'Enviar el acuse', exact: true }).click();
await toast('Acuse enviado');
await page.getByRole('link', { name: 'Tablero' }).first().click();
await page.waitForSelector('.ds-case');
await col('En curso');
const moved = page.locator('.ds-kcol').nth(mobile ? 0 : 1).locator('.ds-case', { hasText: 'Desde hace semanas, uno de los responsables' });
ok('4 · tras el acuse, el caso está en «En curso»', await page.locator('.ds-case', { hasText: 'Desde hace semanas, uno de los responsables' }).count() === 1 && (mobile || await moved.count() === 1));
await shot('4c-tablero-caso-en-curso');

// ── 5 · Marcar la reunión hecha, iniciar la investigación, responder y cerrar con un resultado ──
await page.locator('.ds-case', { hasText: 'Desde hace semanas, uno de los responsables' }).getByRole('link').first().click();
await page.waitForSelector('.cs-desc');
await page.locator('.cs-next').getByRole('button', { name: 'Proponer la reunión' }).click();
await page.locator('#cs-msg').fill('Te proponemos reunirnos el jueves a las 10:00 en la sala 2. Si no te va bien, dinos otro momento.');
await page.locator('.ds-compose').getByRole('button', { name: 'Enviar' }).click();
await page.locator('.cs-next').getByRole('button', { name: 'Marcar la reunión como hecha' }).click();
await toast('Reunión marcada como hecha');
await page.locator('.cs-next').getByRole('button', { name: 'Iniciar la investigación' }).click();
await toast('Investigación iniciada');
await shot('5a-en-investigacion');
await page.locator('.cs-next').getByRole('button', { name: 'Responder y cerrar' }).click();
await page.getByRole('dialog').getByLabel('Resultado').selectOption('founded');
await page.getByRole('dialog').locator('textarea').fill('Hemos comprobado los hechos y se han tomado medidas. Gracias por contarlo.');
await shot('5b-responder-y-cerrar', { view: true });
await page.getByRole('dialog').getByRole('button', { name: 'Enviar y cerrar', exact: true }).click();
await toast('Respuesta enviada');
await page.locator('.cs-next-note.is-done').waitFor();
const hist = await page.locator('.cs-hist').innerText();
ok('5 · historial completo: acuse, reunión, investigación, resultado y cierre', ['reunión presencial', 'En investigación', 'resultado', 'Resuelta'].every(x => hist.includes(x)), hist.replace(/\n/g, ' ').slice(0, 160));
await shot('5c-caso-cerrado');
// 7 (primera parte) · PDF del caso
const casePdf = await save(() => page.getByRole('button', { name: 'Exportar PDF' }).click(), 'caso');
ok('7 · PDF del caso', casePdf.endsWith('.pdf'), casePdf);
// Quien informa ve la respuesta con su código
await page.goto(`${B}/canal/demo/consulta?lang=es`, { waitUntil: 'networkidle' });
await page.getByLabel('Tu código').fill(code);
await page.getByRole('button', { name: 'Ver mi caso' }).click();
await page.waitForSelector('.mc');
ok('5 · quien informa ve la respuesta final con su código', await page.getByText(/Hemos comprobado los hechos y se han tomado medidas/).first().waitFor({ timeout: 6000 }).then(() => true, () => false));
await shot('5d-mi-caso-con-la-respuesta');

// ── 6 · Registrar un caso telefónico ──
await page.goto(`${B}/admin/nueva`, { waitUntil: 'networkidle' });
await page.waitForSelector('.rg-form');
await page.getByLabel('Tema').selectOption('safety');
await page.locator('#rg-description').fill('Llama una persona del muelle de carga: la carretilla elevadora del turno de tarde no tiene revisión desde marzo y los frenos fallan.');
await page.getByLabel('Dónde').fill('Muelle de carga');
await page.getByLabel('Cuándo').fill('Desde marzo');
await shot('6a-registrar-caso-telefonico');
await page.getByRole('button', { name: 'Registrar y obtener el código' }).click();
await page.waitForSelector('.rg-code');
const code2 = (await page.locator('.rg-code .code-big').textContent()).trim();
ok('6 · caso telefónico registrado, con código para entregar', /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code2) && code2 !== code, code2);
await shot('6b-registrado-con-codigo');
await page.getByRole('link', { name: 'Ir al tablero' }).click().catch(async () => { await page.goto(`${B}/admin`, { waitUntil: 'networkidle' }); });
await page.waitForSelector('.ds-case');

// ── 7 · Exportar el libro-registro (y los demás documentos) ──
await page.goto(`${B}/admin/report`, { waitUntil: 'networkidle' });
await page.waitForSelector('.rp-figs dd');
const xls = await save(() => page.getByRole('button', { name: 'Libro-registro (Excel)' }).click(), 'libro-registro');
ok('7 · libro-registro en Excel', xls.endsWith('.xlsx'), xls);
const rep = await save(() => page.getByRole('button', { name: 'Informe para dirección (PDF)' }).click(), 'informe');
ok('7 · informe para dirección en PDF', rep.endsWith('.pdf'), rep);
await shot('7a-informe');
await page.goto(`${B}/admin/integration`, { waitUntil: 'networkidle' });
await page.waitForSelector('.sh-qr img');
const poster = await save(() => page.locator('.sh-poster').getByRole('button', { name: 'Descargar PDF' }).click(), 'cartel');
ok('7 · cartel A4 en PDF', poster.endsWith('.pdf'), poster);
await page.locator('.pn-toast').waitFor({ state: 'detached', timeout: 9000 }).catch(() => {});
await shot('7b-compartir');
await page.goto(`${B}/admin/ajustes`, { waitUntil: 'networkidle' });
await page.waitForSelector('.tm-list li');
await shot('7c-equipo-y-ajustes');
await page.goto(`${B}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-case');
await shot('7d-tablero-final');

// ── Una captura en catalán y otra en inglés ──
await page.evaluate(() => localStorage.setItem('reportia-panel-lang', 'ca'));
await page.goto(`${B}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-case');
ok('catalán: tablero', /casos? et necessit|Tot al dia/.test(await page.locator('h1').first().innerText()));
await shot('8a-tauler-catala');
await page.goto(`${B}/canal/demo?lang=en`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-hero');
ok('inglés: entrada del canal', (await page.locator('h1').first().innerText()).trim() === 'Report');
await shot('8b-channel-english');
await page.evaluate(() => localStorage.setItem('reportia-panel-lang', 'en'));
await page.goto(`${B}/admin/report`, { waitUntil: 'networkidle' });
await page.waitForSelector('.rp-figs dd');
await shot('8c-report-english');

console.log(problems.length ? `\nPROBLEMAS (${problems.length} de ${checks}):\n${problems.join('\n')}` : `\n${checks} comprobaciones, sin problemas`);
await browser.close();
process.exit(problems.length ? 1 : 0);
