# Ronda 2 · Arreglos de seguridad (registro vivo)

Arreglos de los hallazgos de `docs/seguridad/AUDITORIA_RONDA1.md`. Todo en local; sin commit, sin push, sin tocar producción. Cada migración nueva es aditiva y repetible, lleva su vuelta atrás en `supabase/rollback/` y sus pruebas en `scripts/test-rls.mjs`.

**Estado al 28 de octubre de 2026:** **C1, A1, A2, A4, A6, A7, A3, A5, los medios (M1, M3, M5, M6, M7, M8, M11), los bajos (B1, B2, B5, B6, B9, B11, B13, N1, y B7/B8 parciales) y 8b (modo claro por defecto) están hechos** (base de datos + navegador + demo) y con las pruebas de base de datos y lógica en verde. Quedan: config/textos (M2, M4, M9, M10, B12, N2 — guía) y B3/B4 (propuesta escrita), ambos ya escritos; y **los vídeos (bloque 9) y la comprobación final (bloque 10)**, que necesitan Playwright y Lighthouse, **no instalados** en estas tandas.

Órdenes de prueba: `npm run db:test` (522 correctas, 0 fallidas; migraciones 023-031), `npm run test:logic` (49 correctas; incluye la limpieza de PDF/Office de A5 y el modo claro de 8b) y `npm run e2e`.

> **La e2e necesita Playwright, que vive fuera del repositorio** (ver `e2e/README.md`) y **no está instalado**: en estas tandas no se ha podido ejecutar. Lo que se ha tocado por lectura, pendiente de correr cuando se instale: `red-panel.mjs` (el menú del administrador ahora lleva «Accesos»); `ia-demo.mjs` y `pulido-fallos-claridad.mjs` (la supresión ahora tiene 7 días de gracia: las pruebas pasan el caso a «resuelto», programan la supresión, adelantan el plazo por `sessionStorage` y la ejecutan); `endurecimiento.mjs` (el envío prueba primero el `submit_complaint` de 18 parámetros con prueba de trabajo y luego el de 16, así que el caso «sin la 014» usa `['missing','missing']`). Ninguna otra prueba depende de la hora que se ha quitado (`propuestas.mjs` sigue buscando «Recibida el»). La e2e se lanza con `E2E_OUT` en otra carpeta para no tocar `dist/`.

## Comprobación final (29 oct 2026)

Con Playwright (`~/.reportia-e2e`), Postgres 16 y PostgREST reales y Lighthouse, contra la web de la ronda 2 completa. Resultado y arreglos:

- **Fallo grave de la 028, ya en producción → migración 031.** `base-real` ahora recorre la web entera contra Postgres de verdad (enviar con adjunto, «Mi caso», mensaje, reunión, panel, descarga, PDF y Excel, «Accesos», supresión, alta de empresa) y encontró que la 028 (B13) cambió `is_client_request()` a mirar el rol de la petición: las protecciones de las denuncias frenaron también a las funciones de confianza. «Suprimir ahora» fallaba siempre, quien denuncia no podía pedir reunión y un caso registrado a mano se guardaba como «web» y con la fecha de ahora. La 031 devuelve la función a `current_user` (dejando `api_role_is_client()` para los topes) y repara el canal de los casos ya mal guardados; con sus pruebas en `db:test` (que reproducen el fallo con la 028 antes de arreglarlo) y su vuelta atrás. La fecha de esos casos no se recupera sola: consulta en la guía (2.12).
- **Supresión (A7):** `executeSuppression` y la supresión de antes ya no anonimizan si falla el borrado de los archivos del almacén (`removeCaseFiles`: borra, vuelve a mirar y, si queda algo o hay un error, devuelve `files-not-deleted` con un aviso claro y NO llama a `execute_suppression`). Probado en `base-real` con un almacén que da error y con uno que no da error pero tampoco borra.
- **Alta de empresa con la 028 (B1):** comprobado en `base-real` el recorrido completo (alta → el panel lleva a activar el segundo paso → se activa → tablero, Equipo y ajustes y Compartir cargan enteros) y el de quien aún no lo ha activado (entra sin pedir código, solo ve activar el segundo paso, y con su sesión de solo contraseña la base de datos no devuelve la empresa, el equipo ni las denuncias, pero sí su propio perfil).
- **Migración 030** (cierra el `submit_complaint` de 16 parámetros para anon y authenticated): comprobado que la web publicada envía por el de 18 (la prueba de trabajo se gasta en cada envío); la web dice «comprobación de seguridad» si el navegador no puede resolverla. Con su vuelta atrás y sus pruebas.
- **Cabida del diseño:** la barra inferior del panel a 320 px con las cinco pestañas del administrador (con «Accesos»), la tabla de permisos en móvil con la quinta columna («Ver identidad») y el paso 1 del canal en portátiles bajos con el aviso del 112 (`ds.css`, `panel.css`, `canal.css`; solo espacios y un punto menos de letra en 320 px).
- **Pruebas puestas al día con la ronda 2** (no eran fallos del producto): los RPC nuevos en las redes simuladas (`list_pending_suppressions`, `suppression_for`, `log_case_access`, `list_access_log`), la lista cerrada de autoridades, el motivo al ver la identidad (M6), la frase de «datos ocultos» de A5, la consulta de «posible spam» y la barra de cinco pestañas.

**Pendiente de regrabar (cuando se cierre todo):** el formulario de denuncia (paso 3) ahora tiene la sección «¿Hay alguien del panel que no debería ver tu caso?» (C1). Sale en el vídeo «Quien denuncia» de la portada; hay que regrabarlo al final.

---

## Estado por hallazgo

| n.º | Gravedad | Base de datos | Frontend | Prueba |
|---|---|---|---|---|
| C1 | Crítica | ✅ hecho (020) | ✅ hecho | `db:test` «Exclusión por caso (020)» + e2e `seguridad-ronda2` |
| A1 | Alta | ✅ hecho (021 + 022) | ✅ hecho | `db:test` «(021)» y «(022)» + e2e (códigos de 16) |
| A2 | Alta | ✅ hecho (021 + 022) | ✅ hecho | idem |
| A4 | Alta | ✅ hecho (023) | ✅ hecho | `db:test` «La hora no delata a quien denuncia (023)» |
| A6 | Alta | ✅ hecho (024) | ✅ hecho | `db:test` «Registro de accesos (024)» |
| A7 | Alta | ✅ hecho (025) | ✅ hecho | `db:test` «Supresión con control (025)» |
| A3 | Alta | ✅ hecho (026) | ✅ hecho | `db:test` «Que nadie pueda cerrar el canal (026)» |
| A5 | Alta | — | ✅ hecho | `test:logic` «un PDF/docx anónimo sale sin autor» |
| M1 | Media | ✅ hecho (027) | — | `db:test` «M1» |
| M2 | Media | guía (borrar la copia, lista) | — | — |
| M3 | Media | config `AUTORIDADES_EXTERNAS` | ✅ Ajustes (lista cerrada) | — |
| M5 | Media | ✅ hecho (027) | ✅ hecho | `db:test` «M5» |
| M6 | Media | ✅ hecho (027) | ✅ hecho | `db:test` «M6» |
| M7 | Media | — | ✅ hecho (descarga forzada + bytes) | — |
| M8 | Media | funciones fijadas + `deno.lock` (guía) | — | — |
| M11 | Media | ✅ baja de empresa (027) | — | `db:test` «M11» |
| M4, M9, M10, B12, N2 | Media | guía para David | — | — |
| B1, B2, B13 | Baja | ✅ hecho (028) | — | `db:test` «Bajos (028)» |
| B5, B6, B11, N1 | Baja | — | ✅ hecho | — |
| B7, B8, B9 | Baja | parcial (ver abajo) | ✅ parcial | — |
| B10 | Baja | — | sin fix seguro (ver abajo) | — |
| B3, B4 | Baja | propuesta escrita | — | — |

### Añadidos por David (21 oct, para su batch)
| n.º | Qué | Dónde |
|---|---|---|
| N1 | `Referrer-Policy: no-referrer` en el canal y el portal (hoy `strict-origin` en `vercel.json`) | `vercel.json` (batch de bajos) |
| N2 | Una denuncia suprimida sigue unos días en las copias de Supabase: documentarlo (guía + textos del abogado) y tenerlo en cuenta en el borrado de M11 | guía + `REVISION_LEGAL.md` + M11 |
| N3 | Cifrado a nivel de aplicación (texto y adjuntos, clave por empresa): **solo propuesta**, no implementar | `docs/seguridad/PROPUESTA_CIFRADO.md` (escrita) |
| 8b | ✅ **hecho (029)**: modo claro por defecto (canal y acceso siempre en claro; panel por defecto «Claro») | migración 029, `Canal.jsx`, `Acceso.jsx`, `Panel.jsx`, demo, CLAUDE.md, e2e `marca`/`contraste` |

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

---

## A4 · La hora no delata a quien denuncia

**Migración:** `supabase/migrations/023_hora_no_delata.sql` · **vuelta atrás:** `rollback/023_atras.sql`.

**Qué se hizo (base de datos):**
- **Solo el día, nunca la hora**, para lo que llega de quien denuncia. `created_at`/`updated_at` de las denuncias web, `created_at` de los mensajes de quien denuncia, de los adjuntos y de las acciones de quien denuncia en el registro (`created`, `reporter_message`, `meeting_requested`) se redondean al **día de Madrid** (`madrid_day_start`). Se hace con disparadores `before insert` (nombres `zz_…`, corren después de `force_server_fields`) y con un relleno de lo que ya había (desactivando los disparadores para que no salte `set_updated_at`). Los plazos legales usan solo el día, así que no cambian.
- **La hora no se puede sacar por la API.** El instante real del envío se guarda en la columna privada `complaints.received_at`, que el panel **no puede leer** (la 011 da permiso por columnas y `received_at`/`notify_after` quedan fuera; comprobado con `has_column_privilege`). Lo de quien denuncia que sí se lee (`created_at`, `updated_at`) ya va redondeado al día.
- **Metadatos en Storage:** disparador en `storage.objects` que redondea al día `created_at`/`updated_at` de los objetos del bucket `attachments`. Va en un bloque protegido: si el rol de la migración no puede crearlo, avisa (RAISE NOTICE) y el resto se aplica igual (comprobar en la guía).
- **Avisos con retraso de 1-3 h.** Tabla privada `notification_queue` (cola de avisos), con `send_after` (cuándo toca) y `sent_at` (idempotencia). En cada denuncia/mensaje de quien denuncia, un disparador encola el aviso. La función `notify` mira la cola: si ya se envió, no reenvía; si aún no toca, lo deja para la tarea; si no hay cola (base de datos en la 022), envía al momento (nunca calla un aviso). El reparto con retraso lo hace `dispatch_due_notifications()` (preparada para pg_cron + pg_net, lee de Vault el destino y el secreto). **Interruptor** `notification_settings.email_delay` (apagado por defecto): mientras esté apagado, `send_after = ahora` y todo sale al instante, como hoy.
- **La denuncia aparece en el panel con el mismo retraso que su aviso.** La política de lectura `org_select_complaints` añade `coalesce(notify_after, created_at) <= now()`. Apagado el interruptor, `notify_after = received_at` (pasado) → se ve al momento. Encendido, `notify_after = received_at + 1-3 h` → se ve a la vez que llega el aviso. Los mensajes se ven al momento (sin filtro), pero sin hora.
- **Lo del equipo mantiene la hora y no se retrasa:** un caso registrado a mano (`channel <> 'web'`) no redondea su hora ni retrasa el aviso; los mensajes del equipo mantienen la hora; las notas internas, también.
- **Dos frenos que miraban `created_at` ahora miran el instante real** para no romperse con el redondeo: el tope de 50 denuncias/hora (`complaints_web_rate_limit`) y la ventana de 2 h para subir adjuntos (`complaint_is_recent`) usan `coalesce(received_at, created_at)`.

**Pruebas:** bloque «La hora no delata a quien denuncia (023)» de `scripts/test-rls.mjs` (sobre `newDb(22)` + la 023): el relleno deja la hora a las 00:00 (Madrid) y guarda el instante real en `received_at`; el panel no puede leer `received_at` ni `notify_after`; una denuncia web nueva va al día y guarda la hora real aparte; con el interruptor apagado se ve al momento, con él encendido `notify_after` queda 1-3 h en el futuro y el panel no la ve hasta que pasa; el mensaje de quien denuncia va al día y encola aviso, el del equipo mantiene la hora y no encola; el adjunto va al día; la ventana de 2 h de subida sigue valiendo; el objeto de Storage va al día; el interruptor nace apagado; la vuelta atrás quita el filtro de la hora.

**Hecho (navegador):**
- `src/v2/admin/adminKit.jsx`: `auditWhen(log, lang)` (día para lo de quien denuncia, hora para lo del equipo) e `isReporterAction`.
- `src/v2/panel/Caso.jsx`: la línea «Recibida el …» sin hora; los mensajes del hilo, sin hora (`fShort`); el registro con `auditWhen`. Se quitó el `LOCALE` que solo servía para la hora.
- `src/translations-panel.js`: `receivedOn` sin `{time}` (ca/es/en).
- `src/v2/lib/exportV2.js` (PDF): recepción y «actualizada», solo día; los mensajes, solo día; el registro con `fAuditWhen` (día para lo de quien denuncia). El Excel ya se quedaba en el día.
- `src/v2/canal/Denuncia.jsx` + `src/translations.js`: aviso del 112 al empezar la denuncia (paso 1), en los tres idiomas (`emergency112`), con `.flow-note`.
- Demo: no hace falta tocarla (la pantalla ya enseña solo el día; la demo no manda correos).

**Edge function:** `supabase/functions/notify/index.ts` reescrita para usar la cola (idempotente, respeta `send_after`) y, si no hay cola (022), enviar al momento como hoy.

**Abierto / decisiones:** el retraso de los avisos necesita que David encienda pg_cron + pg_net, programe `dispatch_due_notifications()` y ponga el interruptor en true (guía). Mientras no lo haga, los avisos salen al instante y el caso se ve al momento (como hoy), pero la hora ya no se enseña ni se puede leer por la API. La vuelta atrás no deshace el redondeo ya aplicado (el instante real de las denuncias sigue en `received_at`; el de mensajes/adjuntos/registro no se guardó aparte).

---

## A6 · Registro de accesos

**Migración:** `supabase/migrations/024_registro_de_accesos.sql` · **vuelta atrás:** `rollback/024_atras.sql`.

**Qué se hizo (base de datos):**
- **Anota por la base de datos** (no solo desde la pantalla), con el autor y la hora (son acciones del equipo): `log_case_access(caso, tipo, detalle)` para abrir un caso (`case_opened`), exportar su PDF (`exported_case`) y descargar un archivo (`file_downloaded`); `log_org_export(tipo)` para el Excel de la lista (`exported_excel`) y el informe (`exported_report`, sin caso concreto → solo lo ve el administrador). `log_case_access` comprueba a mano que quien llama puede ver el caso (empresa, categoría, no apartado por C1, dos pasos).
- **Ver la identidad** ya se anotaba (`identity_viewed`). **Borrar un archivo** del almacén se anota con un disparador `after delete` en `storage.objects` (`file_deleted`, en bloque protegido como el de la 023). **Suprimir** el caso ya deja `anonymized`.
- **Pantalla «Accesos»:** `list_access_log(limit, offset)` devuelve el registro de accesos de la empresa para el **administrador** (`is_superadmin` + dos pasos), ordenado por fecha, y **respeta la exclusión por caso (C1)**: no enseña los accesos de un caso del que el administrador está apartado (`not is_excluded`).

**Pruebas:** bloque «Registro de accesos (024)» de `scripts/test-rls.mjs` (sobre `newDb(24)`): abrir/exportar/descargar quedan anotados con el autor; un administrador de otra empresa no puede anotar un acceso a un caso ajeno; un tipo inventado se rechaza; el Excel se anota a nivel de empresa (sin caso); borrar un archivo del almacén se anota (disparador); el administrador ve el registro y un gestor no; apartado de un caso (C1) no ve sus accesos pero sí lo de empresa; la vuelta atrás quita la función.

**Hecho (navegador):**
- `src/lib/supabase.js`: `logCaseAccess`, `logOrgExport` (mejor esfuerzo: si la base de datos aún no lo tiene, el panel sigue igual) y `listAccessLog`.
- `src/v2/panel/Caso.jsx`: anota `case_opened` al abrir (una vez por caso), `exported_case` al exportar el PDF, `file_downloaded` al descargar.
- `src/v2/panel/Tablero.jsx` e `src/v2/panel/Informe.jsx`: anotan `exported_excel`/`exported_report` al exportar.
- **Pantalla nueva** `src/v2/panel/Accesos.jsx` (ruta `/admin/access`, solo administradores), enlace en la barra del panel (`Panel.jsx`), estilos en `panel.css`, textos en `translations-panel.js` (ca/es/en, `nav.access` y `access.*`).
- Demo: `logCaseAccess`, `logOrgExport`, `listAccessLog` en `demoStore.js` (la pantalla se va llenando según navegas).

**Nota e2e:** el menú del administrador tiene una pieza más («Accesos»); se actualizó la prueba `e2e/red-panel.mjs` (menú completo).

---

## A7 · Supresión con control

**Migración:** `supabase/migrations/025_supresion_con_control.sql` · **vuelta atrás:** `rollback/025_atras.sql`.

**Qué se hizo (base de datos):**
- **Solo cuando la ley lo permite** (`suppression_allowed`): el caso terminado (resuelto/cerrado/archivado) o el que toca por conservación (3 meses sin investigar, o 10 años). **Nunca con la investigación abierta** (art. 32.3 y 32.4).
- **Motivo de al menos 30 caracteres.**
- **Periodo de gracia de 7 días.** `request_suppression(caso, motivo)` programa la supresión (tabla `suppressions`, una pendiente por caso) y lo anota (`suppression_requested`). Cualquier administrador que pueda suprimir la ve (`list_pending_suppressions`, respeta C1) y la cancela (`cancel_suppression`). Pasados los 7 días, `execute_suppression` borra contenido, mensajes y archivos y anonimiza (vuelve a comprobar que la ley sigue permitiéndolo, por si el caso volvió a investigación durante la gracia). La ejecución la puede lanzar un administrador desde el panel o, con pg_cron, una función de servidor (M11).
- **Los archivos no se borran uno a uno:** la política de borrado de `storage.objects` ahora exige, además del permiso de «eliminar», que haya una **supresión ya vencida** para ese caso (`has_due_suppression`). Fuera de una supresión, nadie borra archivos sueltos.
- **Quien está apartado de un caso (C1) no lo puede suprimir ni cancelar** (guardas `is_excluded` en todas las funciones; comprobado).

**Pruebas:** bloque «Supresión con control (025)» de `scripts/test-rls.mjs` (sobre `newDb(25)`): un caso recién recibido no se puede suprimir; motivo < 30 se rechaza; se programa en un caso terminado (pendiente a 7 días, queda en el registro); no se programa dos veces; antes de la gracia no se ejecuta; se cancela y se vuelve a programar; sin supresión vencida no se borra un archivo uno a uno, con ella sí; se ejecuta la supresión vencida (anonimiza, deja la supresión «hecha»); si vuelve a investigación durante la gracia no se ejecuta; el administrador ve el aviso y respeta C1; la vuelta atrás quita la supresión con gracia y reabre el borrado de archivos.

**Hecho (navegador):**
- `src/lib/supabase.js`: `requestSuppression` (devuelve `missing` si falta la 025 → se cae a la supresión de antes), `cancelSuppression`, `executeSuppression` (borra los bytes de los archivos y luego anonimiza), `suppressionFor`, `listPendingSuppressions`.
- `src/v2/panel/Caso.jsx`: el diálogo de suprimir programa (motivo ≥ 30) en vez de borrar al momento; aviso de supresión programada en la ficha con «Cancelar» y, pasada la gracia, «Suprimir ahora».
- `src/v2/panel/Tablero.jsx`: aviso al resto de administradores («N supresiones programadas», con enlace a cada caso y marca de «ya se puede ejecutar»).
- Textos en `src/translations.js` (supText, supConfirm, supBanner, supCancel, supExecute…) y `src/translations-panel.js` (`supPending*`), en los tres idiomas. `panel.css`: `.cs-suppress`.
- Demo: `requestSuppression`/`cancelSuppression`/`executeSuppression`/`suppressionFor`/`listPendingSuppressions` en `demoStore.js` (la supresión se guarda en el caso).

**Abierto / decisiones:** la ejecución tras los 7 días la lanza un administrador desde el panel; con pg_cron, una función de servidor la hará automática (M11, que también limpia los bytes de los archivos del almacén). El texto del diálogo de supresión cambió para describir la gracia (sigue citando el art. 32); es un cambio de exactitud, no de una cita legal.

---

## A3 · Que nadie pueda cerrar el canal de una empresa

**Migración:** `supabase/migrations/026_canal_no_se_cierra.sql` · **vuelta atrás:** `rollback/026_atras.sql`.

**Qué se hizo (base de datos):**
- **Nunca se rechaza una denuncia.** `complaints_web_rate_limit` ya no lanza `rate-limited`: por encima de 50 web/hora en la empresa, marca la denuncia como **`likely_spam`** y entra igual.
- **Las «posible spam» no avisan una a una.** El encolado (`enqueue_complaint_notification`) no pone un `new` para las spam; pone, como mucho, **un `spam_summary` por empresa y hora**. La función `notify` manda un correo resumen a los administradores (sin datos), y no un aviso por cada una.
- **Enviar exige la prueba de trabajo (021).** `submit_complaint` de **18 parámetros** comprueba `verify_pow` y delega en el de 16. El navegador resuelve la prueba antes de enviar; si no puede (nunca se bloquea a quien denuncia) o la base de datos aún no la pide, se cae al de 16.
- **Adjuntos:** **25 MB por archivo** (bucket, `file_size_limit`) y **tope de 500 MB por empresa y hora** (disparador `attachments_org_hour_cap`): si un adjunto no cabe, su fila se rechaza (`attachment-quota`), el navegador quita el objeto del bucket y avisa a quien denuncia; **la denuncia ya está guardada** (nunca se pierde).
- **Devolver al tablero:** `clear_spam_flag(caso)` (permiso de editar, no apartado) quita la marca de spam.

**Pruebas:** bloque «Que nadie pueda cerrar el canal (026)» de `scripts/test-rls.mjs` (sobre `newDb(26)`): enviar con la prueba de trabajo funciona (18 parámetros) y sin resolverla se rechaza; el de 16 sigue abierto; 50 denuncias entran sin rechazo y la 51 entra marcada como spam (ninguna se rechaza); la spam no encola `new` sino un único `spam_summary` por empresa; un administrador la devuelve al tablero; el bucket limita a 25 MB; un adjunto que pasa el tope por hora se rechaza y la denuncia queda guardada; la vuelta atrás vuelve a rechazar por encima de 50.

**Hecho (navegador):**
- `src/lib/supabase.js`: `saveComplaint` resuelve la prueba de trabajo y usa el `submit_complaint` de 18 (con reserva al de 16); `likely_spam` se lee aparte (`withSpam`, robusto: comprueba el valor) para no romper con la base de datos en la 025; `clearSpamFlag`.
- `src/v2/panel/Tablero.jsx`: las «posible spam» no salen en el tablero normal; aviso «N posible spam» y bandeja aparte (`?spam=1`); no cuentan como «te necesita hoy».
- `src/v2/panel/Caso.jsx`: aviso «Posible spam» con «No es spam: volver al tablero».
- `src/v2/canal/Pruebas.jsx`: `MAX_FILE_MB` = 25 por defecto.
- Textos `spam*` en `translations.js` y `translations-panel.js` (ca/es/en). Demo: `clearSpamFlag` y el campo `likely_spam` en `demoStore.js`.
- `supabase/functions/notify/index.ts`: reescrita para el resumen de spam (`spam_summary`) y la tarea de pg_cron lo reparte.

**Abierto / decisiones:** el tope por empresa y hora se fijó en **500 MB** (ajustable). El `submit_complaint` de 16 se deja abierto como reserva (cerrarlo del todo, como la 022 con las funciones de antes, es un paso posterior; la defensa de verdad de A3 es «nunca rechazar + bandeja de spam + topes», que sí está en la base de datos). En la demo no se puede llegar al umbral de spam, así que la bandeja solo se ve en producción.

---

## A5 · Metadatos de los adjuntos

**Solo navegador** (no hay migración). Módulo nuevo `src/lib/cleanDocs.js`, enganchado en `src/lib/cleanImage.js` (`cleanForAnonymous`).

**Qué se hizo (todo en el navegador, antes de subir, en denuncias anónimas):**
- **Office (docx, xlsx, pptx):** se vacían `docProps/core.xml`, `app.xml` y `custom.xml` (autor, empresa, «modificado por», fechas) y se quitan los autores de comentarios y de control de cambios (`w:author`, `author=`, `<dc:creator>`, `<cp:lastModifiedBy>`, `<author>`). Son contenedores ZIP: las entradas que no se tocan se copian tal cual; las que se cambian se guardan sin comprimir. Para leer el XML comprimido se usa `DecompressionStream` (nativo, sin terceros). Tras limpiar, se vuelve a abrir el ZIP y se comprueba que no queda ningún autor; si algo falla, no se sube (null).
- **PDF:** se borran, **sin cambiar la longitud** (no se mueven las referencias internas), los campos del diccionario Info (`/Author`, `/Creator`, `/Producer`, `/Title`, `/Subject`, `/Keywords`) y el texto del paquete XMP. Si el PDF esconde metadatos en object streams (`/Type /ObjStm`) que no se pueden alcanzar, no se sube (null) y quien denuncia decide.
- **Si la limpieza falla o no se puede garantizar → no se sube en silencio:** `cleanForAnonymous` devuelve null y el formulario lo dice (mensaje `cleanErr`), y quien denuncia quita el archivo o hace una captura.
- **Anónimas: no se aceptan `.eml`, `.msg` ni `.zip`** (llevan remitente, servidores, nombres de archivo): mensaje `forbiddenErr` al enviar, con qué hacer (una captura).
- **Vídeo y audio:** aviso claro en el paso 2 (`proofAvWarn`) de que pueden llevar la ubicación y el modelo del teléfono (no se pueden limpiar).

**Pruebas:** `scripts/test-logica.mjs` (Node tiene `DecompressionStream`): un PDF anónimo sale sin el autor del Info y sin cambiar de tamaño; `stripAuthors` quita `w:author`/`dc:creator`; un docx anónimo sale sin el autor del core ni del comentario, conserva el contenido y sigue siendo un ZIP. Comprobado también a mano con un docx y un PDF sintéticos (`scratchpad/test-cleandocs.mjs`, no en el repo).

**Servidor:** la limpieza en el servidor **no hace falta** (A5 lo dice): quien se salta el navegador solo se perjudica a sí mismo (sube su propio archivo sin limpiar, que solo verá su empresa). El bucket sí limita el tamaño y el tipo.

**Textos:** `src/translations.js` — `cleanErr` (ahora vale para cualquier archivo, no solo fotos), `forbiddenErr`, `proofAvWarn`, y `proofMeta`/`proofMetaFull` corregidos (antes decían «los demás archivos se envían tal cual», que ya no es cierto para Office/PDF). Anotado en `REVISION_LEGAL.md`.

**Abierto / decisiones:** la limpieza de documentos solo corre en denuncias **anónimas** (si te identificas, los archivos van tal cual, porque ya te identificas). No está probada en un navegador real (Playwright no está instalado); se recomienda a David probar con un docx y un PDF reales antes de confiar del todo. Para PDFs con object streams se opta por **no subir** (prudente para quien denuncia) en vez de subir con metadatos escondidos.

---

## Medios con código (M1, M3, M5, M6, M7, M8, M11)

**Migración:** `supabase/migrations/027_medios.sql` (M1, M5, M6, M11) · **vuelta atrás:** `rollback/027_atras.sql`. M3 y M7 son navegador; M8 son las funciones de servidor.

- **M1 · Reescribir las huellas antiguas con el secreto.** La 027 reescribe de golpe (`tracking_key`) las huellas que siguen siendo las planas de antes de la 019, reconocidas por la copia `private.complaints_copia_019` (las nuevas o ya reescritas no se tocan; el disparador de la 019 no cambia `updated_at`). Repetible. Tras esto, **M2**: borrar la copia (SQL en la guía).
- **M3 · Lista cerrada de autoridades.** `AUTORIDADES_EXTERNAS` en `src/v2/config/producto.js` (direcciones fijas; las no verificadas, con `verificar: true`, no se ofrecen). `src/v2/panel/Ajustes.jsx`: la autoridad autonómica se elige de un desplegable de la lista, ya no se escribe una dirección libre (cerraba el riesgo de apuntar a una web que imite a la autoridad). La estatal (AIPI) sigue aparte.
- **M5 · Token de subida.** La ruta del adjunto es `<id del caso>/<id de envío>/<archivo>`; la política de Storage (`can_upload_attachment`) exige que el 2.º tramo sea el `submission_id` del caso. Quien solo conoce el id del caso (por el aviso al panel) ya no puede añadir archivos. El navegador (`uploadAttachments`) pone el id de envío en la ruta.
- **M6 · Ver identidad, permiso propio.** Columna `manager_permissions.can_view_identity` (por defecto false → solo administradores). `can_access_category` admite `view_identity`. `get_reporter_identity` exige ese permiso y, en su versión de dos parámetros, un **motivo** (≥10, queda en el registro; la pantalla «Accesos» lo enseña). Navegador: el botón «Ver la identidad» solo sale con el permiso, y abre un diálogo que pide el motivo. En «Equipo» hay una casilla nueva «Ver identidad».
- **M7 · Descarga de adjuntos.** El panel ya no abre el archivo en una pestaña: lo **descarga** (Blob `octet-stream`, para que nada se ejecute) con el **nombre neutro**, y comprueba los **primeros bytes** contra el tipo (`magicOk`); si no cuadran, avisa.
- **M8 · Dependencias fijas.** Las cuatro funciones de servidor fijan `npm:@supabase/supabase-js@2.105.4` (versión exacta). `deno.lock` deja de estar en `.gitignore`; se genera con `deno cache --lock` (guía). El antivirus de los adjuntos queda como **propuesta escrita** (no se implementa: necesita una función de servidor con ClamAV).
- **M11 · Baja de empresa.** `offboard_organization(org)` borra denuncias (cascada), registro, equipo y la empresa; **solo Reportia** con la clave de servicio (un administrador no puede: `auth.uid()` ha de ser nulo). Los bytes de Storage y las cuentas de Auth se borran aparte (guía). El borrado de archivos dentro de la supresión ya lo hace A7 (el navegador borra los bytes; con pg_cron, una función de servidor). **Sin supresión automática** (duda al abogado): el aviso diario con escalado se programa con pg_cron (`retention_due`). **N2** (las copias de Supabase guardan lo suprimido unos días) está en la guía y en `REVISION_LEGAL.md` (duda 33).

**Pruebas:** bloque «Medios con código (027)» de `scripts/test-rls.mjs`: M1 reescribe la plana y no toca la ya cifrada; M6 pide permiso propio + motivo (y el administrador siempre puede); M5 exige el id de envío en la ruta; M11 solo la ejecuta Reportia. M7 (descarga) y M3 (lista) se validan por la e2e (pendiente de Playwright): se actualizó `ajustes-compartir-informe.mjs` a la lista cerrada y `endurecimiento.mjs` a la subida con id de envío.

**Antivirus (M7, propuesta):** comprobar los adjuntos con ClamAV en una función de servidor antes de dejar descargar. No se implementa en esta ronda: añade un servicio y un coste; mitigado en parte porque el panel fuerza la descarga (no abre en pestaña), comprueba los primeros bytes y el almacén tiene lista cerrada de tipos. Decisión de negocio.

---

## Bajos (B1, B2, B5, B6, B7, B8, B9, B10, B11, B13, N1) + propuestas (B3, B4)

**Migración `028_bajos.sql`** (B1, B2, B13) · vuelta atrás `rollback/028_atras.sql`. Pruebas: bloque «Bajos (028)» de `scripts/test-rls.mjs`.
- **B1** · Leer la empresa y el equipo exige el segundo paso (aal2): políticas restrictivas en `organizations` y `profiles` SELECT (el propio perfil se lee siempre). Con solo la contraseña ya no se ven los datos de la empresa ni el equipo.
- **B2** · `anon` pierde `select/update/delete/truncate` sobre las tablas de datos (el canal llega por funciones «security definer», que se saltan esto; mantiene el `insert` de adjuntos). Segunda barrera si una política falla.
- **B13** · `alter default privileges ... revoke execute ... from public, anon`: las funciones nuevas no nacen ejecutables por anon. Y `is_client_request()` pasa a mirar el rol de la petición (como `api_role_is_client`): una sola forma de saber «¿viene del navegador?», correcta también dentro de funciones «security definer».

**Navegador / config:**
- **B5** · Sentry nunca en el canal **ni en el dominio propio**: `main.jsx` no lo inicia si `isOwnHost()` (antes solo miraba la ruta `/canal`), y se quita `https://*.sentry.io` del CSP del canal (`vercel.json`).
- **B6** · `notify` compara el secreto en **tiempo constante** (`safeEqual`), no con `!==`.
- **B11** · El aviso del justificante dice ahora «guárdalo en un dispositivo tuyo, no en un ordenador compartido ni de la empresa» (`rcKeep`, ca/es/en).
- **N1** · `Referrer-Policy: no-referrer` en el canal y el portal (antes `strict-origin`), en los dos bloques de `vercel.json`.
- **B9** · `actions/checkout` fijada por hash (`11bd7190… # v4.2.2`, verificado). `setup-node` y `upload-artifact` no se pudieron verificar sin conexión: se deja el comando `gh api …` en `ci.yml` para que David saque su SHA y las fije (CI no tiene secretos).

**Funciones de servidor (parcial):**
- **B7** · delete-manager ya no borra directamente a un administrador (`admin-protected`): hay que bajarlo a gestor antes (lo ve el equipo) o lo hace Reportia. **Residual:** un administrador puede bajar a otro a gestor y luego quitarlo; cerrar eso del todo sería un flujo de dos personas (o que la bajada de un administrador la haga solo Reportia). No se bloqueó la bajada de rol porque rompería la gestión legítima del equipo (y la prueba e2e de ascender/bajar/quitar). **Propuesta: confirmación de dos administradores para quitar o bajar a un administrador.**
- **B8** · invite-manager tenía tope de 20/día por empresa; se añade un **tope global de 200/día** (frena el abuso con muchas empresas creadas en masa). `ALLOWED_ORIGINS` de las funciones queda en la guía.

**B10** · `npm audit`: los 11 avisos que quedan solo se arreglan con saltos de versión mayor (`exceljs`/`uuid` a una versión antigua, o Vite 6). `npm audit fix` sin `--force` no cambia nada. Ninguno es explotable hoy en producción (ronda 1: son de `vite`/`esbuild`/`source-map-js` de desarrollo, o de `exceljs`). Se deja para una tarea aparte de Vite 6.

**Propuestas escritas (no se implementan):**
- **B3 · Cadena de huellas en el registro de actividad.** Hoy `audit_logs` no se puede falsear desde el navegador (no hay políticas de UPDATE/DELETE y el autor lo pone la base de datos), pero sí con la clave de servicio o desde el editor SQL. Propuesta: que cada entrada firme (HMAC con el secreto de Vault, 019) la huella de la anterior, formando una cadena; una tarea diaria guarda la última huella fuera de Supabase (p. ej. en un correo a Reportia). Así un cambio retroactivo se detecta. Esfuerzo M.
- **B4 · Clickjacking del canal.** El canal se puede meter en un iframe de cualquier web `https` (`frame-ancestors https:`), para que un cliente lo integre en su web (INTEGRACION.md). Propuesta: una lista de webs por empresa (una columna `allowed_frame_ancestors` y una cabecera generada por empresa) o abrir siempre en pestaña nueva desde el botón/script de integración. Esfuerzo M. Mientras tanto, el riesgo es bajo: el canal no tiene acciones de un clic que un clickjacking aproveche (enviar una denuncia son 3 pasos).
