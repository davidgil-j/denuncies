-- Migration 003: rols, permisos i perfils d'usuari

-- Taula de perfils (un per cada usuari de Supabase Auth)
create table if not exists profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  role       text not null default 'manager' check (role in ('superadmin', 'manager')),
  full_name  text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- Qualsevol usuari autenticat pot llegir tots els perfils (per al panel d'admin)
create policy "auth_read_profiles" on profiles
  for select using (auth.uid() is not null);

-- Cada usuari pot actualitzar el seu propi perfil
create policy "own_profile_update" on profiles
  for update using (auth.uid() = id);

-- Superadmin pot insertar i actualitzar qualsevol perfil
create policy "superadmin_manage_profiles" on profiles
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'superadmin')
  );

-- Trigger: crea perfil automàticament quan es registra un usuari nou
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, role, full_name)
  values (new.id, 'manager', new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Taula de permisos per gestor
create table if not exists manager_permissions (
  id          uuid default gen_random_uuid() primary key,
  manager_id  uuid references auth.users(id) on delete cascade not null,
  category    text not null,
  can_view    boolean default true,
  can_edit    boolean default false,
  can_reply   boolean default true,
  can_delete  boolean default false,
  unique(manager_id, category)
);

alter table manager_permissions enable row level security;

create policy "auth_read_permissions" on manager_permissions
  for select using (auth.uid() is not null);

create policy "superadmin_manage_permissions" on manager_permissions
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'superadmin')
  );

-- Marcar l'usuari existent com a superadmin
update profiles
set role = 'superadmin'
where id = (
  select id from auth.users where email = 'info@reportia.es' limit 1
);

-- Si el perfil encara no existeix (cas de l'usuari creat abans del trigger), insertar-lo
insert into profiles (id, role)
select id, 'superadmin'
from auth.users
where email = 'info@reportia.es'
on conflict (id) do update set role = 'superadmin';
