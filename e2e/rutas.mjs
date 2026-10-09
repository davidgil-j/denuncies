import { chromium } from './lib/playwright.mjs';
const browser = await chromium.launch();
const B = 'http://localhost:3111';
const rows = []; let bad = 0;
for (const auth of [true, false]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
  if (auth) await page.addInitScript(() => { sessionStorage.setItem('reportia-demo-session', '1'); sessionStorage.setItem('reportia-demo-aal', '2'); localStorage.setItem('reportia-panel-lang', 'es'); });
  const ROUTES = auth
    ? ['/admin', '/admin/', '/admin/users', '/admin/account', '/admin/mfa', '/admin/report', '/admin/integration', '/admin/ajustes', '/admin/nueva', '/admin/complaints/c-vk7p2mqa', '/admin/complaints/no-existe', '/admin/dashboard', '/admin/detail', '/admin/detail/c-vk7p2mqa', '/admin/settings', '/admin/security', '/admin/informe', '/admin/compartir', '/admin?v=all', '/admin?v=all&from=2026-01-01&to=2026-12-31', '/admin/login', '/admin/forgot-password', '/admin/reset-password']
    : ['/', '/privacitat', '/crear-compte', '/canal', '/canal/', '/canal/demo', '/canal/demo/', '/canal/demo/denuncia', '/canal/demo/consulta', '/canal/demo/privacidad', '/canal/demo/seguimiento', '/canal/demo/loquesea/otra', '/canal/no-existe', '/canal/no-existe/denuncia', '/admin', '/admin/users', '/admin/complaints/c-vk7p2mqa', '/admin/login', '/admin/login?from=demo', '/admin/forgot-password', '/admin/reset-password', '/login', '/dashboard', '/seguimiento', '/una-direccion-que-no-existe'];
  for (const r of ROUTES) {
    errs.length = 0;
    await page.goto(B + r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const info = await page.evaluate(() => ({ url: location.pathname + location.search, text: document.body.innerText.trim().length, h1: (document.querySelector('h1')?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 46) }));
    const fine = info.text > 40 && errs.length === 0;
    if (!fine) bad++;
    rows.push(`${fine ? 'OK   ' : 'FALLA'} ${auth ? 'con sesión' : 'sin sesión'} | ${r.padEnd(44)} → ${info.url.padEnd(40)} | ${info.h1}${errs.length ? ' | ERR: ' + errs[0] : ''}`);
  }
  await ctx.close();
}
console.log(rows.join('\n')); console.log(bad ? `\n${bad} rutas con problemas` : '\nNinguna ruta en blanco ni con error');
await browser.close();
