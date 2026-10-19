-- Vuelta atrás de la 018 (pie «Con Reportia» por empresa). No borra nada: la columna show_powered_by se queda, sin
-- uso, y el pie vuelve a verse en todos los canales. Se puede ejecutar más de una vez.

drop trigger if exists protect_powered_by on organizations;
drop function if exists get_organization_by_slug(text);
create function get_organization_by_slug(p_slug text)
returns table (id uuid, name text, slug text, regional_authority_name text, regional_authority_url text, brand_palette text, brand_logo text)
language sql security definer stable
set search_path = public
as $$
  select id, name, slug, regional_authority_name, regional_authority_url, brand_palette, brand_logo
  from organizations where slug = p_slug;
$$;
grant execute on function get_organization_by_slug(text) to anon, authenticated;
