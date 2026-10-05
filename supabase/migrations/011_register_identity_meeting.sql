-- Migració 011: llibre registre complet, identitat sota consulta i reunió presencial
--
--   1. Via d'entrada de cada comunicació (web, presencial, telèfon, correu…) i registre manual des
--      del panell de les que no arriben pel formulari (arts. 5.2 d, 7.2 i 9.2 g de la Llei 2/2023)
--   2. Petició de reunió presencial des del formulari, amb el seu termini de 7 dies (art. 7.2)
--   3. Resultat de la tramitació, inici de la investigació i remissió al Ministeri Fiscal (arts. 9.2 j i 26)
--   4. La identitat de qui informa no es llegeix amb la denúncia: es consulta amb una acció
--      expressa que queda al registre (art. 32.1, accés limitat)
--   5. Autoritat autonòmica competent de cada organització, per informar bé dels canals externs
--
-- ORDRE: després de la 010, i publicant el frontend nou alhora (el panell deixa de llegir
-- reporter_name, reporter_email i reporter_phone directament).

-- ── 1. Columnes noves ──────────────────────────────────────────────────

alter table complaints add column if not exists channel text not null default 'web';
alter table complaints add column if not exists meeting_requested boolean not null default false;
alter table complaints add column if not exists meeting_held_at timestamptz;
alter table complaints add column if not exists outcome text;
alter table complaints add column if not exists investigation_started_at timestamptz;
alter table complaints add column if not exists fiscal_referral_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'complaints_channel_check') then
    alter table complaints add constraint complaints_channel_check
      check (channel in ('web', 'in_person', 'phone', 'mail', 'email', 'other'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'complaints_outcome_check') then
    alter table complaints add constraint complaints_outcome_check
      check (outcome is null or outcome in ('founded', 'unfounded', 'inadmissible', 'out_of_scope', 'duplicate'));
  end if;
end $$;

-- Inici d'investigació de les denúncies existents, segons l'estat i el registre
update complaints c set investigation_started_at = coalesce(
  (select min(a.created_at) from audit_logs a where a.complaint_id = c.id and a.action = 'status_changed'
     and a.details ->> 'to' in ('investigating', 'waiting')),
  c.updated_at)
where c.investigation_started_at is null and c.status in ('investigating', 'waiting');

alter table organizations add column if not exists regional_authority_name text;
alter table organizations add column if not exists regional_authority_url text;

-- ── 2. Camps que decideix el servidor, amb les columnes noves ──────────

create or replace function force_server_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if is_client_request() then
    new.created_at := now();
    if tg_table_name = 'complaints' then
      new.updated_at := now();
      new.status := 'received';
      new.priority := 'normal';
      new.reference := null;
      new.tracking_code := null;          -- el codi en clar mai no es desa
      new.acknowledged_at := null;
      new.answered_at := null;
      new.extended_until := null;
      new.extension_reason := null;
      new.anonymized_at := null;
      new.channel := 'web';               -- pel formulari públic només s'entra per web
      new.meeting_held_at := null;
      new.outcome := null;
      new.investigation_started_at := null;
      new.fiscal_referral_at := null;
      if new.is_anonymous then
        new.reporter_name := null; new.reporter_email := null; new.reporter_phone := null;
      end if;
    end if;
  end if;
  if tg_table_name = 'complaints' then
    if new.reference is null then
      new.reference := new_complaint_reference();
    end if;
  end if;
  return new;
end;
$$;

-- El navegador pot canviar estat, prioritat i resultat; la resta, no
create or replace function protect_complaint_content()
returns trigger
language plpgsql security invoker
set search_path = public
as $$
begin
  if not is_client_request() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tracking_code   is distinct from old.tracking_code
     or new.tracking_hash   is distinct from old.tracking_hash
     or new.reference       is distinct from old.reference
     or new.organization_id is distinct from old.organization_id
     or new.is_anonymous    is distinct from old.is_anonymous
     or new.reporter_name   is distinct from old.reporter_name
     or new.reporter_email  is distinct from old.reporter_email
     or new.reporter_phone  is distinct from old.reporter_phone
     or new.category        is distinct from old.category
     or new.department      is distinct from old.department
     or new.description     is distinct from old.description
     or new.incident_date   is distinct from old.incident_date
     or new.involved_people is distinct from old.involved_people
     or new.language        is distinct from old.language
     or new.created_at      is distinct from old.created_at
     or new.anonymized_at   is distinct from old.anonymized_at
     or new.channel         is distinct from old.channel
     or new.meeting_requested is distinct from old.meeting_requested then
    raise exception 'complaint-content-immutable' using errcode = '42501';
  end if;

  new.acknowledged_at := old.acknowledged_at;
  new.answered_at := old.answered_at;
  new.extended_until := old.extended_until;
  new.extension_reason := old.extension_reason;
  new.meeting_held_at := old.meeting_held_at;
  new.investigation_started_at := old.investigation_started_at;
  new.fiscal_referral_at := old.fiscal_referral_at;
  return new;
end;
$$;

create or replace function track_complaint_milestones()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.acknowledged_at is null and old.status = 'received' and new.status <> 'received' then
    new.acknowledged_at := now();
  end if;
  if new.investigation_started_at is null and new.status in ('investigating', 'waiting') then
    new.investigation_started_at := now();
  end if;
  if new.answered_at is null and new.status in ('resolved', 'closed', 'archived') then
    new.answered_at := now();
  end if;
  return new;
end;
$$;

create or replace function audit_complaint_changes()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into audit_logs (complaint_id, action, details)
    values (new.id, 'status_changed', jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if new.priority is distinct from old.priority then
    insert into audit_logs (complaint_id, action, details)
    values (new.id, 'priority_changed', jsonb_build_object('from', old.priority, 'to', new.priority));
  end if;
  if new.outcome is distinct from old.outcome then
    insert into audit_logs (complaint_id, action, details)
    values (new.id, 'outcome_set', jsonb_build_object('from', old.outcome, 'to', new.outcome));
  end if;
  return new;
end;
$$;

-- Supressió pendent: 3 mesos sense haver iniciat la investigació, o 10 anys
create or replace function retention_due()
returns table (id uuid, reference text, created_at timestamptz, reason text)
language sql security definer stable
set search_path = public
as $$
  select c.id, c.reference, c.created_at,
         case when c.created_at < now() - interval '10 years' then 'ten_years' else 'no_investigation' end
  from complaints c
  where c.organization_id = current_org_id()
    and is_superadmin() and is_aal2()
    and c.anonymized_at is null
    and (
      c.created_at < now() - interval '10 years'
      or (c.created_at < now() - interval '3 months'
          and c.investigation_started_at is null
          and c.status in ('received', 'reviewing'))
    )
  order by c.created_at;
$$;

-- ── 3. Accions registrades: reunió, Ministeri Fiscal, registre manual ──

create or replace function mark_meeting_held(p_complaint uuid)
returns timestamptz
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
begin
  select c.id, c.category, c.meeting_requested, c.meeting_held_at into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id() and c.anonymized_at is null;
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'edit') then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if not v.meeting_requested or v.meeting_held_at is not null then
    raise exception 'no-pending-meeting' using errcode = '22023';
  end if;
  update complaints set meeting_held_at = now() where id = p_complaint;
  insert into audit_logs (complaint_id, action, details) values (p_complaint, 'meeting_held', '{}'::jsonb);
  return now();
end;
$$;

create or replace function mark_fiscal_referral(p_complaint uuid, p_note text)
returns timestamptz
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
begin
  select c.id, c.category, c.fiscal_referral_at into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id() and c.anonymized_at is null;
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'edit') then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if v.fiscal_referral_at is not null then
    raise exception 'already-referred' using errcode = '22023';
  end if;
  update complaints set fiscal_referral_at = now() where id = p_complaint;
  insert into audit_logs (complaint_id, action, details)
  values (p_complaint, 'fiscal_referral', jsonb_build_object('note', nullif(trim(coalesce(p_note, '')), '')));
  return now();
end;
$$;

-- Registre manual d'una comunicació rebuda per una altra via (reunió, telèfon, correu, carta).
-- p_code_hash: hash del codi de seguiment que el panell genera i mostra una sola vegada perquè es
-- lliuri a la persona informant; pot ser nul si no vol fer-ne seguiment.
create or replace function register_complaint(
  p_category text, p_description text, p_channel text, p_received_at timestamptz,
  p_is_anonymous boolean, p_reporter_name text, p_reporter_email text, p_reporter_phone text,
  p_department text, p_incident_date date, p_involved_people text, p_language text, p_code_hash text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_received timestamptz := coalesce(p_received_at, now());
  v_org uuid := current_org_id();
begin
  if v_org is null or not is_aal2() or not can_access_category(p_category, 'edit') then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if p_channel is null or p_channel = 'web' then
    raise exception 'channel-required' using errcode = '22023';
  end if;
  if p_description is null or length(trim(p_description)) < 20 then
    raise exception 'description-required' using errcode = '22023';
  end if;
  if v_received > now() + interval '5 minutes' or v_received < now() - interval '1 year' then
    raise exception 'received-date-invalid' using errcode = '22023';
  end if;

  insert into complaints (
    id, organization_id, tracking_hash, channel, is_anonymous,
    reporter_name, reporter_email, reporter_phone,
    category, description, department, incident_date, involved_people, language,
    status, priority, created_at, updated_at
  ) values (
    v_id, v_org, coalesce(nullif(p_code_hash, ''), 'manual-' || v_id::text), p_channel, coalesce(p_is_anonymous, true),
    case when coalesce(p_is_anonymous, true) then null else nullif(trim(coalesce(p_reporter_name, '')), '') end,
    case when coalesce(p_is_anonymous, true) then null else nullif(trim(coalesce(p_reporter_email, '')), '') end,
    case when coalesce(p_is_anonymous, true) then null else nullif(trim(coalesce(p_reporter_phone, '')), '') end,
    p_category, trim(p_description), nullif(trim(coalesce(p_department, '')), ''), p_incident_date,
    nullif(trim(coalesce(p_involved_people, '')), ''), coalesce(p_language, 'es'),
    'received', 'normal', v_received, now()
  );
  insert into audit_logs (complaint_id, action, details)
  values (v_id, 'registered', jsonb_build_object('channel', p_channel));
  return v_id;
end;
$$;

-- ── 4. Identitat sota consulta ─────────────────────────────────────────
-- El panell deixa de poder llegir les tres columnes amb la denúncia. La consulta passa per una
-- funció que comprova el permís, exigeix la verificació en dos passos i ho anota al registre.

revoke select on complaints from authenticated;
grant select (
  id, reference, organization_id, is_anonymous, category, department, description, incident_date,
  involved_people, status, priority, language, created_at, updated_at, tracking_code,
  acknowledged_at, answered_at, extended_until, extension_reason, anonymized_at,
  channel, meeting_requested, meeting_held_at, outcome, investigation_started_at, fiscal_referral_at
) on complaints to authenticated;

create or replace function get_reporter_identity(p_complaint uuid)
returns table (reporter_name text, reporter_email text, reporter_phone text)
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
begin
  select c.id, c.category, c.is_anonymous into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id() and c.anonymized_at is null;
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'view') then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if v.is_anonymous then
    return;
  end if;
  insert into audit_logs (complaint_id, action, details) values (p_complaint, 'identity_viewed', '{}'::jsonb);
  return query
    select c.reporter_name, c.reporter_email, c.reporter_phone from complaints c where c.id = p_complaint;
end;
$$;

-- ── 5. Autoritat autonòmica de l'organització ──────────────────────────

create or replace function protect_organization_fields()
returns trigger
language plpgsql security invoker
set search_path = public
as $$
begin
  if not is_client_request() then
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

  if new.name is null or length(trim(new.name)) = 0 or length(new.name) > 160 then
    raise exception 'organization-name-invalid' using errcode = '22023';
  end if;
  -- L'enllaç de l'autoritat es mostra al canal públic: només adreces https
  if new.regional_authority_url is not null and new.regional_authority_url !~ '^https://[^\s<>"]+$' then
    raise exception 'authority-url-invalid' using errcode = '22023';
  end if;
  if length(coalesce(new.regional_authority_name, '')) > 160 or length(coalesce(new.regional_authority_url, '')) > 300 then
    raise exception 'authority-too-long' using errcode = '22023';
  end if;

  return new;
end;
$$;

drop function if exists get_organization_by_slug(text);
create function get_organization_by_slug(p_slug text)
returns table (id uuid, name text, slug text, regional_authority_name text, regional_authority_url text)
language sql security definer stable
set search_path = public
as $$
  select id, name, slug, regional_authority_name, regional_authority_url from organizations where slug = p_slug;
$$;

-- ── 6. Permisos d'execució ─────────────────────────────────────────────

revoke execute on function mark_meeting_held(uuid) from public, anon;
revoke execute on function mark_fiscal_referral(uuid, text) from public, anon;
revoke execute on function get_reporter_identity(uuid) from public, anon;
revoke execute on function register_complaint(text, text, text, timestamptz, boolean, text, text, text, text, date, text, text, text) from public, anon;
grant execute on function mark_meeting_held(uuid) to authenticated;
grant execute on function mark_fiscal_referral(uuid, text) to authenticated;
grant execute on function get_reporter_identity(uuid) to authenticated;
grant execute on function register_complaint(text, text, text, timestamptz, boolean, text, text, text, text, date, text, text, text) to authenticated;
grant execute on function get_organization_by_slug(text) to anon, authenticated;
