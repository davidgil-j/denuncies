-- Migration 025: A7 — supresión con control
--
-- Suprimir una denuncia (borrar su contenido, mensajes y archivos, art. 32 de la Ley 2/2023) deja de ser
-- inmediata y de una sola persona. Ahora:
--   - Solo cuando la ley lo permite (art. 32.3 y 32.4): NUNCA con la investigación abierta. Se permite si el caso
--     está terminado (resuelto/cerrado/archivado) o si toca por conservación (3 meses sin investigar, o 10 años).
--   - Motivo de al menos 30 caracteres.
--   - Periodo de gracia de 7 días: queda «programada». Cualquier administrador (de los que pueden suprimir) la ve
--     y puede cancelarla. Pasados los 7 días, se ejecuta (desde el panel o con la tarea de pg_cron de M11).
--   - Los archivos no se pueden borrar uno a uno: solo se pueden borrar cuando hay una supresión ya vencida.
--   - Quien está apartado de un caso (C1) no lo puede suprimir ni cancelar (se mantiene).
--
-- Aditiva y repetible. Vuelta atrás: supabase/rollback/025_atras.sql. La web funciona con la base de datos en la
-- 024 (sin esta: la supresión es la de antes, inmediata) y con ella (supresión con gracia).

-- ── 1. La cola de supresiones programadas ─────────────────────────────────
create table if not exists suppressions (
  id              uuid primary key default gen_random_uuid(),
  complaint_id    uuid references complaints(id) on delete cascade,
  organization_id uuid,
  requested_by    uuid,
  reason          text not null,
  scheduled_for   timestamptz not null,
  status          text not null default 'pending' check (status in ('pending', 'cancelled', 'done')),
  cancelled_by    uuid,
  created_at      timestamptz not null default now(),
  done_at         timestamptz
);
-- Una sola supresión viva (pendiente) por denuncia
create unique index if not exists suppressions_one_pending on suppressions (complaint_id) where status = 'pending';
create index if not exists suppressions_org_idx on suppressions (organization_id) where status = 'pending';
alter table suppressions enable row level security;
revoke all on suppressions from anon, authenticated;

-- ── 2. ¿La ley permite suprimir este caso ahora? ──────────────────────────
-- Permitido si está terminado (resuelto/cerrado/archivado) o si toca por conservación (art. 32.4: 3 meses sin
-- investigar; o 10 años). NUNCA con la investigación abierta.
create or replace function suppression_allowed(p_complaint uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from complaints c
    where c.id = p_complaint
      and c.organization_id = current_org_id()
      and c.anonymized_at is null
      and c.status <> 'investigating'
      and (
        c.status in ('resolved', 'closed', 'archived')
        or coalesce(c.received_at, c.created_at) < now() - interval '10 years'
        or (coalesce(c.received_at, c.created_at) < now() - interval '3 months'
            and c.investigation_started_at is null)
      )
  );
$$;
revoke execute on function suppression_allowed(uuid) from public, anon;
grant execute on function suppression_allowed(uuid) to authenticated;

-- ¿Hay una supresión ya vencida para este caso? (la usa la política de borrado de archivos; bypassa la RLS de
-- suppressions). Recibe el nombre del objeto (carpeta = id de la denuncia).
create or replace function has_due_suppression(p_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from suppressions s
    where s.complaint_id::text = split_part(p_name, '/', 1)
      and s.status = 'pending' and s.scheduled_for <= now()
  );
$$;
grant execute on function has_due_suppression(text) to anon, authenticated;

-- ── 3. Pedir, cancelar, ejecutar ──────────────────────────────────────────
-- Guard común: el caso es de la empresa, no está suprimido, dos pasos, permiso de «eliminar» y no estoy apartado (C1).
create or replace function request_suppression(p_complaint uuid, p_reason text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
  v_when timestamptz := now() + interval '7 days';
begin
  if p_reason is null or length(trim(p_reason)) < 30 then
    raise exception 'reason-required' using errcode = '22023';
  end if;
  select c.id, c.category into v
    from complaints c where c.id = p_complaint and c.organization_id = current_org_id() and c.anonymized_at is null;
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'delete') or is_excluded(p_complaint) then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if not suppression_allowed(p_complaint) then
    raise exception 'suppression-not-allowed' using errcode = '42501';
  end if;
  if exists (select 1 from suppressions where complaint_id = p_complaint and status = 'pending') then
    raise exception 'already-scheduled' using errcode = '22023';
  end if;
  insert into suppressions (complaint_id, organization_id, requested_by, reason, scheduled_for)
  values (p_complaint, current_org_id(), auth.uid(), trim(p_reason), v_when);
  insert into audit_logs (complaint_id, action, details)
  values (p_complaint, 'suppression_requested', jsonb_build_object('note', trim(p_reason)));
  return v_when;
end;
$$;
revoke execute on function request_suppression(uuid, text) from public, anon;
grant execute on function request_suppression(uuid, text) to authenticated;

create or replace function cancel_suppression(p_complaint uuid)
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
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'delete') or is_excluded(p_complaint) then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  update suppressions set status = 'cancelled', cancelled_by = auth.uid()
   where complaint_id = p_complaint and status = 'pending';
  insert into audit_logs (complaint_id, action, details)
  values (p_complaint, 'suppression_cancelled', '{}'::jsonb);
end;
$$;
revoke execute on function cancel_suppression(uuid) from public, anon;
grant execute on function cancel_suppression(uuid) to authenticated;

-- Ejecuta la supresión: borra contenido, mensajes y las filas de los adjuntos, y anonimiza. Los bytes de los
-- archivos en Storage los borra el navegador (permiso de borrado solo con una supresión vencida) o, con pg_cron,
-- una función de servidor (M11). Exige que la supresión esté vencida y que la ley siga permitiéndolo.
create or replace function execute_suppression(p_complaint uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
  v_reason text;
begin
  select c.id, c.category into v
    from complaints c where c.id = p_complaint and c.organization_id = current_org_id() and c.anonymized_at is null;
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'delete') or is_excluded(p_complaint) then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  select reason into v_reason from suppressions
    where complaint_id = p_complaint and status = 'pending' and scheduled_for <= now();
  if v_reason is null then
    raise exception 'not-due' using errcode = '42501';  -- no hay supresión vencida para este caso
  end if;
  if not suppression_allowed(p_complaint) then
    raise exception 'suppression-not-allowed' using errcode = '42501';  -- volvió a investigación durante la gracia
  end if;

  delete from messages where complaint_id = p_complaint;
  delete from attachments where complaint_id = p_complaint;
  delete from storage.objects where bucket_id = 'attachments' and split_part(name, '/', 1) = p_complaint::text;
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
  update suppressions set status = 'done', done_at = now() where complaint_id = p_complaint and status = 'pending';
  insert into audit_logs (complaint_id, action, details)
  values (p_complaint, 'anonymized', jsonb_build_object('note', trim(v_reason)));
end;
$$;
revoke execute on function execute_suppression(uuid) from public, anon;
grant execute on function execute_suppression(uuid) to authenticated;

-- ── 4. Verlo desde el panel ───────────────────────────────────────────────
-- La supresión programada de un caso (para la ficha): la ve quien puede ver el caso (no apartado).
create or replace function suppression_for(p_complaint uuid)
returns table (reason text, scheduled_for timestamptz, requested_by_name text, due boolean)
language sql
security definer
stable
set search_path = public
as $$
  select s.reason, s.scheduled_for, p.full_name, (s.scheduled_for <= now())
  from suppressions s
  left join profiles p on p.id = s.requested_by
  where s.complaint_id = p_complaint and s.status = 'pending'
    and exists (select 1 from complaints c where c.id = s.complaint_id and c.organization_id = current_org_id())
    and not is_excluded(p_complaint)
  limit 1;
$$;
revoke execute on function suppression_for(uuid) from public, anon;
grant execute on function suppression_for(uuid) to authenticated;

-- Todas las supresiones programadas de la empresa, para avisar al resto de administradores (respeta C1).
create or replace function list_pending_suppressions()
returns table (complaint_id uuid, reference text, reason text, scheduled_for timestamptz, requested_by_name text, due boolean)
language sql
security definer
stable
set search_path = public
as $$
  select s.complaint_id, c.reference, s.reason, s.scheduled_for, p.full_name, (s.scheduled_for <= now())
  from suppressions s
  join complaints c on c.id = s.complaint_id
  left join profiles p on p.id = s.requested_by
  where s.status = 'pending'
    and s.organization_id = current_org_id()
    and is_superadmin() and is_aal2()
    and not is_excluded(s.complaint_id)
  order by s.scheduled_for;
$$;
revoke execute on function list_pending_suppressions() from public, anon;
grant execute on function list_pending_suppressions() to authenticated;

-- ── 5. Los archivos solo se borran dentro de una supresión vencida ────────
-- Se rehace la política de borrado de objetos de Storage: además de poder eliminar el caso, tiene que haber una
-- supresión ya vencida para ese caso. Así nadie borra archivos uno a uno fuera de una supresión.
drop policy if exists "org_delete_attachment_objects" on storage.objects;
create policy "org_delete_attachment_objects" on storage.objects for delete using (
  bucket_id = 'attachments'
  and exists (select 1 from public.complaints c where c.id::text = split_part(storage.objects.name, '/', 1)
                and public.can_access_category(c.category, 'delete'))
  and public.has_due_suppression(storage.objects.name)
);
