-- Migració 005: fonament multi-tenant
-- Taula organizations + organization_id a profiles/complaints/manager_permissions/audit_logs
-- + RLS d'aïllament per organització + RPCs públiques per al canal i el seguiment

create table if not exists organizations (
  id         uuid default gen_random_uuid() primary key,
  name       text not null,
  slug       text unique not null,
  created_at timestamptz default now()
);

alter table organizations enable row level security;

alter table profiles            add column if not exists organization_id uuid references organizations(id);
alter table complaints          add column if not exists organization_id uuid references organizations(id);
alter table manager_permissions add column if not exists organization_id uuid references organizations(id);
alter table audit_logs          add column if not exists organization_id uuid references organizations(id);

create index if not exists idx_complaints_organization_id on complaints(organization_id);
create index if not exists idx_profiles_organization_id   on profiles(organization_id);
create index if not exists idx_manager_permissions_org_id on manager_permissions(organization_id);
create index if not exists idx_audit_logs_organization_id on audit_logs(organization_id);

-- Organització de l'usuari autenticat (security definer per evitar recursió a RLS)
create or replace function current_org_id()
returns uuid as $$
  select organization_id from profiles where id = auth.uid();
$$ language sql security definer stable;

-- organizations: cada usuari només veu la seva pròpia organització
create policy "org_read_own_organization" on organizations
  for select using (id = current_org_id());

-- profiles: lectura limitada a la pròpia organització
drop policy if exists "auth_read_profiles" on profiles;
create policy "org_read_profiles" on profiles
  for select using (organization_id = current_org_id());

-- profiles: gestió de superadmin limitada a la pròpia organització
drop policy if exists "superadmin_insert_profiles" on profiles;
drop policy if exists "superadmin_update_profiles" on profiles;
drop policy if exists "superadmin_delete_profiles" on profiles;

create policy "superadmin_insert_profiles" on profiles
  for insert with check (is_superadmin() and organization_id = current_org_id());

create policy "superadmin_update_profiles" on profiles
  for update using (is_superadmin() and organization_id = current_org_id());

create policy "superadmin_delete_profiles" on profiles
  for delete using (is_superadmin() and organization_id = current_org_id());

-- manager_permissions: lectura i gestió limitades a la pròpia organització
drop policy if exists "auth_read_permissions" on manager_permissions;
create policy "org_read_permissions" on manager_permissions
  for select using (organization_id = current_org_id());

drop policy if exists "superadmin_manage_permissions" on manager_permissions;
create policy "superadmin_manage_permissions" on manager_permissions
  for all using (is_superadmin() and organization_id = current_org_id())
  with check (is_superadmin() and organization_id = current_org_id());

-- audit_logs: lectura limitada a la pròpia organització (insert es manté obert per al formulari públic)
create policy "org_read_audit_logs" on audit_logs
  for select using (organization_id = current_org_id());

-- complaints: accés admin (lectura/actualització) limitat a la pròpia organització.
-- Les polítiques públiques d'inserció anònima i lectura per tracking_code es
-- redefiniran a la Fase 3 amb resolució d'organització per slug; mentrestant
-- es retiren les polítiques antigues "using (true)" per evitar fuites entre tenants.
drop policy if exists "allow_select_by_tracking_code" on complaints;
drop policy if exists "allow_admin_update_complaints" on complaints;
drop policy if exists "allow_insert_complaints" on complaints;

create policy "org_select_complaints" on complaints
  for select using (organization_id = current_org_id());

create policy "org_update_complaints" on complaints
  for update using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

create policy "public_insert_complaints" on complaints
  for insert with check (organization_id is not null);

-- RPC pública: cerca de denúncia pel codi de seguiment (sense exposar tota la taula)
create or replace function get_complaint_by_tracking_code(p_code text)
returns table (
  id uuid, tracking_code text, status text, category text,
  organization_id uuid, created_at timestamptz, updated_at timestamptz
) as $$
  select id, tracking_code, status, category, organization_id, created_at, updated_at
  from complaints
  where tracking_code = upper(p_code);
$$ language sql security definer stable;

-- RPC pública: resol una organització pel seu slug (per al canal públic /canal/:slug)
create or replace function get_organization_by_slug(p_slug text)
returns table (id uuid, name text, slug text) as $$
  select id, name, slug from organizations where slug = p_slug;
$$ language sql security definer stable;
