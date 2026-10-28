-- Vuelta atrás de la 024 (A6: registro de accesos).
-- Quita el disparador de borrado en Storage y las funciones de anotación y de lectura del registro de accesos.
-- NO borra las entradas ya anotadas en audit_logs. Repetible.

do $$
begin
  drop trigger if exists zz_log_storage_delete on storage.objects;
exception when others then null;
end;
$$;

drop function if exists list_access_log(integer, integer);
drop function if exists log_org_export(text);
drop function if exists log_case_access(uuid, text, text);
drop function if exists log_storage_delete();
