-- Migration 028: bajos (B1, B2, B13)
--
-- B1 · Leer los datos de la empresa y del equipo exige también el segundo paso (aal2), no solo la contraseña.
-- B2 · anon pierde los privilegios de tabla por defecto que no usa (segunda barrera si una política falla).
-- B13 · Las funciones nuevas no nacen ejecutables por anon/public, y se unifica la detección de «¿viene del navegador?».
--
-- Aditiva y repetible. Vuelta atrás: supabase/rollback/028_atras.sql.

-- ── B1 · Segundo paso también para SELECT de organizations y profiles ─────
-- Restrictiva: se suma (AND) a las políticas de lectura que ya hay. El propio perfil se puede leer siempre
-- (hace falta para saber el rol antes del segundo paso); el resto del equipo y la empresa, solo con aal2.
drop policy if exists "mfa_required_select_org" on organizations;
create policy "mfa_required_select_org" on organizations as restrictive for select to authenticated
  using (public.is_aal2());

drop policy if exists "mfa_required_select_profiles" on profiles;
create policy "mfa_required_select_profiles" on profiles as restrictive for select to authenticated
  using (public.is_aal2() or id = auth.uid());

-- ── B2 · anon no lee ni modifica las tablas de datos directamente ─────────
-- El canal público llega a los datos solo por funciones «security definer» (que se saltan esto) y por la subida
-- de adjuntos (attachments/storage, que mantienen su INSERT). Se le quita a anon leer, actualizar, borrar o vaciar.
revoke select, update, delete, truncate on
  complaints, messages, attachments, audit_logs, organizations, profiles, manager_permissions
  from anon;

-- ── B13 · Las funciones nuevas no nacen ejecutables por anon/public ───────
-- A partir de aquí, cada función nueva de public hay que concederla a mano (así nadie olvida un revoke). No afecta
-- a las ya creadas (conservan sus permisos). authenticated se deja, porque el panel llama a muchas funciones.
alter default privileges in schema public revoke execute on functions from public, anon;

-- Una sola forma de saber «¿viene del navegador?»: is_client_request pasa a mirar el rol de la petición (como
-- api_role_is_client), que es lo correcto también dentro de las funciones «security definer». En los disparadores
-- (security invoker) da lo mismo que antes. api_role_is_client se queda como alias de lo mismo.
create or replace function is_client_request()
returns boolean
language sql stable
as $$
  select coalesce(current_setting('role', true), '') in ('anon', 'authenticated');
$$;

-- B7 (quitar a un administrador solo con otro administrador) se cierra en la función de servidor delete-manager:
-- un administrador no puede borrar directamente a otro administrador (hay que bajarlo a gestor antes, lo ve el
-- equipo, o lo hace Reportia). No se bloquea aquí la BAJADA de rol, porque bajar a un administrador a gestor es una
-- acción legítima del panel; la protección de dos personas completa queda como propuesta (ver RONDA2_ARREGLOS.md).
