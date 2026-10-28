-- Vuelta atrás de la 029 (modo claro por defecto, 8b).
-- Devuelve el valor por defecto de appearance a 'system' (como la 016). No vuelve a poner 'system' a los perfiles
-- que ya se pasaron a 'light' (no se puede distinguir cuáles eran 'system' de los que eligieron 'light'). Repetible.
alter table profiles alter column appearance set default 'system';
