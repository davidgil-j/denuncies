-- ══════════════════════════════════════════════════════════════════════
-- 018 · Pie «Con Reportia» del canal, por empresa (docs/PLAN_FASES.md, n.º 49)
--
-- Aditiva y repetible: se puede ejecutar más de una vez. No borra ni transforma ningún dato.
-- Necesita la 016 (la marca): esta función devuelve también la paleta y el logo. Si falta, se para al principio sin
-- tocar nada. La aplicación funciona igual antes y después: sin la 018, el pie se ve en todos los canales, como hoy.
-- Vuelta atrás: supabase/rollback/018_atras.sql.
-- Al final está la explicación en palabras llanas.
-- ══════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organizations' and column_name = 'brand_palette'
  ) then
    raise exception 'Antes de la 018 hay que ejecutar la 016_marca.sql';
  end if;
end $$;

-- ── 1. El ajuste: visible por defecto ─────────────────────────────────

alter table organizations add column if not exists show_powered_by boolean not null default true;

-- ── 2. Solo lo cambia Reportia ────────────────────────────────────────
-- Es parte del contrato con cada cliente (marca blanca total o no): nadie lo cambia desde el panel, solo Reportia
-- con la clave de servicio, como el plan (009) o la dirección propia (017).

create or replace function protect_powered_by()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.show_powered_by is distinct from old.show_powered_by then
    raise exception 'organization-field-protected' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_powered_by on organizations;
create trigger protect_powered_by
  before update on organizations
  for each row execute function protect_powered_by();

-- ── 3. El canal lo lee junto con la marca ─────────────────────────────

drop function if exists get_organization_by_slug(text);
create function get_organization_by_slug(p_slug text)
returns table (id uuid, name text, slug text, regional_authority_name text, regional_authority_url text, brand_palette text, brand_logo text, show_powered_by boolean)
language sql security definer stable
set search_path = public
as $$
  select id, name, slug, regional_authority_name, regional_authority_url, brand_palette, brand_logo, show_powered_by
  from organizations where slug = p_slug;
$$;

grant execute on function get_organization_by_slug(text) to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Qué hace cada bloque, en palabras llanas
--
-- 1. Cada empresa tiene un ajuste para enseñar o no el enlace «Con Reportia» en el pie de su canal. Empieza visible.
-- 2. Ese ajuste solo lo cambia Reportia (es parte de lo que se contrata), nunca la empresa desde el panel.
-- 3. El canal lo lee junto con el nombre y la marca.
--
-- Para quitar el pie a una empresa (marca blanca total), en Supabase › SQL:
--   update organizations set show_powered_by = false where slug = 'acme';
-- ══════════════════════════════════════════════════════════════════════
