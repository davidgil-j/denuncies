-- Migració 008: enduriment de seguretat (RLS)
--
-- Tanca els forats detectats a la revisió d'octubre de 2026:
--   1. profiles: un usuari podia canviar-se el rol i l'organització (escalada i accés entre empreses)
--   2. messages: lectura i escriptura obertes a tothom amb la clau pública
--   3. complaints / attachments / audit_logs: els permisos per categoria dels gestors només
--      s'aplicaven a la interfície; ara els aplica la base de dades
--   4. complaints: faltava la política d'eliminació; el contingut d'una denúncia era modificable
--   5. audit_logs: qualsevol podia inserir entrades de qualsevol organització
--   6. manager_permissions: en desar permisos no s'omplia organization_id
--   7. storage: lectura i eliminació d'adjunts lligades als permisos de la denúncia
--   8. llista de membres amb correu (list_org_members), sense service role al client
--
-- ORDRE DE DESPLEGAMENT: aplicar aquesta migració i publicar el frontend nou alhora.
-- El frontend nou funciona abans i després (té camí alternatiu); el frontend ANTIC deixa de
-- poder llegir i enviar missatges des del portal de seguiment un cop aplicada.
--
-- Abans d'aplicar-la, revisar si hi ha polítiques creades a mà al dashboard:
--   select schemaname, tablename, policyname, cmd, roles from pg_policies order by 1, 2, 3;
-- Qualsevol política permissiva antiga que no surti en aquest fitxer s'ha d'eliminar a mà,
-- perquè les polítiques se sumen (n'hi ha prou amb una que deixi passar).

-- ── 0. Funcions d'ajuda ────────────────────────────────────────────────

create or replace function is_superadmin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'superadmin');
$$;

create or replace function current_org_id()
returns uuid
language sql security definer stable
set search_path = public
as $$
  select organization_id from profiles where id = auth.uid();
$$;

-- Permís de l'usuari autenticat sobre una categoria. p_action: view | edit | reply | delete
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

-- Una denúncia acabada de crear encara pot rebre els adjunts i l'entrada 'created' del
-- formulari públic. Passat aquest marge, ningú sense sessió hi pot afegir res.
create or replace function complaint_is_recent(p_complaint_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from complaints
    where id = p_complaint_id and created_at > now() - interval '2 hours'
  );
$$;

-- ── 1. profiles: ningú es pot canviar el rol ni l'organització ─────────

create or replace function protect_profile_fields()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  -- Crides de servei (service_role, edge functions, migracions): sense restriccions
  if auth.uid() is null then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.organization_id is distinct from old.organization_id then
    raise exception 'profile-field-protected' using errcode = '42501';
  end if;

  -- El rol només el canvia un administrador de la mateixa organització, i mai el seu propi
  if new.role is distinct from old.role then
    if not is_superadmin()
       or old.organization_id is distinct from current_org_id()
       or old.id = auth.uid() then
      raise exception 'profile-role-protected' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_fields on profiles;
create trigger protect_profile_fields
  before update on profiles
  for each row execute function protect_profile_fields();

drop policy if exists "own_profile_update" on profiles;
create policy "own_profile_update" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── 2. complaints: permisos per categoria, eliminació i contingut immutable ──

drop policy if exists "org_select_complaints" on complaints;
create policy "org_select_complaints" on complaints
  for select using (
    organization_id = current_org_id() and can_access_category(category, 'view')
  );

drop policy if exists "org_update_complaints" on complaints;
create policy "org_update_complaints" on complaints
  for update using (
    organization_id = current_org_id() and can_access_category(category, 'edit')
  )
  with check (
    organization_id = current_org_id() and can_access_category(category, 'edit')
  );

drop policy if exists "org_delete_complaints" on complaints;
create policy "org_delete_complaints" on complaints
  for delete using (
    organization_id = current_org_id() and can_access_category(category, 'delete')
  );

-- El formulari públic només pot crear denúncies en estat inicial
drop policy if exists "public_insert_complaints" on complaints;
create policy "public_insert_complaints" on complaints
  for insert with check (
    organization_id is not null and status = 'received' and priority = 'normal'
  );

-- El que va escriure qui denuncia no es pot modificar des del panell: només estat i prioritat
create or replace function protect_complaint_content()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tracking_code   is distinct from old.tracking_code
     or new.organization_id is distinct from old.organization_id
     or new.is_anonymous    is distinct from old.is_anonymous
     or new.reporter_name   is distinct from old.reporter_name
     or new.reporter_email  is distinct from old.reporter_email
     or new.reporter_phone  is distinct from old.reporter_phone
     or new.category        is distinct from old.category
     or new.department      is distinct from old.department
     or new.description     is distinct from old.description
     or new.incident_date   is distinct from old.incident_date
     or new.involved_people is distinct from old.involved_people
     or new.language        is distinct from old.language
     or new.created_at      is distinct from old.created_at then
    raise exception 'complaint-content-immutable' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_complaint_content on complaints;
create trigger protect_complaint_content
  before update on complaints
  for each row execute function protect_complaint_content();

-- ── 3. messages: només qui pot veure la denúncia, o qui en té el codi ──

drop policy if exists "allow_insert_messages" on messages;
drop policy if exists "allow_select_messages" on messages;

-- La subconsulta a complaints passa per la seva pròpia RLS (organització + categoria)
drop policy if exists "org_select_messages" on messages;
create policy "org_select_messages" on messages
  for select using (
    exists (select 1 from complaints c where c.id = messages.complaint_id)
  );

drop policy if exists "org_insert_messages" on messages;
create policy "org_insert_messages" on messages
  for insert with check (
    sender = 'manager'
    and exists (
      select 1 from complaints c
      where c.id = messages.complaint_id and can_access_category(c.category, 'reply')
    )
  );

-- Portal de seguiment: missatges d'una denúncia pel seu codi (sense sessió)
create or replace function get_messages_by_tracking_code(p_code text)
returns table (id uuid, sender text, content text, is_read boolean, created_at timestamptz)
language sql security definer stable
set search_path = public
as $$
  select m.id, m.sender, m.content, m.is_read, m.created_at
  from messages m
  join complaints c on c.id = m.complaint_id
  where c.tracking_code = upper(trim(p_code))
  order by m.created_at asc;
$$;

-- Portal de seguiment: qui denuncia envia un missatge amb el seu codi
create or replace function send_reporter_message(p_code text, p_content text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_complaint uuid;
  v_message   uuid;
begin
  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'empty-message' using errcode = '22023';
  end if;
  if length(p_content) > 10000 then
    raise exception 'message-too-long' using errcode = '22023';
  end if;

  select id into v_complaint from complaints where tracking_code = upper(trim(p_code));
  if v_complaint is null then
    raise exception 'complaint-not-found' using errcode = 'P0002';
  end if;

  insert into messages (complaint_id, sender, content)
  values (v_complaint, 'reporter', trim(p_content))
  returning id into v_message;

  return v_message;
end;
$$;

grant execute on function get_messages_by_tracking_code(text) to anon, authenticated;
grant execute on function send_reporter_message(text, text)   to anon, authenticated;

-- ── 4. attachments ─────────────────────────────────────────────────────

drop policy if exists "allow_insert_attachments" on attachments;
drop policy if exists "public_insert_attachments" on attachments;
create policy "public_insert_attachments" on attachments
  for insert with check (complaint_is_recent(complaint_id));

drop policy if exists "org_select_attachments" on attachments;
create policy "org_select_attachments" on attachments
  for select using (
    exists (select 1 from complaints c where c.id = attachments.complaint_id)
  );

-- ── 5. audit_logs: organització i autor els posa la base de dades ──────

alter table audit_logs add column if not exists actor_id uuid;

create or replace function audit_logs_set_context()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  new.actor_id := auth.uid();
  if new.complaint_id is not null then
    select organization_id into new.organization_id from complaints where id = new.complaint_id;
  elsif auth.uid() is not null then
    new.organization_id := current_org_id();
  end if;
  return new;
end;
$$;

drop trigger if exists audit_logs_set_context on audit_logs;
create trigger audit_logs_set_context
  before insert on audit_logs
  for each row execute function audit_logs_set_context();

drop policy if exists "allow_insert_audit_logs" on audit_logs;

drop policy if exists "public_insert_audit_created" on audit_logs;
create policy "public_insert_audit_created" on audit_logs
  for insert with check (action = 'created' and complaint_is_recent(complaint_id));

drop policy if exists "org_insert_audit_logs" on audit_logs;
create policy "org_insert_audit_logs" on audit_logs
  for insert with check (
    auth.uid() is not null
    and (
      (complaint_id is null and organization_id = current_org_id())
      or exists (select 1 from complaints c where c.id = audit_logs.complaint_id)
    )
  );

-- Les entrades sense denúncia (denúncies eliminades) només les veu l'administrador
drop policy if exists "org_read_audit_logs" on audit_logs;
create policy "org_read_audit_logs" on audit_logs
  for select using (
    organization_id = current_org_id()
    and (
      (complaint_id is null and is_superadmin())
      or exists (select 1 from complaints c where c.id = audit_logs.complaint_id)
    )
  );

-- ── 6. manager_permissions: organització automàtica i validada ─────────

create or replace function manager_permissions_set_org()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_manager_org uuid;
begin
  select organization_id into v_manager_org from profiles where id = new.manager_id;

  if auth.uid() is not null then
    new.organization_id := current_org_id();
    if v_manager_org is distinct from new.organization_id then
      raise exception 'manager-not-in-organization' using errcode = '42501';
    end if;
  elsif new.organization_id is null then
    new.organization_id := v_manager_org;
  end if;

  return new;
end;
$$;

drop trigger if exists manager_permissions_set_org on manager_permissions;
create trigger manager_permissions_set_org
  before insert or update on manager_permissions
  for each row execute function manager_permissions_set_org();

-- ── 7. Storage: adjunts ────────────────────────────────────────────────
-- La subconsulta a attachments passa per la seva RLS: cal poder veure la denúncia.

drop policy if exists "org_read_attachment_objects" on storage.objects;
create policy "org_read_attachment_objects" on storage.objects
  for select using (
    bucket_id = 'attachments'
    and exists (select 1 from public.attachments a where a.storage_path = storage.objects.name)
  );

drop policy if exists "org_delete_attachment_objects" on storage.objects;
create policy "org_delete_attachment_objects" on storage.objects
  for delete using (
    bucket_id = 'attachments'
    and exists (
      select 1
      from public.attachments a
      join public.complaints c on c.id = a.complaint_id
      where a.storage_path = storage.objects.name
        and public.can_access_category(c.category, 'delete')
    )
  );

-- ── 8. Membres de l'organització amb correu (només administrador) ──────

create or replace function list_org_members()
returns table (
  id uuid, role text, full_name text, email text,
  created_at timestamptz, last_sign_in_at timestamptz
)
language sql security definer stable
set search_path = public
as $$
  select p.id, p.role, p.full_name, u.email::text, p.created_at, u.last_sign_in_at
  from profiles p
  join auth.users u on u.id = p.id
  where is_superadmin() and p.organization_id = current_org_id()
  order by p.created_at asc;
$$;

revoke all on function list_org_members() from public, anon;
grant execute on function list_org_members() to authenticated;
