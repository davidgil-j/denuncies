# Lo que tiene que hacer David · Seguridad ronda 2

Todo lo del código de esta ronda está hecho y probado en local (`npm run db:test` 494, `npm run test:logic` 49, `npm run build`, todo en verde; la e2e necesita Playwright, que va fuera del repositorio). Esto es lo que necesitas hacer tú, con tus cuentas (Supabase, Vercel) o una decisión.

> Estado: hechas C1, A1, A2 (020-022, **ya en producción desde el 22 oct**) y, nuevas, A4, A6, A7, A3, A5, los medios (M1, M3, M5, M6, M7, M8, M11) y los bajos, en las migraciones **023-029**. La web nueva funciona con la base de datos en la 022 y con cada migración nueva, así que puedes publicar la web primero y ejecutar el SQL después.

## 0 · Orden de puesta en producción (resumen)

1. **Publica la web** (los commits de la ronda; tú haces `git push origin main`).
2. **Comprueba el canal y el panel** en producción (enviar una denuncia, consultarla, escribir un mensaje; en el panel, abrir el caso, exportar, ver que no sale la hora).
3. **Ejecuta las migraciones 023 → 029 en orden** (apartado 2), cada una con su comprobación. Son aditivas y repetibles; la web ya funciona con y sin ellas.
4. **Despliega las funciones de servidor** (apartado 6): `notify`, `invite-manager`, `delete-manager`.
5. **Activa pg_cron** y pon el interruptor del retraso de avisos (2.4.1), si lo quieres.
6. **Ajustes de Supabase y Vercel** (apartado 4): Auth (B12), separar Preview (M9), Turnstile (M4), `ALLOWED_ORIGINS`, autoridades (M3), texto de la IP (M10).
7. **Después y con margen:** borra la copia `private.complaints_copia_019` (M2).

---

## 1 · Mirarlo en local (opcional)

```bash
npm run db:test     # 494 correctas, 0 fallidas (todos los bloques, hasta la 029)
npm run test:logic  # 49 correctas
npm run build       # en verde
```

Las migraciones se prueban en memoria (PGlite) una encima de otra, desde la 001 hasta la 029, así que las pruebas reproducen el estado al que llegará producción paso a paso.

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

**2.4 · `supabase/migrations/023_hora_no_delata.sql`** (A4: que la hora no delate a quien denuncia). Se puede ejecutar antes o después de publicar el navegador nuevo: la web funciona con la base de datos en la 022 y con la 023. No borra datos; redondea al **día** la hora de lo que ha enviado quien denuncia (denuncias, mensajes, adjuntos y registro) y guarda el instante real en una columna privada que el panel no puede leer. Comprobación:
```sql
select to_regprocedure('public.madrid_day_start(timestamptz)') is not null as tiene_023,
       (select email_delay from notification_settings where id) as retraso_avisos,  -- debe ser false al principio
       has_column_privilege('authenticated', 'complaints', 'received_at', 'select') as panel_ve_la_hora; -- debe ser false
```
`tiene_023 = true`, `retraso_avisos = false` y `panel_ve_la_hora = false`. Comprueba una denuncia web: en el panel, el PDF y «El meu cas» solo debe verse el día, nunca la hora.
Un aviso del disparador de Storage es normal si tu rol no puede crear disparadores en `storage.objects`: en ese caso, créalo tú con el rol adecuado (o deja el resto; los metadatos de Storage solo los puede leer Reportia, no la empresa). Para comprobarlo:
```sql
select tgname from pg_trigger where tgrelid = 'storage.objects'::regclass and tgname = 'zz_round_storage_ts';
```
Si no sale ninguna fila, ejecuta a mano, como propietario de `storage.objects`:
```sql
create trigger zz_round_storage_ts before insert on storage.objects
  for each row execute function public.round_storage_object_ts();
```

**2.4.1 · Encender el retraso de los avisos (1-3 h) — opcional, cuando quieras.** Hasta que lo enciendas, los avisos por correo salen al instante y la denuncia se ve al momento, **como hoy** (solo que ya sin la hora). El retraso añade que el aviso y la aparición en el panel se repartan 1-3 h, para que nadie cruce la hora con los registros de la empresa. Pasos, **en este orden**:
1. En Supabase, **Database › Extensions**, activa `pg_cron` y `pg_net`.
2. En **Vault** (Project Settings › Vault), guarda dos secretos:
   - `project_url` → `https://sxasgssisuisdldbcotu.supabase.co`
   - `webhook_secret` → **el mismo valor** que el secreto `WEBHOOK_SECRET` de la función `notify`.
3. Programa la tarea (SQL Editor):
   ```sql
   select cron.schedule('reparto-avisos', '* * * * *', $$select dispatch_due_notifications()$$);
   ```
   (una vez por minuto; reparte los avisos cuyo retraso ya ha pasado).
4. Enciende el interruptor:
   ```sql
   update notification_settings set email_delay = true;
   ```
   A partir de aquí, cada denuncia o mensaje nuevo se avisa y se ve con 1-3 h de retraso. Para volver atrás: `update notification_settings set email_delay = false;` y `select cron.unschedule('reparto-avisos');`.

> Si enciendes el interruptor **sin** programar pg_cron, los avisos dejarían de salir hasta que lo programes (la denuncia entra y se guarda igual, pero el correo esperaría). Por eso el orden es: pg_cron primero, interruptor después.

**2.5 · `supabase/migrations/024_registro_de_accesos.sql`** (A6: registro de accesos). Aditiva, repetible, no borra datos. Comprobación:
```sql
select to_regprocedure('public.list_access_log(integer, integer)') is not null as tiene_024;
```
Debe salir `true`. En el panel, como administrador, aparece la pestaña **«Accesos»**: comprueba que ves quién abre, exporta o descarga.
Igual que en la 023, si tu rol no puede crear el disparador en `storage.objects`, saldrá un aviso; créalo a mano:
```sql
select tgname from pg_trigger where tgrelid = 'storage.objects'::regclass and tgname = 'zz_log_storage_delete';
-- si no sale nada:
create trigger zz_log_storage_delete after delete on storage.objects
  for each row execute function public.log_storage_delete();
```

**2.6 · `supabase/migrations/025_supresion_con_control.sql`** (A7: supresión con control). Aditiva, repetible, no borra datos. Comprobación:
```sql
select to_regprocedure('public.request_suppression(uuid, text)') is not null as tiene_025;
```
Debe salir `true`. A partir de aquí, suprimir una denuncia deja de ser inmediato: se programa, hay 7 días de gracia (cualquier administrador la puede cancelar) y después se ejecuta. Los archivos solo se pueden borrar dentro de una supresión vencida. La ejecución automática tras los 7 días llegará con pg_cron (M11); de momento la lanza un administrador desde el panel.

**2.7 · `supabase/migrations/026_canal_no_se_cierra.sql`** (A3: que nadie pueda cerrar el canal). Aditiva, repetible, no borra datos. Comprobación:
```sql
select to_regprocedure('public.submit_complaint(uuid,uuid,text,text,text,boolean,text,text,text,text,date,text,text,boolean,text,uuid[],text,text)') is not null as tiene_pow,
       (select file_size_limit from storage.buckets where id = 'attachments') as limite_bytes;  -- 26214400 (25 MB)
```
`tiene_pow = true` y `limite_bytes = 26214400`. A partir de aquí: nunca se rechaza una denuncia (por encima de 50/hora entran en la bandeja «Posible spam» del tablero), enviar exige la prueba de trabajo, y los adjuntos tienen 25 MB por archivo y 500 MB por empresa y hora. Comprueba en el panel que ves la pestaña «Posible spam» cuando haya alguna.

**2.8 · `supabase/migrations/027_medios.sql`** (medios M1, M5, M6, M11). Aditiva, repetible. **Reescribe de golpe las huellas antiguas de los códigos con el secreto** (M1, usando la copia `private.complaints_copia_019`), hace que **ver la identidad sea un permiso propio** (M6: por defecto solo los administradores; los gestores necesitan que les actives «Ver identidad» en Equipo), hace que **subir un adjunto exija el id de envío** (M5) y añade la **baja de empresa** (M11, solo Reportia). Comprobación:
```sql
select to_regprocedure('public.offboard_organization(uuid)') is not null as tiene_027,
       (select count(*) from complaints c join private.complaints_copia_019 b on b.id = c.id
        where c.tracking_hash = b.tracking_hash) as huellas_planas_sin_reescribir; -- debe ser 0
```
`tiene_027 = true` y `huellas_planas_sin_reescribir = 0` (M1 ya reescribió todas). **Publica el navegador nuevo antes o a la vez que la 027**: la subida de adjuntos nueva pone el id de envío en la ruta, y la 027 lo exige.

**M2 · Borrar la copia de seguridad de la 019** (después de la 027 y con unos días de margen, cuando estés tranquilo de que todo va bien):
```sql
drop table if exists private.complaints_copia_019;
```
Comprobación: `select to_regclass('private.complaints_copia_019') is null as borrada;` → `true`.

**M8 · `deno.lock` de las funciones de servidor.** Las funciones ya fijan la versión exacta (`npm:@supabase/supabase-js@2.105.4`). Para fijar también los hashes, genera el lock y añádelo al repositorio (desde `~/Documents/GitHub/denuncies`):
```bash
deno cache --lock=supabase/functions/deno.lock --lock-write supabase/functions/*/index.ts
```
(o lo escribe la CLI de Supabase al desplegar). El `.gitignore` ya no lo excluye.

**M3 · Comprobar las direcciones de las autoridades autonómicas.** La lista cerrada está en `src/v2/config/producto.js` (`AUTORIDADES_EXTERNAS`). La Oficina Antifrau de Catalunya ya está verificada; las demás están marcadas con `verificar: true` y **no se ofrecen** en los ajustes hasta que confirmes su dirección oficial y les quites la marca. Añade las que falten de tu lista de clientes.

**M11 · Baja de una empresa (art. 28 RGPD).** Solo la ejecuta Reportia con la clave de servicio (un administrador de la empresa no puede). Desde el SQL Editor:
```sql
select offboard_organization('<id de la empresa>');
```
Borra sus denuncias (y en cascada mensajes y adjuntos), su registro, su equipo y la empresa. **Los bytes de los archivos en Storage** y **las cuentas de `auth.users`** del equipo se borran aparte (Storage: `storage.empty_bucket`/borrar la carpeta de cada caso; Auth: Dashboard › Authentication, o la API de administración). El borrado automático de las supresiones vencidas y el aviso diario de los casos que hay que suprimir irán con pg_cron (programar `dispatch_due_notifications` ya lo cubre para los avisos de retraso; para el aviso de supresión pendiente, programa un cron diario que mire `retention_due()`).

**N2 · Copias de seguridad.** Cuando se suprime una denuncia, desaparece de la base de datos, pero sigue en las **copias de seguridad** de Supabase unos días (7 en el plan Pro; más si hay PITR). Dilo en la política de privacidad del canal (texto pendiente del abogado, duda 33 de `REVISION_LEGAL.md`): la supresión «se completa» cuando caduca la última copia.

---

## 3 · M1 y M2 · Las huellas de los códigos

- **M1** (reescribir todas las huellas antiguas de golpe) **ya está en la migración 027** (paso 2.8). No hay que hacer nada más que ejecutar la 027 y comprobar que `huellas_planas_sin_reescribir = 0`.
- **M2:** una vez ejecutada la 027 y con unos días de margen, **borrar la copia**: `drop table if exists private.complaints_copia_019;` (comprobación: `select to_regclass('private.complaints_copia_019') is null as borrada;` → `true`).

---

## 4 · Ajustes de Supabase y Vercel (configuración, nada de código)

**M10 · El texto exacto sobre la IP (para el abogado, duda 25 de `REVISION_LEGAL.md`).** Hoy el producto **no afirma** «no guardamos la IP» en ninguna pantalla (no hay nada que corregir). Lo que falta es **añadir** una frase exacta y verdadera, en el canal y en la privacidad, cuando el abogado la dé por buena. Texto propuesto (ca/es/en):
- **es:** «Reportia no guarda tu dirección IP junto con la denuncia. Nuestros proveedores técnicos (Supabase, Vercel, Cloudflare) la registran durante un máximo de 7 días por seguridad, y tu empresa no tiene acceso a esos registros. Para más privacidad, usa una red que no sea la de tu empresa o el navegador Tor.»
- **ca:** «Reportia no desa la teva adreça IP amb la denúncia. Els nostres proveïdors tècnics (Supabase, Vercel, Cloudflare) la registren un màxim de 7 dies per seguretat, i la teva empresa no hi té accés. Per a més privadesa, fes servir una xarxa que no sigui la de la teva empresa o el navegador Tor.»
- **en:** «Reportia does not store your IP address with the report. Our technical providers (Supabase, Vercel, Cloudflare) log it for up to 7 days for security, and your company cannot access those logs. For more privacy, use a network other than your company’s or the Tor browser.»
Cuando el abogado lo apruebe, va en la política de privacidad del canal (y, resumido, en «Qué guardamos y qué no»).

**B12 · Ajustes de Supabase Auth a confirmar** (Dashboard › Authentication):
- **Providers › Email:** «Confirm email» = ON (la empresa se crea al confirmar; ver M4). «Secure email change» y «Secure password change» = ON.
- **Policies / Passwords:** contraseña mínima **12** y «Leaked password protection» = ON (Authentication › Policies).
- **Sessions:** «Time-box user sessions» y «Inactivity timeout» con un límite (p. ej. 8 h / 30 min); el navegador ya cierra a los 30 min de inactividad.
- **Rate limits** (Authentication › Rate Limits): límites por IP en el acceso, el registro y el reenvío de correos.
- **MFA:** TOTP activado (ya se exige en la base de datos).

**M9 · Separar las Preview de producción** (Vercel + Supabase):
- Crea un **proyecto de Supabase aparte** para las Preview (datos falsos) y pon sus `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` en Vercel solo para el entorno **Preview** (Project › Settings › Environment Variables, scope «Preview»). Así una rama sin revisar nunca toca datos reales.
- **Protege los despliegues** de Vercel (Project › Settings › Deployment Protection): «Vercel Authentication» o contraseña para Preview, para que las direcciones `*.vercel.app` no sean públicas.

**M4 · Alta de empresas con control:**
- **Encender Turnstile** (antispam) en el orden correcto: 1) crea la clave en Cloudflare Turnstile; 2) pon `VITE_TURNSTILE_SITE_KEY` en Vercel (producción) y la clave secreta en **Supabase › Auth › Attack Protection / CAPTCHA**; 3) comprueba el alta y el acceso. Si falta la clave, todo sigue como ahora (sin captcha). **Nunca en el canal.**
- **Crear la empresa al confirmar el correo:** hoy el disparador crea la empresa al insertar el usuario; mientras la confirmación de correo esté **apagada** (no hay SMTP propio aún), la empresa se crea igual al registrarse. Cuando enciendas «Confirm email» (B12) y tengas SMTP, la empresa pasará a crearse al confirmar. Hasta entonces, revisa a mano los nombres de marcas conocidas.

**pg_cron** (tarea de avisos con retraso y recordatorio de supresiones): ver el paso **2.4.1**.

**Bajos (B8, B9):**
- **B8 · `ALLOWED_ORIGINS`** de las funciones de servidor (CORS). En Supabase › Edge Functions › Secrets, pon `ALLOWED_ORIGINS` con las webs que pueden llamar a `invite-manager`, `delete-manager` y `ai-assist`, separadas por comas (p. ej. `https://reportia.es,https://app.reportia.es`). Sin ese valor, el CORS queda abierto (`*`); no es la barrera (todas comprueban sesión y segundo paso), pero conviene cerrarlo.
- **B9 · Acciones de GitHub por hash**: `actions/checkout` ya va fijada por su SHA en `.github/workflows/ci.yml`. Para `setup-node` y `upload-artifact`, saca su SHA (`gh api repos/actions/setup-node/git/ref/tags/v4.2.0 --jq .object.sha`) y cambia `@v4` por `@<sha> # v4.x.y`.

---

## 5 · Los commits

C1, A1 y A2 (020-022) **ya están en producción**. Esto es lo nuevo de esta tanda (023-029 + navegador). Agrupa un commit por bloque, en orden; varios archivos los tocan varios bloques (`src/lib/supabase.js`, `src/translations.js`, `src/translations-panel.js`, `src/lib/demoStore.js`, `src/v2/panel/Caso.jsx`, `scripts/test-rls.mjs`, `supabase/functions/notify/index.ts`): si no quieres partir un archivo, haz un único commit «ronda 2 (023-029)» con todo. `git push origin main`. **Nunca a upstream.**

1. **A4 · la hora no delata:** `supabase/migrations/023_hora_no_delata.sql`, `rollback/023_atras.sql`, `supabase/functions/notify/index.ts`, `src/v2/admin/adminKit.jsx`, `src/v2/panel/Caso.jsx`, `src/v2/lib/exportV2.js`, `src/v2/canal/Denuncia.jsx`, `src/translations.js`, `src/translations-panel.js`, `scripts/test-rls.mjs`.
2. **A6 · registro de accesos:** `024_registro_de_accesos.sql`, `rollback/024_atras.sql`, `src/lib/supabase.js`, `src/v2/panel/{Caso,Tablero,Informe,Accesos,Panel}.jsx`, `src/App.jsx`, `src/v2/panel/panel.css`, `src/translations-panel.js`, `src/lib/demoStore.js`, `e2e/red-panel.mjs`.
3. **A7 · supresión con control:** `025_supresion_con_control.sql`, `rollback/025_atras.sql`, `src/lib/supabase.js`, `src/v2/panel/{Caso,Tablero}.jsx`, `src/v2/panel/panel.css`, `src/translations.js`, `src/translations-panel.js`, `src/lib/demoStore.js`, `e2e/{ia-demo,pulido-fallos-claridad}.mjs`.
4. **A3 · que nadie cierre el canal:** `026_canal_no_se_cierra.sql`, `rollback/026_atras.sql`, `supabase/functions/notify/index.ts`, `src/lib/supabase.js`, `src/v2/panel/{Tablero,Caso}.jsx`, `src/v2/canal/Pruebas.jsx`, `src/translations.js`, `src/translations-panel.js`, `src/lib/demoStore.js`, `e2e/endurecimiento.mjs`.
5. **A5 · metadatos de los adjuntos:** `src/lib/cleanDocs.js` (nuevo), `src/lib/cleanImage.js`, `src/v2/canal/{Denuncia,Pruebas}.jsx`, `src/translations.js`, `src/v2/canal/canal.css`, `scripts/test-logica.mjs`.
6. **Medios (M1/M3/M5/M6/M7/M8/M11):** `027_medios.sql`, `rollback/027_atras.sql`, `src/v2/config/producto.js`, `src/lib/supabase.js`, `src/v2/panel/{Caso,Equipo,Ajustes}.jsx`, `src/translations.js`, `src/translations-panel.js`, `supabase/functions/{notify,invite-manager,delete-manager,ai-assist}/index.ts`, `.gitignore`, `src/lib/demoStore.js`, `e2e/ajustes-compartir-informe.mjs`.
7. **Bajos (B1/B2/B5/B6/B7/B8/B9/B11/B13/N1):** `028_bajos.sql`, `rollback/028_atras.sql`, `vercel.json`, `src/main.jsx`, `supabase/functions/{notify,invite-manager,delete-manager}/index.ts`, `.github/workflows/ci.yml`, `src/translations.js`, `src/translations-panel.js`, `src/lib/demoStore.js`, `e2e/marca.mjs`.
8. **8b · modo claro:** `029_modo_claro.sql`, `rollback/029_atras.sql`, `src/v2/canal/Canal.jsx`, `src/v2/panel/{Acceso,Panel}.jsx`, `src/lib/demoStore.js`, `CLAUDE.md`, `scripts/test-logica.mjs`, `e2e/{marca,contraste}.mjs`, `scripts/test-rls.mjs`.
9. **Documentación:** `docs/seguridad/*`, `docs/DECISIONES_TOMADAS.md`, `docs/REVISION_LEGAL.md`.

## 6 · Desplegar las funciones de servidor

Cambian `notify` (avisos con retraso y resumen de spam, compare en tiempo constante), `invite-manager` (tope global) y `delete-manager` (no borra administradores); `ai-assist` solo fija la versión (sigue sin desplegarse). Desde `~/Documents/GitHub/denuncies`, con tu sesión de la CLI de Supabase:
```bash
supabase functions deploy notify         --project-ref sxasgssisuisdldbcotu --use-api
supabase functions deploy invite-manager --project-ref sxasgssisuisdldbcotu --use-api
supabase functions deploy delete-manager --project-ref sxasgssisuisdldbcotu --use-api
```
Antes, genera `deno.lock` (M8) y añádelo al repositorio: `deno cache --lock=supabase/functions/deno.lock --lock-write supabase/functions/*/index.ts`.

## 7 · Regrabar los vídeos de la portada

El formulario (C1 «apartar personas», aviso del 112) y el panel (sin horas, pestaña «Accesos», bandeja «Posible spam», supresión con gracia, modo claro) han cambiado. Regraba los tres vídeos con la demo en marcha:
```bash
node scripts/video-demo.mjs
```
Necesita Playwright (va fuera del repositorio, ver `e2e/README.md`), `ffmpeg` y `cwebp` (los dos últimos ya los tienes). Mismo formato y peso que ahora; comprueba los subtítulos hasta el final y el póster. **No se ha hecho en esta tanda: Playwright no está instalado.**

## 8 · Comprobación final

En verde en local: `npm run build`, `npm run db:test` (494), `npm run test:logic` (49). **Pendientes de tu entorno (Playwright/Lighthouse no están instalados aquí):**
- `npm run e2e` (canal + panel; suites tocadas: `red-panel`, `ia-demo`, `pulido-fallos-claridad`, `endurecimiento`, `ajustes-compartir-informe`, `marca`, `contraste`).
- `node e2e/base-real.mjs` (Postgres + PostgREST reales, migraciones hasta la 029; necesita `brew install postgresql@16 postgrest`).
- Lighthouse móvil de las tres portadas (`inicio-es/ca/en.html`): objetivo 98+ y CLS 0.
- **Cifrado a nivel de aplicación:** propuesta escrita en `docs/seguridad/PROPUESTA_CIFRADO.md` (opciones, riesgos y esfuerzo). **No implementado**; es una decisión de negocio y legal.
