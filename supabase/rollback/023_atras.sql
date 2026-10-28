-- Vuelta atrás de la 023 (A4: que la hora no delate a quien denuncia).
-- Quita la maquinaria del retraso y del redondeo en las inserciones nuevas, y restaura la política de lectura
-- y el freno por hora. NO borra datos: las columnas received_at/notify_after y las tablas notification_* se
-- quedan (por si se vuelve a aplicar la 023). Lo que ya se redondeó al día no se deshace (el instante real de
-- cada denuncia sigue en received_at; el de los mensajes, adjuntos y registro no se guardó aparte).
-- Repetible: se puede ejecutar más de una vez.

-- 1. Disparadores de redondeo y de encolado
drop trigger if exists zz_round_complaint_ts on complaints;
drop trigger if exists zz_round_message_ts on messages;
drop trigger if exists zz_round_attachment_ts on attachments;
drop trigger if exists zz_round_audit_ts on audit_logs;
drop trigger if exists zzz_enqueue_complaint on complaints;
drop trigger if exists zzz_enqueue_message on messages;

-- 2. Política de lectura del panel: la de la 020, sin el filtro de la hora
drop policy if exists "org_select_complaints" on complaints;
create policy "org_select_complaints" on complaints
  for select using (
    organization_id = current_org_id()
    and can_access_category(category, 'view')
    and not is_excluded(id)
  );

-- 3. Freno por hora: cuenta el instante real si está (received_at), y si no, created_at. Así sigue funcionando
--    aunque created_at ya esté redondeado al día.
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

-- 4. Funciones de la 023 (ya sin disparadores que las usen)
drop function if exists dispatch_due_notifications();
drop function if exists enqueue_message_notification();
drop function if exists enqueue_complaint_notification();
drop function if exists round_reporter_ts();
drop function if exists round_complaint_ts();
drop function if exists notify_delay_on();
drop function if exists madrid_day_start(timestamptz);
