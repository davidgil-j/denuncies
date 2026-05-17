-- Migration 004: eliminar política recursiva de profiles que bloquejava la lectura

-- Eliminar la política amb subquery recursiva (causa infinite loop en RLS)
drop policy if exists "superadmin_manage_profiles" on profiles;

-- Política simple: qualsevol usuari autenticat pot llegir tots els perfils
-- (la política auth_read_profiles ja existeix i cobreix això)

-- Política: superadmin pot modificar perfils (sense subquery recursiva)
-- Usem una funció security definer per evitar la recursió
create or replace function is_superadmin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'superadmin'
  );
$$ language sql security definer stable;

create policy "superadmin_insert_profiles" on profiles
  for insert with check (is_superadmin());

create policy "superadmin_update_profiles" on profiles
  for update using (is_superadmin());

create policy "superadmin_delete_profiles" on profiles
  for delete using (is_superadmin());
