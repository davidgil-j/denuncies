-- ══════════════════════════════════════════════════════════════════════
-- 016 · Marca blanca: «Tu marca» de cada empresa y «Apariencia» de cada gestor (docs/PLAN_FASES.md, fase 3)
--
-- Aditiva y repetible: se puede ejecutar más de una vez. No borra ningún dato ni ninguna columna.
-- No depende de la 014 ni de la 015. La aplicación funciona igual antes y después de ejecutarla:
-- sin ella, el canal y el panel salen con la paleta azul de siempre y sin logo, y «Tu marca» y
-- «Apariencia» no se enseñan.
-- Al final está la explicación de cada bloque en palabras llanas.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. La marca de la empresa: paleta y logo ──────────────────────────
-- La paleta es una de ocho, cerradas y con el contraste medido (src/v2/lib/brand.js). No hay color libre:
-- así ningún canal queda ilegible. El logo se guarda ya preparado por el navegador: una imagen PNG, WebP o
-- JPEG pequeña (nunca SVG, que puede llevar código), escrita como «data:» para que el canal la pinte sin
-- pedir nada a otro sitio.

alter table organizations
  add column if not exists brand_palette text not null default 'azul',
  add column if not exists brand_logo    text;

alter table organizations drop constraint if exists organizations_brand_palette_check;
alter table organizations add constraint organizations_brand_palette_check
  check (brand_palette in ('azul', 'marino', 'petroleo', 'bosque', 'burdeos', 'violeta', 'teja', 'grafito'));

alter table organizations drop constraint if exists organizations_brand_logo_check;
alter table organizations add constraint organizations_brand_logo_check
  check (
    brand_logo is null
    or (length(brand_logo) <= 120000 and brand_logo ~ '^data:image/(png|webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$')
  );

-- Quién la cambia: lo mismo que el resto de datos de la empresa (009 y 014). Solo un administrador de la
-- propia empresa, y con la verificación en dos pasos hecha. No hace falta ninguna política nueva.

-- ── 2. El canal enseña la marca ───────────────────────────────────────
-- La función pública que lee la empresa por su dirección (011) devuelve también la paleta y el logo.
-- Nada más: ni el plan, ni la facturación, ni la persona responsable.

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

-- ── 3. La apariencia de cada gestor: claro, oscuro o como el sistema ──
-- Va en su perfil. Cada persona cambia la suya con la política que ya existe (own_profile_update, 008).

alter table profiles
  add column if not exists appearance text not null default 'system';

alter table profiles drop constraint if exists profiles_appearance_check;
alter table profiles add constraint profiles_appearance_check
  check (appearance in ('light', 'dark', 'system'));

-- ══════════════════════════════════════════════════════════════════════
-- Qué hace cada bloque, en palabras llanas
--
-- 1. Cada empresa guarda su paleta (una de ocho; por defecto, la azul de siempre) y, si quiere, su logo.
--    El logo es una imagen pequeña ya preparada; la base de datos rechaza cualquier otra cosa (SVG, enlaces
--    a otros sitios o imágenes grandes). Solo lo cambia un administrador de la empresa con los dos pasos.
-- 2. El canal de denuncias lee la paleta y el logo junto con el nombre, para pintarse con la marca de la
--    empresa. No se abre ningún otro dato.
-- 3. Cada persona del equipo elige si quiere ver el panel claro, oscuro o como tenga el ordenador. Se
--    guarda en su perfil y la acompaña de un ordenador a otro.
-- ══════════════════════════════════════════════════════════════════════
