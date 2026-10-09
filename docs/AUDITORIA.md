# Auditoría · «Mejora total» (octubre 2026)

Rama `mejora-total`, creada desde `rediseno-dos-mitades` (commit e634db5). Este documento es el registro vivo del encargo: qué se encontró, cómo se comprobó y en qué estado está cada cosa.

## Cómo se hizo

- **Siete áreas**, auditadas por agentes en paralelo (de dos en dos) sobre una copia fija del código, sin tocar el repositorio ni ningún Supabase: **A** seguridad y privacidad (A1 base de datos y servidor, A2 navegador y anonimato), **B** fallos y lógica legal, **C** accesibilidad WCAG 2.2 AA, **D** rendimiento, **E** textos e idiomas, **F** código, **G** portada y conversión.
- **Cada hallazgo está reproducido**: con una prueba de base de datos en memoria (PGlite), con el navegador contra una red simulada (Playwright), con Lighthouse o leyendo el código (archivo:línea). Lo que no se pudo reproducir está en «Descartados».
- **Gravedad**: crítica (se puede explotar o incumple la ley hoy), alta (fallo serio con un caso real), media, baja.
- **Estado**: ✅ arreglado (con la fase) · ⏳ pendiente (fase prevista) · 💡 propuesta (cambia una pantalla, una maqueta o una decisión de negocio: no se hace sin permiso) · 👤 para David (Supabase, Vercel u otra configuración) · ⚖️ duda para el abogado (`docs/REVISION_LEGAL.md`).

Pruebas que cubren lo arreglado: `npm run db:test` (bloque «Endurecimiento (014)»), `npm run test:logic` (plazos en seis zonas horarias y limpieza de fotos) y `npm run e2e -- --only=endurecimiento` (canal y panel con la red simulada).

---

## A · Seguridad y privacidad

### A1 · Base de datos, código de seguimiento, funciones de servidor y acceso

| n.º | hallazgo | gravedad | evidencia | qué se ha hecho / propuesta | estado |
|---|---|---|---|---|---|
| A1-1 | **Se podía adivinar un código de seguimiento.** El código tiene 8 caracteres (40 bits) y su huella es única. Una sola petición sin sesión con miles de huellas respondía «alguna ya existe» o «ninguna»: partiendo la lista por la mitad se encontraba el código exacto en unas 12 peticiones. Con él se lee la conversación de otra empresa y se escribe como si fuera quien denunció. Las consultas por código no tenían ningún límite. | crítica | `010:138` (índice único); `010:221-278`, `012:185-227`; prueba `aud-a1-pruebas.mjs` [1]: 5.001 candidatos por petición, conversación leída y mensaje suplantado. | Migración 014: (1) **una sola denuncia por petición**, comprobado fila a fila *antes* de mirar si el código existe, así que un lote ya no revela nada; (2) **tope de 50 denuncias por hora y empresa** por la web; (3) **freno global**: más de 1.000 consultas con códigos inexistentes en 10 minutos frenan el portal unos minutos, sin guardar ninguna IP. Ahora cada intento cuesta una petición y deja una denuncia visible. Se mantiene el código de 8 caracteres porque las maquetas y el justificante usan `XXXX-XXXX` (alargarlo, en 💡 A1-1b). | ✅ fase 3 |
| A1-1b | Código más largo (16 caracteres) o generado y firmado en el servidor (HMAC), que cerraría también A1-8. | — | — | Cambia el justificante, la consulta y las maquetas. | 💡 |
| A1-2 | **Con solo la contraseña** (sin el segundo paso), un administrador podía borrar y volver a crear perfiles (incluso como administrador), renombrar a otros y cambiar el nombre de la empresa y el **enlace al canal externo** que ve quien denuncia (phishing). | alta | `005:44-51`, `009:36-39`; prueba [3] y [4]. | 014: los perfiles ya no se crean ni se borran desde el navegador (lo hacen `invite-manager` y `delete-manager`), y cambiar perfiles o la empresa exige el segundo paso. | ✅ fase 3 |
| A1-3 | **Al borrar a un miembro se perdía su autoría** en el registro, el registro mostraba el nombre *actual* de cada persona y la baja no quedaba anotada. | alta | `010:387`; `delete-manager:51-53`; `supabase.js:550-554`. | 014: el registro guarda el nombre de quien hizo cada cosa en ese momento (`actor_name`, también para lo anterior). `delete-manager` anota «member_removed» con quién quitó a quién. El panel muestra el nombre guardado. | ✅ fase 3 |
| A1-4 | **Inundación del canal**: sin sesión se podían crear 2.000 denuncias en una petición; el captcha nunca llega al servidor; cada denuncia admite 5 archivos de hasta 100 MB y dispara avisos. | alta | `Denuncia.jsx:108`; `supabase.js:85-163`; prueba [2]. | 014: una por petición y 50 por hora y empresa (el canal dice «inténtalo dentro de una hora»). Pendiente: comprobar el captcha en el servidor (fuera de alcance: no hay Turnstile real) y bajar el límite de tamaño (👤). | ✅ en parte · 👤 |
| A1-5 | **La invitación podía borrar o «adoptar» cuentas ajenas**: invitar un correo ya registrado y sin confirmar lo borraba aunque fuera de otra empresa; una cuenta sin empresa creada antes por alguien con ese correo entraba en la empresa que invita (preapropiación). | alta | `invite-manager/index.ts:47-66` (lectura del código). | 014 añade `find_auth_user` (solo para el servidor). `invite-manager` ya no invita a correos con cuenta en otra empresa o sin empresa, solo reenvía si es una invitación pendiente de la misma empresa, y solo borra una cuenta si la acaba de crear él. | ✅ fase 3 (redesplegar la función) |
| A1-6 | Alta de empresas sin freno: sin captcha, nombre sin límite, se pueden reservar marcas ajenas; una empresa «Demo» recibía la dirección del canal de ejemplo (sus denuncias se perderían). | media | `006:64-99`; prueba [7]. | 014: direcciones reservadas (`demo`, `admin`, `canal`, `reportia`…) y nombres con tope de 120 caracteres. Captcha en el alta y canal visible solo con correo confirmado: 💡/👤. | ✅ en parte · 💡 |
| A1-7 | El captcha del acceso es decorativo, y una cuenta sin segundo paso lo da de alta con solo la contraseña. | media | `Acceso.jsx:115-132`; `supabase.js:631-660`. | Enviar `captchaToken` y luego activar el captcha de Auth (fuera de alcance mientras no haya Turnstile real). | ⏳ 💡 |
| A1-8 | La huella del código no lleva secreto: con una copia de la base de datos, los códigos salen en minutos. | media | `010:41-46`. | Ver A1-1b. | 💡 |
| A1-9 | Las notas internas aceptaban cualquier contenido, de cualquier tamaño, con un autor inventado. | baja | `010:392-398`; prueba [5]. | 014: solo el texto de la nota, con tope de 5.000 caracteres; el autor lo pone la base de datos. | ✅ fase 3 |
| A1-10 | La entrada «created» del registro se podía repetir en denuncias de otra empresa. | baja | `008:294-296`; prueba [6]. | 014: una sola por denuncia, y con la función de envío la escribe el servidor. | ✅ fase 3 |
| A1-11 | Un gestor con solo «ver» marca como leídos los mensajes de quien informa, y el aviso desaparece para quien debe responder. | baja | `010:508-511`; prueba [9]. | Exigir permiso de respuesta en la política. | ⏳ fase 4 |
| A1-12 | Funciones del servidor con CORS `*` y sin tope de invitaciones por día. | baja | `invite-manager:3-6`… | CORS al dominio de `SITE_URL`; tope de ~20 invitaciones/día. | ⏳ fase 4 |
| A1-13 | El panel no cierra la sesión por inactividad. | baja | `supabase.js:42-48`. | Cierre tras 30 min sin actividad + límite de sesión en Supabase (👤). | 💡 👤 |

### A2 · Navegador, anonimato, cabeceras y secretos

| n.º | hallazgo | gravedad | evidencia | qué se ha hecho / propuesta | estado |
|---|---|---|---|---|---|
| A2-1 | **En una denuncia anónima, las fotos del iPhone (HEIC), TIFF, GIF y BMP se enviaban con su GPS y el modelo del móvil**, y una JPEG que el navegador no podía redibujar también salía tal cual. El formulario promete «sin ubicación ni datos del dispositivo». | alta | `cleanImage.js:5-23`; `aud-a2-canal-real.json` (marcas GPS en el cuerpo subido). | Nueva limpieza: se redibuja si se puede; si no, se quitan los bloques de metadatos byte a byte (JPEG, PNG, WebP); HEIC/TIFF/GIF/BMP se convierten a JPG si el navegador sabe leerlas. **Si una foto no se puede limpiar, no se envía nada** y se dice cuál y qué hacer. | ✅ fase 3 |
| A2-2 | Turnstile se carga en el canal (un tercero que ve la IP dentro de la página de la denuncia) pero su token nunca se comprueba. | media | `Denuncia.jsx:46,108,310`. | Quitar `VITE_TURNSTILE_SITE_KEY` en Vercel hasta que se compruebe en el servidor. | 👤 |
| A2-3 | En una denuncia anónima, el nombre original del archivo («Maria_Garcia_nomina.jpg») viajaba en la subida aunque la tabla guardara uno neutro. | media | `supabase.js:136-139`. | La subida va con el nombre neutro (`document-1.jpg`). | ✅ fase 3 |
| A2-4 | El almacén acepta SVG y «octet-stream», y el panel abre los adjuntos en una pestaña en lugar de descargarlos. | media | `010:596-605`; `supabase.js:589`; `Caso.jsx:245`. | Lista cerrada de tipos y descarga forzada (`createSignedUrl(…, { download })`). | ⏳ fase 4 |
| A2-5 | Si se entra por el acceso y se pasa al canal sin recargar, Sentry (si está configurado) sigue activo en el canal. | media | `main.jsx:18`; `aud-a2-sentry.out`. | `beforeSend` que descarte todo lo de `/canal`. | ⏳ fase 4 |
| A2-6 | El «no indexar» es solo una etiqueta del HTML; no hay cabecera `X-Robots-Tag` ni `robots.txt`. | media | `vercel.json`; `index.html:9`. | Cabeceras en `vercel.json` (ver «Propuesta de indexación»). Es configuración de Vercel: no se toca sin tu permiso. | 💡 👤 |
| A2-7 | La dirección `demo` no estaba reservada. | media | `supabase.js:209`; `006:28-45`. | Reservada en la 014 (ver A1-6). Comprobar en Supabase que ninguna empresa la tiene. | ✅ fase 3 · 👤 |
| A2-8 | Con una sesión ya abierta, una marca en la pestaña permite llegar a «Contraseña nueva» sin la actual. | baja | `supabase.js:35,760`; `aud-a2-contrasena.out`. | Fiarse solo del token del enlace; activar «Secure password change» (👤). | ⏳ fase 4 · 👤 |
| A2-9 | La política de seguridad del navegador permite conectar con cualquier proyecto de Supabase. | baja | `vercel.json:7`. | Fijar el proyecto propio en `connect-src`. | 💡 👤 |
| A2-10 | Excel: un texto que empiece por `=` se guarda como texto (no se ejecuta), pero conviene blindarlo. | baja | `exportV2.js:256,265`. | Prefijo `'` en textos que empiecen por `= + - @`. | ⏳ fase 4 |
| A2-11 | La dirección `/canal/<empresa>/denuncia` queda en el historial del navegador. | baja | `App.jsx:81`. | Rutas neutras con redirección de las antiguas. | 💡 |
| A2-12 | El justificante PDF lleva la hora exacta con zona horaria y el nombre de la librería. | baja | `receipt.js:72`. | Fecha neutra y sin «Producer». | ⏳ fase 4 |
| A2-13 | `supabase/.temp/` está en git (identificadores públicos del proyecto, sin secretos). | baja | `git ls-files supabase/.temp`. | `.gitignore` + `git rm --cached`. | ⏳ fase 4 |
| A2-14 | `npm audit`: 11 avisos, ninguno llega al código publicado; `vite` está en `dependencies`. | baja | `aud-a2-npm-audit-*.txt`. | Pasar `vite` a `devDependencies` (ver F-32). | ⏳ fase 4 |
| A2-15 | Los correos de confirmación e invitación muestran el nombre que escribe quien se registra (suplantación). | baja | `confirm-signup.html`, `invite.html`. | Quitar esos campos de las plantillas (👤, se pegan en Supabase). | 👤 |

---

## B · Fallos y lógica legal

| n.º | hallazgo | gravedad | evidencia | qué se ha hecho / propuesta | estado |
|---|---|---|---|---|---|
| B-1 | **Los plazos dependían de la zona horaria del ordenador**, y la ampliación usaba siempre la de Madrid. Un caso de las 23:30 en Canarias tenía un día menos de plazo visto desde Madrid, y el botón prometía «ampliar hasta el 28 feb» cuando la base de datos guardaba el 1 mar. | crítica | `adminKit.jsx:36-66`; `canal/shared.jsx:36-48`; `Caso.jsx:25-31`; `aud-b-dates.mjs`. | Un solo módulo de plazos (`src/lib/deadlines.js`) en días de calendario de Madrid, igual que la base de datos, usado por el panel, el canal, la ficha, el informe, las exportaciones y la demo. Probado en seis zonas horarias. Qué zona manda (la de Madrid o la de la sede) queda como duda. | ✅ fase 3 · ⚖️ |
| B-2 | **Al reabrir un caso**, la ficha y el tablero decían «undefined días para responder», no se marcaba nunca como vencido y se ofrecía ampliar un plazo que la base de datos rechaza. | alta | `adminKit.jsx:69-81`; `Caso.jsx:279-302`; `kit.jsx:55-57`. | Un caso reabierto muestra «Respondida el…» sin cuenta atrás y no ofrece ampliar. Si reabrir debe abrir un plazo nuevo, lo decide el abogado. | ✅ fase 3 · ⚖️ |
| B-3 | **Se podía ampliar un plazo ya vencido**: el caso dejaba de verse vencido y el informe lo daba por respondido a tiempo. | alta | `010:401-428`; `aud-b-db.mjs` [B9]. | 014: la base de datos lo rechaza; la ficha ya no ofrece ampliar un plazo vencido. | ✅ fase 3 · ⚖️ |
| B-4 | **La supresión de datos (art. 32) dejaba texto personal** en el motivo de la ampliación y en las notas del registro. | alta | `013:31-38`; `aud-b-db.mjs` [B2]. | 014: la supresión borra también el motivo de la ampliación y el texto de las notas y motivos del registro de ese caso (se conserva qué se hizo y cuándo). También en los casos ya suprimidos. | ✅ fase 3 |
| B-5 | **Los casos cerrados sin investigar no salían nunca en el aviso de supresión** de los 3 meses (art. 32.4). | alta | `011:171-189`; `demoStore.js:646-655`. | 014 y la demo: salen todos los casos sin investigación iniciada a los 3 meses, sea cual sea su estado. Si los inadmitidos se pueden conservar anonimizados, lo decide el abogado. | ✅ fase 3 · ⚖️ |
| B-6 | **Doble clic** en «Enviar el acuse», «Enviar y cerrar» o «Guardar nota»: dos acuses, dos respuestas finales o dos notas. | alta | `Button.jsx:20`; `Caso.jsx:152-187`. | Un botón ocupado ya no responde a un segundo clic (sin perder el foco) y cada acción comprueba si ya está en marcha. | ✅ fase 3 |
| B-7 | **Acuse a medias**: si el mensaje salía pero el cambio de estado fallaba, decía «Acuse enviado» y el caso seguía en «Recibida»; al repetir, quien informa recibía un segundo acuse. | alta | `Caso.jsx:156-162`; `aud-b-real.mjs` R4. | Se avisa de que el acuse ya salió y falta guardar el estado; al reintentar solo se guarda el estado. | ✅ fase 3 |
| B-8 | Lo mismo al **responder y cerrar**: la respuesta final se enviaba dos veces. | alta | `Caso.jsx:169-173`; R5. | Igual que B-7. | ✅ fase 3 |
| B-9 | **Si se cortaba la red justo después de guardar**, al reintentar se creaba otra denuncia con otro código, y la primera quedaba con un código que nadie conoce. | alta | `supabase.js:85-125`; R1. | El reintento usa el mismo código y la base de datos devuelve la misma denuncia (función `submit_complaint` de la 014; sin la 014, el mismo id). | ✅ fase 3 |
| B-10 | **Si se recargaba mientras subían los adjuntos**, la denuncia quedaba guardada pero quien informa no veía nunca su código. | alta | `supabase.js:120-152`; R2. | El código se enseña en cuanto se guarda la denuncia; las pruebas se suben después desde «Enviada», con su progreso y aviso si se cierra la página. | ✅ fase 3 |
| B-11 | **Si quien informa escribía en un caso cerrado**, no contaba en «te necesitan hoy» ni salía «Te ha escrito» (podría ser un aviso de represalia). | alta | `kit.jsx:53,56`; `CaseCard.jsx`. | Un mensaje sin leer cuenta siempre y la tarjeta cerrada dice «Te ha escrito». | ✅ fase 3 |
| B-12 | **Un fallo pasajero** (un error 500) en la primera lectura hacía creer al panel que faltaba la migración 012 durante toda la sesión: plazos de reunión mal contados y título oculto. | alta | `supabase.js:269-282,503-511`; R6. | Solo un error de «columna o función que no existe» activa la versión de antes; también en el registro manual y en el «cuándo». | ✅ fase 3 |
| B-13 | El informe no contaba los **acuses tardíos** como plazo incumplido. | alta | `Informe.jsx:79-102`. | Nueva línea «Acuses fuera de plazo», sumada a «Plazos incumplidos»; en la ficha, el acuse tardío sale en rojo. | ✅ fase 3 |
| B-14 | **Excel y PDF resumen calculaban sus propios plazos**: un caso ampliado salía vencido y un caso suprimido contaba como abierto. | alta | `exportV2.js:130-149,249-261,663,713,731`. | Las exportaciones usan el mismo cálculo que el panel; un caso suprimido cuenta como cerrado. | ✅ fase 3 |
| B-15 | Una reunión pedida y vencida no marca el caso como vencido. | media | `kit.jsx:53-58`. | Sumarla a «vencidos» y al informe. | ⏳ fase 4 |
| B-16 | En el modo real se podía cambiar el estado o escribir en un caso suprimido (la demo lo impide). | media | `012:97-127`; [B4]. | Rechazarlo en la base de datos (migración 015 o ampliar la 014 antes de ejecutarla). | ⏳ fase 4 |
| B-17 | El formulario no limita la descripción (20.000) ni el teléfono (50): la base de datos lo rechaza con un error genérico. | media | `Denuncia.jsx:197-270`. | `maxLength` y contador; mismos límites en la demo (la 014 ya los comprueba). | ⏳ fase 4 |
| B-18 | Archivos huérfanos en el almacén si falla su fila; la supresión no los encuentra. | media | `supabase.js:136-151,423-427`; R3. | Si falla la fila, el archivo recién subido se borra (✅ fase 3). Falta que la supresión liste la carpeta del caso. | ✅ en parte · ⏳ fase 4 |
| B-19 | Un mensaje del equipo con el caso en «Recibida» no cuenta como acuse. | media | `011:135`; `Caso.jsx:401-406`. | Abrir el diálogo del acuse al escribir en un caso «Recibida». | ⏳ fase 4 · ⚖️ |
| B-20 | «A punto de vencer» no significa lo mismo en el chip (6 días) y en el filtro (2). | baja | `DeadlineChip.jsx:7`; `adminKit.jsx:13`. | Un solo umbral. | ⏳ fase 4 |
| B-21 | Demo distinta del modo real: retención a 91 días (✅ fase 3, ahora igual que la base de datos) y reunión en casos cerrados. | baja | `demoStore.js:646-655,734-747`. | Falta rechazar la reunión en casos cerrados en la demo. | ✅ en parte · ⏳ fase 4 |

Dudas para el abogado que salen de aquí (en `docs/REVISION_LEGAL.md`): ampliación 6 meses desde la recepción o 3+3; ampliar un plazo vencido; inicio del plazo de 3 meses; zona horaria de referencia; supresión de inadmitidos; reabrir; mensaje como acuse; festivos para la AIPI.

---

## C · Accesibilidad (WCAG 2.2 AA)

Sin fallos críticos: con lector de pantalla, zoom o teclado se puede denunciar, consultar el caso y entrar al panel.

| n.º | hallazgo | gravedad | evidencia | propuesta | estado |
|---|---|---|---|---|---|
| C-1 | En el panel en el móvil (o al 400 %), la barra fija de abajo tapa el elemento con el foco (2.4.11). | alta | `ds.css:320-324`; `aud-c-T.log`. | `scroll-padding-bottom` en el móvil. | ⏳ fase 4 |
| C-2 | En «Contraste alto» de Windows, las casillas de permisos sin marcar se ven marcadas. | alta | `panel.css:408-409`; captura `aud-c-forced-perms.png`. | Reglas `forced-colors` para las casillas. | ⏳ fase 4 |
| C-3 | El sistema visual no tiene reglas para colores forzados: no se ve la opción elegida, la página actual, los pasos ni las barras. | media | `ds.css:288-317`. | Bloque `forced-colors` en `ds.css`. | ⏳ fase 4 |
| C-4 | La búsqueda del panel no anuncia «ningún caso» ni el número de resultados. | media | `Panel.jsx:255-272`. | Región `role="status"` con el recuento. | ⏳ fase 4 |
| C-5 | «Ir al contenido» del panel no salta nada; la cabecera queda dentro de `main`. | media | `SplitShell.jsx:17-21`. | `main` en el contenido, cabecera fuera. | ⏳ fase 4 |
| C-6 | Texto visible distinto del nombre accesible («CA» se llama «Català»…): el control por voz no funciona (2.5.3). | media | axe `label-content-name-mismatch`. | Que el nombre empiece por lo visible. | ⏳ fase 4 |
| C-7 | Todas las pantallas del canal tienen el mismo título de pestaña. | media | `Entrada.jsx:16`, `Denuncia.jsx:55`… | Títulos neutros pero distintos («Paso 2 de 3 · Canal ético…»). | ⏳ fase 4 |
| C-8 | El aviso del canal de ejemplo se corta al 200 % de zoom. | media | `ds.css:461`. | Dejar que salte de línea. | ⏳ fase 4 |
| C-9 | A 320 px se cortan con «…» el nombre de la empresa y el de algunos archivos. | baja | `panel.css:16,167`. | `overflow-wrap` o `title`. | ⏳ fase 4 |
| C-10 | Al abrir «Buscar», el foco va a «Cerrar» y no al campo. | baja | `Dialog.jsx:31-34`. | Enfocar `[data-autofocus]` tras abrir. | ⏳ fase 4 |
| C-11 | «Más acciones» anuncia un menú, pero es un grupo de botones (las flechas no hacen nada). | baja | `Menu.jsx:22-24`. | Quitar `aria-haspopup` o hacer el patrón completo. | ⏳ fase 4 |
| C-12 | «Mover a En curso» en el tablero no mueve: abre la ficha con el acuse preparado. | baja | `Tablero.jsx:101`. | Nombres que digan lo que pasa. | ⏳ fase 4 |
| C-13 | Las pestañas del tablero en el móvil apuntan a columnas sin `role="tabpanel"`. | baja | `Kanban.jsx:41-50`. | Añadir el rol en el móvil. | ⏳ fase 4 |
| C-14 | Los bloques de la portada que pasan solos no tienen botón de pausa (2.2.2). | baja | `V2Landing.jsx:75-95`. | Botón «Pausar». | ⏳ fase 5 |

---

## D · Rendimiento

Medidas de partida (Lighthouse, móvil): portada 80 (LCP 4,2 s), canal 84, acceso 86, tablero 94 (CLS 0,13). En escritorio, 99–100.

| n.º | hallazgo | gravedad | evidencia | propuesta | estado |
|---|---|---|---|---|---|
| D-1 | La portada tarda 4,1 s en pintar en el móvil: el 90 % es esperar JavaScript. Igual en el canal (3,5 s) y el acceso (3,3 s). | alta | `lh-portada.json`; ruta crítica igual en todas. | D-2 + D-3 + D-4, y no partir el titular de opacidad 0. | ⏳ fase 4/5 |
| D-2 | Todos los textos de la aplicación (71 % del archivo principal) se descargan en cualquier página. | alta | mapa de código: 212 de 298 KB. | Partir `translations.js` por zonas (web, canal, panel). | ⏳ fase 4 |
| D-3 | La portada y `/privacitat` descargan la librería de la base de datos sin usarla. | alta | `App.jsx:3-5`; `Canal.jsx:5`. | Cargar el canal y la web de forma perezosa. | ⏳ fase 4 |
| D-4 | Un único CSS de 131 KB bloquea el primer pintado; el 75 % no se usa en la portada. | media | Lighthouse. | Sale casi solo con D-3. | ⏳ fase 4 |
| D-5 | Las capturas de la portada pesan mucho más de lo que se muestran (415 KB en el móvil). | media | `V2Landing.jsx:172,192`. | Dos tamaños con `srcset`. | ⏳ fase 5 |
| D-6 | Las fotos de la portada se sirven sin caché. | media | `vercel.json:20-23`. | Caché de 7 días para `/landing/*` (configuración de Vercel). | 💡 👤 |
| D-7 | El tablero en el móvil salta al cargar (CLS 0,14). | media | `Tablero.jsx:144-202`. | Esqueleto con la forma final y hueco reservado para el aviso. | ⏳ fase 4 |
| D-8 | «Exportar PDF» descarga 1,5 MB, 938 KB de ellos de la librería de Excel. | media | `exportV2.js:14`. | Cargar ExcelJS solo para el Excel. | ⏳ fase 4 |
| D-9 | Manrope va en hasta 10 archivos y no se precarga. | baja | `rutas.json`. | Versión variable de Manrope (es una dependencia nueva: se pregunta). | 💡 |
| D-10 | Desde la portada se precarga también el panel. | baja | `App.jsx:61-62`. | Precargar solo el alta y el acceso. | ⏳ fase 4 |
| D-11 | `Stable` triplica los textos de la portada (1.290 elementos, 311 copias ocultas). | baja | `V2Landing.jsx:325,414`. | `Stable` solo en títulos y botones. | ⏳ fase 5 |
| D-12 | El tablero pide 34 archivos JS pequeños (iconos). | baja | `rutas.json`. | Agrupar iconos. | ⏳ fase 4 |
| D-13 | La medida de partida del tablero no vaciaba la caché. | baja | `medir.mjs`. | Vaciarla en la medida del «después». | ⏳ fase 6 |
| D-14 | `@emailjs/browser` no se usa. | baja | grep. | Quitarlo (ver F-32). | ⏳ fase 4 |

---

## E · Textos e idiomas · F · Código

| n.º | hallazgo | gravedad | evidencia | propuesta | estado |
|---|---|---|---|---|---|
| F-1 | Excel y PDF ignoraban la ampliación (= B-14). | alta | `exportV2.js`. | Ver B-14. | ✅ fase 3 |
| F-2 | **Sin conexión al abrir el canal, a quien va a denunciar le salía «Este canal no existe»**, o se quedaba cargando para siempre. | alta | `Canal.jsx:39-42`. | «No se ha podido abrir el canal» con «Volver a intentarlo». | ✅ fase 3 |
| F-3 | Si fallan los mensajes, quien informa ve «Todavía no hay mensajes» (y casos parecidos en el panel). | media | `Consulta.jsx:163`, `Panel.jsx:239`… | Mostrar el error y reintentar. | ⏳ fase 4 |
| E-4 | El mismo tema se llama distinto en el panel y en el Excel/PDF. | media | `exportV2.js:57`. | Que las exportaciones usen los nombres del canal. | ⏳ fase 4 |
| E-5 | Excel/PDF dicen «Informante / Gestor / Categoría»; el panel, «Quien informa / Tema». | media | `v2export.*`. | Mismas palabras. | ⏳ fase 4 |
| E-6 | Un mismo rol con dos nombres («Administración» y «Administrador»). | media | `panel.set.roleAdmin`. | Una sola pareja. | ⏳ fase 4 |
| E-7 | El permiso se llama «Eliminar» y lo que hace es «Suprimir datos». | media | `perm.can_delete`. | «Suprimir». | ⏳ fase 4 |
| E-8 | «Vosotros» en el canal, que va en «tú». | media | ca T:1590, es T:3365. | «tú». | ⏳ fase 4 |
| E-9 | Imperativo de «vós» en el panel (ca). | media | T:1319. | «tu». | ⏳ fase 4 |
| E-10 | «Lo están investigando» (es «la» denuncia). | media | T:3492. | Corregir. | ⏳ fase 4 |
| E-11 | «Que te lo restablezca» parece referirse al móvil. | media | `panel.noPhoneText`. | Aclarar. | ⏳ fase 4 |
| E-12 | En inglés, «limit» donde va «deadline». | media | `meetToday`… | Corregir. | ⏳ fase 4 |
| E-13 | «Email» como vía de entrada. | media | `panel.chan.email`. | «Correo electrónico». | ⏳ fase 4 |
| E-14 | Unas 300 claves por idioma sin uso (casi todos los «usted» que quedan); el script que las busca da 0 por un criterio demasiado amplio. | media | `ef/dbg.mjs`. | Arreglar `scripts/textos-sin-uso.mjs` y borrarlas. | ⏳ fase 4 |
| E-15 | Apóstrofo recto en 67 textos. | baja | `lint-apostrofo_recto.txt`. | `’`. | ⏳ fase 4 |
| E-16 | Géneros mezclados («Suprimidos» entre contadores en femenino). | baja | T:1341, 3116. | Corregir. | ⏳ fase 4 |
| E-17 | Frases poco naturales en inglés. | baja | T:5156, 4718. | Corregir. | ⏳ fase 4 |
| E-18 | Leísmo («que le identifiquen»). | baja | T:2890. | Corregir. | ⏳ fase 4 |
| E-19 | Cuatro maneras de decir «vuelve a probar». | baja | varias. | «Inténtalo de nuevo». | ⏳ fase 4 |
| E-20 | «3 meses máximo». | baja | T:3358. | «como máximo». | ⏳ fase 4 |
| E-21 | «Ir a Acceder». | baja | T:359, 2140. | «Entrar al panel». | ⏳ fase 4 |
| E-22 | «Tu» mezclado con «vuestra web». | baja | `share.*`. | Un criterio. | ⏳ fase 4 |
| E-23 | Respaldos en castellano en el código que nunca se usan. | baja | `exportV2.js:237-241`. | Quitarlos. | ⏳ fase 4 |
| F-24 | Los plazos se calculaban en cinco sitios; el formato de fechas y tamaños, repetido. | media | varios. | Plazos unificados en `src/lib/deadlines.js` (✅ fase 3); falta el formato. | ✅ en parte · ⏳ fase 4 |
| F-25 | `OPEN` significa dos cosas; `relDay` duplicada. | media | `adminKit.jsx`, `kit.jsx`. | Renombrar y borrar. | ⏳ fase 4 |
| F-26 | Código muerto: `V2Layout` (componente), 94 clases de `v2.css`, 5 funciones de `supabase.js`. | baja | grep. | Borrarlo (con prueba de grep). | ⏳ fase 4/5 |
| F-27 | `supabase.js` se traga algunos errores; `deleteComplaint` sin uso. | baja | `supabase.js:155,540,573,810`. | Avisar y borrar lo muerto. | ⏳ fase 4 |
| F-28 | Archivos muy grandes (`translations.js` 5.341 líneas…). | baja | `wc -l`. | Partirlos con fachadas. | 💡 |
| F-29 | Comentarios en catalán y castellano mezclados. | baja | recuento. | Castellano para lo nuevo; apuntarlo en CLAUDE.md. | ⏳ fase 6 |
| F-30 | Archivos sueltos: `main.jsx` de la raíz (formulario antiguo), `reportia_logo.jpg`, `public/logo.png`, `supabase_schema.sql`; README desfasado. | baja | grep sin resultados. | Borrar con `git rm` tras la prueba de grep; actualizar el README. | ⏳ fase 4 |
| F-31 | `supabase/.temp/` y `.claude/settings.local.json` en git. | media | `git ls-files`. | `.temp` como A2-13. `.claude` es tu carpeta de herramientas: no se toca sin preguntarte. | ⏳ fase 4 · 👤 |
| F-32 | `@emailjs/browser` y `jimp` sin uso; `vite` en `dependencies`. | baja | grep. | Quitarlos y mover `vite`. | ⏳ fase 4 |

---

## G · Portada y conversión

| n.º | hallazgo | gravedad | evidencia | propuesta | estado |
|---|---|---|---|---|---|
| G-1 | La web y el alta tratan de «usted»; el producto, de «tú». | media | 51 líneas con «su/Escriba…». | Pasar `/crear-compte` (y la portada, si lo decides) a «tú». | ⏳ fase 5 |
| G-2 | El inicio no menciona la prueba de 30 días ni la Ley 2/2023 (aparecen 8.400 px más abajo). | media | `V2Landing.jsx:136-151`. | Una línea bajo los botones que reutilice `trialNote`. | ⏳ fase 5 |
| G-3 | Un navegador en gallego o euskera ve la web en catalán; en el móvil el idioma está escondido. | media | `detectLang()`. | Castellano para `gl`/`eu` (decisión tuya). | 💡 |
| G-4 | En `/crear-compte`, el botón de la cabecera lleva a la misma página. | baja | `V2SiteLayout.jsx:161`. | «Acceder» en esa página. | ⏳ fase 5 |
| G-5 | La vista previa al compartir sale siempre en catalán. | baja | `index.html:7-14`. | Decidir el idioma. | 💡 |
| G-6 | Sigue el selector provisional `?foto=` y se publica una foto que solo usa `?foto=3`. | baja | `V2Landing.jsx:24-27`. | Fijar las fotos y borrar la sobrante. | ⏳ fase 5 |

Nota: `src/v2/site/plans.js:4` dice «PROPOSTA pendent de validar per direcció» encima de los precios publicados. No se cambian; solo conviene confirmar que están validados.

---

## Para David en Supabase y Vercel

Nada de esto se hace desde el código. Por orden de importancia:

1. **Ejecutar la migración 014** (`supabase/migrations/014_endurecimiento.sql`) en el editor SQL. Es repetible: si algo falla a medias, se puede volver a ejecutar.
2. **Redesplegar `invite-manager` y `delete-manager`** (después de la 014). `notify` y `ai-assist` no cambian.
3. Supabase › SQL: `select id, name from organizations where slug = 'demo';` → tiene que dar 0 filas.
4. Vercel: **borrar `VITE_TURNSTILE_SITE_KEY`** hasta que el captcha se compruebe en el servidor (A2-2). No activar el captcha de Supabase Auth antes de que el acceso lo envíe: nadie podría entrar.
5. Supabase › Auth › Providers › Email: «Confirm email», «Secure email change» y «Secure password change» activados.
6. Supabase › Auth › Passwords: mínimo 12 caracteres, letras y números, y «Leaked password protection».
7. Supabase › Auth › Rate Limits: bajar altas y accesos por IP, correos por hora y verificaciones de código.
8. Supabase › Auth › Sessions: JWT de 15–60 min, sesiones de 8–12 h y cierre por inactividad de 30–60 min.
9. Supabase › Auth › MFA: TOTP activado; avisos por correo de factor añadido o quitado y de contraseña cambiada, si el plan los tiene.
10. Supabase › Auth › Email Templates: quitar `{{ .Data.company_name }}` y `{{ .Data.full_name }}` de la confirmación y de la invitación.
11. Supabase › Auth › URL Configuration: Site URL y Redirect URLs solo con dominios de Reportia, sin comodines.
12. Supabase › Database: `select schemaname, tablename, policyname, permissive, roles, cmd from pg_policies order by 1,2,3;` y comparar con las migraciones (las políticas creadas a mano se suman, sobre todo en `storage.objects`).
13. Supabase › Advisors (Security y Performance): revisar avisos. API: exponer solo `public` y desactivar GraphQL si no se usa.
14. Supabase › Storage: bajar el límite de 100 MB por archivo (el canal ya limita a 50 MB por defecto). No hay antivirus: avisar a los gestores.
15. Supabase › Edge Functions: `verify_jwt` activo en `invite-manager`, `delete-manager` y `ai-assist`; `WEBHOOK_SECRET` largo y aleatorio.
16. Supabase › Logs: alertas por picos de `rpc/submit_complaint`, `POST /rest/v1/complaints` y `rpc/get_*_by_tracking_code`.
17. Supabase › Billing: «Spend cap» activado.
18. Copias de seguridad: tratarlas como datos sensibles (contienen las huellas de los códigos, A1-8).
19. Vercel: no activar Web Analytics, Speed Insights ni integraciones que inyecten scripts. Saber que los registros de Vercel y Supabase guardan la IP de quien informa durante su retención (conviene decirlo en la política de privacidad: ⚖️).
20. Sentry (solo si se pone `VITE_SENTRY_DSN`): «Prevent storing of IP addresses».

## Propuesta de indexación (el día del lanzamiento)

Hoy, sin cambiar nada de lo que se ve, pasar el «no indexar» a cabecera en `vercel.json` (en este orden; gana la última regla):

```json
{ "source": "/(.*)",          "headers": [{ "key": "X-Robots-Tag", "value": "noindex, nofollow" }] },
{ "source": "/canal/:path*",  "headers": [{ "key": "X-Robots-Tag", "value": "noindex, nofollow, noarchive, nosnippet" }] },
{ "source": "/admin/:path*",  "headers": [{ "key": "X-Robots-Tag", "value": "noindex, nofollow, noarchive, nosnippet" }] }
```

El día del lanzamiento: quitar solo la primera regla y la etiqueta `noindex` del `index.html`; añadir `public/robots.txt` (`Allow: /` y el sitemap, **sin** `Disallow` de `/canal` ni `/admin`) y `public/sitemap.xml` solo con `/` y `/privacitat`. Comprobar con `curl -sI` que `/canal/x` y `/admin/login` siguen con `noindex` y `/` no.

## Descartados (comprobados y correctos)

- **Base de datos**: sin diferencias de tiempo medibles en las consultas por código; todas las funciones `security definer` tienen `search_path` fijo; ninguna lectura de denuncias, mensajes, adjuntos, registro o identidad sin sesión o sin segundo paso; aislamiento entre empresas cubierto por las pruebas.
- **Servidor**: `notify` no envía contenido de la denuncia; `ai-assist` exige el segundo paso y no lee la identidad; `aalOf()` solo se usa después de validar el token.
- **Navegador**: React escapa todo (probado con `<img onerror>` en todos los campos); el canal no escribe nada en el navegador; el código no sale del navegador (solo su huella); sin terceros salvo Cloudflare (A2-2); ningún secreto en el repositorio ni en los 70 commits del historial; Excel no ejecuta fórmulas.
- **Plazos**: fin de mes y bisiestos, cambio de hora, medianoche dentro de una misma zona y días hábiles de la AIPI, correctos.
- **Accesibilidad**: un solo idioma para el lector con `Stable`; tamaño de objetivos, arrastre con alternativa, `autocomplete`, movimiento reducido, foco al cerrar diálogos, errores anunciados y reflujo a 320 px, correctos.
- **Rendimiento**: los iconos ya se empaquetan uno a uno; jsPDF/ExcelJS no se cargan al abrir ninguna página; las capturas ya llevan `loading="lazy"`; el SEO bajo de Lighthouse es por el `noindex` buscado.
- **Portada**: sin enlaces rotos; nada se sale de lado a 360 ni a 390 px; el alta marca bien los errores y autocompleta.
