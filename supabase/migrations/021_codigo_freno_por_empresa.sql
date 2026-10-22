-- ══════════════════════════════════════════════════════════════════════
-- 021 · Código de seguimiento: freno por empresa y prueba de trabajo (ronda 2, hallazgos A1 y A2)
--
-- A1 · Hoy hay respuestas que dicen si un código existe sin pasar por el freno (submit_complaint con
--      'code-conflict', y la inserción directa). Y el freno es GLOBAL: con poco esfuerzo se bloquea el
--      portal de todas las empresas (A2).
--
-- Esta migración añade un camino nuevo y endurecido para el portal de seguimiento y el envío:
--   · Freno POR EMPRESA (no global): una empresa no puede bloquear el portal de otra.
--   · Prueba de trabajo en el navegador (sin terceros ni IP): el servidor da un reto, el navegador lo
--     resuelve, y la dificultad SUBE con los intentos fallidos en vez de bloquear. Nadie puede impedir
--     que entre quien tiene su código.
--   · Las funciones nuevas buscan solo en la empresa del canal: aun acertando, solo se acierta un código
--     de esa empresa.
--   · submit_complaint nuevo: idempotencia por «id de envío» (no por el código) y, si un código ya existe,
--     error genérico que cuenta como intento. Nunca se revela si un código existe.
--   · Se cierra la inserción directa de denuncias (anon y authenticated): la única vía es la función.
--
-- Las funciones de ANTES se quedan igual (el navegador actual las sigue usando hasta que se cablee el
-- camino nuevo). Así esta migración no cambia el comportamiento de la web publicada.
--
-- Aditiva y repetible. Necesita la 014 (freno) y la 019 (huella con secreto). Vuelta atrás:
-- supabase/rollback/021_atras.sql. Al final, la explicación en palabras llanas.
-- ══════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regprocedure('public.tracking_key(text)') is null then
    raise exception 'Antes de la 021 hay que ejecutar la 019_huella_con_secreto.sql';
  end if;
end $$;

-- ── 1. Freno por empresa (y un contador global, solo para subir la dificultad) ──
-- El id de empresa '00000000-…' es el cubo global. Se guardan recuentos por minuto; nunca una IP.

create table if not exists code_attempts_by_org (
  window_start timestamptz not null,
  org_id       uuid not null,
  failures     int not null default 0,
  primary key (window_start, org_id)
);
alter table code_attempts_by_org enable row level security;
revoke all on code_attempts_by_org from public;
do $$
begin
  execute 'revoke all on code_attempts_by_org from anon, authenticated';
exception when undefined_object then null;
end $$;

create or replace function code_attempt_failed(p_org uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_global constant uuid := '00000000-0000-0000-0000-000000000000';
  v_min timestamptz := date_trunc('minute', now());
begin
  if p_org is not null and p_org <> v_global then
    insert into code_attempts_by_org (window_start, org_id, failures) values (v_min, p_org, 1)
    on conflict (window_start, org_id) do update set failures = code_attempts_by_org.failures + 1;
  end if;
  insert into code_attempts_by_org (window_start, org_id, failures) values (v_min, v_global, 1)
  on conflict (window_start, org_id) do update set failures = code_attempts_by_org.failures + 1;
  delete from code_attempts_by_org where window_start < now() - interval '1 day';
end;
$$;
revoke all on function code_attempt_failed(uuid) from public, anon, authenticated;

create or replace function code_failures_recent(p_org uuid)
returns integer
language sql stable security definer
set search_path = public
as $$
  select coalesce(sum(failures), 0)::int from code_attempts_by_org
  where org_id = coalesce(p_org, '00000000-0000-0000-0000-000000000000') and window_start > now() - interval '10 minutes';
$$;
revoke all on function code_failures_recent(uuid) from public, anon, authenticated;

-- Bits de dificultad de la prueba de trabajo: parte de 12 y sube con los fallos de la empresa y, más
-- despacio, con los globales. Nunca bloquea; como mucho, cuesta más. Tope de 18 bits: medido en un móvil
-- lento (CPU x6) con sha-256 del navegador, 18 bits se resuelven en ~1-2 s; a partir de 20 ya son >10 s,
-- que para quien denuncia equivale a un bloqueo. La defensa de verdad es el código de 16 caracteres (80 bits).
create or replace function pow_bits_required(p_org uuid)
returns integer
language sql stable security definer
set search_path = public
as $$
  select least(18, greatest(12, 12 + (code_failures_recent(p_org) / 25) + (code_failures_recent('00000000-0000-0000-0000-000000000000') / 250)))::int;
$$;
revoke all on function pow_bits_required(uuid) from public, anon;
grant execute on function pow_bits_required(uuid) to anon, authenticated;

-- ── 2. La prueba de trabajo ────────────────────────────────────────────
-- El servidor da un reto (token + bits). El navegador busca un número (nonce) tal que
-- sha256(token:nonce) empiece por «bits» ceros. Un reto sirve una sola vez y caduca en 5 minutos.

create table if not exists pow_challenges (
  token      text primary key,
  org_id     uuid,
  bits       int not null,
  used       boolean not null default false,
  created_at timestamptz not null default now()
);
alter table pow_challenges enable row level security;
revoke all on pow_challenges from public;
do $$
begin
  execute 'revoke all on pow_challenges from anon, authenticated';
exception when undefined_object then null;
end $$;

-- Un tope de retos vivos por empresa, para que anon no pueda llenar la tabla pidiendo retos sin parar.
create or replace function issue_pow_challenge(p_org uuid)
returns table (token text, bits int)
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_bits  int := pow_bits_required(p_org);
begin
  -- Fuera los caducados (de cualquier empresa): un reto vale 5 minutos
  delete from pow_challenges where created_at < now() - interval '5 minutes';
  -- Y, de esta empresa, deja solo los 50 más nuevos (los demás, fuera): así la tabla queda acotada
  delete from pow_challenges where ctid in (
    select ctid from pow_challenges where org_id is not distinct from p_org
    order by created_at desc offset 50
  );
  insert into pow_challenges (token, org_id, bits) values (v_token, p_org, v_bits);
  return query select v_token, v_bits;
end;
$$;
revoke all on function issue_pow_challenge(uuid) from public;
grant execute on function issue_pow_challenge(uuid) to anon, authenticated;

-- Comprueba el reto: que exista, no esté usado, sea reciente y de esta empresa, y que el nonce dé un
-- hash con tantos ceros por delante como pedía el reto. Lo marca como usado y devuelve true.
create or replace function verify_pow(p_token text, p_nonce text, p_org uuid)
returns boolean
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v record;
  d bytea;
  full_bytes int;
  rem int;
  i int;
begin
  if p_token is null or p_nonce is null then
    return false;
  end if;
  select * into v from pow_challenges
  where token = p_token and not used and org_id is not distinct from p_org and created_at > now() - interval '5 minutes';
  if v.token is null then
    return false;
  end if;
  d := pg_catalog.sha256(convert_to(p_token || ':' || p_nonce, 'UTF8'));
  full_bytes := v.bits / 8;
  rem := v.bits % 8;
  for i in 0 .. full_bytes - 1 loop
    if get_byte(d, i) <> 0 then
      return false;
    end if;
  end loop;
  if rem <> 0 and (get_byte(d, full_bytes) >> (8 - rem)) <> 0 then
    return false;
  end if;
  update pow_challenges set used = true where token = p_token;
  return true;
end;
$$;
revoke all on function verify_pow(text, text, uuid) from public, anon, authenticated;

-- ── 3. Buscar una denuncia por código SOLO dentro de su empresa ────────
-- Igual que find_complaint_by_code (019, con reescritura perezosa), pero acotado a una empresa.

create or replace function find_complaint_in_org(p_code text, p_org uuid)
returns uuid
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_plain text := code_hash(p_code);
  v_keyed text := tracking_key(v_plain);
  v_id uuid;
  v_hash text;
begin
  select c.id, c.tracking_hash into v_id, v_hash
  from complaints c
  where c.organization_id = p_org and c.tracking_hash in (v_keyed, v_plain) and c.anonymized_at is null
  limit 1;
  if v_id is not null and v_hash = v_plain then
    perform set_config('reportia.rehashing', 'on', true);
    update complaints set tracking_hash = v_keyed where id = v_id;
    perform set_config('reportia.rehashing', 'off', true);
  end if;
  return v_id;
end;
$$;
revoke all on function find_complaint_in_org(text, uuid) from public, anon, authenticated;

-- ── 4. El portal de seguimiento endurecido (empresa + prueba de trabajo) ──
-- Cada una exige una prueba de trabajo válida ANTES de mirar nada. Si el código no existe, cuenta como
-- intento fallido de esa empresa (sube la dificultad) y devuelve vacío: nunca dice si existe o no.

create or replace function consult_complaint(p_org uuid, p_code text, p_pow_token text, p_pow_nonce text)
returns table (tracking_code text, status text, category text, created_at timestamptz, updated_at timestamptz,
               acknowledged_at timestamptz, answered_at timestamptz, extended_until date,
               meeting_requested boolean, meeting_requested_at timestamptz)
language plpgsql security definer volatile
set search_path = public
as $$
#variable_conflict use_column
declare
  v_complaint uuid;
begin
  if not verify_pow(p_pow_token, p_pow_nonce, p_org) then
    raise exception 'proof-required' using errcode = '42501';
  end if;
  v_complaint := find_complaint_in_org(p_code, p_org);
  if v_complaint is null then
    perform code_attempt_failed(p_org);
    return;
  end if;
  return query
    select upper(trim(p_code)), c.status, c.category, c.created_at, c.updated_at, c.acknowledged_at, c.answered_at,
           c.extended_until, c.meeting_requested, c.meeting_requested_at
    from complaints c where c.id = v_complaint;
end;
$$;
grant execute on function consult_complaint(uuid, text, text, text) to anon, authenticated;

create or replace function messages_by_code(p_org uuid, p_code text, p_pow_token text, p_pow_nonce text)
returns table (id uuid, sender text, content text, is_read boolean, created_at timestamptz)
language plpgsql security definer volatile
set search_path = public
as $$
#variable_conflict use_column
declare
  v_complaint uuid;
begin
  if not verify_pow(p_pow_token, p_pow_nonce, p_org) then
    raise exception 'proof-required' using errcode = '42501';
  end if;
  v_complaint := find_complaint_in_org(p_code, p_org);
  if v_complaint is null then
    perform code_attempt_failed(p_org);
    return;
  end if;
  return query
    select m.id, m.sender, m.content, m.is_read, m.created_at
    from messages m where m.complaint_id = v_complaint
    order by m.created_at asc;
end;
$$;
grant execute on function messages_by_code(uuid, text, text, text) to anon, authenticated;

create or replace function send_message_by_code(p_org uuid, p_code text, p_content text, p_pow_token text, p_pow_nonce text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_complaint uuid;
  v_status text;
  v_message uuid;
begin
  if not verify_pow(p_pow_token, p_pow_nonce, p_org) then
    raise exception 'proof-required' using errcode = '42501';
  end if;
  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'empty-message' using errcode = '22023';
  end if;
  if length(p_content) > 10000 then
    raise exception 'message-too-long' using errcode = '22023';
  end if;
  v_complaint := find_complaint_in_org(p_code, p_org);
  if v_complaint is null then
    perform code_attempt_failed(p_org);
    return null;
  end if;
  select status into v_status from complaints where id = v_complaint;
  insert into messages (complaint_id, sender, content) values (v_complaint, 'reporter', trim(p_content)) returning id into v_message;
  if v_status = 'waiting' then
    update complaints set status = 'investigating' where id = v_complaint;
  end if;
  return v_message;
end;
$$;
grant execute on function send_message_by_code(uuid, text, text, text, text) to anon, authenticated;

create or replace function request_meeting_in_org(p_org uuid, p_code text, p_pow_token text, p_pow_nonce text)
returns timestamptz
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
  v_complaint uuid;
begin
  if not verify_pow(p_pow_token, p_pow_nonce, p_org) then
    raise exception 'proof-required' using errcode = '42501';
  end if;
  v_complaint := find_complaint_in_org(p_code, p_org);
  if v_complaint is null then
    perform code_attempt_failed(p_org);
    return null;
  end if;
  select c.id, c.status, c.meeting_requested, c.meeting_requested_at into v from complaints c where c.id = v_complaint;
  if v.status in ('resolved', 'closed', 'archived') then
    raise exception 'complaint-closed' using errcode = '22023';
  end if;
  if v.meeting_requested then
    return coalesce(v.meeting_requested_at, now());
  end if;
  update complaints set meeting_requested = true, meeting_requested_at = now() where id = v.id;
  insert into audit_logs (complaint_id, action, details) values (v.id, 'meeting_requested', '{}'::jsonb);
  return now();
end;
$$;
grant execute on function request_meeting_in_org(uuid, text, text, text) to anon, authenticated;

-- ── 5. Enviar la denuncia sin revelar si un código existe ──────────────
-- Idempotencia por «id de envío» (lo pone el navegador), no por el código. Si al guardar el código ya
-- existe (choque de huellas, casi imposible), error genérico que cuenta como intento: nunca se dice que
-- el código existe. Mantiene la lista de personas apartadas (020).

alter table complaints add column if not exists submission_id uuid;
create unique index if not exists complaints_submission_id_key on complaints (submission_id) where submission_id is not null;

create or replace function submit_complaint(
  p_submission_id uuid, p_org uuid, p_hash text, p_category text, p_description text, p_is_anonymous boolean,
  p_name text, p_email text, p_phone text, p_department text, p_incident_date date,
  p_involved text, p_language text, p_meeting boolean, p_when text, p_excluded uuid[])
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_anon boolean := coalesce(p_is_anonymous, true);
  v_desc text := trim(coalesce(p_description, ''));
  v_id uuid;
begin
  if p_submission_id is null then
    raise exception 'submission-id-required' using errcode = '22023';
  end if;
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

  -- El mismo envío (mismo id de envío): la misma denuncia. No se mira el código.
  select id into v_id from complaints where submission_id = p_submission_id;
  if v_id is not null then
    return v_id;
  end if;

  begin
    insert into complaints (
      submission_id, tracking_hash, organization_id, is_anonymous, reporter_name, reporter_email, reporter_phone,
      category, department, description, incident_date, involved_people, language,
      meeting_requested, meeting_requested_at, incident_when, status, priority, channel)
    values (
      p_submission_id, p_hash, p_org, v_anon,
      case when v_anon then null else nullif(trim(p_name), '') end,
      case when v_anon then null else nullif(trim(p_email), '') end,
      case when v_anon then null else nullif(trim(p_phone), '') end,
      p_category, nullif(trim(p_department), ''), v_desc, p_incident_date, nullif(trim(p_involved), ''),
      coalesce(nullif(left(p_language, 5), ''), 'ca'),
      coalesce(p_meeting, false), case when p_meeting then now() else null end,
      nullif(left(trim(coalesce(p_when, '')), 200), ''),
      'received', 'normal', 'web')
    returning id into v_id;
  exception when unique_violation then
    -- El código ya existe (o choque de id de envío en una carrera): error genérico que cuenta como intento.
    -- Nunca se revela que el código existe.
    perform code_attempt_failed(p_org);
    raise exception 'submit-failed' using errcode = '22023';
  end;

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
revoke all on function submit_complaint(uuid, uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text, uuid[]) from public;
grant execute on function submit_complaint(uuid, uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text, uuid[]) to anon, authenticated;

-- ── 6. Se cierra la inserción directa de denuncias ─────────────────────
-- La única vía para crear una denuncia es submit_complaint (canal) o register_complaint (panel), que son
-- «security definer». Así se cierra el camino de ir probando códigos con inserciones directas (A1).

revoke insert on complaints from anon;
do $$
begin
  execute 'revoke insert on complaints from authenticated';
exception when undefined_object then null;
end $$;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- Qué hace cada bloque, en palabras llanas
--
-- 1. Un contador de intentos fallidos POR EMPRESA (y uno global, solo para subir la dificultad). Nunca se
--    guarda ninguna IP.
-- 2. La prueba de trabajo: el servidor da un reto y el navegador tiene que resolverlo (buscar un número).
--    Cuanto más se insiste, más cuesta. Nunca se bloquea: quien tiene su código siempre puede entrar.
-- 3. Buscar una denuncia por su código, pero solo dentro de la empresa del canal.
-- 4. Las funciones nuevas del portal (consultar, mensajes, enviar mensaje, pedir reunión) exigen la prueba
--    de trabajo y, si el código no existe, lo cuentan y devuelven vacío, sin decir nunca si existe.
-- 5. Enviar la denuncia con un «id de envío» (lo pone el navegador): el mismo envío repetido devuelve la
--    misma denuncia. Si el código ya existe, error genérico que cuenta como intento. Nunca se revela si un
--    código existe.
-- 6. Se quita el permiso de inserción directa de denuncias: la única vía es la función.
--
-- Las funciones de antes (get_complaint_by_tracking_code, send_reporter_message, request_meeting_by_code y
-- submit_complaint de 14/15 parámetros) se quedan para que la web actual siga funcionando hasta que se
-- cablee el camino nuevo. El freno global de la 014 sigue protegiéndolas mientras tanto.
-- ══════════════════════════════════════════════════════════════════════
