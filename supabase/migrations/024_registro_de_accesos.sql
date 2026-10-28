-- Migration 024: A6 — registro de accesos
--
-- Queda anotado, por la base de datos (no solo desde la pantalla), quién ABRE un caso, quién lo EXPORTA
-- (PDF de un caso, Excel de la lista, informe del año), quién DESCARGA un archivo, quién VE LA IDENTIDAD
-- (ya estaba, 'identity_viewed') y quién BORRA algo (un archivo del almacén, o suprime el caso).
-- Las lecturas y exportaciones pasan por funciones que anotan; el borrado de archivos, por un disparador en Storage.
-- Pantalla «Accesos» para los administradores: list_access_log, que respeta la exclusión por caso (C1).
--
-- Aditiva y repetible. Vuelta atrás: supabase/rollback/024_atras.sql. No crea columnas. La web funciona con la base
-- de datos en la 023 (sin esta) y con ella: las llamadas de anotación son «si puedes, anota», y si la función no
-- existe el panel sigue igual (no se rompe nada).
--
-- Nota de A4: estas acciones son del EQUIPO, así que mantienen la hora (no están en la lista de acciones de quien
-- denuncia que la 023 redondea al día). El registro de accesos tiene que llevar la hora: es para rendir cuentas.

-- ── 1. Anotar un acceso a un caso (abrir, exportar su PDF, descargar un archivo) ─
-- security definer: anota saltándose la RLS de inserción, pero comprueba a mano que quien llama puede ver el caso
-- (empresa, categoría, no apartado por C1, dos pasos). El autor y la empresa los pone el disparador de contexto.
create or replace function log_case_access(p_complaint uuid, p_kind text, p_detail text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
begin
  if p_kind not in ('case_opened', 'exported_case', 'file_downloaded') then
    raise exception 'bad-access-kind' using errcode = '22023';
  end if;
  select c.id, c.category into v
    from complaints c where c.id = p_complaint and c.organization_id = current_org_id();
  if v.id is null or not is_aal2() or not can_access_category(v.category, 'view') or is_excluded(p_complaint) then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  insert into audit_logs (complaint_id, action, details)
  values (p_complaint, p_kind, case when p_detail is null then '{}'::jsonb else jsonb_build_object('detail', left(p_detail, 300)) end);
end;
$$;
revoke execute on function log_case_access(uuid, text, text) from public, anon;
grant execute on function log_case_access(uuid, text, text) to authenticated;

-- ── 2. Anotar una exportación de toda la empresa (Excel de la lista, informe del año) ─
-- Sin caso concreto (complaint_id nulo): solo la ve el administrador (política org_read_audit_logs de la 008).
create or replace function log_org_export(p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('exported_excel', 'exported_report') then
    raise exception 'bad-access-kind' using errcode = '22023';
  end if;
  if current_org_id() is null or not is_aal2() then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  insert into audit_logs (complaint_id, action, details) values (null, p_kind, '{}'::jsonb);
end;
$$;
revoke execute on function log_org_export(text) from public, anon;
grant execute on function log_org_export(text) to authenticated;

-- ── 3. Anotar el borrado de un archivo del almacén ────────────────────────
-- Disparador en storage.objects (bucket de adjuntos): al borrar, deja 'file_deleted' con el autor (auth.uid()).
-- En un bloque protegido, como el de la 023: si el rol de la migración no puede crear el disparador, avisa y sigue.
create or replace function log_storage_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if old.bucket_id = 'attachments' then
    begin v_id := split_part(old.name, '/', 1)::uuid; exception when others then v_id := null; end;
    insert into audit_logs (complaint_id, action, details)
    values (v_id, 'file_deleted', jsonb_build_object('detail', split_part(old.name, '/', 2)));
  end if;
  return old;
end;
$$;
do $$
begin
  drop trigger if exists zz_log_storage_delete on storage.objects;
  create trigger zz_log_storage_delete after delete on storage.objects
    for each row execute function log_storage_delete();
exception when insufficient_privilege or others then
  raise notice 'No se pudo crear el disparador de borrado en storage.objects (%). El resto de la 024 se aplica igual; créalo con el rol adecuado (ver la guía).', sqlerrm;
end;
$$;

-- ── 4. La pantalla «Accesos»: el registro de accesos de la empresa, para el administrador ─
-- Respeta la exclusión por caso (C1): no enseña los accesos de un caso del que el administrador está apartado.
create or replace function list_access_log(p_limit integer default 200, p_offset integer default 0)
returns table (
  id uuid, created_at timestamptz, action text, actor_name text,
  reference text, detail text, complaint_id uuid
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_superadmin() or not is_aal2() then
    raise exception 'not-allowed' using errcode = '42501';
  end if;
  return query
    select a.id, a.created_at, a.action, a.actor_name,
           c.reference, a.details->>'detail' as detail, a.complaint_id
    from audit_logs a
    left join complaints c on c.id = a.complaint_id
    where a.organization_id = current_org_id()
      and a.action in ('case_opened', 'exported_case', 'exported_excel', 'exported_report',
                       'file_downloaded', 'identity_viewed', 'file_deleted', 'anonymized')
      and (a.complaint_id is null or not is_excluded(a.complaint_id))
    order by a.created_at desc
    limit greatest(coalesce(p_limit, 200), 0)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;
revoke execute on function list_access_log(integer, integer) from public, anon;
grant execute on function list_access_log(integer, integer) to authenticated;
