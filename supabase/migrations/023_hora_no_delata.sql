-- Migration 023: A4 — que la hora no delate a quien denuncia
--
-- Lo que llega de quien denuncia (la denuncia web, sus mensajes, sus adjuntos y su petición de reunión)
-- deja de guardar la hora: created_at/updated_at se redondean al DÍA de Madrid. Así ni el panel, ni el PDF,
-- ni el Excel, ni el historial, ni el informe, ni la API directa pueden sacar la hora de quien denuncia.
-- Los plazos legales (acuse a los 7 días, respuesta a los 3 meses) se cuentan por el DÍA, así que siguen igual.
--
-- El instante real del envío se guarda en una columna privada (received_at) que el panel NO puede leer
-- (la 011 da permiso por columnas y aquí no se concede): hace falta para el freno por hora (A3) y para
-- repartir el aviso. El aviso por correo y la aparición en el panel se retrasan 1-3 h (contra el cruce con
-- los registros de la empresa), pero solo cuando David encienda el interruptor y la tarea de pg_cron.
-- Mientras no esté encendido, todo se comporta como hoy: el correo sale al instante y el caso se ve al momento.
--
-- Aditiva y repetible. Vuelta atrás: supabase/rollback/023_atras.sql.
-- La web funciona con la base de datos en la 022 (sin esta migración) y con ella (sin un momento en que no encajen).

-- ── 1. Redondeo al día de Madrid ──────────────────────────────────────────
-- Devuelve el instante de las 00:00 (hora de Madrid) del día de ese instante. Los plazos usan solo el día.
create or replace function madrid_day_start(ts timestamptz)
returns timestamptz
language sql
immutable
as $$
  select date_trunc('day', ts at time zone 'Europe/Madrid') at time zone 'Europe/Madrid';
$$;

-- ── 2. Interruptor del retraso de los avisos ──────────────────────────────
-- Una sola fila. David lo pone en true cuando active pg_cron (ver QUE_TIENE_QUE_HACER_DAVID.md).
-- Apagado (por defecto): el aviso sale al instante y el caso se ve al momento, como hoy.
create table if not exists notification_settings (
  id          boolean primary key default true check (id),
  email_delay boolean not null default false
);
insert into notification_settings (id) values (true) on conflict (id) do nothing;
alter table notification_settings enable row level security;
revoke all on notification_settings from anon, authenticated;

create or replace function notify_delay_on()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select email_delay from notification_settings where id), false);
$$;
revoke execute on function notify_delay_on() from public, anon, authenticated;

-- ── 3. Cola de avisos (privada) ───────────────────────────────────────────
-- De aquí salen los correos. send_after = cuándo toca enviarlo; sent_at = cuándo se envió (idempotencia).
-- dispatched_at = cuándo lo recogió la tarea (para no repetir y poder reintentar si el envío falló).
create table if not exists notification_queue (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('new', 'message')),
  complaint_id    uuid references complaints(id) on delete cascade,
  message_id      uuid references messages(id) on delete cascade,
  organization_id uuid,
  send_after      timestamptz not null,
  dispatched_at   timestamptz,
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists notification_queue_due_idx
  on notification_queue (send_after) where sent_at is null;
alter table notification_queue enable row level security;
revoke all on notification_queue from anon, authenticated;

-- ── 4. Columnas privadas en complaints ────────────────────────────────────
-- received_at: el instante real del envío (para el freno por hora y repartir el aviso).
-- notify_after: cuándo se hace visible en el panel y cuándo toca avisar (received_at, o received_at + 1-3 h).
-- NO se conceden a authenticated: la 011 da permiso por columnas, y estas quedan fuera, así que el panel no las lee.
alter table complaints add column if not exists received_at  timestamptz;
alter table complaints add column if not exists notify_after timestamptz;

-- ── 5. Rellenar lo que ya hay y redondear al día lo que vino por web ───────
-- Se desactivan los disparadores durante el relleno: no queremos que set_updated_at vuelva a poner now()
-- ni que salten las protecciones. Repetible: redondear un día ya redondeado da el mismo día.
alter table complaints disable trigger user;
update complaints set received_at  = created_at where received_at  is null;
update complaints set notify_after = created_at where notify_after is null;
update complaints
   set created_at           = madrid_day_start(created_at),
       updated_at           = madrid_day_start(updated_at),
       meeting_requested_at = case when meeting_requested_at is not null then madrid_day_start(meeting_requested_at) end
 where channel = 'web';
alter table complaints enable trigger user;

alter table messages disable trigger user;
update messages set created_at = madrid_day_start(created_at) where sender = 'reporter';
alter table messages enable trigger user;

alter table attachments disable trigger user;
update attachments set created_at = madrid_day_start(created_at);
alter table attachments enable trigger user;

alter table audit_logs disable trigger user;
update audit_logs set created_at = madrid_day_start(created_at)
 where action in ('created', 'reporter_message', 'meeting_requested');
alter table audit_logs enable trigger user;

-- ── 6. Redondear al día en cada inserción nueva ───────────────────────────
-- Corre el último (zz…), después de force_server_fields (que pone created_at = now() para el canal público).
create or replace function round_complaint_ts()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- El instante real del envío, antes de redondear: lo guarda la columna privada
    new.received_at := coalesce(new.received_at, new.created_at, clock_timestamp());
    if new.channel = 'web' then
      new.created_at := madrid_day_start(new.created_at);
      new.updated_at := madrid_day_start(new.updated_at);
      new.notify_after := case
        when notify_delay_on() then new.received_at + (interval '1 hour' * (1 + random() * 2))
        else new.received_at
      end;
      if new.meeting_requested_at is not null then
        new.meeting_requested_at := madrid_day_start(new.meeting_requested_at);
      end if;
    else
      -- Registrada a mano por el equipo: mantiene su hora y se avisa/ve al momento
      new.notify_after := coalesce(new.notify_after, new.received_at);
    end if;
  else -- UPDATE: solo el día en lo que viene por web; la hora del equipo se respeta
    if new.channel = 'web' then
      new.updated_at := madrid_day_start(new.updated_at);
      if new.meeting_requested_at is not null
         and new.meeting_requested_at is distinct from old.meeting_requested_at then
        new.meeting_requested_at := madrid_day_start(new.meeting_requested_at);
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function round_complaint_ts() from public, anon, authenticated;

drop trigger if exists zz_round_complaint_ts on complaints;
create trigger zz_round_complaint_ts
  before insert or update on complaints
  for each row execute function round_complaint_ts();

create or replace function round_reporter_ts()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- messages: solo lo que escribe quien denuncia; attachments: siempre (son de quien denuncia);
  -- audit_logs: solo las acciones de quien denuncia.
  if tg_table_name = 'messages' then
    if new.sender = 'reporter' then new.created_at := madrid_day_start(new.created_at); end if;
  elsif tg_table_name = 'attachments' then
    new.created_at := madrid_day_start(new.created_at);
  elsif tg_table_name = 'audit_logs' then
    if new.action in ('created', 'reporter_message', 'meeting_requested') then
      new.created_at := madrid_day_start(new.created_at);
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function round_reporter_ts() from public, anon, authenticated;

drop trigger if exists zz_round_message_ts on messages;
create trigger zz_round_message_ts before insert on messages
  for each row execute function round_reporter_ts();
drop trigger if exists zz_round_attachment_ts on attachments;
create trigger zz_round_attachment_ts before insert on attachments
  for each row execute function round_reporter_ts();
drop trigger if exists zz_round_audit_ts on audit_logs;
create trigger zz_round_audit_ts before insert on audit_logs
  for each row execute function round_reporter_ts();

-- ── 7. Encolar el aviso en cada inserción ─────────────────────────────────
-- complaints: siempre (como hoy el webhook avisa de toda denuncia nueva; las de equipo, al momento).
-- messages: solo las de quien denuncia (el aviso es para el equipo).
create or replace function enqueue_complaint_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notification_queue (kind, complaint_id, organization_id, send_after)
  values ('new', new.id, new.organization_id, coalesce(new.notify_after, clock_timestamp()));
  return new;
end;
$$;
revoke execute on function enqueue_complaint_notification() from public, anon, authenticated;

drop trigger if exists zzz_enqueue_complaint on complaints;
create trigger zzz_enqueue_complaint after insert on complaints
  for each row execute function enqueue_complaint_notification();

create or replace function enqueue_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_after timestamptz;
begin
  if new.sender <> 'reporter' then return new; end if;
  select organization_id into v_org from complaints where id = new.complaint_id;
  v_after := case
    when notify_delay_on() then clock_timestamp() + (interval '1 hour' * (1 + random() * 2))
    else clock_timestamp()
  end;
  insert into notification_queue (kind, complaint_id, message_id, organization_id, send_after)
  values ('message', new.complaint_id, new.id, v_org, v_after);
  return new;
end;
$$;
revoke execute on function enqueue_message_notification() from public, anon, authenticated;

drop trigger if exists zzz_enqueue_message on messages;
create trigger zzz_enqueue_message after insert on messages
  for each row execute function enqueue_message_notification();

-- ── 8. El freno por hora (A3, de la 014) cuenta el instante real, no el día ─
-- Si contara created_at (ya redondeado a medianoche), nunca frenaría. received_at es el instante real.
create or replace function complaints_web_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.channel = 'web' and api_role_is_client() and (
    select count(*) from complaints c
    where c.organization_id = new.organization_id and c.channel = 'web'
      and coalesce(c.received_at, c.created_at) > now() - interval '1 hour'
  ) >= 50 then
    raise exception 'rate-limited' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke execute on function complaints_web_rate_limit() from public, anon, authenticated;

-- ── 8b. La ventana de 2 h para subir adjuntos usa el instante real, no el día ─
-- complaint_is_recent (008) miraba created_at. Ya redondeado al día (medianoche), rechazaría las subidas casi
-- todo el día. received_at es el instante real del envío, así que la ventana vuelve a funcionar.
create or replace function complaint_is_recent(p_complaint_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from complaints
    where id = p_complaint_id and coalesce(received_at, created_at) > now() - interval '2 hours'
  );
$$;

-- ── 8c. Los metadatos de los adjuntos en Storage tampoco delatan la hora ───
-- storage.objects guarda la hora real de subida en created_at/updated_at. Para la carpeta de adjuntos se
-- redondea al día de Madrid, como el resto de lo que viene de quien denuncia. Va en un bloque protegido:
-- si el rol de la migración no puede crear el disparador en storage.objects, avisa pero no corta la migración
-- (el resto de A4 se aplica igual). Compruébalo en la guía (QUE_TIENE_QUE_HACER_DAVID.md).
create or replace function round_storage_object_ts()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.bucket_id = 'attachments' then
    if new.created_at is not null then new.created_at := madrid_day_start(new.created_at); end if;
    if new.updated_at is not null then new.updated_at := madrid_day_start(new.updated_at); end if;
  end if;
  return new;
end;
$$;
do $$
begin
  drop trigger if exists zz_round_storage_ts on storage.objects;
  create trigger zz_round_storage_ts before insert on storage.objects
    for each row execute function round_storage_object_ts();
exception when insufficient_privilege or others then
  raise notice 'No se pudo crear el disparador de redondeo en storage.objects (%). El resto de la 023 se aplica igual; créalo con el rol adecuado (ver la guía).', sqlerrm;
end;
$$;

-- ── 9. El panel ve la denuncia cuando toca (mismo retraso que su aviso) ────
-- Apagado el interruptor, notify_after = received_at (pasado) → se ve al momento, como hoy.
-- Encendido, notify_after = received_at + 1-3 h → se ve a la vez que llega el aviso.
drop policy if exists "org_select_complaints" on complaints;
create policy "org_select_complaints" on complaints
  for select using (
    organization_id = current_org_id()
    and can_access_category(category, 'view')
    and not is_excluded(id)
    and coalesce(notify_after, created_at) <= now()
  );

-- ── 10. Tarea de reparto de avisos (pg_cron) ──────────────────────────────
-- La deja preparada; David activa pg_cron y pg_net y programa la tarea (ver la guía). Hasta entonces no corre,
-- y los avisos salen por el webhook de siempre (al instante). Lee de Vault el destino y el secreto.
-- security definer y search_path con net/vault: el cuerpo no se valida al crearla, así que no hace falta que
-- pg_net ni Vault estén instalados para definirla (db:test no la ejecuta).
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
    return 0;  -- sin configurar: no hace nada (David lo configura al activar pg_cron)
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
        else
          jsonb_build_object('type', 'INSERT', 'table', 'messages',
                             'record', jsonb_build_object('id', r.message_id,
                                                          'sender', 'reporter',
                                                          'complaint_id', r.m_complaint))
      end
    );
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function dispatch_due_notifications() from public, anon, authenticated;

-- La función notify (con la clave de servicio) reclama cada aviso de la cola de forma atómica antes de enviarlo:
--   update notification_queue set sent_at = now() where id = ... and sent_at is null returning id
-- Si la fila ya estaba marcada (otra llamada o la tarea), no la reclama y no reenvía. El webhook de siempre
-- solo envía cuando send_after <= now(); si es futuro, lo deja para la tarea de pg_cron.
