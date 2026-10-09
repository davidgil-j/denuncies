// Fase 3 de la mejora total (docs/AUDITORIA.md): lo que se arregló en el navegador, con la red simulada.
// La aplicación corre en modo real contra una dirección local que no existe y este script responde cada
// petición como lo haría la base de datos. No sale ninguna petición del ordenador.
//
// Canal: un corte de red al abrir no dice «Este canal no existe» (F-2) · reintentar tras un corte no crea
// otra denuncia (B-9) · el código se ve antes de que acaben de subir las pruebas (B-10) · las fotos de una
// denuncia anónima salen limpias y con nombre neutro (A2-1, A2-3) · una foto que no se puede limpiar no se
// envía · tope por hora y freno de intentos (014) · sin la 014 se usa la vía de antes.
// Panel: doble clic y acuse a medias (B-6, B-7) · caso reabierto (B-2) · no se amplía un plazo vencido (B-3)
// · mensaje en un caso cerrado (B-11) · un error pasajero no esconde lo de la 012 (B-12) · autor del registro (A1-3).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from './lib/playwright.mjs';

const OUT = process.argv[2];
const APP = 'http://localhost:3112';
const API = 'http://localhost:59999';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' });
const problems = [];
const ok = (name, v, extra = '') => { console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(name); };

// ── Datos ──────────────────────────────────────────────────────────────
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const USER = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'laura.puig@acme.es', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z',
  factors: [{ id: 'f1', factor_type: 'totp', status: 'verified', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }] };
const JWT = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER.id, role: 'authenticated', email: USER.email, aal: 'aal2', amr: [{ method: 'password', timestamp: now }, { method: 'totp', timestamp: now }], iat: now, exp: now + 3600, session_id: 's1' })}.${Buffer.from('firma-de-prueba').toString('base64url')}`;
const ORG = { id: 'org-1', name: 'Acme Logística, S.L.', slug: 'acme', plan: 'trial', trial_ends_at: new Date(Date.now() + 20 * 86400000).toISOString(), paid_until: null, responsible_name: null, responsible_role: null,
  billing_name: null, billing_tax_id: null, billing_email: null, regional_authority_name: null, regional_authority_url: null, created_at: '2026-09-01T00:00:00Z', responsible_appointed_at: null, aipi_notified_at: null, onboarding: {} };
const day = (d, h = 10) => { const x = new Date(Date.now() - d * 86400000); x.setHours(h, 0, 0, 0); return x.toISOString(); };
const base = { organization_id: 'org-1', incident_date: null, involved_people: null, language: 'es', extended_until: null, extension_reason: null, anonymized_at: null, meeting_held_at: null, fiscal_referral_at: null,
  title: null, assigned_to: null, incident_when: null, meeting_requested_at: null, channel: 'web', meeting_requested: false, outcome: null, is_anonymous: true, priority: 'normal', department: null, attachments: [] };
const id = (n) => `aaaaaaaa-0000-4000-8000-00000000000${n}`;
const CASES = [
  { ...base, id: id(1), reference: 'REF-NUEVA1', category: 'fraud', status: 'received', description: 'Facturas de rutas de reparto que no aparecen en el registro de salidas del almacén.', created_at: day(1), updated_at: day(1), acknowledged_at: null, answered_at: null, investigation_started_at: null },
  { ...base, id: id(2), reference: 'REF-REABI2', category: 'safety', status: 'investigating', description: 'Salidas de emergencia bloqueadas con palés en los pasillos 4 y 5 del muelle.', created_at: day(40), updated_at: day(2), acknowledged_at: day(39), answered_at: day(10), investigation_started_at: day(30) },
  { ...base, id: id(3), reference: 'REF-VENCI3', category: 'fraud', status: 'investigating', description: 'Un proveedor cobra dos veces el mismo servicio de limpieza cada trimestre.', created_at: day(125), updated_at: day(100), acknowledged_at: day(124), answered_at: null, investigation_started_at: day(110) },
  { ...base, id: id(4), reference: 'REF-CERRA4', category: 'harassment', status: 'resolved', outcome: 'founded', description: 'Comentarios humillantes de un encargado a dos compañeras delante del turno.', created_at: day(60), updated_at: day(10), acknowledged_at: day(59), answered_at: day(10), investigation_started_at: day(50) },
  { ...base, id: id(5), reference: 'REF-ENPLA5', category: 'safety', status: 'investigating', description: 'Las carretillas elevadoras circulan sin revisión desde hace un año.', created_at: day(30), updated_at: day(20), acknowledged_at: day(29), answered_at: null, investigation_started_at: day(20) },
];
const MESSAGES = { [id(4)]: [{ id: 'm1', sender: 'manager', content: 'Hemos tomado medidas.', is_read: true, created_at: day(10) }, { id: 'm2', sender: 'reporter', content: 'Desde que cerrasteis el caso me han cambiado de turno sin motivo.', is_read: false, created_at: day(1) }] };
const LOGS = { [id(2)]: [{ id: 'l1', complaint_id: id(2), action: 'note_added', details: { note: 'Revisar las cámaras del muelle.' }, created_at: day(5), actor_id: '22222222-2222-4222-8222-222222222222', actor_name: 'Marta Antigua', actor: { full_name: 'Marta Nueva' } }] };

// ── Red simulada ──────────────────────────────────────────────────────
const log = [];
const unexpected = [];
const S = { offline: false, submit: [], holdUpload: null, failListOnce: false, failPatchOnce: false, uploads: [], tooMany: false };
const cors = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'Content-Range' };
const json = (route, body, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { ...cors, ...headers }, body: JSON.stringify(body) });
const empty = (route, status = 201) => route.fulfill({ status, headers: cors, body: '' });

async function api(route) {
  const req = route.request();
  const url = new URL(req.url());
  const p = url.pathname;
  const method = req.method();
  if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  let body = null;
  try { body = req.postDataJSON(); } catch { /* multipart o vacío */ }
  const single = (req.headers().accept ?? '').includes('vnd.pgrst.object');
  const query = decodeURIComponent(url.search);
  log.push({ method, path: p, body, query });

  if (p === '/rest/v1/rpc/get_organization_by_slug') {
    if (S.offline) return route.abort('failed');
    return json(route, body?.p_slug === 'acme' ? [{ id: ORG.id, name: ORG.name, slug: ORG.slug, regional_authority_name: null, regional_authority_url: null }] : []);
  }
  if (p === '/rest/v1/rpc/submit_complaint') {
    const what = S.submit.shift() ?? 'ok';
    if (what === 'abort') return route.abort('failed');
    if (what === 'missing') return json(route, { code: 'PGRST202', message: 'Could not find the function public.submit_complaint(...) in the schema cache' }, 404);
    if (what === 'limit') return json(route, { code: '22023', message: 'rate-limited' }, 400);
    return json(route, 'bbbbbbbb-0000-4000-8000-000000000001');
  }
  if (p === '/rest/v1/complaints' && method === 'POST') return empty(route);
  if (p === '/rest/v1/audit_logs' && method === 'POST') return empty(route);
  if (p === '/rest/v1/attachments' && method === 'POST') return empty(route);
  if (p.startsWith('/storage/v1/object/attachments/') && method === 'POST') {
    S.uploads.push({ path: p, body: req.postDataBuffer() ?? Buffer.alloc(0) });
    if (S.holdUpload) await S.holdUpload;
    return json(route, { Key: p.replace('/storage/v1/object/', ''), Id: 'x' });
  }
  if (p === '/rest/v1/rpc/get_complaint_by_tracking_code') return S.tooMany ? json(route, { code: '54000', message: 'too-many-attempts' }, 400) : json(route, []);

  if (p === '/auth/v1/token') return json(route, { access_token: JWT, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: 'r1', user: USER });
  if (p === '/auth/v1/user') return json(route, USER);
  if (p === '/auth/v1/factors') return json(route, USER.factors);
  if (p === '/auth/v1/logout') return empty(route, 204);
  if (p === '/rest/v1/profiles' && method === 'GET') return json(route, single ? { id: USER.id, role: 'superadmin', full_name: 'Laura Puig Ferrer', organization_id: 'org-1', created_at: '2026-01-01T00:00:00Z' } : [{ id: USER.id, full_name: 'Laura Puig Ferrer', role: 'superadmin' }]);
  if (p === '/rest/v1/organizations' && method === 'GET') return json(route, single ? ORG : [ORG]);
  if (p === '/rest/v1/complaints' && method === 'GET') {
    const one = /(?:^|&|\?)id=eq\.([0-9a-f-]+)/.exec(query)?.[1];
    if (one) { const c = CASES.find(x => x.id === one); return c ? json(route, c) : json(route, { code: 'PGRST116', message: 'not found' }, 406); }
    if (S.failListOnce) { S.failListOnce = false; return json(route, { message: 'upstream timeout' }, 500); }
    return json(route, CASES, 200, { 'content-range': `0-${CASES.length - 1}/*` });
  }
  if (p === '/rest/v1/complaints' && method === 'PATCH') {
    if (S.failPatchOnce) { S.failPatchOnce = false; return json(route, { message: 'upstream timeout' }, 500); }
    const one = /id=eq\.([0-9a-f-]+)/.exec(query)?.[1];
    const c = CASES.find(x => x.id === one);
    if (body?.status === 'reviewing' && !c.acknowledged_at) c.acknowledged_at = new Date().toISOString();
    Object.assign(c, body, { updated_at: new Date().toISOString() });
    return json(route, [c]);
  }
  if (p === '/rest/v1/messages' && method === 'GET') {
    const one = /complaint_id=eq\.([0-9a-f-]+)/.exec(query)?.[1];
    if (one) return json(route, MESSAGES[one] ?? []);
    return json(route, Object.entries(MESSAGES).flatMap(([cid, ms]) => ms.filter(m => m.sender === 'reporter' && !m.is_read).map(() => ({ complaint_id: cid }))));
  }
  if (p === '/rest/v1/messages' && method === 'POST') { (MESSAGES[body.complaint_id] ??= []).push({ id: `n${Date.now()}`, sender: body.sender, content: body.content, is_read: false, created_at: new Date().toISOString() }); return empty(route); }
  if (p === '/rest/v1/messages' && method === 'PATCH') return empty(route, 204);
  if (p === '/rest/v1/audit_logs' && method === 'GET') { const one = /complaint_id=eq\.([0-9a-f-]+)/.exec(query)?.[1]; return json(route, LOGS[one] ?? []); }
  if (p === '/rest/v1/rpc/retention_due') return json(route, []);
  if (p === '/rest/v1/rpc/list_org_members') return json(route, [{ id: USER.id, full_name: 'Laura Puig Ferrer', role: 'superadmin', email: USER.email, created_at: '2026-01-01T00:00:00Z', last_sign_in_at: day(0) }]);
  if (p === '/rest/v1/manager_permissions') return json(route, []);
  unexpected.push(`${method} ${p}`);
  return json(route, { message: 'sin simular' }, 500);
}

async function newPage() {
  const page = await ctx.newPage();
  page.on('pageerror', e => problems.push(`error: ${e.message.slice(0, 220)}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|\[Supabase\]|ERR_FAILED|TypeError: Failed to fetch/.test(m.text())) problems.push(`consola: ${m.text().slice(0, 220)}`); });
  page.on('dialog', d => d.accept());
  await page.route(`${API}/**`, api);
  await page.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
  return page;
}
const calls = (p, method = 'POST') => log.filter(l => l.path === p && l.method === method);

// ── Archivos de prueba: una foto JPEG de verdad con GPS y nombre propio, una HEIC y un PDF ──
const FIX = path.join(OUT, 'archivos-endurecimiento');
fs.mkdirSync(FIX, { recursive: true });
{
  const page = await ctx.newPage();
  const jpeg = Buffer.from(await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 40; c.height = 30;
    const g = c.getContext('2d'); g.fillStyle = '#2F54EB'; g.fillRect(0, 0, 40, 30);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
    return [...new Uint8Array(await blob.arrayBuffer())];
  }));
  await page.close();
  const exif = Buffer.from('Exif\0\0GPSLatitude 41.3851 GPSLongitude 2.1734 iPhone 15 Maria Garcia', 'latin1');
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, (exif.length + 2) >> 8, (exif.length + 2) & 0xff]), exif]);
  fs.writeFileSync(path.join(FIX, 'IMG_0042_Maria_Garcia.jpg'), Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]));
  fs.writeFileSync(path.join(FIX, 'IMG_0043.heic'), Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic\0\0\0\0mif1heic GPSLatitude 41.38 Maria', 'latin1')]));
  fs.writeFileSync(path.join(FIX, 'Informe_Maria_Garcia.pdf'), '%PDF-1.4\n% prueba\n');
}
const fix = (n) => path.join(FIX, n);

async function fillReport(page, files) {
  await page.getByRole('link', { name: 'Empezar a denunciar' }).click();
  await page.waitForSelector('.cats');
  await page.getByRole('radio', { name: /Fraude o corrupción/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.waitForSelector('#dn-description');
  await page.fill('#dn-description', 'Un responsable de compras adjudica los contratos de transporte siempre a la empresa de su cuñado.');
  if (files.length) await page.locator('input[type=file]').setInputFiles(files);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.waitForSelector('.opts');
  await page.locator('#dn-privacy').check();
}
const sendBtn = (page) => page.getByRole('button', { name: /Enviar denuncia/ });

// ═══ CANAL ════════════════════════════════════════════════════════════
// F-2 · Sin conexión al abrir el canal
{
  const page = await newPage();
  S.offline = true;
  await page.goto(`${APP}/canal/acme?lang=es`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.canal-lost');
  const lost = await page.locator('.canal-lost').innerText();
  ok('F-2 · sin conexión no dice «Este canal no existe»', /No se ha podido abrir el canal/.test(lost) && !/no existe/.test(lost), lost.replace(/\n/g, ' '));
  await page.screenshot({ path: `${OUT}/canal-sin-conexion.png` });
  S.offline = false;
  await page.getByRole('button', { name: 'Volver a intentarlo' }).click();
  await page.waitForSelector('.entry-main', { timeout: 10000 });
  ok('F-2 · «Volver a intentarlo» abre el canal', true);
  await page.close();
}

// A2-1 · Una foto que no se puede limpiar no se envía en una denuncia anónima
{
  const page = await newPage();
  await page.goto(`${APP}/canal/acme?lang=es`, { waitUntil: 'networkidle' });
  await fillReport(page, [fix('IMG_0043.heic')]);
  await sendBtn(page).click();
  const err = page.locator('.flow-error');
  await err.waitFor({ timeout: 10000 });
  ok('A2-1 · la HEIC que no se puede limpiar se para antes de enviar, y se dice cuál', /IMG_0043\.heic/.test(await err.innerText()) && calls('/rest/v1/rpc/submit_complaint').length === 0, await err.innerText());
  await page.screenshot({ path: `${OUT}/canal-foto-no-limpiable.png` });
  await page.close();
}

// 014 · Tope por hora
{
  const page = await newPage();
  S.submit = ['limit'];
  await page.goto(`${APP}/canal/acme?lang=es`, { waitUntil: 'networkidle' });
  await fillReport(page, []);
  await sendBtn(page).click();
  await page.locator('.flow-error').waitFor({ timeout: 10000 });
  ok('014 · con el tope por hora se dice que se pruebe más tarde', /demasiadas comunicaciones/.test(await page.locator('.flow-error').innerText()));
  await page.close();
}

// B-9, B-10, A2-1, A2-3 · Corte de red tras guardar, reintento, código antes que las pruebas, fotos limpias
{
  const page = await newPage();
  const before = calls('/rest/v1/rpc/submit_complaint').length;
  S.submit = ['abort', 'ok'];
  S.uploads = [];
  let release;
  S.holdUpload = new Promise(r => { release = r; });
  await page.goto(`${APP}/canal/acme?lang=es`, { waitUntil: 'networkidle' });
  await fillReport(page, [fix('IMG_0042_Maria_Garcia.jpg'), fix('Informe_Maria_Garcia.pdf')]);
  await sendBtn(page).click();
  await page.locator('.flow-error').waitFor({ timeout: 10000 });
  ok('B-9 · un corte de red muestra el error de envío', /Comprueba tu conexión/.test(await page.locator('.flow-error').innerText()));
  await sendBtn(page).click();
  await page.waitForSelector('.code-big', { timeout: 10000 });
  const sub = calls('/rest/v1/rpc/submit_complaint').slice(before);
  ok('B-9 · el reintento manda el mismo código (la base de datos no crea otra denuncia)', sub.length === 2 && sub[0].body.p_hash === sub[1].body.p_hash && /^[0-9a-f]{64}$/.test(sub[0].body.p_hash), sub.map(s => s.body?.p_hash?.slice(0, 8)).join(' '));
  ok('014 · el envío va por submit_complaint, sin datos de contacto al ser anónima', sub[1].body.p_is_anonymous === true && sub[1].body.p_name === null && sub[1].body.p_email === null);
  const status = page.getByRole('status').filter({ hasText: 'Enviando las pruebas' });
  await status.waitFor({ timeout: 5000 });
  ok('B-10 · el código se ve mientras las pruebas aún se están subiendo', await page.locator('.code-big').isVisible() && /0 de 2|1 de 2/.test(await status.innerText()), await status.innerText());
  await page.screenshot({ path: `${OUT}/canal-codigo-mientras-sube.png` });
  release();
  await status.waitFor({ state: 'detached', timeout: 10000 });
  ok('B-10 · al acabar, sin aviso de archivos fallidos', await page.locator('.flow-error').count() === 0);
  const [photo, pdf] = S.uploads;
  const photoText = photo?.body.toString('latin1') ?? '';
  ok('A2-1 · la foto sube sin GPS, sin modelo de móvil y sin nombre', !!photo && !/GPSLatitude|iPhone|Maria/.test(photoText), photo ? `${photo.body.length} bytes` : 'sin subida');
  ok('A2-3 · los nombres originales no viajan en la subida', /filename="document-1\.jpg"/.test(photoText) && /filename="document-2\.pdf"/.test(pdf?.body.toString('latin1') ?? '') && !/Maria/.test(pdf?.body.toString('latin1') ?? ''));
  ok('A2-3 · la fila del adjunto también lleva el nombre neutro', calls('/rest/v1/attachments').slice(-2).map(c => c.body?.filename).join(',') === 'document-1.jpg,document-2.pdf');
  S.holdUpload = null;
  await page.close();
}

// Sin la 014: la vía de antes (inserción directa) sigue funcionando
{
  const page = await newPage();
  S.submit = ['missing'];
  const ins = calls('/rest/v1/complaints').length;
  await page.goto(`${APP}/canal/acme?lang=es`, { waitUntil: 'networkidle' });
  await fillReport(page, []);
  await sendBtn(page).click();
  await page.waitForSelector('.code-big', { timeout: 10000 });
  ok('sin la 014 · se guarda con la inserción de antes y su entrada «created»', calls('/rest/v1/complaints').length === ins + 1 && calls('/rest/v1/audit_logs').some(c => c.body?.action === 'created'));
  await page.close();
}

// 014 · Freno de intentos en la consulta por código
{
  const page = await newPage();
  S.tooMany = true;
  await page.goto(`${APP}/canal/acme/consulta?lang=es`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('XXXX-XXXX').fill('ABCD-EFGH');
  await page.getByRole('button', { name: 'Ver mi caso' }).click();
  await page.getByText(/demasiados intentos/).waitFor({ timeout: 10000 });
  ok('014 · con demasiados intentos fallidos se pide esperar unos minutos', true);
  S.tooMany = false;
  await page.close();
}

// ═══ PANEL ════════════════════════════════════════════════════════════
const page = await newPage();
S.failListOnce = true;
await page.goto(`${APP}/admin/login?lang=es`, { waitUntil: 'networkidle' });
await page.getByLabel('Correo').fill(USER.email);
await page.locator('#ac-pw').fill('una-contraseña');
await page.getByRole('button', { name: 'Entrar' }).click();
// El primer listado falla (error pasajero del servidor): el panel lo dice y se puede reintentar
await page.waitForFunction(() => document.querySelector('.ds-case') || [...document.querySelectorAll('button')].some(b => /Reintentar|Volver a intentarlo/.test(b.textContent)), null, { timeout: 15000 });
if (!(await page.locator('.ds-case').count())) await page.getByRole('button', { name: /Reintentar|Volver a intentarlo/ }).first().click();
await page.waitForSelector('.ds-case', { timeout: 15000 });
const lists = log.filter(l => l.path === '/rest/v1/complaints' && l.method === 'GET' && !/id=eq\./.test(l.query));
ok('B-12 · un error pasajero no hace creer que falta la 012 (se sigue pidiendo el título)', lists.length >= 2 && lists.every(l => /title/.test(l.query)), lists.map(l => (/title/.test(l.query) ? 'con' : 'sin')).join(' '));

const board = await page.locator('body').innerText();
ok('B-2 · ninguna tarjeta dice «undefined»', !/undefined/.test(board));
const h1 = await page.locator('h1').first().innerText();
ok('B-11 · el caso cerrado con un mensaje nuevo cuenta para «te necesitan hoy» (3)', /^3 casos/.test(h1), h1);
const closedCard = page.locator('.ds-case', { hasText: 'Comentarios humillantes' });
ok('B-11 · y su tarjeta dice «Te ha escrito»', await closedCard.getByText('Te ha escrito').count() === 1);
await page.screenshot({ path: `${OUT}/panel-tablero.png`, fullPage: true });

const openCase = async (text) => {
  await page.goto(`${APP}/admin`, { waitUntil: 'networkidle' });
  await page.locator('.ds-case', { hasText: text }).getByRole('link').first().click();
  await page.waitForSelector('.cs-desc');
};
const menuItems = async () => {
  await page.getByRole('button', { name: 'Más acciones' }).click();
  const panel = page.locator('.ds-menu-panel');
  await panel.waitFor();
  const items = await panel.locator('.ds-menu-item').allInnerTexts();
  await page.keyboard.press('Escape');
  if (!items.length) problems.push('el menú «Más acciones» está vacío');
  return items.join(' | ');
};

// B-2 y A1-3 · Caso reabierto
await openCase('Salidas de emergencia bloqueadas');
const reo = await page.locator('.cs').innerText();
ok('B-2 · el caso reabierto muestra «Respondida el…», sin cuenta atrás ni «undefined»', /Respondida el/.test(reo) && !/undefined/.test(reo));
ok('B-2 · y no ofrece ampliar el plazo', !/Ampliar el plazo/.test(await menuItems()));
const hist = await page.locator('.cs-hist').innerText();
ok('A1-3 · el registro dice quién lo hizo con el nombre de entonces', /Marta Antigua/.test(hist) && !/Marta Nueva/.test(hist), hist.replace(/\n/g, ' ').slice(0, 120));

// B-3 · Plazo vencido: no se amplía; en plazo, sí
await openCase('Un proveedor cobra dos veces');
ok('B-3 · con el plazo de respuesta vencido no se ofrece ampliarlo', !/Ampliar el plazo/.test(await menuItems()));
await openCase('Las carretillas elevadoras');
{ const items = await menuItems(); ok('B-3 · dentro de plazo sí se ofrece', /Ampliar el plazo/.test(items), items); }

// B-6 y B-7 · Doble clic en «Enviar el acuse», y el cambio de estado que falla una vez
await openCase('Facturas de rutas de reparto');
await page.locator('.cs-next').getByRole('button', { name: 'Enviar el acuse de recibo' }).click();
const msgsBefore = calls('/rest/v1/messages').length;
S.failPatchOnce = true;
await page.getByRole('dialog').getByRole('button', { name: 'Enviar el acuse', exact: true }).dblclick();
await page.getByRole('dialog').getByText(/El acuse ya se ha enviado/).waitFor({ timeout: 10000 });
ok('B-6 · el doble clic envía un solo acuse', calls('/rest/v1/messages').length === msgsBefore + 1, `${calls('/rest/v1/messages').length - msgsBefore}`);
ok('B-7 · si el cambio de estado falla se dice, sin dar el acuse por terminado', await page.getByRole('dialog').count() === 1);
await page.screenshot({ path: `${OUT}/panel-acuse-a-medias.png` });
await page.getByRole('dialog').getByRole('button', { name: 'Enviar el acuse', exact: true }).click();
await page.locator('.pn-toast', { hasText: 'Acuse enviado' }).first().waitFor({ timeout: 10000 });
ok('B-7 · al reintentar solo se guarda el estado: quien informa no recibe un segundo acuse', calls('/rest/v1/messages').length === msgsBefore + 1 && CASES[0].status === 'reviewing');

await browser.close();
if (unexpected.length) problems.push(`peticiones sin simular: ${[...new Set(unexpected)].join(', ')}`);
console.log(problems.length ? `PROBLEMAS: ${problems.join(' · ')}` : 'Endurecimiento: canal y panel, sin errores');
process.exit(problems.length ? 1 : 0);
