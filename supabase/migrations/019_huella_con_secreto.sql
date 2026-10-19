-- ══════════════════════════════════════════════════════════════════════
-- 019 · La huella del código de seguimiento lleva un secreto (docs/PLAN_FASES.md n.º 74; AUDITORIA.md A1-8)
--
-- Hasta ahora la base de datos guarda, de cada código, su huella SHA-256 sin secreto: con una copia de la tabla, los
-- códigos de 8 caracteres se pueden sacar probando todos en poco tiempo. Desde esta migración, las huellas llevan un
-- secreto (HMAC-SHA-256) que no está en la tabla de denuncias.
--
-- NO SE TRANSFORMA NADA EN BLOQUE:
--   · las denuncias nuevas se guardan ya con la huella con secreto;
--   · las de antes se siguen encontrando con su huella de siempre y, la primera vez que alguien consulta con su código,
--     se reescribe su huella con el secreto (sin cambiar su fecha de «última actualización» ni dejar rastro en el
--     historial). Una denuncia que nadie consulta se queda como estaba.
--
-- Aditiva y repetible: se puede ejecutar más de una vez. El secreto se crea una sola vez y nunca se cambia (cambiarlo
-- dejaría sin acceso a quien ya tiene su código). Necesita la 014 (las funciones del portal de seguimiento).
-- ANTES: supabase/rollback/019_copia_antes.sql (copia de la tabla). Vuelta atrás: supabase/rollback/019_atras.sql.
-- La aplicación no cambia: el navegador sigue enviando el código (al consultar) o su huella (al enviar).
-- Al final está la explicación en palabras llanas.
-- ══════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regprocedure('public.code_attempts_blocked()') is null then
    raise exception 'Antes de la 019 hay que ejecutar la 014_endurecimiento.sql';
  end if;
end $$;

-- ── 1. El secreto ─────────────────────────────────────────────────────
-- En el almacén cifrado de Supabase (Vault) si se puede; si no, en una tabla de un esquema privado que la API no
-- expone y que nadie puede leer desde el navegador. Solo lo leen las funciones de esta migración.

create schema if not exists private;
revoke all on schema private from public;
do $$
begin
  execute 'revoke all on schema private from anon, authenticated';
exception when undefined_object then null;
end $$;

create table if not exists private.app_secrets (
  name       text primary key,
  value      text not null,
  created_at timestamptz not null default now()
);
revoke all on private.app_secrets from public;
do $$
begin
  execute 'revoke all on private.app_secrets from anon, authenticated';
exception when undefined_object then null;
end $$;

do $$
declare
  v_secret text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_found  boolean := false;
begin
  -- Si ya existe (en el Vault o en la tabla), no se toca
  if exists (select 1 from private.app_secrets where name = 'tracking_pepper') then
    return;
  end if;
  if to_regclass('vault.decrypted_secrets') is not null then
    begin
      execute 'select exists (select 1 from vault.decrypted_secrets where name = $1)' into v_found using 'reportia_tracking_pepper';
      if v_found then
        return;
      end if;
      execute 'select vault.create_secret($1, $2, $3)' using v_secret, 'reportia_tracking_pepper',
        'Secreto de las huellas de los códigos de seguimiento (migración 019). No cambiarlo nunca.';
      return;
    exception when others then
      null; -- sin permiso para el Vault: a la tabla privada
    end;
  end if;
  insert into private.app_secrets (name, value) values ('tracking_pepper', v_secret) on conflict (name) do nothing;
end $$;

create or replace function private.tracking_pepper()
returns text
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v text;
begin
  if to_regclass('vault.decrypted_secrets') is not null then
    begin
      execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1' into v using 'reportia_tracking_pepper';
    exception when others then
      v := null;
    end;
  end if;
  if v is null then
    select s.value into v from private.app_secrets s where s.name = 'tracking_pepper';
  end if;
  if v is null then
    raise exception 'tracking-pepper-missing';
  end if;
  return v;
end;
$$;

-- HMAC-SHA-256 (RFC 2104) con las funciones de Postgres, sin depender de ninguna extensión
create or replace function private.hmac_sha256(p_key bytea, p_msg bytea)
returns bytea
language plpgsql immutable
set search_path = ''
as $$
declare
  k bytea := p_key;
  ipad bytea;
  opad bytea;
begin
  if length(k) > 64 then
    k := pg_catalog.sha256(k);
  end if;
  k := k || decode(repeat('00', 64 - length(k)), 'hex');
  ipad := k;
  opad := k;
  for i in 0..63 loop
    ipad := set_byte(ipad, i, get_byte(k, i) # 54);  -- 0x36
    opad := set_byte(opad, i, get_byte(k, i) # 92);  -- 0x5c
  end loop;
  return pg_catalog.sha256(opad || pg_catalog.sha256(ipad || p_msg));
end;
$$;

revoke all on function private.tracking_pepper() from public;
revoke all on function private.hmac_sha256(bytea, bytea) from public;

-- ── 2. La huella con secreto ──────────────────────────────────────────
-- Se calcula sobre la huella SHA-256 de siempre: así sirve tanto cuando el navegador envía el código (consulta) como
-- cuando envía su huella (al presentar la denuncia).

create or replace function tracking_key(p_hash text)
returns text
language sql stable security definer
set search_path = public
as $$
  select encode(private.hmac_sha256(convert_to(private.tracking_pepper(), 'UTF8'), convert_to(lower(p_hash), 'UTF8')), 'hex');
$$;
revoke execute on function tracking_key(text) from public, anon, authenticated;

-- Las denuncias nuevas (por el canal, por el panel o por cualquier otro camino) se guardan con la huella con secreto.
-- Si su código ya existe con la huella de antes, se rechaza igual que lo rechazaba el índice único.
create or replace function complaints_tracking_key()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.tracking_hash ~ '^[0-9a-f]{64}$' then
    if exists (select 1 from complaints where tracking_hash = new.tracking_hash) then
      raise exception 'duplicate key value violates unique constraint' using errcode = '23505';
    end if;
    new.tracking_hash := tracking_key(new.tracking_hash);
  end if;
  return new;
end;
$$;
revoke execute on function complaints_tracking_key() from public, anon, authenticated;

drop trigger if exists complaints_tracking_key on complaints;
create trigger complaints_tracking_key
  before insert on complaints
  for each row execute function complaints_tracking_key();

-- La reescritura de una huella no es un cambio del caso: no mueve su «última actualización». Este disparador va el
-- último (orden alfabético) y solo actúa durante la reescritura.
create or replace function zz_keep_updated_at_on_rehash()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('reportia.rehashing', true) = 'on' then
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;
revoke execute on function zz_keep_updated_at_on_rehash() from public, anon, authenticated;

drop trigger if exists zz_keep_updated_at_on_rehash on complaints;
create trigger zz_keep_updated_at_on_rehash
  before update on complaints
  for each row execute function zz_keep_updated_at_on_rehash();

-- ── 3. Encontrar una denuncia por su código: con secreto o como antes ──
-- Devuelve la denuncia (si existe y no se han suprimido sus datos). Si todavía tenía la huella de antes, la reescribe
-- con el secreto: la migración perezosa.

create or replace function find_complaint_by_code(p_code text)
returns uuid
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_plain text := code_hash(p_code);
  v_keyed text := tracking_key(v_plain);
  v_id    uuid;
  v_hash  text;
begin
  select c.id, c.tracking_hash into v_id, v_hash
  from complaints c
  where c.tracking_hash in (v_keyed, v_plain) and c.anonymized_at is null
  limit 1;
  if v_id is not null and v_hash = v_plain then
    perform set_config('reportia.rehashing', 'on', true);
    update complaints set tracking_hash = v_keyed where id = v_id;
    perform set_config('reportia.rehashing', 'off', true);
  end if;
  return v_id;
end;
$$;
revoke execute on function find_complaint_by_code(text) from public, anon, authenticated;

-- ── 4. Las funciones del portal de seguimiento y del envío, con la búsqueda doble ──
-- Lo mismo que en la 014; solo cambia cómo se encuentra la denuncia.

create or replace function get_complaint_by_tracking_code(p_code text)
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
  if code_attempts_blocked() then
    raise exception 'too-many-attempts' using errcode = '54000';
  end if;
  v_complaint := find_complaint_by_code(p_code);
  if v_complaint is null then
    perform code_attempt_failed();
    return;
  end if;
  return query
    select upper(trim(p_code)), c.status, c.category, c.created_at, c.updated_at, c.acknowledged_at, c.answered_at,
           c.extended_until, c.meeting_requested, c.meeting_requested_at
    from complaints c
    where c.id = v_complaint;
end;
$$;

create or replace function get_messages_by_tracking_code(p_code text)
returns table (id uuid, sender text, content text, is_read boolean, created_at timestamptz)
language plpgsql security definer volatile
set search_path = public
as $$
#variable_conflict use_column
declare
  v_complaint uuid;
begin
  if code_attempts_blocked() then
    raise exception 'too-many-attempts' using errcode = '54000';
  end if;
  v_complaint := find_complaint_by_code(p_code);
  if v_complaint is null then
    perform code_attempt_failed();
    return;
  end if;
  return query
    select m.id, m.sender, m.content, m.is_read, m.created_at
    from messages m where m.complaint_id = v_complaint
    order by m.created_at asc;
end;
$$;

create or replace function send_reporter_message(p_code text, p_content text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_complaint uuid;
  v_status    text;
  v_message   uuid;
begin
  if code_attempts_blocked() then
    raise exception 'too-many-attempts' using errcode = '54000';
  end if;
  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'empty-message' using errcode = '22023';
  end if;
  if length(p_content) > 10000 then
    raise exception 'message-too-long' using errcode = '22023';
  end if;

  v_complaint := find_complaint_by_code(p_code);
  if v_complaint is null then
    perform code_attempt_failed();
    return null;
  end if;
  select status into v_status from complaints where id = v_complaint;

  insert into messages (complaint_id, sender, content)
  values (v_complaint, 'reporter', trim(p_content))
  returning id into v_message;

  -- Si se esperaba la respuesta de quien informa, la denuncia vuelve a investigación
  if v_status = 'waiting' then
    update complaints set status = 'investigating' where id = v_complaint;
  end if;

  return v_message;
end;
$$;

create or replace function request_meeting_by_code(p_code text)
returns timestamptz
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
  v_complaint uuid;
begin
  if code_attempts_blocked() then
    raise exception 'too-many-attempts' using errcode = '54000';
  end if;
  v_complaint := find_complaint_by_code(p_code);
  if v_complaint is null then
    perform code_attempt_failed();
    return null;
  end if;
  select c.id, c.status, c.meeting_requested, c.meeting_requested_at into v from complaints c where c.id = v_complaint;
  if v.status in ('resolved', 'closed', 'archived') then
    raise exception 'complaint-closed' using errcode = '22023';
  end if;
  -- Pedirla dos veces no mueve la fecha: el plazo cuenta desde la primera petición
  if v.meeting_requested then
    return coalesce(v.meeting_requested_at, now());
  end if;
  update complaints set meeting_requested = true, meeting_requested_at = now() where id = v.id;
  insert into audit_logs (complaint_id, action, details) values (v.id, 'meeting_requested', '{}'::jsonb);
  return now();
end;
$$;

-- El mismo envío repetido (B-9): se busca con las dos huellas
create or replace function submit_complaint(
  p_org uuid, p_hash text, p_category text, p_description text, p_is_anonymous boolean,
  p_name text, p_email text, p_phone text, p_department text, p_incident_date date,
  p_involved text, p_language text, p_meeting boolean, p_when text)
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

  -- El mismo envío repetido (mismo código, empresa, tema, texto y modo, hace poco): la misma denuncia.
  -- Si algo no coincide (por ejemplo, ahora es identificada), no se da por enviada
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

  insert into audit_logs (complaint_id, action, details)
  values (v_id, 'created', jsonb_build_object('channel', 'web', 'language', coalesce(nullif(left(p_language, 5), ''), 'ca')));
  return v_id;
end;
$$;

revoke execute on function submit_complaint(uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text) from public;
grant execute on function submit_complaint(uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text) to anon, authenticated;
grant execute on function get_complaint_by_tracking_code(text) to anon, authenticated;
grant execute on function get_messages_by_tracking_code(text) to anon, authenticated;
grant execute on function send_reporter_message(text, text) to anon, authenticated;
grant execute on function request_meeting_by_code(text) to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Qué hace cada bloque, en palabras llanas
--
-- 1. Se crea un secreto, una sola vez, en el almacén cifrado de Supabase (o, si no se puede, en una tabla privada que
--    la web no puede leer). Nunca se cambia.
-- 2. Las denuncias nuevas se guardan con una huella que mezcla el código con ese secreto. Con una copia de la tabla
--    de denuncias ya no se pueden sacar los códigos: falta el secreto.
-- 3. Al consultar con un código se busca de las dos maneras. Si la denuncia es de antes, se encuentra igual y, de
--    paso, su huella se reescribe con el secreto. No cambia nada de lo que se ve (ni la fecha de la última
--    actualización) ni queda nada en el historial del caso.
-- 4. El portal de seguimiento (consultar, leer y escribir mensajes, pedir reunión) y el envío funcionan igual que
--    antes; solo cambia cómo se encuentra la denuncia.
-- ══════════════════════════════════════════════════════════════════════
