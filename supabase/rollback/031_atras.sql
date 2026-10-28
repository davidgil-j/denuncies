-- Vuelta atrás de la 031: vuelve is_client_request() a como la dejó la 028 (mirando el rol de la petición).
-- OJO: eso vuelve a romper la supresión, la reunión desde «Mi caso» y el registro de casos a mano (ver la 031). Solo
-- tiene sentido para comparar o si la 031 diera un problema inesperado. No deshace la reparación del canal de los casos
-- registrados a mano (era un dato mal guardado). Repetible.

create or replace function is_client_request()
returns boolean
language sql stable
as $$
  select coalesce(current_setting('role', true), '') in ('anon', 'authenticated');
$$;

notify pgrst, 'reload schema';
