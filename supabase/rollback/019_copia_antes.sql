-- ANTES de ejecutar la 019: copia de la tabla de denuncias, entera, en un esquema privado (la web no lo ve).
-- Se puede ejecutar más de una vez: si la copia ya existe, no la pisa.
-- Comprobación: las dos cifras del final tienen que ser iguales.
-- Cuando la 019 lleve unas semanas sin problemas, se borra con:  drop table private.complaints_copia_019;
-- (Contiene datos de denuncias: tratarla como el resto de la base de datos.)

create schema if not exists private;
revoke all on schema private from public;
create table if not exists private.complaints_copia_019 as table public.complaints;
revoke all on private.complaints_copia_019 from public;

select (select count(*) from public.complaints) as denuncias, (select count(*) from private.complaints_copia_019) as copiadas;
