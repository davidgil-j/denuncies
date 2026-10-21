# Auditoría de seguridad · Ronda 1 (21 de octubre de 2026)

Canal de denuncias Reportia (Ley 2/2023). Solo informe: **no se ha cambiado nada del código**. Rama `main`, commit `d2a8840`, con los cambios sin guardar de `src/v2/landing` (los lleva otro chat y no se han auditado).

Lo más grave en un canal de denuncias no es que la web se caiga, sino que alguien sepa quién ha denunciado o lea una denuncia que no le toca. La gravedad de cada hallazgo se ha medido con esa vara.

---

## 1. Resumen en palabras llanas

- **Lo más grave (crítico):** si la denuncia va contra alguien que tiene acceso al panel, esa persona puede leerla entera. Si es administradora, la ve siempre. Si la denuncia es identificada, también ve el nombre de quien denuncia. No hay forma de apartarla de ese caso. Además, puede «suprimir» la denuncia en cualquier momento, y con ella desaparecen el texto, los mensajes y los archivos (hallazgos C1 y A7).
- **Altos:**
  - Hay una forma de comprobar si un código de seguimiento existe que **no pasa por el freno de intentos**. Sirve para ir probando códigos al azar a gran velocidad (A1).
  - El propio freno se puede usar para **bloquear el portal de seguimiento de todos los clientes a la vez**, con muy poco esfuerzo (A2).
  - Cualquiera puede **cerrar el canal de una empresa concreta** enviando 50 denuncias falsas por hora (A3).
  - El panel enseña la **hora exacta** de cada denuncia y de cada mensaje, y el aviso por correo llega al instante. Cruzado con los registros de la empresa (quién estaba conectado a esa hora), puede delatar a quien denuncia (A4).
  - Los documentos, vídeos y correos adjuntos se suben **con sus datos ocultos** (autor, empresa, ubicación…), también en las denuncias anónimas (A5).
  - **No queda registro** de quién abre, lee o exporta un caso, ni de quién borra un archivo (A6).
- **La frase «no guardamos la IP» no es exacta del todo.** La base de datos no la guarda, pero los registros técnicos de Supabase sí (1 día en el plan gratuito, 7 en Pro), y también los de Vercel y Cloudflare. Detalle en M10.
- **La copia `private.complaints_copia_019` ya existe en producción** (19 oct, 5 denuncias de prueba) y tiene las identidades enteras, donde la supresión no llega (M2). Hay que borrarla una vez reescritas todas las huellas (M1). SQL en la guía de la ronda 2.
- **La 014, la 018 y la 019 ya están en producción** (19 oct), confirmado por David: el agujero crítico de la auditoría anterior (A1-1) está cerrado en lo que arreglaba la 014. Lo que sigue abierto son las variantes nuevas A1 (y A2) de esta ronda.

Esta ronda **no ha atacado nada**: ni producción, ni Vercel, ni Supabase. Los hallazgos están confirmados leyendo el código de punta a punta, con la base de datos en memoria del proyecto (PGlite, solo para ver la configuración final) o con la documentación oficial de los proveedores. Las pruebas de ataque ejecutadas quedan para la ronda 2, en un Supabase local (apartado 9).

---

## 2. Herramientas: qué se ha usado y qué no

| Herramienta | Estado | Resultado |
|---|---|---|
| Skills de Trail of Bits (clonadas en `~/.claude/vendor/trailofbits-skills`, commit `a313174`, 20 oct 2026) | Revisadas antes de usarlas: ninguna hace nada raro (apartado 2.1) | Usadas como método en toda la auditoría |
| `fp-check` | Usada | Cada hallazgo lleva su veredicto (columna «fp-check») |
| `variant-analysis` | Usada | A partir de A1-1 de la auditoría anterior: 3 variantes vivas (A1) |
| `sharp-edges` | Usada | B13 y parte de A1, A3 y M4 |
| `insecure-defaults` | Usada a mano: su flujo necesita una herramienta («Workflow») que aquí no existe; se han seguido sus listas de patrones | Ningún secreto de respaldo. Sin `ALLOWED_ORIGINS`, CORS queda abierto (`_shared/cors.ts:9`), pero no es la barrera (B8). Sin claves, todo lo demás falla cerrado |
| `supply-chain-risk-auditor` | Usada (`ronda1-anexos/supply-chain-report.md`) | Nada grave en lo que llega al navegador; `gh` sin sesión, así que parte de los datos de GitHub no se han podido medir |
| semgrep 1.180.0 (OSS, sin Pro) con el script de la skill (`--metrics=off`) | Usado: `p/security-audit`, `p/secrets`, `p/javascript`, `p/react`, `p/nodejs`, `p/typescript`, `p/github-actions` y las reglas de Trail of Bits, elttam y Apiiro | 90 avisos, **0 fallos de verdad**. Son ruido: variables de Supabase en las plantillas de correo, líneas largas de tipografías y textos, nombres del callback de Turnstile, la regex que minifica el CSS. Sí son ciertos los 5 avisos de GitHub Actions sin fijar por hash (B9) |
| gitleaks 8.30.1 | Usado sobre los 77 commits de todo el historial y sobre la carpeta | **Ninguna clave** en el historial ni en los archivos. No hay `.env` en el disco (solo `.env.example`) |
| npm audit / osv-scanner 2.6.0 | Usados (`ronda1-anexos/`) | 11 avisos (6 altos, 5 moderados). Ninguno se puede explotar hoy en producción (B10) |
| Inventario de la base de datos | Script propio de solo lectura (`ronda1-anexos/inventario-base-de-datos.mjs`): aplica las 19 migraciones en memoria y lista funciones, permisos y políticas | Base del apartado 7.3 y de B2 |
| `npm run db:test` | Ejecutado | 308 correctas, 0 fallidas |
| CodeQL | **No usado** | Su licencia gratuita solo cubre código abierto e investigación académica. Reportia es código privado y comercial |
| `/security-review` | **No lanzado** | Revisa solo los cambios pendientes de la rama, que aquí son los de la portada (los lleva otro chat). En su lugar se ha hecho la revisión manual de todo el repositorio |
| Pruebas de ataque en local (scripts que reproducen A1-A3) | **No ejecutadas en esta ronda** | Por eso esos hallazgos están «confirmados por lectura del código», no «probados». Se proponen para la ronda 2 |
| Checklist OWASP ASVS 5.0, nivel 2 | Repasado por capítulos | Apartado 6 |

### 2.1 Revisión previa de las skills (antes de usarlas)

- `fp-check`, `sharp-edges` y `variant-analysis` solo son instrucciones y plantillas. `fp-check` trae un hook (`hooks/hooks.json`) que comprueba que el informe esté completo. No se ha instalado, así que no se ha ejecutado.
- `insecure-defaults` son listas de patrones (JSON y Markdown) y un flujo en JavaScript para una herramienta que no está disponible.
- `static-analysis/semgrep`: `run-scans.sh` solo lanza `semgrep` con `--metrics=off` y hace `git clone --depth 1` de repositorios públicos de reglas. No envía el código a ninguna parte. Por defecto escribiría los resultados dentro del repositorio; aquí se han guardado en una carpeta temporal.
- `supply-chain-risk-auditor`: Python estándar, sin dependencias. Nunca instala ni ejecuta paquetes. Envía la lista de nombres y versiones de nuestras dependencias (que son públicas) a osv.dev, npm, deps.dev, scorecard.dev y la API de GitHub. Si `gh` tiene sesión, usa su token solo contra la API de GitHub (aquí `gh` no está instalado).
- `codeql`: no se ha usado, por la licencia (ver la tabla).
- Instalados con Homebrew: `gitleaks`, `osv-scanner` y `semgrep`. `uv` y Python 3.14 ya estaban.

---

## 3. Tabla de hallazgos

Gravedad: **crítica** (rompe la confidencialidad que promete el canal), **alta** (fallo serio con un caso real), **media**, **baja**. Esfuerzo: **S** (horas), **M** (1-3 días), **L** (1-2 semanas).

fp-check: **Confirmado** = la cadena entera está leída en el código o en la documentación oficial, desde quien ataca hasta el daño, y ninguna protección la corta. **Probable** = depende de una configuración que no se ve desde el repositorio. En esta ronda ninguno se ha ejecutado contra una base de datos.

| n.º | Gravedad | Qué es | Cómo se explota (resumen) | Archivo y línea | Arreglo propuesto | Esfuerzo | fp-check |
|---|---|---|---|---|---|---|---|
| C1 | **Crítica** | La persona denunciada, si tiene acceso al panel, lee la denuncia (y la identidad, si es identificada) y no se la puede apartar del caso | Un administrador lo ve todo. Un gestor ve todo lo de sus temas. Abre el caso, lee la descripción y los mensajes y pulsa «Ver identidad» | `010:76-96` (`can_access_category`: superadmin = todo), `011:300-318` (`get_reporter_identity`) | Exclusión por caso (lista de personas apartadas, que la base de datos aplica en RLS y en las funciones). Al denunciar, opción «excluir a…» o «solo al Responsable». Aviso al resto cuando alguien apartado intenta entrar | L | Confirmado |
| A1 | **Alta** | Hay respuestas que dicen si un código existe **sin pasar por el freno** (variante viva de A1-1) | `submit_complaint` responde `code-conflict` si la huella ya existe, y no cuenta el intento. Cuando la empresa llega a 50 denuncias por hora, un código que no existe da `rate-limited` y uno que sí existe sigue dando `code-conflict`, sin crear nada. Lo mismo pasa con el INSERT directo y con `register_complaint` | `019:374-381`, `019:145-153`, `008:143-144` (INSERT directo aún abierto), `012:233` `register_complaint` (sin tope de canal) | La existencia de un código no se revela nunca: idempotencia con un id de envío y no con el código, y error genérico que cuenta como intento. Cerrar el INSERT directo. Códigos de 16 caracteres (apartado 5) | M | Confirmado |
| A2 | **Alta** | El freno de códigos es **global**: 1.000 fallos en 10 minutos bloquean el portal de seguimiento de todas las empresas | Unas 1,7 consultas por segundo con códigos inventados mantienen el portal en «demasiados intentos» para todos, indefinidamente. Tampoco quien tiene un código bueno puede entrar | `014:149-161`, `019:231,256,281,320` | Freno por empresa (las consultas llevan la dirección del canal) y prueba de trabajo que se endurece en lugar de bloquear (apartado 5) | M | Confirmado |
| A3 | **Alta** | Se puede **cerrar el canal de una empresa**: tope de 50 denuncias por hora y empresa, sin sesión ni captcha | Basta conocer el id de la empresa (lo devuelve `get_organization_by_slug` a cualquiera). 50 envíos por hora y quien denuncia de verdad recibe «inténtalo más tarde». Además, cada envío manda avisos y admite 5 archivos de hasta 100 MB (unos 25 GB/hora) | `014:52-61`, `010:598`, `notify/index.ts` | No rechazar nunca una denuncia: por encima del umbral, aceptarla en una bandeja de «posible spam», sin aviso uno a uno, y con prueba de trabajo para enviar. Tope de bytes por empresa y hora. Bajar el tamaño máximo | M | Confirmado |
| A4 | **Alta** | **Horas exactas**: la denuncia y cada mensaje guardan la hora al microsegundo, el panel y el PDF enseñan horas y minutos, y el aviso por correo sale al instante | Quien gestiona mira la hora (o la del correo de aviso) y la cruza con los registros de la empresa: VPN, proxy, fichajes, quién tenía el ordenador encendido | `Caso.jsx:328`, `adminKit.jsx:23`, `exportV2.js:890,982,1004`, `notify/index.ts` (envío inmediato), columnas `created_at` de `complaints`, `messages` y `audit_logs` | En el panel, la API y los PDF, solo el día para lo que llega de quien denuncia. La hora exacta solo para Reportia, si hace falta en un litigio. Avisos con retraso aleatorio o resumen diario. Decirlo en el canal | M | Confirmado |
| A5 | **Alta** | En una denuncia anónima, **PDF, Word, Excel, PowerPoint, vídeo, audio, `.eml`/`.msg` y ZIP se suben con sus metadatos** | Quien gestiona descarga el `.docx` y mira «Autor» y «Modificado por» (o el GPS de un vídeo, o las cabeceras `Received` de un `.eml`, con IPs y remitente) | `cleanImage.js:8-13` (solo fotos), `Denuncia.jsx:99-104` | Limpiar en el navegador lo que se pueda (Office: `docProps/*`, comentarios y control de cambios; PDF: Info y XMP). Bloquear o convertir lo que no (`.eml`/`.msg`, ZIP y vídeo en anónimas, o aviso claro con «haz una captura»). Repetir la limpieza en el servidor | L | Confirmado |
| A6 | **Alta** | **No queda registro de quién abre, lee o exporta** un caso. Tampoco de quién borra archivos del almacén | Un gestor lee todos los casos de su tema y exporta el PDF o el Excel. En el historial no consta nada (solo `identity_viewed` al ver la identidad) | `supabase.js:470-479,550-571` (lecturas sin anotar), `Caso.jsx:276-283` (exportar), `010:584-590` (borrado sin anotar) | Las lecturas y exportaciones, por funciones que anotan (`open_case`, `export_case`). Disparador o función que anote el borrado de archivos. Panel de «accesos» para el Responsable | M | Confirmado |
| A7 | **Alta** | **Supresión sin control**: un administrador (o un gestor con «eliminar») suprime un caso en cualquier momento, con un motivo de 5 letras, y puede borrar archivos sueltos sin dejar rastro | La persona denunciada suprime su propio caso o borra las pruebas | `014:447-455`, `010:584-590`, `supabase.js:443-458` | Supresión con dos personas (o con un plazo de gracia y aviso al Responsable). Prohibida con la investigación abierta, salvo el art. 32.3 justificado. Borrar archivos solo con la supresión, nunca uno a uno | M | Confirmado |
| M1 | Media | La 019 **ya está en producción** (19 oct): las huellas nuevas llevan secreto, pero las antiguas solo se reescriben **cuando alguien consulta** ese código. Una denuncia que nadie consulta se queda con la huella sin secreto | Con una copia de la tabla (una fuga, un volcado), las huellas antiguas que aún no se han reescrito se revientan probando las 2^40 combinaciones, en minutos | `010` `code_hash`, `019:192-215` (reescritura perezosa) | Reescribir **todas** las huellas antiguas de golpe (`tracking_key(tracking_hash)` sobre lo que haya): no hace falta el código. Se cierra en la ronda 2 (migración 020) | S | Confirmado |
| M2 | Media | `private.complaints_copia_019` **ya existe en producción** (19 oct, 5 denuncias de prueba): es una copia entera de la tabla de denuncias (nombre, correo, teléfono), y la supresión del art. 32 no llega ahí | Hoy, lo que se suprima sigue completo en esa copia hasta que alguien la borre a mano | `rollback/019_copia_antes.sql:9` | La copia solo era para la vuelta atrás de la 019, que ya está estable. **Borrarla** (`drop table private.complaints_copia_019;`) cuando M1 esté hecho. SQL en `QUE_TIENE_QUE_HACER_DAVID.md` de la ronda 2 | S | Confirmado (existe en producción) |
| M3 | Media | El enlace a la **autoridad externa** que ve quien denuncia lo decide la empresa: vale cualquier dirección `https` | La empresa (o un administrador malintencionado) lo apunta a una página que imita a la autoridad y recoge las denuncias externas | `011:347`, `Entrada.jsx:117` | Lista cerrada de autoridades oficiales (AIPI y las autonómicas), con su dirección fija en el código | S | Confirmado |
| M4 | Media | Alta de empresas **sin captcha y sin confirmar el correo**: la empresa y su `/canal/<nombre>` se crean al registrarse | Alguien registra «Acme» antes que Acme y tiene un `/canal/acme` que parece oficial. Además, sirve para tener empresas propias desde las que lanzar A1 y A3 | `014:542-574` (el disparador crea la empresa al insertar el usuario), Turnstile apagado (`QUE_TIENE_QUE_HACER_DAVID.md` §7) | Encender Turnstile. Crear la empresa al **confirmar** el correo. Revisión manual o aviso para nombres de marcas conocidas | S-M | Confirmado (Turnstile apagado: según la documentación del proyecto) |
| M5 | Media | **Pruebas falsas**: durante 2 horas, cualquiera que conozca el id de una denuncia puede añadirle archivos sin sesión, como si fueran de quien denunció | El gestor recibe el aviso con el enlace `/admin/complaints/<id>` y sube, con la clave pública, archivos a esa denuncia | `010:555-582,591-594` | Atar la subida a un secreto que solo tiene quien envía (por ejemplo, un token de subida que devuelve `submit_complaint`) | M | Confirmado |
| M6 | Media | Para ver la **identidad** basta con el permiso «ver» del tema. No hay un permiso propio ni hay que dar un motivo | Cualquier gestor con «ver» en ese tema descubre quién denunció. Queda anotado, pero ya está hecho | `011:310` | Permiso aparte («ver identidad») y motivo obligatorio. Avisar al Responsable | S-M | Confirmado |
| M7 | Media | Adjuntos **sin antivirus**. El tipo lo declara quien sube y la extensión es libre. Hasta 100 MB. Se abren en una pestaña | Un `.doc` con macros o un archivo con la extensión cambiada llega al ordenador del gestor | `supabase.js:183-192`, `010:598`, `015` (lista de tipos), `Caso.jsx:274` | Análisis con ClamAV en una función de servidor antes de dejar descargar. Comprobar los primeros bytes contra el tipo. Descarga forzada con el nombre neutro | M | Confirmado |
| M8 | Media | Las funciones de servidor cargan `supabase-js` de `esm.sh` **sin versión fija** (`@2`) y `deno.lock` no está en el repositorio | Si esm.sh o el paquete se ven comprometidos, la función que tiene la clave de servicio ejecuta su código en el siguiente despliegue | `notify/index.ts:16`, `invite-manager/index.ts:1`, `delete-manager/index.ts:1`, `ai-assist/index.ts:16`, `.gitignore:19` | `npm:@supabase/supabase-js@2.x.y` con versión exacta y `deno.lock` en el repositorio | S | Confirmado |
| M9 | Media | La **Preview de Vercel usa la base de datos de producción** | Una rama sin revisar, publicada en una dirección `*.vercel.app` (pública si no hay protección), trabaja con datos reales | `QUE_TIENE_QUE_HACER_DAVID.md` §3 («la Preview usa la base de datos de producción») | Un proyecto de Supabase aparte para las Preview y la protección de despliegues de Vercel | S (configuración) | Confirmado (documentación del proyecto). Que la Preview sea pública: Probable |
| M10 | Media | **«No guardamos la IP» no es exacto**: Supabase, Vercel y Cloudflare la registran | Reportia (no la empresa cliente) puede cruzar la IP con la hora de `rpc/submit_complaint` durante la retención | Documentación oficial (apartado 4) | Texto exacto en el canal y en la privacidad. Plan con la retención mínima. Ningún «log drain». Recomendar Tor o una red ajena | S | Confirmado (documentación oficial) |
| M11 | Media | **Conservación y borrado**: la supresión es manual (si nadie la hace, el caso se queda para siempre), no hay baja de empresa, y quedan archivos huérfanos si se llama a la función sin borrarlos antes | Pasan los 3 meses del art. 32.4 y el caso sigue entero. Una empresa se da de baja y sus denuncias se quedan | `014:492` (`retention_due` solo avisa), `014:447-` (no borra archivos), `005` (sin `on delete cascade`) | Tarea programada (`pg_cron`) que suprima o avise con escalado. Procedimiento de baja (art. 28 RGPD). Borrar los archivos dentro de la supresión (función de servidor) | M | Confirmado |
| B1 | Baja | **Con solo la contraseña** (sin el segundo paso) se leen los datos de la empresa (facturación, Responsable) y los nombres y roles del equipo | Contraseña robada → lista del equipo y datos de la empresa | Inventario: `organizations` y `profiles` sin restricción `aal2` en SELECT | Restrictiva `aal2` también en SELECT (salvo el propio perfil) | S | Confirmado |
| B2 | Baja | `anon` y `authenticated` conservan **todos los privilegios de tabla** por defecto de Supabase (SELECT, UPDATE, DELETE y TRUNCATE en todas). Solo RLS los frena | Si una política se rompe en una migración futura, no hay segunda barrera | `ronda1-anexos/inventario-base-de-datos.txt` | `revoke all` de las tablas a `anon`; a `authenticated`, solo lo que use el panel | S | Confirmado (defensa en profundidad) |
| B3 | Baja | El registro de actividad se puede reescribir con la clave de servicio o desde el editor SQL, sin que se note | Alguien de Reportia, o quien robe la clave, cambia el historial | `audit_logs` sin cadena de huellas | Cadena de huellas (cada entrada firma la anterior) y copia diaria de la última huella fuera de Supabase | M | Confirmado |
| B4 | Baja | El canal se puede meter en un iframe de **cualquier** web `https` | Una web falsa encuadra el canal real con capas por encima (clickjacking) | `vercel.json:37` (`frame-ancestors https:`) | Lista de webs por empresa (cabecera generada) o abrir siempre en pestaña nueva | M | Confirmado |
| B5 | Baja | En el dominio propio (`canal.acme.es/`), Sentry, si tiene DSN, se carga antes de redirigir al canal. El canal permite conectar con `*.sentry.io` sin necesitarlo | Un error en esa primera carga se enviaría a un tercero | `main.jsx:10-11`, `App.jsx:58-61`, `vercel.json:37` | No cargar Sentry si `!isOwnHost()`; quitar Sentry del CSP del canal | S | Confirmado (solo si hay DSN) |
| B6 | Baja | `notify` compara el secreto con `!==`, que no tarda siempre lo mismo | Adivinar el secreto midiendo tiempos por internet: muy difícil | `notify/index.ts:43` | Comparación de tiempo constante | S | Probable (difícil de aprovechar) |
| B7 | Baja | Un administrador puede quitar del equipo a otros administradores (solo se protege el último) | Un administrador denunciado echa al otro (o al Responsable) | `delete-manager/index.ts:41-46` | Quitar a un administrador, solo con otro administrador o con Reportia | S | Confirmado (queda anotado: `member_removed`) |
| B8 | Baja | Con empresas creadas en masa: 20 invitaciones al día cada una, y CORS `*` sin `ALLOWED_ORIGINS` | Envío de correos con la marca Reportia a direcciones ajenas | `invite-manager/index.ts:56-60`, `_shared/cors.ts:9` | Turnstile en el alta (M4) y tope global diario. Poner `ALLOWED_ORIGINS` | S | Confirmado |
| B9 | Baja | GitHub Actions por etiqueta (`@v4`), no por hash | Si se compromete la acción, la integración ejecuta otro código (no tiene secretos) | `.github/workflows/ci.yml:21,22,36,37,48` | Fijar por hash | S | Confirmado |
| B10 | Baja | 11 avisos de dependencias | Ninguno se puede explotar hoy: el de React Router es del modo RSC (no se usa), DOMPurify solo si jsPDF pinta HTML (no se usa), Vite y esbuild solo en desarrollo | `ronda1-anexos/npm-audit.json` | `npm audit fix` sin saltos de versión mayor; Vite 6 o superior en una tarea aparte | S | Confirmado |
| B11 | Baja | El justificante se guarda como `XXXX-XXXX.pdf` en Descargas | En un ordenador de la empresa, quien lo revise encuentra el código | `receipt.js:83` | Aviso «guárdalo en un dispositivo tuyo», que ya se da en parte | S | Confirmado |
| B12 | Baja | La configuración de Supabase Auth **no se puede comprobar** desde el repositorio: contraseña mínima (8 solo en el navegador), confirmación del correo, cambio de correo seguro, duración de las sesiones, límites por IP | Depende de lo que haya en el dashboard | `V2Signup.jsx:50`, `Contrasena.jsx:134` | Lista de ajustes recomendados (apartado 7) | S | Probable |
| B13 | Baja | Trampas de diseño (sharp-edges): cada función nueva de `public` nace ejecutable por `anon`; hay dos «¿viene del navegador?» que se comportan distinto | Una migración futura olvida el `revoke` o usa el que no toca | `is_client_request` (`010`) frente a `api_role_is_client` (`014:13-18`); `auth.uid() is not null` en `017`/`018` | `alter default privileges ... revoke execute ... from public, anon` y una sola función | S | Confirmado |

---

## 4. Detalle de los hallazgos críticos y altos

### C1 · Denuncia contra alguien del panel

- **Cadena:** `can_access_category` devuelve `true` para cualquier superadmin en cualquier tema (`010:83`). Las políticas de `complaints`, `messages`, `attachments` y `audit_logs`, y las funciones `get_reporter_identity`, `anonymize_complaint` y `extend_response_deadline`, se apoyan en ella. No existe ninguna lista de «personas apartadas de este caso».
- **Paso a paso:** (1) llega una denuncia por acoso contra la directora de RR. HH., que administra el panel; (2) recibe el aviso por correo, como el resto de administradores (`notify`); (3) abre el caso y lee descripción, mensajes y adjuntos; (4) si la denuncia es identificada, pulsa «Ver identidad». Queda `identity_viewed` en un historial que ella misma puede leer; (5) puede suprimir el caso (A7) o quitar el acceso a los demás gestores (`set_manager_permissions`).
- **Ley:** art. 5.2 b y 32-33 de la Ley 2/2023 (confidencialidad, acceso limitado, preservar la identidad frente a la persona afectada). Es un punto de diseño para decidir con el abogado (añadirlo a `REVISION_LEGAL.md`).
- **fp-check:** atacante con acceso legítimo (insider). Ninguna protección del entorno lo corta. Impacto directo en la confidencialidad. Confirmado.

### A1 · Oráculo del código de seguimiento sin freno (variantes de A1-1)

- **Raíz común:** el sistema responde distinto cuando una huella ya existe, y esa respuesta no pasa por `code_attempts`.
  1. `submit_complaint` (`019:374-381`): lanza `code-conflict` si la huella existe (con secreto o sin él). No llama nunca a `code_attempts_blocked()` ni a `code_attempt_failed()`. La pueden ejecutar `anon` y `authenticated` (`019:407`).
  2. Cuando la empresa elegida ya tiene 50 envíos en la última hora, un código inexistente acaba en el disparador `complaints_web_rate_limit` (`014:52-61`) con `rate-limited` y no se guarda nada. Uno que existe da `code-conflict` antes de llegar a insertar. Desde ahí, la comprobación sale gratis y sin dejar filas.
  3. Variantes: el INSERT directo en `complaints` sigue permitido para `anon` (`008:143-144`; el disparador `019:145-153` y el índice único responden «duplicado»). `register_complaint` (con sesión y segundo paso, en la empresa propia del atacante) responde «duplicado» y no tiene el tope de 50, porque no es del canal web.
- **Qué da un acierto:** el estado, el tema y las fechas del caso, **toda la conversación**, escribir como si fuera quien denunció y pedir la reunión (`019:220-340`). No da la descripción ni los adjuntos.
- **Cálculo** (alfabeto de 32 símbolos, 8 caracteres: N = 32^8 ≈ 1,1 × 10^12):

| Vía | Ritmo | 1.000 denuncias activas | 10.000 denuncias activas |
|---|---|---|---|
| Portal, con el freno global (1.000 fallos / 10 min ≈ 144.000 intentos al día) | máximo permitido | 0,013 % al día · 4,7 % en un año · un acierto cada ~21 años | 0,13 % al día · 3,9 % en 30 días · 38 % en un año · uno cada ~2,1 años |
| `submit_complaint` (sin freno) | 100 peticiones/s | 21 % en 30 días · 94 % en un año · uno cada ~127 días | 90 % en 30 días · uno cada ~13 días |
| `submit_complaint` (sin freno) | 1.000 peticiones/s | uno cada ~13 días | uno cada ~1,3 días |
| Ataque dirigido a **un** código concreto | 1.000 peticiones/s | ~17 años de media | ~17 años de media |

  Por el portal, quien ataca se come todo el cupo global y bloquea a todo el mundo mientras dura (A2): no pasa desapercibido. Por `submit_complaint` no hay ningún límite propio: el ritmo real depende de lo que aguante la plataforma, y eso se medirá en la ronda 2. El ataque no elige víctima: acierta códigos al azar de empresas al azar. Contra un caso concreto (la persona denunciada que busca «su» denuncia) no es viable.
- **Ataques de tiempo:** no aportan nada, porque la respuesta ya dice si el código existe. La búsqueda va por índice y el HMAC tarda lo mismo con aciertos y con fallos.
- **fp-check:** quien ataca controla `p_hash` por completo; la empresa la puede crear él mismo (M4) o puede usar cualquier id público. La cuenta está hecha arriba. Ninguna protección del entorno lo corta (el canal no tiene captcha). Confirmado por lectura del código. La prueba ejecutable queda para la ronda 2.

### A2 · El freno global bloquea a todos

- `code_attempts_blocked()` suma los fallos de los últimos 10 minutos de **todo Reportia** (`014:149-161`), y las cuatro funciones del portal se niegan a responder cuando llega a 1.000 (`019:231,256,281,320`).
- **Paso a paso:** unas 100 consultas por minuto con códigos inventados mantienen el portal cerrado para todas las empresas. Quien denunció no puede leer la respuesta ni contestar, tampoco con un código bueno.
- Ya constaba como duda legal (`REVISION_LEGAL.md` n.º 26: «unos minutos»). En realidad dura **mientras el atacante quiera** y afecta a todos los clientes a la vez.
- **fp-check:** cuesta muy poco, afecta a otras empresas y deja sin uso un canal obligatorio por ley. Confirmado.

### A3 · Cerrar el canal de una empresa

- `complaints_web_rate_limit` (`014:52-61`) rechaza el envío 51 de la hora en cada empresa. El id de la empresa lo da `get_organization_by_slug` a cualquiera.
- **Paso a paso:** 50 envíos por hora (un script que reparte las peticiones) y, durante esa hora, quien denuncia de verdad recibe «inténtalo dentro de una hora». La bandeja se llena de casos falsos, cada uno manda su aviso, y cada denuncia admite 5 × 100 MB de adjuntos (`010:598`).
- Además, la denuncia de verdad puede quedar enterrada entre las falsas, y la ley sigue contando sus plazos.
- **fp-check:** Confirmado.

### A4 · Horas exactas

- La base de datos guarda la hora al microsegundo (`created_at` de `complaints`, `messages` y `audit_logs`). Cualquier gestor la lee entera por la API. El panel la enseña en horas y minutos (`Caso.jsx:328`, `adminKit.jsx:23`), y también el PDF de un caso (recepción, mensajes y registro: `exportV2.js:890,982,1004`).
- `notify` manda el correo en cuanto se inserta la denuncia o el mensaje. La cabecera `Date` del correo da la hora al segundo.
- El Excel ya se queda en el día (`exportV2.js:226`), y eso está bien.
- **fp-check:** quien gestiona tiene acceso legítimo y la empresa tiene los registros con los que cruzarlo. Es una vía real para desenmascarar a quien denuncia. Confirmado.

### A5 · Metadatos de los adjuntos

- `cleanForAnonymous` solo toca imágenes (`cleanImage.js:8-13`). El resto sale tal cual. El formulario lo avisa (`translations.js:289`, «se envían tal cual»), pero la mayoría de la gente no sabe que un `.docx` lleva su nombre en «Autor».
- Lo que delata: Office (`docProps/core.xml`: `dc:creator`, `cp:lastModifiedBy`; `app.xml`: `Company`; autores de comentarios y de cambios), PDF (`/Author`, `/Creator`, XMP), vídeo y audio de móvil (GPS, modelo del dispositivo), `.eml`/`.msg` (todas las cabeceras: remitente, IPs, servidores) y ZIP (nombres y fechas de lo que lleva dentro).
- **fp-check:** Confirmado.

### A6 · Sin registro de lecturas ni exportaciones

- Las lecturas van directas a las tablas (`supabase.js:470-479,550-571`) y no anotan nada. Exportar el PDF o el Excel tampoco anota nada. Borrar un archivo del almacén (`010:584-590`) tampoco.
- Los registros de la API de Supabase (1-7 días, apartado 7.1) solo los ve Reportia y desaparecen enseguida.
- **fp-check:** Confirmado.

### A7 · Supresión y borrado de pruebas sin control

- `anonymize_complaint` (`014:447-`) pide segundo paso, permiso de «eliminar» y un motivo de 5 caracteres. No mira ni plazos ni el estado del caso, y la hace una sola persona.
- Desde el navegador, quien tiene «eliminar» puede borrar archivos uno a uno (`010:584-590`) sin suprimir el caso y sin que quede rastro (A6).
- **fp-check:** Confirmado.

---

## 5. Diseño propuesto para el código de seguimiento

Objetivo: que adivinar códigos deje de compensar, sin terceros, sin guardar IPs, sin poder bloquear a todo el mundo y **sin invalidar ningún código que ya exista**.

1. **Ninguna respuesta revela si un código existe** (cierra A1):
   - `submit_complaint` deja de responder `code-conflict`. La repetición del mismo envío (B-9) se reconoce con un id de envío aleatorio que manda el navegador (columna única), no con el código.
   - Si aun así una huella choca, se responde con el error genérico de siempre y se cuenta como intento fallido.
   - Se quita el INSERT directo de `anon` en `complaints` y `audit_logs` (la vía de respaldo para cuando falta la 014). Y `register_complaint` genera el código en el servidor.
2. **Códigos nuevos de 16 caracteres** (`XXXX-XXXX-XXXX-XXXX`, 80 bits): con 10.000 denuncias y 1.000 peticiones por segundo, la probabilidad de acertar uno en un año es del orden de 10^-10. Es la defensa de verdad. Lo demás solo encarece.
3. **Freno por empresa, no global** (cierra A2): las funciones del portal reciben la dirección del canal (quien denuncia siempre entra por `/canal/<empresa>/consulta`) y solo buscan entre las denuncias de esa empresa. El recuento de fallos va por empresa. Un ataque solo afecta a esa empresa, y solo puede acertar códigos de esa empresa.
4. **Prueba de trabajo en el navegador**, sin terceros ni IP (encarece A1-A3 sin bloquear):
   - El servidor da un reto (aleatorio, de un solo uso, que caduca en 2 minutos y se guarda en una tabla).
   - El navegador busca, en un Web Worker, un número que con el reto dé un hash con *d* bits a cero. El CSP ya permite `worker-src 'self' blob:`.
   - La consulta solo se atiende con el reto resuelto.
   - *d* sube con los fallos de la empresa y con los globales: no se bloquea nunca, solo cuesta más. Así nadie puede impedir que entre quien tiene su código.
   - Hay piezas abiertas que se pueden alojar en Reportia, como ALTCHA.
   - Límite: con tarjetas gráficas, la prueba de trabajo solo encarece. Por eso va **junto con** los códigos largos y no en su lugar.
5. **Migración sin invalidar nada:**
   - a) ejecutar la 019 y, después, reescribir **todas** las huellas antiguas de una vez con `tracking_key(tracking_hash)` (es exactamente lo que calcula `find_complaint_by_code`) (M1);
   - b) los códigos de 8 caracteres se siguen aceptando, distinguidos por la longitud, con un freno más estricto;
   - c) los códigos nuevos salen con 16;
   - d) en «El meu cas», ofrecer cambiar a un código largo (el nuevo se enseña una sola vez y el antiguo deja de valer);
   - e) mantener un tiempo las funciones con la firma de ahora, para los navegadores con la versión anterior en caché.

---

## 6. OWASP ASVS 5.0, nivel 2 (repaso por capítulos)

| Capítulo | Estado | Comentario |
|---|---|---|
| V1 Codificación y saneamiento | Cumple | React escapa todo. El único HTML a mano (`Compartir.jsx:259`) se escapa en `snippet()`. Los PDF van por jsPDF (texto). El Excel guarda texto, no fórmulas (A2-10, ya comprobado). Los correos solo usan variables de Supabase |
| V2 Validación y lógica de negocio | **No cumple** | A1, A2, A3, M4 (frenos y abuso) |
| V3 Seguridad del frontend | Parcial | CSP estricto, HSTS, `nosniff`, COOP y `Permissions-Policy`: bien. Falta B4 (iframe) y B5 |
| V4 API y servicios web | Parcial | RLS en todas las tablas. Falta B2 (privilegios por defecto) |
| V5 Archivos | **No cumple** | A5, M5, M7 |
| V6 Autenticación | Parcial | Segundo paso obligatorio y comprobado en la base de datos. Pendiente: Turnstile, contraseña mínima en el servidor, ajustes de Auth (B12) |
| V7 Sesiones | Cumple en lo visible | `sessionStorage`, 30 minutos de inactividad, cierre real. La duración de los tokens de refresco depende de Supabase (B12) |
| V8 Autorización | **No cumple** | C1, M6, A7. El aislamiento entre empresas está bien (apartado 7.3) |
| V9 Tokens | Cumple | El `aal` se lee de un JWT validado (`getUser` en las funciones y `auth.jwt()` en la base de datos) |
| V10 OAuth/OIDC | No aplica | |
| V11 Criptografía | Parcial | Código con generador seguro y sin sesgo. HMAC con secreto en Vault (019). Falta ejecutarla y reescribir todo (M1) |
| V12 Comunicaciones | Cumple | HTTPS y HSTS de dos años |
| V13 Configuración | Parcial | M8, M9, B9 y Auth sin documentar (B12). Sin secretos en el repositorio ni mapas de código publicados |
| V14 Protección de datos | **No cumple** | A4, M2, M10, M11 |
| V15 Arquitectura y código seguro | Parcial | B13 |
| V16 Registro y errores | **No cumple** | A6, B3. Los errores no filtran datos: las funciones responden con códigos genéricos |
| V17 WebRTC | No aplica | |

---

## 7. Respuestas a las preguntas del encargo

**7.1 Desenmascarar a quien denuncia**
- Horas exactas: sí (A4).
- Metadatos: las fotos se limpian bien; el resto no (A5). Los PDF y Excel que exporta el panel llevan `creator: Reportia` y, como autor, el nombre de la empresa (`exportV2.js:706,836`), nada de quien denuncia. El Excel, solo el día.
- Cabeceras de correo: los avisos no llevan contenido, solo la empresa y la referencia, pero dan la hora (A4). A quien denuncia no se le manda ningún correo.
- Qué se guarda de quien denuncia: en las anónimas, ni nombre, ni correo, ni teléfono, ni nombre de archivo, ni IP en la base de datos. Sí el texto, el idioma, el departamento, el «cuándo» y las horas.
- **Proveedores** (documentación oficial, consultada el 21 de octubre de 2026):
  - **Supabase**: los registros de la API (`edge_logs`) guardan `cf_connecting_ip` y `x_real_ip`, la ruta (`/rest/v1/rpc/submit_complaint`), la consulta, la hora y el navegador. Auth guarda `remote_addr`. Storage guarda `remoteAddress`. Retención: **1 día en Free, 7 en Pro, 28 en Team y 90 en Enterprise**. No se puede apagar ni acortar dentro de cada plan. Las copias diarias duran 7 días en Pro.
  - **Vercel**: los registros de ejecución duran 1 hora en Hobby y 1 día en Pro. Las peticiones de archivos estáticos solo constan si van a un «log drain» (no hay ninguno).
  - **Cloudflare**, que está delante de Supabase, también ve la IP.
  - Así que «no guardamos la IP» es cierto para la **base de datos** de Reportia, pero no para la infraestructura. Propuesta de texto (para el abogado): «Reportia no guarda tu dirección IP con la denuncia. Nuestros proveedores técnicos la registran durante un máximo de N días por seguridad, y la empresa no tiene acceso a esos registros. Para más privacidad, usa una red que no sea de la empresa o el navegador Tor.»
  - Para reducirlo: el plan con menos retención, ningún «log drain» y nada de analítica de Vercel. Y poner al día `REVISION_LEGAL.md` n.º 25.

**7.2 Código de seguimiento:** apartado 4 (A1, A2) y apartado 5. Con un código acertado se puede leer y escribir: la conversación, mensajes como si fuera quien denunció y la petición de reunión.

**7.3 Aislamiento entre empresas: bien.**
- Todas las políticas de las tablas con datos de casos filtran por `organization_id = current_org_id()`, y las de `messages`, `attachments` y `storage.objects` lo heredan de la RLS de `complaints`. Todas las funciones privilegiadas que reciben un id comprueban la empresa (`c.organization_id = current_org_id()`).
- Las 40 funciones `SECURITY DEFINER` fijan `search_path`.
- Las que `anon` puede ejecutar devuelven solo lo previsto. Las de uso interno (`tracking_key`, `find_complaint_by_code`, `find_auth_user`, `store_ai_summary`, el recuento de intentos) no las puede ejecutar nadie desde el navegador.
- Cambiar un id por el de otra empresa no da nada en ninguna tabla ni en ninguna función.
- Detalle en `ronda1-anexos/inventario-base-de-datos.txt`.

**7.4 Acceso y segundo paso: bien en la base de datos.**
- Las políticas restrictivas `aal2` cubren casos, mensajes, adjuntos, registro, permisos y almacén, y todas las funciones sensibles comprueban `is_aal2()`. Falta B1.
- Las funciones de servidor validan el token con `getUser()` antes de leer el `aal`.
- Invitaciones: ya no se pueden apropiar cuentas (A1-5, resuelto).
- Restablecer la contraseña y la enumeración de usuarios: las respuestas son genéricas.
- Caducidad de la sesión: 30 minutos de inactividad en el navegador. El resto, en Supabase.
- Turnstile: apagado hoy (M4).
- Riesgo inherente: quien tenga la contraseña de una persona invitada **antes** de que configure su segundo paso puede configurarlo él. Los administradores deberían comprobar que todo el equipo lo tiene.
- Ajustes de Supabase Auth que conviene confirmar en el dashboard (B12):
  - contraseña mínima de 12 y protección de contraseñas filtradas;
  - confirmación del correo obligatoria;
  - «Secure email change» y «Secure password change» activados;
  - límite de duración de las sesiones;
  - límites por IP en el acceso y en los códigos.

**7.5 Mal uso de un gestor o un administrador:** C1, A6, A7, M3, M6, B7. El registro de actividad no se puede borrar ni falsear desde el navegador: `audit_logs` no tiene políticas de UPDATE ni de DELETE, y el autor lo pone la base de datos. Sí se puede con la clave de servicio (B3). Las exportaciones masivas no tienen tope ni quedan registradas.

**7.6 Inyección: no se ha encontrado ninguna.** No hay SQL dinámico con datos de quien llama: los `execute` de la 019 usan parámetros y nombres fijos. Lo demás, en V1 del apartado 6.

**7.7 Adjuntos:**
- Tipos y tamaño: M7.
- Extensión falsa: el tipo lo declara quien sube y el almacén solo comprueba que esté en la lista.
- Enlaces firmados: duran 60 segundos (`supabase.js:589`) y solo los puede pedir quien ve el caso con el segundo paso hecho (`010` restrictiva en `storage.objects`). Quien tenga el enlace lo puede usar durante esos 60 segundos.

**7.8 Funciones de servidor:** autenticación, permisos y errores, bien. CORS `*` mientras no haya `ALLOWED_ORIGINS` (B8: no es la barrera). M8 y B6. `ai-assist` está apagada: si se enciende, el texto de quien denuncia puede intentar dar instrucciones a la IA (el resumen saldría manipulado), y el texto se envía a un tercero (`docs/IA.md`).

**7.9 Web y despliegue:**
- CSP y cabeceras, bien (B4, B5).
- La cabecera `Host` no se puede aprovechar: Vercel solo atiende los dominios dados de alta en el proyecto, y la dirección propia solo la pone Reportia (`017`).
- Las variables `VITE_` que llegan al navegador son públicas por diseño (URL y clave `anon` de Supabase, clave pública de Turnstile, DSN de Sentry).
- No se publican mapas de código: `dist/` no tiene ningún `.map`.
- La Preview usa producción: M9.

**7.10 Abuso:** A3, M4 y B8.

**7.11 Datos y ley:** M2 y M11, más las copias de Supabase (7 días en Pro, más PITR si está contratado). Lo suprimido sigue en las copias hasta que caducan, y conviene decirlo en el registro de actividades de tratamiento.

---

## 8. Lo que está bien hecho

- RLS en todas las tablas, con el segundo paso exigido **en la base de datos**, no solo en la pantalla. El aislamiento entre empresas es sólido.
- La identidad está fuera de la lectura normal: permisos por columna, y una función que anota cada consulta.
- El código de seguimiento sale de un generador seguro y sin sesgo, nunca se guarda en claro y, con la 019, su huella lleva un secreto en Vault.
- El servidor decide estado, prioridad, fechas, canal y autor del registro. El contenido de la denuncia y los mensajes no se pueden modificar.
- Todas las funciones privilegiadas fijan `search_path`, y las internas no se pueden llamar desde el navegador.
- Almacén privado, lista cerrada de tipos (sin SVG), cada archivo atado a la carpeta de su denuncia, 5 archivos como máximo, 2 horas para subirlos.
- Limpieza de fotos muy cuidada (redibujado y limpieza byte a byte), nombres neutros, `lastModified` a 0.
- El canal no carga nada de terceros: tipografía propia, sin Sentry, sin captcha, CSP estricto, `noindex`.
- El borrador solo vive en memoria y la sesión en `sessionStorage`. Cierre por inactividad.
- Ninguna clave en el repositorio ni en el historial. Sin mapas de código publicados. Integración continua sin secretos y con permisos de solo lectura.
- Los avisos por correo no llevan contenido. El Excel se queda en el día. Las invitaciones no se pueden apropiar cuentas ajenas.

---

## 9. Ronda 2: ataques recomendados y qué hace falta

Todo en local o en un proyecto de pruebas, **nunca** contra producción ni contra `reportia-canal.vercel.app`.

| Prueba | Qué comprobaría | Qué hace falta |
|---|---|---|
| **Supabase local** (`supabase start` + `supabase functions serve`) con las 19 migraciones y datos falsos | La base de todo: la misma pila que producción (PostgREST, GoTrue, Storage, Kong) | Docker Desktop y Supabase CLI. Copiar a `supabase/config.toml` los ajustes de Auth del dashboard (los tiene que mirar David). Cuentas de prueba con su semilla TOTP |
| **supabase-pentest-skills** contra ese Supabase local | Políticas y funciones expuestas, la API con la clave `anon`, el almacén, el segundo paso. Ejecutar A1, A2, A3 y M5 de verdad y medir a cuántas peticiones por segundo llegan | La pila local de arriba. Revisar antes las skills, como en el apartado 2.1 |
| **Strix** (agente de pentest, en Docker) contra la web compilada (`e2e/lib/vercel.mjs`) y la API local | Recorrido automático del canal y del panel: XSS, autorización, lógica, flujos de contraseña e invitación | Docker. Su clave de modelo de IA (que no reciba datos reales). La web servida en local apuntando al Supabase local |
| **OWASP ZAP** (base y activo, imagen `zaproxy/zap-stable`) | Cabeceras, CSP, CORS de las funciones, fuzzing de las RPC. Con sesión: un script que entre con usuario, contraseña y TOTP | Docker y el script de acceso con TOTP. Un par de horas de ajuste |
| Pruebas manuales de Auth en local | Configurar el segundo paso solo con contraseña, cambiar el correo sin el segundo paso, caducidad de los enlaces de invitación, límites por IP | La pila local con la misma configuración de Auth que producción |

Además: la **configuración real** (dashboard de Supabase: Auth, límites, Vault, copias, plan; Vercel: protección de las Preview, dominios, variables). David la puede pasar en capturas, sin claves.

---

## 10. Qué no se ha hecho en esta ronda

- No se ha cambiado ningún archivo fuera de `docs/seguridad/`. Ni commit, ni push.
- No se ha tocado producción, Vercel, Supabase ni `reportia-canal.vercel.app`.
- No se han ejecutado las pruebas de ataque de A1-A3 contra la base de datos en memoria. Siguen confirmadas por lectura del código.
- No se ha auditado `src/v2/landing` (la portada estática, que lleva otro chat), ni la parte de diseño.
