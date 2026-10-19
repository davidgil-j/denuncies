-- Vuelta atrás de la 017 (dirección propia). No borra nada: la columna custom_domain se queda, sin uso.
-- Las direcciones propias dejan de llevar a su canal (la raíz enseña la web de siempre). Quitar también las
-- direcciones en Vercel › Settings › Domains. Se puede ejecutar más de una vez.

drop function if exists get_organization_slug_by_domain(text);
drop trigger if exists protect_custom_domain on organizations;
