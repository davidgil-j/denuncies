-- Migració 009: compte de l'organització (pla, període de prova i dades de l'empresa)
--
-- Afegeix a organizations:
--   · el pla contractat i les dates (prova i vigència). Només els canvia Reportia.
--   · la persona Responsable del Sistema (art. 8 de la Llei 2/2023) i les dades de facturació.
--     Els edita l'administrador de l'empresa des del panell (Compte).
--
-- Activar o renovar un client (des de l'editor SQL de Supabase, amb el rol de servei):
--   update organizations set plan = 'essential', paid_until = '2027-10-31' where slug = 'nom-empresa';
-- Tornar-lo al període de prova:
--   update organizations set plan = 'trial', paid_until = null, trial_ends_at = now() + interval '30 days' where slug = 'nom-empresa';

alter table organizations
  add column if not exists plan             text not null default 'trial',
  add column if not exists trial_ends_at    timestamptz,
  add column if not exists paid_until       date,
  add column if not exists responsible_name text,
  add column if not exists responsible_role text,
  add column if not exists billing_name     text,
  add column if not exists billing_tax_id   text,
  add column if not exists billing_email    text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'organizations_plan_check') then
    alter table organizations
      add constraint organizations_plan_check check (plan in ('trial', 'essential', 'business', 'corporate'));
  end if;
end $$;

-- Les organitzacions que ja existeixen comencen la prova avui; les noves, en crear-se
update organizations set trial_ends_at = now() + interval '30 days' where trial_ends_at is null;
alter table organizations alter column trial_ends_at set default (now() + interval '30 days');

-- L'administrador pot editar les dades de la seva empresa
drop policy if exists "superadmin_update_own_organization" on organizations;
create policy "superadmin_update_own_organization" on organizations
  for update using (id = current_org_id() and is_superadmin())
  with check (id = current_org_id() and is_superadmin());

-- …però no el pla, les dates ni l'adreça del canal (els enllaços ja compartits no es poden trencar)
create or replace function protect_organization_fields()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.slug          is distinct from old.slug
     or new.plan          is distinct from old.plan
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.paid_until    is distinct from old.paid_until
     or new.created_at    is distinct from old.created_at then
    raise exception 'organization-field-protected' using errcode = '42501';
  end if;

  if new.name is null or length(trim(new.name)) = 0 then
    raise exception 'organization-name-required' using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_organization_fields on organizations;
create trigger protect_organization_fields
  before update on organizations
  for each row execute function protect_organization_fields();
