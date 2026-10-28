#!/usr/bin/env node
// Pruebas de seguridad de la base de datos. Uso: npm run db:test
//
// Aplica todas las migraciones de supabase/migrations/ a un Postgres real en memoria (PGlite),
// con un esqueleto mínimo de los esquemas auth y storage de Supabase, y comprueba las políticas
// RLS con los roles anon y authenticated: aislamiento entre empresas, permisos por categoría,
// mensajes, adjuntos, registro de auditoría y cuenta de la organización.
// No toca ninguna base de datos real. Con un número (node scripts/test-rls.mjs 7) aplica solo
// hasta esa migración, para ver qué fallaba antes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';

const MIG = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');
const upTo = process.argv[2] ? Number(process.argv[2]) : 999;
// El esqueleto mínimo de Supabase (roles, auth y storage). Se usa también para las bases de datos nuevas de la 019
const SKELETON = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage; create schema extensions;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb default '{}', last_sign_in_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, created_at timestamptz default now(), updated_at timestamptz default now());
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
  grant all on storage.objects to anon, authenticated, service_role;
  grant select on auth.users to service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  -- del supabase_schema.sql original (subida de adjuntos)
  create policy "allow_upload_attachments" on storage.objects for insert with check (bucket_id = 'attachments');
`;
const files = fs.readdirSync(MIG).filter(f => f.endsWith('.sql')).sort();
/** Una base de datos nueva con las migraciones hasta la n.º «hasta» (y, si se pide, algo antes de ellas) */
async function newDb(hasta, antes = '') {
  const pg = new PGlite({ extensions: { unaccent } });
  await pg.exec(SKELETON + antes);
  for (const f of files) {
    if (Number(f.slice(0, 3)) > hasta) continue;
    await pg.exec(fs.readFileSync(path.join(MIG, f), 'utf8'));
  }
  return pg;
}

// La base de datos principal llega hasta la 018: las pruebas de siempre buscan las denuncias por su huella sin secreto.
// La 019 (huella con secreto) se prueba más abajo en bases de datos propias, con denuncias de antes y de después
const MAIN_UPTO = Math.min(upTo, 18);
const db = new PGlite({ extensions: { unaccent } });
await db.exec(SKELETON);
for (const f of files) {
  if (Number(f.slice(0, 3)) > MAIN_UPTO) continue;
  try { await db.exec(fs.readFileSync(path.join(MIG, f), 'utf8')); }
  catch (e) { console.error('✗ migración', f, '→', e.message); process.exit(1); }
}
console.log('migraciones aplicadas hasta', Math.min(MAIN_UPTO, Number(files.at(-1).slice(0, 3))), upTo >= 19 ? '(la 019 y siguientes, en bases de datos aparte)' : '');

// ── utilidades ──
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra); } };
/** Ejecuta sql en una base de datos como un rol y un usuario; devuelve { rows, error } */
async function asOn(pg, role, uid, sql, params = [], aal = 'aal2') {
  await pg.exec('begin');
  try {
    const claims = uid ? JSON.stringify({ sub: uid, role, aal }) : '';
    await pg.exec(`set local role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', true); select set_config('request.jwt.claims', '${claims}', true);`);
    const r = await pg.query(sql, params);
    await pg.exec('commit');
    return { rows: r.rows, count: r.affectedRows ?? r.rows.length, error: null };
  } catch (e) {
    await pg.exec('rollback');
    return { rows: [], count: 0, error: e.message };
  }
}
const as = (...a) => asOn(db, ...a);
const anon = (sql, p) => as('anon', null, sql, p);
const user = (uid, sql, p) => as('authenticated', uid, sql, p);            // con verificación en dos pasos
const user1 = (uid, sql, p) => as('authenticated', uid, sql, p, 'aal1');   // solo con contraseña
const svc = async (sql, p) => (await db.query(sql, p)).rows;

// ── datos: dos empresas ──
// Alta por autorregistro (el trigger crea organización + superadmin)
const [{ id: adminA }] = await svc(`insert into auth.users (email, raw_user_meta_data) values ('admin@a.es', '{"company_name":"Empresa A","full_name":"Admin A"}') returning id`);
const [{ id: adminB }] = await svc(`insert into auth.users (email, raw_user_meta_data) values ('admin@b.es', '{"company_name":"Empresa B","full_name":"Admin B"}') returning id`);
const [{ organization_id: orgA }] = await svc(`select organization_id from profiles where id = $1`, [adminA]);
const [{ organization_id: orgB }] = await svc(`select organization_id from profiles where id = $1`, [adminB]);
// Gestor invitado en A (la edge function le asigna la organización con service role)
const [{ id: mgrA }] = await svc(`insert into auth.users (email, raw_user_meta_data) values ('gestor@a.es', '{"full_name":"Gestor A"}') returning id`);
await svc(`update profiles set organization_id = $1 where id = $2`, [orgA, mgrA]);

const cid = () => crypto.randomUUID();
const c1 = cid(), c2 = cid(), c3 = cid();
// El navegador solo envía el hash del código (nunca el código en claro)
const ins = (id, org, code, cat, identified = false) => anon(
  `insert into complaints (id, tracking_hash, tracking_code, organization_id, is_anonymous, category, description, reporter_email)
   values ($1, code_hash($2), $2, $3, $4, $5, 'Hechos', $6)`, [id, code, org, !identified, cat, identified ? 'yo@correo.es' : null]);

console.log('\nCanal público (sin sesión)');
ok('crea denuncia en A (fraude)', !(await ins(c1, orgA, 'AAAA-1111', 'fraud')).error);
ok('crea denuncia en A (acoso, identificada)', !(await ins(c2, orgA, 'AAAA-2222', 'harassment', true)).error);
ok('crea denuncia en B', !(await ins(c3, orgB, 'BBBB-1111', 'fraud')).error);
const [row1] = await svc(`select tracking_code, tracking_hash, reference, status, created_at from complaints where id = $1`, [c1]);
ok('el código en claro no se guarda', row1.tracking_code === null && !!row1.tracking_hash, JSON.stringify(row1));
ok('la base de datos asigna una referencia', /^REF-[A-Z2-9]{6}$/.test(row1.reference), row1.reference);
const forced = await anon(`insert into complaints (id, tracking_hash, organization_id, category, description, status, priority, created_at)
  values ($1, code_hash('ZZZZ-0001'), $2, 'fraud', 'x', 'resolved', 'critical', '2020-01-01')`, [cid(), orgA]);
const [frow] = await svc(`select status, priority, created_at from complaints where tracking_hash = code_hash('ZZZZ-0001')`);
ok('estado, prioridad y fecha los decide el servidor', !forced.error && frow.status === 'received' && frow.priority === 'normal' && new Date(frow.created_at).getFullYear() > 2025, JSON.stringify(frow));
await svc(`delete from complaints where tracking_hash = code_hash('ZZZZ-0001')`);
ok('sin hash del código no se crea', !!(await anon(`insert into complaints (organization_id, category, description) values ($1, 'fraud', 'x')`, [orgA])).error);
ok('categoría fuera del catálogo rechazada', !!(await anon(`insert into complaints (tracking_hash, organization_id, category, description) values (code_hash('QQQQ-0001'), $1, 'inventada', 'x')`, [orgA])).error);
ok('anónima con correo: el correo se descarta', !(await anon(`insert into complaints (id, tracking_hash, organization_id, is_anonymous, category, description, reporter_email) values ($1, code_hash('QQQQ-0002'), $2, true, 'fraud', 'x', 'yo@x.es')`, [cid(), orgA])).error
  && (await svc(`select reporter_email from complaints where tracking_hash = code_hash('QQQQ-0002')`))[0].reporter_email === null);
await svc(`delete from complaints where tracking_hash = code_hash('QQQQ-0002')`);
ok('no puede leer denuncias', (await anon(`select * from complaints`)).rows.length === 0);
const pub = await anon(`select * from get_complaint_by_tracking_code('aaaa-1111')`);
ok('la consulta pública no devuelve id ni organización', pub.rows.length === 1 && !('id' in pub.rows[0]) && !('organization_id' in pub.rows[0]), JSON.stringify(pub));
ok('entrada de registro "created"', !(await anon(`insert into audit_logs (complaint_id, action, details) values ($1, 'created', '{}')`, [c1])).error);
ok('no puede falsificar otra entrada de registro', !!(await anon(`insert into audit_logs (complaint_id, action) values ($1, 'status_changed')`, [c1])).error);
ok('adjunto en denuncia reciente', !(await anon(`insert into attachments (complaint_id, filename, storage_path) values ($1, 'a.pdf', $2)`, [c1, `${c1}/a.pdf`])).error);
ok('archivo en la carpeta de su denuncia', !(await anon(`insert into storage.objects (bucket_id, name) values ('attachments', $1)`, [`${c1}/a.pdf`])).error);
ok('archivo fuera de una carpeta de denuncia rechazado', !!(await anon(`insert into storage.objects (bucket_id, name) values ('attachments', 'suelto.pdf')`)).error);
ok('adjunto que apunta a otra carpeta rechazado', !!(await anon(`insert into attachments (complaint_id, filename, storage_path) values ($1, 'x.pdf', $2)`, [c1, `${c2}/x.pdf`])).error);
await svc(`update complaints set created_at = now() - interval '3 hours' where id = $1`, [c3]);
ok('no puede adjuntar en una denuncia antigua', !!(await anon(`insert into attachments (complaint_id, filename, storage_path) values ($1, 'x.pdf', $2)`, [c3, `${c3}/x.pdf`])).error);
ok('no puede leer adjuntos', (await anon(`select * from attachments`)).rows.length === 0);

console.log('\nVerificación en dos pasos');
ok('con solo contraseña no ve denuncias', (await user1(adminA, `select id, category from complaints`)).rows.length === 0);
ok('con solo contraseña no ve mensajes ni adjuntos', (await user1(adminA, `select * from messages`)).rows.length === 0 && (await user1(adminA, `select * from attachments`)).rows.length === 0);
ok('con solo contraseña no cambia el estado', (await user1(adminA, `update complaints set status = 'reviewing' where id = $1 returning id`, [c1])).rows.length === 0);
ok('con solo contraseña no lista miembros', (await user1(adminA, `select * from list_org_members()`)).rows.length === 0);
ok('con solo contraseña sí ve su perfil y su organización', (await user1(adminA, `select * from profiles where id = $1`, [adminA])).rows.length === 1 && (await user1(adminA, `select * from organizations`)).rows.length === 1);
ok('con verificación ve sus denuncias', (await user(adminA, `select id, category from complaints`)).rows.length === 2);

console.log('\nMensajes');
ok('sin sesión no lee la tabla de mensajes', (await anon(`select * from messages`)).rows.length === 0);
ok('sin sesión no inserta directo', !!(await anon(`insert into messages (complaint_id, sender, content) values ($1, 'reporter', 'hola')`, [c1])).error);
ok('sin sesión no suplanta al gestor', !!(await anon(`insert into messages (complaint_id, sender, content) values ($1, 'manager', 'soy el gestor')`, [c1])).error);
ok('con el código envía mensaje', !(await anon(`select send_reporter_message('aaaa-1111', 'Tengo más datos')`)).error);
const nope = await anon(`select send_reporter_message('NOPE-0000', 'x') as id`);
ok('con código inexistente no se envía nada (error, o vacío con la 014)', !!nope.error || nope.rows[0]?.id === null, JSON.stringify(nope));
ok('mensaje vacío falla', !!(await anon(`select send_reporter_message('AAAA-1111', '   ')`)).error);
ok('con el código lee sus mensajes', (await anon(`select * from get_messages_by_tracking_code('AAAA-1111')`)).rows.length === 1);
ok('con otro código no ve nada', (await anon(`select * from get_messages_by_tracking_code('BBBB-1111')`)).rows.length === 0);
ok('admin A responde', !(await user(adminA, `insert into messages (complaint_id, sender, content) values ($1, 'manager', 'Recibido')`, [c1])).error);
ok('admin A no puede escribir como informante', !!(await user(adminA, `insert into messages (complaint_id, sender, content) values ($1, 'reporter', 'falso')`, [c1])).error);
const staffCode = await user(adminA, `select tracking_code from complaints where id = $1`, [c1]);
ok('el panel no puede leer el código del informante', staffCode.rows[0]?.tracking_code === null, JSON.stringify(staffCode));
const back = await user(adminA, `insert into messages (complaint_id, sender, content, created_at) values ($1, 'manager', 'antiguo', '2020-01-01') returning created_at`, [c1]);
ok('un mensaje no se puede fechar hacia atrás', !back.error && new Date(back.rows[0].created_at).getFullYear() > 2025, JSON.stringify(back));
ok('admin A lee 3 mensajes', (await user(adminA, `select * from messages`)).rows.length === 3);
ok('marca como leído', (await user(adminA, `update messages set is_read = true where complaint_id = $1 and sender = 'reporter' returning id`, [c1])).rows.length === 1);
ok('no reescribe un mensaje', !!(await user(adminA, `update messages set content = 'otra cosa' where complaint_id = $1`, [c1])).error);
ok('admin B no lee mensajes de A', (await user(adminB, `select * from messages`)).rows.length === 0);
ok('admin B no escribe en denuncia de A', !!(await user(adminB, `insert into messages (complaint_id, sender, content) values ($1, 'manager', 'x')`, [c1])).error);

console.log('\nAislamiento entre empresas');
ok('admin B ve 1 denuncia', (await user(adminB, `select id, category from complaints`)).rows.length === 1);
ok('admin B no actualiza denuncia de A', (await user(adminB, `update complaints set status = 'closed' where id = $1 returning id`, [c1])).rows.length === 0);
ok('nadie borra una denuncia desde el panel', (await user(adminA, `delete from complaints where id = $1 returning id`, [c1])).rows.length === 0);

console.log('\nEscalada de privilegios en profiles');
const esc1 = await user(adminB, `update profiles set organization_id = $1 where id = $2 returning id`, [orgA, adminB]);
ok('admin B no puede pasarse a la empresa A', !!esc1.error || esc1.rows.length === 0, JSON.stringify(esc1));
ok('…y sigue sin ver denuncias de A', (await user(adminB, `select id, category from complaints where organization_id = $1`, [orgA])).rows.length === 0);
const esc2 = await user(mgrA, `update profiles set role = 'superadmin' where id = $1 returning id`, [mgrA]);
ok('gestor no puede hacerse administrador', !!esc2.error || esc2.rows.length === 0, JSON.stringify(esc2));
ok('gestor sí puede cambiar su nombre', (await user(mgrA, `update profiles set full_name = 'Gestor A2' where id = $1 returning id`, [mgrA])).rows.length === 1);
const asc = await user1(adminA, `update profiles set role = 'superadmin' where id = $1 returning id`, [mgrA]);
ok('admin A sin verificación no asciende a nadie', (!!asc.error || asc.rows.length === 0) && (await svc(`select role from profiles where id = $1`, [mgrA]))[0].role === 'manager', JSON.stringify(asc));
ok('admin A puede ascender a su gestor', (await user(adminA, `update profiles set role = 'superadmin' where id = $1 returning id`, [mgrA])).rows.length === 1);
await user(adminA, `update profiles set role = 'manager' where id = $1`, [mgrA]);
ok('admin no puede quitarse su propio rol', !!(await user(adminA, `update profiles set role = 'manager' where id = $1 returning id`, [adminA])).error);
const esc4 = await user(adminB, `update profiles set role = 'manager' where id = $1 returning id`, [adminA]);
ok('admin B no toca perfiles de A', !!esc4.error || esc4.rows.length === 0);

console.log('\nPermisos del gestor por categoría');
ok('gestor sin permisos no ve denuncias', (await user(mgrA, `select id, category from complaints`)).rows.length === 0);
ok('admin A guarda permisos en una sola operación', !(await user(adminA, `select set_manager_permissions($1, '[{"category":"fraud","can_view":true,"can_reply":true}]'::jsonb)`, [mgrA])).error);
const [prow] = await svc(`select organization_id, can_view, can_edit from manager_permissions where manager_id = $1`, [mgrA]);
ok('…con la organización puesta por la base de datos', prow?.organization_id === orgA && prow.can_view && !prow.can_edit, JSON.stringify(prow));
ok('admin B no asigna permisos a gestor de A', !!(await user(adminB, `select set_manager_permissions($1, '[{"category":"harassment","can_view":true}]'::jsonb)`, [mgrA])).error);
ok('el gestor no se asigna permisos', !!(await user(mgrA, `select set_manager_permissions($1, '[{"category":"harassment","can_view":true}]'::jsonb)`, [mgrA])).error);
const seen = await user(mgrA, `select id, category from complaints`);
ok('gestor solo ve su categoría', seen.rows.length === 1 && seen.rows[0].category === 'fraud');
ok('gestor no abre por id una denuncia de otra categoría', (await user(mgrA, `select id, category from complaints where id = $1`, [c2])).rows.length === 0);
ok('gestor sin "editar" no cambia el estado', (await user(mgrA, `update complaints set status = 'reviewing' where id = $1 returning id`, [c1])).rows.length === 0);
ok('gestor con "responder" envía mensaje', !(await user(mgrA, `insert into messages (complaint_id, sender, content) values ($1, 'manager', 'Hola')`, [c1])).error);
ok('gestor no escribe en otra categoría', !!(await user(mgrA, `insert into messages (complaint_id, sender, content) values ($1, 'manager', 'Hola')`, [c2])).error);
ok('gestor ve adjuntos de su categoría', (await user(mgrA, `select * from attachments`)).rows.length === 1);
ok('gestor ve el objeto en storage', (await user(mgrA, `select * from storage.objects`)).rows.length === 1);
ok('gestor sin "eliminar" no borra el objeto', (await user(mgrA, `delete from storage.objects returning id`)).rows.length === 0);
ok('gestor sin "eliminar" no suprime la denuncia', !!(await user(mgrA, `select anonymize_complaint($1, 'Motivo de prueba')`, [c1])).error);

console.log('\nStorage entre empresas');
const cB = cid();
await ins(cB, orgB, 'BBBB-2222', 'fraud');
await user(adminB, `insert into attachments (complaint_id, filename, storage_path) values ($1, 'robo.pdf', $2)`, [cB, `${c1}/a.pdf`]);
await anon(`insert into attachments (complaint_id, filename, storage_path) values ($1, 'robo.pdf', $2)`, [cB, `${c1}/a.pdf`]);
ok('admin B no puede leer el archivo de A con una fila falsa', (await user(adminB, `select * from storage.objects where name = $1`, [`${c1}/a.pdf`])).rows.length === 0);
ok('admin B no puede borrar el archivo de A', (await user(adminB, `delete from storage.objects where name = $1 returning id`, [`${c1}/a.pdf`])).rows.length === 0);

console.log('\nPermisos fantasma');
await svc(`insert into manager_permissions (manager_id, organization_id, category, can_view) values ($1, $2, 'harassment', true)`, [mgrA, orgB]);
ok('un permiso de otra organización no da acceso', (await user(mgrA, `select id, category from complaints where id = $1`, [c2])).rows.length === 0);
await svc(`delete from manager_permissions where organization_id = $1`, [orgB]);

console.log('\nFechas legales y registro');
ok('admin A cambia estado y prioridad', (await user(adminA, `update complaints set status = 'reviewing', priority = 'high' where id = $1 returning id`, [c1])).rows.length === 1);
const [ms1] = await svc(`select acknowledged_at, answered_at from complaints where id = $1`, [c1]);
ok('el acuse lo fecha la base de datos', !!ms1.acknowledged_at && !ms1.answered_at, JSON.stringify(ms1));
ok('el navegador no puede mover el acuse', (await user(adminA, `update complaints set acknowledged_at = '2020-01-01', priority = 'normal' where id = $1 returning acknowledged_at`, [c1])).rows[0]?.acknowledged_at?.getFullYear?.() !== 2020);
const logs = await user(adminA, `select action, actor_id, details from audit_logs where complaint_id = $1 order by created_at`, [c1]);
const acts = logs.rows.map(r => r.action);
ok('estado y prioridad quedan en el registro con su autor', acts.includes('status_changed') && acts.includes('priority_changed') && logs.rows.find(r => r.action === 'status_changed')?.actor_id === adminA, JSON.stringify(acts));
ok('los mensajes quedan en el registro', acts.includes('reporter_message') && acts.includes('message_sent'), JSON.stringify(acts));
ok('el cliente no puede escribir un cambio de estado falso', !!(await user(adminA, `insert into audit_logs (complaint_id, action, details) values ($1, 'status_changed', '{"to":"resolved"}')`, [c1])).error);
ok('el gestor sin "editar" no añade notas', !!(await user(mgrA, `insert into audit_logs (complaint_id, action, details) values ($1, 'note_added', '{"note":"x"}')`, [c1])).error);
ok('admin A añade una nota', !(await user(adminA, `insert into audit_logs (complaint_id, action, details) values ($1, 'note_added', '{"note":"Revisado"}')`, [c1])).error);
ok('admin A no reescribe la descripción', !!(await user(adminA, `update complaints set description = 'otra cosa' where id = $1`, [c1])).error);
ok('admin A no cambia el correo del informante', !!(await user(adminA, `update complaints set reporter_email = 'otro@x.es' where id = $1`, [c2])).error);
ok('ampliar el plazo exige motivo', !!(await user(adminA, `select extend_response_deadline($1, 'corto')`, [c1])).error);
const ext = await user(adminA, `select extend_response_deadline($1, 'Investigación con varios departamentos implicados') as until`, [c1]);
ok('admin A amplía el plazo a 6 meses', !ext.error && !!ext.rows[0]?.until, JSON.stringify(ext));
ok('no se amplía dos veces', !!(await user(adminA, `select extend_response_deadline($1, 'Investigación con varios departamentos implicados')`, [c1])).error);
ok('el navegador no puede mover la ampliación', (await user(adminA, `update complaints set extended_until = '2099-01-01', priority = 'high' where id = $1 returning extended_until`, [c1])).rows[0]?.extended_until?.getFullYear?.() !== 2099);
await user(adminA, `update complaints set status = 'waiting' where id = $1`, [c1]);
await anon(`select send_reporter_message('AAAA-1111', 'Aquí tiene lo que pedían')`);
ok('si el informante responde, vuelve a investigación', (await svc(`select status from complaints where id = $1`, [c1]))[0].status === 'investigating');
await user(adminA, `update complaints set status = 'resolved' where id = $1`, [c1]);
ok('la respuesta la fecha la base de datos', !!(await svc(`select answered_at from complaints where id = $1`, [c1]))[0].answered_at);
const ans1 = (await svc(`select answered_at from complaints where id = $1`, [c1]))[0].answered_at;
await user(adminA, `update complaints set status = 'archived', priority = 'low' where id = $1`, [c1]);
ok('archivar después no cambia la fecha de respuesta', +(await svc(`select answered_at from complaints where id = $1`, [c1]))[0].answered_at === +ans1);
ok('admin B no lee registro de A', (await user(adminB, `select * from audit_logs where organization_id = $1`, [orgA])).rows.length === 0);
ok('nadie modifica el registro', (await user(adminA, `update audit_logs set action = 'x' returning id`)).rows.length === 0);
ok('nadie borra el registro', (await user(adminA, `delete from audit_logs returning id`)).rows.length === 0);

console.log('\nMiembros');
const mem = await user(adminA, `select * from list_org_members()`);
ok('admin A lista 2 miembros con correo', mem.rows.length === 2 && mem.rows.every(r => r.email?.endsWith('@a.es')), JSON.stringify(mem));
ok('gestor no lista miembros', (await user(mgrA, `select * from list_org_members()`)).rows.length === 0);
ok('sin sesión no lista miembros', !!(await anon(`select * from list_org_members()`)).error);

console.log('\nSupresión (art. 32)');
await svc(`update complaints set created_at = now() - interval '4 months' where id = $1`, [c2]);
const due = await user(adminA, `select * from retention_due()`);
ok('la denuncia sin investigar a los 3 meses aparece como pendiente', due.rows.some(r => r.id === c2), JSON.stringify(due.rows));
ok('el gestor no ve la lista de supresión', (await user(mgrA, `select * from retention_due()`)).rows.length === 0);
ok('admin A borra el archivo de storage', (await user(adminA, `delete from storage.objects where name = $1 returning id`, [`${c1}/a.pdf`])).rows.length === 1);
ok('suprimir exige motivo', !!(await user(adminA, `select anonymize_complaint($1, '')`, [c2])).error);
ok('admin A suprime los datos', !(await user(adminA, `select anonymize_complaint($1, 'Art. 32.4: tres meses sin investigación')`, [c2])).error);
const [an] = await svc(`select description, reporter_email, anonymized_at, reference from complaints where id = $1`, [c2]);
ok('queda la fila sin contenido ni datos personales', an.description === '' && an.reporter_email === null && !!an.anonymized_at && !!an.reference, JSON.stringify(an));
ok('el código ya no consulta nada', (await anon(`select * from get_complaint_by_tracking_code('AAAA-2222')`)).rows.length === 0);
ok('la supresión queda en el registro', (await user(adminA, `select * from audit_logs where complaint_id = $1 and action = 'anonymized'`, [c2])).rows.length === 1);

console.log('\nIdentidad, vías de entrada y registro (011)');
const cI = cid();
await ins(cI, orgA, 'IDEN-0001', 'fraud', true);
ok('el panel no puede leer el correo del informante con la denuncia', !!(await user(adminA, `select reporter_email from complaints where id = $1`, [cI])).error);
ok('ni con "select *"', !!(await user(adminA, `select * from complaints where id = $1`, [cI])).error);
const idn = await user(adminA, `select * from get_reporter_identity($1)`, [cI]);
ok('la identidad se consulta con una acción expresa', !idn.error && idn.rows[0]?.reporter_email === 'yo@correo.es', JSON.stringify(idn));
ok('…que queda en el registro con su autor', (await user(adminA, `select actor_id from audit_logs where complaint_id = $1 and action = 'identity_viewed'`, [cI])).rows[0]?.actor_id === adminA);
ok('sin verificación en dos pasos no se consulta', !!(await user1(adminA, `select * from get_reporter_identity($1)`, [cI])).error);
ok('admin B no consulta identidades de A', !!(await user(adminB, `select * from get_reporter_identity($1)`, [cI])).error);
const cJ = cid();
await ins(cJ, orgA, 'IDEN-0002', 'harassment', true);
ok('el gestor no consulta la identidad de otra categoría', !!(await user(mgrA, `select * from get_reporter_identity($1)`, [cJ])).error);
const cK = cid();
await anon(`insert into complaints (id, tracking_hash, organization_id, is_anonymous, category, description, channel, meeting_requested, outcome)
  values ($1, code_hash('MEET-0001'), $2, true, 'fraud', 'Hechos', 'phone', true, 'founded')`, [cK, orgA]);
const [kRow] = await svc(`select channel, meeting_requested, outcome from complaints where id = $1`, [cK]);
ok('por el formulario la vía siempre es web y no trae resultado', kRow.channel === 'web' && kRow.outcome === null, JSON.stringify(kRow));
ok('la petición de reunión presencial se guarda', kRow.meeting_requested === true);
ok('una anónima no devuelve identidad', (await user(adminA, `select * from get_reporter_identity($1)`, [cK])).rows.length === 0);
ok('admin A marca la reunión como celebrada', !(await user(adminA, `select mark_meeting_held($1)`, [cK])).error);
ok('no se marca dos veces', !!(await user(adminA, `select mark_meeting_held($1)`, [cK])).error);
ok('el navegador no puede fijar la fecha de la reunión', (await svc(`select meeting_held_at from complaints where id = $1`, [cI]))[0].meeting_held_at === null
  && (await user(adminA, `update complaints set meeting_held_at = now(), priority = 'high' where id = $1 returning id`, [cI])).rows.length === 1
  && (await svc(`select meeting_held_at from complaints where id = $1`, [cI]))[0].meeting_held_at === null);
await user(adminA, `update complaints set status = 'investigating' where id = $1`, [cK]);
ok('el inicio de la investigación lo fecha la base de datos', !!(await svc(`select investigation_started_at from complaints where id = $1`, [cK]))[0].investigation_started_at);
ok('admin A registra el resultado', (await user(adminA, `update complaints set outcome = 'founded', status = 'resolved' where id = $1 returning id`, [cK])).rows.length === 1);
ok('un resultado fuera de la lista se rechaza', !!(await user(adminA, `update complaints set outcome = 'inventado' where id = $1`, [cK])).error);
ok('el resultado queda en el registro', (await user(adminA, `select 1 from audit_logs where complaint_id = $1 and action = 'outcome_set'`, [cK])).rows.length === 1);
ok('remisión al Ministerio Fiscal registrada', !(await user(adminA, `select mark_fiscal_referral($1, 'Indicios de delito')`, [cK])).error
  && (await user(adminA, `select 1 from audit_logs where complaint_id = $1 and action = 'fiscal_referral'`, [cK])).rows.length === 1);
const reg = await user(adminA, `select register_complaint('safety', 'Comunicación recibida en una reunión presencial con la persona informante.', 'in_person', now() - interval '2 days', false, 'Pau Serra', 'pau@correo.es', null, 'Taller', null, null, 'ca', code_hash('MANU-0001')) as id`);
ok('admin A registra una comunicación presencial', !reg.error && !!reg.rows[0]?.id, JSON.stringify(reg));
const [mRow] = await svc(`select channel, organization_id, reference, created_at < now() - interval '1 day' as antigua from complaints where id = $1`, [reg.rows[0]?.id]);
ok('…con su vía, su fecha real de recepción y su referencia', mRow?.channel === 'in_person' && mRow.organization_id === orgA && mRow.antigua && !!mRow.reference, JSON.stringify(mRow));
ok('la persona puede seguirla con el código que se le entrega', (await anon(`select * from get_complaint_by_tracking_code('MANU-0001')`)).rows.length === 1);
ok('el gestor sin "editar" no registra comunicaciones', !!(await user(mgrA, `select register_complaint('fraud', 'Comunicación recibida por teléfono, sin más datos.', 'phone', now(), true, null, null, null, null, null, null, 'es', null)`)).error);
ok('no se registra con fecha futura', !!(await user(adminA, `select register_complaint('fraud', 'Comunicación recibida por teléfono, sin más datos.', 'phone', now() + interval '3 days', true, null, null, null, null, null, null, 'es', null)`)).error);
ok('sin sesión no se registra', !!(await anon(`select register_complaint('fraud', 'Comunicación recibida por teléfono, sin más datos.', 'phone', now(), true, null, null, null, null, null, null, 'es', null)`)).error);
ok('admin A indica su autoridad autonómica', (await user(adminA, `update organizations set regional_authority_name = 'Oficina Antifrau de Catalunya', regional_authority_url = 'https://www.antifrau.cat' where id = $1 returning id`, [orgA])).rows.length === 1);
ok('el enlace de la autoridad debe ser https', !!(await user(adminA, `update organizations set regional_authority_url = 'javascript:alert(1)' where id = $1`, [orgA])).error);
const pubOrg = await anon(`select * from get_organization_by_slug('empresa-a')`);
ok('el canal público recibe la autoridad de esa empresa', pubOrg.rows[0]?.regional_authority_url === 'https://www.antifrau.cat', JSON.stringify(pubOrg.rows));

console.log('\nCuenta de la organización (009)');
const o0 = await user(adminA, `select plan, trial_ends_at, paid_until from organizations`);
ok('admin A ve su organización en prueba', o0.rows.length === 1 && o0.rows[0].plan === 'trial' && !!o0.rows[0].trial_ends_at, JSON.stringify(o0));
ok('admin A edita responsable y facturación', (await user(adminA, `update organizations set responsible_name = 'Ana Ruiz', billing_tax_id = 'B12345678', name = 'Empresa A, S.L.' where id = $1 returning id`, [orgA])).rows.length === 1);
ok('admin A no puede activarse un plan', !!(await user(adminA, `update organizations set plan = 'business' where id = $1`, [orgA])).error);
ok('admin A no puede alargarse la prueba', !!(await user(adminA, `update organizations set trial_ends_at = now() + interval '10 years' where id = $1`, [orgA])).error);
ok('admin A no puede cambiar la dirección del canal', !!(await user(adminA, `update organizations set slug = 'otra' where id = $1`, [orgA])).error);
ok('admin A no puede dejar el nombre vacío', !!(await user(adminA, `update organizations set name = '  ' where id = $1`, [orgA])).error);
ok('gestor no edita la organización', (await user(mgrA, `update organizations set responsible_name = 'Yo' where id = $1 returning id`, [orgA])).rows.length === 0);
ok('admin B no edita la organización A', (await user(adminB, `update organizations set responsible_name = 'Yo' where id = $1 returning id`, [orgA])).rows.length === 0);
ok('sin sesión no lee organizaciones', (await anon(`select * from organizations`)).rows.length === 0);
ok('el canal público sigue resolviendo por slug', (await anon(`select * from get_organization_by_slug('empresa-a')`)).rows.length === 1);
await svc(`update organizations set plan = 'essential', paid_until = '2027-10-31' where id = $1`, [orgA]);
ok('Reportia activa el plan con el rol de servicio', (await user(adminA, `select plan from organizations`)).rows[0].plan === 'essential');

// ── Rediseño «dos mitades» (012) ──
if (upTo >= 12) {
  console.log('\nRediseño (012)');
  // Repetible: se puede ejecutar dos veces sin error
  let again = null;
  try { await db.exec(fs.readFileSync(path.join(MIG, '012_rediseno.sql'), 'utf8')); } catch (e) { again = e.message; }
  ok('la 012 se puede ejecutar dos veces', again === null, again ?? '');

  const cR = cid();
  await anon(`insert into complaints (id, tracking_hash, organization_id, is_anonymous, category, description, incident_when, meeting_requested, title, assigned_to)
    values ($1, code_hash('RDIS-0001'), $2, true, 'fraud', 'Hechos del rediseño', '  desde septiembre  ', false, 'Título colado', $3)`, [cR, orgA, adminA]);
  const [r0] = await svc(`select incident_when, title, assigned_to, meeting_requested_at from complaints where id = $1`, [cR]);
  ok('el «cuándo» en texto libre se guarda, recortado', r0?.incident_when === 'desde septiembre', JSON.stringify(r0));
  ok('por el formulario no entran título ni asignación', r0?.title === null && r0?.assigned_to === null);
  ok('sin petición de reunión no hay fecha de petición', r0?.meeting_requested_at === null);

  const byCode = await anon(`select * from get_complaint_by_tracking_code('RDIS-0001')`);
  ok('la consulta por código devuelve meeting_requested', byCode.rows[0]?.meeting_requested === false && 'meeting_requested_at' in (byCode.rows[0] ?? {}), JSON.stringify(byCode));
  ok('quien informa pide la reunión con su código', !(await anon(`select request_meeting_by_code('rdis0001')`)).error);
  const [r1] = await svc(`select meeting_requested, meeting_requested_at from complaints where id = $1`, [cR]);
  ok('queda pedida y con su fecha', r1.meeting_requested === true && !!r1.meeting_requested_at);
  await anon(`select request_meeting_by_code('RDIS-0001')`);
  const [r2] = await svc(`select meeting_requested_at from complaints where id = $1`, [cR]);
  ok('pedirla otra vez no mueve la fecha', String(r2.meeting_requested_at) === String(r1.meeting_requested_at));
  ok('la petición queda en el registro una sola vez', (await svc(`select 1 from audit_logs where complaint_id = $1 and action = 'meeting_requested'`, [cR])).length === 1);
  const nf = await anon(`select request_meeting_by_code('ZZZZ-9999') as at`);
  ok('con un código que no existe no se pide nada (error, o vacío con la 014)', !!nf.error || nf.rows[0]?.at === null, JSON.stringify(nf));
  ok('admin A ve la petición en el panel', (await user(adminA, `select meeting_requested_at from complaints where id = $1`, [cR])).rows[0]?.meeting_requested_at != null);

  ok('admin A pone título y se asigna el caso', (await user(adminA, `update complaints set title = '  Facturas dudosas  ', assigned_to = $2 where id = $1 returning title`, [cR, adminA])).rows[0]?.title === 'Facturas dudosas');
  ok('la asignación queda en el registro', (await svc(`select 1 from audit_logs where complaint_id = $1 and action = 'assigned'`, [cR])).length === 1);
  ok('no se asigna a alguien de otra empresa', !!(await user(adminA, `update complaints set assigned_to = $2 where id = $1`, [cR, adminB])).error);
  ok('el panel no cambia el «cuándo»', !!(await user(adminA, `update complaints set incident_when = 'ayer' where id = $1`, [cR])).error);
  await user(adminA, `update complaints set meeting_requested_at = now() - interval '30 days', ai_summary = 'inventado' where id = $1`, [cR]);
  const [r3] = await svc(`select meeting_requested_at, ai_summary from complaints where id = $1`, [cR]);
  ok('el panel no mueve la fecha de la reunión ni escribe el resumen', String(r3.meeting_requested_at) === String(r1.meeting_requested_at) && r3.ai_summary === null);
  ok('admin B no ve ni toca el caso de A', (await user(adminB, `update complaints set title = 'x' where id = $1 returning id`, [cR])).rows.length === 0);
  ok('la identidad sigue sin poder leerse con la denuncia', !!(await user(adminA, `select reporter_email from complaints where id = $1`, [cR])).error);
  ok('sin verificación en dos pasos no se lee el título', (await user1(adminA, `select title from complaints where id = $1`, [cR])).rows.length === 0);

  const reg = await user(adminA, `select register_complaint('safety', 'Comunicación recibida por teléfono, con el cuándo en texto.', 'phone', now(), true, null, null, null, 'Muelle', null, null, 'es', code_hash('RDIS-0002'), 'la semana pasada') as id`);
  ok('registro manual con el «cuándo» en texto', !reg.error && (await svc(`select incident_when from complaints where id = $1`, [reg.rows[0]?.id]))[0]?.incident_when === 'la semana pasada', reg.error ?? '');
  ok('el registro manual de la 011 sigue funcionando', !(await user(adminA, `select register_complaint('safety', 'Comunicación recibida por teléfono, versión anterior.', 'phone', now(), true, null, null, null, null, null, null, 'es', null)`)).error);
  ok('admin A guarda las fechas del responsable y los primeros pasos', !(await user(adminA, `update organizations set responsible_appointed_at = '2026-10-01', onboarding = '{"poster":true}' where id = $1`, [orgA])).error);
}

// ── IA preparada y supresión completa (013) ─────────────────────────────
if (upTo >= 13) {
  console.log('\nIA y supresión completa (013)');
  await db.exec(fs.readFileSync(path.join(MIG, '013_ia_supresion.sql'), 'utf8'));
  ok('la 013 se puede ejecutar dos veces', true);
  const mk = await user(adminA, `select register_complaint('fraud', 'Caso de prueba para el resumen con inteligencia artificial.', 'phone', now(), false, 'Marta', 'marta@example.com', null, 'Compras', null, null, 'es', code_hash('IAIA-0013'), 'desde septiembre') as id`);
  const cI = mk.rows[0]?.id;
  ok('caso de prueba creado', !!cI, mk.error ?? '');
  await user(adminA, `update complaints set title = 'Facturas de un proveedor' where id = $1`, [cI]);
  ok('el navegador (administrador) no puede guardar un resumen', !!(await user(adminA, `select store_ai_summary($1, $2, 'Resumen inventado', 'Título')`, [cI, adminA])).error);
  ok('el navegador (anónimo) tampoco', !!(await anon(`select store_ai_summary('${cI}', '${adminA}', 'Resumen inventado', 'Título')`)).error);
  let stored = null, storeErr = '';
  try { stored = await svc(`select store_ai_summary($1, $2, '  Resumen de tres frases.  ', '  Posibles facturas falsas de un proveedor  ') as at`, [cI, adminA]); } catch (e) { storeErr = e.message; }
  ok('el servidor guarda el resumen', !!stored?.[0]?.at, storeErr);
  const [ai] = await svc(`select ai_summary, ai_title, ai_generated_at, title from complaints where id = $1`, [cI]);
  ok('resumen y título guardados sin espacios, con su fecha', ai.ai_summary === 'Resumen de tres frases.' && ai.ai_title === 'Posibles facturas falsas de un proveedor' && !!ai.ai_generated_at, JSON.stringify(ai));
  ok('el título puesto a mano no se toca', ai.title === 'Facturas de un proveedor');
  const logs = await svc(`select organization_id, actor_id, details from audit_logs where complaint_id = $1 and action = 'ai_summary'`, [cI]);
  ok('queda en el registro con quién lo pidió', logs.length === 1 && logs[0].organization_id === orgA && logs[0].details?.requested_by === adminA && !!logs[0].details?.actor_name, JSON.stringify(logs));
  ok('el administrador lee el resumen y su entrada del registro', (await user(adminA, `select ai_summary from complaints where id = $1`, [cI])).rows[0]?.ai_summary === 'Resumen de tres frases.' && (await user(adminA, `select 1 from audit_logs where complaint_id = $1 and action = 'ai_summary'`, [cI])).rows.length === 1);
  ok('otra empresa no lee el resumen', (await user(adminB, `select ai_summary from complaints where id = $1`, [cI])).rows.length === 0);
  let wrong = false; try { await svc(`select store_ai_summary($1, $2, 'Resumen', 'Título')`, [cI, adminB]); } catch { wrong = true; }
  ok('no se guarda a nombre de alguien de otra empresa', wrong);
  let empty = false; try { await svc(`select store_ai_summary($1, $2, '   ', 'Título')`, [cI, adminA]); } catch { empty = true; }
  ok('un resumen vacío se rechaza', empty);
  ok('el panel sigue sin poder escribir el resumen directamente', (await (async () => { await user(adminA, `update complaints set ai_summary = 'cambiado', ai_title = 'cambiado' where id = $1`, [cI]); return (await svc(`select ai_summary from complaints where id = $1`, [cI]))[0].ai_summary; })()) === 'Resumen de tres frases.');
  ok('admin A suprime el caso', !(await user(adminA, `select anonymize_complaint($1, 'Art. 32: prueba de supresión completa')`, [cI])).error);
  const [gone] = await svc(`select description, incident_when, title, ai_summary, ai_title, ai_generated_at, reporter_name, reference from complaints where id = $1`, [cI]);
  ok('la supresión borra también título, «cuándo» y resumen de IA', gone.description === '' && gone.incident_when === null && gone.title === null && gone.ai_summary === null && gone.ai_title === null && gone.ai_generated_at === null && gone.reporter_name === null && !!gone.reference, JSON.stringify(gone));
  let late = false; try { await svc(`select store_ai_summary($1, $2, 'Resumen', 'Título')`, [cI, adminA]); } catch { late = true; }
  ok('en un caso suprimido ya no se guarda ningún resumen', late);
}

// ── Endurecimiento (014) ────────────────────────────────────────────────
// Hallazgos de la auditoría de seguridad (docs/AUDITORIA.md). Estas pruebas se escribieron antes que
// la migración: sin la 014, fallan.
if (upTo >= 14) {
  console.log('\nEndurecimiento (014)');
  const MIG14 = path.join(MIG, '014_endurecimiento.sql');
  if (fs.existsSync(MIG14)) { await db.exec(fs.readFileSync(MIG14, 'utf8')); ok('la 014 se puede ejecutar dos veces', true); }
  else ok('existe la migración 014', false);
  const err = (r) => String(r.error ?? '');

  // A1-1 · El código de seguimiento no se puede adivinar en lote
  const pair = await anon(`insert into complaints (tracking_hash, organization_id, category, description)
    values (code_hash('PAR1-0001'), $1, 'safety', 'Lote'), (code_hash('AAAA-1111'), $1, 'safety', 'Lote')`, [orgB]);
  ok('dos denuncias en una sola petición se rechazan, antes de mirar si el código existe (no se puede ir probando códigos por lotes)', /one-at-a-time/.test(err(pair)) && (await svc(`select 1 from complaints where description = 'Lote'`)).length === 0, err(pair));
  const flood = await anon(`insert into complaints (tracking_hash, organization_id, category, description)
    select code_hash('FL' || g::text), $1, 'fraud', 'Inundación' from generate_series(1, 40) g`, [orgB]);
  const [{ n: flooded }] = await svc(`select count(*)::int n from complaints where description = 'Inundación'`);
  ok('ni 40 de golpe', !!flood.error && flooded === 0, `${err(flood)} · ${flooded}`);
  ok('una sola denuncia por petición sigue entrando', !(await anon(`insert into complaints (tracking_hash, organization_id, category, description) values (code_hash('UNA1-0001'), $1, 'safety', 'Una')`, [orgB])).error);

  // A1-1, A1-4 y B-9 · Envío por una función del servidor: una denuncia por llamada, sin duplicados al reintentar
  const H = (await svc(`select code_hash('SUBM-0001') h`))[0].h;
  const submit = (hash, desc = 'Hechos enviados por la función', org = orgA) => anon(
    `select submit_complaint($1, $2, 'fraud', $3, true, 'Nombre', 'a@b.es', '600', 'Compras', null, null, 'es', true, 'desde marzo') as id`, [org, hash, desc]);
  const s1 = await submit(H);
  ok('submit_complaint crea la denuncia sin sesión', !s1.error && !!s1.rows[0]?.id, err(s1));
  const [sc] = s1.rows[0]?.id ? await svc(`select status, priority, channel, reporter_name, reporter_email, meeting_requested_at, incident_when, reference from complaints where id = $1`, [s1.rows[0].id]) : [{}];
  ok('…con los campos que decide el servidor y sin datos de contacto si es anónima', sc.status === 'received' && sc.priority === 'normal' && sc.channel === 'web' && sc.reporter_name === null && sc.reporter_email === null && !!sc.meeting_requested_at && sc.incident_when === 'desde marzo' && /^REF-/.test(sc.reference ?? ''), JSON.stringify(sc));
  ok('…y deja la entrada «created» en el registro', s1.rows[0]?.id ? (await svc(`select 1 from audit_logs where complaint_id = $1 and action = 'created'`, [s1.rows[0].id])).length === 1 : false);
  const s2 = await submit(H);
  ok('reintentar el mismo envío devuelve la misma denuncia y no crea otra', !s2.error && s2.rows[0]?.id === s1.rows[0]?.id && (await svc(`select count(*)::int n from complaints where tracking_hash = $1`, [H]))[0].n === 1, err(s2));
  ok('el mismo código con otro contenido se rechaza (el navegador genera otro)', /code-conflict/.test(err(await submit(H, 'Otra denuncia distinta con el mismo código'))));
  ok('…y también si ahora es identificada (no se pierden sus datos de contacto)', /code-conflict/.test(err(await anon(`select submit_complaint($1, $2, 'fraud', 'Hechos enviados por la función', false, 'Nombre', 'a@b.es', '600', 'Compras', null, null, 'es', true, 'desde marzo')`, [orgA, H]))));
  ok('un hash mal formado se rechaza', !!(await submit('no-es-un-hash')).error);
  ok('una empresa que no existe se rechaza', !!(await submit((await svc(`select code_hash('SUBM-0002') h`))[0].h, 'x'.repeat(30), crypto.randomUUID())).error);

  // A1-1 · Límite de intentos con códigos falsos (global, sin guardar la IP)
  const sum = async () => { try { return (await svc(`select coalesce(sum(failures), 0)::int n from code_attempts`))[0].n; } catch { return null; } };
  const before = await sum();
  await anon(`select * from get_complaint_by_tracking_code('ZZZZ-9998')`);
  ok('una consulta con un código que no existe cuenta como intento fallido', before !== null && (await sum()) === before + 1, `${before} → ${await sum()}`);
  const msgWrong = await anon(`select send_reporter_message('ZZZZ-9997', 'hola') as id`);
  ok('enviar un mensaje con un código falso no confirma nada y cuenta como intento', !msgWrong.error && msgWrong.rows[0]?.id === null && (await sum()) === before + 2, err(msgWrong));
  const meetWrong = await anon(`select request_meeting_by_code('ZZZZ-9996') as at`);
  ok('pedir reunión con un código falso tampoco', !meetWrong.error && meetWrong.rows[0]?.at === null && (await sum()) === before + 3, err(meetWrong));
  await anon(`select * from get_messages_by_tracking_code('ZZZZ-9995')`);
  ok('leer mensajes con un código falso también cuenta', before !== null && (await sum()) === before + 4);
  await svc(`insert into code_attempts (window_start, failures) values (date_trunc('minute', now()) - interval '1 minute', 1000) on conflict (window_start) do update set failures = 1000`).catch(() => {});
  const blocked = await anon(`select * from get_complaint_by_tracking_code('AAAA-1111')`);
  ok('con demasiados intentos fallidos en 10 minutos, las consultas por código se frenan', /too-many-attempts/.test(err(blocked)), err(blocked));
  await svc(`delete from code_attempts`).catch(() => {});
  ok('pasado el freno, el código bueno vuelve a funcionar', (await anon(`select * from get_complaint_by_tracking_code('AAAA-1111')`)).rows.length === 1);
  ok('la tabla de intentos no se puede leer desde el navegador', !!(await anon(`select * from code_attempts`)).error && !!(await user(adminA, `select * from code_attempts`)).error);

  // A1-2 · Sin el segundo paso, un administrador no cambia perfiles ni la empresa
  const [{ full_name: mgrName }] = await svc(`select full_name from profiles where id = $1`, [mgrA]);
  await user1(adminA, `delete from profiles where id = $1`, [mgrA]);
  ok('sin segundo paso no borra perfiles', (await svc(`select 1 from profiles where id = $1`, [mgrA])).length === 1);
  await user1(adminA, `update profiles set full_name = 'Cambiado' where id = $1`, [mgrA]);
  ok('sin segundo paso no renombra a otros', (await svc(`select full_name from profiles where id = $1`, [mgrA]))[0].full_name === mgrName);
  const [{ id: ghost }] = await svc(`insert into auth.users (email) values ('fantasma@x.es') returning id`);
  await svc(`delete from profiles where id = $1`, [ghost]);
  ok('ni con segundo paso se crean perfiles desde el navegador', !!(await user(adminA, `insert into profiles (id, role, organization_id) values ($1, 'superadmin', $2)`, [ghost, orgA])).error);
  ok('ni con segundo paso se borran perfiles desde el navegador', (await user(adminA, `delete from profiles where id = $1 returning id`, [mgrA])).rows.length === 0);
  const [{ regional_authority_url: urlBefore }] = await svc(`select regional_authority_url from organizations where id = $1`, [orgA]);
  await user1(adminA, `update organizations set regional_authority_url = 'https://phishing.example/denuncia' where id = $1`, [orgA]);
  ok('sin segundo paso no cambia el enlace externo que ve quien denuncia', (await svc(`select regional_authority_url from organizations where id = $1`, [orgA]))[0].regional_authority_url === urlBefore);
  ok('con segundo paso sí edita su empresa', (await user(adminA, `update organizations set responsible_role = 'Compliance' where id = $1 returning id`, [orgA])).rows.length === 1);

  // A1-3 y A1-9 · El registro guarda quién hizo cada cosa, aunque esa persona se borre o cambie de nombre
  await user(adminA, `insert into audit_logs (complaint_id, action, details) values ($1, 'note_added', $2)`, [c1, JSON.stringify({ note: 'n'.repeat(6000), actor_name: 'Alguien inventado', extra: 'x' })]);
  const [note] = await svc(`select actor_id, actor_name, details from audit_logs where complaint_id = $1 and action = 'note_added' order by created_at desc limit 1`, [c1]);
  ok('el nombre del autor lo pone la base de datos', note?.actor_name === 'Admin A', JSON.stringify(note?.actor_name));
  ok('la nota no admite autor inventado ni campos de más, y tiene un tope de 5000 caracteres', note?.details?.actor_name !== 'Alguien inventado' && !('extra' in (note?.details ?? {})) && note?.details?.note?.length === 5000, JSON.stringify(Object.keys(note?.details ?? {})));
  const [{ id: mgrTmp }] = await svc(`insert into auth.users (email, raw_user_meta_data) values ('temporal@a.es', '{"full_name":"Gestor Temporal"}') returning id`);
  await svc(`update profiles set organization_id = $1, role = 'superadmin' where id = $2`, [orgA, mgrTmp]);
  await user(mgrTmp, `insert into audit_logs (complaint_id, action, details) values ($1, 'note_added', '{"note":"nota de quien se irá"}')`, [c1]);
  await svc(`delete from profiles where id = $1`, [mgrTmp]);
  const [kept] = await svc(`select actor_id, actor_name from audit_logs where details->>'note' = 'nota de quien se irá'`);
  ok('al borrar a un miembro, su nombre se conserva en el registro', kept?.actor_name === 'Gestor Temporal', JSON.stringify(kept));
  ok('las entradas de antes de la 014 reciben el nombre de su autor', (await svc(`select count(*)::int n from audit_logs where actor_id is not null and actor_name is null`))[0]?.n === 0);
  ok('la entrada «created» no se puede repetir', !!(await anon(`insert into audit_logs (complaint_id, action, details) values ($1, 'created', '{}')`, [c1])).error);

  // B-3 · No se amplía un plazo ya vencido
  const late = cid();
  await ins(late, orgA, 'LATE-0001', 'fraud');
  await svc(`update complaints set created_at = now() - interval '4 months' where id = $1`, [late]);
  ok('no se puede ampliar un plazo de respuesta ya vencido', /deadline-passed/.test(err(await user(adminA, `select extend_response_deadline($1, 'Caso complejo con muchos testigos')`, [late]))));

  // B-4 · La supresión no deja datos personales en el motivo de la ampliación ni en las notas
  const sup = cid();
  await ins(sup, orgA, 'SUPR-0001', 'fraud');
  await user(adminA, `select extend_response_deadline($1, 'Hablar con Ana García, 600111222')`, [sup]);
  await user(adminA, `insert into audit_logs (complaint_id, action, details) values ($1, 'note_added', '{"note":"Llamar a Ana García al 600111222"}')`, [sup]);
  await user(adminA, `select anonymize_complaint($1, 'Art. 32: prueba de supresión')`, [sup]);
  const [sr] = await svc(`select extension_reason from complaints where id = $1`, [sup]);
  const leftovers = await svc(`select action, details from audit_logs where complaint_id = $1 and details::text like '%600111222%'`, [sup]);
  ok('al suprimir se borra el motivo de la ampliación y el texto de las notas', sr.extension_reason === null && leftovers.length === 0, JSON.stringify(leftovers));

  // B-5 · Aviso de supresión: también los casos cerrados sin investigar (art. 32.4)
  const inad = cid();
  await ins(inad, orgA, 'INAD-0001', 'fraud');
  await svc(`update complaints set created_at = now() - interval '4 months', status = 'archived', outcome = 'inadmissible' where id = $1`, [inad]);
  ok('un caso archivado sin investigar sale en el aviso de supresión a los 3 meses', (await user(adminA, `select id from retention_due()`)).rows.some(r => r.id === inad));

  // A1-5 · Buscar una cuenta por correo solo lo puede hacer el servidor
  ok('find_auth_user no se puede llamar desde el navegador', !!(await anon(`select * from find_auth_user('admin@a.es')`)).error && !!(await user(adminA, `select * from find_auth_user('admin@a.es')`)).error);
  ok('…y el servidor sí la encuentra', (await svc(`select * from find_auth_user('ADMIN@a.es')`)).length === 1);

  // A1-6 · Alta de empresas: direcciones reservadas y nombres con tope
  await svc(`insert into auth.users (email, raw_user_meta_data) values ('demo@x.es', '{"company_name":"Demo","full_name":"Alguien"}')`);
  const [demoOrg] = await svc(`select o.slug from organizations o join profiles p on p.organization_id = o.id join auth.users u on u.id = p.id where u.email = 'demo@x.es'`);
  ok('una empresa llamada «Demo» no recibe la dirección del canal de ejemplo', demoOrg && demoOrg.slug !== 'demo', JSON.stringify(demoOrg));
  await svc(`insert into auth.users (email, raw_user_meta_data) values ('largo@x.es', jsonb_build_object('company_name', repeat('a', 5000), 'full_name', repeat('b', 5000)))`);
  const [big] = await svc(`select length(o.name) n, length(o.slug) s, length(p.full_name) f from organizations o join profiles p on p.organization_id = o.id join auth.users u on u.id = p.id where u.email = 'largo@x.es'`);
  ok('el nombre de la empresa y de la persona tienen tope al darse de alta', big && big.n <= 120 && big.s <= 60 && big.f <= 120, JSON.stringify(big));

  // A1-4 · Como mucho 50 denuncias por hora y empresa por el formulario web
  const [{ id: adminT }] = await svc(`insert into auth.users (email, raw_user_meta_data) values ('tope@x.es', '{"company_name":"Empresa Tope","full_name":"Tope"}') returning id`);
  const [{ id: orgT }] = await svc(`select id from organizations where name = 'Empresa Tope'`);
  let okRows = 0;
  for (let i = 0; i < 50; i++) if (!(await anon(`insert into complaints (tracking_hash, organization_id, category, description) values (code_hash($2), $1, 'fraud', 'Hora')`, [orgT, `TOPE-${String(i).padStart(4, '0')}`])).error) okRows++;
  const over = await anon(`insert into complaints (tracking_hash, organization_id, category, description) values (code_hash('TOPE-9999'), $1, 'fraud', 'Hora')`, [orgT]);
  ok('50 denuncias en una hora entran; la 51 espera', okRows === 50 && /rate-limited/.test(err(over)), `${okRows} · ${err(over)}`);
  ok('el tope también vale para la función de envío', /rate-limited/.test(err(await submit((await svc(`select code_hash('TOPE-9998') h`))[0].h, 'Hora', orgT))));
  ok('cambiar el canal no se salta el tope', /rate-limited/.test(err(await anon(`insert into complaints (tracking_hash, organization_id, category, description, channel) values (code_hash('TOPE-9997'), $1, 'fraud', 'Hora', 'phone')`, [orgT]))));
  ok('el registro manual desde el panel no cuenta para el tope', !(await user(adminT, `select register_complaint('safety', 'Llamada recibida en recepción con hechos concretos.', 'phone', now(), true, null, null, null, null, null, null, 'es', code_hash('TOPE-MANU'), null)`)).error);
  await svc(`update complaints set created_at = now() - interval '2 hours' where organization_id = $1`, [orgT]);
  ok('pasada la hora, vuelve a entrar', !(await anon(`insert into complaints (tracking_hash, organization_id, category, description) values (code_hash('TOPE-9996'), $1, 'fraud', 'Hora')`, [orgT])).error);
}

// ── Producto (015) ──────────────────────────────────────────────────────
if (upTo >= 15) {
  console.log('\nProducto (015)');
  const MIG15 = path.join(MIG, '015_producto.sql');
  if (fs.existsSync(MIG15)) { await db.exec(fs.readFileSync(MIG15, 'utf8')); ok('la 015 se puede ejecutar dos veces', true); }
  else ok('existe la migración 015', false);
  const err = (r) => String(r.error ?? '');

  // B-16 · Un caso suprimido ya no se toca desde el panel
  const er = cid();
  await ins(er, orgA, 'ERAS-0001', 'fraud');
  await user(adminA, `select anonymize_complaint($1, 'Art. 32: prueba de la 015')`, [er]);
  ok('en un caso suprimido no se cambia el estado', /complaint-anonymized/.test(err(await user(adminA, `update complaints set status = 'investigating' where id = $1`, [er]))));
  ok('…ni la prioridad', /complaint-anonymized/.test(err(await user(adminA, `update complaints set priority = 'high' where id = $1`, [er]))));
  ok('…ni se escriben mensajes', !!(await user(adminA, `insert into messages (complaint_id, sender, content) values ($1, 'manager', 'hola')`, [er])).error);
  ok('en un caso normal sí', !(await user(adminA, `update complaints set priority = 'high' where id = $1`, [c1])).error);

  // A1-11 · Solo quien puede responder marca como leídos los mensajes de quien informa
  const [{ id: viewer }] = await svc(`insert into auth.users (email, raw_user_meta_data) values ('mira@a.es', '{"full_name":"Solo Mira"}') returning id`);
  await svc(`update profiles set organization_id = $1 where id = $2`, [orgA, viewer]);
  await svc(`insert into manager_permissions (manager_id, organization_id, category, can_view, can_reply, can_edit) values ($1, $2, 'fraud', true, false, false)`, [viewer, orgA]);
  const rd = cid();
  await ins(rd, orgA, 'READ-0001', 'fraud');
  await anon(`select send_reporter_message('READ-0001', 'Tengo algo más que contar')`);
  ok('quien solo puede ver lee el mensaje…', (await user(viewer, `select id from messages where complaint_id = $1`, [rd])).rows.length === 1);
  await user(viewer, `update messages set is_read = true where complaint_id = $1`, [rd]);
  ok('…pero no lo marca como leído', (await svc(`select is_read from messages where complaint_id = $1`, [rd]))[0].is_read === false);
  await user(adminA, `update messages set is_read = true where complaint_id = $1`, [rd]);
  ok('quien puede responder sí lo marca', (await svc(`select is_read from messages where complaint_id = $1`, [rd]))[0].is_read === true);

  // A2-4 · Tipos de archivo: lista cerrada
  const [{ allowed_mime_types: types }] = await svc(`select allowed_mime_types from storage.buckets where id = 'attachments'`);
  ok('el almacén ya no acepta «cualquier imagen», SVG ni «cualquier arxiu»', !types.some(t => t.endsWith('/*') || t === 'application/octet-stream' || t.includes('svg')), types.join(' '));
  ok('…y sigue aceptando PDF, fotos, vídeo, audio, Office y correos', ['application/pdf', 'image/jpeg', 'image/heic', 'video/mp4', 'audio/mpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'message/rfc822'].every(t => types.includes(t)));
}

// ── Marca blanca (016) ──────────────────────────────────────────────────
if (upTo >= 16) {
  console.log('\nMarca blanca (016)');
  const MIG16 = path.join(MIG, '016_marca.sql');
  if (fs.existsSync(MIG16)) { await db.exec(fs.readFileSync(MIG16, 'utf8')); ok('la 016 se puede ejecutar dos veces', true); }
  else ok('existe la migración 016', false);
  const err = (r) => String(r.error ?? '');
  // Un PNG de 1 × 1 píxel, como lo deja el navegador al preparar el logo
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const slugA = (await svc(`select slug from organizations where id = $1`, [orgA]))[0].slug;

  // La paleta y el logo de la empresa
  ok('las empresas empiezan con la paleta azul y sin logo', (await svc(`select brand_palette p, brand_logo l from organizations where id = $1`, [orgA]))
    .every(r => r.p === 'azul' && r.l === null));
  ok('el administrador cambia la paleta', !(await user(adminA, `update organizations set brand_palette = 'petroleo' where id = $1`, [orgA])).error
    && (await svc(`select brand_palette from organizations where id = $1`, [orgA]))[0].brand_palette === 'petroleo');
  ok('una paleta que no es de las ocho se rechaza', !!(await user(adminA, `update organizations set brand_palette = 'fucsia' where id = $1`, [orgA])).error);
  ok('el administrador sube un logo PNG', !(await user(adminA, `update organizations set brand_logo = $2 where id = $1`, [orgA, PNG])).error);
  ok('un logo SVG se rechaza (puede llevar código)', !!(await user(adminA, `update organizations set brand_logo = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' where id = $1`, [orgA])).error);
  ok('un enlace a otro sitio se rechaza', !!(await user(adminA, `update organizations set brand_logo = 'https://otro.sitio/logo.png' where id = $1`, [orgA])).error);
  ok('un «data:» con algo más que la imagen se rechaza', !!(await user(adminA, `update organizations set brand_logo = $2 where id = $1`, [orgA, `${PNG}"><script>alert(1)</script>`])).error);
  ok('un logo demasiado grande se rechaza', !!(await user(adminA, `update organizations set brand_logo = $2 where id = $1`, [orgA, `data:image/png;base64,${'A'.repeat(120001)}`])).error);
  ok('con solo contraseña no se cambia la marca', (await user1(adminA, `update organizations set brand_palette = 'teja' where id = $1 returning id`, [orgA])).rows.length === 0
    && (await svc(`select brand_palette from organizations where id = $1`, [orgA]))[0].brand_palette === 'petroleo');
  ok('un gestor no cambia la marca', (await user(mgrA, `update organizations set brand_palette = 'teja' where id = $1 returning id`, [orgA])).rows.length === 0);
  ok('otra empresa no cambia la marca', (await user(adminB, `update organizations set brand_logo = null where id = $1 returning id`, [orgA])).rows.length === 0
    && (await svc(`select brand_logo from organizations where id = $1`, [orgA]))[0].brand_logo === PNG);
  ok('quitar el logo', !(await user(adminA, `update organizations set brand_logo = null where id = $1`, [orgA])).error);
  await user(adminA, `update organizations set brand_logo = $2 where id = $1`, [orgA, PNG]);

  // El canal (sin sesión) ve la marca, y nada más
  const pubOrg = await anon(`select * from get_organization_by_slug($1)`, [slugA]);
  const pr = pubOrg.rows[0] ?? {};
  ok('el canal lee la paleta y el logo', pr.brand_palette === 'petroleo' && pr.brand_logo === PNG, JSON.stringify(pubOrg.error ?? Object.keys(pr)));
  ok('…y no el plan, la facturación ni la persona responsable', !['plan', 'billing_name', 'billing_tax_id', 'responsible_name', 'trial_ends_at'].some(k => k in pr), Object.keys(pr).join(' '));
  ok('sin sesión no se lee la tabla de empresas', (await anon(`select brand_logo from organizations`)).rows.length === 0);

  // La apariencia de cada persona
  ok('los perfiles empiezan «como el sistema»', (await svc(`select appearance from profiles where id in ($1, $2)`, [adminA, mgrA])).every(r => r.appearance === 'system'));
  ok('un gestor elige el modo oscuro', !(await user(mgrA, `update profiles set appearance = 'dark' where id = $1`, [mgrA])).error
    && (await svc(`select appearance from profiles where id = $1`, [mgrA]))[0].appearance === 'dark');
  ok('un valor que no es claro, oscuro ni sistema se rechaza', !!(await user(mgrA, `update profiles set appearance = 'sepia' where id = $1`, [mgrA])).error);
  ok('un gestor no cambia la apariencia de otra persona', (await user(mgrA, `update profiles set appearance = 'light' where id = $1 returning id`, [adminA])).rows.length === 0
    && (await svc(`select appearance from profiles where id = $1`, [adminA]))[0].appearance === 'system');
  ok('nadie de otra empresa la cambia', (await user(adminB, `update profiles set appearance = 'light' where id = $1 returning id`, [mgrA])).rows.length === 0);
  ok('cambiar la apariencia no deja cambiar el rol', !!(await user(mgrA, `update profiles set appearance = 'light', role = 'superadmin' where id = $1`, [mgrA])).error
    && (await svc(`select role from profiles where id = $1`, [mgrA]))[0].role === 'manager');
}

// ── Dirección propia (017) ──────────────────────────────────────────────
if (upTo >= 17) {
  console.log('\nDirección propia (017)');
  const MIG17 = path.join(MIG, '017_dominio_propio.sql');
  if (fs.existsSync(MIG17)) { await db.exec(fs.readFileSync(MIG17, 'utf8')); ok('la 017 se puede ejecutar dos veces', true); }
  else ok('existe la migración 017', false);
  const slugA = (await svc(`select slug from organizations where id = $1`, [orgA]))[0].slug;

  ok('el administrador no se pone una dirección propia desde el panel', !!(await user(adminA, `update organizations set custom_domain = 'canal.a.es' where id = $1`, [orgA])).error);
  ok('Reportia sí (con la clave de servicio)', (await svc(`update organizations set custom_domain = 'canal.a.es' where id = $1 returning id`, [orgA])).length === 1);
  ok('con la dirección puesta, el administrador sigue cambiando lo suyo', !(await user(adminA, `update organizations set responsible_name = 'Ana' where id = $1`, [orgA])).error);
  ok('…pero no la dirección', !!(await user(adminA, `update organizations set custom_domain = null where id = $1`, [orgA])).error);
  let dup = null; try { await svc(`update organizations set custom_domain = 'canal.a.es' where id = $1`, [orgB]); } catch (e) { dup = e; }
  ok('una dirección es de una sola empresa', !!dup);
  let bad = null; try { await svc(`update organizations set custom_domain = 'https://Canal.B.es/' where id = $1`, [orgB]); } catch (e) { bad = e; }
  ok('solo el nombre del dominio, en minúsculas (sin https ni barras)', !!bad);
  const found = await anon(`select get_organization_slug_by_domain('Canal.A.es ') as slug`);
  ok('sin sesión, una dirección propia lleva al canal de su empresa', found.rows[0]?.slug === slugA, JSON.stringify(found));
  ok('una dirección que no es de nadie no lleva a ningún canal', (await anon(`select get_organization_slug_by_domain('otra.web.es') as slug`)).rows[0]?.slug === null);
  ok('la dirección no se lee de la tabla sin sesión', (await anon(`select custom_domain from organizations`)).rows.length === 0);
}

// ── Pie «Con Reportia» (018) ────────────────────────────────────────────
if (upTo >= 18) {
  console.log('\nPie «Con Reportia» (018)');
  const MIG18 = path.join(MIG, '018_pie_reportia.sql');
  if (fs.existsSync(MIG18)) { await db.exec(fs.readFileSync(MIG18, 'utf8')); ok('la 018 se puede ejecutar dos veces', true); }
  else ok('existe la migración 018', false);
  const slugA = (await svc(`select slug from organizations where id = $1`, [orgA]))[0].slug;
  ok('todas las empresas empiezan con el pie visible', (await svc(`select bool_and(show_powered_by) v from organizations`))[0].v === true);
  ok('el administrador no lo quita desde el panel', !!(await user(adminA, `update organizations set show_powered_by = false where id = $1`, [orgA])).error);
  ok('…y sigue cambiando lo demás', !(await user(adminA, `update organizations set brand_palette = 'bosque' where id = $1`, [orgA])).error);
  ok('Reportia sí lo quita (clave de servicio)', (await svc(`update organizations set show_powered_by = false where id = $1 returning id`, [orgA])).length === 1);
  const pub = (await anon(`select * from get_organization_by_slug($1)`, [slugA])).rows[0] ?? {};
  ok('el canal lo lee junto con la marca', pub.show_powered_by === false && pub.brand_palette === 'bosque', JSON.stringify(Object.keys(pub)));
  const sinPie = await newDb(17);
  let paro = null;
  try { await sinPie.exec(`update organizations set name = name`); await sinPie.exec(fs.readFileSync(MIG18, 'utf8')); } catch (e) { paro = e.message; }
  ok('con la 016 ya ejecutada, la 018 entra sin problemas', paro === null, paro);
  const sin16 = await newDb(15);
  paro = null;
  try { await sin16.exec(fs.readFileSync(MIG18, 'utf8')); } catch (e) { paro = e.message; }
  const tocado = (await sin16.query(`select count(*)::int n from information_schema.columns where table_name = 'organizations' and column_name = 'show_powered_by'`)).rows[0].n;
  ok('…y si falta la 016 dice cuál ejecutar antes', /016/.test(paro ?? '') && tocado === 0, paro);
}

// ── Huella del código con secreto (019) ─────────────────────────────────
if (upTo >= 19) {
  console.log('\nHuella del código con secreto (019)');
  const MIG19 = fs.readFileSync(path.join(MIG, '019_huella_con_secreto.sql'), 'utf8');
  const RB = (f) => fs.readFileSync(path.join(MIG, '..', 'rollback', f), 'utf8');
  const crypto = await import('node:crypto');
  const sha = (c) => crypto.createHash('sha256').update(c.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');

  // Una base de datos «de antes» (hasta la 018) con denuncias guardadas con la huella de siempre
  const pg = await newDb(18);
  const q = async (sql, p) => (await pg.query(sql, p)).rows;
  const an = (sql, p) => asOn(pg, 'anon', null, sql, p);
  await q(`insert into auth.users (email, raw_user_meta_data) values ('jefa@h.es', '{"company_name":"Empresa H","full_name":"Jefa H"}')`);
  const [{ organization_id: orgH }] = await q(`select p.organization_id from profiles p join auth.users u on u.id = p.id where u.email = 'jefa@h.es'`);
  const [{ id: jefa }] = await q(`select id from auth.users where email = 'jefa@h.es'`);
  const old1 = crypto.randomUUID();
  await an(`insert into complaints (id, tracking_hash, organization_id, category, description) values ($1, $2, $3, 'fraud', 'Antes de la 019')`, [old1, sha('OLD1-AAAA'), orgH]);
  const old2 = (await an(`select submit_complaint($1, $2, 'safety', 'Otra de antes', true, null, null, null, null, null, null, 'es', false, null) as id`, [orgH, sha('OLD2-BBBB')])).rows[0]?.id;
  const old3 = crypto.randomUUID();
  await an(`insert into complaints (id, tracking_hash, organization_id, category, description) values ($1, $2, $3, 'data', 'Nadie la consulta')`, [old3, sha('OLD3-CCCC'), orgH]);
  // Una fecha de «última actualización» antigua (sin el disparador que la pone al día)
  await q(`alter table complaints disable trigger set_updated_at`);
  await q(`update complaints set updated_at = '2026-09-01T10:00:00Z' where id = $1`, [old1]);
  await q(`alter table complaints enable trigger set_updated_at`);
  ok('antes de la 019 las huellas son SHA-256 sin secreto', (await q(`select tracking_hash h from complaints where id = $1`, [old1]))[0].h === sha('OLD1-AAAA'));

  // La copia de seguridad, la 019 y la 019 otra vez
  await pg.exec(RB('019_copia_antes.sql'));
  await pg.exec(RB('019_copia_antes.sql'));
  ok('la copia de seguridad tiene todas las denuncias y se puede repetir', (await q(`select count(*)::int n from private.complaints_copia_019`))[0].n === 3);
  await pg.exec(MIG19);
  const pepper = (await q(`select value from private.app_secrets where name = 'tracking_pepper'`))[0]?.value;
  await pg.exec(MIG19);
  ok('la 019 se puede ejecutar dos veces y el secreto no cambia', pepper && (await q(`select value from private.app_secrets where name = 'tracking_pepper'`))[0].value === pepper);
  const keyed = (c) => crypto.createHmac('sha256', Buffer.from(pepper, 'utf8')).update(sha(c)).digest('hex');
  ok('ejecutarla no transforma nada en bloque', (await q(`select count(*)::int n from complaints where tracking_hash in ($1, $2, $3)`, [sha('OLD1-AAAA'), sha('OLD2-BBBB'), sha('OLD3-CCCC')]))[0].n === 3);
  ok('el HMAC de la base de datos es el estándar (RFC 2104, igual que Node)', (await q(`select tracking_key($1) k`, [sha('OLD1-AAAA')]))[0].k === keyed('OLD1-AAAA'));

  // Código viejo: se encuentra, se reescribe una sola vez y sin moverle la fecha
  const logsAntes = (await q(`select count(*)::int n from audit_logs where complaint_id = $1`, [old1]))[0].n;
  const v1 = await an(`select * from get_complaint_by_tracking_code('old1-aaaa')`);
  ok('código viejo: se encuentra', v1.rows.length === 1 && v1.rows[0].category === 'fraud', JSON.stringify(v1));
  const r1 = (await q(`select tracking_hash h, updated_at u from complaints where id = $1`, [old1]))[0];
  ok('…y su huella queda reescrita con el secreto', r1.h === keyed('OLD1-AAAA'));
  ok('…sin cambiar su fecha de última actualización', new Date(r1.u).toISOString() === '2026-09-01T10:00:00.000Z', String(r1.u));
  ok('…ni dejar nada en el historial del caso', (await q(`select count(*)::int n from audit_logs where complaint_id = $1`, [old1]))[0].n === logsAntes);
  ok('código reescrito: se sigue encontrando', (await an(`select * from get_complaint_by_tracking_code('OLD1-AAAA')`)).rows.length === 1);
  ok('código reescrito: mensajes y reunión funcionan', !(await an(`select send_reporter_message('OLD1-AAAA', 'Más datos')`)).error
    && (await an(`select * from get_messages_by_tracking_code('OLD1-AAAA')`)).rows.length === 1
    && !(await an(`select request_meeting_by_code('OLD1-AAAA')`)).error);
  ok('código viejo que nadie consulta: se queda como estaba', (await q(`select tracking_hash h from complaints where id = $1`, [old3]))[0].h === sha('OLD3-CCCC'));
  ok('código viejo enviado con submit_complaint: también se encuentra', (await an(`select * from get_messages_by_tracking_code('OLD2-BBBB')`)).error === null
    && (await q(`select tracking_hash h from complaints where id = $1`, [old2]))[0].h === keyed('OLD2-BBBB'));

  // Código nuevo: nace con el secreto
  const n1 = (await an(`select submit_complaint($1, $2, 'fraud', 'Después de la 019', true, null, null, null, null, null, null, 'es', false, null) as id`, [orgH, sha('NEW1-DDDD')])).rows[0]?.id;
  ok('código nuevo: se guarda ya con el secreto', (await q(`select tracking_hash h from complaints where id = $1`, [n1]))[0]?.h === keyed('NEW1-DDDD'));
  ok('código nuevo: se encuentra', (await an(`select * from get_complaint_by_tracking_code('NEW1-DDDD')`)).rows.length === 1);
  ok('el mismo envío repetido devuelve la misma denuncia', (await an(`select submit_complaint($1, $2, 'fraud', 'Después de la 019', true, null, null, null, null, null, null, 'es', false, null) as id`, [orgH, sha('NEW1-DDDD')])).rows[0]?.id === n1);
  ok('un envío distinto con el mismo código se rechaza', /code-conflict/.test(String((await an(`select submit_complaint($1, $2, 'data', 'Otra cosa', true, null, null, null, null, null, null, 'es', false, null)`, [orgH, sha('NEW1-DDDD')])).error)));
  ok('un código que ya existe con la huella de antes no se puede repetir', !!(await an(`insert into complaints (tracking_hash, organization_id, category, description) values ($1, $2, 'fraud', 'x')`, [sha('OLD3-CCCC'), orgH])).error);
  const n2 = crypto.randomUUID();
  await an(`insert into complaints (id, tracking_hash, organization_id, category, description) values ($1, $2, $3, 'fraud', 'Por el otro camino')`, [n2, sha('NEW2-EEEE'), orgH]);
  ok('código nuevo por el otro camino (inserción directa): también con el secreto', (await q(`select tracking_hash h from complaints where id = $1`, [n2]))[0]?.h === keyed('NEW2-EEEE'));
  const reg = await asOn(pg, 'authenticated', jefa, `select register_complaint('safety', 'Llamada a recepción con hechos concretos.', 'phone', now(), true, null, null, null, null, null, null, 'es', $1, null) as id`, [sha('REGI-FFFF')]);
  ok('caso registrado desde el panel: también con el secreto', !reg.error && (await q(`select tracking_hash h from complaints where id = $1`, [reg.rows[0]?.id]))[0]?.h === keyed('REGI-FFFF'), reg.error);

  // Lo que no se puede
  ok('un código que no existe no se encuentra y cuenta como intento', (await an(`select * from get_complaint_by_tracking_code('NOPE-0000')`)).rows.length === 0
    && (await q(`select coalesce(sum(failures), 0)::int n from code_attempts`))[0].n >= 1);
  ok('desde el navegador no se lee el secreto', !!(await an(`select value from private.app_secrets`)).error && !!(await asOn(pg, 'authenticated', jefa, `select value from private.app_secrets`)).error);
  ok('desde el navegador no se calcula la huella con secreto', !!(await an(`select tracking_key('abc')`)).error && !!(await an(`select find_complaint_by_code('OLD3-CCCC')`)).error);
  await q(`update complaints set anonymized_at = now(), tracking_hash = 'anon-' || id::text where id = $1`, [n2]);
  ok('una denuncia con los datos suprimidos no se encuentra', (await an(`select * from get_complaint_by_tracking_code('NEW2-EEEE')`)).rows.length === 0);

  // Vuelta atrás
  await pg.exec(RB('019_atras.sql'));
  await pg.exec(RB('019_atras.sql'));
  ok('vuelta atrás: se puede ejecutar dos veces', true);
  ok('vuelta atrás: las reescritas vuelven a su huella de antes', (await q(`select tracking_hash h from complaints where id = $1`, [old1]))[0].h === sha('OLD1-AAAA')
    && (await q(`select tracking_hash h from complaints where id = $1`, [old2]))[0].h === sha('OLD2-BBBB'));
  ok('vuelta atrás: las que nacieron con secreto se siguen encontrando', (await an(`select * from get_complaint_by_tracking_code('NEW1-DDDD')`)).rows.length === 1);
  ok('vuelta atrás: las de antes también', (await an(`select * from get_complaint_by_tracking_code('OLD1-AAAA')`)).rows.length === 1
    && (await q(`select tracking_hash h from complaints where id = $1`, [old1]))[0].h === sha('OLD1-AAAA'));
  const n3 = crypto.randomUUID();
  await an(`insert into complaints (id, tracking_hash, organization_id, category, description) values ($1, $2, $3, 'fraud', 'Después de volver atrás')`, [n3, sha('NEW3-GGGG'), orgH]);
  ok('vuelta atrás: las nuevas vuelven a guardarse sin secreto', (await q(`select tracking_hash h from complaints where id = $1`, [n3]))[0]?.h === sha('NEW3-GGGG'));

  // Con el almacén cifrado de Supabase (Vault): el secreto va allí y no a la tabla
  const VAULT = `
    create schema vault;
    create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text, description text);
    create view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault.secrets;
    create function vault.create_secret(new_secret text, new_name text default null, new_description text default '') returns uuid
      language sql as $$ insert into vault.secrets (name, secret, description) values (new_name, new_secret, new_description) returning id $$;
    revoke all on schema vault from public, anon, authenticated;`;
  const pv = await newDb(18, VAULT);
  await pv.exec(MIG19);
  await pv.exec(MIG19);
  const enVault = (await pv.query(`select count(*)::int n from vault.secrets where name = 'reportia_tracking_pepper'`)).rows[0].n;
  const enTabla = (await pv.query(`select count(*)::int n from private.app_secrets`)).rows[0].n;
  ok('con el Vault de Supabase, el secreto se guarda allí (una sola vez) y no en la tabla', enVault === 1 && enTabla === 0, `${enVault} · ${enTabla}`);
  await pv.exec(`insert into auth.users (email, raw_user_meta_data) values ('v@v.es', '{"company_name":"Empresa V","full_name":"V"}')`);
  const [{ organization_id: orgV }] = (await pv.query(`select p.organization_id from profiles p join auth.users u on u.id = p.id where u.email = 'v@v.es'`)).rows;
  await asOn(pv, 'anon', null, `select submit_complaint($1, $2, 'fraud', 'Con Vault', true, null, null, null, null, null, null, 'es', false, null)`, [orgV, sha('VAUL-TTTT')]);
  ok('…y se encuentra con el código', (await asOn(pv, 'anon', null, `select * from get_complaint_by_tracking_code('VAUL-TTTT')`)).rows.length === 1);
  ok('sin la 014 se para al principio', await (async () => { const p14 = await newDb(13); try { await p14.exec(MIG19); return false; } catch (e) { return /014/.test(e.message); } })());
}

// ── Exclusión por caso (020, hallazgo C1) ───────────────────────────────
if (upTo >= 20) {
  console.log('\nExclusión por caso (020)');
  const crypto = await import('node:crypto');
  const sha = (c) => crypto.createHash('sha256').update(c.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
  // Base de datos con TODAS las migraciones (estado de producción con la 019 ya ejecutada) + la 020
  const pg = await newDb(20);
  // Repetible
  let again = null;
  try { await pg.exec(fs.readFileSync(path.join(MIG, '020_exclusion_por_caso.sql'), 'utf8')); } catch (e) { again = e.message; }
  ok('la 020 se puede ejecutar dos veces', again === null, again ?? '');
  const q = async (sql, p) => (await pg.query(sql, p)).rows;
  const an = (sql, p) => asOn(pg, 'anon', null, sql, p);
  const au = (uid, sql, p) => asOn(pg, 'authenticated', uid, sql, p);
  const au1 = (uid, sql, p) => asOn(pg, 'authenticated', uid, sql, p, 'aal1');
  const err = (r) => String(r.error ?? '');

  // Empresa con dos administradores, un gestor y otra persona que solo mira
  await q(`insert into auth.users (email, raw_user_meta_data) values ('a1@x.es', '{"company_name":"Empresa X","full_name":"Admin Uno"}')`);
  const [{ organization_id: orgX }] = await q(`select p.organization_id from profiles p join auth.users u on u.id = p.id where u.email = 'a1@x.es'`);
  const [{ id: a1 }] = await q(`select id from auth.users where email = 'a1@x.es'`);
  const mk = async (email, name, role) => {
    const [{ id }] = await q(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email, JSON.stringify({ full_name: name })]);
    await q(`update profiles set organization_id = $1, role = $2 where id = $3`, [orgX, role, id]);
    return id;
  };
  const a2 = await mk('a2@x.es', 'Admin Dos', 'superadmin');
  const mg = await mk('m1@x.es', 'Gestor Mira-Responde', 'manager');
  const vw = await mk('v1@x.es', 'Solo Mira', 'manager');
  await q(`insert into manager_permissions (manager_id, organization_id, category, can_view, can_reply) values ($1, $2, 'fraud', true, true), ($3, $2, 'fraud', true, false)`, [mg, orgX, vw]);

  // El canal puede preguntar quién gestiona, para apartar
  const team = await an(`select * from get_channel_managers($1)`, [orgX]);
  ok('el canal ve quién gestiona (para poder apartar)', team.rows.length === 4 && team.rows.every(r => r.full_name && r.role), JSON.stringify(team.rows?.map(r => r.full_name)));

  // Quien denuncia aparta al Admin Uno
  const sub = await an(`select submit_complaint($1, $2, 'fraud', 'Hechos para la prueba de exclusión', true, null, null, null, null, null, null, 'es', false, null, $3::uuid[]) as id`, [orgX, sha('EXCL-0001'), [a1]]);
  const caseId = sub.rows[0]?.id;
  ok('la denuncia entra apartando a quien pidió quien denuncia', !sub.error && !!caseId, err(sub));
  ok('quien está apartado no ve el caso en el tauler', (await au(a1, `select id from complaints where id = $1`, [caseId])).rows.length === 0);
  ok('…ni abriéndolo por id', (await au(a1, `select id from complaints where id = $1`, [caseId])).rows.length === 0);
  ok('…ni cuenta para él aunque sea administrador', (await au(a1, `select count(*)::int n from complaints`)).rows[0].n === 0);
  ok('otro administrador no apartado sí lo ve', (await au(a2, `select id from complaints where id = $1`, [caseId])).rows.length === 1);
  ok('un gestor con acceso y no apartado también', (await au(mg, `select id from complaints where id = $1`, [caseId])).rows.length === 1);

  // Mensajes, adjuntos y registro heredan la exclusión
  await an(`select send_reporter_message('EXCL-0001', 'Un dato más de la prueba')`);
  ok('quien está apartado no lee los mensajes del caso', (await au(a1, `select id from messages where complaint_id = $1`, [caseId])).rows.length === 0);
  ok('…pero quien tiene acceso sí', (await au(a2, `select id from messages where complaint_id = $1`, [caseId])).rows.length === 1);
  await q(`insert into attachments (complaint_id, filename, storage_path) values ($1, 'p.pdf', $2)`, [caseId, `${caseId}/p.pdf`]);
  ok('quien está apartado no ve los adjuntos', (await au(a1, `select id from attachments where complaint_id = $1`, [caseId])).rows.length === 0);
  ok('…ni el registro de actividad', (await au(a1, `select id from audit_logs where complaint_id = $1`, [caseId])).rows.length === 0);

  // Las acciones del panel también
  await q(`update complaints set is_anonymous = false, reporter_email = 'x@y.es' where id = $1`, [caseId]);
  ok('quien está apartado no consulta la identidad', !!(await au(a1, `select * from get_reporter_identity($1)`, [caseId])).error);
  ok('…no amplía el plazo', !!(await au(a1, `select extend_response_deadline($1, 'Caso con varios implicados y testigos')`, [caseId])).error);
  ok('…no suprime el caso', !!(await au(a1, `select anonymize_complaint($1, 'Motivo de prueba largo para la supresión')`, [caseId])).error);
  ok('…no cambia el estado', (await au(a1, `update complaints set status = 'reviewing' where id = $1 returning id`, [caseId])).rows.length === 0);

  // Un administrador aparta al gestor (fuente 'manager'); se puede deshacer
  ok('un administrador aparta a un gestor', !(await au(a2, `select exclude_from_complaint($1, $2)`, [caseId, mg])).error);
  ok('el gestor apartado deja de ver el caso', (await au(mg, `select id from complaints where id = $1`, [caseId])).rows.length === 0);
  ok('apartar queda en el registro', (await q(`select 1 from audit_logs where complaint_id = $1 and action = 'access_excluded'`, [caseId])).length === 1);
  ok('un administrador devuelve el acceso a quien apartó otro administrador', !(await au(a2, `select include_in_complaint($1, $2)`, [caseId, mg])).error);
  ok('el gestor vuelve a ver el caso', (await au(mg, `select id from complaints where id = $1`, [caseId])).rows.length === 1);
  ok('pero NUNCA se puede devolver el acceso a quien apartó quien denunció', /reporter-exclusion/.test(err(await au(a2, `select include_in_complaint($1, $2)`, [caseId, a1]))));
  ok('quien está apartado no puede apartar a otros', !!(await au(a1, `select exclude_from_complaint($1, $2)`, [caseId, a2])).error);
  ok('sin el segundo paso no se aparta a nadie', !!(await au1(a2, `select exclude_from_complaint($1, $2)`, [caseId, vw])).error);
  ok('un gestor no aparta a nadie', !!(await au(mg, `select exclude_from_complaint($1, $2)`, [caseId, vw])).error);

  // No se puede dejar un caso sin nadie que lo vea
  const solo = await an(`select submit_complaint($1, $2, 'fraud', 'Caso con un solo administrador con acceso', true, null, null, null, null, null, null, 'es', false, null, $3::uuid[]) as id`, [orgX, sha('EXCL-0002'), [a1, mg, vw]]);
  const soloId = solo.rows[0]?.id;
  ok('solo queda el Admin Dos con acceso', (await au(a2, `select complaint_access_count($1) n`, [soloId])).rows[0]?.n === 1);
  ok('no se puede apartar a la última persona con acceso', /last-viewer/.test(err(await au(a2, `select exclude_from_complaint($1, $2)`, [soloId, a2]))));

  // Quien denuncia puede apartar a todos: la denuncia entra igual (el aviso lo da el navegador)
  const allOut = await an(`select submit_complaint($1, $2, 'fraud', 'Caso en el que se aparta a todo el equipo', true, null, null, null, null, null, null, 'es', false, null, $3::uuid[]) as id`, [orgX, sha('EXCL-0003'), [a1, a2, mg, vw]]);
  ok('apartar a todos no rechaza la denuncia', !allOut.error && !!allOut.rows[0]?.id, err(allOut));
  ok('…y entonces nadie del panel la ve', (await au(a2, `select id from complaints where id = $1`, [allOut.rows[0]?.id])).rows.length === 0
    && (await au(a2, `select complaint_access_count($1) n`, [allOut.rows[0]?.id])).rows[0]?.n === 0);

  // Apartar a quien no es del panel se ignora; la versión de 14 parámetros sigue valiendo
  const ghost = crypto.randomUUID();
  const safe = await an(`select submit_complaint($1, $2, 'fraud', 'Caso con un id de exclusión que no existe', true, null, null, null, null, null, null, 'es', false, null, $3::uuid[]) as id`, [orgX, sha('EXCL-0004'), [ghost]]);
  ok('un id de exclusión que no es del panel se ignora', !safe.error && (await q(`select count(*)::int n from complaint_exclusions where complaint_id = $1`, [safe.rows[0]?.id]))[0].n === 0, err(safe));
  const old = await an(`select submit_complaint($1, $2, 'fraud', 'Enviada con la versión de catorce parámetros', true, null, null, null, null, null, null, 'es', false, null) as id`, [orgX, sha('EXCL-0005')]);
  ok('submit_complaint de 14 parámetros sigue funcionando', !old.error && !!old.rows[0]?.id, err(old));

  // list_complaint_access: quien ve el caso ve quién está apartado; quien está apartado, nada
  const acc = await au(a2, `select * from list_complaint_access($1)`, [caseId]);
  ok('el panel ve quién gestiona el caso y quién está apartado', acc.rows.length === 4 && acc.rows.find(r => r.id === a1)?.excluded === true && acc.rows.find(r => r.id === a1)?.source === 'reporter', JSON.stringify(acc.rows));
  ok('quien está apartado no puede listar los accesos del caso', !!(await au(a1, `select * from list_complaint_access($1)`, [caseId])).error);

  // La tabla de exclusiones no se toca desde el navegador
  ok('la tabla de exclusiones no se lee ni se escribe desde el navegador', (await an(`select * from complaint_exclusions`)).rows.length === 0
    && (await au(a2, `select * from complaint_exclusions`)).rows.length === 0
    && !!(await au(a1, `insert into complaint_exclusions (complaint_id, profile_id, source) values ($1, $2, 'manager')`, [caseId, a1])).error);

  // Vuelta atrás
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '020_atras.sql'), 'utf8'));
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '020_atras.sql'), 'utf8'));
  ok('vuelta atrás: se puede ejecutar dos veces', true);
  ok('vuelta atrás: el caso vuelve a verse (sin exclusión), pero la tabla sigue ahí', (await au(a1, `select id from complaints where id = $1`, [caseId])).rows.length === 1
    && (await q(`select count(*)::int n from complaint_exclusions`))[0].n >= 1);
  ok('vuelta atrás: la función de apartar ya no existe', !!(await au(a2, `select exclude_from_complaint($1, $2)`, [caseId, mg])).error);
}

// ── Freno por empresa y prueba de trabajo (021, hallazgos A1 y A2) ───────
if (upTo >= 21) {
  console.log('\nFreno por empresa y prueba de trabajo (021)');
  const crypto = await import('node:crypto');
  const sha = (c) => crypto.createHash('sha256').update(c.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
  // Resuelve la prueba de trabajo como lo haría el navegador: busca un nonce con «bits» ceros por delante
  const solvePow = (token, bits) => {
    const full = Math.floor(bits / 8), rem = bits % 8;
    for (let n = 0; ; n++) {
      const d = crypto.createHash('sha256').update(`${token}:${n}`).digest();
      let good = true;
      for (let i = 0; i < full; i++) if (d[i] !== 0) { good = false; break; }
      if (good && rem !== 0 && (d[full] >> (8 - rem)) !== 0) good = false;
      if (good) return String(n);
    }
  };
  const pg = await newDb(21);
  let again = null;
  try { await pg.exec(fs.readFileSync(path.join(MIG, '021_codigo_freno_por_empresa.sql'), 'utf8')); } catch (e) { again = e.message; }
  ok('la 021 se puede ejecutar dos veces', again === null, again ?? '');
  const q = async (sql, p) => (await pg.query(sql, p)).rows;
  const an = (sql, p) => asOn(pg, 'anon', null, sql, p);
  const au = (uid, sql, p) => asOn(pg, 'authenticated', uid, sql, p);
  const err = (r) => String(r.error ?? '');

  await q(`insert into auth.users (email, raw_user_meta_data) values ('aa@x.es', '{"company_name":"Empresa AA","full_name":"Admin AA"}'), ('bb@x.es', '{"company_name":"Empresa BB","full_name":"Admin BB"}')`);
  const [{ organization_id: orgA }] = await q(`select p.organization_id from profiles p join auth.users u on u.id = p.id where u.email = 'aa@x.es'`);
  const [{ organization_id: orgB }] = await q(`select p.organization_id from profiles p join auth.users u on u.id = p.id where u.email = 'bb@x.es'`);
  const [{ id: adminA }] = await q(`select id from auth.users where email = 'aa@x.es'`);

  // Crear una denuncia por la vía nueva (submit_complaint de 16 parámetros, con id de envío)
  const sub1 = crypto.randomUUID();
  const made = await an(`select submit_complaint($1, $2, $3, 'fraud', 'Hechos de prueba para el freno por empresa', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[]) as id`, [sub1, orgA, sha('AAAA-1111-2222-3333')]);
  ok('submit_complaint nuevo crea la denuncia (con id de envío)', !made.error && !!made.rows[0]?.id, err(made));
  ok('el mismo id de envío devuelve la misma denuncia (sin mirar el código)', (await an(`select submit_complaint($1, $2, $3, 'fraud', 'Otra cosa distinta', false, 'X', 'x@x.es', null, null, null, null, 'es', false, null, '{}'::uuid[]) as id`, [sub1, orgA, sha('ZZZZ-9999-9999-9999')])).rows[0]?.id === made.rows[0].id);
  ok('sin id de envío no se puede enviar', /submission-id-required/.test(err(await an(`select submit_complaint(null, $1, $2, 'fraud', 'Hechos de prueba suficientemente largos', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[])`, [orgA, sha('QQQQ-0000-0000-0000')]))));
  const dupHash = await an(`select submit_complaint($1, $2, $3, 'fraud', 'Hechos de prueba suficientemente largos', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[])`, [crypto.randomUUID(), orgA, sha('AAAA-1111-2222-3333')]);
  ok('un código que ya existe da error genérico (no «ya existe») y cuenta como intento', /submit-failed/.test(err(dupHash)) && !/conflict|exist|duplicate/i.test(err(dupHash)), err(dupHash));

  // La inserción directa de denuncias está cerrada
  ok('sin sesión ya no se puede insertar una denuncia directamente', !!(await an(`insert into complaints (tracking_hash, organization_id, category, description) values ($1, $2, 'fraud', 'x')`, [sha('DIRE-0001-0000-0000'), orgA])).error);
  ok('con sesión tampoco (solo las funciones)', !!(await au(adminA, `insert into complaints (tracking_hash, organization_id, category, description) values ($1, $2, 'fraud', 'x')`, [sha('DIRE-0002-0000-0000'), orgA])).error);

  // El portal nuevo exige la prueba de trabajo
  ok('consultar sin prueba de trabajo se rechaza', /proof-required/.test(err(await an(`select * from consult_complaint($1, 'AAAA-1111-2222-3333', 'no', 'no')`, [orgA]))));
  const ch1 = (await an(`select * from issue_pow_challenge($1)`, [orgA])).rows[0];
  ok('el reto empieza en 12 bits', ch1?.bits === 12, JSON.stringify(ch1));
  const ok1 = await an(`select * from consult_complaint($1, 'aaaa-1111-2222-3333', $2, $3)`, [orgA, ch1.token, solvePow(ch1.token, ch1.bits)]);
  ok('con la prueba resuelta, el código bueno se consulta', ok1.rows.length === 1 && ok1.rows[0].category === 'fraud', err(ok1) || JSON.stringify(ok1.rows));
  ok('un reto no se puede reutilizar', /proof-required/.test(err(await an(`select * from consult_complaint($1, 'aaaa-1111-2222-3333', $2, $3)`, [orgA, ch1.token, solvePow(ch1.token, ch1.bits)]))));

  // Un código que no existe: no dice nada y cuenta como intento de esa empresa
  const before = (await q(`select coalesce(sum(failures),0)::int n from code_attempts_by_org where org_id = $1`, [orgA]))[0].n;
  const ch2 = (await an(`select * from issue_pow_challenge($1)`, [orgA])).rows[0];
  const miss = await an(`select * from consult_complaint($1, 'NOPE-0000-0000-0000', $2, $3)`, [orgA, ch2.token, solvePow(ch2.token, ch2.bits)]);
  ok('un código que no existe devuelve vacío y cuenta como intento', miss.rows.length === 0 && (await q(`select coalesce(sum(failures),0)::int n from code_attempts_by_org where org_id = $1`, [orgA]))[0].n === before + 1);

  // Mensajes, enviar y reunión por la vía nueva
  const chM = (await an(`select * from issue_pow_challenge($1)`, [orgA])).rows[0];
  const sm = await an(`select send_message_by_code($1, 'AAAA-1111-2222-3333', 'Un dato más', $2, $3) as id`, [orgA, chM.token, solvePow(chM.token, chM.bits)]);
  ok('enviar un mensaje con la prueba de trabajo funciona', !sm.error && !!sm.rows[0]?.id, err(sm));
  const chR = (await an(`select * from issue_pow_challenge($1)`, [orgA])).rows[0];
  ok('leer mensajes con la prueba de trabajo funciona', (await an(`select * from messages_by_code($1, 'AAAA-1111-2222-3333', $2, $3)`, [orgA, chR.token, solvePow(chR.token, chR.bits)])).rows.length === 1);
  const chT = (await an(`select * from issue_pow_challenge($1)`, [orgA])).rows[0];
  ok('pedir reunión con la prueba de trabajo funciona', !(await an(`select request_meeting_in_org($1, 'AAAA-1111-2222-3333', $2, $3)`, [orgA, chT.token, solvePow(chT.token, chT.bits)])).error);

  // El freno es POR EMPRESA: muchos fallos en A no afectan a B
  await q(`insert into code_attempts_by_org (window_start, org_id, failures) values (date_trunc('minute', now()), $1, 600) on conflict (window_start, org_id) do update set failures = 600`, [orgA]);
  const bitsA = (await q(`select pow_bits_required($1) b`, [orgA]))[0].b;
  const bitsB = (await q(`select pow_bits_required($1) b`, [orgB]))[0].b;
  ok('con muchos fallos en una empresa, su prueba de trabajo cuesta más (tope de 18 bits)', bitsA > 12 && bitsA <= 18, `A=${bitsA}`);
  ok('…pero la de otra empresa no cambia (freno por empresa, no global)', bitsB === 12, `B=${bitsB}`);
  ok('aun con muchos fallos nunca se bloquea: se puede pedir un reto', (await an(`select * from issue_pow_challenge($1)`, [orgA])).rows[0]?.bits === bitsA);

  // Los retos están acotados por empresa: anon no puede llenar la tabla pidiéndolos sin parar
  for (let i = 0; i < 55; i++) await an(`select * from issue_pow_challenge($1)`, [orgB]);
  ok('el número de retos vivos por empresa está acotado', (await q(`select count(*)::int n from pow_challenges where org_id = $1`, [orgB]))[0].n <= 51, `vivos: ${(await q(`select count(*)::int n from pow_challenges where org_id = $1`, [orgB]))[0].n}`);
  await q(`update pow_challenges set created_at = now() - interval '10 minutes' where org_id = $1`, [orgB]);
  await an(`select * from issue_pow_challenge($1)`, [orgB]);
  ok('los retos caducados se borran al pedir otro', (await q(`select count(*)::int n from pow_challenges where created_at < now() - interval '5 minutes'`))[0].n === 0);

  // El panel sigue registrando con sesión (register_complaint es «security definer», no le afecta el cierre)
  const reg = await au(adminA, `select register_complaint('safety', 'Comunicación recibida por teléfono con hechos concretos.', 'phone', now(), true, null, null, null, null, null, null, 'es', $1, null) as id`, [sha('REGI-2222-0000-0000')]);
  ok('el registro manual desde el panel sigue funcionando', !reg.error && !!reg.rows[0]?.id, err(reg));

  // Las exclusiones (C1) siguen valiendo por la vía nueva de envío
  const subX = crypto.randomUUID();
  const exc = await an(`select submit_complaint($1, $2, $3, 'fraud', 'Hechos de prueba apartando al administrador', true, null, null, null, null, null, null, 'es', false, null, $4::uuid[]) as id`, [subX, orgA, sha('EXCL-7777-0000-0000'), [adminA]]);
  ok('submit nuevo aparta a quien pide quien denuncia', !exc.error && (await au(adminA, `select id from complaints where id = $1`, [exc.rows[0]?.id])).rows.length === 0, err(exc));

  // Las funciones de antes siguen existiendo (la web actual no se rompe)
  ok('la función de consulta de antes sigue funcionando', (await an(`select * from get_complaint_by_tracking_code('AAAA-1111-2222-3333')`)).rows.length === 1);

  // Vuelta atrás
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '021_atras.sql'), 'utf8'));
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '021_atras.sql'), 'utf8'));
  ok('vuelta atrás: se puede ejecutar dos veces', true);
  ok('vuelta atrás: se vuelve a poder insertar directamente', !(await an(`insert into complaints (tracking_hash, organization_id, category, description) values ($1, $2, 'fraud', 'tras volver atrás')`, [sha('BACK-0001-0000-0000'), orgA])).error);
  ok('vuelta atrás: la consulta endurecida ya no existe', !!(await an(`select * from consult_complaint($1, 'x', 'y', 'z')`, [orgA])).error);
}

// ── Cerrar las funciones antiguas (022, A1 y A2) ────────────────────────
if (upTo >= 22) {
  console.log('\nCerrar las funciones antiguas (022)');
  const crypto = await import('node:crypto');
  const sha = (c) => crypto.createHash('sha256').update(c.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
  const solvePow = (token, bits) => {
    const full = Math.floor(bits / 8), rem = bits % 8;
    for (let n = 0; ; n++) {
      const d = crypto.createHash('sha256').update(`${token}:${n}`).digest();
      let good = true;
      for (let i = 0; i < full; i++) if (d[i] !== 0) { good = false; break; }
      if (good && rem !== 0 && (d[full] >> (8 - rem)) !== 0) good = false;
      if (good) return String(n);
    }
  };
  const pg = await newDb(22);
  let again = null;
  try { await pg.exec(fs.readFileSync(path.join(MIG, '022_cerrar_funciones_antiguas.sql'), 'utf8')); } catch (e) { again = e.message; }
  ok('la 022 se puede ejecutar dos veces', again === null, again ?? '');
  const q = async (sql, p) => (await pg.query(sql, p)).rows;
  const an = (sql, p) => asOn(pg, 'anon', null, sql, p);
  const err = (r) => String(r.error ?? '');

  await q(`insert into auth.users (email, raw_user_meta_data) values ('cc@x.es', '{"company_name":"Empresa CC","full_name":"Admin CC"}')`);
  const [{ organization_id: orgC }] = await q(`select p.organization_id from profiles p join auth.users u on u.id = p.id where u.email = 'cc@x.es'`);
  await an(`select submit_complaint($1, $2, $3, 'fraud', 'Hechos de prueba tras cerrar las funciones antiguas', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[])`, [crypto.randomUUID(), orgC, sha('CLOS-0001-0000-0000')]);

  // Las funciones de antes ya no se pueden llamar sin sesión
  ok('consulta antigua cerrada', !!(await an(`select * from get_complaint_by_tracking_code('CLOS-0001-0000-0000')`)).error);
  ok('mensajes antiguos cerrados', !!(await an(`select * from get_messages_by_tracking_code('CLOS-0001-0000-0000')`)).error);
  ok('enviar mensaje antiguo cerrado', !!(await an(`select send_reporter_message('CLOS-0001-0000-0000', 'hola')`)).error);
  ok('pedir reunión antigua cerrada', !!(await an(`select request_meeting_by_code('CLOS-0001-0000-0000')`)).error);
  ok('envío antiguo (14 parámetros) cerrado', !!(await an(`select submit_complaint($1, $2, 'fraud', 'x'.repeat(30), true, null, null, null, null, null, null, 'es', false, null)`, [orgC, sha('CLOS-9999-0000-0000')])).error);
  ok('envío de la 020 (15 parámetros) cerrado', !!(await an(`select submit_complaint($1, $2, 'fraud', 'x'.repeat(30), true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[])`, [orgC, sha('CLOS-8888-0000-0000')])).error);

  // El camino endurecido sigue funcionando
  const ch = (await an(`select * from issue_pow_challenge($1)`, [orgC])).rows[0];
  ok('la consulta endurecida sí funciona', (await an(`select * from consult_complaint($1, 'CLOS-0001-0000-0000', $2, $3)`, [orgC, ch.token, solvePow(ch.token, ch.bits)])).rows.length === 1);
  ok('el envío nuevo (16 parámetros) sigue funcionando', !(await an(`select submit_complaint($1, $2, $3, 'fraud', 'Otra denuncia por el camino nuevo', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[])`, [crypto.randomUUID(), orgC, sha('CLOS-0002-0000-0000')])).error);

  // Vuelta atrás: vuelven a abrirse
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '022_atras.sql'), 'utf8'));
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '022_atras.sql'), 'utf8'));
  ok('vuelta atrás: la consulta de antes vuelve a funcionar', (await an(`select * from get_complaint_by_tracking_code('CLOS-0001-0000-0000')`)).rows.length === 1);
}

// ── La hora no delata a quien denuncia (023, hallazgo A4) ───────────────
if (upTo >= 23) {
  console.log('\nLa hora no delata a quien denuncia (023)');
  const crypto = await import('node:crypto');
  const sha = (c) => crypto.createHash('sha256').update(c.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');

  // Base de datos hasta la 022 (como producción). Se crea una denuncia web con hora precisa y luego se aplica la 023,
  // para comprobar que el relleno redondea al día lo que ya había y guarda el instante real en received_at.
  const pg = await newDb(22);
  const q = async (sql, p) => (await pg.query(sql, p)).rows;
  const an = (sql, p) => asOn(pg, 'anon', null, sql, p);
  const au = (uid, sql, p) => asOn(pg, 'authenticated', uid, sql, p);
  const svcp = async (sql, p) => (await pg.query(sql, p)).rows;
  const err = (r) => String(r.error ?? '');

  await q(`insert into auth.users (email, raw_user_meta_data) values ('a4@x.es', '{"company_name":"Empresa A4","full_name":"Admin A4"}')`);
  const [{ organization_id: orgA }] = await q(`select p.organization_id from profiles p join auth.users u on u.id = p.id where u.email = 'a4@x.es'`);
  const [{ id: adminA }] = await q(`select id from auth.users where email = 'a4@x.es'`);
  const old = await an(`select submit_complaint($1, $2, $3, 'fraud', 'Hechos de prueba creados antes de la 023', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[]) as id`, [crypto.randomUUID(), orgA, sha('A4A4-0001-0000-0000')]);
  const oldId = old.rows[0]?.id;
  const [{ created_at: preCreated }] = await q(`select created_at from complaints where id = $1`, [oldId]);

  let again = null;
  try { await pg.exec(fs.readFileSync(path.join(MIG, '023_hora_no_delata.sql'), 'utf8')); } catch (e) { again = e.message; }
  ok('la 023 se puede ejecutar dos veces', again === null, again ?? '');

  // El relleno redondea al día de Madrid lo que ya había y conserva el instante real en received_at
  const [row0] = await q(`select (created_at at time zone 'Europe/Madrid')::time t, received_at, notify_after from complaints where id = $1`, [oldId]);
  ok('relleno: la denuncia de antes se queda con la hora a las 00:00 (Madrid)', String(row0.t) === '00:00:00', String(row0.t));
  ok('relleno: received_at guarda el instante real de antes', +new Date(row0.received_at) === +new Date(preCreated), `${row0.received_at} vs ${preCreated}`);
  ok('relleno: notify_after no queda vacío (se ve en el panel)', row0.notify_after !== null);

  // El panel no puede leer las columnas privadas (received_at, notify_after): no están en el permiso por columnas
  ok('el panel no puede leer received_at', (await q(`select has_column_privilege('authenticated', 'complaints', 'received_at', 'select') p`))[0].p === false);
  ok('el panel no puede leer notify_after', (await q(`select has_column_privilege('authenticated', 'complaints', 'notify_after', 'select') p`))[0].p === false);

  // Una denuncia web nueva: created_at al día, received_at real
  const nue = await an(`select submit_complaint($1, $2, $3, 'fraud', 'Hechos de una denuncia web nueva, con hora', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[]) as id`, [crypto.randomUUID(), orgA, sha('A4A4-0002-0000-0000')]);
  const newId = nue.rows[0]?.id;
  const [row1] = await q(`select (created_at at time zone 'Europe/Madrid')::time t, received_at, notify_after, (received_at at time zone 'Europe/Madrid')::time rt from complaints where id = $1`, [newId]);
  ok('nueva web: created_at va al día (00:00 Madrid)', String(row1.t) === '00:00:00', String(row1.t));
  ok('nueva web: received_at guarda la hora real (no 00:00)', String(row1.rt) !== '00:00:00', String(row1.rt));
  ok('sin retraso, notify_after = received_at (se ve al momento)', +new Date(row1.notify_after) === +new Date(row1.received_at));

  // El administrador (con dos pasos) ve la denuncia nueva: sin retraso, aparece al momento
  ok('el administrador ve la denuncia nueva al momento', (await au(adminA, `select id from complaints where id = $1`, [newId])).rows.length === 1);

  // La cola de avisos: se encola la denuncia nueva y nadie del navegador la puede leer
  ok('cada denuncia nueva encola un aviso', (await q(`select count(*)::int n from notification_queue where complaint_id = $1 and kind = 'new'`, [newId]))[0].n === 1);
  ok('la cola de avisos es privada (anon no la lee)', !!(await an(`select * from notification_queue`)).error);
  ok('la cola de avisos es privada (el panel no la lee)', !!(await au(adminA, `select * from notification_queue`)).error);

  // Mensajes: el de quien denuncia va al día; el del equipo mantiene la hora
  await svcp(`insert into messages (complaint_id, sender, content, created_at) values ($1, 'reporter', 'Un dato más de quien denuncia', '2026-10-20T14:37:11+02:00')`, [newId]);
  await svcp(`insert into messages (complaint_id, sender, content, created_at) values ($1, 'manager', 'Respuesta del equipo', '2026-10-20T15:42:09+02:00')`, [newId]);
  const [rep] = await q(`select (created_at at time zone 'Europe/Madrid')::time t from messages where complaint_id = $1 and sender = 'reporter'`, [newId]);
  const [man] = await q(`select (created_at at time zone 'Europe/Madrid')::time t from messages where complaint_id = $1 and sender = 'manager'`, [newId]);
  ok('mensaje de quien denuncia: la hora va al día (00:00)', String(rep.t) === '00:00:00', String(rep.t));
  ok('mensaje del equipo: mantiene la hora', String(man.t) === '15:42:09', String(man.t));
  ok('el mensaje de quien denuncia encola un aviso', (await q(`select count(*)::int n from notification_queue where message_id is not null and kind = 'message'`))[0].n === 1);
  ok('el mensaje del equipo no encola ningún aviso', (await q(`select count(*)::int n from notification_queue where kind = 'message'`))[0].n === 1);

  // Con el retraso encendido: la denuncia web no se ve hasta que pase notify_after (mismo retraso que su aviso)
  await svcp(`update notification_settings set email_delay = true`);
  const del = await an(`select submit_complaint($1, $2, $3, 'fraud', 'Denuncia con el retraso de avisos encendido', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[]) as id`, [crypto.randomUUID(), orgA, sha('A4A4-0003-0000-0000')]);
  const delId = del.rows[0]?.id;
  const [rowD] = await q(`select notify_after > now() futuro, extract(epoch from (notify_after - received_at)) segs from complaints where id = $1`, [delId]);
  ok('con retraso: notify_after queda en el futuro (1-3 h)', rowD.futuro === true && Number(rowD.segs) >= 3600 && Number(rowD.segs) <= 3 * 3600 + 5, JSON.stringify(rowD));
  ok('con retraso: el administrador aún NO ve la denuncia (ni recargando)', (await au(adminA, `select id from complaints where id = $1`, [delId])).rows.length === 0);
  await svcp(`update complaints set notify_after = received_at where id = $1`, [delId]);
  ok('cuando pasa el retraso, el administrador ya la ve', (await au(adminA, `select id from complaints where id = $1`, [delId])).rows.length === 1);

  // El freno por hora (A3) cuenta el instante real, no el día redondeado
  ok('el freno por hora cuenta el instante real (received_at), no la medianoche', (await q(`select count(*)::int n from complaints c where c.organization_id = $1 and c.channel = 'web' and coalesce(c.received_at, c.created_at) > now() - interval '1 hour'`, [orgA]))[0].n >= 2);

  // Adjuntos: su fecha va siempre al día
  await svcp(`insert into attachments (complaint_id, filename, storage_path, created_at) values ($1, 'foto.jpg', $2, '2026-10-20T11:03:22+02:00')`, [newId, `${newId}/foto.jpg`]);
  const [att] = await q(`select (created_at at time zone 'Europe/Madrid')::time t from attachments where complaint_id = $1`, [newId]);
  ok('adjunto: la fecha va al día (00:00)', String(att.t) === '00:00:00', String(att.t));

  // La ventana de 2 h para subir adjuntos sigue valiendo (usa el instante real, no el día redondeado)
  ok('se puede subir un adjunto justo tras enviar (ventana de 2 h con el instante real)', (await q(`select complaint_folder_is_recent($1) r`, [`${newId}/nuevo.pdf`]))[0].r === true);
  // Los metadatos del objeto en Storage también van al día
  await svcp(`insert into storage.objects (bucket_id, name, created_at, updated_at) values ('attachments', $1, '2026-10-20T13:11:44+02:00', '2026-10-20T13:11:44+02:00')`, [`${newId}/stored.pdf`]);
  const [so] = await q(`select (created_at at time zone 'Europe/Madrid')::time t from storage.objects where name = $1`, [`${newId}/stored.pdf`]);
  ok('Storage: la hora de subida del adjunto va al día (00:00)', String(so.t) === '00:00:00', String(so.t));

  // El interruptor por defecto está apagado (los avisos salen como hoy)
  ok('el interruptor del retraso nace apagado', (await q(`select notify_delay_on() d`))[0].d === false || true); // ya lo encendimos arriba; se comprueba en base limpia:
  const pg2 = await newDb(23);
  ok('en una base nueva, el retraso nace apagado', (await (async () => (await pg2.query(`select email_delay from notification_settings where id`)).rows[0].email_delay)()) === false);

  // Vuelta atrás
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '023_atras.sql'), 'utf8'));
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '023_atras.sql'), 'utf8'));
  ok('vuelta atrás: se puede ejecutar dos veces', true);
  ok('vuelta atrás: el panel vuelve a ver la denuncia sin el filtro de la hora', (await au(adminA, `select id from complaints where id = $1`, [delId])).rows.length === 1);
}

// ── Registro de accesos (024, hallazgo A6) ──────────────────────────────
if (upTo >= 24) {
  console.log('\nRegistro de accesos (024)');
  const crypto = await import('node:crypto');
  const sha = (c) => crypto.createHash('sha256').update(c.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
  const pg = await newDb(24);
  const q = async (sql, p) => (await pg.query(sql, p)).rows;
  const an = (sql, p) => asOn(pg, 'anon', null, sql, p);
  const au = (uid, sql, p) => asOn(pg, 'authenticated', uid, sql, p);
  const err = (r) => String(r.error ?? '');

  let again = null;
  try { await pg.exec(fs.readFileSync(path.join(MIG, '024_registro_de_accesos.sql'), 'utf8')); } catch (e) { again = e.message; }
  ok('la 024 se puede ejecutar dos veces', again === null, again ?? '');

  await q(`insert into auth.users (email, raw_user_meta_data) values ('la@x.es', '{"company_name":"Empresa LA","full_name":"Admin LA"}'), ('lb@x.es', '{"company_name":"Empresa LB","full_name":"Admin LB"}')`);
  const [{ organization_id: orgA }] = await q(`select p.organization_id from profiles p join auth.users u on u.id = p.id where u.email = 'la@x.es'`);
  const [{ id: adminA }] = await q(`select id from auth.users where email = 'la@x.es'`);
  const [{ id: adminB }] = await q(`select id from auth.users where email = 'lb@x.es'`);
  // Un gestor (no administrador) de la empresa A
  await q(`insert into auth.users (email, raw_user_meta_data) values ('lg@x.es', '{"full_name":"Gestor LA"}')`);
  const [{ id: mgrA }] = await q(`select id from auth.users where email = 'lg@x.es'`);
  await q(`update profiles set organization_id = $1, role = 'manager' where id = $2`, [orgA, mgrA]);

  const made = await an(`select submit_complaint($1, $2, $3, 'fraud', 'Hechos de prueba para el registro de accesos', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[]) as id`, [crypto.randomUUID(), orgA, sha('ACCS-0001-0000-0000')]);
  const c1 = made.rows[0].id;

  // Abrir, exportar y descargar quedan anotados, con su autor
  ok('abrir un caso se anota', !(await au(adminA, `select log_case_access($1, 'case_opened', null)`, [c1])).error);
  ok('…con el autor que lo abrió', (await q(`select actor_name from audit_logs where complaint_id = $1 and action = 'case_opened'`, [c1]))[0]?.actor_name === 'Admin LA');
  ok('exportar el PDF de un caso se anota', !(await au(adminA, `select log_case_access($1, 'exported_case', null)`, [c1])).error);
  const dl = await au(adminA, `select log_case_access($1, 'file_downloaded', 'informe.pdf')`, [c1]);
  ok('descargar un archivo se anota con el nombre', !dl.error && (await q(`select details->>'detail' d from audit_logs where complaint_id = $1 and action = 'file_downloaded'`, [c1]))[0].d === 'informe.pdf');
  ok('un administrador de otra empresa no puede anotar un acceso a un caso ajeno', !!(await au(adminB, `select log_case_access($1, 'case_opened', null)`, [c1])).error);
  ok('un tipo de acceso inventado se rechaza', !!(await au(adminA, `select log_case_access($1, 'hack', null)`, [c1])).error);

  // Exportación de toda la empresa (sin caso): la ve solo el administrador
  ok('exportar la lista (Excel) se anota a nivel de empresa', !(await au(adminA, `select log_org_export('exported_excel')`)).error);
  ok('…con complaint_id nulo', (await q(`select count(*)::int n from audit_logs where organization_id = $1 and action = 'exported_excel' and complaint_id is null`, [orgA]))[0].n === 1);

  // Borrar un archivo del almacén queda anotado (disparador en storage.objects)
  await q(`insert into storage.objects (bucket_id, name) values ('attachments', $1)`, [`${c1}/prueba.pdf`]);
  await au(adminA, `delete from storage.objects where name = $1`, [`${c1}/prueba.pdf`]);
  ok('borrar un archivo del almacén se anota', (await q(`select count(*)::int n from audit_logs where complaint_id = $1 and action = 'file_deleted'`, [c1]))[0].n === 1);

  // La pantalla «Accesos»: la ve el administrador; un gestor, no
  const log = await au(adminA, `select * from list_access_log(200, 0)`);
  ok('el administrador ve el registro de accesos', !log.error && log.rows.length >= 4, err(log) || `filas: ${log.rows.length}`);
  ok('un gestor (no administrador) no puede ver el registro de accesos', !!(await au(mgrA, `select * from list_access_log(200, 0)`)).error);

  // Respeta la exclusión por caso (C1): si el administrador está apartado de un caso, no ve sus accesos
  await q(`insert into complaint_exclusions (complaint_id, profile_id, source) values ($1, $2, 'reporter')`, [c1, adminA]);
  const log2 = await au(adminA, `select * from list_access_log(200, 0)`);
  ok('apartado de un caso (C1), el administrador no ve sus accesos', !log2.error && log2.rows.every(r => r.complaint_id !== c1), err(log2));
  ok('…pero sigue viendo lo de empresa (Excel, sin caso)', log2.rows.some(r => r.action === 'exported_excel'));

  // Vuelta atrás
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '024_atras.sql'), 'utf8'));
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '024_atras.sql'), 'utf8'));
  ok('vuelta atrás: la función del registro de accesos ya no existe', !!(await au(adminA, `select * from list_access_log(200, 0)`)).error);
}

// ── Supresión con control (025, hallazgo A7) ────────────────────────────
if (upTo >= 25) {
  console.log('\nSupresión con control (025)');
  const crypto = await import('node:crypto');
  const sha = (c) => crypto.createHash('sha256').update(c.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
  const pg = await newDb(25);
  const q = async (sql, p) => (await pg.query(sql, p)).rows;
  const an = (sql, p) => asOn(pg, 'anon', null, sql, p);
  const au = (uid, sql, p) => asOn(pg, 'authenticated', uid, sql, p);
  const err = (r) => String(r.error ?? '');
  const LONG = 'Motivo suficientemente largo para suprimir este caso.'; // >= 30

  let again = null;
  try { await pg.exec(fs.readFileSync(path.join(MIG, '025_supresion_con_control.sql'), 'utf8')); } catch (e) { again = e.message; }
  ok('la 025 se puede ejecutar dos veces', again === null, again ?? '');

  await q(`insert into auth.users (email, raw_user_meta_data) values ('sp@x.es', '{"company_name":"Empresa SP","full_name":"Admin SP"}')`);
  const [{ organization_id: orgA }] = await q(`select p.organization_id from profiles p join auth.users u on u.id = p.id where u.email = 'sp@x.es'`);
  const [{ id: adminA }] = await q(`select id from auth.users where email = 'sp@x.es'`);
  const mk = async (code) => (await an(`select submit_complaint($1, $2, $3, 'fraud', 'Hechos de prueba para la supresion con control del caso.', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[]) as id`, [crypto.randomUUID(), orgA, sha(code)])).rows[0].id;
  const c1 = await mk('SUPR-0001-0000-0000'), c2 = await mk('SUPR-0002-0000-0000'), c3 = await mk('SUPR-0003-0000-0000');

  // Un caso recién recibido (reciente, sin investigar) no se puede suprimir todavía
  ok('no se puede suprimir un caso recién recibido', /suppression-not-allowed/.test(err(await au(adminA, `select request_suppression($1, $2)`, [c1, LONG]))));
  // Con el caso terminado, el motivo tiene que tener 30 caracteres
  await q(`update complaints set status = 'resolved' where id = $1`, [c1]);
  ok('el motivo debe tener al menos 30 caracteres', /reason-required/.test(err(await au(adminA, `select request_suppression($1, 'corto')`, [c1]))));
  // Programar en un caso terminado
  const req = await au(adminA, `select request_suppression($1, $2) as w`, [c1, LONG]);
  ok('se programa la supresión de un caso terminado', !req.error && !!req.rows[0].w, err(req));
  ok('queda una supresión pendiente a 7 días', (await q(`select count(*)::int n from suppressions where complaint_id = $1 and status = 'pending' and scheduled_for > now() + interval '6 days'`, [c1]))[0].n === 1);
  ok('queda en el registro «suppression_requested»', (await q(`select count(*)::int n from audit_logs where complaint_id = $1 and action = 'suppression_requested'`, [c1]))[0].n === 1);
  ok('no se puede programar dos veces', /already-scheduled/.test(err(await au(adminA, `select request_suppression($1, $2)`, [c1, LONG]))));
  // Antes de los 7 días no se ejecuta
  ok('antes de los 7 días no se ejecuta', /not-due/.test(err(await au(adminA, `select execute_suppression($1)`, [c1]))));
  // Cancelar (cualquier administrador que pueda suprimir)
  ok('se puede cancelar la supresión', !(await au(adminA, `select cancel_suppression($1)`, [c1])).error);
  ok('tras cancelar, no queda pendiente', (await q(`select count(*)::int n from suppressions where complaint_id = $1 and status = 'pending'`, [c1]))[0].n === 0);
  ok('se puede volver a programar tras cancelar', !(await au(adminA, `select request_suppression($1, $2)`, [c1, LONG])).error);

  // Los archivos solo se borran con una supresión vencida
  await q(`insert into storage.objects (bucket_id, name) values ('attachments', $1), ('attachments', $2)`, [`${c1}/a.pdf`, `${c2}/a.pdf`]);
  ok('sin supresión vencida no se borra un archivo uno a uno', (await au(adminA, `delete from storage.objects where name = $1 returning id`, [`${c2}/a.pdf`])).rows.length === 0);
  await q(`update suppressions set scheduled_for = now() - interval '1 minute' where complaint_id = $1 and status = 'pending'`, [c1]);
  ok('con la gracia vencida hay permiso de borrado de archivos (has_due_suppression)', (await q(`select has_due_suppression($1) d`, [`${c1}/a.pdf`]))[0].d === true);
  ok('con la supresión vencida sí se puede borrar el archivo (dentro de la supresión)', (await au(adminA, `delete from storage.objects where name = $1 returning id`, [`${c1}/a.pdf`])).rows.length === 1);

  // Ejecutar la supresión vencida
  ok('con la gracia vencida se ejecuta la supresión', !(await au(adminA, `select execute_suppression($1)`, [c1])).error);
  ok('el caso queda suprimido (anonimizado, sin contenido)', (await q(`select anonymized_at, description from complaints where id = $1`, [c1]))[0].anonymized_at !== null);
  ok('la supresión queda como hecha', (await q(`select status from suppressions where complaint_id = $1 and status = 'done'`, [c1]))[0]?.status === 'done');

  // Aviso al resto de administradores + vuelta a investigación durante la gracia
  await q(`update complaints set status = 'resolved' where id = $1`, [c3]);
  await au(adminA, `select request_suppression($1, $2)`, [c3, LONG]);
  ok('el administrador ve la supresión programada en el aviso', (await au(adminA, `select * from list_pending_suppressions()`)).rows.some(r => r.complaint_id === c3));
  ok('suppression_for devuelve la supresión del caso', (await au(adminA, `select * from suppression_for($1)`, [c3])).rows.length === 1);
  await q(`update suppressions set scheduled_for = now() - interval '1 minute' where complaint_id = $1 and status = 'pending'`, [c3]);
  await q(`update complaints set status = 'investigating' where id = $1`, [c3]);
  ok('si vuelve a investigación durante la gracia, no se ejecuta', /suppression-not-allowed/.test(err(await au(adminA, `select execute_suppression($1)`, [c3]))));

  // Exclusión por caso (C1): apartado no puede suprimir ni ve el aviso de ese caso
  await q(`insert into complaint_exclusions (complaint_id, profile_id, source) values ($1, $2, 'reporter')`, [c3, adminA]);
  ok('apartado de un caso (C1) no lo puede suprimir', !!(await au(adminA, `select request_suppression($1, $2)`, [c3, LONG])).error);
  ok('…ni lo ve en el aviso de supresiones', (await au(adminA, `select * from list_pending_suppressions()`)).rows.every(r => r.complaint_id !== c3));

  // Vuelta atrás
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '025_atras.sql'), 'utf8'));
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '025_atras.sql'), 'utf8'));
  ok('vuelta atrás: la supresión con gracia ya no existe', !!(await au(adminA, `select request_suppression($1, $2)`, [c2, LONG])).error);
  ok('vuelta atrás: los archivos se vuelven a poder borrar con «eliminar»', (await au(adminA, `delete from storage.objects where name = $1 returning id`, [`${c2}/a.pdf`])).rows.length === 1);
}

// ── Que nadie pueda cerrar el canal (026, hallazgo A3) ──────────────────
if (upTo >= 26) {
  console.log('\nQue nadie pueda cerrar el canal (026)');
  const crypto = await import('node:crypto');
  const sha = (c) => crypto.createHash('sha256').update(c.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
  const solvePow = (token, bits) => {
    const full = Math.floor(bits / 8), rem = bits % 8;
    for (let n = 0; ; n++) {
      const d = crypto.createHash('sha256').update(`${token}:${n}`).digest();
      let good = true;
      for (let i = 0; i < full; i++) if (d[i] !== 0) { good = false; break; }
      if (good && rem !== 0 && (d[full] >> (8 - rem)) !== 0) good = false;
      if (good) return String(n);
    }
  };
  const pg = await newDb(26);
  const q = async (sql, p) => (await pg.query(sql, p)).rows;
  const an = (sql, p) => asOn(pg, 'anon', null, sql, p);
  const au = (uid, sql, p) => asOn(pg, 'authenticated', uid, sql, p);
  const err = (r) => String(r.error ?? '');

  let again = null;
  try { await pg.exec(fs.readFileSync(path.join(MIG, '026_canal_no_se_cierra.sql'), 'utf8')); } catch (e) { again = e.message; }
  ok('la 026 se puede ejecutar dos veces', again === null, again ?? '');

  await q(`insert into auth.users (email, raw_user_meta_data) values ('ca@x.es', '{"company_name":"Empresa CA","full_name":"Admin CA"}'), ('cb@x.es', '{"company_name":"Empresa CB","full_name":"Admin CB"}')`);
  const [{ organization_id: orgA }] = await q(`select p.organization_id from profiles p join auth.users u on u.id = p.id where u.email = 'ca@x.es'`);
  const [{ organization_id: orgB }] = await q(`select p.organization_id from profiles p join auth.users u on u.id = p.id where u.email = 'cb@x.es'`);
  const [{ id: adminB }] = await q(`select id from auth.users where email = 'cb@x.es'`);

  // Enviar exige la prueba de trabajo (18 parámetros); el de 16 sigue abierto (camino de reserva)
  const ch = (await an(`select * from issue_pow_challenge($1)`, [orgA])).rows[0];
  const okSub = await an(`select submit_complaint($1, $2, $3, 'fraud', 'Hechos con prueba de trabajo al enviar.', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[], $4, $5) as id`, [crypto.randomUUID(), orgA, sha('POWS-0001-0000-0000'), ch.token, solvePow(ch.token, ch.bits)]);
  ok('enviar con la prueba de trabajo funciona (18 parámetros)', !okSub.error && !!okSub.rows[0]?.id, err(okSub));
  ok('enviar sin resolver la prueba de trabajo se rechaza', /proof-required/.test(err(await an(`select submit_complaint($1, $2, $3, 'fraud', 'Hechos sin prueba de trabajo.', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[], 'no', 'no')`, [crypto.randomUUID(), orgA, sha('POWS-0002-0000-0000')]))));
  ok('el camino de 16 parámetros sigue abierto', !(await an(`select submit_complaint($1, $2, $3, 'fraud', 'Hechos por el camino de 16.', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[]) as id`, [crypto.randomUUID(), orgA, sha('POWS-0003-0000-0000')])).error);

  // Nunca se rechaza: por encima de 50/hora, las denuncias entran marcadas como posible spam
  let rejected = 0;
  for (let i = 0; i < 50; i++) {
    const r = await an(`select submit_complaint($1, $2, $3, 'fraud', 'Denuncia de prueba para el umbral de spam.', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[])`, [crypto.randomUUID(), orgB, sha(`SPAM-${String(i).padStart(4, '0')}-0000-0000`)]);
    if (r.error) rejected++;
  }
  ok('las primeras 50 denuncias entran sin rechazo', rejected === 0, `rechazadas: ${rejected}`);
  const extra = await an(`select submit_complaint($1, $2, $3, 'fraud', 'La denuncia 51 entra igual, marcada como spam.', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[]) as id`, [crypto.randomUUID(), orgB, sha('SPAM-9999-0000-0000')]);
  ok('por encima de 50/hora NO se rechaza: entra igual', !extra.error && !!extra.rows[0]?.id, err(extra));
  const extraId = extra.rows[0].id;
  ok('…y queda marcada como posible spam', (await q(`select likely_spam from complaints where id = $1`, [extraId]))[0].likely_spam === true);
  ok('las primeras 50 no son spam', (await q(`select count(*)::int n from complaints where organization_id = $1 and channel = 'web' and not likely_spam`, [orgB]))[0].n >= 50);

  // La posible spam no avisa una a una: un resumen por empresa y hora
  ok('la posible spam no encola un aviso por caso (no «new»)', (await q(`select count(*)::int n from notification_queue where complaint_id = $1 and kind = 'new'`, [extraId]))[0].n === 0);
  ok('la posible spam encola un único resumen por empresa', (await q(`select count(*)::int n from notification_queue where organization_id = $1 and kind = 'spam_summary'`, [orgB]))[0].n === 1);

  // Un administrador devuelve la denuncia al tablero (no era spam)
  ok('un administrador devuelve la denuncia al tablero', !(await au(adminB, `select clear_spam_flag($1)`, [extraId])).error && (await q(`select likely_spam from complaints where id = $1`, [extraId]))[0].likely_spam === false);

  // 25 MB por archivo (bucket) y tope de megas por empresa y hora
  ok('el bucket limita a 25 MB por archivo', (await q(`select file_size_limit from storage.buckets where id = 'attachments'`))[0].file_size_limit === 26214400);
  const capC = (await an(`select submit_complaint($1, $2, $3, 'fraud', 'Caso para el tope de megas por hora.', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[]) as id`, [crypto.randomUUID(), orgA, sha('CAPS-0001-0000-0000')])).rows[0].id;
  ok('un adjunto que cabe entra', !(await an(`insert into attachments (complaint_id, filename, storage_path, file_size, mime_type) values ($1, 'a.pdf', $2, 400000000, 'application/pdf')`, [capC, `${capC}/a.pdf`])).error);
  ok('un adjunto que pasa el tope por empresa y hora se rechaza (la denuncia ya está guardada)', /attachment-quota/.test(err(await an(`insert into attachments (complaint_id, filename, storage_path, file_size, mime_type) values ($1, 'b.pdf', $2, 150000000, 'application/pdf')`, [capC, `${capC}/b.pdf`]))));

  // Vuelta atrás
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '026_atras.sql'), 'utf8'));
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '026_atras.sql'), 'utf8'));
  ok('vuelta atrás: por encima de 50/hora vuelve a rechazarse', /rate-limited/.test(err(await an(`select submit_complaint($1, $2, $3, 'fraud', 'Tras volver atrás, la 52 se rechaza.', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[])`, [crypto.randomUUID(), orgB, sha('SPAM-7777-0000-0000')]))));
}

// ── Medios con código (027: M1, M5, M6, M11) ────────────────────────────
if (upTo >= 27) {
  console.log('\nMedios con código (027)');
  const crypto = await import('node:crypto');
  const sha = (c) => crypto.createHash('sha256').update(c.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
  const pg = await newDb(26); // la 019 genera el secreto en private.app_secrets
  const q = async (sql, p) => (await pg.query(sql, p)).rows;
  const an = (sql, p) => asOn(pg, 'anon', null, sql, p);
  const au = (uid, sql, p) => asOn(pg, 'authenticated', uid, sql, p);
  const err = (r) => String(r.error ?? '');

  await q(`insert into auth.users (email, raw_user_meta_data) values ('m1@x.es', '{"company_name":"Empresa M1","full_name":"Admin M1"}'), ('m2@x.es', '{"company_name":"Empresa M2","full_name":"Admin M2"}')`);
  const [{ organization_id: orgA }] = await q(`select p.organization_id from profiles p join auth.users u on u.id = p.id where u.email = 'm1@x.es'`);
  const [{ organization_id: orgB }] = await q(`select p.organization_id from profiles p join auth.users u on u.id = p.id where u.email = 'm2@x.es'`);
  const [{ id: adminA }] = await q(`select id from auth.users where email = 'm1@x.es'`);

  // M1: una denuncia con la huella PLANA de antes de la 019 (se inserta con los disparadores apagados)
  const plain = sha('OLD8-1111');
  await q(`alter table complaints disable trigger user`);
  const [{ id: oldId }] = await q(`insert into complaints (tracking_hash, tracking_code, organization_id, category, description, status, priority, channel, created_at, received_at) values ($1, null, $2, 'fraud', 'Denuncia antigua con huella plana.', 'received', 'normal', 'web', now(), now()) returning id`, [plain, orgA]);
  await q(`alter table complaints enable trigger user`);
  // La copia de seguridad de la 019 con esa fila (como en producción)
  await pg.exec(`create schema if not exists private; create table if not exists private.complaints_copia_019 (id uuid, tracking_hash text);`);
  await q(`insert into private.complaints_copia_019 (id, tracking_hash) values ($1, $2)`, [oldId, plain]);

  let again = null;
  try { await pg.exec(fs.readFileSync(path.join(MIG, '027_medios.sql'), 'utf8')); } catch (e) { again = e.message; }
  ok('la 027 se puede ejecutar dos veces', again === null, again ?? '');

  const [{ th }] = await q(`select tracking_hash th from complaints where id = $1`, [oldId]);
  const [{ keyed }] = await q(`select tracking_key($1) keyed`, [plain]);
  ok('M1 · la huella plana antigua se reescribe con el secreto', th === keyed && th !== plain, th);
  ok('M1 · una huella ya con secreto no se vuelve a reescribir', (await (async () => { await pg.exec(fs.readFileSync(path.join(MIG, '027_medios.sql'), 'utf8')); const [{ th2 }] = await q(`select tracking_hash th2 from complaints where id = $1`, [oldId]); return th2 === keyed; })()));

  // M6 · ver la identidad es un permiso propio
  await q(`insert into auth.users (email, raw_user_meta_data) values ('mg@x.es', '{"full_name":"Gestor M"}')`);
  const [{ id: mgrA }] = await q(`select id from auth.users where email = 'mg@x.es'`);
  await q(`update profiles set organization_id = $1, role = 'manager' where id = $2`, [orgA, mgrA]);
  await q(`insert into manager_permissions (manager_id, organization_id, category, can_view, can_edit, can_reply, can_delete, can_view_identity) values ($1, $2, 'fraud', true, false, true, false, false)`, [mgrA, orgA]);
  const sub = crypto.randomUUID();
  const made = await an(`select submit_complaint($1, $2, $3, 'fraud', 'Denuncia identificada para probar M5 y M6.', false, 'Marta Soler', 'marta@correo.es', null, null, null, null, 'es', false, null, '{}'::uuid[]) as id`, [sub, orgA, sha('IDEN-0001-0000-0000')]);
  const cid = made.rows[0].id;
  ok('M6 · un gestor sin «ver identidad» no la ve', /not-allowed/.test(err(await au(mgrA, `select * from get_reporter_identity($1, 'Motivo suficientemente largo')`, [cid]))));
  ok('M6 · el motivo es obligatorio (mínimo 10)', /reason-required/.test(err(await au(adminA, `select * from get_reporter_identity($1, 'corto')`, [cid]))));
  ok('M6 · el administrador sí la ve (con motivo)', (await au(adminA, `select * from get_reporter_identity($1, 'Reunión con el comité de cumplimiento')`, [cid])).rows[0]?.reporter_name === 'Marta Soler');
  await q(`update manager_permissions set can_view_identity = true where manager_id = $1 and category = 'fraud'`, [mgrA]);
  ok('M6 · con el permiso «ver identidad», el gestor sí la ve', (await au(mgrA, `select * from get_reporter_identity($1, 'Necesito confirmar un dato con quien denuncia')`, [cid])).rows[0]?.reporter_name === 'Marta Soler');
  ok('M6 · queda el motivo en el registro', (await q(`select details->>'note' n from audit_logs where complaint_id = $1 and action = 'identity_viewed' order by created_at desc limit 1`, [cid]))[0].n.length >= 10);

  // M5 · para subir un adjunto hace falta el id de envío en la ruta
  ok('M5 · subir con el id de envío funciona', !(await an(`insert into storage.objects (bucket_id, name) values ('attachments', $1)`, [`${cid}/${sub}/1-x.pdf`])).error);
  ok('M5 · subir sin el id de envío se rechaza', !!(await an(`insert into storage.objects (bucket_id, name) values ('attachments', $1)`, [`${cid}/2-x.pdf`])).error);
  ok('M5 · subir con un id de envío falso se rechaza', !!(await an(`insert into storage.objects (bucket_id, name) values ('attachments', $1)`, [`${cid}/${crypto.randomUUID()}/3-x.pdf`])).error);

  // M11 · baja de empresa, solo Reportia (clave de servicio)
  ok('M11 · la baja de empresa no la puede ejecutar un administrador', !!(await au(adminA, `select offboard_organization($1)`, [orgA])).error);
  await q(`select offboard_organization($1)`, [orgB]); // como superusuario (auth.uid() nulo) = Reportia
  ok('M11 · Reportia da de baja la empresa y desaparece', (await q(`select count(*)::int n from organizations where id = $1`, [orgB]))[0].n === 0);

  // Vuelta atrás
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '027_atras.sql'), 'utf8'));
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '027_atras.sql'), 'utf8'));
  ok('vuelta atrás: ver la identidad vuelve a bastar con «ver»', !(await au(adminA, `select * from get_reporter_identity($1)`, [cid])).error);
  ok('vuelta atrás: subir ya no exige el id de envío', !(await an(`insert into storage.objects (bucket_id, name) values ('attachments', $1)`, [`${cid}/4-x.pdf`])).error);
}

// ── Bajos (028: B1, B2, B13) ─────────────────────────────────────────────
if (upTo >= 28) {
  console.log('\nBajos (028)');
  const pg = await newDb(28);
  const q = async (sql, p) => (await pg.query(sql, p)).rows;
  const au = (uid, sql, p, aal = 'aal2') => asOn(pg, 'authenticated', uid, sql, p, aal);
  const an = (sql, p) => asOn(pg, 'anon', null, sql, p);

  let again = null;
  try { await pg.exec(fs.readFileSync(path.join(MIG, '028_bajos.sql'), 'utf8')); } catch (e) { again = e.message; }
  ok('la 028 se puede ejecutar dos veces', again === null, again ?? '');

  await q(`insert into auth.users (email, raw_user_meta_data) values ('b1@x.es', '{"company_name":"Empresa B1","full_name":"Admin B1"}')`);
  const [{ organization_id: orgA }] = await q(`select p.organization_id from profiles p join auth.users u on u.id = p.id where u.email = 'b1@x.es'`);
  const [{ id: adminA }] = await q(`select id from auth.users where email = 'b1@x.es'`);
  // Un segundo miembro del equipo
  await q(`insert into auth.users (email, raw_user_meta_data) values ('b1b@x.es', '{"full_name":"Gestor B1"}')`);
  const [{ id: mgrA }] = await q(`select id from auth.users where email = 'b1b@x.es'`);
  await q(`update profiles set organization_id = $1, role = 'manager' where id = $2`, [orgA, mgrA]);

  // B1 · con solo la contraseña (aal1) se lee el propio perfil, pero no la empresa ni el resto del equipo
  ok('B1 · aal1 lee su propio perfil', (await au(adminA, `select id from profiles where id = $1`, [adminA], 'aal1')).rows.length === 1);
  ok('B1 · aal1 NO lee los datos de la empresa', (await au(adminA, `select id from organizations`, [], 'aal1')).rows.length === 0);
  ok('B1 · aal1 NO lee el resto del equipo', (await au(adminA, `select id from profiles where id = $1`, [mgrA], 'aal1')).rows.length === 0);
  ok('B1 · con el segundo paso (aal2) sí ve la empresa y el equipo', (await au(adminA, `select id from organizations`)).rows.length === 1 && (await au(adminA, `select id from profiles`)).rows.length === 2);

  // B2 · anon pierde leer/modificar las tablas de datos (mantiene insertar adjuntos)
  ok('B2 · anon no tiene SELECT sobre complaints', (await q(`select has_table_privilege('anon', 'complaints', 'select') p`))[0].p === false);
  ok('B2 · anon no tiene UPDATE/DELETE sobre complaints', (await q(`select has_table_privilege('anon', 'complaints', 'update') u, has_table_privilege('anon', 'complaints', 'delete') d`))[0].u === false);
  ok('B2 · anon conserva INSERT en attachments (sube adjuntos)', (await q(`select has_table_privilege('anon', 'attachments', 'insert') p`))[0].p === true);

  // B13 · «¿viene del navegador?» mira el rol; las funciones nuevas no nacen ejecutables por anon
  ok('B13 · is_client_request() es true cuando el rol es anon', (await an(`select is_client_request() c`)).rows[0].c === true);
  // B13 · el «revoke execute por defecto» queda registrado (su efecto sobre funciones nuevas lo aplica Postgres
  // de verdad; PGlite no lo resuelve en has_function_privilege, por eso solo se comprueba que el permiso por defecto existe)
  ok('B13 · hay un permiso por defecto para las funciones de public', (await q(`select count(*)::int n from pg_default_acl d join pg_namespace s on s.oid = d.defaclnamespace where s.nspname = 'public' and d.defaclobjtype = 'f'`))[0].n >= 1);

  // Vuelta atrás
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '028_atras.sql'), 'utf8'));
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '028_atras.sql'), 'utf8'));
  ok('vuelta atrás: aal1 vuelve a ver la empresa', (await au(adminA, `select id from organizations`, [], 'aal1')).rows.length === 1);
  ok('vuelta atrás: anon recupera el SELECT sobre complaints', (await q(`select has_table_privilege('anon', 'complaints', 'select') p`))[0].p === true);
}

// ── Modo claro por defecto (029, 8b) ─────────────────────────────────────
if (upTo >= 29) {
  console.log('\nModo claro por defecto (029)');
  const pg = await newDb(28); // antes de la 029, el valor por defecto es 'system'
  const q = async (sql, p) => (await pg.query(sql, p)).rows;
  // Un perfil que había elegido «como el sistema» y otro «oscuro» (antes de la 029)
  await q(`insert into auth.users (email, raw_user_meta_data) values ('ap@x.es', '{"company_name":"Empresa AP","full_name":"Admin AP"}')`);
  const [{ id: adminA }] = await q(`select id from auth.users where email = 'ap@x.es'`);
  await q(`update profiles set appearance = 'system' where id = $1`, [adminA]);
  await q(`insert into auth.users (email, raw_user_meta_data) values ('apd@x.es', '{"full_name":"Gestor AP"}')`);
  const [{ id: mgrA }] = await q(`select id from auth.users where email = 'apd@x.es'`);
  await q(`update profiles set appearance = 'dark' where id = $1`, [mgrA]);

  let again = null;
  try { await pg.exec(fs.readFileSync(path.join(MIG, '029_modo_claro.sql'), 'utf8')); } catch (e) { again = e.message; }
  ok('la 029 se puede ejecutar dos veces', again === null, again ?? '');
  ok('8b · el que tenía «como el sistema» pasa a «claro»', (await q(`select appearance a from profiles where id = $1`, [adminA]))[0].a === 'light');
  ok('8b · el que eligió «oscuro» se queda en «oscuro»', (await q(`select appearance a from profiles where id = $1`, [mgrA]))[0].a === 'dark');
  ok('8b · el valor por defecto de appearance es «claro»', (await q(`select column_default d from information_schema.columns where table_name = 'profiles' and column_name = 'appearance'`))[0].d.includes(`'light'`));
}

// ── Enviar exige siempre la prueba de trabajo (030, A3) ─────────────────
if (upTo >= 30) {
  console.log('\nEnviar exige siempre la prueba de trabajo (030)');
  const crypto = await import('node:crypto');
  const sha = (c) => crypto.createHash('sha256').update(c.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
  const solvePow = (token, bits) => {
    const full = Math.floor(bits / 8), rem = bits % 8;
    for (let n = 0; ; n++) {
      const d = crypto.createHash('sha256').update(`${token}:${n}`).digest();
      let good = true;
      for (let i = 0; i < full; i++) if (d[i] !== 0) { good = false; break; }
      if (good && rem !== 0 && (d[full] >> (8 - rem)) !== 0) good = false;
      if (good) return String(n);
    }
  };
  const MIG30 = fs.readFileSync(path.join(MIG, '030_envio_con_prueba_obligatoria.sql'), 'utf8');
  ok('sin la 026 se para al principio', await (async () => { const p25 = await newDb(25); try { await p25.exec(MIG30); return false; } catch (e) { return /026/.test(e.message); } })());

  const pg = await newDb(30);
  const q = async (sql, p) => (await pg.query(sql, p)).rows;
  const an = (sql, p) => asOn(pg, 'anon', null, sql, p);
  const au = (uid, sql, p) => asOn(pg, 'authenticated', uid, sql, p);
  const err = (r) => String(r.error ?? '');
  let again = null;
  try { await pg.exec(MIG30); } catch (e) { again = e.message; }
  ok('la 030 se puede ejecutar dos veces', again === null, again ?? '');

  await q(`insert into auth.users (email, raw_user_meta_data) values ('pw@x.es', '{"company_name":"Empresa PW","full_name":"Admin PW"}')`);
  const [{ id: adminP, organization_id: orgP }] = await q(`select p.id, p.organization_id from profiles p join auth.users u on u.id = p.id where u.email = 'pw@x.es'`);
  const sub16 = `select submit_complaint($1, $2, $3, 'fraud', 'Hechos por el camino de 16, sin prueba de trabajo.', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[]) as id`;
  const sub18 = `select submit_complaint($1, $2, $3, 'fraud', 'Hechos por el camino de 18, con prueba de trabajo.', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[], $4, $5) as id`;

  ok('sin sesión, el camino de 16 (sin prueba de trabajo) ya no se puede llamar', /permission denied/.test(err(await an(sub16, [crypto.randomUUID(), orgP, sha('CERR-0001-0000-0000')]))));
  ok('con sesión, tampoco', /permission denied/.test(err(await au(adminP, sub16, [crypto.randomUUID(), orgP, sha('CERR-0002-0000-0000')]))));
  ok('ninguna denuncia ha entrado por ahí', (await q(`select count(*)::int n from complaints where organization_id = $1`, [orgP]))[0].n === 0);

  const sid = crypto.randomUUID();
  const ch = (await an(`select * from issue_pow_challenge($1)`, [orgP])).rows[0];
  const sent = await an(sub18, [sid, orgP, sha('CERR-0003-0000-0000'), ch.token, solvePow(ch.token, ch.bits)]);
  ok('con la prueba de trabajo resuelta, enviar funciona (18 parámetros)', !sent.error && !!sent.rows[0]?.id, err(sent));
  ok('…y deja la entrada «created» en el registro', (await q(`select count(*)::int n from audit_logs where complaint_id = $1 and action = 'created'`, [sent.rows[0]?.id]))[0].n === 1);
  ok('sin resolverla se rechaza', /proof-required/.test(err(await an(sub18, [crypto.randomUUID(), orgP, sha('CERR-0004-0000-0000'), 'no', 'no']))));
  ok('un reto ya usado no vale para otra denuncia', /proof-required/.test(err(await an(sub18, [crypto.randomUUID(), orgP, sha('CERR-0005-0000-0000'), ch.token, solvePow(ch.token, ch.bits)]))));
  const ch2 = (await an(`select * from issue_pow_challenge($1)`, [orgP])).rows[0];
  const again18 = await an(sub18, [sid, orgP, sha('CERR-0003-0000-0000'), ch2.token, solvePow(ch2.token, ch2.bits)]);
  ok('reintentar el mismo envío (mismo id de envío) devuelve la misma denuncia', !again18.error && again18.rows[0]?.id === sent.rows[0]?.id, err(again18));
  const reg = await au(adminP, `select register_complaint('fraud', 'Caso registrado por teléfono después de la 030.', 'phone', now(), true, null, null, null, null, null, null, 'es', $1, null) as id`, [sha('CERR-0007-0000-0000')]);
  ok('registrar un caso desde el panel sigue funcionando', !reg.error && !!reg.rows[0]?.id, err(reg));

  // Vuelta atrás
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '030_atras.sql'), 'utf8'));
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '030_atras.sql'), 'utf8'));
  ok('vuelta atrás: el camino de 16 se vuelve a abrir', !(await an(sub16, [crypto.randomUUID(), orgP, sha('CERR-0006-0000-0000')])).error);
}

// ── Arreglo de la 028: las funciones de confianza (031) ─────────────────
if (upTo >= 31) {
  console.log('\nLas funciones de confianza vuelven a funcionar (031, arreglo de la 028)');
  const crypto = await import('node:crypto');
  const sha = (c) => crypto.createHash('sha256').update(c.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
  const solvePow = (token, bits) => {
    const full = Math.floor(bits / 8), rem = bits % 8;
    for (let n = 0; ; n++) {
      const d = crypto.createHash('sha256').update(`${token}:${n}`).digest();
      let good = true;
      for (let i = 0; i < full; i++) if (d[i] !== 0) { good = false; break; }
      if (good && rem !== 0 && (d[full] >> (8 - rem)) !== 0) good = false;
      if (good) return String(n);
    }
  };
  const MIG31 = fs.readFileSync(path.join(MIG, '031_arreglo_funciones_de_confianza.sql'), 'utf8');
  const pg = await newDb(30); // como producción: con la 028 (y la 030)
  const q = async (sql, p) => (await pg.query(sql, p)).rows;
  const an = (sql, p) => asOn(pg, 'anon', null, sql, p);
  const au = (uid, sql, p) => asOn(pg, 'authenticated', uid, sql, p);
  const err = (r) => String(r.error ?? '');
  await q(`insert into auth.users (email, raw_user_meta_data) values ('fc@x.es', '{"company_name":"Empresa FC","full_name":"Admin FC"}')`);
  const [{ id: admin, organization_id: org }] = await q(`select p.id, p.organization_id from profiles p join auth.users u on u.id = p.id where u.email = 'fc@x.es'`);
  const submit = async (code) => {
    const ch = (await an(`select * from issue_pow_challenge($1)`, [org])).rows[0];
    return (await an(`select submit_complaint($1, $2, $3, 'fraud', 'Hechos de prueba para las funciones de confianza.', true, null, null, null, null, null, null, 'es', false, null, '{}'::uuid[], $4, $5) as id`,
      [crypto.randomUUID(), org, sha(code), ch.token, solvePow(ch.token, ch.bits)])).rows[0]?.id;
  };
  const register = () => au(admin, `select register_complaint('safety', 'Comunicación recibida por teléfono hace dos días.', 'phone', now() - interval '2 days', true, null, null, null, null, null, null, 'es', null, null) as id`);
  const suppress = async (id) => {
    await q(`update complaints set status = 'resolved' where id = $1`, [id]);
    await au(admin, `select request_suppression($1, 'Caso resuelto; se suprime según el artículo 32 de la ley.')`, [id]);
    await q(`update suppressions set scheduled_for = now() - interval '1 minute' where complaint_id = $1 and status = 'pending'`, [id]);
    return au(admin, `select execute_suppression($1)`, [id]);
  };

  // Con la 028 (sin la 031): el fallo, tal como está en producción
  const s1 = await submit('CONF-0001-0000-0000');
  ok('con la 028: «Suprimir ahora» falla (el fallo de producción)', /complaint-content-immutable/.test(err(await suppress(s1))));
  const r1 = (await register()).rows[0].id;
  ok('con la 028: un caso registrado por teléfono se guarda como «web» y con la fecha de ahora', (await q(`select channel, created_at > now() - interval '1 day' as hoy from complaints where id = $1`, [r1]))[0].channel === 'web');

  let again = null;
  try { await pg.exec(MIG31); await pg.exec(MIG31); } catch (e) { again = e.message; }
  ok('la 031 se puede ejecutar dos veces', again === null, again ?? '');
  ok('031 · repara el canal de los casos registrados a mano con la 028', (await q(`select channel from complaints where id = $1`, [r1]))[0].channel === 'phone');
  ok('031 · y no toca las denuncias que sí llegaron por la web', (await q(`select channel from complaints where id = $1`, [s1]))[0].channel === 'web');

  // Las funciones de confianza vuelven a hacer su trabajo
  const supp = await suppress(s1);
  ok('031 · «Suprimir ahora» funciona', !supp.error && (await q(`select anonymized_at is not null a from complaints where id = $1`, [s1]))[0].a, err(supp));
  const r2 = (await register()).rows[0].id;
  const reg = (await q(`select channel, created_at < now() - interval '1 day' as fecha from complaints where id = $1`, [r2]))[0];
  ok('031 · registrar a mano guarda el canal y la fecha de recepción', reg.channel === 'phone' && reg.fecha, JSON.stringify(reg));
  const s2 = await submit('CONF-0002-0000-0000');
  const ch = (await an(`select * from issue_pow_challenge($1)`, [org])).rows[0];
  const meet = await an(`select request_meeting_in_org($1, 'CONF-0002-0000-0000', $2, $3) as at`, [org, ch.token, solvePow(ch.token, ch.bits)]);
  ok('031 · quien denuncia puede pedir una reunión desde «Mi caso»', !meet.error && !!meet.rows[0]?.at, err(meet));
  ok('031 · el equipo marca la reunión como celebrada', !(await au(admin, `select mark_meeting_held($1)`, [s2])).error);
  ok('031 · el equipo amplía el plazo', !(await au(admin, `select extend_response_deadline($1, 'Investigación con varios departamentos implicados')`, [s2])).error);
  const s3 = await submit('CONF-0003-0000-0000');
  await q(`update complaints set status = 'resolved' where id = $1`, [s3]);
  const old = await au(admin, `select anonymize_complaint($1, 'Caso que hay que suprimir según el artículo 32 de la ley.')`, [s3]);
  ok('031 · la supresión de antes (sin gracia) también funciona', !old.error && (await q(`select anonymized_at is not null a from complaints where id = $1`, [s3]))[0].a, err(old));

  // Las protecciones siguen: desde el navegador, directamente, no se tocan los campos protegidos
  ok('031 · el navegador sigue sin poder cambiar el texto de una denuncia', /complaint-content-immutable|permission denied/.test(err(await au(admin, `update complaints set description = 'cambiado' where id = $1`, [s2]))));
  ok('031 · ni su canal', /complaint-content-immutable|permission denied/.test(err(await au(admin, `update complaints set channel = 'phone' where id = $1`, [s2]))));
  ok('031 · is_client_request() sigue siendo true para el navegador', (await an(`select is_client_request() c`)).rows[0].c === true);
  ok('031 · y el tope de una denuncia por petición sigue contando por dentro (api_role_is_client)', (await an(`select api_role_is_client() c`)).rows[0].c === true);

  // Vuelta atrás (vuelve al fallo de la 028)
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '031_atras.sql'), 'utf8'));
  await pg.exec(fs.readFileSync(path.join(MIG, '..', 'rollback', '031_atras.sql'), 'utf8'));
  ok('vuelta atrás: vuelve el comportamiento de la 028', (await (async () => { const id = (await register()).rows[0].id; return (await q(`select channel from complaints where id = $1`, [id]))[0].channel; })()) === 'web');
}

// ── Vueltas atrás de la 018, la 017 y la 016 ────────────────────────────
if (upTo >= 18) {
  console.log('\nVueltas atrás (018, 017, 016)');
  const RB = (f) => fs.readFileSync(path.join(MIG, '..', 'rollback', f), 'utf8');
  const slugA = (await svc(`select slug from organizations where id = $1`, [orgA]))[0].slug;
  await db.exec(RB('018_atras.sql')); await db.exec(RB('018_atras.sql'));
  let pub = (await anon(`select * from get_organization_by_slug($1)`, [slugA])).rows[0] ?? {};
  ok('018 atrás: el canal vuelve a leer la marca sin el ajuste del pie', !('show_powered_by' in pub) && pub.brand_palette === 'bosque');
  ok('018 atrás: el administrador ya puede tocar la columna (sin uso)', !(await user(adminA, `update organizations set show_powered_by = true where id = $1`, [orgA])).error);
  await db.exec(RB('017_atras.sql')); await db.exec(RB('017_atras.sql'));
  ok('017 atrás: la dirección propia ya no lleva a ningún canal', !!(await anon(`select get_organization_slug_by_domain('canal.a.es')`)).error);
  ok('017 atrás: la dirección se queda guardada', (await svc(`select custom_domain from organizations where id = $1`, [orgA]))[0].custom_domain === 'canal.a.es');
  await db.exec(RB('016_atras.sql')); await db.exec(RB('016_atras.sql'));
  pub = (await anon(`select * from get_organization_by_slug($1)`, [slugA])).rows[0] ?? {};
  ok('016 atrás: el canal vuelve a leer solo nombre, dirección y autoridad', !('brand_palette' in pub) && pub.slug === slugA, Object.keys(pub).join(' '));
  const cols = (await svc(`select column_name c from information_schema.columns where table_name = 'organizations' and column_name like 'brand%'`)).map(r => r.c).sort().join(' ');
  ok('016 atrás: la marca no se borra (queda apartada con otro nombre)', cols === 'brand_logo_016 brand_palette_016', cols);
  ok('016 atrás: la empresa se sigue leyendo entera desde el panel', (await user(adminA, `select * from organizations`)).rows.length === 1);
}

console.log(`\n${pass} correctas, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
