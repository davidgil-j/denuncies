-- Migration 029: modo claro por defecto (8b)
--
-- El canal es de la empresa cliente: en claro, sus colores se ven tal como los eligió. Por eso el canal y el acceso
-- al panel se ven siempre en claro (en el navegador), y en el panel el modo por defecto pasa a ser «Claro» en vez
-- de «Como el sistema». Cada persona puede seguir eligiendo Oscuro o Como el sistema en «Apariencia».
--
-- Aditiva y repetible. Vuelta atrás: supabase/rollback/029_atras.sql. No hay clientes reales todavía (los perfiles
-- con 'system' pasan a 'light'); anótalo en la guía.

-- El valor por defecto de appearance pasa a 'light' (antes 'system', migración 016)
alter table profiles alter column appearance set default 'light';

-- Los perfiles que tenían 'system' pasan a 'light' (los 'dark' se quedan en 'dark'). Repetible.
update profiles set appearance = 'light' where appearance = 'system';
