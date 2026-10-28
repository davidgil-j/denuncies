-- Migration 027: medios con código (M1, M5, M6, M11)
--
-- M1 · Reescribe de golpe las huellas antiguas con el secreto (hasta ahora solo se reescribían al consultar).
-- M5 · Para subir un adjunto hace falta el «id de envío» que solo tiene quien envió (en la ruta del archivo).
-- M6 · Ver la identidad pasa a ser un permiso propio (por defecto solo los administradores), con motivo obligatorio.
-- M11 · Baja de una empresa (art. 28 RGPD) que solo puede ejecutar Reportia (clave de servicio, no un administrador).
--
-- Aditiva y repetible. Vuelta atrás: supabase/rollback/027_atras.sql. La web funciona con la base de datos en la
-- 026 (sin esta) y con ella.

-- ── M1 · Reescribir todas las huellas antiguas con el secreto ─────────────
-- Solo se reescriben las que siguen siendo la huella plana de antes de la 019, y se reconocen con la copia de
-- seguridad que se hizo entonces (private.complaints_copia_019). Las nuevas (ya con secreto) y las ya reescritas
-- al consultar no se tocan. Si la copia no está (p. ej. en las pruebas), no hace nada.
do $$
begin
  if to_regclass('private.complaints_copia_019') is not null then
    perform set_config('reportia.rehashing', 'on', true);   -- no cambiar updated_at al reescribir (disparador de la 019)
    update complaints c
       set tracking_hash = tracking_key(c.tracking_hash)
      from private.complaints_copia_019 b
     where b.id = c.id
       and c.tracking_hash = b.tracking_hash   -- aún es la plana (no se ha reescrito al consultar)
       and c.anonymized_at is null;
    perform set_config('reportia.rehashing', 'off', true);
  end if;
end $$;

-- ── M6 · «Ver la identidad» es un permiso propio ──────────────────────────
alter table manager_permissions add column if not exists can_view_identity boolean not null default false;

-- can_access_category admite la acción 'view_identity'. El administrador la tiene siempre; el gestor, solo si se
-- le concede. (Es la misma función de la 008 con una rama más.)
create or replace function can_access_category(p_category text, p_action text)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when exists (select 1 from profiles where id = auth.uid() and role = 'superadmin') then true
    else exists (
      select 1 from manager_permissions mp
      where mp.manager_id = auth.uid()
        and mp.category = p_category
        and case p_action
              when 'view'          then mp.can_view
              when 'edit'          then mp.can_edit
              when 'reply'         then mp.can_reply
              when 'delete'        then mp.can_delete
              when 'view_identity' then mp.can_view_identity
              else false
            end
    )
  end;
$$;

-- Ver la identidad: ahora exige el permiso 'view_identity' (antes bastaba 'view'). La versión de dos parámetros
-- pide un motivo (se guarda en el registro, y la pantalla «Accesos» lo enseña al administrador). La de un
-- parámetro se mantiene para el navegador que aún no manda el motivo, pero ya exige el permiso nuevo.
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
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'view_identity') or is_excluded(p_complaint) then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if v.is_anonymous then return; end if;
  insert into audit_logs (complaint_id, action, details) values (p_complaint, 'identity_viewed', '{}'::jsonb);
  return query select c.reporter_name, c.reporter_email, c.reporter_phone from complaints c where c.id = p_complaint;
end;
$$;

create or replace function get_reporter_identity(p_complaint uuid, p_reason text)
returns table (reporter_name text, reporter_email text, reporter_phone text)
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
begin
  if p_reason is null or length(trim(p_reason)) < 10 then
    raise exception 'reason-required' using errcode = '22023';
  end if;
  select c.id, c.category, c.is_anonymous into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id() and c.anonymized_at is null;
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'view_identity') or is_excluded(p_complaint) then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if v.is_anonymous then return; end if;
  insert into audit_logs (complaint_id, action, details) values (p_complaint, 'identity_viewed', jsonb_build_object('note', left(trim(p_reason), 300)));
  return query select c.reporter_name, c.reporter_email, c.reporter_phone from complaints c where c.id = p_complaint;
end;
$$;
revoke all on function get_reporter_identity(uuid, text) from public;
grant execute on function get_reporter_identity(uuid, text) to authenticated;

-- set_manager_permissions guarda también can_view_identity (clave nueva del jsonb). Si no viene, false.
create or replace function set_manager_permissions(p_manager uuid, p_permissions jsonb)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not is_superadmin() or not is_aal2() then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from profiles where id = p_manager and organization_id = current_org_id() and role = 'manager') then
    raise exception 'manager-not-in-organization' using errcode = '42501';
  end if;

  delete from manager_permissions where manager_id = p_manager;
  insert into manager_permissions (manager_id, organization_id, category, can_view, can_edit, can_reply, can_delete, can_view_identity)
  select p_manager, current_org_id(), x.category,
         coalesce(x.can_view, false) or coalesce(x.can_edit, false) or coalesce(x.can_reply, false) or coalesce(x.can_delete, false) or coalesce(x.can_view_identity, false),
         coalesce(x.can_edit, false), coalesce(x.can_reply, false), coalesce(x.can_delete, false), coalesce(x.can_view_identity, false)
  from jsonb_to_recordset(coalesce(p_permissions, '[]'::jsonb))
       as x(category text, can_view boolean, can_edit boolean, can_reply boolean, can_delete boolean, can_view_identity boolean)
  where x.category is not null;
end;
$$;

-- ── M5 · Para subir un adjunto hace falta el «id de envío» ────────────────
-- La ruta del archivo pasa a ser <id de la denuncia>/<id de envío>/<archivo>. Solo quien envió tiene el id de
-- envío, así que quien solo conozca el id de la denuncia (por el aviso al panel) ya no puede añadirle archivos.
create or replace function can_upload_attachment(p_name text)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select complaint_folder_is_recent(p_name)
     and exists (
       select 1 from complaints c
       where c.id::text = split_part(p_name, '/', 1)
         and c.submission_id is not null
         and c.submission_id::text = split_part(p_name, '/', 2)
     );
$$;
grant execute on function can_upload_attachment(text) to anon, authenticated;

drop policy if exists "public_upload_attachments" on storage.objects;
create policy "public_upload_attachments" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'attachments' and public.can_upload_attachment(name));

-- ── M11 · Baja de una empresa (art. 28 RGPD), solo Reportia ───────────────
-- Borra todas las denuncias de la empresa (y en cascada sus mensajes y adjuntos) y la propia empresa. Solo la
-- puede ejecutar Reportia con la clave de servicio (auth.uid() nulo): un administrador de la empresa NO puede.
-- Los bytes de los archivos en Storage los borra Reportia aparte (función de servidor; ver la guía).
create or replace function offboard_organization(p_org uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  delete from complaints where organization_id = p_org;          -- cascada: mensajes, adjuntos, exclusiones, supresiones
  delete from audit_logs where organization_id = p_org;
  delete from manager_permissions where organization_id = p_org;
  delete from profiles where organization_id = p_org;            -- las cuentas de auth.users las borra Reportia aparte
  delete from organizations where id = p_org;
end;
$$;
revoke all on function offboard_organization(uuid) from public, anon, authenticated;
