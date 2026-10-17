// La política de seguridad (CSP) de vercel.json no rompe nada. Compila la web como en producción, apuntando
// a la dirección del proyecto de Supabase que fija la política, la sirve con las cabeceras exactas de
// vercel.json y recorre la web, el canal y el panel. Cualquier bloqueo de la política es un fallo.
// Las peticiones a esa dirección las responde este script: no sale nada del ordenador.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwright.mjs';

const OUT = process.argv[2] ?? os.tmpdir();
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const csp = vercel.headers.flatMap(h => h.headers).find(h => h.key === 'Content-Security-Policy').value;
const API = `https://${/https:\/\/([a-z0-9]+\.supabase\.co)/.exec(csp)[1]}`;
const problems = [];
const ok = (name, v, extra = '') => { console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(name); };

// ── Compilar como en producción ──
const DIST = fs.mkdtempSync(path.join(os.tmpdir(), 'reportia-csp-'));
const build = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', DIST, '--emptyOutDir'], {
  cwd: ROOT, encoding: 'utf8', env: { ...process.env, VITE_SUPABASE_URL: API, VITE_SUPABASE_ANON_KEY: 'clave-falsa-de-prueba', VITE_DEMO: '' },
});
if (build.status !== 0) { console.log(`PROBLEMAS: no compila\n${build.stderr.slice(-800)}`); process.exit(1); }

// ── Servirla con las cabeceras de vercel.json: las de todo menos el canal y las del canal (que sí se puede incrustar) ──
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json' };
const base = vercel.headers.find(h => h.source === '/((?!canal/).*)').headers;
// El canal deja que lo incruste cualquier web con https; aquí la «web de la empresa» es http://localhost:4191
const canalHeaders = vercel.headers.find(h => h.source === '/canal/(.*)').headers
  .map(h => (h.key === 'Content-Security-Policy' ? { ...h, value: h.value.replace('frame-ancestors https:', 'frame-ancestors http://localhost:4191') } : h));
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(DIST, url);
  // Como las reescrituras de vercel.json: el canal de cada empresa con su página (canal.html) y el resto con index.html
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, url.startsWith('/canal/') ? 'canal.html' : 'index.html');
  for (const { key, value } of url.startsWith('/canal/') ? canalHeaders : base) if (key !== 'Strict-Transport-Security') res.setHeader(key, value.replace('; upgrade-insecure-requests', ''));
  res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(4190, r));
const APP = 'http://localhost:4190';
// La web de una empresa que pone el canal (y, por error o con mala intención, el acceso al panel) dentro de un recuadro
const outside = http.createServer((req, res) => {
  const q = new URL(req.url, 'http://x').searchParams;
  res.setHeader('Content-Type', 'text/html');
  // Con ?script=…, la web pega el script que pinta el botón (con data-estilo, si se pide)
  if (q.get('script')) return res.end(`<!doctype html><title>Web de Acme</title><h1>Acme</h1><p id="aqui"><script src="${APP}/boton-canal.js" data-canal="acme" data-idioma="ca" data-color="#0F5E6B"${q.get('script') === 'flotante' ? ' data-estilo="flotante"' : ''}></script></p>`);
  res.end(`<!doctype html><title>Web de Acme</title><h1>Acme</h1><iframe id="f" src="${APP}${q.get('src')}" style="width:1100px;height:760px;border:0" referrerpolicy="no-referrer"></iframe>`);
});
await new Promise(r => outside.listen(4191, r));

// ── Navegador ──
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES', acceptDownloads: true });
await ctx.addInitScript(() => {
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.violatedDirective} ← ${e.blockedURI}`));
});
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const USER = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'laura@acme.es', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z',
  factors: [{ id: 'f1', factor_type: 'totp', status: 'verified', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }] };
const JWT = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER.id, role: 'authenticated', email: USER.email, aal: 'aal2', amr: [{ method: 'totp', timestamp: now }], iat: now, exp: now + 3600, session_id: 's1' })}.${Buffer.from('x').toString('base64url')}`;
// «Tu marca» (migración 016): una paleta que no es la azul y un logo, para ver que la política deja pintarlos y ponerlos en los PDF
const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const ORG = { id: 'org-1', name: 'Acme Logística, S.L.', slug: 'acme', brand_palette: 'petroleo', brand_logo: LOGO, plan: 'trial', trial_ends_at: new Date(Date.now() + 9 * 864e5).toISOString(), paid_until: null, onboarding: {}, created_at: '2026-09-01T00:00:00Z' };
const CASE = { id: 'aaaaaaaa-0000-4000-8000-000000000001', reference: 'REF-CSP001', organization_id: 'org-1', is_anonymous: true, category: 'fraud', department: 'Compras', description: 'Facturas de rutas que no aparecen en el registro de salidas del almacén.', status: 'investigating', priority: 'normal', language: 'es', created_at: new Date(Date.now() - 20 * 864e5).toISOString(), updated_at: new Date().toISOString(), acknowledged_at: new Date(Date.now() - 19 * 864e5).toISOString(), answered_at: null, extended_until: null, anonymized_at: null, channel: 'web', meeting_requested: false, outcome: null, investigation_started_at: null, title: null, assigned_to: null, incident_when: null, meeting_requested_at: null, attachments: [] };
const cors = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'Content-Range' };
const json = (route, body, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { ...cors, ...headers }, body: JSON.stringify(body) });
const unexpected = new Set();
// Las peticiones a la base de datos las responde esta función (la usan los dos navegadores de la prueba)
const mockApi = async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const p = url.pathname;
  const single = (req.headers().accept ?? '').includes('vnd.pgrst.object');
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  if (p === '/rest/v1/rpc/get_organization_by_slug') return json(route, [{ id: ORG.id, name: ORG.name, slug: ORG.slug, regional_authority_name: null, regional_authority_url: null, brand_palette: ORG.brand_palette, brand_logo: ORG.brand_logo }]);
  // Dirección propia (017): canal.acme.test es de Acme; cualquier otra, de nadie
  if (p === '/rest/v1/rpc/get_organization_slug_by_domain') return json(route, JSON.parse(req.postData() || '{}').p_host === 'canal.acme.test' ? 'acme' : null);
  if (p === '/rest/v1/rpc/submit_complaint') return json(route, 'bbbbbbbb-0000-4000-8000-000000000001');
  if (p.startsWith('/storage/v1/object/attachments/')) return json(route, { Key: 'x', Id: 'x' });
  if (['/rest/v1/attachments', '/rest/v1/audit_logs', '/rest/v1/messages'].includes(p) && req.method() === 'POST') return route.fulfill({ status: 201, headers: cors, body: '' });
  if (p === '/rest/v1/rpc/get_complaint_by_tracking_code') return json(route, [{ tracking_code: 'ABCD-EFGH', status: 'investigating', category: 'fraud', created_at: CASE.created_at, updated_at: CASE.updated_at, acknowledged_at: CASE.acknowledged_at, answered_at: null, extended_until: null, meeting_requested: false, meeting_requested_at: null }]);
  if (p === '/rest/v1/rpc/get_messages_by_tracking_code') return json(route, []);
  if (p === '/auth/v1/token') return json(route, { access_token: JWT, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: 'r1', user: USER });
  if (p === '/auth/v1/user') return json(route, USER);
  if (p === '/auth/v1/factors') return json(route, USER.factors);
  if (p === '/rest/v1/profiles') return json(route, single ? { id: USER.id, role: 'superadmin', full_name: 'Laura Puig', organization_id: 'org-1' } : [{ id: USER.id, full_name: 'Laura Puig', role: 'superadmin' }]);
  if (p === '/rest/v1/organizations') return json(route, single ? ORG : [ORG]);
  if (p === '/rest/v1/complaints') return /id=eq\./.test(url.search) ? json(route, CASE) : json(route, [CASE], 200, { 'content-range': '0-0/*' });
  if (p === '/rest/v1/messages' || p === '/rest/v1/audit_logs' || p === '/rest/v1/manager_permissions') return json(route, []);
  if (p === '/rest/v1/rpc/retention_due') return json(route, []);
  if (p === '/rest/v1/rpc/list_org_members') return json(route, [{ id: USER.id, full_name: 'Laura Puig', role: 'superadmin', email: USER.email, created_at: '2026-01-01T00:00:00Z', last_sign_in_at: new Date().toISOString() }]);
  unexpected.add(`${req.method()} ${p}`);
  return json(route, []);
};
await ctx.route(`${API}/**`, mockApi);
// Nada más sale del ordenador
await ctx.route(u => !u.toString().startsWith(APP) && !u.toString().startsWith(API) && !u.toString().startsWith('http://localhost:4191') && !/^(data|blob):/.test(u.toString()), r => r.abort());

const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
page.on('console', m => { if (m.type() === 'error' && /Content Security Policy|Refused to/.test(m.text())) errors.push(m.text().slice(0, 200)); });
const violations = async (where) => { const v = await page.evaluate(() => window.__csp.splice(0)); ok(`${where}: sin bloqueos de la política`, v.length === 0, v.join(' · ')); };
const save = async (fn) => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), fn()]); return d.suggestedFilename(); };

for (const [route, sel] of [['/', 'h1'], ['/crear-compte', 'form'], ['/privacitat', 'h1']]) {
  await page.goto(`${APP}${route}?lang=es`, { waitUntil: 'networkidle' });
  await page.waitForSelector(sel);
  await page.evaluate(() => document.fonts.ready);
  ok(`${route}: las tipografías se cargan`, await page.evaluate(() => [...document.fonts].some(f => f.status === 'loaded')));
  await violations(route);
}

// Canal: la página que se comparte no lleva Reportia (marca blanca), y sí el logo y el color de la empresa
// (con http.get: el fetch de Node no deja pedir al puerto 4190)
const shared = await new Promise((resolve, reject) => http.get(`${APP}/canal/acme`, r => { let d = ''; r.on('data', c => { d += c; }); r.on('end', () => resolve(d)); }).on('error', reject));
ok('canal: ni la pestaña ni la vista previa al compartir dicen «Reportia»', !/reportia/i.test(shared.split('</head>')[0]), shared.match(/<title>[^<]*<\/title>/)?.[0]);
await page.goto(`${APP}/canal/acme?lang=es`, { waitUntil: 'networkidle' });
ok('canal: el logo de la empresa se ve', await page.locator('.entry-brand .ds-brand-logo img').evaluate(i => i.complete && i.naturalWidth > 0));
ok('canal: con el color de su paleta', (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--solid').trim().toUpperCase())) === '#0F5E6B');
// Enviar con una foto (se limpia en un lienzo) y descargar el justificante
await page.getByRole('link', { name: 'Presentar una denuncia' }).click();
await page.getByRole('radio', { name: /Fraude o corrupción/ }).click();
await page.getByRole('button', { name: 'Continuar' }).click();
await page.fill('#dn-description', 'Un responsable adjudica los contratos de transporte siempre a la empresa de su cuñado.');
const jpg = path.join(OUT, 'csp-foto.jpg');
fs.writeFileSync(jpg, Buffer.from(await page.evaluate(async () => { const c = document.createElement('canvas'); c.width = 30; c.height = 20; c.getContext('2d').fillRect(0, 0, 30, 20); const b = await new Promise(r => c.toBlob(r, 'image/jpeg')); return [...new Uint8Array(await b.arrayBuffer())]; })));
await page.locator('input[type=file]').setInputFiles([jpg]);
await page.getByRole('button', { name: 'Continuar' }).click();
await page.locator('#dn-privacy').check();
await page.getByRole('button', { name: /Enviar denuncia/ }).click();
await page.waitForSelector('.code-big', { timeout: 15000 });
ok('canal: el justificante se descarga', (await save(() => page.getByRole('button', { name: 'Descargar justificante' }).click())).endsWith('.pdf'));
await violations('canal (enviar, foto y justificante)');
await page.goto(`${APP}/canal/acme/consulta?lang=es`, { waitUntil: 'networkidle' });
await page.getByPlaceholder('XXXX-XXXX').fill('ABCD-EFGH');
await page.getByRole('button', { name: 'Ver mi caso' }).click();
await page.waitForSelector('.mc', { timeout: 15000 });
await violations('consulta y «Mi caso»');

// Panel: acceso, tablero, ficha con PDF, informe con Excel, compartir con el cartel y el QR
await page.goto(`${APP}/admin/login?lang=es`, { waitUntil: 'networkidle' });
await page.getByLabel('Correo').fill(USER.email);
await page.locator('#ac-pw').fill('una-contraseña');
await page.getByRole('button', { name: 'Entrar' }).click();
await page.waitForSelector('.ds-case', { timeout: 15000 });
await violations('acceso y tablero');
await page.goto(`${APP}/admin/complaints/${CASE.id}`, { waitUntil: 'networkidle' });
await page.waitForSelector('.cs-desc');
ok('ficha: el PDF del caso se descarga', (await save(() => page.getByRole('button', { name: /Exportar PDF/ }).click())).endsWith('.pdf'));
await violations('ficha y PDF');
await page.goto(`${APP}/admin/report`, { waitUntil: 'networkidle' });
await page.waitForSelector('.rp-figs dd');
ok('informe: el Excel se descarga', (await save(() => page.getByRole('button', { name: /Excel/ }).click())).endsWith('.xlsx'));
await violations('informe y Excel');
await page.goto(`${APP}/admin/integration`, { waitUntil: 'networkidle' });
await page.waitForSelector('.sh-qr img');
ok('compartir: el QR se ve', await page.locator('.sh-qr img').evaluate(i => i.complete && i.naturalWidth > 0));
ok('compartir: el cartel se descarga', (await save(() => page.locator('.sh-poster').getByRole('button', { name: /PDF/ }).click())).endsWith('.pdf'));
await violations('compartir y cartel');

// Dentro de la web de una empresa (iframe): el canal sí; el panel y el acceso, no (ni al cargar ni navegando desde el canal)
await page.goto('http://localhost:4191/?src=/canal/acme%3Flang%3Des', { waitUntil: 'networkidle' });
const canalFrame = page.frameLocator('#f');
ok('iframe: el canal se ve dentro de la web de la empresa', await canalFrame.locator('.ds-hero').first().isVisible({ timeout: 15000 }).catch(() => false));
const popup = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
await canalFrame.getByRole('link', { name: /Acceder/ }).click();
const opened = await popup;
ok('iframe: «Acceder» abre el acceso en una ventana nueva, no dentro de la web', !!opened && /\/admin\/login/.test(opened.url()) && await canalFrame.locator('.ds-hero').first().isVisible(), opened?.url());
await opened?.close();
// El script que pinta el botón, pegado en la web de la empresa: donde está el script, o fijo en la esquina
await page.goto('http://localhost:4191/?script=1', { waitUntil: 'networkidle' });
const btn = page.locator('#aqui a');
ok('script: pinta el botón donde se pega, con el idioma, el color y el enlace del canal', await btn.count() === 1 && (await btn.innerText()) === 'Canal ètic'
  && (await btn.getAttribute('href')) === `${APP}/canal/acme?lang=ca` && (await btn.getAttribute('rel')).includes('noreferrer')
  && (await btn.evaluate(e => getComputedStyle(e).backgroundColor)) === 'rgb(15, 94, 107)');
await page.goto('http://localhost:4191/?script=flotante', { waitUntil: 'networkidle' });
ok('script: con data-estilo="flotante", fijo en la esquina de abajo', (await page.locator('body > a').evaluate(e => getComputedStyle(e).position).catch(() => '')) === 'fixed');
// «Salir rápido» dentro de la web de la empresa sale de la ventana entera, no solo del recuadro
await page.goto('http://localhost:4191/?src=/canal/acme%3Flang%3Des', { waitUntil: 'networkidle' });
await canalFrame.locator('.ds-hero').first().waitFor();
const exitReq = page.waitForRequest(r => /google\.com/.test(r.url()) && r.isNavigationRequest(), { timeout: 10000 }).catch(() => null);
await canalFrame.getByRole('button', { name: /Salir rápid/ }).click();
const exitTo = await exitReq;
ok('iframe: «Salir rápido» sale de la web entera, no solo del recuadro', !!exitTo && exitTo.frame() === page.mainFrame());
await page.goto('http://localhost:4191/?src=/admin/login', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const loginFrame = page.frames().find(f => f !== page.mainFrame());
const loginShown = loginFrame ? await loginFrame.locator('.ac-form').count().catch(() => 0) : 0;
// El navegador avisa en la consola de que ha bloqueado el acceso dentro del recuadro: es justo lo que se quiere
const blocked = errors.filter(e => /frame-ancestors 'none'/.test(e));
errors.splice(0, errors.length, ...errors.filter(e => !/frame-ancestors 'none'/.test(e)));
ok('iframe: el acceso al panel no se carga dentro de otra web', loginShown === 0 && blocked.length > 0);
await page.goto('http://localhost:4191/?src=/canal/acme%3Flang%3Des', { waitUntil: 'networkidle' });
await canalFrame.locator('.ds-hero').first().waitFor();
await page.frames().find(f => f !== page.mainFrame()).evaluate(() => { history.pushState({}, '', '/admin'); dispatchEvent(new PopStateEvent('popstate')); });
await page.waitForTimeout(800);
ok('iframe: si el panel llega a abrirse dentro, solo sale el aviso para abrirlo aparte', await canalFrame.locator('.ds-framed').isVisible().catch(() => false) && (await canalFrame.locator('.pn-head, .ac-form').count()) === 0);

// Dirección propia (canal.acme.test): la raíz abre el canal de su empresa; el panel y la web, en la dirección principal
const b2 = await chromium.launch({ args: ['--host-resolver-rules=MAP canal.acme.test 127.0.0.1, MAP otra.test 127.0.0.1'] });
const c2 = await b2.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' });
await c2.route(`${API}/**`, mockApi);
await c2.route(u => !/^http:\/\/(localhost|canal\.acme\.test|otra\.test):4190/.test(u.toString()) && !u.toString().startsWith(API) && !/^(data|blob):/.test(u.toString()), r => r.abort());
const p2 = await c2.newPage();
p2.on('pageerror', e => errors.push(e.message.slice(0, 200)));
await p2.goto('http://canal.acme.test:4190/?lang=es', { waitUntil: 'networkidle' });
await p2.waitForSelector('.ds-hero', { timeout: 15000 }).catch(() => {});
ok('dirección propia: la raíz abre el canal de su empresa', new URL(p2.url()).pathname === '/canal/acme' && await p2.locator('.ds-hero').first().isVisible(), p2.url());
const accessHref = await p2.locator('.ds-pane.is-manage .entry-go').getAttribute('href');
ok('dirección propia: «Acceder» lleva a la dirección principal', /^https:\/\//.test(accessHref) && !accessHref.includes('acme.test'), accessHref);
const toMain = p2.waitForRequest(r => r.isNavigationRequest() && /^https:\/\/[^/]+\/admin$/.test(r.url()), { timeout: 10000 }).catch(() => null);
await p2.goto('http://canal.acme.test:4190/admin').catch(() => {});
ok('dirección propia: el panel se abre en la dirección principal', !!(await toMain));
await p2.goto('http://otra.test:4190/?lang=es', { waitUntil: 'networkidle' });
ok('una dirección que no es de ninguna empresa enseña la web de siempre', await p2.locator('.v2 h1').first().isVisible({ timeout: 10000 }).catch(() => false));
await b2.close();

await browser.close();
server.close();
outside.close();
fs.rmSync(DIST, { recursive: true, force: true });
if (errors.length) problems.push(...errors);
console.log(problems.length ? `PROBLEMAS: ${problems.join(' · ')}` : `Política de seguridad (CSP) sin bloqueos en la web, el canal y el panel (${API})`);
process.exit(problems.length ? 1 : 0);
