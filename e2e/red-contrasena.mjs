// «Contraseña nueva» con la red simulada, en modo real: los formatos de enlace que puede mandar Supabase.
import { chromium } from './lib/playwright.mjs';
const OUT = process.argv[2];
const APP = 'http://localhost:3112', API = 'http://localhost:59999';
const browser = await chromium.launch();
const problems = [];
const ok = (name, v, extra = '') => { console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(name); };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const USER = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'laura.puig@acme.es', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z', factors: [] };
const JWT = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER.id, role: 'authenticated', email: USER.email, aal: 'aal1', amr: [{ method: 'recovery', timestamp: now }], iat: now, exp: now + 3600, session_id: 's1' })}.${Buffer.from('firma-de-prueba-que-nadie-comprueba').toString('base64url')}`;
const SESSION = { access_token: JWT, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: 'r1', user: USER };
async function run(name, url, { seedVerifier = false, w = 1440, capture } = {}) {
  const mobile = w < 700;
  const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 812 : 900 }, deviceScaleFactor: mobile ? 2 : 1, locale: 'es-ES' });
  const page = await ctx.newPage();
  const calls = [];
  page.on('pageerror', e => problems.push(`${name}: ${e.message.slice(0, 160)}`));
  await page.addInitScript((seed) => { localStorage.setItem('reportia-panel-lang', 'es'); if (seed) sessionStorage.setItem('sb-localhost-auth-token-code-verifier', JSON.stringify('verificador-de-prueba')); }, seedVerifier);
  await page.route(`${API}/**`, async (route) => {
    const req = route.request(); const u = new URL(req.url()); const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let body = null; try { body = req.postDataJSON(); } catch {}
    calls.push(`${req.method()} ${u.pathname}${u.search}`);
    const json = (b, status = 200) => route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(b) });
    if (u.pathname === '/auth/v1/user' && req.method() === 'GET') return json(USER);
    if (u.pathname === '/auth/v1/user' && req.method() === 'PUT') return json({ ...USER, updated: body?.password ? 'ok' : 'no' });
    if (u.pathname === '/auth/v1/token' && u.search.includes('pkce')) return body?.auth_code === 'codigo-bueno' && body?.code_verifier ? json(SESSION) : json({ error: 'invalid_grant', error_description: 'bad code' }, 400);
    if (u.pathname === '/auth/v1/verify') return body?.token_hash === 'hash-bueno' ? json(SESSION) : json({ error_code: 'otp_expired', msg: 'Email link is invalid or has expired' }, 403);
    if (u.pathname === '/auth/v1/factors') return json([]);
    return json({}, 200);
  });
  await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
  const t0 = Date.now();
  await page.goto(`${APP}${url}`, { waitUntil: 'networkidle' });
  const result = await Promise.race([
    page.getByLabel('Contraseña nueva').waitFor({ timeout: 14000 }).then(() => 'formulario'),
    page.getByText('El enlace no es válido o ha caducado').waitFor({ timeout: 14000 }).then(() => 'caducado'),
  ]).catch(() => 'nada');
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const h1 = (await page.locator('h1').first().innerText().catch(() => '')).trim();
  if (capture) { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/${w}-A1-${capture}.png` }); }
  let saved = null;
  if (result === 'formulario') {
    await page.getByLabel('Contraseña nueva').fill('una-frase-larga-2026');
    await page.getByLabel('Repite la contraseña').fill('una-frase-larga-2026');
    await page.locator('form button[type=submit]').click();
    await page.waitForTimeout(1200);
    saved = calls.includes('PUT /auth/v1/user');
  }
  await ctx.close();
  return { result, secs, h1, saved, tokenGone: true };
}
const HASH = `#access_token=${JWT}&expires_in=3600&expires_at=${now + 3600}&refresh_token=r1&token_type=bearer&type=`;
let r;
r = await run('hash recovery', `/admin/reset-password${HASH}recovery`, { capture: 'enlace-de-recuperacion' });
ok('formato #access_token…&type=recovery: sale el formulario y guarda la contraseña', r.result === 'formulario' && r.saved && r.h1 === 'Contraseña nueva', `${r.result} en ${r.secs}s · «${r.h1}»`);
r = await run('hash recovery móvil', `/admin/reset-password${HASH}recovery`, { w: 375, capture: 'enlace-de-recuperacion' });
ok('lo mismo en móvil', r.result === 'formulario' && r.saved, `${r.result} en ${r.secs}s`);
r = await run('hash invite', `/admin/reset-password${HASH}invite`, { capture: 'invitacion' });
ok('invitación (#…type=invite): formulario de bienvenida', r.result === 'formulario' && r.saved && r.h1 === 'Te damos la bienvenida', `${r.result} · «${r.h1}»`);
r = await run('code', '/admin/reset-password?code=codigo-bueno', { seedVerifier: true });
ok('formato ?code=…: sale el formulario y guarda la contraseña', r.result === 'formulario' && r.saved, `${r.result} en ${r.secs}s`);
r = await run('token_hash', '/admin/reset-password?token_hash=hash-bueno&type=recovery');
ok('formato ?token_hash=…&type=recovery: sale el formulario y guarda', r.result === 'formulario' && r.saved, `${r.result} en ${r.secs}s`);
r = await run('token_hash invite', '/admin/reset-password?token_hash=hash-bueno&type=invite');
ok('invitación con ?token_hash=…: formulario de bienvenida', r.result === 'formulario' && r.h1 === 'Te damos la bienvenida', `${r.result} · «${r.h1}»`);
r = await run('caducado', '/admin/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', { capture: 'enlace-caducado' });
ok('enlace caducado de verdad: lo dice enseguida, sin esperar 10 s', r.result === 'caducado' && Number(r.secs) < 5, `${r.result} en ${r.secs}s`);
r = await run('caducado móvil', '/admin/reset-password#error=access_denied&error_code=otp_expired', { w: 375, capture: 'enlace-caducado' });
r = await run('hash malo', '/admin/reset-password?token_hash=hash-malo&type=recovery');
ok('código que el servidor rechaza: enlace no válido', r.result === 'caducado' && Number(r.secs) < 6, `${r.result} en ${r.secs}s`);
r = await run('sin enlace', '/admin/reset-password');
ok('sin enlace ni sesión: acaba en «no válido» (tras la espera)', r.result === 'caducado', `${r.result} en ${r.secs}s`);
console.log(problems.length ? `\nPROBLEMAS:\n${problems.join('\n')}` : '\nsin problemas');
await browser.close();
