# Lo que tiene que hacer David · Seguridad ronda 2

Todo lo del código de esta ronda está hecho y probado en local. Esto es lo que necesita tus cuentas (Supabase, Vercel) o una decisión. **No ejecutes nada en producción hasta que te avise de que el frontend está cableado y probado**: las migraciones son seguras por sí solas (mantienen el camino de antes), pero el beneficio completo necesita el navegador nuevo, y conviene publicarlos juntos como en las otras rondas.

> Estado: hechas y probadas las migraciones **020** (exclusión por caso, C1) y **021** (código: freno por empresa y prueba de trabajo, A1 y A2). El resto de bloques (A4, A6, A7, A3, A5, medios, bajos) aún no está; esta guía se irá completando.

---

## 1 · Mirarlo en local (opcional)

```bash
npm run db:test     # 381 correctas, 0 fallidas (incluye los bloques 020, 021 y 022)
npm run test:logic  # 42 correctas
```

Las dos migraciones se prueban sobre el estado actual de producción (con la 019 ya ejecutada): el harness aplica las 019 anteriores y luego la 020 y la 021.

---

## 2 · El SQL, en Supabase › SQL Editor

**EL ORDEN IMPORTA** (la 022 va al final, después de publicar el navegador nuevo):

1. Ejecutar la **020** y la **021** (pasos 2.1 y 2.2).
2. **Publicar el navegador nuevo** (commits del navegador): usa el camino endurecido.
3. **Comprobar que el canal funciona** en producción: enviar una denuncia de prueba, consultarla con su código, escribir un mensaje y pedir una reunión.
4. Solo entonces, ejecutar la **022** (paso 2.3), que cierra las funciones de antes.

> Si ejecutas la 022 **antes** de publicar el navegador nuevo, el canal actual deja de poder consultar y enviar (usa las funciones de antes). Por eso va la última.

Cada uno se puede ejecutar más de una vez sin romper nada. Si algo va mal, en `supabase/rollback/` está la vuelta atrás de cada uno (`020_atras.sql`, `021_atras.sql`, `022_atras.sql`); ninguna borra datos. La 022 se puede deshacer en cualquier momento (`022_atras.sql`) para volver a abrir las funciones de antes si hace falta.

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
`tiene_021 = true` e `insercion_directa = false`. Después, **publica el navegador nuevo** y comprueba el canal en producción (enviar, consultar, mensajes, reunión).

**2.3 · `supabase/migrations/022_cerrar_funciones_antiguas.sql`** — OBLIGATORIO, y **solo después** de publicar el navegador nuevo y comprobar que el canal funciona. Cierra las funciones de antes (hasta aquí seguían abiertas, y por ellas A1 y A2 todavía eran explotables). Comprobación:
```sql
select has_function_privilege('anon', 'public.get_complaint_by_tracking_code(text)', 'execute') as puerta_vieja, -- debe ser false
       has_function_privilege('anon', 'public.consult_complaint(uuid, text, text, text)', 'execute') as puerta_nueva; -- debe ser true
```
`puerta_vieja = false` y `puerta_nueva = true`. Vuelve a comprobar que el canal sigue funcionando (ahora por el camino nuevo). Si algo falla, `022_atras.sql` reabre las de antes mientras lo miras.

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

## 5 · Los commits (C1, A1 y A2 ya están hechos y probados)

Pruebas en verde: `npm run db:test`, `npm run test:logic` y `npm run e2e`. Agrupa así (un commit por bloque):

1. **C1 · base de datos:** `supabase/migrations/020_exclusion_por_caso.sql`, `supabase/rollback/020_atras.sql`, `scripts/test-rls.mjs`.
2. **A1 y A2 · base de datos:** `supabase/migrations/021_codigo_freno_por_empresa.sql`, `supabase/migrations/022_cerrar_funciones_antiguas.sql`, `supabase/rollback/021_atras.sql`, `supabase/rollback/022_atras.sql`, `scripts/test-rls.mjs`.
3. **C1 · navegador:** `src/v2/canal/Denuncia.jsx`, `src/v2/canal/shared.jsx`, `src/v2/panel/Caso.jsx`, `src/v2/admin/adminKit.jsx`, `src/lib/supabase.js`, `src/lib/demoStore.js`, `src/translations.js`, `src/translations-panel.js`, `src/v2/canal/canal.css`, `src/v2/panel/panel.css`.
4. **A1 y A2 · navegador:** `src/lib/pow.js`, `src/v2/canal/powWorker.js`, `src/lib/supabase.js`, `src/v2/canal/Consulta.jsx`, `src/lib/demoStore.js`, `src/translations.js`.
5. **Pruebas e2e:** `e2e/seguridad-ronda2.mjs`, `e2e/run.mjs`, y los retoques en `e2e/canal.mjs`, `recorrido.mjs`, `endurecimiento.mjs`, `red-panel.mjs`, `red-ia.mjs`, `panel.mjs`, `csp.mjs`, `base-real.mjs` (formato de 16 caracteres y mocks de las RPC nuevas).
6. **Documentación:** `docs/seguridad/*`, `docs/DECISIONES_TOMADAS.md`, `docs/REVISION_LEGAL.md`.

Los commits 3 y 4 comparten `supabase.js`, `demoStore.js` y `translations.js`: si no quieres partir un archivo entre dos commits, junta el navegador de C1 y de A1/A2 en uno solo.

Como siempre: `git push origin main`. **Nunca a upstream.**

**Regrabar al final:** el paso 3 del formulario tiene ahora la sección de «apartar personas» (C1), que sale en el vídeo «Quien denuncia» de la portada.

## 6 · Las tres cosas que añadiste (pendientes, para su batch)

- **Referrer-Policy `no-referrer` en el canal y el portal** (hoy `strict-origin` en `vercel.json`): se hará con los bajos. Es cambiar una cabecera en `vercel.json`.
- **Copias de seguridad:** una denuncia suprimida sigue en las copias de Supabase unos días (7 en el plan Pro; más si hay PITR contratado). Hay que decirlo en la política de privacidad del canal (texto pendiente para el abogado) y tenerlo en cuenta en el borrado automático de M11 (la supresión no alcanza a las copias hasta que caducan). Añadido como duda en `REVISION_LEGAL.md`.
- **Cifrado a nivel de aplicación:** propuesta escrita en `docs/seguridad/PROPUESTA_CIFRADO.md` (opciones, riesgos y esfuerzo). **No implementado**; es una decisión de negocio y legal.
