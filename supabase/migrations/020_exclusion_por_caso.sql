-- ══════════════════════════════════════════════════════════════════════
-- 020 · Exclusión por caso (ronda 2 de seguridad, hallazgo C1)
--
-- Si una denuncia va contra alguien que tiene acceso al panel, esa persona no debe poder verla. Quien
-- denuncia puede apartar a personas del panel al enviar la denuncia; el Responsable o un administrador
-- también puede apartar a alguien, pero NUNCA puede volver a dar acceso a quien apartó quien denunció.
-- Quien está apartado no ve el caso en ningún sitio: ni en el tauler, ni al abrirlo por id, ni en los
-- contadores, ni al consultar la identidad, ni al suprimir, ni en los avisos por correo (función notify),
-- ni en las exportaciones (salen de lo que el panel puede leer, y eso ya pasa por estas reglas).
--
-- Aditiva y repetible: solo añade una tabla y funciones, y vuelve a crear políticas y funciones que ya
-- existían. No borra ni transforma ningún dato. Se puede ejecutar más de una vez.
-- Necesita la 019 (estado actual de producción). Vuelta atrás: supabase/rollback/020_atras.sql.
-- La aplicación funciona igual antes y después: sin esta migración, la función que lista quién gestiona
-- el canal no existe y el formulario no ofrece apartar a nadie (ver supabase.js: withExclusion).
-- Al final está la explicación de cada bloque en palabras llanas.
-- ══════════════════════════════════════════════════════════════════════

-- ── 0. La tabla de exclusiones ─────────────────────────────────────────
-- Una fila por persona apartada de un caso. «source» dice quién la apartó: 'reporter' (quien denunció,
-- no se puede deshacer) o 'manager' (el Responsable o un administrador, que sí se puede deshacer).

create table if not exists complaint_exclusions (
  complaint_id uuid not null references complaints(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  source       text not null check (source in ('reporter', 'manager')),
  created_at   timestamptz not null default now(),
  primary key (complaint_id, profile_id)
);

alter table complaint_exclusions enable row level security;
revoke all on complaint_exclusions from public;
do $$
begin
  execute 'revoke all on complaint_exclusions from anon, authenticated';
exception when undefined_object then null;
end $$;
-- No hay políticas de acceso directo: todo pasa por las funciones de abajo (security definer).

create index if not exists complaint_exclusions_profile_idx on complaint_exclusions (profile_id);

-- ── 1. ¿Está la persona que pregunta apartada de este caso? ────────────
-- Se usa dentro de las políticas RLS y de las funciones. Solo revela tu propia situación.

create or replace function is_excluded(p_complaint uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from complaint_exclusions ce
    where ce.complaint_id = p_complaint and ce.profile_id = auth.uid()
  );
$$;
grant execute on function is_excluded(uuid) to anon, authenticated;

-- ── 2. El caso desaparece para quien está apartado ─────────────────────
-- Se vuelven a crear las dos políticas de complaints con «y no estoy apartado». messages, attachments,
-- audit_logs y storage heredan esto: sus políticas preguntan «¿existe la denuncia?» y esa subconsulta
-- pasa por la RLS de complaints (como ya pasa con la categoría).

drop policy if exists "org_select_complaints" on complaints;
create policy "org_select_complaints" on complaints
  for select using (
    organization_id = current_org_id()
    and can_access_category(category, 'view')
    and not is_excluded(id)
  );

drop policy if exists "org_update_complaints" on complaints;
create policy "org_update_complaints" on complaints
  for update using (
    organization_id = current_org_id()
    and can_access_category(category, 'edit')
    and not is_excluded(id)
  )
  with check (
    organization_id = current_org_id()
    and can_access_category(category, 'edit')
    and not is_excluded(id)
  );

-- ── 3. Las funciones del panel también respetan la exclusión ───────────
-- Son «security definer» (se saltan la RLS), así que la comprobación va a mano. Cada una es la misma de
-- la migración donde nació, con un «and not is_excluded(...)» añadido en la guarda de permiso.

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
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'view') or is_excluded(p_complaint) then
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

create or replace function extend_response_deadline(p_complaint uuid, p_reason text)
returns date
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
  v_until date;
begin
  if p_reason is null or length(trim(p_reason)) < 10 then
    raise exception 'reason-required' using errcode = '22023';
  end if;
  select c.id, c.category, c.created_at, c.organization_id, c.extended_until, c.answered_at into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id();
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'edit') or is_excluded(p_complaint) then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if v.extended_until is not null or v.answered_at is not null then
    raise exception 'already-extended-or-answered' using errcode = '22023';
  end if;
  if (now() at time zone 'Europe/Madrid')::date > ((v.created_at at time zone 'Europe/Madrid')::date + interval '3 months')::date then
    raise exception 'deadline-passed' using errcode = '22023';
  end if;

  v_until := ((v.created_at at time zone 'Europe/Madrid')::date + interval '6 months')::date;
  update complaints set extended_until = v_until, extension_reason = trim(p_reason) where id = p_complaint;
  insert into audit_logs (complaint_id, action, details)
  values (p_complaint, 'deadline_extended', jsonb_build_object('until', v_until, 'note', trim(p_reason)));
  return v_until;
end;
$$;

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
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'edit') or is_excluded(p_complaint) then
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
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'edit') or is_excluded(p_complaint) then
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

-- La supresión (art. 32): quien está apartado tampoco la puede pedir. El resto, igual que en la 014.
create or replace function anonymize_complaint(p_complaint uuid, p_reason text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
begin
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'reason-required' using errcode = '22023';
  end if;
  select c.id, c.category, c.reference into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id() and c.anonymized_at is null;
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'delete') or is_excluded(p_complaint) then
    raise exception 'not-allowed' using errcode = '42501';
  end if;

  delete from messages where complaint_id = p_complaint;
  delete from attachments where complaint_id = p_complaint;
  update complaints set
    description = '', department = null, involved_people = null, incident_date = null,
    incident_when = null, title = null, extension_reason = null,
    ai_summary = null, ai_title = null, ai_generated_at = null,
    reporter_name = null, reporter_email = null, reporter_phone = null,
    tracking_hash = 'anon-' || id::text,
    anonymized_at = now()
  where id = p_complaint;
  update audit_logs set details = details - 'note' - 'reason'
  where complaint_id = p_complaint and (details ? 'note' or details ? 'reason');
  insert into audit_logs (complaint_id, action, details)
  values (p_complaint, 'anonymized', jsonb_build_object('note', trim(p_reason)));
end;
$$;

-- ── 4. Quién gestiona el canal (para que quien denuncia pueda apartar) ─
-- El canal es público: quien va a denunciar ve quién podría leer su caso y puede apartar a quien quiera.
-- Devuelve solo el nombre y el rol; nada más. ⚖️ Expone al público los nombres del equipo (REVISION_LEGAL).

create or replace function get_channel_managers(p_org uuid)
returns table (id uuid, full_name text, role text)
language sql stable security definer
set search_path = public
as $$
  select p.id, coalesce(nullif(trim(p.full_name), ''), '') as full_name, p.role
  from profiles p
  where p.organization_id = p_org and p.role in ('superadmin', 'manager')
  order by (p.role = 'superadmin') desc, p.full_name;
$$;
grant execute on function get_channel_managers(uuid) to anon, authenticated;

-- ── 5. Enviar la denuncia apartando a personas ─────────────────────────
-- submit_complaint con un parámetro más: la lista de personas que quien denuncia aparta. Es la misma
-- función de la 019, con la lista al final. La versión de 14 parámetros se queda y llama a esta con '{}'.
-- Solo se apartan ids que de verdad son del panel de esa empresa. El aviso de «apartas a todos» lo da el
-- navegador (no se rechaza el envío: la ley exige que la denuncia entre igual).

create or replace function submit_complaint(
  p_org uuid, p_hash text, p_category text, p_description text, p_is_anonymous boolean,
  p_name text, p_email text, p_phone text, p_department text, p_incident_date date,
  p_involved text, p_language text, p_meeting boolean, p_when text, p_excluded uuid[])
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_anon boolean := coalesce(p_is_anonymous, true);
  v_desc text := trim(coalesce(p_description, ''));
  v_old record;
  v_id uuid;
begin
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid-code' using errcode = '22023';
  end if;
  if not exists (select 1 from organizations where id = p_org) then
    raise exception 'organization-not-found' using errcode = 'P0002';
  end if;
  if length(v_desc) = 0 then
    raise exception 'description-required' using errcode = '22023';
  end if;
  if length(v_desc) > 20000 or length(coalesce(p_name, '')) > 200 or length(coalesce(p_email, '')) > 200
     or length(coalesce(p_phone, '')) > 50 or length(coalesce(p_department, '')) > 200
     or length(coalesce(p_involved, '')) > 2000 then
    raise exception 'too-long' using errcode = '22023';
  end if;

  select c.id, c.organization_id, c.category, c.description, c.is_anonymous, c.created_at into v_old
  from complaints c where c.tracking_hash in (p_hash, tracking_key(p_hash));
  if v_old.id is not null then
    if v_old.organization_id = p_org and v_old.category = p_category and v_old.description = v_desc
       and v_old.is_anonymous = v_anon and v_old.created_at > now() - interval '2 hours' then
      return v_old.id;
    end if;
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
    nullif(left(trim(coalesce(p_when, '')), 200), ''),
    'received', 'normal', 'web')
  returning id into v_id;

  -- Apartar a quien pidió quien denuncia: solo personas reales del panel de esta empresa
  if p_excluded is not null and array_length(p_excluded, 1) is not null then
    insert into complaint_exclusions (complaint_id, profile_id, source)
    select v_id, p.id, 'reporter'
    from profiles p
    where p.id = any (p_excluded) and p.organization_id = p_org and p.role in ('superadmin', 'manager')
    on conflict (complaint_id, profile_id) do nothing;
  end if;

  insert into audit_logs (complaint_id, action, details)
  values (v_id, 'created', jsonb_build_object('channel', 'web', 'language', coalesce(nullif(left(p_language, 5), ''), 'ca')));
  return v_id;
end;
$$;

-- La versión de 14 parámetros (la que llama el navegador hoy) sigue existiendo: ahora reenvía a la nueva
create or replace function submit_complaint(
  p_org uuid, p_hash text, p_category text, p_description text, p_is_anonymous boolean,
  p_name text, p_email text, p_phone text, p_department text, p_incident_date date,
  p_involved text, p_language text, p_meeting boolean, p_when text)
returns uuid
language sql security definer
set search_path = public
as $$
  select submit_complaint(p_org, p_hash, p_category, p_description, p_is_anonymous, p_name, p_email, p_phone,
                          p_department, p_incident_date, p_involved, p_language, p_meeting, p_when, '{}'::uuid[]);
$$;

revoke execute on function submit_complaint(uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text, uuid[]) from public;
grant execute on function submit_complaint(uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text, uuid[]) to anon, authenticated;
grant execute on function submit_complaint(uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text) to anon, authenticated;

-- ── 6. El panel: ver y gestionar quién está apartado ───────────────────

-- Cuántas personas con acceso quedarían (para no dejar un caso sin nadie que lo vea)
create or replace function complaint_access_count(p_complaint uuid)
returns integer
language sql stable security definer
set search_path = public
as $$
  select count(*)::int
  from profiles p
  join complaints c on c.id = p_complaint
  where p.organization_id = c.organization_id
    and (p.role = 'superadmin' or exists (
      select 1 from manager_permissions mp
      where mp.manager_id = p.id and mp.organization_id = p.organization_id
        and mp.category = c.category and mp.can_view))
    and not exists (select 1 from complaint_exclusions ce where ce.complaint_id = p_complaint and ce.profile_id = p.id);
$$;
revoke execute on function complaint_access_count(uuid) from public, anon;
grant execute on function complaint_access_count(uuid) to authenticated;

-- Quién gestiona el caso y quién está apartado (para la ficha). Solo quien puede ver el caso y con el
-- segundo paso hecho; si tú mismo estás apartado, no ves nada (la guarda inicial lo corta).
create or replace function list_complaint_access(p_complaint uuid)
returns table (id uuid, full_name text, role text, excluded boolean, source text)
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
begin
  select c.id, c.category into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id();
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'view') or is_excluded(p_complaint) then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  return query
    select p.id, coalesce(nullif(trim(p.full_name), ''), '') as full_name, p.role,
           ce.profile_id is not null as excluded, ce.source
    from profiles p
    left join complaint_exclusions ce on ce.complaint_id = p_complaint and ce.profile_id = p.id
    where p.organization_id = current_org_id() and p.role in ('superadmin', 'manager')
    order by (p.role = 'superadmin') desc, p.full_name;
end;
$$;
revoke execute on function list_complaint_access(uuid) from public, anon;
grant execute on function list_complaint_access(uuid) to authenticated;

-- Apartar a alguien (Responsable o administrador). No deja el caso sin nadie que lo vea.
create or replace function exclude_from_complaint(p_complaint uuid, p_profile uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
begin
  select c.id, c.category, c.organization_id into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id() and c.anonymized_at is null;
  if v.id is null or not is_superadmin() or not is_aal2() or is_excluded(p_complaint) then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from profiles p where p.id = p_profile and p.organization_id = v.organization_id and p.role in ('superadmin', 'manager')) then
    raise exception 'profile-not-in-organization' using errcode = '22023';
  end if;
  insert into complaint_exclusions (complaint_id, profile_id, source)
  values (p_complaint, p_profile, 'manager')
  on conflict (complaint_id, profile_id) do nothing;
  if complaint_access_count(p_complaint) < 1 then
    raise exception 'last-viewer' using errcode = '22023';
  end if;
  insert into audit_logs (complaint_id, action, details)
  values (p_complaint, 'access_excluded', jsonb_build_object('profile', p_profile));
end;
$$;
revoke execute on function exclude_from_complaint(uuid, uuid) from public, anon;
grant execute on function exclude_from_complaint(uuid, uuid) to authenticated;

-- Volver a dar acceso: solo a quien apartó un administrador, NUNCA a quien apartó quien denunció.
create or replace function include_in_complaint(p_complaint uuid, p_profile uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
  v_src text;
begin
  select c.id into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id() and c.anonymized_at is null;
  if v.id is null or not is_superadmin() or not is_aal2() or is_excluded(p_complaint) then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  select source into v_src from complaint_exclusions where complaint_id = p_complaint and profile_id = p_profile;
  if v_src = 'reporter' then
    raise exception 'reporter-exclusion' using errcode = '42501';
  end if;
  delete from complaint_exclusions where complaint_id = p_complaint and profile_id = p_profile and source = 'manager';
  if found then
    insert into audit_logs (complaint_id, action, details)
    values (p_complaint, 'access_restored', jsonb_build_object('profile', p_profile));
  end if;
end;
$$;
revoke execute on function include_in_complaint(uuid, uuid) from public, anon;
grant execute on function include_in_complaint(uuid, uuid) to authenticated;

-- Avisa a la API de los cambios
notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- Qué hace cada bloque, en palabras llanas
--
-- 0. Una tabla nueva que guarda, por caso, quién está apartado y quién lo apartó (quien denunció o un
--    administrador). La web no la toca directamente: todo pasa por las funciones de abajo.
-- 1. Una función que dice si la persona que pregunta está apartada de un caso.
-- 2. El caso desaparece para quien está apartado: en el tauler, al abrirlo, en los contadores y en todo
--    lo que cuelga de él (mensajes, adjuntos, registro), porque todo eso pregunta antes «¿existe la
--    denuncia para mí?».
-- 3. Las acciones del panel (ver la identidad, ampliar el plazo, marcar la reunión, remitir al fiscal,
--    suprimir) también comprueban que quien las pide no esté apartado.
-- 4. El canal puede preguntar quién gestiona una empresa, para que quien denuncia aparte a quien quiera.
-- 5. Al enviar la denuncia se puede mandar la lista de personas apartadas; solo valen las que de verdad
--    son del panel de esa empresa. Si se aparta a todas, la denuncia entra igual (lo avisa el navegador).
-- 6. El panel puede ver quién gestiona el caso y quién está apartado, apartar a alguien más (sin dejar el
--    caso sin nadie) y devolver el acceso, pero nunca a quien apartó quien denunció.
-- ══════════════════════════════════════════════════════════════════════
