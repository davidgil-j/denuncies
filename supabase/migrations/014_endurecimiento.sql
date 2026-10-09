-- ══════════════════════════════════════════════════════════════════════
-- 014 · Enduriment (auditoria de seguretat, docs/AUDITORIA.md)
--
-- Additiva i repetible: es pot executar més d'una vegada. No esborra cap dada ni cap columna.
-- L'aplicació funciona igual abans i després d'executar-la: el navegador fa servir les funcions
-- noves si hi són i, si no, les d'abans.
-- Al final hi ha l'explicació de cada bloc en paraules planeres.
-- ══════════════════════════════════════════════════════════════════════

-- Petició que arriba de l'API (navegador), també quan passa per una funció «security definer».
-- is_client_request() mira current_user, que dins d'una funció d'aquest tipus és el propietari;
-- el paràmetre «role» el posa l'API (SET ROLE) i no canvia en entrar a la funció.
create or replace function api_role_is_client()
returns boolean
language sql stable
as $$
  select coalesce(current_setting('role', true), '') in ('anon', 'authenticated');
$$;

-- ── 1. Denúncies des del canal: una per petició i un màxim per hora ────
-- Abans es podien crear milers de denúncies en una sola petició, i l'error de «codi repetit»
-- deixava endevinar un codi de seguiment per tries successives (A1-1, A1-4).

-- Es comprova fila a fila, ABANS de mirar si el codi ja existeix: en un lote, la segona fila es
-- rebutja sempre igual, tant si el seu codi existeix com si no. Una petició de l'API és una transacció.
create or replace function complaints_one_per_request()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if api_role_is_client() then
    if current_setting('reportia.complaint_inserted', true) = 'yes' then
      raise exception 'one-at-a-time' using errcode = '22023';
    end if;
    perform set_config('reportia.complaint_inserted', 'yes', true);
  end if;
  return new;
end;
$$;

drop trigger if exists complaints_one_per_request on complaints;
create trigger complaints_one_per_request
  before insert on complaints
  for each row execute function complaints_one_per_request();

-- Com a molt 50 denúncies per hora a cada empresa pel formulari web. Una allau de denúncies falses
-- omple la safata i envia un avís per cadascuna; amb el topall, qui informa de debò veu un missatge
-- que li diu que ho torni a provar més tard o que faci servir el canal extern.
create index if not exists complaints_org_created_idx on complaints (organization_id, created_at);

create or replace function complaints_web_rate_limit()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.channel = 'web' and api_role_is_client() and (
    select count(*) from complaints c
    where c.organization_id = new.organization_id and c.channel = 'web' and c.created_at > now() - interval '1 hour'
  ) >= 50 then
    raise exception 'rate-limited' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke execute on function complaints_web_rate_limit() from public, anon, authenticated;

-- El nom fa que s'executi després de complaints_server_fields, que ja ha posat channel = 'web'
drop trigger if exists complaints_web_rate_limit on complaints;
create trigger complaints_web_rate_limit
  before insert on complaints
  for each row execute function complaints_web_rate_limit();

-- ── 2. Enviar una denúncia amb una sola crida (submit_complaint) ───────
-- El servidor decideix estat, prioritat i canal, i escriu l'entrada «created». Si la xarxa cau
-- després de desar i el navegador ho torna a provar amb el mateix codi i el mateix contingut,
-- retorna la mateixa denúncia en lloc de crear-ne una altra (B-9).

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

  -- El mateix enviament repetit (mateix codi, empresa, tema, text i manera, fa poc): la mateixa denúncia.
  -- Si alguna cosa no coincideix (per exemple, ara és identificada), no es dona per enviada
  select c.id, c.organization_id, c.category, c.description, c.is_anonymous, c.created_at into v_old
  from complaints c where c.tracking_hash = p_hash;
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

-- ── 3. Límit d'intents amb codis de seguiment que no existeixen ────────
-- Global (de tot Reportia) i sense guardar cap IP: el canal promet anonimat. Si en 10 minuts hi ha
-- més de 1000 consultes amb codis inexistents, les consultes per codi es frenen fins que baixen.

create table if not exists code_attempts (
  window_start timestamptz primary key,
  failures     int not null default 0
);
alter table code_attempts enable row level security;
revoke all on code_attempts from public, anon, authenticated;

create or replace function code_attempts_blocked()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(sum(failures), 0) >= 1000 from code_attempts where window_start > now() - interval '10 minutes';
$$;

create or replace function code_attempt_failed()
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  insert into code_attempts (window_start, failures) values (date_trunc('minute', now()), 1)
  on conflict (window_start) do update set failures = code_attempts.failures + 1;
  delete from code_attempts where window_start < now() - interval '1 day';
end;
$$;
revoke execute on function code_attempts_blocked() from public, anon, authenticated;
revoke execute on function code_attempt_failed() from public, anon, authenticated;

-- Les quatre funcions del portal de seguiment. Amb un codi que no existeix ja no donen error:
-- retornen buit, perquè un error desfaria també el recompte de l'intent fallit.
create or replace function get_complaint_by_tracking_code(p_code text)
returns table (tracking_code text, status text, category text, created_at timestamptz, updated_at timestamptz,
               acknowledged_at timestamptz, answered_at timestamptz, extended_until date,
               meeting_requested boolean, meeting_requested_at timestamptz)
language plpgsql security definer volatile
set search_path = public
as $$
#variable_conflict use_column
begin
  if code_attempts_blocked() then
    raise exception 'too-many-attempts' using errcode = '54000';
  end if;
  return query
    select upper(trim(p_code)), c.status, c.category, c.created_at, c.updated_at, c.acknowledged_at, c.answered_at,
           c.extended_until, c.meeting_requested, c.meeting_requested_at
    from complaints c
    where c.tracking_hash = code_hash(p_code) and c.anonymized_at is null;
  if not found then
    perform code_attempt_failed();
  end if;
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
  select c.id into v_complaint from complaints c where c.tracking_hash = code_hash(p_code) and c.anonymized_at is null;
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

  select id, status into v_complaint, v_status from complaints
  where tracking_hash = code_hash(p_code) and anonymized_at is null;
  if v_complaint is null then
    perform code_attempt_failed();
    return null;
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

create or replace function request_meeting_by_code(p_code text)
returns timestamptz
language plpgsql security definer
set search_path = public
as $$
declare
  v record;
begin
  if code_attempts_blocked() then
    raise exception 'too-many-attempts' using errcode = '54000';
  end if;
  select c.id, c.status, c.meeting_requested, c.meeting_requested_at into v
  from complaints c
  where c.tracking_hash = code_hash(p_code) and c.anonymized_at is null;
  if v.id is null then
    perform code_attempt_failed();
    return null;
  end if;
  if v.status in ('resolved', 'closed', 'archived') then
    raise exception 'complaint-closed' using errcode = '22023';
  end if;
  -- Demanar-la dues vegades no mou la data: el termini compta des de la primera petició
  if v.meeting_requested then
    return coalesce(v.meeting_requested_at, now());
  end if;
  update complaints set meeting_requested = true, meeting_requested_at = now() where id = v.id;
  insert into audit_logs (complaint_id, action, details) values (v.id, 'meeting_requested', '{}'::jsonb);
  return now();
end;
$$;

grant execute on function get_complaint_by_tracking_code(text) to anon, authenticated;
grant execute on function get_messages_by_tracking_code(text) to anon, authenticated;
grant execute on function send_reporter_message(text, text) to anon, authenticated;
grant execute on function request_meeting_by_code(text) to anon, authenticated;

-- ── 4. Equip i empresa: cap canvi sense la verificació en dos passos ───
-- Amb només la contrasenya, un administrador podia esborrar o crear perfils, canviar noms i
-- l'enllaç a l'autoritat externa que veu qui denuncia (A1-2). Els perfils els creen i esborren
-- les funcions del servidor (invite-manager, delete-manager), mai el navegador.

drop policy if exists "superadmin_insert_profiles" on profiles;
drop policy if exists "superadmin_delete_profiles" on profiles;

drop policy if exists "mfa_required_update" on profiles;
create policy "mfa_required_update" on profiles as restrictive for update to authenticated
  using (is_aal2()) with check (is_aal2());
drop policy if exists "mfa_required_update" on organizations;
create policy "mfa_required_update" on organizations as restrictive for update to authenticated
  using (is_aal2()) with check (is_aal2());

-- ── 5. Registre d'activitat: qui ho va fer, encara que després marxi ───
-- El nom de l'autor es desa en el moment de l'acció (A1-3). Abans es mostrava el nom actual del
-- perfil i, si la persona s'esborrava, l'entrada quedava sense autor.

alter table audit_logs add column if not exists actor_name text;

create or replace function audit_logs_set_context()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  -- Des del navegador, l'autor és sempre qui ha iniciat la sessió. Les funcions del servidor
  -- (clau de servei) poden indicar qui ha fet l'acció.
  if api_role_is_client() or new.actor_id is null then
    new.actor_id := auth.uid();
  end if;
  if new.actor_id is not null then
    new.actor_name := (select p.full_name from profiles p where p.id = new.actor_id);
  elsif api_role_is_client() then
    new.actor_name := null;
  end if;
  if new.complaint_id is not null then
    select organization_id into new.organization_id from complaints where id = new.complaint_id;
  elsif auth.uid() is not null then
    new.organization_id := current_org_id();
  end if;
  return new;
end;
$$;

-- Les entrades que s'han escrit fins ara: el nom que té avui cada autor, que és el millor que hi ha
update audit_logs a set actor_name = p.full_name
from profiles p
where p.id = a.actor_id and a.actor_name is null and p.full_name is not null;

-- Des del navegador només entren dues accions; se'n guarda el que toca i prou (A1-9)
create or replace function audit_client_details()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if is_client_request() then
    if new.action = 'note_added' then
      new.details := jsonb_build_object('note', left(coalesce(new.details->>'note', ''), 5000));
    elsif new.action = 'created' then
      new.details := jsonb_build_object('channel', 'web', 'language', left(coalesce(new.details->>'language', ''), 5));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists audit_client_details on audit_logs;
create trigger audit_client_details
  before insert on audit_logs
  for each row execute function audit_client_details();

-- L'entrada «created» la posa el formulari una sola vegada per denúncia (A1-10)
create or replace function complaint_has_created_log(p_complaint_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from audit_logs where complaint_id = p_complaint_id and action = 'created');
$$;

drop policy if exists "public_insert_audit_created" on audit_logs;
create policy "public_insert_audit_created" on audit_logs
  for insert with check (
    action = 'created' and complaint_is_recent(complaint_id) and not complaint_has_created_log(complaint_id)
  );

-- ── 6. Buscar un compte pel correu (només el servidor) ─────────────────
-- invite-manager ho fa servir per no tornar a convidar ni esborrar comptes que ja existeixen,
-- d'aquesta empresa o d'una altra (A1-5).

create or replace function find_auth_user(p_email text)
returns table (id uuid, last_sign_in_at timestamptz, organization_id uuid)
language sql security definer stable
set search_path = public
as $$
  select u.id, u.last_sign_in_at, p.organization_id
  from auth.users u left join profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email));
$$;
revoke execute on function find_auth_user(text) from public, anon, authenticated;
grant execute on function find_auth_user(text) to service_role;

-- ── 7. Terminis i supressió ────────────────────────────────────────────

-- No s'amplia un termini de resposta que ja ha vençut (B-3). Les dates, en hora de Madrid.
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
  if (now() at time zone 'Europe/Madrid')::date > ((v.created_at at time zone 'Europe/Madrid')::date + interval '3 months')::date then
    raise exception 'deadline-passed' using errcode = '22023';
  end if;

  v_until := ((v.created_at at time zone 'Europe/Madrid')::date + interval '6 months')::date;
  update complaints set extended_until = v_until, extension_reason = trim(p_reason) where id = p_complaint;
  insert into audit_logs (complaint_id, action, details)
  values (p_complaint, 'deadline_extended', jsonb_build_object('until', v_until, 'note', trim(p_reason)));
  return v_until;
end;
$$;
revoke execute on function extend_response_deadline(uuid, text) from public, anon;
grant execute on function extend_response_deadline(uuid, text) to authenticated;

-- La supressió (art. 32) també buida el motiu de l'ampliació i el text de les notes i motius del
-- registre d'aquella denúncia (B-4). Es conserva què es va fer i quan, i el motiu de la supressió.
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
    incident_when = null, title = null, extension_reason = null,
    ai_summary = null, ai_title = null, ai_generated_at = null,
    reporter_name = null, reporter_email = null, reporter_phone = null,
    tracking_hash = 'anon-' || id::text,
    anonymized_at = now()
  where id = p_complaint;
  update audit_logs set details = details - 'note' - 'reason'
  where complaint_id = p_complaint and (details ? 'note' or details ? 'reason');
  insert into audit_logs (complaint_id, action, details)
  values (p_complaint, 'anonymized', jsonb_build_object('note', trim(p_reason)));
end;
$$;
revoke execute on function anonymize_complaint(uuid, text) from public, anon;
grant execute on function anonymize_complaint(uuid, text) to authenticated;

-- Els casos que ja s'havien suprimit: es buida ara el que quedava
update complaints set extension_reason = null where anonymized_at is not null and extension_reason is not null;
update audit_logs a set details = a.details - 'note' - 'reason'
from complaints c
where c.id = a.complaint_id and c.anonymized_at is not null and a.action <> 'anonymized'
  and (a.details ? 'note' or a.details ? 'reason');

-- Avís de supressió: als 3 mesos, tots els casos on no s'ha iniciat cap investigació, també els
-- tancats o arxivats (inadmesos, duplicats…), no només els que seguien a «Rebuda» (B-5)
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
          and c.investigation_started_at is null
          and c.status <> 'investigating')
    )
  order by c.created_at;
$$;
revoke execute on function retention_due() from public, anon;
grant execute on function retention_due() to authenticated;

-- ── 8. Alta d'empreses: adreces reservades i noms amb topall ───────────
-- Una empresa anomenada «Demo» rebia l'adreça del canal d'exemple (/canal/demo), on les denúncies
-- no arriben mai a la base de dades (A1-6). Noms de fins a 120 caràcters.

create or replace function generate_unique_org_slug(company_name text)
returns text
language plpgsql
as $$
declare
  base_slug text := trim(both '-' from left(slugify(left(coalesce(company_name, ''), 120)), 50));
  reserved  text[] := array['demo', 'admin', 'canal', 'api', 'app', 'www', 'reportia', 'ejemplo', 'exemple',
                            'example', 'privacitat', 'privacidad', 'crear-compte', 'soporte', 'suport', 'support'];
  candidate text;
  counter   int := 1;
begin
  if base_slug is null or base_slug = '' then
    base_slug := 'empresa';
  end if;
  candidate := base_slug;
  while candidate = any (reserved) or exists (select 1 from organizations where slug = candidate) loop
    counter := counter + 1;
    candidate := base_slug || '-' || counter;
  end loop;
  return candidate;
end;
$$;
revoke execute on function generate_unique_org_slug(text) from public, anon, authenticated;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_name text := nullif(left(trim(coalesce(new.raw_user_meta_data->>'company_name', '')), 120), '');
  v_full_name    text := nullif(left(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), 120), '');
  v_org_id       uuid;
begin
  -- Si ja hi ha un perfil per a aquest usuari, no es fa res més (reintents del disparador)
  if exists (select 1 from profiles where id = new.id) then
    return new;
  end if;

  if v_company_name is not null then
    -- Autoregistre: organització nova + perfil d'administrador
    insert into organizations (name, slug)
    values (v_company_name, generate_unique_org_slug(v_company_name))
    returning id into v_org_id;

    insert into profiles (id, role, full_name, organization_id)
    values (new.id, 'superadmin', v_full_name, v_org_id);
  else
    -- Invitació d'un gestor: perfil sense organització (l'hi assigna invite-manager)
    insert into profiles (id, role, full_name)
    values (new.id, 'manager', v_full_name);
  end if;

  return new;
end;
$$;
revoke execute on function handle_new_user() from public, anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Què fa cada bloc, en paraules planeres
--
-- 1. Ningú pot crear més d'una denúncia en una sola petició, i cada empresa en pot rebre com a
--    molt 50 per hora pel formulari web. Abans algú podia enviar-ne milers de cop (i, de passada,
--    anar endevinant codis de seguiment per l'error de «codi repetit»).
-- 2. Funció nova per enviar la denúncia d'una sola vegada. Si a qui informa li cau la connexió just
--    després d'enviar i torna a prémer el botó, no es crea una denúncia repetida.
-- 3. Si en 10 minuts arriben més de 1000 consultes amb codis de seguiment que no existeixen, el
--    portal de seguiment es frena una estona. No es guarda cap IP ni res de qui consulta. Contrapartida:
--    algú que ho provoqui a propòsit pot fer que el portal digui «massa intents» durant uns minuts.
-- 4. Per canviar perfils o les dades de l'empresa cal haver entrat amb el codi de l'app
--    d'autenticació. Els perfils ja no es poden crear ni esborrar des del navegador.
-- 5. El registre d'activitat desa el nom de qui ha fet cada cosa en aquell moment: si aquella persona
--    canvia de nom o se l'esborra de l'equip, l'entrada continua dient qui va ser. Les notes internes
--    tenen un topall de 5000 caràcters i ningú pot posar-hi un autor inventat.
-- 6. Funció només per al servidor que diu si un correu ja té compte. La invitació de gestors la fa
--    servir per no esborrar ni «robar» comptes d'altres empreses.
-- 7. No es pot ampliar un termini que ja ha vençut. La supressió esborra també el motiu de
--    l'ampliació i el text de les notes d'aquell cas. L'avís de supressió als 3 mesos inclou els
--    casos tancats o arxivats sense investigar.
-- 8. Cap empresa nova pot quedar-se adreces com /canal/demo o /canal/admin, i els noms d'empresa i
--    de persona tenen un topall de 120 caràcters.
-- ══════════════════════════════════════════════════════════════════════
