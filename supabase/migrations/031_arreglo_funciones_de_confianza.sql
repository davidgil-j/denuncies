-- ══════════════════════════════════════════════════════════════════════
-- 031 · Arreglo de la 028: las funciones de confianza vuelven a poder hacer su trabajo (URGENTE)
--
-- La 028 (B13) cambió is_client_request() para que mirase el rol de la petición (como api_role_is_client) en vez
-- de current_user. Pero las dos preguntas son distintas a propósito:
--   · is_client_request()  → «¿es una escritura DIRECTA del navegador?». Dentro de una función «security definer»
--                            (submit_complaint, register_complaint, execute_suppression…) current_user es su dueño,
--                            así que da false y la función de confianza puede tocar los campos protegidos.
--   · api_role_is_client() → «¿viene la petición del navegador, aunque pase por una función?». La usan los topes
--                            (una denuncia por petición, 50 por hora), que deben contar también por dentro.
-- Al unificarlas, los disparadores que protegen las denuncias saltan también dentro de las funciones de confianza.
-- Con la 028 ejecutada (producción desde el 28 oct):
--   · «Suprimir ahora» falla siempre (complaint-content-immutable), y la supresión de antes también;
--   · quien denuncia no puede pedir una reunión desde «Mi caso»; marcar la reunión como hecha, ampliar el plazo y
--     las demás acciones del panel que cambian campos protegidos fallan igual;
--   · registrar un caso a mano (teléfono, en persona, carta) lo guarda como «web» y con la fecha y hora de ahora en
--     vez de la de recepción (y los plazos legales se cuentan desde ahí).
-- Esta migración devuelve is_client_request() a current_user (como hasta la 027) y repara el canal de los casos
-- registrados a mano. La FECHA de recepción de esos casos no se puede recuperar sola: consulta y arreglo a mano en
-- docs/seguridad/QUE_TIENE_QUE_HACER_DAVID.md (apartado 2.12). Lo demás de la 028 (B1, B2, el revoke por defecto)
-- se queda igual.
--
-- Aditiva y repetible. Vuelta atrás: supabase/rollback/031_atras.sql (vuelve al fallo de la 028; solo para comparar).
-- ══════════════════════════════════════════════════════════════════════

create or replace function is_client_request()
returns boolean
language sql stable
as $$
  select current_user in ('anon', 'authenticated');
$$;

comment on function is_client_request() is
  '¿Escritura directa del navegador? Mira current_user: dentro de una función security definer es su dueño y da false (la función de confianza puede tocar campos protegidos). No confundir con api_role_is_client() (031).';
comment on function api_role_is_client() is
  '¿La petición viene del navegador, aunque pase por una función security definer? Mira el rol de la petición. Para los topes (una por petición, 50 por hora). No confundir con is_client_request() (031).';

-- Los casos registrados a mano con la 028 se guardaron como «web». register_complaint nunca acepta «web», y anota el
-- canal de verdad en el registro («registered»): se devuelve ese. Repetible (después ya no queda ninguno en «web»).
update complaints c
   set channel = a.details ->> 'channel'
  from audit_logs a
 where a.complaint_id = c.id
   and a.action = 'registered'
   and c.channel = 'web'
   and a.details ->> 'channel' in ('in_person', 'phone', 'mail', 'email', 'other');

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- Qué hace, en palabras llanas
--
-- La base de datos tiene unas protecciones para que nadie cambie desde el navegador lo que no debe (el contenido de
-- una denuncia, su fecha, su canal…). Las funciones del propio sistema (suprimir, registrar un caso, pedir una
-- reunión) sí deben poder hacerlo. La 028 hizo, sin querer, que las protecciones también frenasen a esas funciones.
-- Esta migración lo deja como estaba antes de la 028 y corrige el canal de los casos registrados a mano mientras
-- tanto. No borra nada.
-- ══════════════════════════════════════════════════════════════════════
