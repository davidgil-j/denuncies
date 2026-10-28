// La web contra una base de datos de verdad (Postgres + PostgREST en el ordenador, e2e/lib/supabase-local.mjs), con las
// migraciones de producción y después las nuevas sobre LOS MISMOS DATOS, como pasará al ejecutarlas:
//   1. hasta la 015: el canal y el panel funcionan; la marca no aparece (falta la 016) y no hay errores;
//   2. con la 016 y la 017 (producción desde el 19 oct): la marca de la empresa en el canal y «Tu marca» en Ajustes;
//   3. con la 018: el pie «Con Reportia», que Reportia apaga por empresa;
//   4. con la copia y la 019 (huella con secreto): el código de antes sigue valiendo y se reescribe al usarlo; el nuevo se
//      guarda con secreto; los dos casos siguen en el panel;
//   5. con la protección contra robots encendida en Auth: sin clave en la web, el acceso lo dice; con la clave, entra;
//   6. la 020-022 (ronda 2: exclusión, freno y prueba de trabajo, cierre de las funciones de antes);
//   7. la 023-029, como producción desde el 28 oct: la web entera (enviar con adjunto, consultar, mensajes, reunión,
//      panel, descarga, exportar, «Accesos», supresión con el almacén fallando y sin fallar), el alta de una empresa
//      nueva hasta el panel cargado con el segundo paso (B1, 028) y el acceso de quien aún no lo ha activado;
//   8. la 030: enviar exige siempre la prueba de trabajo; la web sigue enviando y, si no puede resolverla, lo dice.
// Necesita Postgres 16 y PostgREST de Homebrew (brew install postgresql@16 postgrest). Si no están, se salta y lo dice.
// Arranca sus propios servidores de la web (3116 sin clave de Turnstile, 3117 con la de pruebas). No sale nada del ordenador.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwright.mjs';
import { available, startLocalSupabase, ANON_KEY, jwt } from './lib/supabase-local.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!available()) {
  console.log('AVISO Sin Postgres 16 y PostgREST de Homebrew: esta prueba se salta (brew install postgresql@16 postgrest)');
  process.exit(0);
}
const problems = [];
const ok = (name, v, extra = '') => { console.log(`${v ? 'OK   ' : 'FALLA'} ${name} ${extra}`); if (!v) problems.push(name); };
const sha = (code) => crypto.createHash('sha256').update(String(code).toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');

// ── La base de datos como producción antes del 19 oct (hasta la 015) y una empresa dada de alta ──
const db = await startLocalSupabase({ hasta: 15 });
const q = (s) => db.sql(s);
const adminId = q(`insert into auth.users (email, raw_user_meta_data) values ('laura@acme.es', '{"company_name":"Acme Logística","full_name":"Laura Puig","lang":"es"}') returning id`).split('\n')[0];
const slug = q(`select o.slug from organizations o join profiles p on p.organization_id = o.id where p.id = '${adminId}'`);
ok('base local: empresa y administradora creadas por el alta (como en producción)', !!slug, slug);

// ── Dos servidores de la web contra esa base de datos ──
const servers = [];
const up = async (port) => { try { return (await fetch(`http://localhost:${port}/admin/login`)).ok; } catch { return false; } };
for (const [port, extra] of [[3116, {}], [3117, { VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' }]]) {
  const env = { ...process.env, VITE_SUPABASE_URL: db.url, VITE_SUPABASE_ANON_KEY: ANON_KEY, VITE_AI_ENABLED: '', VITE_TURNSTILE_SITE_KEY: '', ...extra };
  servers.push(spawn(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort'], { cwd: ROOT, env, stdio: 'ignore' }));
}
for (const port of [3116, 3117]) for (let i = 0; !(await up(port)); i++) { if (i > 120) throw new Error(`la web no arranca en ${port}`); await new Promise(r => setTimeout(r, 500)); }
const APP = 'http://localhost:3116';

const browser = await chromium.launch();
async function shutdown() {
  await browser.close().catch(() => {});
  for (const s of servers) s.kill();
  await db.stop().catch(() => {});
}
process.on('uncaughtException', async (e) => { console.log(`FALLA ${e.message.split('\n')[0]}`); await shutdown(); process.exit(1); });
process.on('unhandledRejection', async (e) => { console.log(`FALLA ${String(e?.message ?? e).split('\n')[0]}`); await shutdown(); process.exit(1); });
const FAKE_TURNSTILE = `window.turnstile = { render(el, o) { setTimeout(() => o.callback('XXXX.DUMMY.TOKEN.XXXX'), 200); return 'w1'; }, reset() {}, remove() {} };
  (function () { const cb = new URL(document.currentScript.src).searchParams.get('onload'); if (cb && window[cb]) window[cb](); })();`;
async function newPage({ w = 1280, blockWorker = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, locale: 'es-ES' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`error: ${e.message.slice(0, 160)}`));
  // Las respuestas 4xx de la base de datos se cuentan aparte: la web pregunta por columnas nuevas y, si no están, sigue sin ellas
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`consola: ${m.text().slice(0, 160)}`); });
  await ctx.route('https://challenges.cloudflare.com/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_TURNSTILE }));
  await ctx.route(u => !/^https?:\/\/localhost[:/]/.test(u.toString()) && !u.toString().startsWith('https://challenges.cloudflare.com') && !/^(data|blob):/.test(u.toString()), r => r.abort());
  await page.addInitScript(() => { try { localStorage.setItem('reportia-panel-lang', 'es'); } catch { /* sin almacenamiento */ } });
  // Simula un navegador donde la prueba de trabajo no puede ejecutarse (A2): 'worker' tira el Worker (debe
  // recaer en el hilo principal y seguir funcionando); 'all' tira también sha-256 (no se puede: error claro).
  if (blockWorker === 'worker' || blockWorker === 'all') {
    await page.addInitScript((mode) => {
      try { window.Worker = function () { throw new Error('worker bloqueado en la prueba'); }; } catch { /* nada */ }
      if (mode === 'all' && window.crypto?.subtle) {
        try { window.crypto.subtle.digest = () => Promise.reject(new Error('sha bloqueado en la prueba')); } catch { /* nada */ }
      }
    }, blockWorker);
  }
  return { page, ctx, errors };
}

/** Quien informa: envía una denuncia anónima (con adjuntos, si se dan) y devuelve su código */
async function report(text, { files = [], blockWorker = false } = {}) {
  const { page, ctx, errors } = await newPage({ blockWorker });
  await page.goto(`${APP}/canal/${slug}?lang=es`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Presentar una denuncia' }).click();
  await page.getByRole('radio', { name: /Fraude o corrupción/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.fill('#dn-description', text);
  if (files.length) await page.locator('input[type=file]').setInputFiles(files);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.locator('#dn-privacy').check();
  await page.getByRole('button', { name: /Enviar denuncia/ }).click();
  const sent = await Promise.race([
    page.waitForSelector('.code-big', { timeout: 20000 }).then(() => true),
    page.waitForSelector('.flow-error', { timeout: 20000 }).then(() => false),
  ]).catch(() => false);
  if (!sent) {
    const submitError = await page.locator('.flow-error').innerText().catch(() => '');
    await ctx.close();
    return { code: null, errors, submitError };
  }
  const code = (await page.locator('.code-big').textContent()).trim();
  // Los adjuntos se suben desde «Enviada»: se espera a que acabe (y a que no diga que alguno ha fallado)
  let uploadError = '';
  if (files.length) {
    await page.waitForFunction(() => !document.querySelector('.flow-status'), null, { timeout: 30000 }).catch(() => {});
    uploadError = await page.locator('.flow-error').innerText().catch(() => '');
  }
  await ctx.close();
  return { code, errors, uploadError };
}
/** Quien informa: abre su caso con el código (y, si se pide, escribe un mensaje o pide una reunión) */
async function lookup(code, message, { meeting = false, blockWorker = false } = {}) {
  const { page, ctx, errors } = await newPage({ blockWorker });
  await page.goto(`${APP}/canal/${slug}/consulta?lang=es`, { waitUntil: 'networkidle' });
  await page.getByLabel('Tu código').fill(code);
  await page.getByRole('button', { name: 'Ver mi caso' }).click();
  const opened = await page.waitForSelector('.mc', { timeout: 15000 }).then(() => true).catch(() => false);
  let meetingAsked = false;
  if (opened && message) {
    await page.fill('#mc-msg', message);
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await page.locator('.ds-chat-msg.is-mine', { hasText: message }).waitFor({ timeout: 10000 });
  }
  if (opened && meeting) {
    const btn = page.getByRole('button', { name: 'Pide una reunión' });
    if (await btn.count()) {
      await btn.first().click();
      meetingAsked = await page.getByText('Has pedido una reunión en persona').first().waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
    }
    if (!meetingAsked) errors.push(`reunión: botones=${await btn.count()} ${(await page.locator('.mc').innerText()).slice(0, 300).replace(/\n/g, ' ')}`);
  }
  // Si quedó bloqueada la prueba de trabajo, el canal lo dice con claridad y un botón para reintentar
  const proofError = !opened && await page.getByText('No se ha podido hacer la comprobación de seguridad en este dispositivo').count() > 0;
  await ctx.close();
  return { opened, errors, meetingAsked, proofError };
}
/** Quien gestiona: entra (contraseña y código de 6 cifras) y devuelve la página en el tablero */
async function login(base = APP) {
  const s = await newPage();
  await s.page.goto(`${base}/admin/login?lang=es`, { waitUntil: 'networkidle' });
  await s.page.getByLabel('Correo').fill('laura@acme.es');
  await s.page.locator('#ac-pw').fill('una-contraseña-larga');
  const go = s.page.getByRole('button', { name: 'Entrar' });
  await s.page.waitForFunction((el) => !el.disabled, await go.elementHandle(), { timeout: 10000 }).catch(() => {});
  await go.click();
  const otp = await s.page.waitForSelector('.ds-otp', { timeout: 10000 }).then(() => true).catch(() => false);
  if (otp) {
    // A ritmo de persona: cada cifra pasa sola a la casilla siguiente
    await s.page.locator('.ds-otp-box').first().focus();
    await s.page.keyboard.type('123456', { delay: 120 });
    await s.page.waitForSelector('.ds-case', { timeout: 15000 }).catch(() => {});
    await s.page.waitForLoadState('networkidle').catch(() => {});
  }
  return { ...s, otp };
}
const solid = (page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--solid').trim().toUpperCase());

// ── 1 · Hasta la 015 ──
const a = await report('Un proveedor de transporte factura rutas que no aparecen en el registro de salidas del almacén.');
ok('015 · el canal envía una denuncia y da su código', /^[A-Z0-9]{4}(-[A-Z0-9]{4}){1,3}$/.test(a.code) && a.errors.length === 0, `${a.code} ${a.errors.join(' · ')}`);
ok('015 · la huella guardada es la de siempre (sin secreto)', q(`select count(*) from complaints where tracking_hash = '${sha(a.code)}'`) === '1');
ok('015 · con el código se abre el caso', (await lookup(a.code)).opened);
{
  const { page, ctx, errors, otp } = await login();
  ok('015 · el panel: acceso con verificación en dos pasos y tablero con la denuncia', otp && await page.locator('.ds-case').count() === 1, `otp=${otp} casos=${await page.locator('.ds-case').count()} ${page.url()} ${errors.join(' · ')}`);
  await page.goto(`${APP}/admin/ajustes`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.st-col', { timeout: 10000 }).catch(() => {});
  ok('015 · sin la 016, «Tu marca» no aparece y Ajustes funciona', await page.getByText('Tu marca', { exact: true }).count() === 0 && await page.getByText('Responsable del Sistema').first().isVisible(), errors.join(' · '));
  await ctx.close();
}
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${APP}/canal/${slug}?lang=es`, { waitUntil: 'networkidle' });
  ok('015 · el canal en el azul de siempre, con el pie «Con Reportia»', (await solid(page)) === '#2F54EB' && await page.locator('.entry-by').isVisible(), `${await solid(page)} ${errors.join(' · ')}`);
  await ctx.close();
}

// ── 2 · Con la 016 y la 017 (como producción desde el 19 oct) ──
db.migrate(17);
q(`update organizations set brand_palette = 'petroleo' where slug = '${slug}'`);
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${APP}/canal/${slug}?lang=es`, { waitUntil: 'networkidle' });
  ok('016-017 · el canal con el color de la empresa', (await solid(page)) === '#0F5E6B', `${await solid(page)} ${errors.join(' · ')}`);
  await ctx.close();
}
ok('016-017 · el código de antes sigue abriendo su caso', (await lookup(a.code)).opened);
{
  const { page, ctx, errors } = await login();
  await page.goto(`${APP}/admin/ajustes`, { waitUntil: 'networkidle' });
  await page.getByText('Tu marca', { exact: true }).first().waitFor({ timeout: 10000 }).catch(() => {});
  ok('016-017 · «Tu marca» aparece en Ajustes', await page.getByText('Tu marca', { exact: true }).first().isVisible(), errors.join(' · '));
  await ctx.close();
}

// ── 3 · Con la 018: el pie «Con Reportia», que Reportia apaga por empresa ──
db.migrate(18);
ok('018 · el pie, encendido por defecto en las empresas que ya existían', q(`select show_powered_by from organizations where slug = '${slug}'`) === 't');
{
  const { page, ctx } = await newPage();
  await page.goto(`${APP}/canal/${slug}?lang=es`, { waitUntil: 'networkidle' });
  ok('018 · el canal enseña «Con Reportia»', await page.locator('.entry-by').isVisible());
  q(`update organizations set show_powered_by = false where slug = '${slug}'`);
  await page.reload({ waitUntil: 'networkidle' });
  ok('018 · apagado por Reportia, no sale (y el resto del canal, igual)', await page.locator('.entry-by').count() === 0 && await page.locator('.ds-hero').first().isVisible());
  q(`update organizations set show_powered_by = true where slug = '${slug}'`);
  await ctx.close();
}

// ── 4 · La copia de seguridad y la 019: la huella del código con secreto ──
db.file(path.join(ROOT, 'supabase/rollback/019_copia_antes.sql'));
db.migrate(19);
ok('019 · nada se transforma al ejecutarla: la huella de antes sigue igual', q(`select count(*) from complaints where tracking_hash = '${sha(a.code)}'`) === '1');
const before = q(`select updated_at from complaints where tracking_hash = '${sha(a.code)}'`);
ok('019 · el código de antes abre su caso…', (await lookup(a.code, 'Puedo aportar las facturas de marzo.')).opened);
ok('019 · …y en ese momento su huella se reescribe con secreto (sin cambiar la fecha del caso)', q(`select count(*) from complaints where tracking_hash = '${sha(a.code)}'`) === '0'
  && q(`select count(*) from complaints where tracking_hash = public.tracking_key('${sha(a.code)}')`) === '1'
  && q(`select updated_at from complaints where tracking_hash = public.tracking_key('${sha(a.code)}')`) !== '' && before !== '');
ok('019 · el código de antes, ya reescrito, sigue abriendo su caso', (await lookup(a.code)).opened);
const b = await report('Un responsable adjudica los contratos de limpieza siempre a la empresa de su cuñado.');
ok('019 · una denuncia nueva se guarda directamente con secreto', q(`select count(*) from complaints where tracking_hash = '${sha(b.code)}'`) === '0'
  && q(`select count(*) from complaints where tracking_hash = public.tracking_key('${sha(b.code)}')`) === '1' && b.errors.length === 0, b.errors.join(' · '));
ok('019 · y su código abre el caso y deja escribir', (await lookup(b.code, 'Tengo los correos con las adjudicaciones.')).opened);
ok('019 · un código inventado no abre nada', !(await lookup('ZZZZ-9999')).opened);
ok('019 · la copia de seguridad está y tiene la denuncia de antes', q(`select count(*) from private.complaints_copia_019`) === '1');
{
  const { page, ctx, errors } = await login();
  ok('019 · el panel sigue enseñando los dos casos', await page.locator('.ds-case').count() === 2, errors.join(' · '));
  await page.locator('.ds-case').first().getByRole('link').first().click();
  await page.waitForSelector('.cs-desc', { timeout: 10000 });
  const conv = await page.locator('.cs-conv').innerText();
  ok('019 · y los mensajes de quien informa llegan a la ficha', /Tengo los correos|Puedo aportar las facturas/.test(conv), errors.join(' · '));
  await ctx.close();
}

// ── 5 · Con la protección contra robots encendida en Supabase Auth ──
db.setCaptcha(true);
{
  const { page, ctx } = await login(APP);
  ok('captcha en Auth y la web SIN clave: no entra y lo dice con claridad', !(await page.locator('.ds-otp').count()) && await page.getByText('La comprobación de seguridad ha caducado').isVisible());
  await ctx.close();
}
{
  const { page, ctx, otp, errors } = await login('http://localhost:3117');
  ok('captcha en Auth y la web CON clave: entra, con el token', otp && db.seen.captchaTokens.includes('XXXX.DUMMY.TOKEN.XXXX') && await page.locator('.ds-case').count() === 2, `otp=${otp} tokens=${db.seen.captchaTokens.join(',')} casos=${await page.locator('.ds-case').count()} ${errors.join(' · ')}`);
  await ctx.close();
}
db.setCaptcha(false);

// ── 6 · Las migraciones de la ronda 2 (020 exclusión, 021 freno + prueba de trabajo, 022 cierre) ──
db.migrate(22);
ok('020-022 · las funciones de antes quedan cerradas y las nuevas abiertas',
  q(`select has_function_privilege('anon', 'public.get_complaint_by_tracking_code(text)', 'execute')`) === 'f'
  && q(`select has_function_privilege('anon', 'public.consult_complaint(uuid, text, text, text)', 'execute')`) === 't');
// Un caso antiguo con código de 8 caracteres y huella plana (como si se hubiera guardado antes de la 019 y
// nadie lo hubiera consultado): se inserta con el disparador apagado para que la huella NO se reescriba aún.
const orgId = q(`select id from organizations where slug = '${slug}'`);
const old8 = 'ABCD-EFGH';
q(`alter table complaints disable trigger complaints_tracking_key`);
q(`insert into complaints (tracking_hash, organization_id, category, description, status, priority, channel) values ('${sha(old8)}', '${orgId}', 'safety', 'Caso antiguo con un codigo de ocho caracteres para comprobar que sigue valiendo.', 'received', 'normal', 'web')`);
q(`alter table complaints enable trigger complaints_tracking_key`);

ok('022 · el código de 16 abre su caso y deja escribir por el camino nuevo (prueba de trabajo)', (await lookup(a.code, 'Un mensaje más, ya por el camino nuevo.')).opened);
ok('022 · pedir una reunión por el camino nuevo', (await lookup(b.code, null, { meeting: true })).meetingAsked);
ok('022 · un código antiguo de 8 caracteres (huella plana) sigue abriendo su caso', (await lookup(old8)).opened);
ok('022 · …y al usarlo se reescribe con el secreto', q(`select count(*) from complaints where tracking_hash = '${sha(old8)}'`) === '0'
  && q(`select count(*) from complaints where tracking_hash = public.tracking_key('${sha(old8)}')`) === '1');
const c = await report('Una denuncia nueva enviada después de cerrar las funciones de antes.');
ok('022 · enviar una denuncia nueva sigue funcionando (código de 16 con secreto)', c.errors.length === 0
  && q(`select count(*) from complaints where tracking_hash = public.tracking_key('${sha(c.code)}')`) === '1', c.errors.join(' · '));
ok('022 · un código inventado no abre nada y no dice si existe', !(await lookup('ZZZZ-9999-9999-9999')).opened);

// Item 3 · Qué ve quien denuncia si la prueba de trabajo no puede ejecutarse
ok('022 · con el Worker bloqueado, la prueba se resuelve en el hilo principal y el caso abre igual', (await lookup(a.code, null, { blockWorker: 'worker' })).opened);
const noProof = await lookup(a.code, null, { blockWorker: 'all' });
ok('022 · sin forma de resolver la prueba, el canal lo dice con claridad y no abre en silencio', !noProof.opened && noProof.proofError);

// ── 7 · El resto de la ronda 2 (023-029) sobre los mismos datos ──
db.migrate(29);
ok('023-029 · las migraciones aplican en un Postgres real y las funciones nuevas existen',
  q(`select to_regprocedure('public.madrid_day_start(timestamptz)') is not null`) === 't'
  && q(`select to_regprocedure('public.list_access_log(integer,integer)') is not null`) === 't'
  && q(`select to_regprocedure('public.request_suppression(uuid,text)') is not null`) === 't'
  && q(`select to_regprocedure('public.offboard_organization(uuid)') is not null`) === 't');
ok('027 · todas las huellas antiguas quedan reescritas con el secreto (M1)',
  q(`select count(*) from complaints c join private.complaints_copia_019 b on b.id = c.id where c.tracking_hash = b.tracking_hash`) === '0');
ok('029 · el valor por defecto de appearance es «claro» (8b)',
  (q(`select column_default from information_schema.columns where table_name = 'profiles' and column_name = 'appearance'`) || '').includes(`'light'`));
// ── 7b · La web entera con la base de datos como producción (001-029) ──
const caseOf = (code) => q(`select id from complaints where tracking_hash = public.tracking_key('${sha(code)}')`);
const usedProofs = () => Number(q(`select count(*) from pow_challenges where used`));
const FILES = fs.mkdtempSync(path.join(os.tmpdir(), 'reportia-base-real-'));
const PDF = path.join(FILES, 'facturas-marzo-Laura.pdf');
fs.writeFileSync(PDF, '%PDF-1.4\n% facturas de prueba\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n');
const proofsBefore = usedProofs();
const d = await report('Una denuncia nueva con toda la ronda 2 aplicada, con las facturas adjuntas.', { files: [PDF] });
ok('026 · enviar una denuncia nueva con adjunto funciona con todo aplicado', !!d.code && d.errors.length === 0 && !d.uploadError, `${d.code} ${d.uploadError ?? d.submitError} ${d.errors.join(' · ')}`);
ok('026 · la web envía por el camino con prueba de trabajo (18 parámetros), el que la 030 deja abierto', usedProofs() > proofsBefore, `${proofsBefore} → ${usedProofs()}`);
const dId = caseOf(d.code);
ok('023 · la denuncia web se guarda con la hora al día (00:00 Madrid)',
  q(`select (created_at at time zone 'Europe/Madrid')::time::text from complaints where id = '${dId}'`) === '00:00:00');
const dFile = q(`select storage_path from attachments where complaint_id = '${dId}'`);
const dSub = q(`select submission_id from complaints where id = '${dId}'`);
ok('027 · M5 · el adjunto se sube con el id de envío en la ruta y está en el almacén',
  !!dFile && dFile.startsWith(`${dId}/${dSub}/`) && q(`select count(*) from storage.objects where name = '${dFile}'`) === '1' && db.hasBytes(dFile), dFile);
ok('A5 · en la anónima, el adjunto va con nombre neutro', !/Laura|facturas/i.test(q(`select filename from attachments where complaint_id = '${dId}'`)), q(`select filename from attachments where complaint_id = '${dId}'`));
ok('023 · el adjunto, en el almacén, con la fecha al día', q(`select (created_at at time zone 'Europe/Madrid')::time::text from storage.objects where name = '${dFile}'`) === '00:00:00');
{
  const r = await lookup(d.code, 'Tengo también los albaranes de abril.', { meeting: true });
  ok('021 · «Mi caso» con el código de 16: abre y deja escribir', r.opened && r.errors.filter(x => !/^reunión|\[Supabase\]|Supabase/.test(x)).length === 0, r.errors.join(' · '));
  // Tal como está producción (con la 028): pedir la reunión falla. Lo arregla la 031 (más abajo)
  ok('029 · (fallo de la 028, lo arregla la 031) pedir una reunión desde «Mi caso» no funciona', !r.meetingAsked);
}
ok('023 · el mensaje de quien denuncia, con la hora al día', q(`select (created_at at time zone 'Europe/Madrid')::time::text from messages where complaint_id = '${dId}' and sender = 'reporter'`) === '00:00:00');
{
  const { page, ctx, errors } = await login();
  ok('panel · el tablero carga con los casos', await page.locator('.ds-case').count() >= 3, `${await page.locator('.ds-case').count()} ${errors.join(' · ')}`);
  await page.goto(`${APP}/admin/complaints/${dId}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cs-desc', { timeout: 10000 });
  const body = await page.locator('main').innerText();
  ok('023 · la ficha dice el día de recepción, sin la hora', /Recibida el/.test(body) && !/Recibida el[^\n]*\d{1,2}:\d{2}/.test(body), (body.match(/Recibida el[^\n]*/) ?? [''])[0]);
  ok('panel · en la ficha llega el mensaje de quien denuncia', /albaranes de abril/.test(await page.locator('.cs-conv').innerText()));
  // M7: el adjunto se descarga (no se abre en una pestaña), con su nombre neutro y los mismos bytes
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.locator('.cs-file').first().click()]);
  const saved = path.join(FILES, 'descargado.pdf');
  await dl.saveAs(saved);
  ok('M7 · el adjunto se descarga entero, con su nombre neutro', fs.readFileSync(saved).equals(fs.readFileSync(PDF)) && !/Laura/.test(dl.suggestedFilename()) && await page.locator('.cs-file-note.is-err').count() === 0, dl.suggestedFilename());
  const [pdf] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('button', { name: 'Exportar PDF' }).click()]);
  ok('panel · el PDF del caso se descarga', /\.pdf$/.test(pdf.suggestedFilename()), pdf.suggestedFilename());
  await page.goto(`${APP}/admin`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.ds-case', { timeout: 10000 });
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const [xls] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('button', { name: 'Libro-registro (Excel)' }).click()]);
  ok('panel · el libro-registro en Excel se descarga', /\.xlsx$/.test(xls.suggestedFilename()), xls.suggestedFilename());
  await page.waitForTimeout(500);
  const acts = q(`select string_agg(distinct action, ' ' order by action) from audit_logs where complaint_id = '${dId}'`);
  ok('024 · quedan anotados abrir, descargar el archivo y exportar el PDF', ['case_opened', 'file_downloaded', 'exported_case'].every(a => acts.includes(a)), acts);
  ok('024 · y el Excel, a nivel de empresa', q(`select count(*) from audit_logs where action = 'exported_excel'`) !== '0');
  await page.goto(`${APP}/admin/access`, { waitUntil: 'networkidle' });
  await page.locator('.pn-access-row').first().waitFor({ timeout: 10000 }).catch(() => {});
  const rows = await page.locator('.pn-access-row').count();
  const accesses = rows ? await page.locator('.pn-access').innerText() : '';
  ok('024 · la pantalla «Accesos» enseña quién abrió, descargó y exportó', rows >= 4 && /Laura Puig/.test(accesses), `${rows} filas ${errors.join(' · ')}`);
  ok('panel · sin errores en la consola en todo el recorrido', errors.length === 0, errors.join(' · '));
  await ctx.close();
}

// ── 7c · Supresión (025): programar, adelantar la fecha y ejecutarla; si el almacén falla, no se suprime ──
// El caso se da por resuelto en la base de datos (la ley no deja suprimir con la investigación abierta)
q(`update complaints set status = 'resolved' where id = '${dId}'`);
{
  const { page, ctx, errors } = await login();
  await page.goto(`${APP}/admin/complaints/${dId}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cs-desc', { timeout: 10000 });
  await page.getByRole('button', { name: 'Más acciones' }).click();
  await page.getByRole('button', { name: 'Suprimir datos' }).click();
  await page.locator('dialog[open] textarea').fill('Caso resuelto y comunicado; se suprime según el artículo 32 de la Ley 2/2023.');
  await page.locator('dialog[open] .ds-dialog-actions button').last().click();
  await page.locator('.cs-suppress').waitFor({ timeout: 10000 }).catch(() => {});
  ok('025 · la supresión se programa a 7 días, con aviso en la ficha', await page.locator('.cs-suppress').count() > 0
    && q(`select count(*) from suppressions where complaint_id = '${dId}' and status = 'pending' and scheduled_for > now() + interval '6 days'`) === '1');
  ok('025 · antes de los 7 días no se puede ejecutar', await page.getByRole('button', { name: 'Suprimir ahora' }).count() === 0);
  // La misma consulta que la guía da a David para probarlo en producción sin esperar 7 días
  const ref = q(`select reference from complaints where id = '${dId}'`);
  q(`update suppressions set scheduled_for = now() - interval '1 minute'
     where status = 'pending' and complaint_id = (select id from complaints where reference = '${ref}')`);
  await page.reload({ waitUntil: 'networkidle' });
  const now = page.getByRole('button', { name: 'Suprimir ahora' });
  await now.waitFor({ timeout: 10000 });
  const intact = () => q(`select anonymized_at is null from complaints where id = '${dId}'`) === 't'
    && q(`select count(*) from attachments where complaint_id = '${dId}'`) === '1'
    && q(`select count(*) from storage.objects where name = '${dFile}'`) === '1' && db.hasBytes(dFile);
  for (const mode of ['error', 'silent']) {
    db.setStorageFailure(mode);
    await now.click();
    const msg = page.getByText('No se han podido borrar todos los documentos del caso');
    const shown = await msg.first().waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
    ok(`025 · si el almacén ${mode === 'error' ? 'da error' : 'no borra nada (sin error)'}, NO se suprime: el caso, su adjunto y el archivo siguen`, shown && intact() && await page.locator('.cs-erased').count() === 0);
    await msg.first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  }
  db.setStorageFailure(null);
  // Producción con la 028 haría aquí lo peor: borraría los archivos y luego no podría suprimir. Se aplican la 030 y la 031
  db.migrate(31);
  await now.click();
  const toast = await page.locator('.pn-toast').first().innerText({ timeout: 10000 }).catch(() => '');
  await page.locator('.cs-erased').waitFor({ timeout: 10000 }).catch(() => {});
  errors.push(`aviso: ${toast}`);
  ok('025 · con el almacén bien, se suprime: el aviso de datos suprimidos', await page.locator('.cs-erased').count() === 1, `${await page.locator('[role=status], [role=alert]').allInnerTexts().then(x => x.join(' | ')).catch(() => '')} ${errors.join(' · ')}`);
  ok('025 · …el archivo ya no está en el almacén (ni la fila ni los bytes)', q(`select count(*) from storage.objects where name like '${dId}/%'`) === '0' && !db.hasBytes(dFile));
  ok('025 · …y la denuncia queda anonimizada, sin adjuntos ni mensajes', q(`select anonymized_at is not null from complaints where id = '${dId}'`) === 't'
    && q(`select count(*) from attachments where complaint_id = '${dId}'`) === '0' && q(`select count(*) from messages where complaint_id = '${dId}'`) === '0'
    && q(`select status from suppressions where complaint_id = '${dId}'`) === 'done');
  ok('024 · el borrado del archivo queda en el registro', q(`select count(*) from audit_logs where complaint_id = '${dId}' and action = 'file_deleted'`) !== '0');
  await ctx.close();
}

// ── 7d · Alta de una empresa nueva con la 028 (B1: la empresa y el equipo solo con el segundo paso) ──
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${APP}/crear-compte?lang=es`, { waitUntil: 'networkidle' });
  await page.locator('#v2-su-company').fill('Talleres Riba');
  await page.locator('#v2-su-name').fill('Jordi Riba');
  await page.locator('#v2-su-email').fill('jordi@talleres-riba.es');
  await page.locator('#v2-su-pw').fill('una-contraseña-muy-larga');
  await page.locator('#v2-su-terms').check();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await page.waitForURL(/\/admin\/mfa/, { timeout: 15000 }).catch(() => {});
  const newId = q(`select id from auth.users where email = 'jordi@talleres-riba.es'`);
  ok('028 · alta: crea la empresa y su administrador', !!newId && q(`select o.name from organizations o join profiles p on p.organization_id = o.id where p.id = '${newId}'`) === 'Talleres Riba');
  await page.screenshot({ path: path.join(os.tmpdir(), 'base-real-alta-mfa.png') });
  ok('028 · alta: sin el segundo paso, el panel lleva a activarlo (y solo a eso)', /\/admin\/mfa/.test(page.url()) && await page.getByText('Activa la verificación en dos pasos para continuar').first().isVisible().catch(() => false), `${page.url()} ${(await page.locator('main').innerText().catch(() => '')).slice(0, 200).replace(/\n/g, ' ')}`);
  await page.goto(`${APP}/admin`, { waitUntil: 'networkidle' });
  ok('028 · alta: sin el segundo paso, el tablero no se abre', /\/admin\/mfa/.test(page.url()), page.url());
  await page.getByRole('button', { name: 'Activar la verificación' }).click();
  await page.locator('.sg-qr').waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.locator('.ds-otp-box').first().waitFor({ timeout: 10000 });
  await page.locator('.ds-otp-box').first().focus();
  await page.keyboard.type('654321', { delay: 80 });
  const verifyBtn = page.getByRole('button', { name: 'Verificar y activar' });
  if (await verifyBtn.count()) await verifyBtn.click().catch(() => {});
  await page.getByText('Verificación en dos pasos activada.').first().waitFor({ timeout: 10000 }).catch(() => {});
  await page.goto(`${APP}/admin`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.pn-lead, .pn-empty, .ds-kcol', { timeout: 10000 }).catch(() => {});
  const head = await page.locator('header').first().innerText().catch(() => '');
  ok('028 · con el segundo paso activado, el panel se carga: tablero y nombre de la empresa', /\/admin$/.test(page.url()) && /Talleres Riba/.test(head), `${page.url()} ${head.replace(/\n/g, ' ').slice(0, 120)}`);
  await page.goto(`${APP}/admin/ajustes`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.st-col', { timeout: 10000 }).catch(() => {});
  const settings = await page.locator('main').innerText().catch(() => '');
  ok('028 · …Equipo y ajustes, con la empresa y el equipo', /Talleres Riba/.test(settings) && /Jordi Riba/.test(settings) && /Responsable del Sistema/.test(settings), settings.slice(0, 160).replace(/\n/g, ' '));
  await page.goto(`${APP}/admin/integration`, { waitUntil: 'networkidle' });
  const share = await page.locator('main').innerText().catch(() => '');
  const newSlug = q(`select o.slug from organizations o join profiles p on p.organization_id = o.id where p.id = '${newId}'`);
  ok('028 · …y «Compartir el canal» con su dirección', share.includes(`/canal/${newSlug}`), newSlug);
  ok('028 · alta: sin errores en la consola', errors.length === 0, errors.join(' · '));
  await ctx.close();
}
{
  // Alguien que ya tiene cuenta pero aún no ha activado el segundo paso
  const pendId = q(`insert into auth.users (email, raw_user_meta_data) values ('marta@fusteria.es', '{"company_name":"Fustería Soler","full_name":"Marta Soler","lang":"es"}') returning id`).split('\n')[0];
  db.withoutMfa(pendId);
  const pendOrg = q(`select organization_id from profiles where id = '${pendId}'`);
  q(`insert into complaints (tracking_hash, organization_id, category, description, status, priority, channel) values (public.tracking_key('${sha('FUST-0001-0000-0000')}'), '${pendOrg}', 'fraud', 'Denuncia de la otra empresa que no se debe ver sin el segundo paso.', 'received', 'normal', 'web')`);
  const { page, ctx, errors } = await newPage();
  await page.goto(`${APP}/admin/login?lang=es`, { waitUntil: 'networkidle' });
  await page.getByLabel('Correo').fill('marta@fusteria.es');
  await page.locator('#ac-pw').fill('una-contraseña-larga');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/admin\/mfa/, { timeout: 15000 }).catch(() => {});
  await page.getByRole('button', { name: 'Activar la verificación' }).waitFor({ timeout: 10000 }).catch(() => {});
  ok('028 · sin el segundo paso activado: entra con la contraseña y va a activarlo, sin pedir código', /\/admin\/mfa/.test(page.url()) && await page.locator('.ds-otp').count() === 0
    && await page.getByRole('button', { name: 'Activar la verificación' }).isVisible().catch(() => false), `${page.url()} otp=${await page.locator('.ds-otp').count()} ${(await page.locator('main').innerText().catch(() => '')).slice(0, 200).replace(/\n/g, ' ')}`);
  ok('028 · …y no ve ninguna denuncia', await page.locator('.ds-case').count() === 0 && !/no se debe ver/.test(await page.locator('body').innerText()));
  ok('028 · …sin errores en la consola', errors.length === 0, errors.join(' · '));
  await ctx.close();
  // Lo mismo, preguntando a la base de datos con su sesión de solo contraseña (aal1)
  const t0 = Math.floor(Date.now() / 1000);
  const aal1 = jwt({ sub: pendId, role: 'authenticated', aud: 'authenticated', aal: 'aal1', amr: [{ method: 'password', timestamp: t0 }], iat: t0, exp: t0 + 600 });
  const rest = async (t) => (await fetch(`${db.url}/rest/v1/${t}`, { headers: { apikey: ANON_KEY, authorization: `Bearer ${aal1}` } })).json();
  const [orgs, team, cases, mine] = [await rest('organizations?select=name'), await rest(`profiles?select=full_name&id=neq.${pendId}`), await rest('complaints?select=id'), await rest(`profiles?select=full_name&id=eq.${pendId}`)];
  ok('028 · B1 · con solo la contraseña no se leen la empresa, el equipo ni las denuncias (y sí el propio perfil)',
    Array.isArray(orgs) && !orgs.length && Array.isArray(team) && !team.length && Array.isArray(cases) && !cases.length && mine?.[0]?.full_name === 'Marta Soler',
    JSON.stringify({ orgs, team, cases, mine }).slice(0, 200));
}

{
  const h = await report('Una denuncia después de la 031 para pedir una reunión en persona.');
  const r = await lookup(h.code, 'Prefiero contarlo en persona.', { meeting: true });
  ok('031 · «Mi caso»: escribir y pedir una reunión vuelven a funcionar', r.opened && r.meetingAsked && r.errors.length === 0, `abre=${r.opened} reunión=${r.meetingAsked} ${r.errors.join(' · ')}`);
  const hId = caseOf(h.code);
  ok('031 · …y la reunión pedida llega a la base de datos', q(`select meeting_requested from complaints where id = '${hId}'`) === 't');
  const reg = q(`select count(*) from complaints where channel = 'web' and id in (select complaint_id from audit_logs where action = 'registered')`);
  ok('031 · ningún caso registrado a mano queda como «web»', reg === '0');
}

// ── 8 · La 030 (ya aplicada con la 031): enviar exige siempre la prueba de trabajo ──
ok('030 · el camino de 16 queda cerrado y el de 18 abierto',
  q(`select has_function_privilege('anon', 'public.submit_complaint(uuid,uuid,text,text,text,boolean,text,text,text,text,date,text,text,boolean,text,uuid[])', 'execute')`) === 'f'
  && q(`select has_function_privilege('anon', 'public.submit_complaint(uuid,uuid,text,text,text,boolean,text,text,text,text,date,text,text,boolean,text,uuid[],text,text)', 'execute')`) === 't');
const e = await report('Una denuncia enviada después de la 030, con un adjunto.', { files: [PDF] });
ok('030 · la web sigue enviando (con adjunto) y abriendo el caso', !!e.code && !e.uploadError && e.errors.length === 0 && (await lookup(e.code, 'Un mensaje después de la 030.')).opened, `${e.code} ${e.uploadError ?? e.submitError} ${e.errors.join(' · ')}`);
ok('030 · …y el adjunto está en el almacén', !!e.code && q(`select count(*) from attachments where complaint_id = '${caseOf(e.code)}'`) === '1');
const casesBefore = q(`select count(*) from complaints`);
const f = await report('Una denuncia desde un navegador que no puede hacer la prueba de trabajo.', { blockWorker: 'all' });
ok('030 · si el navegador no puede hacer la prueba, no se envía y lo dice con claridad', !f.code && /comprobación de seguridad/.test(f.submitError ?? '') && q(`select count(*) from complaints`) === casesBefore, f.submitError);
const g = await report('Con el Worker bloqueado, la prueba se hace en el hilo principal.', { blockWorker: 'worker' });
ok('030 · con el Worker bloqueado, se resuelve en el hilo principal y se envía', !!g.code, g.submitError);
fs.rmSync(FILES, { recursive: true, force: true });

await shutdown();
console.log(problems.length ? `PROBLEMAS: ${problems.join(' · ')}` : 'Base de datos real: la web funciona hasta la 015, con la 016-017, la 018, la 019, toda la ronda 2 (020-029) y la 030-031 sobre los mismos datos');
process.exit(problems.length ? 1 : 0);
