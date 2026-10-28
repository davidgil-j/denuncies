-- Vuelta atrás de la 027 (medios M1, M5, M6, M11).
-- Restaura ver la identidad con el permiso 'view' (como la 020), la subida de adjuntos sin el id de envío (010) y
-- quita la baja de empresa. NO deshace el reescribido de las huellas (M1 es de un solo sentido; las nuevas huellas
-- con secreto no se pueden volver a la plana) ni borra la columna can_view_identity. Repetible.

-- M6: can_access_category sin 'view_identity' (como la 008) y get_reporter_identity con 'view' (como la 020)
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
              when 'view'   then mp.can_view
              when 'edit'   then mp.can_edit
              when 'reply'  then mp.can_reply
              when 'delete' then mp.can_delete
              else false
            end
    )
  end;
$$;

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
  if v.is_anonymous then return; end if;
  insert into audit_logs (complaint_id, action, details) values (p_complaint, 'identity_viewed', '{}'::jsonb);
  return query select c.reporter_name, c.reporter_email, c.reporter_phone from complaints c where c.id = p_complaint;
end;
$$;
drop function if exists get_reporter_identity(uuid, text);

-- M5: subida de adjuntos como en la 010 (solo la ventana de recientes, sin el id de envío)
drop policy if exists "public_upload_attachments" on storage.objects;
create policy "public_upload_attachments" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'attachments' and public.complaint_folder_is_recent(name));
drop function if exists can_upload_attachment(text);

-- M11: quitar la baja de empresa
drop function if exists offboard_organization(uuid);
