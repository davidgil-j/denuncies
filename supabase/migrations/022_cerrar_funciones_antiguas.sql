-- ══════════════════════════════════════════════════════════════════════
-- 022 · Cerrar las puertas viejas del portal de seguimiento (ronda 2, A1 y A2)
--
-- La 021 añadió el camino endurecido (freno por empresa + prueba de trabajo, sin revelar si un código
-- existe) pero dejó VIVAS las funciones de antes para que la web actual no se rompiera mientras se cableaba
-- el navegador. Mientras esas funciones se puedan llamar sin sesión, A1 y A2 siguen explotables por ahí
-- (freno global, y el envío que revela si un código existe). Esta migración las cierra: anon y
-- authenticated ya no las pueden ejecutar.
--
-- ORDEN OBLIGATORIO (ver docs/seguridad/QUE_TIENE_QUE_HACER_DAVID.md):
--   1) ejecutar la 020 y la 021
--   2) publicar el navegador nuevo (usa el camino endurecido)
--   3) comprobar que el canal funciona (enviar, consultar, mensajes, reunión)
--   4) EJECUTAR ESTA 022
-- Si se ejecuta la 022 ANTES de publicar el navegador nuevo, el canal actual deja de poder consultar y
-- enviar (usa las funciones de antes). Por eso va al final.
--
-- Aditiva y repetible. Necesita la 021. Vuelta atrás: supabase/rollback/022_atras.sql (vuelve a abrirlas).
-- Al final, la explicación en palabras llanas.
-- ══════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regprocedure('public.consult_complaint(uuid, text, text, text)') is null then
    raise exception 'Antes de la 022 hay que ejecutar la 021_codigo_freno_por_empresa.sql';
  end if;
end $$;

-- Las cuatro funciones del portal de antes (freno global, no por empresa)
revoke execute on function get_complaint_by_tracking_code(text) from public, anon, authenticated;
revoke execute on function get_messages_by_tracking_code(text) from public, anon, authenticated;
revoke execute on function send_reporter_message(text, text)   from public, anon, authenticated;
revoke execute on function request_meeting_by_code(text)       from public, anon, authenticated;

-- El envío de antes (14 parámetros, 019) y el de la 020 (15 parámetros, con exclusiones pero sin id de
-- envío): revelan si un código existe con «code-conflict». El de la 021 (16 parámetros, con id de envío)
-- se queda: es el que usa el navegador nuevo.
revoke execute on function submit_complaint(uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text) from public, anon, authenticated;
revoke execute on function submit_complaint(uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text, uuid[]) from public, anon, authenticated;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- Qué hace, en palabras llanas
--
-- Quita el permiso para llamar, sin sesión (ni con ella), a las funciones del portal de antes y a las dos
-- versiones viejas del envío. A partir de aquí, la única forma de consultar, escribir, pedir reunión o
-- enviar una denuncia es por el camino endurecido de la 021 (con freno por empresa y prueba de trabajo).
-- Las funciones siguen existiendo (para poder volver atrás), pero nadie del navegador las puede ejecutar.
-- ══════════════════════════════════════════════════════════════════════
