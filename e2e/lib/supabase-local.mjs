// Un «Supabase» de verdad en el ordenador, para probar la web contra una base de datos real con las migraciones que
// se quieran (por ejemplo, hasta la 015, como producción hoy, y después las nuevas sobre los mismos datos):
//   · Postgres 16 y PostgREST 12+ (Homebrew: brew install postgresql@16 postgrest), en una carpeta temporal;
//   · el esqueleto de Supabase que necesitan las migraciones (roles, auth.users, auth.uid(), storage);
//   · una pasarela en Node que hace de Supabase: /rest/v1 va a PostgREST y /auth/v1 es un acceso de pega que firma
//     los tokens con el mismo secreto (contraseña cualquiera, código de 6 cifras cualquiera), con el captcha opcional;
//     el alta da sesión al momento (como producción, sin confirmar el correo) y quien se da de alta no tiene segundo
//     paso hasta que lo activa (enroll → challenge → verify);
//   · /storage/v1 es un almacén de verdad en lo que importa: cada subida, lista, enlace firmado y borrado se hace en
//     storage.objects con el rol y el token de quien llama, así que las políticas de las migraciones mandan. Los bytes
//     se guardan en memoria. setStorageFailure('error' | 'silent') simula que el borrado falla o que no borra nada.
// No sale nada del ordenador y no toca ningún Supabase real.
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIG = path.join(ROOT, 'supabase', 'migrations');
const PG_BIN = process.env.PG_BIN || '/opt/homebrew/opt/postgresql@16/bin';
const POSTGREST = process.env.POSTGREST_BIN || '/opt/homebrew/bin/postgrest';
export const JWT_SECRET = 'secreto-de-pruebas-locales-de-reportia-0123456789';

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
export function jwt(payload) {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64(payload);
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}
const readJwt = (t) => { try { return JSON.parse(Buffer.from(String(t).split('.')[1], 'base64url').toString()); } catch { return null; } };
/** La clave pública de la web (anon), fija: así el servidor de la web se puede arrancar antes que la base de datos */
export const ANON_KEY = jwt({ role: 'anon', iss: 'supabase-local', iat: 1760000000, exp: 2100000000 });

/** ¿Está instalado lo que hace falta? */
export const available = () => fs.existsSync(path.join(PG_BIN, 'postgres')) && fs.existsSync(POSTGREST);

const SKELETON = `
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login noinherit; end if;
  end $$;
  grant anon, authenticated, service_role to authenticator;
  create schema if not exists auth; create schema if not exists storage; create schema if not exists extensions;
  create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb default '{}', last_sign_in_at timestamptz, created_at timestamptz default now());
  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid $$;
  create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create table if not exists storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false) on conflict do nothing;
  create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid,
    created_at timestamptz default now(), updated_at timestamptz default now(), last_accessed_at timestamptz default now(), metadata jsonb,
    unique (bucket_id, name));
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
  grant all on storage.objects to anon, authenticated, service_role;
  grant select on auth.users to service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  create policy "allow_upload_attachments" on storage.objects for insert with check (bucket_id = 'attachments');
`;

// En macOS, Postgres no arranca sin una variable de idioma válida
const ENV = { ...process.env, LC_ALL: 'en_US.UTF-8', LANG: 'en_US.UTF-8' };
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', env: ENV, ...opts });
  if (r.status !== 0) throw new Error(`${path.basename(cmd)} ${args.join(' ')}\n${r.stderr || r.stdout}`);
  return r.stdout;
}
const wait = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Arranca la base de datos con las migraciones hasta «hasta» y la pasarela en «port». Devuelve:
 *   { url, anonKey, sql(texto), migrate(hasta), file(ruta), reload(), setCaptcha(bool), stop() }
 */
export async function startLocalSupabase({ hasta = 15, port = 54321, pgPort = 54329, restPort = 54330 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reportia-pg-'));
  const data = path.join(dir, 'datos');
  run(path.join(PG_BIN, 'initdb'), ['-D', data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C']);
  // Por red local y sin «socket»: la ruta de la carpeta temporal de macOS es demasiado larga para un socket
  run(path.join(PG_BIN, 'pg_ctl'), ['-D', data, '-o', `-p ${pgPort} -c listen_addresses=127.0.0.1 -c unix_socket_directories=''`, '-l', path.join(dir, 'pg.log'), '-w', 'start']);
  const psql = (args, input) => run(path.join(PG_BIN, 'psql'), ['-h', '127.0.0.1', '-p', String(pgPort), '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', ...args], { input });
  const sql = (text) => psql(['-At', '-F', '\t', '-c', text]).trim();
  const lit = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
  /** Ejecuta una orden con el rol y el token de quien llama (como hace Storage); devuelve las filas «ROW» en JSON */
  const asCaller = (claims, stmt) => {
    const role = ['authenticated', 'service_role'].includes(claims?.role) ? claims.role : 'anon';
    const out = psql(['-At', '-F', '\t'], `begin;\nset local role ${role};\nselect set_config('request.jwt.claims', ${lit(JSON.stringify(claims ?? {}))}, true);\nselect set_config('request.jwt.claim.sub', ${lit(claims?.sub ?? '')}, true);\n${stmt};\ncommit;\n`);
    return out.split('\n').filter(l => l.startsWith('ROW\t')).map(l => JSON.parse(l.slice(4)));
  };
  const file = (f) => psql(['-f', f]);
  let applied = 0;
  const migrate = (to) => {
    for (const f of fs.readdirSync(MIG).filter(x => x.endsWith('.sql')).sort()) {
      const n = Number(f.slice(0, 3));
      if (n <= applied || n > to) continue;
      file(path.join(MIG, f));
      applied = n;
    }
    sql(`notify pgrst, 'reload schema'`);
  };
  psql(['-c', SKELETON]);
  migrate(hasta);

  // PostgREST
  const conf = path.join(dir, 'postgrest.conf');
  fs.writeFileSync(conf, [
    `db-uri = "postgres://authenticator@127.0.0.1:${pgPort}/postgres"`,
    'db-schemas = "public"', 'db-anon-role = "anon"', `jwt-secret = "${JWT_SECRET}"`,
    `server-port = ${restPort}`, 'server-host = "127.0.0.1"', 'db-channel-enabled = true', 'log-level = "crit"',
  ].join('\n'));
  const rest = spawn(POSTGREST, [conf], { stdio: 'ignore', env: ENV });
  for (let i = 0; ; i++) {
    try { const r = await fetch(`http://127.0.0.1:${restPort}/`); if (r.status < 500) break; } catch { /* aún no */ }
    if (i > 100) throw new Error('PostgREST no arranca');
    await wait(100);
  }

  // La pasarela que hace de Supabase
  let captcha = false;
  const seen = { captchaTokens: [] };
  // Segundo paso: quien entra con una cuenta creada a mano lo tiene ya activado; quien se da de alta por la web, no
  const VERIFIED = { id: 'f1', factor_type: 'totp', status: 'verified', friendly_name: 'app', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
  const factorsOf = new Map(); // id del usuario → factores (si no está, el de VERIFIED)
  const factors = (id) => factorsOf.get(id) ?? [VERIFIED];
  const userOf = (id) => {
    const row = sql(`select id, email from auth.users where id = '${id}'`);
    if (!row) return null;
    const [uid, email] = row.split('\t');
    return { id: uid, aud: 'authenticated', role: 'authenticated', email, app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z', factors: factors(uid) };
  };
  // El almacén: bytes en memoria; las filas, en storage.objects
  const bytes = new Map(); // nombre → { body: Buffer, type }
  const signed = new Map(); // token → nombre
  let storageFailure = null;
  const session = (user, aal) => {
    const now = Math.floor(Date.now() / 1000);
    const amr = aal === 'aal2' ? [{ method: 'totp', timestamp: now }, { method: 'password', timestamp: now }] : [{ method: 'password', timestamp: now }];
    const access_token = jwt({ sub: user.id, role: 'authenticated', aud: 'authenticated', email: user.email, aal, amr, session_id: 's1', iat: now, exp: now + 3600 });
    return { access_token, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: `r-${user.id}-${aal}`, user };
  };
  const send = (res, status, body, headers = {}) => {
    res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range, x-total-count', ...headers });
    res.end(body === undefined ? '' : JSON.stringify(body));
  };
  const readBody = (req) => new Promise(r => { let d = ''; req.on('data', c => { d += c; }); req.on('end', () => r(d)); });
  const captchaOk = (body) => {
    const token = body?.gotrue_meta_security?.captcha_token;
    if (token) seen.captchaTokens.push(token);
    return !captcha || !!token;
  };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' });
      return res.end();
    }
    try {
      if (url.pathname.startsWith('/rest/v1/')) {
        const raw = await readBody(req);
        const headers = { ...req.headers };
        delete headers.host;
        // Sin sesión, supabase-js manda la clave anon como token: vale tal cual (es un JWT firmado con el secreto)
        const r = await fetch(`http://127.0.0.1:${restPort}${url.pathname.slice(8)}${url.search}`, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : raw });
        const out = Buffer.from(await r.arrayBuffer());
        const h = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range, x-total-count' };
        for (const k of ['content-type', 'content-range', 'preference-applied']) if (r.headers.get(k)) h[k] = r.headers.get(k);
        res.writeHead(r.status, h);
        return res.end(out);
      }
      if (url.pathname.startsWith('/auth/v1/')) {
        const p = url.pathname.slice(8);
        const body = req.method === 'POST' || req.method === 'PUT' ? JSON.parse((await readBody(req)) || '{}') : {};
        const bearer = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
        const claims = readJwt(bearer);
        if (p === '/token' && url.searchParams.get('grant_type') === 'password') {
          if (!captchaOk(body)) return send(res, 400, { error_code: 'captcha_failed', msg: 'captcha protection: request disallowed (no captcha response)' });
          const id = sql(`select id from auth.users where lower(email) = lower('${String(body.email).replace(/'/g, "''")}')`);
          if (!id) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials', error_code: 'invalid_credentials' });
          sql(`update auth.users set last_sign_in_at = now() where id = '${id}'`);
          return send(res, 200, session(userOf(id), 'aal1'));
        }
        if (p === '/token' && url.searchParams.get('grant_type') === 'refresh_token') {
          const [, id, aal] = String(body.refresh_token ?? '').split(/^r-|-(?=aal)/);
          const u = id && userOf(id);
          return u ? send(res, 200, session(u, aal || 'aal1')) : send(res, 400, { error: 'invalid_grant' });
        }
        if (p === '/user' && req.method === 'GET') {
          const u = claims?.sub && userOf(claims.sub);
          return u ? send(res, 200, u) : send(res, 401, { msg: 'invalid token' });
        }
        if (p === '/user' && req.method === 'PUT') return send(res, 200, userOf(claims?.sub));
        if (p === '/factors' && req.method === 'POST') {
          if (!claims?.sub) return send(res, 401, { msg: 'invalid token' });
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          factorsOf.set(claims.sub, [...factors(claims.sub).filter(f => f.status === 'verified'), { id, factor_type: 'totp', status: 'unverified', friendly_name: body.friendly_name ?? '', created_at: now, updated_at: now }]);
          const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="180" height="180" fill="#fff"/><rect x="20" y="20" width="40" height="40"/></svg>';
          return send(res, 200, { id, type: 'totp', friendly_name: body.friendly_name ?? '', totp: { qr_code: svg, secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/Reportia:prueba?secret=JBSWY3DPEHPK3PXP' } });
        }
        if (/^\/factors\/[^/]+$/.test(p) && req.method === 'DELETE') {
          const id = p.split('/')[2];
          if (claims?.sub) factorsOf.set(claims.sub, factors(claims.sub).filter(f => f.id !== id));
          return send(res, 200, { id });
        }
        if (/^\/factors\/[^/]+\/challenge$/.test(p)) return send(res, 200, { id: 'c1', type: 'totp', expires_at: Math.floor(Date.now() / 1000) + 300 });
        if (/^\/factors\/[^/]+\/verify$/.test(p)) {
          const id = p.split('/')[2];
          if (!claims?.sub) return send(res, 401, { msg: 'invalid token' });
          if (!/^\d{6}$/.test(String(body.code ?? ''))) return send(res, 400, { error_code: 'mfa_verification_failed', msg: 'Invalid TOTP code entered' });
          const list = factors(claims.sub);
          if (!list.some(f => f.id === id)) return send(res, 404, { error_code: 'mfa_factor_not_found', msg: 'Factor not found' });
          factorsOf.set(claims.sub, list.map(f => (f.id === id ? { ...f, status: 'verified' } : f)));
          return send(res, 200, session(userOf(claims.sub), 'aal2'));
        }
        if (p === '/factors' && req.method === 'GET') return send(res, 200, userOf(claims?.sub)?.factors ?? []);
        if (p === '/logout') return send(res, 204);
        if (p === '/recover') {
          if (!captchaOk(body)) return send(res, 400, { error_code: 'captcha_failed', msg: 'captcha protection: request disallowed (no captcha response)' });
          return send(res, 200, {});
        }
        if (p === '/signup') {
          if (!captchaOk(body)) return send(res, 400, { error_code: 'captcha_failed', msg: 'captcha protection: request disallowed (no captcha response)' });
          const meta = JSON.stringify(body.data ?? {}).replace(/'/g, "''");
          const id = sql(`insert into auth.users (email, raw_user_meta_data) values ('${String(body.email).replace(/'/g, "''")}', '${meta}'::jsonb) returning id`).split('\n')[0];
          // Como producción (confirmar el correo, apagado): el alta da sesión al momento, sin segundo paso todavía
          factorsOf.set(id, []);
          seen.signups = [...(seen.signups ?? []), body.email];
          return send(res, 200, session(userOf(id), 'aal1'));
        }
        return send(res, 404, { msg: `acceso de pega: ${p} no está` });
      }
      if (url.pathname.startsWith('/storage/v1/')) {
        const p = decodeURIComponent(url.pathname.slice(11));
        const raw = Buffer.from(await new Promise(r => { const parts = []; req.on('data', c => parts.push(c)); req.on('end', () => r(Buffer.concat(parts))); }));
        const claims = readJwt((req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')) ?? { role: 'anon' };
        const denied = (e) => send(res, 400, { statusCode: '403', error: 'Unauthorized', message: /row-level security/.test(e.message) ? 'new row violates row-level security policy' : String(e.message).split('\n').slice(-2).join(' ').slice(0, 200) });
        let m;
        // Lista: los archivos y las carpetas que hay justo debajo de «prefix» (solo lo que la política deja ver)
        if ((m = p.match(/^\/object\/list\/([^/]+)$/)) && req.method === 'POST') {
          const b = JSON.parse(raw.toString() || '{}');
          const prefix = String(b.prefix ?? '').replace(/\/+$/, '');
          const rows = asCaller(claims, `select 'ROW', json_build_object('id', id, 'name', name, 'created_at', created_at, 'updated_at', updated_at, 'metadata', metadata)::text from storage.objects where bucket_id = ${lit(m[1])} and name like ${lit(prefix ? `${prefix}/%` : '%')}`);
          const out = new Map();
          for (const r of rows) {
            const rest = prefix ? r.name.slice(prefix.length + 1) : r.name;
            const [first, ...more] = rest.split('/');
            if (more.length) { if (!out.has(first)) out.set(first, { name: first, id: null, updated_at: null, created_at: null, last_accessed_at: null, metadata: null }); }
            else out.set(first, { ...r, name: first, last_accessed_at: r.updated_at });
          }
          const list = [...out.values()].sort((x, y) => x.name.localeCompare(y.name)).slice(b.offset ?? 0, (b.offset ?? 0) + (b.limit ?? 100));
          return send(res, 200, list);
        }
        // Enlace firmado para descargar (solo si la política deja ver el archivo) y la descarga con ese enlace
        if ((m = p.match(/^\/object\/sign\/([^/]+)\/(.+)$/)) && req.method === 'POST') {
          const found = asCaller(claims, `select 'ROW', json_build_object('name', name)::text from storage.objects where bucket_id = ${lit(m[1])} and name = ${lit(m[2])}`);
          if (!found.length) return send(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
          const token = crypto.randomUUID();
          signed.set(token, m[2]);
          return send(res, 200, { signedURL: `/object/sign/${m[1]}/${m[2]}?token=${token}` });
        }
        if ((m = p.match(/^\/object\/sign\/([^/]+)\/(.+)$/)) && req.method === 'GET') {
          const name = signed.get(url.searchParams.get('token'));
          const file = name === m[2] && bytes.get(name);
          if (!file) return send(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
          res.writeHead(200, { 'content-type': file.type || 'application/octet-stream', 'access-control-allow-origin': '*' });
          return res.end(file.body);
        }
        // Borrado: con la política de quien llama; Storage devuelve solo lo que ha borrado (y no da error si es nada)
        if ((m = p.match(/^\/object\/([^/]+)$/)) && req.method === 'DELETE') {
          const names = JSON.parse(raw.toString() || '{}').prefixes ?? [];
          seen.storageDeletes = (seen.storageDeletes ?? 0) + 1;
          if (storageFailure === 'error') return send(res, 500, { statusCode: '500', error: 'internal', message: 'fallo simulado del almacén' });
          if (storageFailure === 'silent' || !names.length) return send(res, 200, []);
          let rows;
          try {
            rows = asCaller(claims, `with d as (delete from storage.objects where bucket_id = ${lit(m[1])} and name = any(array[${names.map(lit).join(',')}]::text[]) returning id, name, bucket_id) select 'ROW', row_to_json(d)::text from d`);
          } catch (e) { return denied(e); }
          for (const r of rows) bytes.delete(r.name);
          return send(res, 200, rows);
        }
        // Subida: la fila se crea con el rol de quien sube (manda la política de subida: M5, ventana de 2 h…)
        if ((m = p.match(/^\/object\/([^/]+)\/(.+)$/)) && req.method === 'POST') {
          let body = raw, type = req.headers['content-type'] ?? 'application/octet-stream';
          if (/^multipart\/form-data/.test(type)) {
            const form = await new Response(raw, { headers: { 'content-type': type } }).formData();
            const f = form.get('');
            body = Buffer.from(await f.arrayBuffer());
            type = f.type || 'application/octet-stream';
          }
          const limit = Number(sql(`select coalesce(file_size_limit, 0) from storage.buckets where id = ${lit(m[1])}`) || 0);
          if (limit && body.length > limit) return send(res, 400, { statusCode: '413', error: 'Payload too large', message: 'The object exceeded the maximum allowed size' });
          try {
            asCaller(claims, `insert into storage.objects (bucket_id, name, owner, metadata) values (${lit(m[1])}, ${lit(m[2])}, ${claims.sub ? lit(claims.sub) : 'null'}, ${lit(JSON.stringify({ size: body.length, mimetype: type }))}::jsonb); select 'ROW', '{}'`);
          } catch (e) { return denied(e); }
          bytes.set(m[2], { body, type });
          return send(res, 200, { Key: `${m[1]}/${m[2]}`, Id: crypto.randomUUID() });
        }
        return send(res, 404, { msg: `almacén de pega: ${req.method} ${p} no está` });
      }
      return send(res, 404, { msg: 'no está' });
    } catch (e) {
      return send(res, 500, { msg: String(e.message).slice(0, 300) });
    }
  });
  await new Promise(r => server.listen(port, '127.0.0.1', r));

  return {
    url: `http://localhost:${port}`,
    anonKey: ANON_KEY,
    sql,
    migrate: (to) => migrate(to),
    file: (f) => file(f),
    setCaptcha: (on) => { captcha = on; },
    /** null = normal · 'error' = el borrado del almacén falla · 'silent' = responde bien pero no borra nada */
    setStorageFailure: (mode) => { storageFailure = mode; },
    /** ¿Siguen los bytes de este archivo en el almacén? */
    hasBytes: (name) => bytes.has(name),
    /** Una cuenta sin el segundo paso activado (aún no lo ha configurado) */
    withoutMfa: (id) => { factorsOf.set(id, []); },
    seen,
    applied: () => applied,
    async stop() {
      server.close();
      rest.kill();
      try { run(path.join(PG_BIN, 'pg_ctl'), ['-D', data, '-m', 'immediate', 'stop']); } catch { /* ya parado */ }
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
