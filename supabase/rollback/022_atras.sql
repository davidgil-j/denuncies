-- Vuelta atrás de la 022: vuelve a abrir las funciones del portal de antes (anon y authenticated). Se
-- puede ejecutar más de una vez. Útil si hay que volver al navegador anterior mientras se diagnostica algo.

grant execute on function get_complaint_by_tracking_code(text) to anon, authenticated;
grant execute on function get_messages_by_tracking_code(text) to anon, authenticated;
grant execute on function send_reporter_message(text, text)   to anon, authenticated;
grant execute on function request_meeting_by_code(text)       to anon, authenticated;
grant execute on function submit_complaint(uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text) to anon, authenticated;
grant execute on function submit_complaint(uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text, uuid[]) to anon, authenticated;

notify pgrst, 'reload schema';
