-- Migration 026: A3 — que nadie pueda cerrar el canal de una empresa
--
-- Antes: a partir de 50 denuncias web por hora y empresa, la 51 se RECHAZABA ('rate-limited'). Cualquiera podía
-- cerrar el canal de una empresa enviando 50 falsas por hora, y quien denunciaba de verdad recibía «inténtalo
-- más tarde». Además, cada denuncia mandaba su aviso y admitía muchos megas de adjuntos.
-- Ahora:
--   - NUNCA se rechaza una denuncia. Por encima del umbral, entra marcada como «posible spam» (likely_spam).
--   - Las «posible spam» no mandan aviso una a una: como mucho, un resumen por empresa y hora (kind 'spam_summary').
--   - Enviar una denuncia también exige la prueba de trabajo de la 021 (submit_complaint de 18 parámetros).
--   - Tope de megas por empresa y hora para los adjuntos (disparador): si no caben, la denuncia entra igual y
--     sus archivos no se guardan (el navegador se lo dice a quien denuncia). Máximo de 25 MB por archivo (bucket).
--
-- Aditiva y repetible. Vuelta atrás: supabase/rollback/026_atras.sql. La web funciona con la base de datos en la
-- 025 (sin esta) y con ella.

-- ── 1. «Posible spam» en vez de rechazar ──────────────────────────────────
alter table complaints add column if not exists likely_spam boolean not null default false;
grant select (likely_spam) on complaints to authenticated;

-- Devolver una denuncia al tablero (no era spam). Permiso de ver+editar y no apartado (C1).
create or replace function clear_spam_flag(p_complaint uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
begin
  select c.id, c.category into v
    from complaints c where c.id = p_complaint and c.organization_id = current_org_id();
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'edit') or is_excluded(p_complaint) then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  update complaints set likely_spam = false where id = p_complaint;
end;
$$;
revoke execute on function clear_spam_flag(uuid) from public, anon;
grant execute on function clear_spam_flag(uuid) to authenticated;

create or replace function complaints_web_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Nunca rechaza: por encima de 50 web/hora en la empresa, marca la denuncia como posible spam. Entra igual.
  if new.channel = 'web' and api_role_is_client() and (
    select count(*) from complaints c
    where c.organization_id = new.organization_id and c.channel = 'web'
      and coalesce(c.received_at, c.created_at) > now() - interval '1 hour'
  ) >= 50 then
    new.likely_spam := true;
  end if;
  return new;
end;
$$;
revoke execute on function complaints_web_rate_limit() from public, anon, authenticated;

-- ── 2. Las «posible spam» no avisan una a una: un resumen por empresa y hora ─
alter table notification_queue drop constraint if exists notification_queue_kind_check;
alter table notification_queue add constraint notification_queue_kind_check
  check (kind in ('new', 'message', 'spam_summary'));

create or replace function enqueue_complaint_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.likely_spam then
    -- Como mucho un resumen por empresa cada hora (nunca un aviso por cada posible spam)
    if not exists (
      select 1 from notification_queue
      where kind = 'spam_summary' and organization_id = new.organization_id
        and created_at > now() - interval '1 hour'
    ) then
      insert into notification_queue (kind, organization_id, send_after)
      values ('spam_summary', new.organization_id, coalesce(new.notify_after, clock_timestamp()));
    end if;
  else
    insert into notification_queue (kind, complaint_id, organization_id, send_after)
    values ('new', new.id, new.organization_id, coalesce(new.notify_after, clock_timestamp()));
  end if;
  return new;
end;
$$;
revoke execute on function enqueue_complaint_notification() from public, anon, authenticated;

-- ── 3. Enviar una denuncia exige la prueba de trabajo (A3 + 021) ──────────
-- submit_complaint de 18 parámetros: comprueba la prueba de trabajo y delega en el de 16 (que sigue abierto para
-- el navegador que aún no la resuelve; cerrarlo del todo es un paso posterior, como la 022 con las funciones de antes).
create or replace function submit_complaint(
  p_submission_id uuid, p_org uuid, p_hash text, p_category text, p_description text, p_is_anonymous boolean,
  p_name text, p_email text, p_phone text, p_department text, p_incident_date date, p_involved text,
  p_language text, p_meeting boolean, p_when text, p_excluded uuid[],
  p_pow_token text, p_pow_nonce text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not verify_pow(p_pow_token, p_pow_nonce, p_org) then
    raise exception 'proof-required' using errcode = '42501';
  end if;
  return submit_complaint(p_submission_id, p_org, p_hash, p_category, p_description, p_is_anonymous,
    p_name, p_email, p_phone, p_department, p_incident_date, p_involved, p_language, p_meeting, p_when, p_excluded);
end;
$$;
revoke all on function submit_complaint(uuid, uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text, uuid[], text, text) from public;
grant execute on function submit_complaint(uuid, uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text, uuid[], text, text) to anon, authenticated;

-- ── 4. Adjuntos: 25 MB por archivo y tope de megas por empresa y hora ─────
-- 25 MB por archivo en el almacén (el navegador ya lo limita con VITE_MAX_FILE_MB = 25).
update storage.buckets set file_size_limit = 26214400 where id = 'attachments';  -- 25 * 1024 * 1024

-- Tope por empresa y hora: si un adjunto no cabe, su fila se rechaza (el navegador quita el objeto del bucket y
-- avisa a quien denuncia). La denuncia ya está guardada: nunca se pierde. 500 MB por empresa y hora (ajustable).
create or replace function attachments_org_hour_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_sum bigint;
begin
  select organization_id into v_org from complaints where id = new.complaint_id;
  select coalesce(sum(a.file_size), 0) into v_sum
    from attachments a join complaints c on c.id = a.complaint_id
    where c.organization_id = v_org
      and coalesce(c.received_at, c.created_at) > now() - interval '1 hour';
  if v_sum + coalesce(new.file_size, 0) > 524288000 then  -- 500 MB
    raise exception 'attachment-quota' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke execute on function attachments_org_hour_cap() from public, anon, authenticated;

drop trigger if exists zz_attachments_org_hour_cap on attachments;
create trigger zz_attachments_org_hour_cap
  before insert on attachments
  for each row execute function attachments_org_hour_cap();

-- ── 5. La tarea de reparto también envía los resúmenes de spam ─────────────
create or replace function dispatch_due_notifications()
returns integer
language plpgsql
security definer
set search_path = public, net, vault, extensions
as $$
declare
  r record;
  n integer := 0;
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url    from vault.decrypted_secrets where name = 'project_url'    limit 1;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'webhook_secret' limit 1;
  if v_url is null or v_secret is null then
    return 0;
  end if;
  for r in
    select q.*, m.sender, m.complaint_id as m_complaint
    from notification_queue q
    left join messages m on m.id = q.message_id
    where q.sent_at is null
      and q.send_after <= now()
      and (q.dispatched_at is null or q.dispatched_at < now() - interval '15 minutes')
    order by q.send_after
    limit 200
  loop
    update notification_queue set dispatched_at = now() where id = r.id;
    perform net.http_post(
      url     := v_url || '/functions/v1/notify',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
      body    := case
        when r.kind = 'new' then
          jsonb_build_object('type', 'INSERT', 'table', 'complaints',
                             'record', jsonb_build_object('id', r.complaint_id))
        when r.kind = 'message' then
          jsonb_build_object('type', 'INSERT', 'table', 'messages',
                             'record', jsonb_build_object('id', r.message_id, 'sender', 'reporter', 'complaint_id', r.m_complaint))
        else
          jsonb_build_object('type', 'INSERT', 'table', 'spam_summary',
                             'record', jsonb_build_object('organization_id', r.organization_id))
      end
    );
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function dispatch_due_notifications() from public, anon, authenticated;
