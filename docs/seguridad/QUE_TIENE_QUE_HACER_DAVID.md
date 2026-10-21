# Lo que tiene que hacer David · Seguridad ronda 2

Todo lo del código de esta ronda está hecho y probado en local. Esto es lo que necesita tus cuentas (Supabase, Vercel) o una decisión. **No ejecutes nada en producción hasta que te avise de que el frontend está cableado y probado**: las migraciones son seguras por sí solas (mantienen el camino de antes), pero el beneficio completo necesita el navegador nuevo, y conviene publicarlos juntos como en las otras rondas.

> Estado: hechas y probadas las migraciones **020** (exclusión por caso, C1) y **021** (código: freno por empresa y prueba de trabajo, A1 y A2). El resto de bloques (A4, A6, A7, A3, A5, medios, bajos) aún no está; esta guía se irá completando.

---

## 1 · Mirarlo en local (opcional)

```bash
npm run db:test     # 369 correctas, 0 fallidas (incluye los bloques 020 y 021)
npm run test:logic  # 42 correctas
```

Las dos migraciones se prueban sobre el estado actual de producción (con la 019 ya ejecutada): el harness aplica las 019 anteriores y luego la 020 y la 021.

---

## 2 · El SQL, en Supabase › SQL Editor

Uno a uno, en este orden. Los dos se pueden ejecutar más de una vez sin romper nada. Si algo va mal, en `supabase/rollback/` está la vuelta atrás de cada uno (`020_atras.sql`, `021_atras.sql`); ninguna borra datos.

**2.0 · Antes de nada, que estén la 014 y la 019** (la 021 las necesita):
```sql
select to_regprocedure('public.tracking_key(text)') is not null as tiene_la_019;
```
Tiene que salir `true`.

**2.1 · `supabase/migrations/020_exclusion_por_caso.sql`.** Comprobación:
```sql
select to_regprocedure('public.exclude_from_complaint(uuid, uuid)') is not null as tiene_020;
```
Tiene que salir `true`. A partir de aquí, si una denuncia aparta a alguien del panel, esa persona deja de verla.

**2.2 · `supabase/migrations/021_codigo_freno_por_empresa.sql`.** Comprobación:
```sql
select to_regprocedure('public.consult_complaint(uuid, text, text, text)') is not null as tiene_021,
       has_table_privilege('anon', 'complaints', 'insert') as insercion_directa; -- debe ser false
```
`tiene_021 = true` e `insercion_directa = false`. Después, comprueba que una denuncia real de prueba se sigue consultando con su código (el navegador actual usa el camino de antes, que no cambia).

---

## 3 · M1 y M2 · Las huellas de los códigos (pendiente de la migración de la ronda 2)

> Esto es de las correcciones a la ronda 1: la 019 **ya está en producción**, pero reescribe las huellas antiguas solo cuando alguien consulta ese código, y la copia `private.complaints_copia_019` (con las identidades) sigue ahí.

- **M1:** reescribir **todas** las huellas antiguas de golpe (en lugar de esperar a que alguien consulte). Se hará en la tanda de medios, con su migración y su prueba; cuando esté, aquí irá el SQL exacto y su comprobación.
- **M2:** una vez hecho M1 y con unos días de margen, **borrar la copia**:
  ```sql
  drop table if exists private.complaints_copia_019;
  ```
  Comprobación: `select to_regclass('private.complaints_copia_019') is null as borrada;` → `true`.

---

## 4 · Ajustes de Supabase y Vercel (pendiente)

Los hallazgos M9 (la Preview usa la base de datos de producción), M10 (la frase «no guardamos la IP») y B12 (ajustes de Supabase Auth) se resuelven con configuración y textos, no con código. Cuando llegue la tanda de medios, aquí irán:
- el texto exacto propuesto para la IP (en el canal y en la privacidad) para que lo revise el abogado;
- la lista de ajustes de Supabase Auth a confirmar (contraseña mínima de 12, confirmación de correo, «Secure email/password change», duración de sesiones, límites por IP);
- cómo separar un proyecto de Supabase para las Preview y proteger los despliegues de Vercel;
- la activación de `pg_cron` para la tarea de supresión (M11).

---

## 5 · Los commits (pendiente del frontend)

Cuando el frontend esté cableado y las pruebas (incluida `npm run e2e`) en verde, los cambios se agruparán así (un commit por bloque, cada uno con sus archivos):

1. **C1 · base de datos:** `supabase/migrations/020_exclusion_por_caso.sql`, `supabase/rollback/020_atras.sql`, `scripts/test-rls.mjs`.
2. **A1 y A2 · base de datos:** `supabase/migrations/021_codigo_freno_por_empresa.sql`, `supabase/rollback/021_atras.sql`, `scripts/test-rls.mjs`.
3. **C1 · navegador:** el formulario, la ficha, `supabase.js`, `demoStore.js`, los textos.
4. **A1 y A2 · navegador:** la prueba de trabajo (worker), los códigos de 16, `supabase.js`, la consulta, `demoStore.js`, los textos.
5. **Documentación:** `docs/seguridad/*`, `docs/DECISIONES_TOMADAS.md`, `docs/REVISION_LEGAL.md`.

Como siempre: `git push origin main`. **Nunca a upstream.**
