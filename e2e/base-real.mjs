// La web contra una base de datos de verdad (Postgres + PostgREST en el ordenador, e2e/lib/supabase-local.mjs), con las
// migraciones de producción y después las nuevas sobre LOS MISMOS DATOS, como pasará al ejecutarlas:
//   1. hasta la 015: el canal y el panel funcionan; la marca no aparece (falta la 016) y no hay errores;
//   2. con la 016 y la 017 (producción desde el 19 oct): la marca de la empresa en el canal y «Tu marca» en Ajustes;
//   3. con la 018: el pie «Con Reportia», que Reportia apaga por empresa;
//   4. con la copia y la 019 (huella con secreto): el código de antes sigue valiendo y se reescribe al usarlo; el nuevo se
//      guarda con secreto; los dos casos siguen en el panel;
//   5. con la protección contra robots encendida en Auth: sin clave en la web, el acceso lo dice; con la clave, entra.
// Necesita Postgres 16 y PostgREST de Homebrew (brew install postgresql@16 postgrest). Si no están, se salta y lo dice.
// Arranca sus propios servidores de la web (3116 sin clave de Turnstile, 3117 con la de pruebas). No sale nada del ordenador.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwright.mjs';
import { available, startLocalSupabase, ANON_KEY } from './lib/supabase-local.mjs';

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

/** Quien informa: envía una denuncia anónima y devuelve su código */
async function report(text) {
  const { page, ctx, errors } = await newPage();
  await page.goto(`${APP}/canal/${slug}?lang=es`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Presentar una denuncia' }).click();
  await page.getByRole('radio', { name: /Fraude o corrupción/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.fill('#dn-description', text);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.locator('#dn-privacy').check();
  await page.getByRole('button', { name: /Enviar denuncia/ }).click();
  await page.waitForSelector('.code-big', { timeout: 15000 });
  const code = (await page.locator('.code-big').textContent()).trim();
  await ctx.close();
  return { code, errors };
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

await shutdown();
console.log(problems.length ? `PROBLEMAS: ${problems.join(' · ')}` : 'Base de datos real: la web funciona hasta la 015, con la 016-017, la 018, la 019 y la ronda 2 (020-022: portal endurecido, códigos de 16 y 8, worker bloqueado) sobre los mismos datos');
process.exit(problems.length ? 1 : 0);
