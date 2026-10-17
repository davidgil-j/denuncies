-- ══════════════════════════════════════════════════════════════════════
-- 017 · Dirección propia del canal (canal.empresa.es): fase 4 de docs/PLAN_FASES.md, n.º 53
--
-- Aditiva y repetible: se puede ejecutar más de una vez. No borra ningún dato ni ninguna columna.
-- No depende de la 014, la 015 ni la 016. La aplicación funciona igual antes y después de ejecutarla: sin ella,
-- ninguna empresa tiene dirección propia y los canales se abren, como hoy, en /canal/<dirección>.
-- Al final está la explicación de cada bloque en palabras llanas, y cómo se da de alta una dirección.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. La dirección propia de cada empresa ────────────────────────────
-- Un nombre de dominio en minúsculas, sin «https://» ni barras (por ejemplo, canal.acme.es). Una dirección solo
-- puede ser de una empresa.

alter table organizations add column if not exists custom_domain text;

alter table organizations drop constraint if exists organizations_custom_domain_check;
alter table organizations add constraint organizations_custom_domain_check
  check (custom_domain is null or (length(custom_domain) <= 253 and custom_domain ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'));

create unique index if not exists organizations_custom_domain_key on organizations (custom_domain) where custom_domain is not null;

-- ── 2. Solo la cambia Reportia ────────────────────────────────────────
-- La dirección tiene que estar dada de alta antes en Vercel (con su certificado): por eso no la cambia nadie desde el
-- panel, solo Reportia con la clave de servicio (como el plan y las fechas, 009).

create or replace function protect_custom_domain()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.custom_domain is distinct from old.custom_domain then
    raise exception 'organization-field-protected' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_custom_domain on organizations;
create trigger protect_custom_domain
  before update on organizations
  for each row execute function protect_custom_domain();

-- ── 3. Qué canal abrir en una dirección propia ────────────────────────
-- La web, al abrirse en canal.acme.es, pregunta de qué empresa es y abre su canal. Solo devuelve la dirección del
-- canal (lo mismo que ya lleva cualquier enlace al canal), nada más.

create or replace function get_organization_slug_by_domain(p_host text)
returns text
language sql security definer stable
set search_path = public
as $$
  select slug from organizations where custom_domain = lower(trim(p_host)) limit 1;
$$;

grant execute on function get_organization_slug_by_domain(text) to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Qué hace cada bloque, en palabras llanas
--
-- 1. Cada empresa puede tener una dirección propia para su canal, como canal.acme.es. Una dirección es de una sola
--    empresa.
-- 2. Esa dirección solo la pone Reportia: antes hay que darla de alta en Vercel. Nadie la cambia desde el panel.
-- 3. Cuando alguien abre canal.acme.es, la web pregunta de qué empresa es y abre su canal.
--
-- Cómo se da de alta una dirección (lo hace Reportia):
--   a) En Vercel, en el proyecto: Settings › Domains › Add, con la dirección (canal.acme.es). Vercel enseña el registro
--      CNAME que la empresa tiene que crear en su proveedor de dominio (cada proyecto tiene el suyo).
--   b) La empresa crea ese registro. Cuando Vercel la da por buena (y pone el certificado), en Supabase › SQL:
--        update organizations set custom_domain = 'canal.acme.es' where slug = 'acme';
--   c) Para quitarla: custom_domain = null, y quitar la dirección en Vercel.
-- El plan Hobby de Vercel admite 50 direcciones por proyecto; el Pro, sin límite práctico.
-- ══════════════════════════════════════════════════════════════════════
