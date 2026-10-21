# Ronda 2 · Arreglos de seguridad (registro vivo)

Arreglos de los hallazgos de `docs/seguridad/AUDITORIA_RONDA1.md`. Todo en local; sin commit, sin push, sin tocar producción. Cada migración nueva es aditiva y repetible, lleva su vuelta atrás en `supabase/rollback/` y sus pruebas en `scripts/test-rls.mjs`.

**Estado al 21 de octubre de 2026:** hechas y probadas las capas de **base de datos** de C1, A1 y A2. El **frontend** de esos tres (formulario, ficha, prueba de trabajo, demo) está **pendiente**: mientras se trabajaba, otro chat grababa los vídeos de la portada con la demo y se acordó no tocar ningún archivo de `src/` hasta que terminara. El resto de bloques (A4, A6, A7, A3, A5, medios, bajos) está **sin empezar**.

Órdenes de prueba: `npm run db:test` (369 correctas, 0 fallidas), `npm run test:logic` (42 correctas). `npm run e2e` queda pendiente de cablear el frontend (y de que la demo esté libre; se usará `E2E_OUT` en otra carpeta para no pisar `dist/`).

---

## Estado por hallazgo

| n.º | Gravedad | Base de datos | Frontend | Prueba |
|---|---|---|---|---|
| C1 | Crítica | ✅ hecho (020) | ⏳ pendiente | `db:test` bloque «Exclusión por caso (020)» |
| A1 | Alta | ✅ hecho (021) | ⏳ pendiente | `db:test` bloque «Freno por empresa y prueba de trabajo (021)» |
| A2 | Alta | ✅ hecho (021) | ⏳ pendiente | idem |
| A4 | Alta | ⏳ sin empezar | ⏳ | — |
| A6 | Alta | ⏳ sin empezar | ⏳ | — |
| A7 | Alta | ⏳ sin empezar | ⏳ | — |
| A3 | Alta | ⏳ sin empezar | ⏳ | — |
| A5 | Alta | — | ⏳ sin empezar | — |
| M1 | Media | ⏳ sin empezar | — | — |
| M2 | Media | guía (borrar la copia) | — | — |
| M3, M5, M6, M7, M8, M11 | Media | ⏳ sin empezar | ⏳ | — |
| M4, M9, M10, B12 | Media | guía para David | — | — |
| B1-B11 (bajos S) | Baja | ⏳ sin empezar | ⏳ | — |

---

## C1 · Exclusión por caso

**Migración:** `supabase/migrations/020_exclusion_por_caso.sql` · **vuelta atrás:** `rollback/020_atras.sql`.

**Qué se hizo (base de datos):**
- Tabla `complaint_exclusions` (caso, persona, quién la apartó: `reporter` o `manager`). Sin acceso directo desde el navegador.
- Las políticas de `complaints` (ver y editar) añaden «y no estoy apartado» (`is_excluded(id)`). `messages`, `attachments`, `audit_logs` y `storage` lo heredan: sus políticas preguntan «¿existe la denuncia para mí?».
- Las funciones del panel que se saltan la RLS comprueban la exclusión: `get_reporter_identity`, `extend_response_deadline`, `mark_meeting_held`, `mark_fiscal_referral`, `anonymize_complaint`.
- `get_channel_managers(org)`: el canal ve quién gestiona, para poder apartar (⚖️ expone los nombres del equipo).
- `submit_complaint` nuevo (con la lista de personas apartadas). La versión de 14 parámetros sigue valiendo.
- Panel: `list_complaint_access`, `exclude_from_complaint`, `include_in_complaint`, `complaint_access_count`. Un administrador aparta a más gente (sin dejar el caso sin nadie) y devuelve el acceso, pero nunca a quien apartó quien denunció.

**Pruebas:** bloque «Exclusión por caso (020)» de `scripts/test-rls.mjs` (sobre `newDb(20)` = producción con la 019 + la 020): quien está apartado no ve el caso ni mensajes ni adjuntos ni registro, no consulta la identidad, no amplía, no suprime, no cambia el estado; apartar/devolver funciona; no se devuelve el acceso a quien apartó quien denunció; no se deja un caso sin nadie; apartar a todos no rechaza la denuncia; la vuelta atrás deja la tabla y quita las funciones.

**Pendiente (frontend, cuando la demo esté libre):**
- `src/lib/supabase.js`: `saveComplaint` manda la lista de apartados; `getChannelManagers`, `listComplaintAccess`, `excludeFromComplaint`, `includeInComplaint`.
- `src/v2/canal/Denuncia.jsx` (paso 3) + `src/v2/canal/shared.jsx` (`EMPTY_DRAFT.excluded = []`): sección opcional «¿Alguien del equipo no debería ver tu caso?», con aviso si se aparta a todos (y enlace a la AIPI).
- `src/v2/panel/Caso.jsx`: quién gestiona el caso y quién está apartado; apartar/devolver (solo administrador).
- `src/lib/demoStore.js`: lo mismo en la demo.
- Textos en `src/translations.js` (ca/es/en). **No** en `translations-site.js`.

**Abierto / decisiones:** el «Responsable del Sistema» se guarda como texto (nombre y cargo), no como un usuario; aquí «Responsable» = administrador. ⚖️ Nueva duda para el abogado en `REVISION_LEGAL.md` (exponer los nombres del equipo en el canal).

---

## A1 y A2 · Código de seguimiento: freno por empresa y prueba de trabajo

**Migración:** `supabase/migrations/021_codigo_freno_por_empresa.sql` · **vuelta atrás:** `rollback/021_atras.sql`.

**Qué se hizo (base de datos):**
- **No se revela si un código existe:** `submit_complaint` nuevo (16 parámetros) con idempotencia por **id de envío** (lo pone el navegador), no por el código. Si el código ya existe, error genérico `submit-failed` que cuenta como intento. Columna `complaints.submission_id` con índice único.
- **Cerrada la inserción directa** de denuncias (`revoke insert on complaints from anon, authenticated`): la única vía es `submit_complaint` o `register_complaint` (ambas «security definer»).
- **Freno por empresa:** tabla `code_attempts_by_org` (recuento por minuto y empresa, más un cubo global solo para subir la dificultad; nunca una IP).
- **Prueba de trabajo:** tabla `pow_challenges`, `issue_pow_challenge(org)` (da reto + bits) y `verify_pow(token, nonce, org)` (comprueba los ceros por delante, un solo uso, caduca en 5 min). La dificultad (`pow_bits_required`) parte de 12 bits y sube con los fallos de la empresa y, más despacio, con los globales (tope 22). **Nunca bloquea.**
- **Portal endurecido y por empresa:** `consult_complaint`, `messages_by_code`, `send_message_by_code`, `request_meeting_in_org` exigen la prueba de trabajo y buscan solo en la empresa del canal (`find_complaint_in_org`); un código que no existe cuenta como intento y devuelve vacío.
- Las funciones de antes se quedan (la web actual sigue funcionando con el freno global de la 014 hasta que se cablee el camino nuevo).

**Pruebas:** bloque «Freno por empresa y prueba de trabajo (021)» (sobre `newDb(21)`): el id de envío repetido devuelve la misma denuncia sin mirar el código; sin id de envío no se envía; un código que ya existe da error genérico (no «ya existe») y cuenta como intento; no se puede insertar directamente; consultar sin prueba se rechaza; con la prueba resuelta el código bueno se consulta; un reto no se reutiliza; muchos fallos en una empresa suben su dificultad pero **no** la de otra; nunca se bloquea; el registro desde el panel sigue funcionando; las exclusiones (C1) valen por la vía nueva; la vuelta atrás reabre la inserción directa y quita las funciones.

**Pendiente (frontend, cuando la demo esté libre):**
- `src/lib/supabase.js`: `getComplaintByCode`, `getReporterMessages`, `sendReporterMessage`, `requestMeetingByCode` piden primero `issue_pow_challenge(org)`, resuelven el reto en un **Web Worker** y llaman a las funciones nuevas con `(org, código, token, nonce)`. `saveComplaint` genera un **id de envío** y usa el `submit_complaint` nuevo. Fallback a las funciones de antes si la 021 no está.
- Un worker nuevo (p. ej. `src/v2/canal/pow-worker.js`) que resuelve la prueba de trabajo (sha-256 en bucle). Encaja en el CSP (`worker-src 'self' blob:`).
- `generateTrackingCode`: **16 caracteres** (`XXXX-XXXX-XXXX-XXXX`). Los de 8 siguen valiendo (se buscan igual).
- `src/v2/canal/Consulta.jsx` y `Enviada.jsx`: pasar la empresa; enseñar «comprobando…» mientras se resuelve la prueba.
- `src/lib/demoStore.js`: simular la prueba de trabajo (siempre válida) y el id de envío.
- Textos del canal en `src/translations.js`.

**Abierto:** la prueba de trabajo solo encarece; la defensa de verdad es el código de 16 caracteres. El tope de 22 bits (unos pocos segundos en un móvil normal) se puede ajustar.
