-- Vuelta atrás de la 020 (exclusión por caso). Se puede ejecutar más de una vez. NO borra datos: la tabla
-- complaint_exclusions se queda donde está (sin uso) y las funciones vuelven a como estaban en la 019.
-- Orden: primero se quitan de las políticas y funciones las llamadas a is_excluded(), y luego se borra.

-- 1. Las políticas de complaints, sin la exclusión (como en la 010)
drop policy if exists "org_select_complaints" on complaints;
create policy "org_select_complaints" on complaints
  for select using (
    organization_id = current_org_id() and can_access_category(category, 'view')
  );

drop policy if exists "org_update_complaints" on complaints;
create policy "org_update_complaints" on complaints
  for update using (
    organization_id = current_org_id() and can_access_category(category, 'edit')
  )
  with check (
    organization_id = current_org_id() and can_access_category(category, 'edit')
  );

-- 2. Las funciones del panel, sin la comprobación de exclusión (como en la 011/014)
create or replace function get_reporter_identity(p_complaint uuid)
returns table (reporter_name text, reporter_email text, reporter_phone text)
language plpgsql security definer set search_path = public as $$
declare v record;
begin
  select c.id, c.category, c.is_anonymous into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id() and c.anonymized_at is null;
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'view') then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if v.is_anonymous then return; end if;
  insert into audit_logs (complaint_id, action, details) values (p_complaint, 'identity_viewed', '{}'::jsonb);
  return query select c.reporter_name, c.reporter_email, c.reporter_phone from complaints c where c.id = p_complaint;
end;
$$;

create or replace function extend_response_deadline(p_complaint uuid, p_reason text)
returns date language plpgsql security definer set search_path = public as $$
declare v record; v_until date;
begin
  if p_reason is null or length(trim(p_reason)) < 10 then raise exception 'reason-required' using errcode = '22023'; end if;
  select c.id, c.category, c.created_at, c.organization_id, c.extended_until, c.answered_at into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id();
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'edit') then raise exception 'not-allowed' using errcode = '42501'; end if;
  if v.extended_until is not null or v.answered_at is not null then raise exception 'already-extended-or-answered' using errcode = '22023'; end if;
  if (now() at time zone 'Europe/Madrid')::date > ((v.created_at at time zone 'Europe/Madrid')::date + interval '3 months')::date then raise exception 'deadline-passed' using errcode = '22023'; end if;
  v_until := ((v.created_at at time zone 'Europe/Madrid')::date + interval '6 months')::date;
  update complaints set extended_until = v_until, extension_reason = trim(p_reason) where id = p_complaint;
  insert into audit_logs (complaint_id, action, details) values (p_complaint, 'deadline_extended', jsonb_build_object('until', v_until, 'note', trim(p_reason)));
  return v_until;
end;
$$;

create or replace function mark_meeting_held(p_complaint uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v record;
begin
  select c.id, c.category, c.meeting_requested, c.meeting_held_at into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id() and c.anonymized_at is null;
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'edit') then raise exception 'not-allowed' using errcode = '42501'; end if;
  if not v.meeting_requested or v.meeting_held_at is not null then raise exception 'no-pending-meeting' using errcode = '22023'; end if;
  update complaints set meeting_held_at = now() where id = p_complaint;
  insert into audit_logs (complaint_id, action, details) values (p_complaint, 'meeting_held', '{}'::jsonb);
  return now();
end;
$$;

create or replace function mark_fiscal_referral(p_complaint uuid, p_note text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v record;
begin
  select c.id, c.category, c.fiscal_referral_at into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id() and c.anonymized_at is null;
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'edit') then raise exception 'not-allowed' using errcode = '42501'; end if;
  if v.fiscal_referral_at is not null then raise exception 'already-referred' using errcode = '22023'; end if;
  update complaints set fiscal_referral_at = now() where id = p_complaint;
  insert into audit_logs (complaint_id, action, details) values (p_complaint, 'fiscal_referral', jsonb_build_object('note', nullif(trim(coalesce(p_note, '')), '')));
  return now();
end;
$$;

create or replace function anonymize_complaint(p_complaint uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v record;
begin
  if p_reason is null or length(trim(p_reason)) < 5 then raise exception 'reason-required' using errcode = '22023'; end if;
  select c.id, c.category, c.reference into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id() and c.anonymized_at is null;
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'delete') then raise exception 'not-allowed' using errcode = '42501'; end if;
  delete from messages where complaint_id = p_complaint;
  delete from attachments where complaint_id = p_complaint;
  update complaints set
    description = '', department = null, involved_people = null, incident_date = null,
    incident_when = null, title = null, extension_reason = null,
    ai_summary = null, ai_title = null, ai_generated_at = null,
    reporter_name = null, reporter_email = null, reporter_phone = null,
    tracking_hash = 'anon-' || id::text, anonymized_at = now()
  where id = p_complaint;
  update audit_logs set details = details - 'note' - 'reason'
  where complaint_id = p_complaint and (details ? 'note' or details ? 'reason');
  insert into audit_logs (complaint_id, action, details) values (p_complaint, 'anonymized', jsonb_build_object('note', trim(p_reason)));
end;
$$;

-- submit_complaint de 14 parámetros vuelve a su cuerpo de la 019 (sin reenviar a la versión con exclusiones)
create or replace function submit_complaint(
  p_org uuid, p_hash text, p_category text, p_description text, p_is_anonymous boolean,
  p_name text, p_email text, p_phone text, p_department text, p_incident_date date,
  p_involved text, p_language text, p_meeting boolean, p_when text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_anon boolean := coalesce(p_is_anonymous, true);
  v_desc text := trim(coalesce(p_description, ''));
  v_old record; v_id uuid;
begin
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid-code' using errcode = '22023'; end if;
  if not exists (select 1 from organizations where id = p_org) then raise exception 'organization-not-found' using errcode = 'P0002'; end if;
  if length(v_desc) = 0 then raise exception 'description-required' using errcode = '22023'; end if;
  if length(v_desc) > 20000 or length(coalesce(p_name, '')) > 200 or length(coalesce(p_email, '')) > 200
     or length(coalesce(p_phone, '')) > 50 or length(coalesce(p_department, '')) > 200
     or length(coalesce(p_involved, '')) > 2000 then raise exception 'too-long' using errcode = '22023'; end if;
  select c.id, c.organization_id, c.category, c.description, c.is_anonymous, c.created_at into v_old
  from complaints c where c.tracking_hash in (p_hash, tracking_key(p_hash));
  if v_old.id is not null then
    if v_old.organization_id = p_org and v_old.category = p_category and v_old.description = v_desc
       and v_old.is_anonymous = v_anon and v_old.created_at > now() - interval '2 hours' then return v_old.id; end if;
    raise exception 'code-conflict' using errcode = '23505';
  end if;
  insert into complaints (
    tracking_hash, organization_id, is_anonymous, reporter_name, reporter_email, reporter_phone,
    category, department, description, incident_date, involved_people, language,
    meeting_requested, meeting_requested_at, incident_when, status, priority, channel)
  values (
    p_hash, p_org, v_anon,
    case when v_anon then null else nullif(trim(p_name), '') end,
    case when v_anon then null else nullif(trim(p_email), '') end,
    case when v_anon then null else nullif(trim(p_phone), '') end,
    p_category, nullif(trim(p_department), ''), v_desc, p_incident_date, nullif(trim(p_involved), ''),
    coalesce(nullif(left(p_language, 5), ''), 'ca'),
    coalesce(p_meeting, false), case when p_meeting then now() else null end,
    nullif(left(trim(coalesce(p_when, '')), 200), ''), 'received', 'normal', 'web')
  returning id into v_id;
  insert into audit_logs (complaint_id, action, details)
  values (v_id, 'created', jsonb_build_object('channel', 'web', 'language', coalesce(nullif(left(p_language, 5), ''), 'ca')));
  return v_id;
end;
$$;
grant execute on function submit_complaint(uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text) to anon, authenticated;

-- 3. Fuera las funciones nuevas de la 020 (la tabla complaint_exclusions se queda, sin uso)
drop function if exists submit_complaint(uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text, uuid[]);
drop function if exists get_channel_managers(uuid);
drop function if exists list_complaint_access(uuid);
drop function if exists complaint_access_count(uuid);
drop function if exists exclude_from_complaint(uuid, uuid);
drop function if exists include_in_complaint(uuid, uuid);
drop function if exists is_excluded(uuid);

notify pgrst, 'reload schema';
