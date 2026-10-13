// Cierre de sesión por inactividad (A1-13): 30 minutos sin tocar el panel → acceso con el aviso.
// Con actividad, no se cierra. En modo demo, adelantando el reloj del navegador.
import { chromium } from './lib/playwright.mjs';
const B = 'http://localhost:3111';
const browser = await chromium.launch();
const problems = [];
const ok = (name, v, extra = '') => { console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(name); };
async function panel() {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'es-ES' });
  const page = await ctx.newPage();
  page.on('pageerror', e => problems.push(`error: ${e.message.slice(0, 200)}`));
  // La sesión de demo se pone una sola vez (si no, cada carga de página la volvería a abrir)
  await page.addInitScript(() => { if (sessionStorage.getItem('e2e-init')) return; sessionStorage.setItem('e2e-init', '1'); sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); });
  await page.clock.install();
  await page.goto(`${B}/admin`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.ds-case');
  return page;
}
// Con actividad cada 10 minutos, sigue abierta
let page = await panel();
for (let i = 0; i < 4; i++) { await page.clock.fastForward('10:00'); await page.mouse.wheel(0, 200); await page.keyboard.press('Shift'); }
await page.clock.fastForward('01:00');
ok('con actividad, 41 minutos después la sesión sigue abierta', /\/admin\/?$/.test(new URL(page.url()).pathname), page.url());
await page.context().close();
// Sin actividad, a los 30 minutos se cierra
page = await panel();
await page.clock.fastForward('29:00');
ok('a los 29 minutos sin actividad, sigue abierta', /\/admin\/?$/.test(new URL(page.url()).pathname));
await page.clock.fastForward('02:00');
await page.waitForURL(/\/admin\/login\?idle=1/, { timeout: 10000 }).catch(() => {});
ok('a los 31 minutos, vuelve al acceso', /\/admin\/login/.test(page.url()), page.url());
await page.waitForTimeout(800);
const idleTxt = await page.locator('.ac-idle').innerText().catch(() => '');
ok('…con el aviso de por qué', /30 minut/.test(idleTxt), `«${idleTxt}» ${page.url()}`);
await page.goto(`${B}/admin`, { waitUntil: 'networkidle' });
ok('…y la sesión está cerrada de verdad (el panel pide entrar otra vez)', /\/admin\/login/.test(page.url()), page.url());
await browser.close();
console.log(problems.length ? `PROBLEMAS: ${problems.join(' · ')}` : 'Cierre por inactividad, sin problemas');
process.exit(problems.length ? 1 : 0);
