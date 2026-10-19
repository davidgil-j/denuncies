-- Vuelta atrás de la 016 (marca blanca). Si la 018 está ejecutada, deshacerla antes (018_atras.sql).
-- No borra nada: la paleta, el logo y la apariencia se quedan guardados, sin uso. El canal vuelve a leer solo
-- nombre, dirección y autoridad autonómica, y la web deja de enseñar «Tu marca» y «Apariencia» (lo detecta sola).
-- Se puede ejecutar más de una vez.

drop function if exists get_organization_by_slug(text);
create function get_organization_by_slug(p_slug text)
returns table (id uuid, name text, slug text, regional_authority_name text, regional_authority_url text)
language sql security definer stable
set search_path = public
as $$
  select id, name, slug, regional_authority_name, regional_authority_url from organizations where slug = p_slug;
$$;
grant execute on function get_organization_by_slug(text) to anon, authenticated;

-- Para que la web deje de enseñar «Tu marca» y «Apariencia», las columnas tienen que desaparecer de la lectura. No se
-- borran: se cambian de nombre (se recuperan cambiándolo otra vez).
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'organizations' and column_name = 'brand_palette') then
    alter table organizations rename column brand_palette to brand_palette_016;
    alter table organizations rename column brand_logo to brand_logo_016;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'appearance') then
    alter table profiles rename column appearance to appearance_016;
  end if;
end $$;
