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

// ── Servirla con las cabeceras de vercel.json (la CSP y las demás de «/(.*)») ──
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json' };
const base = vercel.headers.find(h => h.source === '/(.*)').headers;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(DIST, url);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  for (const { key, value } of base) if (key !== 'Strict-Transport-Security') res.setHeader(key, value.replace('; upgrade-insecure-requests', ''));
  res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(4190, r));
const APP = 'http://localhost:4190';

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
const ORG = { id: 'org-1', name: 'Acme Logística, S.L.', slug: 'acme', plan: 'trial', trial_ends_at: new Date(Date.now() + 9 * 864e5).toISOString(), paid_until: null, onboarding: {}, created_at: '2026-09-01T00:00:00Z' };
const CASE = { id: 'aaaaaaaa-0000-4000-8000-000000000001', reference: 'REF-CSP001', organization_id: 'org-1', is_anonymous: true, category: 'fraud', department: 'Compras', description: 'Facturas de rutas que no aparecen en el registro de salidas del almacén.', status: 'investigating', priority: 'normal', language: 'es', created_at: new Date(Date.now() - 20 * 864e5).toISOString(), updated_at: new Date().toISOString(), acknowledged_at: new Date(Date.now() - 19 * 864e5).toISOString(), answered_at: null, extended_until: null, anonymized_at: null, channel: 'web', meeting_requested: false, outcome: null, investigation_started_at: null, title: null, assigned_to: null, incident_when: null, meeting_requested_at: null, attachments: [] };
const cors = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'Content-Range' };
const json = (route, body, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { ...cors, ...headers }, body: JSON.stringify(body) });
const unexpected = new Set();
await ctx.route(`${API}/**`, async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const p = url.pathname;
  const single = (req.headers().accept ?? '').includes('vnd.pgrst.object');
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  if (p === '/rest/v1/rpc/get_organization_by_slug') return json(route, [{ id: ORG.id, name: ORG.name, slug: ORG.slug, regional_authority_name: null, regional_authority_url: null }]);
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
});
// Nada más sale del ordenador
await ctx.route(u => !u.toString().startsWith(APP) && !u.toString().startsWith(API) && !/^(data|blob):/.test(u.toString()), r => r.abort());

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

// Canal: enviar con una foto (se limpia en un lienzo) y descargar el justificante
await page.goto(`${APP}/canal/acme?lang=es`, { waitUntil: 'networkidle' });
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

await browser.close();
server.close();
fs.rmSync(DIST, { recursive: true, force: true });
if (errors.length) problems.push(...errors);
console.log(problems.length ? `PROBLEMAS: ${problems.join(' · ')}` : `Política de seguridad (CSP) sin bloqueos en la web, el canal y el panel (${API})`);
process.exit(problems.length ? 1 : 0);
