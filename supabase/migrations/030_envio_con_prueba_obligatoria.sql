-- ══════════════════════════════════════════════════════════════════════
-- 030 · Enviar una denuncia exige siempre la prueba de trabajo (ronda 2, A3)
--
-- La 026 añadió el submit_complaint de 18 parámetros (comprueba la prueba de trabajo y delega en el de 16),
-- pero dejó el de 16 abierto como reserva para la web que aún no la resolvía. Mientras siga abierto, la prueba
-- de trabajo al enviar no es obligatoria: un robot puede saltársela llamando al de 16 directamente. Esta
-- migración lo cierra, igual que la 022 cerró las funciones de antes: anon y authenticated ya no lo pueden
-- ejecutar. Sigue existiendo (el de 18 lo llama por dentro, con los permisos de su dueño).
--
-- ORDEN: solo con la 026 ejecutada y la web publicada que envía por el de 18 (la de la ronda 2, commit
-- f35b046 o posterior). Si se ejecuta con una web anterior, el canal deja de poder enviar denuncias.
-- Comprobaciones en docs/seguridad/QUE_TIENE_QUE_HACER_DAVID.md (apartado 2.11).
--
-- Aditiva y repetible. Necesita la 026. Vuelta atrás: supabase/rollback/030_atras.sql (lo vuelve a abrir).
-- Al final, la explicación en palabras llanas.
-- ══════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regprocedure('public.submit_complaint(uuid, uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text, uuid[], text, text)') is null then
    raise exception 'Antes de la 030 hay que ejecutar la 026_canal_no_se_cierra.sql';
  end if;
end $$;

-- El de 16 parámetros (021): sin prueba de trabajo. Solo lo puede llamar el de 18 (security definer).
revoke execute on function submit_complaint(uuid, uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text, uuid[]) from public, anon, authenticated;

-- El de 18 sigue abierto (lo repetimos por si alguien lo hubiera tocado a mano)
grant execute on function submit_complaint(uuid, uuid, text, text, text, boolean, text, text, text, text, date, text, text, boolean, text, uuid[], text, text) to anon, authenticated;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- Qué hace, en palabras llanas
--
-- Hasta ahora había dos puertas para enviar una denuncia: la nueva, que pide al navegador resolver una pequeña
-- cuenta antes de enviar (encarece enviar miles de denuncias falsas), y la de reserva, que no la pedía. Esta
-- migración cierra la de reserva. Quien denuncia no nota nada: su navegador ya usa la nueva y la cuenta tarda
-- una décima de segundo. No borra nada ni cambia ningún dato.
-- ══════════════════════════════════════════════════════════════════════
