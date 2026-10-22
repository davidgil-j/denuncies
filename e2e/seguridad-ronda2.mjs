// Ronda 2 de seguridad (docs/seguridad): C1 (exclusión por caso) y A1 (código de 16 caracteres), en modo
// demo. No sale nada del ordenador: la demo vive en el navegador (demoStore). La capa de base de datos se
// prueba aparte con `npm run db:test` (bloques 020 y 021); aquí se comprueba el navegador.
import { chromium } from './lib/playwright.mjs';
const OUT = process.argv[2];
const APP = 'http://localhost:3111';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' });
const page = await ctx.newPage();
const problems = [];
const ok = (name, v, extra = '') => { console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(name); };
page.on('pageerror', e => problems.push(`error: ${e.message.slice(0, 200)}`));
page.on('console', m => { if (m.type() === 'error' && !/\[Supabase\]|Failed to load resource/.test(m.text())) problems.push(`consola: ${m.text().slice(0, 200)}`); });
await page.addInitScript(() => { try { localStorage.setItem('reportia-panel-lang', 'es'); } catch { /* sin almacenamiento */ } });
let n = 0;
const shot = async (name) => { await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${name}.png` }); };

/** Envía una denuncia en el canal demo. Si excludeName, aparta a esa persona del caso (C1). Devuelve el código. */
async function submit(desc, excludeName) {
  await page.goto(`${APP}/canal/demo?lang=es`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Presentar una denuncia' }).click();
  await page.getByRole('radio', { name: /Fraude o corrupción/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.fill('#dn-description', desc);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.waitForSelector('#dn-privacy');
  // La sección de «apartar» está plegada por defecto (para que el paso quepa en portátiles): se abre con su fila
  const toggle = page.getByRole('button', { name: /¿Hay alguien del panel que no debería ver tu caso\?/ });
  await toggle.waitFor({ timeout: 5000 }).catch(() => {});
  ok('C1 · el formulario ofrece apartar a alguien del panel', await toggle.isVisible());
  if (excludeName) {
    await toggle.click();
    await page.getByRole('checkbox', { name: new RegExp(excludeName) }).check();
    await shot('c1-apartar');
  }
  await page.locator('#dn-privacy').check();
  await page.getByRole('button', { name: /Enviar denuncia/ }).click();
  await page.waitForSelector('.code-big');
  return (await page.locator('.code-big').textContent()).trim();
}

const codeExcluded = await submit('Caso delicado contra la direccion, token zqxexcluido para la auditoria.', 'Laura');
ok('A1 · el código nuevo tiene 16 caracteres', /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/.test(codeExcluded), codeExcluded);
const codeVisible = await submit('Caso normal del equipo, token zqxvisible para la auditoria.');
ok('A1 · el código del segundo caso también tiene 16 caracteres', /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/.test(codeVisible), codeVisible);

// Entrar al panel (demo: cualquier correo y contraseña y cualquier código de 6 cifras)
await page.goto(`${APP}/admin/login?from=demo`, { waitUntil: 'networkidle' });
await page.getByLabel('Correo').fill('laura.puig@empresa-demo.es');
await page.locator('#ac-pw').fill('una-contraseña-larga');
await page.getByRole('button', { name: 'Entrar' }).click();
await page.waitForSelector('.ds-otp');
await page.locator('.ds-otp-box').first().focus();
await page.keyboard.type('123456', { delay: 60 });
await page.waitForSelector('.ds-case', { timeout: 15000 });

// El caso normal SÍ se encuentra; el caso que apartó a la administradora NO (C1)
async function search(token) {
  await page.getByRole('button', { name: 'Buscar' }).click();
  await page.waitForSelector('.pn-search');
  await page.getByPlaceholder('Referencia o texto').fill(token);
  await page.waitForTimeout(500);
}
await search('zqxvisible');
const foundVisible = await page.locator('.pn-found li').count();
ok('C1 · el caso normal aparece en el panel', foundVisible === 1, `encontrados: ${foundVisible}`);
await shot('c1-visible-encontrado');
await page.locator('.pn-found li button').first().click();
await page.waitForSelector('#cs-access');
ok('C1 · la ficha enseña «Quién gestiona este caso»', await page.getByRole('heading', { name: 'Quién gestiona este caso' }).isVisible());
const rows = await page.locator('.cs-access-row').count();
ok('C1 · lista al equipo que gestiona el caso', rows === 3, `filas: ${rows}`);
ok('C1 · un administrador puede apartar a alguien más', await page.locator('.cs-access-row').getByRole('button', { name: 'Apartar' }).count() >= 1);
await shot('c1-ficha-accesos');

await page.goto(`${APP}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('.ds-case');
await search('zqxexcluido');
ok('C1 · el caso que apartó a la administradora NO aparece para ella', (await page.locator('.pn-found li').count()) === 0 && await page.locator('.pn-search').getByText('Ningún caso coincide.').first().isVisible());
await shot('c1-excluido-oculto');

await browser.close();
if (problems.length) { console.error(`\n${problems.length} problema(s):\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('\nseguridad-ronda2: todo correcto');
