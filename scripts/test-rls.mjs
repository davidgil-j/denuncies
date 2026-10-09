#!/usr/bin/env node
// Proves de seguretat de la base de dades. Usage: npm run db:test
//
// Aplica totes les migracions de supabase/migrations/ a un Postgres real en memòria (PGlite),
// amb un esquelet mínim dels esquemes auth i storage de Supabase, i comprova les polítiques
// RLS amb els rols anon i authenticated: aïllament entre empreses, permisos per categoria,
// missatges, adjunts, registre d'auditoria i compte de l'organització.
// No toca cap base de dades real. Amb un número (node scripts/test-rls.mjs 7) aplica només
// fins a aquella migració, per veure què fallava abans.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';

const MIG = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');
const upTo = process.argv[2] ? Number(process.argv[2]) : 999;
const db = new PGlite({ extensions: { unaccent } });

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage; create schema extensions;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb default '{}', last_sign_in_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
  grant all on storage.objects to anon, authenticated, service_role;
  grant select on auth.users to service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  -- del supabase_schema.sql original (subida de adjuntos)
  create policy "allow_upload_attachments" on storage.objects for insert with check (bucket_id = 'attachments');
`);

const files = fs.readdirSync(MIG).filter(f => f.endsWith('.sql')).sort();
for (const f of files) {
  if (Number(f.slice(0, 3)) > upTo) continue;
  try { await db.exec(fs.readFileSync(path.join(MIG, f), 'utf8')); }
  catch (e) { console.error('✗ migración', f, '→', e.message); process.exit(1); }
}
console.log('migraciones aplicadas hasta', Math.min(upTo, Number(files.at(-1).slice(0, 3))));

// ── utilidades ──
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra); } };
/** Ejecuta sql como un rol y un usuario; devuelve { rows, error } */
async function as(role, uid, sql, params = [], aal = 'aal2') {
  await db.exec('begin');
  try {
    const claims = uid ? JSON.stringify({ sub: uid, role, aal }) : '';
    await db.exec(`set local role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', true); select set_config('request.jwt.claims', '${claims}', true);`);
    const r = await db.query(sql, params);
    await db.exec('commit');
    return { rows: r.rows, count: r.affectedRows ?? r.rows.length, error: null };
  } catch (e) {
    await db.exec('rollback');
    return { rows: [], count: 0, error: e.message };
  }
}
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

console.log(`\n${pass} correctas, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
