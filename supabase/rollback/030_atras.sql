-- Vuelta atrás de la 030: vuelve a abrir el submit_complaint de 16 parámetros (sin prueba de trabajo) para anon y
-- authenticated, como lo dejó la 026. Se puede ejecutar más de una vez. No borra ni cambia datos.

grant execute on function submit_complaint(uuid, uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text, uuid[]) to anon, authenticated;

notify pgrst, 'reload schema';
