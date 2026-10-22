# Ronda 2 · Arreglos de seguridad (registro vivo)

Arreglos de los hallazgos de `docs/seguridad/AUDITORIA_RONDA1.md`. Todo en local; sin commit, sin push, sin tocar producción. Cada migración nueva es aditiva y repetible, lleva su vuelta atrás en `supabase/rollback/` y sus pruebas en `scripts/test-rls.mjs`.

**Estado al 21 de octubre de 2026:** **C1, A1 y A2 están hechos de punta a punta** (base de datos + navegador + demo) y con las pruebas en verde. El resto de bloques (A4, A6, A7, A3, A5, medios, bajos) está **sin empezar**.

Órdenes de prueba: `npm run db:test` (381 correctas, 0 fallidas), `npm run test:logic` (42 correctas) y `npm run e2e` (suites del canal y el panel en verde: `seguridad-ronda2` —nueva, cubre C1 y los códigos de 16—, `canal`, `recorrido`, `endurecimiento`, `red-*`). La e2e se lanzó con `E2E_OUT` en otra carpeta para no tocar `dist/`.

**Pendiente de regrabar (cuando se cierre todo):** el formulario de denuncia (paso 3) ahora tiene la sección «¿Hay alguien del panel que no debería ver tu caso?» (C1). Sale en el vídeo «Quien denuncia» de la portada; hay que regrabarlo al final.

---

## Estado por hallazgo

| n.º | Gravedad | Base de datos | Frontend | Prueba |
|---|---|---|---|---|
| C1 | Crítica | ✅ hecho (020) | ✅ hecho | `db:test` «Exclusión por caso (020)» + e2e `seguridad-ronda2` |
| A1 | Alta | ✅ hecho (021 + 022) | ✅ hecho | `db:test` «(021)» y «(022)» + e2e (códigos de 16) |
| A2 | Alta | ✅ hecho (021 + 022) | ✅ hecho | idem |
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

### Añadidos por David (21 oct, para su batch)
| n.º | Qué | Dónde |
|---|---|---|
| N1 | `Referrer-Policy: no-referrer` en el canal y el portal (hoy `strict-origin` en `vercel.json`) | `vercel.json` (batch de bajos) |
| N2 | Una denuncia suprimida sigue unos días en las copias de Supabase: documentarlo (guía + textos del abogado) y tenerlo en cuenta en el borrado de M11 | guía + `REVISION_LEGAL.md` + M11 |
| N3 | Cifrado a nivel de aplicación (texto y adjuntos, clave por empresa): **solo propuesta**, no implementar | `docs/seguridad/PROPUESTA_CIFRADO.md` (escrita) |

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

**Hecho (navegador):**
- `src/lib/supabase.js`: `saveComplaint` manda la lista de apartados; `getChannelManagers`, `listComplaintAccess`, `excludeFromComplaint`, `includeInComplaint`.
- `src/v2/canal/Denuncia.jsx` (paso 3) + `src/v2/canal/shared.jsx` (`EMPTY_DRAFT.excluded = []`): sección «¿Hay alguien del panel que no debería ver tu caso?», con casillas por persona y aviso si se aparta a todo el equipo.
- `src/v2/panel/Caso.jsx`: sección «Quién gestiona este caso» con quién está apartado (y por quién); el administrador aparta/devuelve, nunca a quien apartó quien denunció.
- `src/lib/demoStore.js`: lo mismo en la demo (un caso que aparta a la administradora no le aparece).
- Textos en `src/translations.js` (ca/es/en) y etiquetas del historial (`access_excluded`, `access_restored`). **No** se tocó `translations-site.js`.

**Abierto / decisiones:** el «Responsable del Sistema» se guarda como texto (nombre y cargo), no como un usuario; aquí «Responsable» = administrador. ⚖️ Dudas 30-32 para el abogado en `REVISION_LEGAL.md` (exponer los nombres del equipo en el canal; apartar a todo el equipo; Responsable como usuario).

---

## A1 y A2 · Código de seguimiento: freno por empresa y prueba de trabajo

**Migraciones:** `021_codigo_freno_por_empresa.sql` (camino nuevo) y `022_cerrar_funciones_antiguas.sql` (cierra las de antes) · **vueltas atrás:** `rollback/021_atras.sql`, `rollback/022_atras.sql`.

> **A1 y A2 NO cuentan como cerrados hasta que la 022 esté ejecutada en producción.** La 021 deja vivas las funciones de antes para no romper la web mientras se cablea el navegador; mientras existan, A1 y A2 siguen explotables por esa vía. La 022 las cierra. Orden obligatorio en `QUE_TIENE_QUE_HACER_DAVID.md`: 020+021 → publicar navegador → comprobar el canal → 022.

**Qué se hizo (base de datos):**
- **No se revela si un código existe:** `submit_complaint` nuevo (16 parámetros) con idempotencia por **id de envío** (lo pone el navegador), no por el código. Si el código ya existe, error genérico `submit-failed` que cuenta como intento. Columna `complaints.submission_id` con índice único.
- **Cerrada la inserción directa** de denuncias (`revoke insert on complaints from anon, authenticated`): la única vía es `submit_complaint` o `register_complaint` (ambas «security definer»).
- **Freno por empresa:** tabla `code_attempts_by_org` (recuento por minuto y empresa, más un cubo global solo para subir la dificultad; nunca una IP).
- **Prueba de trabajo:** tabla `pow_challenges`, `issue_pow_challenge(org)` (da reto + bits) y `verify_pow(token, nonce, org)` (comprueba los ceros por delante, un solo uso, caduca en 5 min). La dificultad (`pow_bits_required`) parte de 12 bits y sube con los fallos de la empresa y, más despacio, con los globales (tope 22). **Nunca bloquea.**
- **Portal endurecido y por empresa:** `consult_complaint`, `messages_by_code`, `send_message_by_code`, `request_meeting_in_org` exigen la prueba de trabajo y buscan solo en la empresa del canal (`find_complaint_in_org`); un código que no existe cuenta como intento y devuelve vacío.
- **Cerrar las de antes (022):** `get_complaint_by_tracking_code`, `get_messages_by_tracking_code`, `send_reporter_message`, `request_meeting_by_code` y los `submit_complaint` de 14 y 15 parámetros dejan de poder ejecutarse (anon y authenticated). Solo queda el camino endurecido. Se ejecuta la última, tras publicar el navegador nuevo.
- **Retos acotados:** `issue_pow_challenge` borra los caducados (5 min) y deja como mucho 50 retos vivos por empresa, así anon no puede llenar la tabla pidiéndolos sin parar.

**Pruebas:** bloque «Freno por empresa y prueba de trabajo (021)» (sobre `newDb(21)`): el id de envío repetido devuelve la misma denuncia sin mirar el código; sin id de envío no se envía; un código que ya existe da error genérico (no «ya existe») y cuenta como intento; no se puede insertar directamente; consultar sin prueba se rechaza; con la prueba resuelta el código bueno se consulta; un reto no se reutiliza; muchos fallos en una empresa suben su dificultad pero **no** la de otra; nunca se bloquea; el registro desde el panel sigue funcionando; las exclusiones (C1) valen por la vía nueva; la vuelta atrás reabre la inserción directa y quita las funciones.

**Hecho (navegador):**
- `src/lib/supabase.js`: `getComplaintByCode`, `getReporterMessages`, `sendReporterMessage`, `requestMeetingByCode` reciben la empresa, piden `issue_pow_challenge(org)`, resuelven el reto en un **Web Worker** y llaman a las funciones nuevas con `(org, código, token, nonce)`. `saveComplaint` genera un **id de envío** y usa el `submit_complaint` nuevo con las personas apartadas. Si no se puede obtener un reto (sin la 021), caen al camino de antes.
- `src/lib/pow.js` (la cuenta, sha-256 con `crypto.subtle`) y `src/v2/canal/powWorker.js` (el worker). Encaja en el CSP (`worker-src 'self' blob:`); si no hay worker, se resuelve en el hilo principal.
- `generateTrackingCode`: **16 caracteres** (`XXXX-XXXX-XXXX-XXXX`). Los de 8 siguen valiendo (se buscan igual). `Consulta.jsx`: `formatCode` acepta 8 y 16 y pasa la empresa.
- `src/lib/demoStore.js`: la demo no exige prueba de trabajo (va directa) y `byCode` acepta códigos de 16 (tres guiones).
- Textos del canal en `src/translations.js`.

**Tiempos de la prueba de trabajo** (medidos en un móvil lento simulado, CPU x6 en Chromium, con el sha-256 del navegador; `scratchpad/pow-bench.mjs`):

| bits | tiempo (CPU x6) |
|---|---|
| 12 (por defecto) | ~0,1 s |
| 16 | ~0,4 s |
| 18 (tope) | ~1-2 s |
| 20 | ~10 s |
| 22 | ~24 s |

Por eso el tope se fijó en **18 bits**: a partir de 20 ya son más de 10 segundos, que para quien denuncia equivale a un bloqueo. 18 bits cuesta ~1-2 s en el peor caso (bajo ataque sostenido); en reposo son 12 bits (~0,1 s).

**Abierto:** la prueba de trabajo solo encarece; la defensa de verdad es el código de 16 caracteres (80 bits). En la demo la prueba de trabajo no se ejecuta (la cubre `db:test`). Si el navegador no puede resolverla (sin Web Worker ni sha-256), el canal lo dice con un error claro y un botón para reintentar (no cae nunca al camino de antes); si solo falta el Worker, se resuelve en el hilo principal (comprobado en `base-real`).
