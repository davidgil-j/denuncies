import { chromium } from './lib/playwright.mjs';
const [OUT, W] = [process.argv[2], Number(process.argv[3])];
const H = W === 1440 ? 900 : 812;
const OFF = 'http://localhost:3111', ON = 'http://localhost:3113';
const mobile = W <= 640;
const browser = await chromium.launch();
const problems = [];
const ok = (name, v, extra = '') => { console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(name); };
let n = 0;
async function session() {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile, locale: 'es-ES' });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') problems.push(`consola: ${m.text().slice(0, 300)}`); });
  page.on('pageerror', e => problems.push(`error: ${e.message.slice(0, 300)}`));
  const outside = [];
  await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => { outside.push(r.request().url()); r.abort(); });
  await page.addInitScript(() => { sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); if (!localStorage.getItem('reportia-panel-lang')) localStorage.setItem('reportia-panel-lang', 'es'); });
  return { ctx, page, outside };
}
async function shot(page, name, { view = false } = {}) {
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
const CASE = '/admin/complaints/c-vk7p2mqa'; // acoso, recién llegada
const CASE2 = '/admin/complaints/c-j6yb3kmv'; // contabilidad, en investigación
// Texto de la ficha sin lo que cambia con el reloj
const skeleton = (page) => page.evaluate(() => [...document.querySelectorAll('.cs h1, .cs h2, .cs button, .cs a, .cs label')].map(e => `${e.tagName}:${(e.getAttribute('aria-label') || e.innerText || '').trim().slice(0, 40)}`).join('|'));

// ══ APAGADA ══
{
  const { ctx, page } = await session();
  await page.goto(`${OFF}${CASE}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cs-desc');
  ok('apagada: la ficha no tiene nada de IA', await page.locator('.ai-card').count() === 0 && await page.getByText(/\bIA\b/).count() === 0);
  const offSkeleton = await skeleton(page);
  await shot(page, 'IA-apagada-ficha-del-caso');
  await page.getByRole('button', { name: 'Enviar el acuse de recibo' }).first().click();
  await page.locator('dialog[open]').waitFor();
  ok('apagada: el acuse no ofrece «Redactar con IA»', await page.locator('dialog[open]').getByText(/IA/).count() === 0);
  await shot(page, 'IA-apagada-acuse', { view: true });
  await page.keyboard.press('Escape');
  await page.goto(`${OFF}/admin`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.ds-case');
  const titlesOff = await page.locator('.ds-case-title, .ds-case h3').allInnerTexts();
  await shot(page, 'IA-apagada-tablero', { view: true });
  await ctx.close();

  // ══ ENCENDIDA (demo, respuestas simuladas) ══
  const on = await session();
  const p2 = on.page;
  await p2.goto(`${ON}/admin`, { waitUntil: 'networkidle' });
  await p2.waitForSelector('.ds-case');
  const titlesOn = await p2.locator('.ds-case-title, .ds-case h3').allInnerTexts();
  ok('encendida, antes de generar nada: el tablero es idéntico', titlesOn.join('|') === titlesOff.join('|') && titlesOn.length > 5, `${titlesOn.length} tarjetas`);
  await p2.goto(`${ON}${CASE}`, { waitUntil: 'networkidle' });
  await p2.waitForSelector('.ai-card');
  const onSkeleton = await skeleton(p2);
  const extra = onSkeleton.split('|').filter(x => !offSkeleton.split('|').includes(x));
  ok('encendida: lo único que se añade a la ficha son las dos ayudas', extra.join('|') === 'H2:Resumen|BUTTON:Resumir con IA|BUTTON:Redactar con IA', extra.join(' · '));
  ok('encendida: explica que no usa datos personales', await p2.getByText('sin sus datos personales').isVisible());
  await shot(p2, 'IA-encendida-ficha-sin-resumen');
  await p2.getByRole('button', { name: 'Resumir con IA' }).click();
  await p2.locator('.ai-wait').waitFor();
  await shot(p2, 'IA-encendida-generando', { view: true });
  await p2.locator('.ai-title').waitFor({ timeout: 8000 });
  const sum = await p2.locator('.ai-text').innerText();
  ok('resumen de 3 frases', sum.split(/\.\s|\.$/).filter(Boolean).length === 3, sum.slice(0, 60));
  ok('aviso de que es IA y puede tener errores', await p2.getByText(/Hecho con IA el .* puede tener errores/).isVisible());
  const st = await p2.evaluate(() => { const s = JSON.parse(sessionStorage.getItem('reportia-demo-store-v4')); const c = s.complaints.find(x => x.id === 'c-vk7p2mqa'); return { ai: !!c.ai_summary, title: c.title, log: s.audit.filter(a => a.complaint_id === 'c-vk7p2mqa' && a.action === 'ai_summary').length, msgs: s.messages['c-vk7p2mqa'].length, status: c.status }; });
  ok('se guarda en el caso y queda en el historial', st.ai && st.log === 1 && await p2.locator('.cs-hist').getByText('generó el resumen con IA').count() === 1);
  ok('generar el resumen no envía mensajes ni cambia el estado', st.msgs === 0 && st.status === 'received', JSON.stringify(st));
  await p2.locator('.pn-toast').waitFor({ state: 'detached', timeout: 8000 });
  await shot(p2, 'IA-encendida-resumen');
  // Usar el título propuesto
  const h1Before = (await p2.locator('.cs-title h1').innerText()).trim();
  await p2.getByRole('button', { name: 'Usar como título' }).click();
  await p2.locator('.cs-title h1', { hasText: 'Comentarios y trato humillante hacia varias compañeras' }).waitFor();
  ok('«Usar como título» cambia el título (antes era el puesto a mano)', h1Before !== 'Comentarios y trato humillante hacia varias compañeras' && await p2.getByRole('button', { name: 'Usar como título' }).count() === 0, h1Before);
  // Redactar en la conversación: propone, no envía
  await p2.locator('.pn-toast').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  await p2.getByRole('button', { name: 'Redactar con IA' }).click();
  await shot(p2, 'IA-encendida-menu-redactar', { view: true });
  await p2.getByRole('button', { name: 'Pedir más datos' }).click();
  await p2.waitForFunction(() => document.getElementById('cs-msg')?.value.includes('necesitamos concretar'), null, { timeout: 8000 });
  const after = await p2.evaluate(() => JSON.parse(sessionStorage.getItem('reportia-demo-store-v4')).messages['c-vk7p2mqa'].length);
  ok('el borrador va a la caja de texto y NO se envía', after === 0 && await p2.locator('.ds-chat-msg').count() === 0);
  ok('avisa de que hay que revisarlo', await p2.locator('.pn-toast', { hasText: 'Revísalo y cámbialo antes de enviar' }).isVisible());
  await p2.locator('.pn-toast').waitFor({ state: 'detached', timeout: 8000 });
  await p2.locator('#cs-msg').scrollIntoViewIfNeeded();
  await shot(p2, 'IA-encendida-borrador-en-la-caja', { view: true });
  // Con algo escrito, pregunta antes de sustituir
  await p2.locator('#cs-msg').fill('Esto lo he escrito yo.');
  await p2.getByRole('button', { name: 'Redactar con IA' }).click();
  await p2.getByRole('button', { name: 'Respuesta final' }).click();
  await p2.getByRole('heading', { name: '¿Sustituir lo que has escrito?' }).waitFor({ timeout: 8000 });
  await shot(p2, 'IA-encendida-pregunta-antes-de-sustituir', { view: true });
  await p2.getByRole('button', { name: 'Dejar mi texto' }).click();
  ok('«Dejar mi texto» conserva lo escrito', (await p2.locator('#cs-msg').inputValue()) === 'Esto lo he escrito yo.');
  await p2.locator('#cs-msg').fill('');
  // En el acuse
  await p2.getByRole('button', { name: 'Enviar el acuse de recibo' }).first().click();
  await p2.locator('dialog[open]').getByRole('button', { name: 'Redactar con IA' }).click();
  await p2.waitForFunction(() => document.querySelector('dialog[open] textarea')?.value.startsWith('Hemos recibido su comunicación'), null, { timeout: 8000 });
  ok('acuse: el borrador sustituye la plantilla sin preguntar y espera a que pulses enviar', (await p2.evaluate(() => JSON.parse(sessionStorage.getItem('reportia-demo-store-v4')).complaints.find(x => x.id === 'c-vk7p2mqa').status)) === 'received');
  await p2.locator('.pn-toast').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  await shot(p2, 'IA-encendida-acuse-con-borrador', { view: true });
  await p2.keyboard.press('Escape');
  // El título propuesto sale en el tablero cuando no hay uno puesto a mano
  await p2.goto(`${ON}${CASE2}`, { waitUntil: 'networkidle' });
  await p2.waitForSelector('.ai-card');
  await p2.getByRole('button', { name: 'Resumir con IA' }).click();
  await p2.locator('.ai-title').waitFor({ timeout: 8000 });
  await p2.goto(`${ON}/admin`, { waitUntil: 'networkidle' });
  await p2.waitForSelector('.ds-case');
  ok('tablero: el caso sin título a mano enseña el propuesto por la IA', await p2.locator('.ds-case', { hasText: 'Posibles apuntes contables que no reflejan la realidad' }).count() === 1);
  await shot(p2, 'IA-encendida-tablero', { view: true });
  // Suprimir borra el resumen
  await p2.goto(`${ON}${CASE2}`, { waitUntil: 'networkidle' });
  await p2.waitForSelector('.ai-text');
  await p2.getByRole('button', { name: 'Más acciones' }).click();
  await p2.getByRole('button', { name: 'Suprimir datos' }).click();
  await p2.locator('dialog[open] textarea').fill('Prueba: supresión completa del caso.');
  await p2.locator('dialog[open] .ds-dialog-actions button').last().click();
  await p2.locator('.cs-erased').waitFor({ timeout: 8000 });
  const gone = await p2.evaluate(() => { const c = JSON.parse(sessionStorage.getItem('reportia-demo-store-v4')).complaints.find(x => x.id === 'c-j6yb3kmv'); return [c.ai_summary, c.ai_title, c.title, c.incident_when, c.description]; });
  ok('suprimir el caso borra también el resumen, el título y el «cuándo»', gone.every(x => x === null || x === '') && await p2.locator('.ai-card').count() === 0, JSON.stringify(gone));
  // Quien denuncia nunca ve nada de IA
  await p2.goto(`${ON}/canal/demo/consulta?lang=es`, { waitUntil: 'networkidle' });
  await p2.getByLabel('Tu código').fill('VK7P2MQA');
  await p2.getByRole('button', { name: 'Ver mi caso' }).click();
  await p2.waitForSelector('.mc');
  ok('quien denuncia no ve ni el resumen ni el título de la IA', await p2.getByText(/\bIA\b|Comentarios y trato humillante|Resumen/).count() === 0);
  await p2.goto(`${ON}/canal/demo/denuncia?lang=es`, { waitUntil: 'networkidle' });
  await p2.waitForSelector('.flow');
  ok('el formulario de denuncia no tiene nada de IA', await p2.getByText(/\bIA\b/).count() === 0);
  ok('ninguna petición sale del ordenador (la demo no llama a ningún servicio)', on.outside.length === 0, on.outside.slice(0, 2).join(' '));
  // Otros idiomas
  await p2.evaluate(() => localStorage.setItem('reportia-panel-lang', 'ca'));
  await p2.goto(`${ON}${CASE}`, { waitUntil: 'networkidle' });
  await p2.waitForSelector('.ai-text');
  ok('catalán', await p2.getByRole('button', { name: 'Tornar a generar' }).isVisible() && await p2.getByRole('button', { name: 'Redactar amb IA' }).isVisible());
  await shot(p2, 'IA-encendida-catala');
  await p2.evaluate(() => localStorage.setItem('reportia-panel-lang', 'en'));
  await p2.reload({ waitUntil: 'networkidle' });
  await p2.waitForSelector('.ai-text');
  ok('inglés', await p2.getByRole('button', { name: 'Generate again' }).isVisible() && await p2.getByRole('button', { name: 'Draft with AI' }).isVisible());
  await shot(p2, 'IA-encendida-english');
  await on.ctx.close();
}
console.log(problems.length ? `\nPROBLEMAS (${problems.length}):\n${problems.join('\n')}` : '\nsin problemas');
await browser.close();
process.exit(problems.length ? 1 : 0);
