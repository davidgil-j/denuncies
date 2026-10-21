#!/usr/bin/env node
// Inventario de la base de datos tras aplicar las migraciones (en memoria, PGlite): funciones SECURITY DEFINER,
// quién las puede ejecutar y su search_path; políticas RLS por tabla. Solo lectura del catálogo.
// Uso: node catalogo.mjs <ruta del repositorio>
import fs from 'node:fs';
import path from 'node:path';

const REPO = process.argv[2];
const { PGlite } = await import(path.join(REPO, 'node_modules/@electric-sql/pglite/dist/index.js'));
const { unaccent } = await import(path.join(REPO, 'node_modules/@electric-sql/pglite/dist/contrib/unaccent.js'));
const MIG = path.join(REPO, 'supabase/migrations');

const SKELETON = `
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
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  create policy "allow_upload_attachments" on storage.objects for insert with check (bucket_id = 'attachments');
`;

const db = new PGlite({ extensions: { unaccent } });
await db.exec(SKELETON);
for (const f of fs.readdirSync(MIG).filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync(path.join(MIG, f), 'utf8'));

const fns = await db.query(`
  select n.nspname as schema, p.proname as name, pg_get_function_identity_arguments(p.oid) as args,
         p.prosecdef as definer, coalesce(array_to_string(p.proconfig, ','), '') as config,
         pg_get_function_result(p.oid) = 'trigger' as is_trigger,
         has_function_privilege('anon', p.oid, 'execute') as anon_exec,
         has_function_privilege('authenticated', p.oid, 'execute') as auth_exec
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private')
  order by definer desc, anon_exec desc, name`);
console.log('schema.name(args) | definer | search_path | trigger | anon | authenticated');
for (const r of fns.rows) console.log(`${r.schema}.${r.name}(${r.args}) | ${r.definer} | ${r.config || '—'} | ${r.is_trigger} | ${r.anon_exec} | ${r.auth_exec}`);

const pols = await db.query(`select schemaname, tablename, policyname, permissive, roles::text, cmd from pg_policies order by 1, 2, 6, 3`);
console.log('\npolíticas: schema.tabla | nombre | permissive | roles | cmd');
for (const r of pols.rows) console.log(`${r.schemaname}.${r.tablename} | ${r.policyname} | ${r.permissive} | ${r.roles} | ${r.cmd}`);

const rls = await db.query(`select n.nspname, c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind = 'r' and n.nspname in ('public', 'private', 'storage') order by 1, 2`);
console.log('\ntablas: RLS activado');
for (const r of rls.rows) console.log(`${r.nspname}.${r.relname} | ${r.relrowsecurity}`);

const grants = await db.query(`select table_schema, table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) as privs
  from information_schema.role_table_grants where grantee in ('anon', 'authenticated') and table_schema in ('public', 'private')
  group by 1, 2, 3 order by 1, 2, 3`);
console.log('\nprivilegios de tabla (anon / authenticated)');
for (const r of grants.rows) console.log(`${r.table_schema}.${r.table_name} | ${r.grantee} | ${r.privs}`);
