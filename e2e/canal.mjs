import { chromium } from './lib/playwright.mjs';
import { readFileSync } from 'node:fs';
const [OUT, TMP, W] = [process.argv[2], process.argv[3], Number(process.argv[4])];
const H = W === 1440 ? 900 : 812;
const BASE = 'http://localhost:3111';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: W === 1440 ? 1 : 2, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
const problems = [];
const ok = (name, v, extra = '') => { console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(name); };
page.on('console', m => { if (m.type() === 'error') problems.push(`consola: ${m.text().slice(0, 200)}`); });
page.on('pageerror', e => problems.push(`error: ${e.message.slice(0, 200)}`));
// Nada sale del ordenador: cualquier petición que no sea local se corta y se anota
const outside = [];
await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !u.toString().startsWith('data:') && !u.toString().startsWith('blob:'), r => { outside.push(r.request().url()); r.abort(); });

let n = 0;
async function shot(name, { full = true } = {}) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 0) problems.push(`desbordamiento horizontal de ${over}px en ${name}`);
  await page.screenshot({ path: `${OUT}/${W}-${String(++n).padStart(2, '0')}-${name}.png`, fullPage: full });
}
const main = page.locator('#ds-main');

// 1 · Entrada
await page.goto(`${BASE}/canal/demo`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-hero');
ok('el idioma queda en la dirección (?lang=)', /[?&]lang=(ca|es|en)/.test(page.url()), page.url().split('/canal')[1]);
await page.getByRole('button', { name: 'Español' }).click();
await page.waitForURL(/lang=es/);
ok('banda del canal de ejemplo', await page.getByText('Canal de ejemplo.').isVisible());
await shot('00-entrada');
// Paneles del pie
await page.getByRole('button', { name: /Canales externos/ }).click();
ok('panel de canales externos con la AIPI', await page.getByRole('dialog').getByText('Autoridad Independiente de Protección del Informante').isVisible());
await shot('00-entrada-canales-externos', { full: false });
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Qué guardamos y qué no' }).click();
await page.waitForTimeout(200);
await shot('00-entrada-que-guardamos', { full: false });
await page.keyboard.press('Escape');

// 2 · Paso 1
await (W > 640 ? page.getByRole('link', { name: 'Empezar a denunciar' }) : page.getByRole('link', { name: 'Empezar a denunciar' })).click();
await page.waitForSelector('.cats');
ok('«Continuar» desactivado hasta elegir tema', await page.getByRole('button', { name: 'Continuar' }).isDisabled());
ok('9 temas, radios de verdad', await page.getByRole('radio').count() === 9);
await page.getByRole('radio', { name: /Fraude o corrupción/ }).click();
await page.keyboard.press('ArrowLeft');
ok('las flechas mueven la elección', await page.getByRole('radio', { name: /Acoso laboral o sexual/ }).getAttribute('aria-checked') === 'true');
await shot('D1-que-ha-pasado');
await page.getByRole('button', { name: 'Continuar' }).click();

// 3 · Paso 2
await page.waitForSelector('#dn-description');
await page.getByRole('button', { name: 'Continuar' }).click();
ok('aviso si la descripción es corta', await page.getByText('Escribe al menos 20 caracteres').isVisible());
await page.fill('#dn-description', 'Desde hace semanas, uno de los responsables del turno de noche hace comentarios sexuales a varias compañeras y se les acerca cuando están solas en los pasillos.');
if (W <= 640) { await shot('M2-cuentalo'); await page.getByRole('button', { name: 'Añadir pruebas o detalles' }).click(); }
await page.getByLabel('Dónde o en qué área').fill('Almacén central, turno de noche');
await page.getByPlaceholder('Por ejemplo, desde septiembre').fill('Desde septiembre');
await page.locator('input[type=file]').setInputFiles([`${TMP}/capturas-grupo.pdf`, `${TMP}/virus.exe`]);
ok('archivo admitido en la lista', await page.locator('.proof-file').count() === 1);
ok('archivo no admitido: aviso con el motivo', await page.getByText('tipo no admitido').isVisible());
ok('ayuda: los 4 chips cubiertos', await page.locator('.helps .ds-chip.is-ok').count() === 4);
await shot(W <= 640 ? 'M2-cuentalo-con-detalles' : 'D2-cuentalo');
await page.getByRole('button', { name: 'Continuar' }).click();

// 4 · Paso 3
await page.waitForSelector('.opts');
ok('anónimo elegido por defecto', await page.getByRole('radio', { name: /No, prefiero el anonimato/ }).isChecked());
ok('casilla de privacidad sin marcar', !(await page.locator('#dn-privacy').isChecked()));
await page.getByRole('button', { name: 'Enviar denuncia' }).click();
ok('no se envía sin marcar la privacidad', await page.getByText('Marca la casilla para poder enviar.').isVisible());
await page.getByRole('radio', { name: /Sí, con mis datos/ }).check({ force: true });
await page.locator('#dn-privacy').check();
await page.getByRole('button', { name: 'Enviar denuncia' }).click();
ok('con datos, el correo es obligatorio', await page.getByText('Escribe un correo válido.').isVisible());
await shot('D3-identidad-con-datos');
await page.getByRole('radio', { name: /No, prefiero el anonimato/ }).check({ force: true });
await page.locator('#dn-privacy').uncheck();
await page.getByLabel(/También quiero explicarlo en persona/).check();
await page.getByRole('button', { name: 'Enviar denuncia' }).click();
await shot('D3-identidad-falta-privacidad');
await page.locator('#dn-privacy').check();
await shot('D3-identidad');

// «Gestionar» con el borrador escrito: pregunta antes de salir
if (W > 640) {
  await page.locator('.ds-tab.is-manage').click();
  ok('salir con el borrador pide confirmación', await page.getByRole('dialog').getByText('¿Salir de la denuncia?').isVisible());
  await shot('D3-confirmar-salida', { full: false });
  await page.getByRole('button', { name: 'Seguir aquí' }).click();
}
await page.getByRole('button', { name: 'Enviar denuncia' }).click();

// 5 · Enviada
await page.waitForSelector('.code-big');
const code = (await page.locator('.code-big').textContent()).trim();
ok('código con formato XXXX-XXXX', /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code), code);
await shot('D4-enviada');
await page.getByRole('button', { name: 'Ver mi caso' }).click();
ok('salir sin guardar el código: pregunta una vez', await page.getByRole('dialog').getByText('¿Has guardado el código?').isVisible());
await shot('D4-has-guardado-el-codigo', { full: false });
await page.getByRole('button', { name: 'Volver al código' }).click();
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar justificante' }).click()]);
const pdfPath = `${TMP}/justificante-${W}.pdf`;
await download.saveAs(pdfPath);
const pdf = readFileSync(pdfPath);
ok('justificante en PDF con nombre neutro', download.suggestedFilename() === `${code}.pdf` && pdf.subarray(0, 5).toString() === '%PDF-', `${download.suggestedFilename()} · ${pdf.length} bytes`);
await page.getByRole('button', { name: 'Copiar' }).click();
ok('copiar deja el código en el portapapeles', (await page.evaluate(() => navigator.clipboard.readText())) === code);
ok('nada del borrador ni del código en el almacenamiento del navegador', await page.evaluate((c) => !JSON.stringify({ ...localStorage }).includes(c) && !Object.keys(sessionStorage).some(k => !k.startsWith('reportia-demo')) , code));
await page.getByRole('button', { name: 'Ver mi caso' }).click();

// 6 · Mi caso
await page.waitForSelector('.mc');
ok('mi caso abre con el código', await main.getByText(code).first().isVisible());
ok('el código no queda en el historial', await page.evaluate(() => !window.history.state?.usr?.code));
ok('sin botón de adjuntar en los mensajes', await page.getByRole('button', { name: /Adjuntar/ }).count() === 0);
await shot(W <= 640 ? 'M3-mi-caso-recien-enviada' : 'D5-mi-caso-recien-enviada');
await page.fill('#mc-msg', 'Puedo aportar más capturas si hacen falta.');
await page.getByRole('button', { name: 'Enviar mensaje' }).click();
await page.waitForSelector('.ds-chat-msg.is-mine');
ok('el mensaje enviado aparece en la conversación', await page.locator('.ds-chat-msg.is-mine').getByText('Puedo aportar más capturas').isVisible());
await shot(W <= 640 ? 'M3-mi-caso-con-mensaje' : 'D5-mi-caso-con-mensaje');
if (W <= 640) {
  await page.getByRole('button', { name: 'Más opciones' }).click();
  ok('menú «···»: línea de tiempo, reunión y salir', await page.getByRole('dialog').getByText('Recibida por la empresa').isVisible() && await page.getByRole('dialog').getByRole('button', { name: 'Salir de mi caso' }).isVisible());
  await shot('M3-menu', { full: false });
  await page.getByRole('dialog').getByRole('button', { name: 'Salir de mi caso' }).click();
} else {
  ok('reunión pedida al enviar: consta en mi caso', await main.getByText('Has pedido una reunión en persona').isVisible());
  await page.getByRole('button', { name: 'Salir de mi caso' }).click();
}
await page.waitForSelector('.ds-hero');

// 7 · Escribir el código (un caso de la demo en investigación)
await page.getByRole('link', { name: /Mira tu caso/ }).click();
await page.waitForSelector('.codebox');
await shot('D0-codigo');
await page.getByLabel('Tu código').fill('zzzz9999');
await page.getByRole('button', { name: 'Ver mi caso' }).click();
await page.waitForSelector('.ds-field-error');
ok('código que no existe: mensaje sin pistas', await page.getByText('No hemos podido abrir ningún caso con ese código').isVisible());
await shot('D0-codigo-error');
const demoCode = process.argv[5];
await page.getByLabel('Tu código').fill(demoCode.replace('-', '').toLowerCase());
ok('máscara XXXX-XXXX y mayúsculas', await page.getByLabel('Tu código').inputValue() === demoCode);
await page.getByRole('button', { name: 'Ver mi caso' }).click();
await page.waitForSelector('.mc');
await shot(W <= 640 ? 'M3-mi-caso' : 'D5-mi-caso');
if (W > 640) {
  const ask = main.getByRole('button', { name: 'Pide una reunión' });
  if (await ask.count()) {
    await ask.click();
    await main.getByText('Has pedido una reunión en persona').waitFor();
    ok('pedir reunión desde mi caso (demo)', true);
    await shot('D5-mi-caso-reunion-pedida');
  } else ok('pedir reunión desde mi caso (demo)', false, 'no aparece el botón');
}

// 8 · Privacidad y otros idiomas
await page.goto(`${BASE}/canal/demo/privacidad?lang=es`, { waitUntil: 'networkidle' });
await page.waitForSelector('.priv');
await shot('privacidad');
await page.goto(`${BASE}/canal/demo?lang=ca`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-hero');
await shot('00-entrada-catalan');
await page.getByRole('link', { name: 'Començar a denunciar' }).click();
await page.waitForSelector('.cats');
await page.goto(`${BASE}/canal/demo/denuncia?lang=en`, { waitUntil: 'networkidle' });
await page.waitForSelector('.cats');
await shot('D1-ingles');
await page.goto(`${BASE}/canal/no-existe?lang=es`, { waitUntil: 'networkidle' });
await page.waitForSelector('.canal-lost');
ok('canal que no existe: tarjeta en el mismo idioma', await page.getByText('Este canal no existe').isVisible());
await shot('canal-no-existe', { full: false });

ok('ninguna petición sale del ordenador', outside.length === 0, outside.slice(0, 3).join(' '));
console.log(problems.length ? `\nPROBLEMAS (${problems.length}):\n- ${[...new Set(problems)].join('\n- ')}` : '\nSin problemas');
await browser.close();
