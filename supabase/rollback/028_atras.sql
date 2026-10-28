-- Vuelta atrás de la 028 (bajos B1, B2, B13).
-- Quita el segundo paso en la lectura de empresa/equipo, devuelve a anon los privilegios de tabla, deshace el
-- revoke por defecto y vuelve is_client_request a mirar current_user. Repetible.

-- B1
drop policy if exists "mfa_required_select_org" on organizations;
drop policy if exists "mfa_required_select_profiles" on profiles;

-- B2
grant select, update, delete, truncate on
  complaints, messages, attachments, audit_logs, organizations, profiles, manager_permissions
  to anon;

-- B13
alter default privileges in schema public grant execute on functions to public, anon;
create or replace function is_client_request()
returns boolean
language sql stable
as $$
  select current_user in ('anon', 'authenticated');
$$;
