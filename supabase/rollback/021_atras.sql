-- Vuelta atrás de la 021 (freno por empresa y prueba de trabajo). Se puede ejecutar más de una vez.
-- NO borra datos: las tablas code_attempts_by_org y pow_challenges y la columna submission_id se quedan
-- (sin uso). Vuelve a dejar la inserción directa de denuncias y quita las funciones nuevas.

-- 1. Se devuelve el permiso de inserción directa (como antes de la 021)
grant insert on complaints to anon;
do $$
begin
  execute 'grant insert on complaints to authenticated';
exception when undefined_object then null;
end $$;

-- 2. Fuera las funciones nuevas (las de antes, 014/019/020, no se tocan: siguen funcionando)
drop function if exists submit_complaint(uuid, uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text, uuid[]);
drop function if exists consult_complaint(uuid, text, text, text);
drop function if exists messages_by_code(uuid, text, text, text);
drop function if exists send_message_by_code(uuid, text, text, text, text);
drop function if exists request_meeting_in_org(uuid, text, text, text);
drop function if exists find_complaint_in_org(text, uuid);
drop function if exists issue_pow_challenge(uuid);
drop function if exists verify_pow(text, text, uuid);
drop function if exists pow_bits_required(uuid);
drop function if exists code_failures_recent(uuid);
drop function if exists code_attempt_failed(uuid);

notify pgrst, 'reload schema';
