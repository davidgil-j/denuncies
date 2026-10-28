-- Vuelta atrás de la 026 (A3: que nadie pueda cerrar el canal).
-- Restaura el freno que rechazaba (como la 023), el encolado sin resumen de spam, y quita la prueba de trabajo al
-- enviar y el tope de megas por empresa. NO borra datos (la columna likely_spam se queda). El límite de 25 MB por
-- archivo del bucket no se toca (es más estricto; no se conoce el valor anterior). Repetible.

-- 1. Freno que vuelve a rechazar por encima de 50 web/hora (como la 023)
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

-- 2. Encolado como en la 023 (siempre 'new', sin resumen de spam) y el check sin 'spam_summary'
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

delete from notification_queue where kind = 'spam_summary';
alter table notification_queue drop constraint if exists notification_queue_kind_check;
alter table notification_queue add constraint notification_queue_kind_check check (kind in ('new', 'message'));

-- 3. Quitar la prueba de trabajo al enviar
drop function if exists submit_complaint(uuid, uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text, uuid[], text, text);

-- 4. Quitar el tope de megas por empresa y hora
drop trigger if exists zz_attachments_org_hour_cap on attachments;
drop function if exists attachments_org_hour_cap();

-- 5. Quitar «devolver al tablero»
drop function if exists clear_spam_flag(uuid);
