-- Migració 012: redisseny «dues meitats»
--
-- ADDITIVA I REPETIBLE: només afegeix columnes i funcions (if not exists, create or replace).
-- No esborra ni reanomena cap taula, columna ni política. Es pot executar dues vegades sense error.
-- Les polítiques RLS existents de complaints i organizations ja cobreixen les columnes noves
-- (són per fila), així que no se'n crea ni se'n canvia cap.
--
-- ORDRE: després de la 011. El frontend nou funciona igual abans d'executar-la: si les columnes
-- no hi són, el panell amaga el títol editable, «qui ho porta» i el filtre «només els meus»; el
-- «quan» es desa al final de la descripció, i «El meu cas» no ofereix el botó de demanar reunió.
--
-- Al final del fitxer hi ha l'explicació de cada bloc.

-- ── 1. Columnes noves ──────────────────────────────────────────────────

alter table complaints add column if not exists meeting_requested_at timestamptz;
alter table complaints add column if not exists incident_when text;
alter table complaints add column if not exists title text;
alter table complaints add column if not exists assigned_to uuid references profiles(id) on delete set null;
alter table complaints add column if not exists ai_summary text;
alter table complaints add column if not exists ai_title text;
alter table complaints add column if not exists ai_generated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'complaints_incident_when_len') then
    alter table complaints add constraint complaints_incident_when_len check (incident_when is null or length(incident_when) <= 200);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'complaints_title_len') then
    alter table complaints add constraint complaints_title_len check (title is null or length(title) <= 160);
  end if;
end $$;

create index if not exists complaints_assigned_to_idx on complaints(assigned_to);

-- Les reunions ja demanades compten des de la recepció (era l'únic moment en què es podien demanar)
update complaints set meeting_requested_at = created_at
where meeting_requested and meeting_requested_at is null;

alter table organizations add column if not exists responsible_appointed_at date;
alter table organizations add column if not exists aipi_notified_at date;
alter table organizations add column if not exists onboarding jsonb not null default '{}'::jsonb;

-- ── 2. Camps que decideix el servidor en crear una denúncia ────────────
-- Igual que a la 011, amb les columnes noves: pel formulari públic no es pot posar títol,
-- assignació ni resum, i la data de la petició de reunió la posa la base de dades.

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
      new.meeting_requested_at := case when new.meeting_requested then now() else null end;
      new.title := null;
      new.assigned_to := null;
      new.ai_summary := null;
      new.ai_title := null;
      new.ai_generated_at := null;
      new.incident_when := nullif(left(trim(coalesce(new.incident_when, '')), 200), '');
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

-- ── 3. Què pot canviar el panell en una denúncia ───────────────────────
-- Igual que a la 011, i a més: el panell pot posar el títol i qui porta el cas; no pot tocar el
-- «quan», la data de la petició de reunió ni el resum fet amb IA.

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
     or new.incident_when   is distinct from old.incident_when
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
  new.meeting_requested_at := old.meeting_requested_at;
  new.ai_summary := old.ai_summary;
  new.ai_title := old.ai_title;
  new.ai_generated_at := old.ai_generated_at;

  -- El títol és una etiqueta curta del panell; mai no es mostra a qui informa
  new.title := nullif(left(trim(coalesce(new.title, '')), 160), '');
  -- Només es pot assignar a una persona de la mateixa organització
  if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null
     and not exists (select 1 from profiles p where p.id = new.assigned_to and p.organization_id = new.organization_id) then
    raise exception 'assignee-not-in-organization' using errcode = '22023';
  end if;
  return new;
end;
$$;

-- El registre d'activitat també anota l'assignació (no el títol: és una etiqueta interna)
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
  if new.assigned_to is distinct from old.assigned_to then
    insert into audit_logs (complaint_id, action, details)
    values (new.id, 'assigned', jsonb_build_object(
      'to', new.assigned_to,
      'to_name', (select p.full_name from profiles p where p.id = new.assigned_to)));
  end if;
  return new;
end;
$$;

-- ── 4. Portal de seguiment: reunió presencial ──────────────────────────

-- Qui informa demana la reunió amb el seu codi (art. 7.2). Els 7 dies compten des d'aquí.
create or replace function request_meeting_by_code(p_code text)
returns timestamptz
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
begin
  select c.id, c.status, c.meeting_requested, c.meeting_requested_at into v
  from complaints c
  where c.tracking_hash = code_hash(p_code) and c.anonymized_at is null;
  if v.id is null then
    raise exception 'complaint-not-found' using errcode = 'P0002';
  end if;
  if v.status in ('resolved', 'closed', 'archived') then
    raise exception 'complaint-closed' using errcode = '22023';
  end if;
  -- Demanar-la dues vegades no mou la data: el termini compta des de la primera petició
  if v.meeting_requested then
    return coalesce(v.meeting_requested_at, now());
  end if;
  update complaints set meeting_requested = true, meeting_requested_at = now() where id = v.id;
  insert into audit_logs (complaint_id, action, details) values (v.id, 'meeting_requested', '{}'::jsonb);
  return now();
end;
$$;

-- L'estat que veu qui informa, ara amb la petició de reunió. PostgreSQL no deixa canviar les
-- columnes que retorna una funció amb «create or replace»: s'ha de tornar a crear. És la mateixa
-- funció, amb el mateix nom i els mateixos permisos, i dues columnes més al final.
drop function if exists get_complaint_by_tracking_code(text);
create function get_complaint_by_tracking_code(p_code text)
returns table (tracking_code text, status text, category text, created_at timestamptz, updated_at timestamptz,
               acknowledged_at timestamptz, answered_at timestamptz, extended_until date,
               meeting_requested boolean, meeting_requested_at timestamptz)
language sql security definer stable
set search_path = public
as $$
  select upper(trim(p_code)), c.status, c.category, c.created_at, c.updated_at, c.acknowledged_at, c.answered_at, c.extended_until,
         c.meeting_requested, c.meeting_requested_at
  from complaints c
  where c.tracking_hash = code_hash(p_code) and c.anonymized_at is null;
$$;

-- ── 5. Registre manual amb el «quan» en text lliure ────────────────────
-- Versió nova de register_complaint amb un paràmetre més (p_incident_when). La de la 011, sense
-- aquest paràmetre, continua existint: el panell crida la nova i, si no hi és, la d'abans.

create or replace function register_complaint(
  p_category text, p_description text, p_channel text, p_received_at timestamptz,
  p_is_anonymous boolean, p_reporter_name text, p_reporter_email text, p_reporter_phone text,
  p_department text, p_incident_date date, p_involved_people text, p_language text, p_code_hash text,
  p_incident_when text
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
    category, description, department, incident_date, incident_when, involved_people, language,
    status, priority, created_at, updated_at
  ) values (
    v_id, v_org, coalesce(nullif(p_code_hash, ''), 'manual-' || v_id::text), p_channel, coalesce(p_is_anonymous, true),
    case when coalesce(p_is_anonymous, true) then null else nullif(trim(coalesce(p_reporter_name, '')), '') end,
    case when coalesce(p_is_anonymous, true) then null else nullif(trim(coalesce(p_reporter_email, '')), '') end,
    case when coalesce(p_is_anonymous, true) then null else nullif(trim(coalesce(p_reporter_phone, '')), '') end,
    p_category, trim(p_description), nullif(trim(coalesce(p_department, '')), ''), p_incident_date,
    nullif(left(trim(coalesce(p_incident_when, '')), 200), ''),
    nullif(trim(coalesce(p_involved_people, '')), ''), coalesce(p_language, 'es'),
    'received', 'normal', v_received, now()
  );
  insert into audit_logs (complaint_id, action, details)
  values (v_id, 'registered', jsonb_build_object('channel', p_channel));
  return v_id;
end;
$$;

-- ── 6. Permisos (GRANT) ────────────────────────────────────────────────
-- La 011 va deixar la lectura de complaints columna a columna (per amagar la identitat):
-- les columnes noves s'hi han d'afegir expressament. La identitat continua sense ser llegible.

grant select (meeting_requested_at, incident_when, title, assigned_to, ai_summary, ai_title, ai_generated_at)
  on complaints to authenticated;

revoke execute on function request_meeting_by_code(text) from public;
grant execute on function request_meeting_by_code(text) to anon, authenticated;
revoke execute on function get_complaint_by_tracking_code(text) from public;
grant execute on function get_complaint_by_tracking_code(text) to anon, authenticated;
revoke execute on function register_complaint(text, text, text, timestamptz, boolean, text, text, text, text, date, text, text, text, text) from public, anon;
grant execute on function register_complaint(text, text, text, timestamptz, boolean, text, text, text, text, date, text, text, text, text) to authenticated;

-- Avisa l'API perquè vegi les columnes i funcions noves sense esperar
notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- QUÈ FA CADA BLOC
--
-- 1. Columnes noves
--    complaints.meeting_requested_at  quan es va demanar la reunió presencial (els 7 dies compten des d'aquí)
--    complaints.incident_when         el «quan» en text lliure («des del setembre»); incident_date es conserva
--    complaints.title                 títol curt del cas per al tauler; mai es mostra a qui informa
--    complaints.assigned_to           qui porta el cas (una persona de l'equip); si s'elimina, queda buit
--    complaints.ai_summary, ai_title, ai_generated_at   per a la fase 5 (IA); avui ningú no les omple
--    organizations.responsible_appointed_at, aipi_notified_at   dates del Responsable del Sistema (fase 4)
--    organizations.onboarding         passos de «Primers passos» marcats a mà (fase 4)
--    També: límit de llargada del «quan» i del títol, un índex per a «qui ho porta», i les reunions
--    ja demanades reben com a data de petició la de recepció.
--
-- 2. force_server_fields (substitueix la de la 011, mateix nom)
--    En crear una denúncia des del formulari públic, el servidor posa la data de la petició de
--    reunió i buida el títol, l'assignació i el resum: el navegador no els pot inventar.
--
-- 3. protect_complaint_content i audit_complaint_changes (substitueixen les de la 011)
--    El panell pot canviar estat, prioritat, resultat, títol i «qui ho porta». No pot canviar el
--    contingut de la denúncia, el «quan», la data de la reunió ni el resum fet amb IA.
--    Només es pot assignar a algú de la mateixa empresa. L'assignació queda al registre d'activitat.
--
-- 4. Portal de seguiment
--    request_meeting_by_code(p_code)     qui informa demana la reunió amb el seu codi; queda al registre
--    get_complaint_by_tracking_code      es torna a crear amb dues columnes més: meeting_requested i
--                                        meeting_requested_at (és l'únic «drop» del fitxer, i la funció
--                                        es recrea a la línia següent amb el mateix nom i permisos)
--
-- 5. register_complaint amb p_incident_when
--    Versió nova, amb un paràmetre més, per al registre manual (telèfon, presencial, carta).
--    La versió de la 011 no es toca.
--
-- 6. Permisos
--    Lectura de les columnes noves per a usuaris amb sessió (les polítiques RLS i la verificació en
--    dos passos continuen decidint quines files veu cadascú). Execució de les funcions noves:
--    les del portal, sense sessió; el registre manual, només amb sessió.
-- ══════════════════════════════════════════════════════════════════════
