// Fase 4 con la red simulada: la aplicación corre en modo real (no demo) contra una dirección local que
// no existe, y cada petición la responde este script como lo haría la base de datos. No sale ninguna
// petición del ordenador ni se toca ningún Supabase.
import { chromium } from './lib/playwright.mjs';
const [OUT, SCENE, PORT] = [process.argv[2], process.argv[3], process.argv[4]]; // gestor | admin · 3112 (IA apagada) | 3114 (IA encendida)
const APP = `http://localhost:${PORT}`;
const AI_ON = PORT === '3114';
const API = 'http://localhost:59999';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' });
const page = await ctx.newPage();
const problems = [];
const ok = (name, v, extra = '') => { console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(name); };
page.on('pageerror', e => problems.push(`error: ${e.message.slice(0, 220)}`));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|\[Supabase\]/.test(m.text())) problems.push(`consola: ${m.text().slice(0, 220)}`); });

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const USER = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'laura.puig@acme.es', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z',
  factors: [{ id: 'f1', factor_type: 'totp', status: 'verified', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }] };
const JWT = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER.id, role: 'authenticated', email: USER.email, aal: 'aal2', amr: [{ method: 'password', timestamp: now }, { method: 'totp', timestamp: now }], iat: now, exp: now + 3600, session_id: 's1' })}.${Buffer.from('firma-de-prueba-que-nadie-comprueba-aqui').toString('base64url')}`;
const ROLE = SCENE === 'gestor' ? 'manager' : 'superadmin';
const ORG = { id: 'org-1', name: 'Acme Logística Integral del Mediterráneo, S.L.', slug: 'acme', plan: 'trial', trial_ends_at: new Date(Date.now() + 20 * 86400000).toISOString(), paid_until: null,
  responsible_name: null, responsible_role: null, billing_name: null, billing_tax_id: null, billing_email: null, regional_authority_name: null, regional_authority_url: null, created_at: '2026-09-01T00:00:00Z',
  ...(SCENE === 'sin012' ? {} : { responsible_appointed_at: null, aipi_notified_at: null, onboarding: {} }) };
const day = (d, h = 10) => { const x = new Date(Date.now() - d * 86400000); x.setHours(h, 0, 0, 0); return x.toISOString(); };
const base = { organization_id: 'org-1', incident_date: null, involved_people: null, language: 'es', extended_until: null, extension_reason: null, anonymized_at: null, meeting_held_at: null, fiscal_referral_at: null, title: null, assigned_to: null, incident_when: null, meeting_requested_at: null };
const CASES = [
  { ...base, id: 'aaaaaaaa-0000-4000-8000-000000000001', reference: 'REF-AAA111', is_anonymous: true, category: 'fraud', department: 'Compras', status: 'received', priority: 'normal', description: 'Una empresa de transporte factura cada mes rutas de reparto que no aparecen en el registro de salidas.', created_at: day(1), updated_at: day(1), acknowledged_at: null, answered_at: null, channel: 'web', meeting_requested: false, outcome: null, investigation_started_at: null },
  { ...base, id: 'aaaaaaaa-0000-4000-8000-000000000002', reference: 'REF-BBB222', is_anonymous: false, category: 'safety', department: 'Muelle', status: 'investigating', priority: 'high', description: 'Las salidas de emergencia de los pasillos 4 y 5 llevan semanas bloqueadas con palés.', created_at: day(30), updated_at: day(20), acknowledged_at: day(28), answered_at: null, channel: 'phone', meeting_requested: false, outcome: null, investigation_started_at: day(20) },
  { ...base, id: 'aaaaaaaa-0000-4000-8000-000000000003', reference: 'REF-CCC333', is_anonymous: true, category: 'harassment', department: 'Almacén', status: 'resolved', priority: 'normal', description: 'Un encargado hace comentarios humillantes a dos compañeras delante del turno.', created_at: day(60), updated_at: day(10), acknowledged_at: day(58), answered_at: day(10), channel: 'web', meeting_requested: false, outcome: 'founded', investigation_started_at: day(50) },
];
const MEMBERS = [
  { id: USER.id, full_name: 'Laura Puig Ferrer', role: 'superadmin', email: USER.email, created_at: '2026-01-01T00:00:00Z', last_sign_in_at: day(0) },
  ...(SCENE === 'nueva' ? [] : [{ id: '22222222-2222-4222-8222-222222222222', full_name: 'Daniel Ortega Ruiz', role: 'manager', email: 'd.ortega@acme.es', created_at: '2026-02-01T00:00:00Z', last_sign_in_at: day(2) }]),
];
const PERMS = [
  { id: 'p1', manager_id: SCENE === 'gestor' ? USER.id : MEMBERS[1]?.id, category: 'fraud', can_view: true, can_edit: false, can_reply: false, can_delete: false },
  { id: 'p2', manager_id: SCENE === 'gestor' ? USER.id : MEMBERS[1]?.id, category: 'safety', can_view: true, can_edit: true, can_reply: true, can_delete: false },
];
const log = [];
const unexpected = [];
const json = (route, body, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'Content-Range', ...headers }, body: JSON.stringify(body) });

await page.route(`${API}/**`, async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const path = url.pathname;
  const method = req.method();
  if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  let body = null;
  try { body = req.postDataJSON(); } catch { /* sin cuerpo */ }
  const single = (req.headers().accept ?? '').includes('vnd.pgrst.object');
  const query = decodeURIComponent(url.search);
  log.push({ method, path, body, query });

  if (path === '/auth/v1/token') return json(route, { access_token: JWT, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: 'r1', user: USER });
  if (path === '/auth/v1/user') return json(route, USER);
  if (path === '/auth/v1/logout') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
  if (path === '/auth/v1/factors') return json(route, USER.factors);
  if (path === '/rest/v1/rpc/get_organization_by_slug') return json(route, body?.p_slug === 'acme' ? [{ id: ORG.id, name: ORG.name, slug: ORG.slug, regional_authority_name: ORG.regional_authority_name, regional_authority_url: ORG.regional_authority_url }] : []);

  if (path === '/rest/v1/profiles' && method === 'GET') {
    if (single) return json(route, { id: USER.id, role: ROLE, full_name: ROLE === 'manager' ? 'Daniel Ortega Ruiz' : 'Laura Puig Ferrer', organization_id: 'org-1', created_at: '2026-01-01T00:00:00Z' });
    return json(route, MEMBERS.map(({ id, full_name, role }) => ({ id, full_name, role })));
  }
  if (path === '/rest/v1/profiles' && method === 'PATCH') {
    const id = (url.searchParams.get('id') ?? '').replace('eq.', '');
    const m = MEMBERS.find(x => x.id === id);
    if (m) Object.assign(m, body);
    return json(route, m ? [{ id }] : []);
  }
  if (path === '/rest/v1/organizations' && method === 'GET') return json(route, single ? ORG : [ORG]);
  if (path === '/rest/v1/organizations' && method === 'PATCH') {
    // Como la base de datos: una columna que no existe se rechaza, y solo quien administra puede cambiar la empresa
    const unknown = Object.keys(body ?? {}).filter(k => !(k in ORG));
    if (unknown.length) return json(route, { code: 'PGRST204', message: `Could not find the '${unknown[0]}' column of 'organizations' in the schema cache` }, 400);
    if (ROLE !== 'superadmin') return json(route, []);
    Object.assign(ORG, body);
    return json(route, [ORG]);
  }
  if (path === '/functions/v1/ai-assist' && SCENE === 'sin013') return json(route, { error: 'store-failed' }, 500);
  if (path === '/functions/v1/ai-assist') {
    if (body.action === 'summary') { CASES[1].ai_summary = 'Primera frase. Segunda frase. Tercera frase.'; CASES[1].ai_title = 'Salidas de emergencia bloqueadas en dos pasillos'; CASES[1].ai_generated_at = new Date().toISOString(); return json(route, { summary: CASES[1].ai_summary, title: CASES[1].ai_title, generated_at: CASES[1].ai_generated_at }); }
    return json(route, { draft: 'Borrador de prueba del servidor.' });
  }
  if (path === '/rest/v1/complaints' && method === 'GET' && single) {
    const id = (url.searchParams.get('id') ?? '').replace('eq.', '');
    const c = CASES.find(x => x.id === id);
    return c ? json(route, { ...c, attachments: [] }) : json(route, null);
  }
  if (path === '/rest/v1/complaints' && method === 'GET') {
    const cats = /category=in\.\(([^)]*)\)/.exec(query)?.[1]?.split(',');
    const list = cats ? CASES.filter(c => cats.includes(c.category)) : CASES;
    return json(route, list, 200, { 'content-range': `0-${list.length - 1}/*` });
  }
  if (path === '/rest/v1/messages') return json(route, []);
  if (path === '/rest/v1/audit_logs') return json(route, []);
  if (path === '/rest/v1/manager_permissions') {
    const id = (url.searchParams.get('manager_id') ?? '').replace('eq.', '');
    return json(route, PERMS.filter(x => x.manager_id === id));
  }
  if (path === '/rest/v1/rpc/retention_due') return json(route, []);
  if (path === '/rest/v1/rpc/list_org_members') return ROLE === 'superadmin' ? json(route, MEMBERS) : json(route, { code: '42501', message: 'solo administradores' }, 403);
  if (path === '/rest/v1/rpc/set_manager_permissions') return json(route, null);
  if (path === '/functions/v1/invite-manager') {
    const m = { id: '33333333-3333-4333-8333-333333333333', full_name: body.full_name, role: 'manager', email: body.email, created_at: new Date().toISOString(), last_sign_in_at: null };
    MEMBERS.push(m);
    return json(route, { user_id: m.id });
  }
  if (path === '/functions/v1/delete-manager') { const i = MEMBERS.findIndex(x => x.id === body.user_id); if (i > 0) MEMBERS.splice(i, 1); return json(route, { ok: true }); }
  unexpected.push(`${method} ${path}`);
  return json(route, { message: 'sin simular' }, 500);
});
const outside = [];
await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => { outside.push(r.request().url()); r.abort(); });
const shot = async (name) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(350); const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (over > 0) problems.push(`desbordamiento de ${over}px en ${name}`); await page.screenshot({ path: `${OUT}/${SCENE}-${name}.png`, fullPage: true }); };
const toast = async (text) => { await page.locator('.pn-toast', { hasText: text }).first().waitFor({ timeout: 8000 }); await page.locator('.pn-toast').waitFor({ state: 'detached', timeout: 8000 }); };
const last = (method, path) => [...log].reverse().find(l => l.method === method && l.path === path);


await page.goto(`${APP}/admin/login?lang=es`, { waitUntil: 'networkidle' });
await page.getByLabel('Correo').fill(USER.email);
await page.locator('#ac-pw').fill('una-contraseña');
await page.getByRole('button', { name: 'Entrar' }).click();
await page.waitForSelector('.ds-case', { timeout: 15000 });
const SAFETY = '/admin/complaints/aaaaaaaa-0000-4000-8000-000000000002', FRAUD = '/admin/complaints/aaaaaaaa-0000-4000-8000-000000000001';
await page.goto(`${APP}${SAFETY}`, { waitUntil: 'networkidle' });
await page.waitForSelector('.cs-desc');
const asksAi = () => log.filter(l => l.path === '/functions/v1/ai-assist' || /ai_(summary|title|generated_at)/.test(l.query));
if (!AI_ON) {
  ok('IA apagada (modo real): la ficha no pinta nada de IA', await page.locator('.ai-card').count() === 0 && await page.getByText(/\bIA\b/).count() === 0);
  await page.goto(`${APP}/admin`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.ds-case');
  ok('IA apagada: no se pide ninguna columna de IA ni se llama a la función', asksAi().length === 0, JSON.stringify(asksAi().slice(0, 2)));
} else if (SCENE === 'admin') {
  await page.waitForSelector('.ai-card');
  ok('IA encendida: el listado pide también el título propuesto', log.some(l => l.path === '/rest/v1/complaints' && /select=[^&]*ai_title/.test(l.query)));
  await page.getByRole('button', { name: 'Resumir con IA' }).click();
  await page.locator('.ai-title').waitFor({ timeout: 8000 });
  const call = last('POST', '/functions/v1/ai-assist');
  ok('resumir: a la función solo van el caso, la acción y el idioma', JSON.stringify(call.body) === JSON.stringify({ complaint_id: 'aaaaaaaa-0000-4000-8000-000000000002', action: 'summary', lang: 'es' }), JSON.stringify(call.body));
  ok('resumir: el navegador no escribe el resumen en la base de datos', log.every(l => !(l.method === 'PATCH' && l.path === '/rest/v1/complaints' && l.body && ('ai_summary' in l.body || 'ai_title' in l.body))));
  await page.locator('.pn-toast').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: 'Redactar con IA' }).click();
  await page.getByRole('button', { name: 'Respuesta final' }).click();
  await page.waitForFunction(() => document.getElementById('cs-msg')?.value === 'Borrador de prueba del servidor.', null, { timeout: 8000 });
  const d = last('POST', '/functions/v1/ai-assist');
  ok('redactar: pide un borrador y no envía ningún mensaje', d.body.action === 'draft' && d.body.kind === 'answer' && log.every(l => !(l.method === 'POST' && l.path === '/rest/v1/messages')), JSON.stringify(d.body));
  ok('ninguna clave de IA en lo que envía el navegador', log.every(l => !/api[_-]?key|AI_API/i.test(JSON.stringify(l.body ?? '') + l.query)));
} else if (SCENE === 'sin013') {
  await page.waitForSelector('.ai-card');
  await page.getByRole('button', { name: 'Resumir con IA' }).click();
  await page.getByText('La IA no ha podido responder. Vuelve a intentarlo.').waitFor({ timeout: 8000 });
  ok('sin la 013 (o sin la función): la IA avisa del fallo y la ficha sigue funcionando', await page.locator('.ai-text').count() === 1 && await page.locator('.cs-desc').isVisible());
  ok('sin la 013: no se escribe nada desde el navegador', log.every(l => !(l.method === 'PATCH' && l.path === '/rest/v1/complaints')));
  await page.locator('#cs-msg').fill('Mensaje escrito a mano.');
  ok('sin la 013: se puede seguir escribiendo a mano', (await page.locator('#cs-msg').inputValue()) === 'Mensaje escrito a mano.');
} else {
  // Gestor: en «fraud» solo puede ver; en «safety» puede editar y responder
  await page.waitForSelector('.ai-card');
  ok('gestor con permisos en el tema: puede resumir y redactar', await page.getByRole('button', { name: 'Resumir con IA' }).count() === 1 && await page.getByRole('button', { name: 'Redactar con IA' }).count() === 1);
  await page.goto(`${APP}${FRAUD}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cs-desc');
  await page.waitForTimeout(500);
  ok('gestor que solo puede ver el tema: sin botones de IA', await page.getByRole('button', { name: /con IA/ }).count() === 0 && await page.locator('.ai-card').count() === 0);
}
ok('ninguna petición sin simular', unexpected.length === 0, [...new Set(unexpected)].join(' · '));
ok('ninguna petición sale del ordenador', outside.length === 0);
console.log(problems.length ? `\nPROBLEMAS (${problems.length}):\n${problems.join('\n')}` : '\nsin problemas');
await browser.close();
process.exit(problems.length ? 1 : 0);
