-- Migració 010: integritat, verificació en dos passos obligatòria i terminis fiables
--
-- Resol els hallazgos de la revisió del 5 d'octubre de 2026:
--   1. Verificació en dos passos obligatòria també a la base de dades (aal2) per llegir denúncies
--   2. El codi de seguiment deixa de ser visible per als gestors: es guarda només el seu hash i el
--      panell fa servir una referència pròpia (REF-XXXXXX). Un gestor ja no pot escriure com a
--      informant ni seguir llegint la conversa quan se li treu l'accés
--   3. Dates legals desades per la base de dades: acusament (acknowledged_at), resposta
--      (answered_at) i ampliació del termini (extended_until, art. 9.2 d)
--   4. Registre d'activitat escrit per la base de dades (estat, prioritat, missatges, supressió);
--      des del navegador només es poden afegir notes
--   5. Supressió de dades (art. 32 de la Llei 2/2023) en lloc d'esborrar: es conserva la fila anonimitzada
--   6. Permisos de gestor lligats a l'organització actual, desats en una sola transacció
--   7. Camps que decideix el servidor (dates, estat inicial), mides màximes, adjunts lligats a la
--      carpeta de la seva denúncia, missatges marcats com a llegits
--
-- ORDRE: aplicar després de la 008 i la 009, i publicar el frontend nou alhora (el panell nou
-- llegeix les columnes noves i la referència; el portal de seguiment antic deixa de funcionar).
-- Després d'aplicar-la, cada usuari del panell haurà de configurar la verificació en dos passos
-- en el proper accés: sense aal2 no veu cap denúncia.

-- ── 0. Funcions d'ajuda ────────────────────────────────────────────────

-- Sessió amb verificació en dos passos (claim "aal" del JWT de Supabase)
create or replace function is_aal2()
returns boolean
language sql stable
set search_path = public
as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

-- Petició que ve de l'API (navegador), no d'una funció de servidor ni d'un rol de servei
create or replace function is_client_request()
returns boolean
language sql stable
as $$
  select current_user in ('anon', 'authenticated');
$$;

create or replace function code_hash(p_code text)
returns text
language sql immutable
as $$
  select encode(sha256(convert_to(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), 'UTF8')), 'hex');
$$;

-- Referència interna llegible (REF-4F7K2Q), única
create or replace function new_complaint_reference()
returns text
language plpgsql volatile security definer
set search_path = public
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    candidate := 'REF-';
    for i in 1..6 loop
      candidate := candidate || substr(chars, 1 + floor(random() * 32)::int, 1);
    end loop;
    exit when not exists (select 1 from complaints where reference = candidate);
  end loop;
  return candidate;
end;
$$;

-- ── 1. Permisos lligats a l'organització actual ────────────────────────

update manager_permissions mp set organization_id = p.organization_id
  from profiles p where p.id = mp.manager_id and mp.organization_id is null;
update audit_logs a set organization_id = c.organization_id
  from complaints c where c.id = a.complaint_id and a.organization_id is null;

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
      join profiles p on p.id = mp.manager_id
      where mp.manager_id = auth.uid()
        and mp.organization_id = p.organization_id
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

-- Desa tots els permisos d'un gestor d'una vegada (si falla, no es perd res)
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
  insert into manager_permissions (manager_id, organization_id, category, can_view, can_edit, can_reply, can_delete)
  select p_manager, current_org_id(), x.category,
         coalesce(x.can_view, false) or coalesce(x.can_edit, false) or coalesce(x.can_reply, false) or coalesce(x.can_delete, false),
         coalesce(x.can_edit, false), coalesce(x.can_reply, false), coalesce(x.can_delete, false)
  from jsonb_to_recordset(coalesce(p_permissions, '[]'::jsonb))
       as x(category text, can_view boolean, can_edit boolean, can_reply boolean, can_delete boolean)
  where x.category is not null;
end;
$$;

-- ── 2. Codi secret i referència ────────────────────────────────────────

alter table complaints add column if not exists reference text;
alter table complaints add column if not exists tracking_hash text;
alter table complaints alter column tracking_code drop not null;

update complaints set tracking_hash = code_hash(tracking_code) where tracking_hash is null and tracking_code is not null;
update complaints set reference = new_complaint_reference() where reference is null;
-- El codi en clar desapareix: a partir d'ara només el coneix qui denuncia
update complaints set tracking_code = null where tracking_code is not null;

create unique index if not exists complaints_reference_key on complaints(reference);
create unique index if not exists complaints_tracking_hash_key on complaints(tracking_hash);

-- Les dates del registre es calculen des del registre antic abans de canviar res més
alter table complaints add column if not exists acknowledged_at timestamptz;
alter table complaints add column if not exists answered_at timestamptz;
alter table complaints add column if not exists extended_until date;
alter table complaints add column if not exists extension_reason text;
alter table complaints add column if not exists anonymized_at timestamptz;

update complaints c set acknowledged_at = coalesce(
  (select min(a.created_at) from audit_logs a where a.complaint_id = c.id and a.action in ('status_changed', 'status_changed_to_reviewing')
     and coalesce(a.details ->> 'from', 'received') = 'received'),
  c.updated_at)
where c.acknowledged_at is null and c.status <> 'received';

update complaints c set answered_at = coalesce(
  (select min(a.created_at) from audit_logs a where a.complaint_id = c.id and a.action = 'status_changed'
     and a.details ->> 'to' in ('resolved', 'closed', 'archived')),
  c.updated_at)
where c.answered_at is null and c.status in ('resolved', 'closed', 'archived');

-- Camps que decideix el servidor en crear una denúncia, un missatge o una entrada de registre
create or replace function force_server_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if is_client_request() then
    new.created_at := now();
    if tg_table_name = 'complaints' then
      new.updated_at := now();
      new.status := 'received';
      new.priority := 'normal';
      new.reference := null;
      new.tracking_code := null;          -- el codi en clar mai no es desa
      new.acknowledged_at := null;
      new.answered_at := null;
      new.extended_until := null;
      new.extension_reason := null;
      new.anonymized_at := null;
      if new.is_anonymous then
        new.reporter_name := null; new.reporter_email := null; new.reporter_phone := null;
      end if;
    end if;
  end if;
  if tg_table_name = 'complaints' then
    if new.reference is null then
      new.reference := new_complaint_reference();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists complaints_server_fields on complaints;
create trigger complaints_server_fields before insert on complaints for each row execute function force_server_fields();
drop trigger if exists messages_server_fields on messages;
create trigger messages_server_fields before insert on messages for each row execute function force_server_fields();
drop trigger if exists audit_server_fields on audit_logs;
create trigger audit_server_fields before insert on audit_logs for each row execute function force_server_fields();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'complaints_sizes') then
    alter table complaints add constraint complaints_sizes check (
      length(description) <= 20000
      and length(coalesce(department, '')) <= 200
      and length(coalesce(involved_people, '')) <= 2000
      and length(coalesce(reporter_name, '')) <= 200
      and length(coalesce(reporter_email, '')) <= 200
      and length(coalesce(reporter_phone, '')) <= 50
      and language in ('ca', 'es', 'en')
      and category in ('fraud', 'harassment', 'discrimination', 'safety', 'data', 'conflict', 'accounting', 'environmental', 'other')
    ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'complaints_hash_required') then
    alter table complaints add constraint complaints_hash_required check (tracking_hash is not null) not valid;
  end if;
end $$;

-- Portal de seguiment: estat d'una denúncia a partir del codi. No retorna ni l'id ni l'organització
drop function if exists get_complaint_by_tracking_code(text);
create function get_complaint_by_tracking_code(p_code text)
returns table (tracking_code text, status text, category text, created_at timestamptz, updated_at timestamptz,
               acknowledged_at timestamptz, answered_at timestamptz, extended_until date)
language sql security definer stable
set search_path = public
as $$
  select upper(trim(p_code)), c.status, c.category, c.created_at, c.updated_at, c.acknowledged_at, c.answered_at, c.extended_until
  from complaints c
  where c.tracking_hash = code_hash(p_code) and c.anonymized_at is null;
$$;

create or replace function get_messages_by_tracking_code(p_code text)
returns table (id uuid, sender text, content text, is_read boolean, created_at timestamptz)
language sql security definer stable
set search_path = public
as $$
  select m.id, m.sender, m.content, m.is_read, m.created_at
  from messages m
  join complaints c on c.id = m.complaint_id
  where c.tracking_hash = code_hash(p_code)
  order by m.created_at asc;
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
  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'empty-message' using errcode = '22023';
  end if;
  if length(p_content) > 10000 then
    raise exception 'message-too-long' using errcode = '22023';
  end if;

  select id, status into v_complaint, v_status from complaints
  where tracking_hash = code_hash(p_code) and anonymized_at is null;
  if v_complaint is null then
    raise exception 'complaint-not-found' using errcode = 'P0002';
  end if;

  insert into messages (complaint_id, sender, content)
  values (v_complaint, 'reporter', trim(p_content))
  returning id into v_message;

  -- Si s'esperava la resposta de qui informa, la denúncia torna a investigació
  if v_status = 'waiting' then
    update complaints set status = 'investigating' where id = v_complaint;
  end if;

  return v_message;
end;
$$;

grant execute on function get_complaint_by_tracking_code(text) to anon, authenticated;
grant execute on function get_messages_by_tracking_code(text) to anon, authenticated;
grant execute on function send_reporter_message(text, text) to anon, authenticated;

-- ── 3. Contingut protegit, dates legals i registre automàtic ───────────
-- Les funcions de protecció s'executen amb el rol de qui fa la petició (security invoker): així
-- current_user distingeix el navegador (anon, authenticated) de les funcions del servidor.

create or replace function protect_complaint_content()
returns trigger
language plpgsql security invoker
set search_path = public
as $$
begin
  if not is_client_request() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tracking_code   is distinct from old.tracking_code
     or new.tracking_hash   is distinct from old.tracking_hash
     or new.reference       is distinct from old.reference
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
     or new.created_at      is distinct from old.created_at
     or new.anonymized_at   is distinct from old.anonymized_at then
    raise exception 'complaint-content-immutable' using errcode = '42501';
  end if;

  -- Les dates legals no les decideix el navegador: les posa track_complaint_milestones
  new.acknowledged_at := old.acknowledged_at;
  new.answered_at := old.answered_at;
  new.extended_until := old.extended_until;
  new.extension_reason := old.extension_reason;
  return new;
end;
$$;

-- S'executa després de protect_complaint_content (ordre alfabètic dels triggers BEFORE)
create or replace function track_complaint_milestones()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.acknowledged_at is null and old.status = 'received' and new.status <> 'received' then
    new.acknowledged_at := now();
  end if;
  if new.answered_at is null and new.status in ('resolved', 'closed', 'archived') then
    new.answered_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists track_complaint_milestones on complaints;
create trigger track_complaint_milestones before update on complaints for each row execute function track_complaint_milestones();

create or replace function audit_complaint_changes()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into audit_logs (complaint_id, action, details)
    values (new.id, 'status_changed', jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if new.priority is distinct from old.priority then
    insert into audit_logs (complaint_id, action, details)
    values (new.id, 'priority_changed', jsonb_build_object('from', old.priority, 'to', new.priority));
  end if;
  return new;
end;
$$;

drop trigger if exists audit_complaint_changes on complaints;
create trigger audit_complaint_changes after update on complaints for each row execute function audit_complaint_changes();

create or replace function audit_message_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into audit_logs (complaint_id, action, details)
  values (new.complaint_id, case when new.sender = 'reporter' then 'reporter_message' else 'message_sent' end, '{}'::jsonb);
  return new;
end;
$$;

drop trigger if exists audit_message_insert on messages;
create trigger audit_message_insert after insert on messages for each row execute function audit_message_insert();

-- L'autor es pot mostrar des del perfil (no des d'un text que escriu el navegador)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'audit_logs_actor_fk') then
    alter table audit_logs add constraint audit_logs_actor_fk foreign key (actor_id) references profiles(id) on delete set null not valid;
  end if;
end $$;

-- Des del navegador només es poden afegir notes, i només qui pot editar la denúncia
drop policy if exists "org_insert_audit_logs" on audit_logs;
create policy "org_insert_audit_logs" on audit_logs
  for insert with check (
    auth.uid() is not null
    and action = 'note_added'
    and exists (select 1 from complaints c where c.id = audit_logs.complaint_id and can_access_category(c.category, 'edit'))
  );

-- Ampliació del termini de resposta fins a 3 mesos més, en casos d'especial complexitat (art. 9.2 d)
create or replace function extend_response_deadline(p_complaint uuid, p_reason text)
returns date
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
  v_until date;
begin
  if p_reason is null or length(trim(p_reason)) < 10 then
    raise exception 'reason-required' using errcode = '22023';
  end if;
  select c.id, c.category, c.created_at, c.organization_id, c.extended_until, c.answered_at into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id();
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'edit') then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  if v.extended_until is not null or v.answered_at is not null then
    raise exception 'already-extended-or-answered' using errcode = '22023';
  end if;

  v_until := ((v.created_at at time zone 'Europe/Madrid')::date + interval '6 months')::date;
  update complaints set extended_until = v_until, extension_reason = trim(p_reason) where id = p_complaint;
  insert into audit_logs (complaint_id, action, details)
  values (p_complaint, 'deadline_extended', jsonb_build_object('until', v_until, 'note', trim(p_reason)));
  return v_until;
end;
$$;

-- Supressió de dades (art. 32): es buida el contingut i es conserva la fila del llibre registre.
-- Els arxius s'han d'esborrar abans des del navegador (l'API de Storage), mentre encara hi ha permís.
create or replace function anonymize_complaint(p_complaint uuid, p_reason text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
begin
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'reason-required' using errcode = '22023';
  end if;
  select c.id, c.category, c.reference into v
  from complaints c where c.id = p_complaint and c.organization_id = current_org_id() and c.anonymized_at is null;
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'delete') then
    raise exception 'not-allowed' using errcode = '42501';
  end if;

  delete from messages where complaint_id = p_complaint;
  delete from attachments where complaint_id = p_complaint;
  update complaints set
    description = '', department = null, involved_people = null, incident_date = null,
    reporter_name = null, reporter_email = null, reporter_phone = null,
    tracking_hash = 'anon-' || id::text,
    anonymized_at = now()
  where id = p_complaint;
  insert into audit_logs (complaint_id, action, details)
  values (p_complaint, 'anonymized', jsonb_build_object('note', trim(p_reason)));
end;
$$;

-- Denúncies que s'han d'anonimitzar: 3 mesos sense iniciar investigació (art. 32.4) o 10 anys (art. 26.2)
create or replace function retention_due()
returns table (id uuid, reference text, created_at timestamptz, reason text)
language sql security definer stable
set search_path = public
as $$
  select c.id, c.reference, c.created_at,
         case when c.created_at < now() - interval '10 years' then 'ten_years' else 'no_investigation' end
  from complaints c
  where c.organization_id = current_org_id()
    and is_superadmin() and is_aal2()
    and c.anonymized_at is null
    and (
      c.created_at < now() - interval '10 years'
      or (c.created_at < now() - interval '3 months'
          and c.status in ('received', 'reviewing')
          and not exists (select 1 from audit_logs a where a.complaint_id = c.id and a.action = 'status_changed'
                            and a.details ->> 'to' in ('investigating', 'waiting', 'resolved', 'closed', 'archived')))
    )
  order by c.created_at;
$$;

-- L'esborrat dur ja no es fa des del panell: queda només per a Reportia (rol de servei)
drop policy if exists "org_delete_complaints" on complaints;

-- ── 4. Missatges: marcar com a llegits, res més ────────────────────────

create or replace function protect_message_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if is_client_request() and (
       new.id is distinct from old.id or new.complaint_id is distinct from old.complaint_id
       or new.sender is distinct from old.sender or new.content is distinct from old.content
       or new.created_at is distinct from old.created_at) then
    raise exception 'message-immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_message_fields on messages;
create trigger protect_message_fields before update on messages for each row execute function protect_message_fields();

drop policy if exists "org_update_messages" on messages;
create policy "org_update_messages" on messages
  for update using (exists (select 1 from complaints c where c.id = messages.complaint_id))
  with check (exists (select 1 from complaints c where c.id = messages.complaint_id));

-- ── 5. Verificació en dos passos obligatòria per a les dades de denúncies ─

drop policy if exists "mfa_required" on complaints;
create policy "mfa_required" on complaints as restrictive for select to authenticated using (is_aal2());
drop policy if exists "mfa_required_update" on complaints;
create policy "mfa_required_update" on complaints as restrictive for update to authenticated using (is_aal2()) with check (is_aal2());
drop policy if exists "mfa_required" on messages;
create policy "mfa_required" on messages as restrictive for all to authenticated using (is_aal2()) with check (is_aal2());
drop policy if exists "mfa_required" on attachments;
create policy "mfa_required" on attachments as restrictive for select to authenticated using (is_aal2());
drop policy if exists "mfa_required" on audit_logs;
create policy "mfa_required" on audit_logs as restrictive for select to authenticated using (is_aal2());
drop policy if exists "mfa_required_insert" on audit_logs;
create policy "mfa_required_insert" on audit_logs as restrictive for insert to authenticated
  with check (is_aal2() or action = 'created');
drop policy if exists "mfa_required" on manager_permissions;
create policy "mfa_required" on manager_permissions as restrictive for all to authenticated
  using (is_aal2() or manager_id = auth.uid()) with check (is_aal2());
drop policy if exists "mfa_required" on storage.objects;
create policy "mfa_required" on storage.objects as restrictive for select to authenticated
  using (bucket_id <> 'attachments' or public.is_aal2());
drop policy if exists "mfa_required_delete" on storage.objects;
create policy "mfa_required_delete" on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'attachments' or public.is_aal2());

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
  where is_superadmin() and is_aal2() and p.organization_id = current_org_id()
  order by p.created_at asc;
$$;

-- ── 6. Adjunts: el fitxer pertany a la denúncia de la seva carpeta ─────

create or replace function complaint_folder_is_recent(p_name text)
returns boolean
language plpgsql security definer stable
set search_path = public
as $$
declare
  v_id uuid;
begin
  begin
    v_id := split_part(p_name, '/', 1)::uuid;
  exception when others then
    return false;
  end;
  return complaint_is_recent(v_id)
     and (select count(*) from storage.objects where bucket_id = 'attachments' and name like v_id::text || '/%') < 5;
end;
$$;

drop policy if exists "allow_upload_attachments" on storage.objects;
drop policy if exists "public_upload_attachments" on storage.objects;
create policy "public_upload_attachments" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'attachments' and public.complaint_folder_is_recent(name));

drop policy if exists "org_read_attachment_objects" on storage.objects;
create policy "org_read_attachment_objects" on storage.objects for select using (
  bucket_id = 'attachments'
  and exists (select 1 from public.complaints c where c.id::text = split_part(storage.objects.name, '/', 1))
);

drop policy if exists "org_delete_attachment_objects" on storage.objects;
create policy "org_delete_attachment_objects" on storage.objects for delete using (
  bucket_id = 'attachments'
  and exists (select 1 from public.complaints c where c.id::text = split_part(storage.objects.name, '/', 1)
                and public.can_access_category(c.category, 'delete'))
);

drop policy if exists "public_insert_attachments" on attachments;
create policy "public_insert_attachments" on attachments for insert with check (
  complaint_is_recent(complaint_id) and split_part(storage_path, '/', 1) = complaint_id::text
);

-- Límits del bucket també al servidor: 100 MB i tipus de document, imatge, vídeo i àudio
update storage.buckets set
  file_size_limit = 104857600,
  allowed_mime_types = array[
    'application/pdf', 'text/plain', 'text/csv', 'application/rtf', 'application/zip', 'application/x-zip-compressed',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation', 'message/rfc822', 'application/vnd.ms-outlook',
    'application/octet-stream', 'image/*', 'video/*', 'audio/*'
  ]
where id = 'attachments';

-- ── 7. Proteccions que deixen de dependre de auth.uid() ────────────────

create or replace function protect_profile_fields()
returns trigger
language plpgsql security invoker
set search_path = public
as $$
begin
  if not is_client_request() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.organization_id is distinct from old.organization_id then
    raise exception 'profile-field-protected' using errcode = '42501';
  end if;

  if new.role is distinct from old.role then
    if not is_superadmin()
       or not is_aal2()
       or old.organization_id is distinct from current_org_id()
       or old.id = auth.uid() then
      raise exception 'profile-role-protected' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create or replace function protect_organization_fields()
returns trigger
language plpgsql security invoker
set search_path = public
as $$
begin
  if not is_client_request() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.slug          is distinct from old.slug
     or new.plan          is distinct from old.plan
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.paid_until    is distinct from old.paid_until
     or new.created_at    is distinct from old.created_at then
    raise exception 'organization-field-protected' using errcode = '42501';
  end if;

  if new.name is null or length(trim(new.name)) = 0 or length(new.name) > 160 then
    raise exception 'organization-name-invalid' using errcode = '22023';
  end if;

  return new;
end;
$$;

alter function get_organization_by_slug(text) set search_path = public;
revoke execute on function generate_unique_org_slug(text) from public, anon, authenticated;
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function anonymize_complaint(uuid, text) from public, anon;
revoke execute on function extend_response_deadline(uuid, text) from public, anon;
revoke execute on function set_manager_permissions(uuid, jsonb) from public, anon;
revoke execute on function retention_due() from public, anon;
grant execute on function anonymize_complaint(uuid, text) to authenticated;
grant execute on function extend_response_deadline(uuid, text) to authenticated;
grant execute on function set_manager_permissions(uuid, jsonb) to authenticated;
grant execute on function retention_due() to authenticated;
