import { chromium } from './lib/playwright.mjs';
const [OUT, W] = [process.argv[2], Number(process.argv[3])];
const H = W === 1440 ? 900 : 812;
const B = 'http://localhost:3111';
const mobile = W <= 640;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile, locale: 'es-ES' });
const page = await ctx.newPage();
const problems = []; let checks = 0;
const ok = (name, v, extra = '') => { checks++; console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(`${name} ${extra}`); };
page.on('console', m => { if (m.type() === 'error') problems.push(`consola: ${m.text().slice(0, 240)}`); });
page.on('pageerror', e => problems.push(`error: ${e.message.slice(0, 240)}`));
await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
await page.addInitScript(() => { sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); if (!localStorage.getItem('reportia-panel-lang')) localStorage.setItem('reportia-panel-lang', 'es'); });
async function shot(name, { view = true, clip } = {}) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 0) problems.push(`desbordamiento horizontal de ${over}px en ${name}`);
  const path = `${OUT}/${W}-${name}.png`;
  if (clip) await clip.screenshot({ path });
  else if (view) await page.screenshot({ path });
  else if (mobile) { const tall = await page.evaluate(() => document.documentElement.scrollHeight); await page.setViewportSize({ width: W, height: Math.max(H, tall) }); await page.waitForTimeout(250); await page.screenshot({ path }); await page.setViewportSize({ width: W, height: H }); }
  else await page.screenshot({ path, fullPage: true });
}
const toastGone = () => page.locator('.pn-toast').waitFor({ state: 'detached', timeout: 9000 }).catch(() => {});
const col = async (name) => { if (mobile) await page.getByRole('tab', { name: new RegExp(name) }).click(); };

// ── A3 · «Revisa antes de enviar» con Dónde y Personas implicadas · B7 «Cambiar algo» ──
await page.goto(`${B}/canal/demo?lang=es`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-hero');
// B7 · el botón «¿Ya lo contaste?»
const again = page.locator('.entry-again');
const bg = await again.evaluate(el => { const c = getComputedStyle(el); return { bg: c.backgroundColor, color: c.color, h: el.getBoundingClientRect().height, tag: el.tagName }; });
ok('B7 · «¿Ya lo contaste? Mira tu caso» es un botón en píldora con icono', bg.tag === 'A' && bg.h >= 44 && await again.locator('svg').count() === 1 && /rgba?\(13, 21, 48/.test(bg.bg), JSON.stringify(bg));
await shot('B7-entrada-boton-mira-tu-caso');
await again.click();
await page.waitForURL(/consulta/);
ok('B7 · lleva a escribir el código', await page.getByLabel('Tu código').waitFor({ timeout: 8000 }).then(() => true, () => false));
await page.goto(`${B}/canal/demo/denuncia?lang=es`, { waitUntil: 'networkidle' });
await page.waitForSelector('.cats');
await page.getByRole('radio', { name: /Fraude/ }).click();
await page.getByRole('button', { name: 'Continuar' }).click();
await page.fill('#dn-description', 'Un proveedor factura cada mes servicios de limpieza que no se prestan en la nave 2.');
if (mobile) await page.getByRole('button', { name: 'Añadir pruebas o detalles' }).click();
await page.getByLabel('Dónde o en qué área').fill('Nave 2, compras');
await page.getByPlaceholder('Por ejemplo, desde septiembre').fill('Desde marzo');
await page.getByLabel('Personas implicadas').fill('El responsable de compras');
await page.getByRole('button', { name: 'Continuar' }).click();
await page.waitForSelector('.review');
const review = await page.locator('.review').innerText();
ok('A3 · el repaso enseña «Dónde» y «Personas implicadas»', review.includes('Nave 2, compras') && review.includes('El responsable de compras') && review.includes('Desde marzo'), review.replace(/\n/g, ' · ').slice(0, 200));
ok('B7 · «Cambiar algo» es un botón', await page.locator('.review-change.ds-btn').count() === 1);
await page.locator('.review').scrollIntoViewIfNeeded();
await shot('A3-revisa-antes-de-enviar');
await page.locator('.review-change').click();
await page.getByLabel('Dónde o en qué área').fill('');
await page.getByLabel('Personas implicadas').fill('');
await page.getByRole('button', { name: 'Continuar' }).click();
await page.waitForSelector('.review');
ok('A3 · si están vacíos, no salen', !(await page.locator('.review').innerText()).includes('Dónde') && !(await page.locator('.review').innerText()).includes('Personas implicadas'));

// ── B5 y B6 · tarjetas del tablero ──
await page.goto(`${B}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-case');
await col('Nuevas');
const card = page.locator('.ds-case', { hasText: 'Comentarios sexuales a compañeras' }).first();
ok('B5 · un solo enlace por tarjeta, que la cubre entera', await card.locator('a').count() === 1 && await card.evaluate(el => getComputedStyle(el).cursor) === 'pointer');
if (!mobile) {
  await card.hover();
  await page.waitForTimeout(250);
  const look = await card.evaluate(el => getComputedStyle(el).boxShadow);
  ok('B5 · al pasar el ratón, borde azul', /47, 84, 235/.test(look), look);
  const boxes = await card.evaluate(el => { const r = x => { const b = x.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; }; const m = el.querySelector('.ds-case-move'); const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]; const chips = [...el.querySelectorAll('.ds-chip')].map(r); const range = document.createRange(); range.selectNodeContents(el.querySelector('.ds-case-link')); const title = [...range.getClientRects()].map(b => [b.left, b.top, b.right, b.bottom]); return { visible: getComputedStyle(m).opacity === '1', text: m.innerText.trim(), label: m.getAttribute('aria-label'), covers: chips.some(c => hit(r(m), c)) || title.some(c => hit(r(m), c)) }; });
  ok('B6 · «Mover a…»: solo la flecha, con su nombre, y no tapa ni los chips ni el título', boxes.visible && boxes.text === '' && /Mover a/.test(boxes.label) && !boxes.covers, JSON.stringify(boxes));
  await shot('B5-B6-tarjeta-al-pasar-el-raton', { clip: page.locator('.ds-kcol').first() });
  await page.mouse.move(5, 5);
  await page.keyboard.press('Tab');
  for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => document.activeElement?.classList.contains('ds-case-link'))) break; }
  ok('B5 · con el teclado también se marca la tarjeta', /47, 84, 235/.test(await page.evaluate(() => getComputedStyle(document.activeElement.closest('.ds-case')).boxShadow)));
  await shot('B5-tarjeta-con-el-foco-del-teclado', { clip: page.locator('.ds-kcol').first() });
  await page.mouse.click(700, 5);
  const area = await card.boundingBox();
  await page.mouse.click(area.x + area.width - 60, area.y + area.height - 14);
  await page.waitForURL(/complaints\/c-vk7p2mqa/);
  ok('B5 · un clic en cualquier punto de la tarjeta abre el caso', true);
} else {
  await shot('B5-tablero-movil');
  await card.click({ position: { x: 200, y: 60 } });
  await page.waitForURL(/complaints\/c-vk7p2mqa/);
  ok('B5 · tocar la tarjeta abre el caso', true);
}

// ── A4 · plantilla de la reunión con corchetes · B12 título como una columna ──
await page.waitForSelector('.cs-desc');
await page.locator('.cs-next').getByRole('button', { name: 'Enviar el acuse de recibo' }).click();
await page.getByRole('dialog').locator('textarea').fill('Hemos recibido tu denuncia. Te llamaremos el [día].');
await page.getByRole('dialog').getByRole('button', { name: 'Enviar el acuse', exact: true }).click();
ok('A4 · el acuse tampoco sale con corchetes', await page.getByRole('dialog').getByText('Completa lo que falta antes de enviar: [día].').isVisible());
await page.getByRole('dialog').locator('textarea').fill('Hola. Hemos recibido tu denuncia y ya la estamos revisando.');
await page.getByRole('dialog').getByRole('button', { name: 'Enviar el acuse', exact: true }).click();
await page.locator('.cs-next').getByRole('button', { name: 'Proponer la reunión' }).waitFor();
await toastGone();
await page.locator('.cs-next').getByRole('button', { name: 'Proponer la reunión' }).click();
await page.locator('.ds-compose').getByRole('button', { name: 'Enviar' }).click();
await page.getByText('Completa lo que falta antes de enviar: [día], [hora], [lugar].').waitFor();
const sentNow = await page.evaluate(() => JSON.parse(sessionStorage.getItem('reportia-demo-store-v4')).messages['c-vk7p2mqa'].length);
ok('A4 · «Proponer la reunión» sin rellenar: no se envía y lo explica', sentNow === 1, `${sentNow} mensajes`);
await page.locator('#cs-msg').scrollIntoViewIfNeeded();
await shot('A4-plantilla-sin-completar');
await page.locator('#cs-msg').fill('Te proponemos reunirnos el jueves a las 10:00 en la sala 2. Si no te va bien, dinos otro momento.');
ok('A4 · al escribir, el aviso se va', await page.getByText('Completa lo que falta antes de enviar').count() === 0);
await page.locator('.ds-compose').getByRole('button', { name: 'Enviar' }).click();
await page.locator('.cs-next').getByRole('button', { name: 'Marcar la reunión como hecha' }).waitFor();
ok('A4 · completa, se envía', true);
await page.getByRole('button', { name: 'Cambiar el título' }).click();
await page.getByLabel('Título del caso').fill('  en curso ');
ok('B12 · título igual a una columna: nota suave, sin bloquear', await page.getByText('Ese título es el nombre de una columna del tablero').isVisible() && await page.getByRole('button', { name: 'Guardar', exact: true }).isEnabled());
await page.getByLabel('Título del caso').scrollIntoViewIfNeeded();
await shot('B12-titulo-como-una-columna');
await page.getByLabel('Título del caso').fill('Comentarios sexuales a compañeras en el turno de noche');
ok('B12 · con otro título la nota desaparece', await page.getByText('Ese título es el nombre de una columna del tablero').count() === 0);
await page.getByRole('button', { name: 'Guardar', exact: true }).click();
await toastGone();

// ── B9 · caso cerrado visto por el gestor ──
await page.locator('.cs-next').getByRole('button', { name: 'Marcar la reunión como hecha' }).click();
await toastGone();
await page.locator('.cs-next').getByRole('button', { name: 'Iniciar la investigación' }).click();
await toastGone();
await page.locator('.cs-next').getByRole('button', { name: 'Responder y cerrar' }).click();
await page.getByRole('dialog').getByLabel('Resultado').selectOption('founded');
await page.getByRole('dialog').locator('textarea').fill('Hemos comprobado los hechos y se han tomado medidas. Gracias por contarlo.');
await page.getByRole('dialog').getByRole('button', { name: 'Enviar y cerrar', exact: true }).click();
await page.locator('.cs-closed').waitFor();
await toastGone();
const closed = await page.locator('.cs-closed').innerText();
ok('B9 · caso cerrado: fecha, resultado y cómo reabrirlo', /Cerrada el \d+ de \w+ de \d{4}/.test(closed) && closed.includes('Resultado: Fundada') && closed.includes('Reabrir'), closed.replace(/\n/g, ' · '));
await page.evaluate(() => window.scrollTo(0, 0));
await shot('B9-caso-cerrado-gestor');
await page.getByRole('button', { name: 'Más acciones' }).click();
ok('B9 · «Reabrir» está en el «···»', await page.getByRole('button', { name: 'Reabrir' }).count() === 1);
await page.keyboard.press('Escape');
ok('B7 · «Remitir al Ministerio Fiscal» es un botón', await page.locator('.cs-fiscal.ds-btn').count() === 1);

// ── B8 · el mismo caso, visto por quien informa ──
await page.goto(`${B}/canal/demo/consulta?lang=es`, { waitUntil: 'networkidle' });
await page.getByLabel('Tu código').fill('VK7P2MQA');
await page.getByRole('button', { name: 'Ver mi caso' }).click();
await page.waitForSelector('.okbox');
const note = await page.locator('.okbox').innerText();
ok('B8 · «Mi caso» cerrado: aviso con la fecha y qué hacer', /Caso cerrado el \d+ de \w+ de \d{4}\./.test(note) && note.includes('puedes escribir aquí o enviar una nueva denuncia'), note);
ok('B8 · se puede seguir escribiendo', await page.locator('#mc-msg').count() === 1);
ok('B8 · no se enseña el resultado interno', !(await page.locator('.mc').innerText()).includes('Fundada'));
await page.locator('.okbox').scrollIntoViewIfNeeded();
await shot('B8-mi-caso-cerrado', { view: !mobile ? true : false });

// ── A2 · caso suprimido ──
await page.goto(`${B}/admin/report`, { waitUntil: 'networkidle' });
await page.waitForSelector('.rp-figs dd');
const before = { open: await page.locator('.rp-facts dd').nth(0).innerText(), total: await page.locator('.rp-figs dd').first().innerText(), missed: await page.locator('.rp-figs dd').nth(3).innerText() };
await page.goto(`${B}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-case');
const needBefore = Number((await page.locator('h1').first().innerText()).match(/\d+/)?.[0] ?? 0);
await page.goto(`${B}/admin/complaints/c-p3ve8nqc`, { waitUntil: 'networkidle' }); // fraude, en investigación, crítica
await page.waitForSelector('.cs-desc');
await page.getByRole('button', { name: 'Más acciones' }).click();
await page.getByRole('button', { name: 'Suprimir datos' }).click();
await page.locator('dialog[open] textarea').fill('Prueba del pulido: supresión del art. 32.');
await page.locator('dialog[open] .ds-dialog-actions button').last().click();
await page.locator('.cs-erased').waitFor({ timeout: 8000 });
await toastGone();
await page.goto(`${B}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-case');
await col('Cerradas');
while (await page.getByRole('button', { name: /^Ver \d+ más/ }).count()) await page.getByRole('button', { name: /^Ver \d+ más/ }).click();
const erasedCard = page.locator('.ds-case', { hasText: 'Datos suprimidos · REF-' });
const where = await erasedCard.first().evaluate(el => { const k = el.closest('.ds-kcol'); return k ? (k.querySelector('.ds-kcol-name, h2')?.innerText ?? k.innerText.split('\n')[0]) : ''; }).catch(() => 'no está');
ok('A2 · el caso suprimido está en «Cerradas» con el chip «Datos suprimidos»', await erasedCard.count() === 1 && (mobile || /Cerradas/.test(where)) && await erasedCard.locator('.ds-chip', { hasText: 'Datos suprimidos' }).count() === 1 && await erasedCard.locator('.ds-chip').count() === 1, where);
await erasedCard.scrollIntoViewIfNeeded();
await shot('A2-tablero-caso-suprimido-en-cerradas');
const needAfter = Number((await page.locator('h1').first().innerText()).match(/\d+/)?.[0] ?? 0);
ok('A2 · ya no cuenta como «te necesita hoy»', needAfter <= needBefore, `${needBefore} → ${needAfter}`);
await page.goto(`${B}/admin/report`, { waitUntil: 'networkidle' });
await page.waitForSelector('.rp-figs dd');
const after = { open: await page.locator('.rp-facts dd').nth(0).innerText(), total: await page.locator('.rp-figs dd').first().innerText() };
const statusTable = await page.locator('.rp-table').innerText();
ok('A2 · Informe: una abierta menos, las recibidas igual, y una fila «Suprimidos»', Number(after.open) === Number(before.open) - 1 && after.total === before.total && /Suprimidos \(art\. 32\)\s+1/.test(statusTable), `abiertas ${before.open} → ${after.open} · ${statusTable.replace(/\s+/g, ' ').slice(-60)}`);
await page.locator('.rp-table').scrollIntoViewIfNeeded();
await shot('A2-informe-suprimidos-aparte');

// ── B10 · filtro de fechas ──
await page.locator('.rp-see').click();
await page.waitForSelector('.pn-filtered');
const y = new Date().getFullYear();
ok('B10 · año completo: «Año 2026»', (await page.locator('.pn-filtered .ds-chip').first().innerText()) === `Año ${y}`, await page.locator('.pn-filtered').innerText());
await shot('B10-filtro-ano-completo');
await page.goto(`${B}/admin?from=${y}-03-01&to=${y}-10-08`, { waitUntil: 'networkidle' });
await page.waitForSelector('.pn-filtered');
ok('B10 · otro periodo: fechas cortas', (await page.locator('.pn-filtered .ds-chip').first().innerText()) === `1 mar – 8 oct ${y}`, await page.locator('.pn-filtered .ds-chip').first().innerText());
await shot('B10-filtro-fechas-cortas');
await page.goto(`${B}/admin?from=${y - 1}-12-15`, { waitUntil: 'networkidle' });
await page.waitForSelector('.pn-filtered');
ok('B10 · solo «desde»', (await page.locator('.pn-filtered .ds-chip').first().innerText()) === `Desde el 15 dic ${y - 1}`, await page.locator('.pn-filtered .ds-chip').first().innerText());
await page.evaluate(() => localStorage.setItem('reportia-panel-lang', 'ca'));
await page.goto(`${B}/admin?from=${y}-03-01&to=${y}-10-08`, { waitUntil: 'networkidle' });
await page.waitForSelector('.pn-filtered');
ok('B10 · en catalán', (await page.locator('.pn-filtered .ds-chip').first().innerText()) === `1 març – 8 oct ${y}`, await page.locator('.pn-filtered .ds-chip').first().innerText());
await page.evaluate(() => localStorage.setItem('reportia-panel-lang', 'en'));
await page.goto(`${B}/admin?from=${y}-01-01&to=${y}-12-31`, { waitUntil: 'networkidle' });
await page.waitForSelector('.pn-filtered');
ok('B10 · en inglés', (await page.locator('.pn-filtered .ds-chip').first().innerText()) === `Year ${y}`);
await page.evaluate(() => localStorage.setItem('reportia-panel-lang', 'es'));

// ── B11 · «Primeros pasos» plegable ──
await page.goto(`${B}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('.pn-steps');
await shot('B11-primeros-pasos-desplegado');
await page.getByRole('button', { name: 'Plegar «Primeros pasos»' }).click();
ok('B11 · plegada: una píldora «Primeros pasos · 3/5»', (await page.locator('.pn-steps-pill').innerText()) === 'Primeros pasos · 3/5' && await page.locator('.pn-steps').count() === 0);
await shot('B11-primeros-pasos-plegado');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.ds-case');
await page.waitForSelector('.pn-steps-pill');
ok('B11 · al recargar sigue plegada', await page.locator('.pn-steps').count() === 0);
ok('B11 · la píldora sigue llevando a Compartir', (await page.locator('.pn-steps-pill').getAttribute('href')) === '/admin/integration');
await page.getByRole('button', { name: 'Desplegar «Primeros pasos»' }).click();
ok('B11 · se vuelve a desplegar', await page.locator('.pn-steps').count() === 1);

console.log(problems.length ? `\nPROBLEMAS (${problems.length} de ${checks}):\n${problems.join('\n')}` : `\n${checks} comprobaciones, sin problemas`);
await browser.close();
