// Fase 4 con la red simulada: la aplicación corre en modo real (no demo) contra una dirección local que
// no existe, y cada petición la responde este script como lo haría la base de datos. No sale ninguna
// petición del ordenador ni se toca ningún Supabase.
import { chromium } from './lib/playwright.mjs';
const [OUT, SCENE] = [process.argv[2], process.argv[3]]; // gestor | nueva | sin012
const APP = 'http://localhost:3112';
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

// El canal de una empresa de verdad: «Gestionar» sigue llevando al acceso
await page.goto(`${APP}/canal/acme?lang=es`, { waitUntil: 'networkidle' });
await page.waitForSelector('.entry-main');
const href = await page.locator('.entry-wide .ds-btn').getAttribute('href');
ok('canal real: «Gestionar» lleva al acceso con el nombre de la empresa', href === '/admin/login?from=acme&lang=es', href);
ok('canal real: el botón dice «Acceder», no «Crear mi canal»', await page.locator('.entry-wide .ds-btn', { hasText: 'Acceder' }).count() === 1 && await page.getByText('Crear mi canal').count() === 0);

await page.goto(`${APP}/admin/login?lang=es`, { waitUntil: 'networkidle' });
await page.getByLabel('Correo').fill(USER.email);
await page.locator('#ac-pw').fill('una-contraseña');
await page.getByRole('button', { name: 'Entrar' }).click();
await page.waitForSelector('.ds-case', { timeout: 15000 });
const nav = await page.locator('.ds-nav .ds-nav-item').allInnerTexts();
const navHref = await page.locator('.ds-nav .ds-nav-item').evaluateAll(els => els.map(e => e.getAttribute('href')));

if (SCENE === 'gestor') {
  ok('gestor: menú sin «Compartir el canal»', nav.join('|') === 'Tablero|Informe|Equipo y ajustes', nav.join(' · '));
  ok('gestor: los ajustes van a la página única', navHref[2] === '/admin/ajustes', navHref.join(' '));
  await page.waitForTimeout(500);
  ok('gestor: sin anillo de primeros pasos ni aviso de la AIPI', await page.locator('.pn-steps').count() === 0 && await page.locator('.pn-banner.is-danger').count() === 0);
  ok('gestor: no se le pide a la base de datos la lista del equipo', log.every(l => l.path !== '/rest/v1/rpc/list_org_members' && !(l.path === '/rest/v1/profiles' && l.method === 'GET' && !l.query.includes('id=eq.'))));
  await page.goto(`${APP}/admin/ajustes`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.st-card');
  const cards = await page.locator('.st-card .st-h').allInnerTexts();
  ok('gestor: en ajustes solo ve «Tu seguridad»', cards.join('|') === 'Tu seguridad', cards.join(' · '));
  ok('gestor: tampoco se pide el equipo desde ajustes', log.every(l => l.path !== '/rest/v1/rpc/list_org_members'));
  await shot('ajustes');
  await page.goto(`${APP}/admin/integration`, { waitUntil: 'networkidle' });
  await page.waitForURL(/\/admin\/?$/);
  ok('gestor: «Compartir el canal» le devuelve al tablero', true);
  await page.goto(`${APP}/admin/users`, { waitUntil: 'networkidle' });
  await page.waitForURL(/\/admin\/ajustes$/);
  await page.goto(`${APP}/admin/report`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.rp-figs dd');
  const lists = log.filter(l => l.method === 'GET' && l.path === '/rest/v1/complaints');
  ok('gestor: el informe solo pide sus categorías', lists.length > 0 && lists.every(l => /category=in\.\((fraud,safety|safety,fraud)\)/.test(l.query)));
  ok('gestor: el informe cuenta solo sus 2 casos', (await page.locator('.rp-figs dd').first().innerText()) === '2');
  await shot('informe');
  await page.goto(`${APP}/admin/mfa`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Activada' }).waitFor();
  ok('gestor: ve su verificación en dos pasos', true);
}

if (SCENE === 'nueva') {
  ok('administradora: menú completo', nav.join('|') === 'Tablero|Informe|Compartir el canal|Equipo y ajustes', nav.join(' · '));
  await page.waitForSelector('.pn-steps');
  ok('empresa recién creada: anillo 0/5', (await page.locator('.pn-ring b').innerText()) === '0/5' && await page.locator('.pn-ring-on').count() === 0);
  const miss = await page.locator('.pn-steps-txt span').innerText();
  ok('empresa recién creada: lo que falta, resumido', miss === 'Falta: designar al responsable, el canal en la web y 3 más', miss);
  const rows = await page.evaluate(() => new Set([...document.querySelector('.pn-top').children].map(c => Math.round(c.getBoundingClientRect().top / 40))).size);
  ok('con el nombre de empresa largo la cabecera no se rompe', rows <= 2);
  await shot('tablero-0-de-5');
  await page.goto(`${APP}/admin/integration`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.sh-list');
  ok('compartir: 0 de 5 y lo primero es designar al responsable', (await page.locator('.sh-steps-head > span').innerText()) === '0 de 5' && await page.getByText('Nombra a la persona responsable del sistema').isVisible());
  await page.locator('.sh-list button', { hasText: 'Poner el canal en la web' }).click();
  await page.locator('.sh-steps-head > span', { hasText: '1 de 5' }).waitFor();
  const patch1 = last('PATCH', '/rest/v1/organizations');
  ok('marcar un paso: solo se envía «onboarding»', JSON.stringify(patch1.body) === '{"onboarding":{"web":true}}' && patch1.query.includes('id=eq.org-1'), JSON.stringify(patch1.body));
  await shot('compartir-0-de-5');
  // Responsable y fechas
  await page.locator('.sh-next a', { hasText: 'Ir a Equipo y ajustes' }).click();
  await page.waitForURL(/\/admin\/ajustes$/);
  await page.waitForSelector('.tm-list li');
  const resp = page.locator('form[aria-labelledby="st-resp-t"]');
  ok('sin responsable: «Comunicado a la AIPI» sin aviso todavía', await page.locator('.ds-field.is-warn, .ds-field.is-late').count() === 0);
  await resp.getByLabel('Nombre').fill('  Laura Puig Ferrer ');
  ok('con nombre y sin fecha de nombramiento: pide la fecha', await page.getByText('Pendiente. Anota cuándo se nombró para contar el plazo.').isVisible());
  await resp.getByLabel('Cargo').fill('Directora de Cumplimiento');
  const d = new Date(); d.setDate(d.getDate() - 1);
  const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  await resp.getByLabel('Nombrada el').fill(yesterday);
  await page.getByText(/Quedan? \d+ días? hábil(es)?/).waitFor();
  await resp.getByRole('button', { name: 'Guardar' }).click();
  await toast('Guardado.');
  const patch2 = last('PATCH', '/rest/v1/organizations').body;
  ok('guardar el responsable: nombre sin espacios, fecha y AIPI vacía como null', patch2.responsible_name === 'Laura Puig Ferrer' && patch2.responsible_appointed_at === yesterday && patch2.aipi_notified_at === null, JSON.stringify(patch2));
  ok('guardar el responsable: sin autoridad autonómica, las dos columnas a null', patch2.regional_authority_name === null && patch2.regional_authority_url === null);
  ok('guardar el responsable: no se envía nada que no sea suyo', Object.keys(patch2).sort().join(',') === 'aipi_notified_at,regional_authority_name,regional_authority_url,responsible_appointed_at,responsible_name,responsible_role', Object.keys(patch2).join(','));
  await resp.getByLabel('Autoridad autonómica que se muestra en el canal').selectOption('antifrau');
  await resp.getByRole('button', { name: 'Guardar' }).click();
  await toast('Guardado.');
  const patch3 = last('PATCH', '/rest/v1/organizations').body;
  ok('autoridad Antifrau: nombre y enlace https', patch3.regional_authority_name === 'Oficina Antifrau de Catalunya' && patch3.regional_authority_url === 'https://www.antifrau.cat');
  // Una sola persona: invitar
  ok('equipo: solo estás tú', await page.locator('.tm-list li').count() === 1);
  await page.getByRole('button', { name: 'Invitar' }).click();
  await page.locator('#tm-inv-name').fill('Daniel Ortega Ruiz');
  await page.locator('#tm-inv-email').fill('D.Ortega@Acme.es');
  await page.getByRole('button', { name: 'Enviar la invitación' }).click();
  await page.getByRole('heading', { name: 'Permisos de Daniel Ortega Ruiz' }).waitFor();
  const inv = last('POST', '/functions/v1/invite-manager').body;
  ok('invitar: correo en minúsculas y nombre', inv.email === 'd.ortega@acme.es' && inv.full_name === 'Daniel Ortega Ruiz', JSON.stringify(inv));
  await page.getByRole('checkbox', { name: 'Editar: Fraude o corrupción' }).check({ force: true });
  await page.getByRole('button', { name: 'Guardar permisos' }).click();
  await toast('Permisos guardados.');
  const sp = last('POST', '/rest/v1/rpc/set_manager_permissions').body;
  ok('permisos: una sola llamada con solo las filas marcadas', sp.p_manager === '33333333-3333-4333-8333-333333333333' && sp.p_permissions.length === 1 && sp.p_permissions[0].category === 'fraud' && sp.p_permissions[0].can_view === true && sp.p_permissions[0].can_edit === true, JSON.stringify(sp));
  await page.locator('.tm-list li', { hasText: 'invitación pendiente' }).waitFor();
  // Facturación y contraseña
  await page.getByRole('button', { name: 'Datos de facturación' }).click();
  await page.locator('#st-billing_name').fill('Acme Logística, S.L.');
  await page.locator('#st-billing_tax_id').fill('B12345678');
  await page.getByRole('button', { name: 'Guardar' }).last().click();
  await toast('Guardado.');
  const patch4 = last('PATCH', '/rest/v1/organizations').body;
  ok('facturación: solo sus tres columnas, el correo vacío como null', JSON.stringify(patch4) === '{"billing_name":"Acme Logística, S.L.","billing_tax_id":"B12345678","billing_email":null}', JSON.stringify(patch4));
  await page.locator('section[aria-labelledby="st-sec-t"]').getByRole('button', { name: /Cambiar/ }).click();
  await page.locator('#st-pw-new').fill('una-frase-larga-2026');
  await page.locator('#st-pw-confirm').fill('una-frase-larga-2026');
  await page.getByRole('button', { name: 'Guardar la contraseña' }).click();
  await toast('Contraseña cambiada.');
  ok('contraseña: se cambia en la cuenta de acceso', last('PUT', '/auth/v1/user')?.body?.password === 'una-frase-larga-2026');
  // Al volver al tablero: responsable + web + equipo = 3 de 5
  await page.goto(`${APP}/admin`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.pn-steps');
  ok('tablero: ya van 3/5', (await page.locator('.pn-ring b').innerText()) === '3/5', await page.locator('.pn-steps-txt').innerText());
  await page.goto(`${APP}/canal/acme?lang=es`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.entry-links');
  ok('el canal de la empresa enseña la autoridad elegida', (await page.locator('.entry-links').innerText()).includes('Oficina Antifrau de Catalunya'));
}

if (SCENE === 'sin012') {
  await page.waitForTimeout(600);
  ok('sin la 012: el tablero carga y no enseña primeros pasos ni aviso', await page.locator('.pn-steps').count() === 0 && await page.locator('.pn-banner.is-danger').count() === 0);
  await page.goto(`${APP}/admin/integration`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.sh-qr img');
  ok('sin la 012: Compartir sin tarjeta de primeros pasos y con sus 4 piezas', await page.locator('.sh-steps').count() === 0 && await page.locator('.sh-cards > section').count() === 4);
  await shot('compartir');
  await page.goto(`${APP}/admin/ajustes`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.tm-list li');
  const resp = page.locator('form[aria-labelledby="st-resp-t"]');
  ok('sin la 012: el responsable sin las dos fechas', await resp.locator('input[type="date"]').count() === 0 && await resp.getByLabel('Nombre').count() === 1);
  await resp.getByLabel('Nombre').fill('Laura Puig Ferrer');
  await resp.getByRole('button', { name: 'Guardar' }).click();
  await toast('Guardado.');
  const patch = last('PATCH', '/rest/v1/organizations').body;
  ok('sin la 012: al guardar no se envían columnas que no existen', !('onboarding' in patch) && !('responsible_appointed_at' in patch) && !('aipi_notified_at' in patch) && patch.responsible_name === 'Laura Puig Ferrer', Object.keys(patch).join(','));
  await shot('ajustes');
}

ok('ninguna petición sin simular', unexpected.length === 0, [...new Set(unexpected)].join(' · '));
ok('ninguna petición sale del ordenador', outside.length === 0, outside.slice(0, 3).join(' · '));
console.log(problems.length ? `\nPROBLEMAS (${problems.length}):\n${problems.join('\n')}` : '\nsin problemas');
await browser.close();
process.exit(problems.length ? 1 : 0);
