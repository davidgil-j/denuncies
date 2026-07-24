-- Migració 006: autoregistre d'empreses (Crear Compte)
-- Afegeix slugify(), generate_unique_org_slug() i estén handle_new_user()
-- (de la migració 003) perquè l'autoregistre creï una organització nova
-- + un perfil superadmin, mantenint el flux d'invitació de gestors intacte.

create extension if not exists unaccent with schema extensions;

-- Converteix un text lliure en un slug URL-safe (minúscules, sense accents,
-- separadors col·lapsats a '-', sense '-' inicial/final).
-- NOTA: ha de ser STABLE (no IMMUTABLE) perquè crida extensions.unaccent(),
-- que és STABLE; una funció IMMUTABLE no pot cridar una funció STABLE.
create or replace function slugify(value text)
returns text
language sql
stable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(extensions.unaccent(value)), '[^a-z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    )
  );
$$;

-- Genera un slug d'organització únic a partir del nom de l'empresa,
-- afegint -2, -3, ... en cas de col·lisió. S'executa dins la mateixa
-- transacció que la inserció a organizations, evitant condicions de cursa.
create or replace function generate_unique_org_slug(company_name text)
returns text
language plpgsql
as $$
declare
  base_slug text := slugify(company_name);
  candidate text;
  counter   int := 1;
begin
  if base_slug is null or base_slug = '' then
    base_slug := 'empresa';
  end if;

  candidate := base_slug;

  while exists (select 1 from organizations where slug = candidate) loop
    counter := counter + 1;
    candidate := base_slug || '-' || counter;
  end loop;

  return candidate;
end;
$$;

-- Estén handle_new_user() (definida originalment a la migració 003) perquè:
-- - Si raw_user_meta_data conté 'company_name' (autoregistre des de /crear-compte):
--     crea una organització nova amb slug únic + un perfil amb role='superadmin'
--     vinculat a aquesta organització nova.
-- - Si no (flux existent d'invitació de gestors via invite-manager Edge Function,
--     que només passa 'full_name'): crea un perfil amb role='manager', sense
--     organització, exactament com abans.
--
-- IMPORTANT: aquesta migració NO recrea el trigger on_auth_user_created
-- (creat a la migració 003) — "create or replace function" actualitza el cos
-- de la funció que el trigger ja existent invoca, sense necessitat de
-- redefinir el trigger.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_name text := new.raw_user_meta_data->>'company_name';
  v_full_name    text := new.raw_user_meta_data->>'full_name';
  v_org_id       uuid;
  v_slug         text;
begin
  -- Guarda d'idempotència: si ja existeix un perfil per aquest usuari,
  -- no facis res més (evita organitzacions orfes en reintents del trigger).
  if exists (select 1 from profiles where id = new.id) then
    return new;
  end if;

  if v_company_name is not null and length(trim(v_company_name)) > 0 then
    -- Autoregistre: crea organització nova + perfil superadmin
    v_slug := generate_unique_org_slug(v_company_name);

    insert into organizations (name, slug)
    values (trim(v_company_name), v_slug)
    returning id into v_org_id;

    insert into profiles (id, role, full_name, organization_id)
    values (new.id, 'superadmin', v_full_name, v_org_id);
  else
    -- Flux existent d'invitació de gestor: perfil manager, sense organització
    insert into profiles (id, role, full_name)
    values (new.id, 'manager', v_full_name);
  end if;

  return new;
end;
$$;
