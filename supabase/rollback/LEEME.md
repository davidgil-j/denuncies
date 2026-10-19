# Copias y vueltas atrás de las migraciones 016 a 019

Aquí van los SQL que **no** son migraciones: no se ejecutan solos ni con `npm run db:migrate`. Se pegan a mano en
Supabase › SQL, solo si hace falta, en el orden que dice `docs/QUE_TIENE_QUE_HACER_DAVID.md`.

| Archivo | Cuándo |
|---|---|
| `019_copia_antes.sql` | **Antes** de ejecutar la 019: copia la tabla de denuncias en un esquema privado |
| `019_atras.sql` | Si la 019 da problemas |
| `018_atras.sql` | Si la 018 da problemas (antes que la 016_atras, si hay que deshacer las dos) |
| `017_atras.sql` | Si la 017 da problemas |
| `016_atras.sql` | Si la 016 da problemas (después de deshacer la 018) |

Ninguna vuelta atrás borra datos: deja las columnas nuevas donde están (sin uso) y devuelve las funciones a como
eran. Todas se pueden ejecutar más de una vez. `npm run db:test` las prueba.
