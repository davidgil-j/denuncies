// La comprobación contra robots (Cloudflare Turnstile, n.º 71), en modo real con la red simulada:
//   · sin clave (puerto 3112): el acceso, «He olvidado la contraseña» y el alta funcionan como siempre, sin pedir nada a Cloudflare;
//   · con la clave de pruebas de Cloudflare (1x00000000000000000000AA, puerto 3115): las tres pantallas la piden, el botón
//     espera al token, el token viaja a Supabase Auth, si el servidor lo rechaza se pide otro, si caduca se espera otra vez y,
//     si el script no carga, se dice con claridad y «Reintentar» lo arregla. Sin token no se deja pasar;
//   · el canal NUNCA la pide ni carga nada de Cloudflare, tenga la clave o no.
// El script de Cloudflare se sustituye por uno de prueba que se porta como su clave de pruebas (devuelve el token
// XXXX.DUMMY.TOKEN.XXXX): nada sale del ordenador. Con E2E_TURNSTILE_REAL=1 se usa el de verdad (pide a Cloudflare).
import { chromium } from './lib/playwright.mjs';

const API = 'http://localhost:59999';
const WITH = 'http://localhost:3115';
const WITHOUT = 'http://localhost:3112';
const REAL = process.env.E2E_TURNSTILE_REAL === '1';
const TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';
const problems = [];
const ok = (name, v, extra = '') => { console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(name); };

// El Turnstile de prueba: pinta su recuadro, da el token al poco, y deja forzar que caduque (window.__ts.expire())
const FAKE_TURNSTILE = `(function () {
  var n = 0, widgets = {};
  window.__ts = { renders: 0, resets: 0, expire: function () { for (var k in widgets) { var o = widgets[k]; o['expired-callback'] && o['expired-callback'](); } } };
  window.turnstile = {
    render: function (el, o) {
      var id = 'w' + (++n); widgets[id] = o; window.__ts.renders++; window.__ts.sitekey = o.sitekey;
      var box = document.createElement('div'); box.className = 'fake-turnstile'; box.style.cssText = 'height:65px;border:1px solid #ccc;border-radius:6px'; box.textContent = 'Turnstile de prueba';
      el.appendChild(box);
      setTimeout(function () { o.callback && o.callback('${TOKEN}'); }, 250);
      return id;
    },
    reset: function (id) { var o = widgets[id]; window.__ts.resets++; if (o) setTimeout(function () { o.callback && o.callback('${TOKEN}'); }, 250); },
    remove: function (id) { delete widgets[id]; },
  };
  var cb = new URL(document.currentScript.src).searchParams.get('onload');
  if (cb && window[cb]) window[cb]();
})();`;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const USER = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'laura@acme.es', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z',
  factors: [{ id: 'f1', factor_type: 'totp', status: 'verified', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }] };
const JWT = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER.id, role: 'authenticated', email: USER.email, aal: 'aal1', amr: [{ method: 'password', timestamp: now }], iat: now, exp: now + 3600, session_id: 's1' })}.${Buffer.from('x').toString('base64url')}`;
const SESSION = { access_token: JWT, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: 'r1', user: USER };

const browser = await chromium.launch();

/**
 * Una página con la red simulada. auth: lo que responde Supabase Auth (por defecto, bien). turnstile: 'fake' | 'block' |
 * 'hang' | 'real'. Devuelve { page, calls, cloudflare, setTurnstile }
 */
async function open(base, path, { auth = {}, turnstile = 'fake', w = 1280 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, locale: 'es-ES' });
  const page = await ctx.newPage();
  const calls = [];
  const cloudflare = [];
  let mode = REAL && turnstile === 'fake' ? 'real' : turnstile;
  page.on('pageerror', e => problems.push(`${path}: ${e.message.slice(0, 160)}`));
  await page.addInitScript(() => { try { localStorage.setItem('reportia-panel-lang', 'es'); } catch { /* sin almacenamiento */ } });
  const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let body = null; try { body = req.postDataJSON(); } catch { /* sin cuerpo */ }
    calls.push({ method: req.method(), path: u.pathname, search: u.search, body });
    const json = (b, status = 200) => route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(b) });
    const custom = auth[u.pathname];
    if (custom) return custom(json, body, calls.filter(c => c.path === u.pathname).length);
    if (u.pathname === '/auth/v1/token') return json(SESSION);
    if (u.pathname === '/auth/v1/user') return json(USER);
    if (u.pathname === '/auth/v1/factors') return json(USER.factors);
    if (u.pathname === '/auth/v1/recover') return json({});
    if (u.pathname === '/auth/v1/signup') return json({ ...USER, identities: [{}], confirmation_sent_at: new Date().toISOString() });
    if (u.pathname === '/rest/v1/rpc/get_organization_by_slug') return json([{ id: 'org-1', name: 'Acme Logística, S.L.', slug: 'acme', regional_authority_name: null, regional_authority_url: null }]);
    if (u.pathname === '/rest/v1/rpc/submit_complaint') return json('bbbbbbbb-0000-4000-8000-000000000001');
    if (['/rest/v1/attachments', '/rest/v1/audit_logs', '/rest/v1/messages'].includes(u.pathname) && req.method() === 'POST') return route.fulfill({ status: 201, headers, body: '' });
    return json([]);
  });
  await page.route('https://challenges.cloudflare.com/**', async (route) => {
    cloudflare.push(route.request().url());
    if (mode === 'real') return route.continue();
    if (mode === 'block') return route.abort();
    if (mode === 'hang') return undefined; // no responde nunca
    return route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_TURNSTILE });
  });
  await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !u.toString().startsWith('https://challenges.cloudflare.com') && !/^(data|blob):/.test(u.toString()), r => r.abort());
  await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
  return { page, ctx, calls, cloudflare, setTurnstile: (m) => { mode = m; } };
}
const tokenOf = (call) => call?.body?.gotrue_meta_security?.captcha_token;
const enabled = (loc) => loc.evaluate(b => !b.disabled);
const waitEnabled = async (loc, ms = 10000) => {
  const h = await loc.elementHandle();
  return loc.page().waitForFunction(el => !el.disabled, h, { timeout: ms }).then(() => true).catch(() => false);
};

// ── Sin clave: como siempre ──
{
  const { page, ctx, calls, cloudflare } = await open(WITHOUT, '/admin/login?lang=es');
  await page.waitForSelector('.ac-form');
  ok('sin clave · acceso: sin recuadro de comprobación y «Entrar» activo', await page.locator('.ds-captcha').count() === 0 && await enabled(page.getByRole('button', { name: 'Entrar' })));
  await page.getByLabel('Correo').fill(USER.email);
  await page.locator('#ac-pw').fill('una-contraseña-larga');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForSelector('.ds-otp', { timeout: 10000 });
  const login = calls.find(c => c.path === '/auth/v1/token');
  ok('sin clave · acceso: entra y no manda ningún token', !!login && !tokenOf(login));
  await page.goto(`${WITHOUT}/admin/forgot-password?lang=es`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.ac-form');
  ok('sin clave · recuperar: sin recuadro', await page.locator('.ds-captcha').count() === 0);
  await page.getByLabel('Correo').fill(USER.email);
  await page.getByRole('button', { name: 'Enviar el enlace' }).click();
  await page.waitForFunction(() => !document.querySelector('.ac-form button[type=submit][aria-busy="true"]'));
  await page.waitForTimeout(600);
  const rec = calls.find(c => c.path === '/auth/v1/recover');
  ok('sin clave · recuperar: envía el enlace sin token', !!rec && !tokenOf(rec));
  await page.goto(`${WITHOUT}/crear-compte?lang=es`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('form');
  ok('sin clave · alta: sin recuadro', await page.locator('.ds-captcha').count() === 0);
  ok('sin clave · nada pedido a Cloudflare', cloudflare.length === 0, cloudflare.join(' '));
  await ctx.close();
}

// ── Con la clave de pruebas: acceso ──
{
  const { page, ctx, calls, cloudflare } = await open(WITH, '/admin/login?lang=es', {
    // La primera vez, Supabase rechaza el token (caducado); la segunda, entra
    auth: { '/auth/v1/token': (json, body, n) => (n === 1 ? json({ code: 400, error_code: 'captcha_failed', msg: 'captcha protection: request disallowed (timeout-or-duplicate)' }, 400) : json(SESSION)) },
  });
  await page.waitForSelector('.ac-form');
  const go = page.getByRole('button', { name: 'Entrar' });
  ok('con clave · acceso: pinta el recuadro de comprobación', await page.locator('.ds-captcha').count() === 1);
  ok('con clave · acceso: «Entrar» desactivado mientras no hay token', !(await enabled(go)) || REAL);
  ok('con clave · acceso: el token llega y «Entrar» se activa', await waitEnabled(go));
  if (!REAL) ok('con clave · acceso: con la clave de VITE_TURNSTILE_SITE_KEY', (await page.evaluate(() => window.__ts.sitekey)) === '1x00000000000000000000AA');
  await page.getByLabel('Correo').fill(USER.email);
  await page.locator('#ac-pw').fill('una-contraseña-larga');
  await go.click();
  await page.getByText('La comprobación de seguridad ha caducado').waitFor({ timeout: 8000 }).catch(() => {});
  const first = calls.filter(c => c.path === '/auth/v1/token')[0];
  ok('con clave · acceso: el token viaja a Supabase Auth', tokenOf(first) === TOKEN, tokenOf(first));
  ok('con clave · acceso: si Supabase lo rechaza, lo dice con claridad', await page.getByText('La comprobación de seguridad ha caducado. Vuelve a intentarlo.').isVisible());
  if (!REAL) ok('con clave · acceso: y pide un token nuevo', (await page.evaluate(() => window.__ts.resets)) >= 1);
  ok('con clave · acceso: con el token nuevo, «Entrar» vuelve a estar activo', await waitEnabled(go));
  if (!REAL) {
    await page.evaluate(() => window.__ts.expire());
    await page.waitForTimeout(150);
    ok('con clave · acceso: si el token caduca, «Entrar» espera otra vez', !(await enabled(go)));
    await page.evaluate(() => { const o = window.turnstile; o.reset('w1'); });
    await waitEnabled(go);
  }
  await go.click();
  await page.waitForSelector('.ds-otp', { timeout: 10000 });
  const second = calls.filter(c => c.path === '/auth/v1/token')[1];
  ok('con clave · acceso: con un token válido, entra (pasa a la verificación en dos pasos)', tokenOf(second) === TOKEN);
  ok('con clave · acceso: el script de Cloudflare se pide en modo explícito', cloudflare.some(u => /turnstile\/v0\/api\.js\?render=explicit&onload=/.test(u)), cloudflare[0]);
  await ctx.close();
}

// ── Con la clave: «He olvidado la contraseña» y el alta ──
{
  const { page, ctx, calls } = await open(WITH, '/admin/forgot-password?lang=es');
  await page.waitForSelector('.ac-form');
  const send = page.getByRole('button', { name: 'Enviar el enlace' });
  ok('con clave · recuperar: recuadro y botón que espera al token', await page.locator('.ds-captcha').count() === 1 && await waitEnabled(send));
  await page.getByLabel('Correo').fill(USER.email);
  await send.click();
  await page.waitForTimeout(1200);
  const rec = calls.find(c => c.path === '/auth/v1/recover');
  ok('con clave · recuperar: el token viaja con la petición', tokenOf(rec) === TOKEN, tokenOf(rec));
  await page.goto(`${WITH}/crear-compte?lang=es`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('form');
  const submit = page.locator('.v2-auth-submit');
  ok('con clave · alta: recuadro y botón que espera al token', await page.locator('.ds-captcha').count() === 1 && await waitEnabled(submit));
  await page.locator('#v2-su-company').fill('Acme Logística, S.L.');
  await page.locator('#v2-su-name').fill('Laura Puig');
  await page.locator('#v2-su-email').fill('laura@acme.es');
  await page.locator('#v2-su-pw').fill('una-contraseña-muy-larga');
  await page.locator('#v2-su-terms').check({ force: true });
  await submit.click();
  await page.waitForTimeout(1500);
  const su = calls.find(c => c.path === '/auth/v1/signup');
  ok('con clave · alta: el token viaja con el alta (y el idioma de los correos)', tokenOf(su) === TOKEN && su?.body?.data?.lang === 'es', JSON.stringify(su?.body?.gotrue_meta_security));
  await ctx.close();
}

// ── Con la clave, si el script de Cloudflare no carga: aviso claro, «Reintentar» y nunca se deja pasar ──
if (!REAL) {
  for (const [mode, wait] of [['block', 3000], ['hang', 14500]]) {
    const { page, ctx, calls, setTurnstile } = await open(WITH, '/admin/login?lang=es', { turnstile: mode });
    await page.waitForSelector('.ac-form');
    const err = page.locator('.ds-captcha-err');
    await err.waitFor({ timeout: wait }).catch(() => {});
    ok(`con clave · el script ${mode === 'block' ? 'no carga' : 'no responde (12 s)'}: lo dice con claridad y ofrece «Reintentar»`, await err.isVisible()
      && await err.getByText('No se ha podido cargar la comprobación de seguridad').isVisible() && await err.getByRole('button', { name: 'Reintentar' }).isVisible());
    ok(`con clave · el script ${mode === 'block' ? 'no carga' : 'no responde'}: «Entrar» sigue desactivado (no se deja pasar)`, !(await enabled(page.getByRole('button', { name: 'Entrar' }))));
    await page.getByLabel('Correo').fill(USER.email);
    await page.locator('#ac-pw').fill('una-contraseña-larga');
    await page.locator('#ac-pw').press('Enter');
    await page.waitForTimeout(500);
    ok(`con clave · el script ${mode === 'block' ? 'no carga' : 'no responde'}: ni con Intro se manda nada a Supabase`, !calls.some(c => c.path === '/auth/v1/token'));
    setTurnstile('fake');
    await err.getByRole('button', { name: 'Reintentar' }).click();
    ok(`con clave · el script ${mode === 'block' ? 'no carga' : 'no responde'}: «Reintentar» lo vuelve a pedir y, cuando carga, se puede entrar`, await waitEnabled(page.getByRole('button', { name: 'Entrar' })) && !(await err.isVisible()));
    await ctx.close();
  }
}

// ── El canal no depende nunca de Cloudflare (con la clave puesta) ──
{
  const { page, ctx, calls, cloudflare } = await open(WITH, '/canal/acme?lang=es', { turnstile: 'block' });
  await page.waitForSelector('.ds-hero');
  await page.getByRole('link', { name: 'Presentar una denuncia' }).click();
  await page.getByRole('radio', { name: /Fraude o corrupción/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.fill('#dn-description', 'Un responsable adjudica los contratos de transporte siempre a la empresa de su cuñado.');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.locator('#dn-privacy').check();
  ok('canal con clave: ningún recuadro de comprobación', await page.locator('.ds-captcha, .flow-captcha').count() === 0);
  await page.getByRole('button', { name: /Enviar denuncia/ }).click();
  await page.waitForSelector('.code-big', { timeout: 15000 });
  const sent = calls.find(c => c.path === '/rest/v1/rpc/submit_complaint');
  ok('canal con clave: la denuncia se envía sin token y sin esperar a nadie', !!sent && !JSON.stringify(sent.body).includes('captcha'));
  ok('canal con clave: no se pide nada a Cloudflare', cloudflare.length === 0, cloudflare.join(' '));
  await ctx.close();
}

await browser.close();
console.log(problems.length ? `PROBLEMAS: ${problems.join(' · ')}` : `Turnstile${REAL ? ' (el de Cloudflare)' : ''}: sin clave como siempre; con clave en el acceso, el alta y recuperar; el canal, nunca`);
process.exit(problems.length ? 1 : 0);
