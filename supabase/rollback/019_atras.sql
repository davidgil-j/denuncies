-- Vuelta atrás de la 019 (huella con secreto). Se puede ejecutar más de una vez. No borra nada.
--
-- 1. Las denuncias nuevas se vuelven a guardar con la huella de antes (sin secreto).
-- 2. Las que se reescribieron al consultarlas vuelven a su huella de antes, sacada de la copia (019_copia_antes.sql).
-- 3. Las que entraron mientras la 019 estaba puesta solo tienen la huella con secreto: para que nadie pierda el acceso
--    a su caso, la búsqueda las sigue encontrando (sin reescribir ya nada). El secreto se queda guardado.

drop trigger if exists complaints_tracking_key on complaints;

create or replace function find_complaint_by_code(p_code text)
returns uuid
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_plain text := code_hash(p_code);
  v_id    uuid;
begin
  select c.id into v_id
  from complaints c
  where c.tracking_hash in (v_plain, tracking_key(v_plain)) and c.anonymized_at is null
  limit 1;
  return v_id;
end;
$$;
revoke execute on function find_complaint_by_code(text) from public, anon, authenticated;

do $$
begin
  if to_regclass('private.complaints_copia_019') is not null then
    perform set_config('reportia.rehashing', 'on', true);
    update public.complaints c
    set tracking_hash = b.tracking_hash
    from private.complaints_copia_019 b
    where c.id = b.id
      and b.tracking_hash ~ '^[0-9a-f]{64}$'
      and c.tracking_hash = public.tracking_key(b.tracking_hash);
    perform set_config('reportia.rehashing', 'off', true);
  end if;
end $$;
