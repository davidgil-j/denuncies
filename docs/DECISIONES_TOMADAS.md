# Decisiones tomadas (encargo del 19 de octubre de 2026)

El encargo «Termina todo el plan del canal» me dio las decisiones que esperaban al jefe, con tres reglas: cada decisión de negocio en **un solo sitio** que se cambia en una línea, **siempre la opción reversible** y apuntarla aquí. Casi todas viven en [`src/v2/config/producto.js`](../src/v2/config/producto.js); las que no caben en una línea dicen dónde se cambian.

Cada una lleva: **qué** he elegido, **por qué**, **la alternativa** y **dónde se cambia**. Los números son los de `docs/PLAN_FASES.md`.

---

## Negocio

### n.º 77 · Nombre del producto
- **Qué:** **Reportia Canal**. Las tres propuestas, por orden:
  1. **Reportia Canal**: la marca que ya existe y lo que es, sin la palabra «denuncia» (n.º 90). Se lee igual en catalán, castellano e inglés.
  2. **Reportia Íntegra**: habla de integridad y cumplimiento, que es lo que compra la empresa; suena a producto de una familia («Reportia Íntegra», «Reportia …»).
  3. **Vela by Reportia**: un nombre propio corto («velar por»); da más juego para una familia de herramientas, pero hay que explicarlo.
- **Por qué la primera:** no hay que explicarla y no compromete la familia de nombres: si el jefe elige otra, cambia una línea.
- **Dónde se ve:** el título y la cabecera de la portada, la imagen al compartir (`og.jpg`). El canal de cada empresa **no lo enseña nunca** (es marca blanca).
- **Se cambia en:** `NOMBRE_PRODUCTO`. Después, `node scripts/og-image.mjs` para la imagen al compartir.

### n.º 78 · Dirección
- **Qué:** **canal.reportia.es** para la portada, el alta, el panel y los canales (`/canal/<empresa>`).
- **Por qué:** es la que pedía el encargo; un subdominio no toca la web de reportia.es.
- **Alternativa:** reportia.es/canal (obliga a tocar la web principal) o un dominio propio.
- **Se cambia en:** `DOMINIO` (portada, buscadores). Los enlaces, el QR y los correos usan la variable de Vercel `VITE_PUBLIC_ORIGIN`: mientras no se ponga, siguen con `reportia-canal.vercel.app`, que es la que funciona hoy. En `vercel.json`, las direcciones que acaban en `reportia.es` o `vercel.app` son «de Reportia»; cualquier otra es la dirección propia de una empresa y su raíz abre su canal.

### n.º 80 · Precios
- **Qué:** cuota **anual**, sin IVA:
  - **Esencial**, 390 €/año, hasta 249 trabajadores;
  - **Empresa**, 790 €/año, de 250 a 999;
  - **Corporativo**, a medida, de 1.000 en adelante o grupos.
  - Dos servicios opcionales:
    - **Puesta en marcha**, 290 €, un solo pago;
    - **Gestión externa**, desde 990 €/año.
  - 30 días de prueba sin datos de pago.
- **Por qué:** son las cifras del encargo. La cuota anual coincide con el pago anual que ya tiene el panel.
- **Alternativa:** pago único con mantenimiento (n.º 80 original).
- **Se cambia en:** `PLANES`, `PACK_PUESTA_EN_MARCHA`, `GESTION_EXTERNA_DESDE`, `DIAS_PRUEBA`. Los días de prueba tienen que coincidir con la migración 009 (`npm run test:logic` avisa si no).
- **Provisional:** qué incluye la puesta en marcha («lo configuramos contigo, preparamos la comunicación a la plantilla y formamos a quien lo va a gestionar») y la gestión externa («un equipo externo recibe las denuncias y hace el primer análisis; el Responsable del Sistema sigue siendo de tu empresa», art. 6 de la Ley 2/2023). Los he redactado yo: que el jefe confirme que eso es lo que se vende. Están en `src/translations-site.js` (`lp.packText`, `lp.extText`).

### n.º 85 · La multa
- **Qué:** se cita **como un dato más** en «¿Está obligada tu empresa?», con la frase legal ya aprobada («multa de 600.001 a 1.000.000 de euros para las personas jurídicas») y los enlaces al BOE de los arts. **63.1 g)** (no tener el sistema es infracción muy grave) y **65.1 b)** (la multa). No sale en el inicio ni en grande.
- **Por qué:** el encargo pide citar el artículo y no redondear; el FEEDBACK rechazó la multa como gancho.
- **Alternativa:** cifra destacada en el inicio.
- **Se cambia en:** `MULTA` (artículos y cifras; `npm run test:logic` comprueba que las cifras coinciden con el texto legal en los tres idiomas).

### n.º 79 · Pie «Con Reportia»
- **Qué:**
  - **Canal:** sale, pequeño (12 px), como un enlace más del pie y sin logo.
  - **Panel:** «Gestionado con Reportia» y el icono, al final de la página.
  - **PDF del caso y del informe:** «Generado con Reportia» y el icono (n.º 40).
  - **Por empresa:** Reportia lo quita a la que quiera con una columna nueva (`show_powered_by`, migración 018) que solo se cambia con la clave de servicio, nunca desde el panel.
- **Por qué:** es lo reversible en las dos direcciones: se quita a una empresa sin tocar el código, y a todas con una línea.
- **Alternativa:** quitarlo del canal (marca blanca total) o cobrarlo como extra.
- **Se cambia en:**
  - para todas las empresas, `PIE_CON_REPORTIA = false`;
  - para una, en Supabase › SQL: `update organizations set show_powered_by = false where slug = '…';`.

### n.º 68 · «¿Quieres una demostración?»
- **Qué:** por **correo** (`info@reportia.es`), sin formulario.
- **Por qué:** un formulario guarda datos personales: necesita los textos del abogado (n.º 67) y una migración. El correo no guarda nada.
- **Alternativa:** formulario propio o un enlace de reservas.
- **Se cambia en:** el correo, `CORREO_CONTACTO`. Pasar a formulario o a reservas es cambiar el enlace y el texto del cierre de la portada (`src/v2/landing/generar.js`, bloque «Cierre», y `lp.contactTitle` en `src/translations-site.js`): no cabe en una línea.

### n.º 69 · Buscadores
- **Qué:** **no indexar** todavía. Todo está preparado: `robots.txt`, `sitemap.xml` (la portada en sus tres idiomas), la etiqueta canónica y los enlaces entre idiomas.
- **Por qué:** canal.reportia.es aún no apunta a la web; indexar la dirección de Vercel dejaría en Google una dirección provisional.
- **Se cambia en:** `INDEXAR_WEB = true` (y desplegar) cuando canal.reportia.es funcione. El canal, el panel, el alta y la privacidad llevan «noindex» siempre.

### n.º 82 y n.º 89 · Las dos frases del audio
- **82 · «No sacarlo a producción hasta estar integrados con esta gente»:** lo interpreto como no anunciar la web (ni buscadores ni campaña) hasta cerrar el acuerdo con quien la vaya a vender o integrar. Por eso `INDEXAR_WEB` está apagado y no hay campaña. Nada del código depende de esto. **Hay que preguntarlo.**
- **89 · «lo de jai ja lo contraste»:** parece «eso ya lo he contrastado» (el jefe ya comprobó algo). No he encontrado a qué se refiere y no cambia nada del código. **Hay que preguntarlo.**

### n.º 81 · Campaña de correo
- No es código: necesita al abogado (LSSI, art. 21). No he hecho nada.

## Marca y aspecto

### n.º 83 · Reportia sobre fondo blanco
- **Qué:** **el icono oficial y el nombre en tinta** (panel, acceso, alta, privacidad, pestaña del navegador y PDF). Sobre fondo oscuro, el **logotipo verde oficial** (cabecera de la portada, correos, imagen al compartir).
- **Por qué:** el logotipo verde sobre blanco tiene poco contraste para texto pequeño; el icono se lee a cualquier tamaño.
- **Alternativa:** una versión oscura oficial del logotipo (no existe en `marca-reportia`).
- **Se cambia en:** `LOGO_SOBRE_BLANCO = 'logotipo'`.

### n.º 84 · Colores del producto
- **Qué:** el producto **sigue en azul** y cada canal toma la paleta de su empresa («Tu marca»). El verde de Reportia solo aparece en las marcas de Reportia (logo, icono).
- **Por qué:** el azul está aprobado y medido (contraste en las 8 paletas, claro y oscuro); pasar al verde obligaría a volver a medirlo todo.
- **Se cambia en:** dos sitios, porque el CSS no puede leer JavaScript:
  - `DEFAULT_PALETTE` en `src/v2/lib/brand.js`;
  - los colores de `:root` en `src/v2/ds.css`.

  `npm run test:logic` avisa si no coinciden.

### n.º 87 · Botones
- **Qué:** **esquinas de 10 px** en todo: canal, panel, alta, privacidad y portada.
- **Por qué:** lo propone `DIRECCION_VISUAL.md` (10–12 px frente a píldora); el producto ya lo usaba; solo el alta, la privacidad y la página «no encontrada» seguían en píldora.
- **Se cambia en:** `src/v2/site/site.css` (`.v2-site .v2-btn`).

### n.º 90 · La palabra «denuncia»
- **Qué:** **fuera del nombre** del producto. **Dentro de los textos**: «canal de denuncias» es como lo busca la gente y como lo llama el mercado. Los textos legales siguen diciendo lo que dice la ley.
- **Se cambia en:** `NOMBRE_PRODUCTO` (el nombre). Los textos, en las traducciones.

### Portada
- **Aspecto:** sigue la **dirección «azul noche»** aprobada (memoria de rechazos y `DIRECCION_VISUAL.md`). Es una foto a pantalla completa en el inicio y el cierre, con cabecera fina y poco texto. No lleva iconos de adorno, testimonios ni contadores.
- **Página estática:** una por idioma (`inicio-es.html`, `inicio-ca.html`, `inicio-en.html`), generada al compilar desde `src/v2/landing`. No necesita React. Se lee sin JavaScript, pinta a la primera (Lighthouse móvil 98–99) y nada salta al cargar (CLS 0).
- **Idioma por defecto:** **castellano**. Si el navegador está en catalán o en inglés, sale en ese idioma; `?lang=` manda siempre. Se cambia en `vercel.json` (reglas de «/») y en `landingLang()` de `scripts/vite-portada.mjs`.

### Vídeo
- **Qué:** grabación **real** de la demo con Playwright, montada con ffmpeg (`scripts/video-demo.mjs`):
  - **«Quien denuncia»** (30 s): del canal a «Mi caso».
  - **«Quien gestiona»** (42 s; 40 en el móvil): acceso con verificación, tablero, acuse, respuesta e historial.
  - **Uno por idioma (es, ca, en):** el producto grabado en ese idioma (el canal, el panel y lo que se escribe en la demo) y los subtítulos también. Cada portada carga solo los de su idioma: `denuncia-ca.mp4`, `gestion-en-movil.mp4`…
  - **Subtítulos:** escritos para cada idioma, no traducidos palabra por palabra. Usan las mismas palabras que el producto en ese idioma («costat», «tauler», «acusament de recepció»; «board», «two-step verification»).
  - **El caso que se abre en «Quien gestiona»:** los datos de ejemplo de la demo están en castellano. En las versiones en catalán y en inglés, ese caso se graba traducido (la descripción, «Dónde», «Cuándo», las personas implicadas y el idioma del acuse). Solo en la grabación: la demo no cambia.
  - **Formato, en máxima calidad:** H.264 con CRF 18 (preset slow, yuv420p, faststart), 30 fps y sin sonido.
    - **Ordenador:** 2560×1440. Es la página a 1280×640 con densidad 2, más la banda de subtítulos.
    - **Móvil:** 1080×1920, en **vertical**: enseña el producto en el móvil, porque una versión de ordenador encogida no se leería.
    - **Nitidez:** el texto del producto y los subtítulos se leen nítidos al pausar a pantalla completa en una pantalla retina. Se ha comprobado con fotogramas ampliados.
    - **Pósters:** la primera imagen de cada vídeo, a la misma resolución, en WebP de calidad 90. Ya llevan el primer subtítulo.
    - **Subtítulos:** en una banda propia debajo de la imagen, para que nunca tapen nada.
    - **Bucle:** el final se funde con el principio, así que no salta.
  - **Peso:** sin tope. Hoy van de 2,1 a 5,6 MB los de ordenador y de 2,7 a 4,2 MB los de móvil. El guion avisa si un vídeo pasa de 15 MB, y la prueba `portada` falla en ese caso.
  - **Carga:** con `preload="none"`, ningún vídeo se baja al abrir la página: solo cuando se ve. En pantallas de hasta 760 px se baja la versión del móvil.
  - **Los pósters, tampoco al abrir:** no van en el HTML. Los pone `landing.js` cuando la página ha terminado de cargar y faltan menos de una pantalla para llegar a los vídeos (en el móvil, el vertical). A esta resolución pesan unos 125 KB; si se pidieran al abrir, competirían con la foto del inicio (Lighthouse móvil bajaba a 92). Sin JavaScript no hay póster: se ve el reproductor con su botón. Así, la portada da Lighthouse móvil ≥ 98 y CLS 0.
  - **Reproducción:** solo cuando se ve. Con «reducir movimiento» no se reproduce solo.
- **Por qué uno por idioma:** quien lee la portada en catalán o en inglés ve el producto como lo verá su equipo. Antes, las tres portadas llevaban el vídeo en castellano.
- **Por qué máxima calidad:** lo pidió David (21 oct). Antes eran 1920×1080 y 720×1280, a menos de 2,5 MB cada uno. Además, la captura llegaba a la mitad de resolución y se ampliaba, así que el texto salía algo blando. Ahora Chromium (sin ventana) arranca con la densidad forzada y cada imagen se captura a la resolución final.
- **Alternativa:** un solo vídeo con subtítulos aparte (WebVTT) en cada idioma. Habría menos archivos, pero el producto seguiría saliendo en castellano.
- **Se cambia en:** `scripts/video-demo.mjs`.
  - **Subtítulos y lo que se escribe:** en `GUION`.
  - **Resolución y calidad:** en `FORMATS`.
  - **Volver a grabarlos:** con la demo en marcha, `node scripts/video-demo.mjs` (`--lang=ca` para un solo idioma).
  - **Las rutas:** en `VIDEOS` de `scripts/vite-portada.mjs`.

## Seguridad

### n.º 71 · Comprobación contra robots (Turnstile)
- **Qué:**
  - **Dónde:** solo en el **acceso al panel, el alta y «He olvidado la contraseña»**; el canal **nunca** la pide ni carga nada de Cloudflare.
  - **Sin la clave:** todo funciona como hoy.
  - **Con la clave:** el token viaja a Supabase Auth y el botón espera a tenerlo; sin token **no se deja pasar**.
  - **Si Cloudflare no carga** (en 12 s o con error): se dice con claridad, con un botón «Reintentar».
  - **Si el token caduca o Supabase lo rechaza:** se pide otro.
- **Por qué:** denunciar no puede depender de un tercero (encargo). Dejar pasar sin token cuando no carga anularía la protección.
- **Alternativa:** dejar pasar si no carga (lo de antes, en el acceso).
- **Se cambia en:** la clave pública `VITE_TURNSTILE_SITE_KEY` (Vercel) y la protección en Supabase Auth (ver `QUE_TIENE_QUE_HACER_DAVID.md`, el orden importa).

### n.º 74 · Huella del código de seguimiento con secreto
- **Qué:**
  - **La huella nueva:** desde la 019, la huella del código se calcula con un **secreto** (HMAC-SHA-256) que vive en Supabase Vault (o, si no hay Vault, en una tabla privada que nadie lee desde la web). Las denuncias nuevas se guardan así.
  - **Las de antes:** **se siguen aceptando**, y su huella se reescribe con secreto la primera vez que alguien entra con su código (sin cambiar la fecha del caso ni dejar rastro en el registro).
  - **Nada en bloque:** no se transforma ningún dato todo de golpe.
  - **Red de seguridad:** hay copia de seguridad previa (`supabase/rollback/019_copia_antes.sql`) y vuelta atrás (`019_atras.sql`).
- **Por qué:** sin el secreto, quien robara la tabla podría probar los códigos posibles contra las huellas. Con él, no. La reescritura perezosa no rompe ningún código ya entregado y se puede deshacer.
- **Alternativa:** transformar todas las huellas de una vez (irreversible: descartada).
- **Probado:** con `npm run db:test` (308 pruebas, con códigos viejos, nuevos y reescritos) y con la web contra una base de datos real (`e2e/base-real.mjs`), de la 015 a la 019 sobre los mismos datos.

## Producto

### n.º 41 y n.º 42 · Correos
- **Qué:**
  - **Diseño:** logo oficial en una banda verde petróleo, un solo botón y letra de 13 px como mínimo.
  - **Idioma:** **un idioma por correo**, el de quien se dio de alta o el de quien invita. Sin idioma: castellano con dos líneas cortas en catalán e inglés.
  - **Lema:** se quita «Canal de denuncias anónimas».
- **Por qué el lema:** la duda 23 del abogado dice que no es exacto (también se admiten denuncias con nombre). Quitarlo no afirma nada; ponerlo sí.
- **Se cambia en:** `scripts/correos.mjs` genera las cuatro plantillas (`src/v2/emails`); se pegan en Supabase.

### n.º 33 · Partir los archivos grandes
- **Qué:**
  - **Los textos de la web aparte** (`src/translations-site.js`): quien abre el canal ya no los descarga, un 44 % menos de texto.
  - **`Caso.jsx` no se parte:** no mejora nada para quien usa la web.
- **Resultado:**
  - con lo demás de este encargo (la tipografía se pide antes y lo que se baja por adelantado espera a que la página haya cargado), el canal pasa de 91–94 a **96** en Lighthouse móvil;
  - la portada, de 87 a 98–99.

### n.º 76 · Carpetas de herramientas en git
- **Qué:** **no las he sacado de git**.
- **Por qué:** `docs/AUDITORIA.md` (F-31) dice que `.claude` es tu carpeta y no se toca sin preguntarte. Además, sacarlas de git las borra del disco de quien haga `pull` después: eso no es reversible para los demás.
- **Dónde:** los comandos están en `QUE_TIENE_QUE_HACER_DAVID.md`.

---

## Seguridad · ronda 2 (21 de octubre de 2026)

Decisiones por defecto de los arreglos de seguridad (`docs/seguridad/AUDITORIA_RONDA1.md`). Se pueden cambiar; aquí queda qué se hizo y por qué, para poder discutirlo.

### C1 · Exclusión por caso
- **Qué:** si una denuncia va contra alguien del panel, esa persona no la ve. Quien denuncia aparta a quien quiera al enviar (ve la lista del equipo). El Responsable o un administrador también puede apartar, pero **nunca** puede devolver el acceso a quien apartó quien denunció. Tiene que quedar al menos una persona; si quien denuncia aparta a todos, la denuncia entra igual y el navegador ofrece el canal externo (AIPI).
- **Por qué así:** es lo que pide la confidencialidad del art. 32 (preservar la identidad frente a la persona afectada) sin inventar un flujo nuevo de aprobación.
- **Dónde:** migración `020_exclusion_por_caso.sql`. ⚖️ Expone al público los nombres del equipo del canal (duda nueva en `REVISION_LEGAL.md`).

### A1 y A2 · Código de seguimiento
- **Qué:** la existencia de un código no se revela nunca (idempotencia por «id de envío», no por el código; error genérico que cuenta como intento). Se cierra la inserción directa de denuncias. Freno **por empresa**, no global, con una **prueba de trabajo** en el navegador que se endurece en vez de bloquear (sin terceros ni IP). Los códigos nuevos pasan a 16 caracteres; los de 8 siguen valiendo.
- **Por qué así:** un freno global permitía bloquear a todos los clientes (A2); revelar la existencia de un código permitía adivinarlos (A1). La prueba de trabajo frena sin guardar IP (el canal promete anonimato) y sin bloquear a quien sí tiene su código.
- **Dónde:** migración `021_codigo_freno_por_empresa.sql`. El camino nuevo convive con el de antes hasta que el navegador se cablee.

### A4 · La hora no delata a quien denuncia
- **Qué:** lo que llega de quien denuncia (denuncia web, sus mensajes, adjuntos y petición de reunión) se guarda y se enseña **solo con el día**, nunca la hora, en el panel, el PDF, el Excel, el historial y el informe; tampoco se puede sacar la hora por la API (el instante real vive en una columna privada que el panel no lee) ni por los metadatos de Storage. El aviso por correo y la aparición en el panel se pueden retrasar 1-3 h (interruptor + pg_cron, apagado por defecto). Lo que hace el equipo (registrar un caso, sus mensajes y notas) mantiene la hora y no se retrasa. En el canal, al empezar la denuncia, el aviso del 112.
- **Por qué así:** la hora exacta, cruzada con los registros de la empresa (VPN, fichajes, quién tenía el ordenador encendido), puede desenmascarar a quien denuncia. Redondear al día es lo que bendice el encargo y no toca los plazos legales (que cuentan por días). El retraso de los avisos se deja preparado pero apagado, porque encenderlo necesita pg_cron, y mientras no esté no pueden dejar de salir avisos en silencio.
- **Alternativa descartada:** retrasar la aparición en el panel siempre (aunque el aviso salga al instante): dejaría al gestor con un correo y un caso que no puede abrir hasta 1-3 h después. Por eso el retraso del panel va atado al mismo interruptor que el del correo.
- **Dónde:** migración `023_hora_no_delata.sql`. El panel y el canal ya enseñan solo el día aunque la 023 no esté ejecutada (la web funciona con la base de datos en la 022).

### A6 · Registro de accesos
- **Qué:** la base de datos anota quién abre un caso, lo exporta (PDF, Excel, informe), descarga un archivo, ve la identidad o borra/suprime algo. Hay una pantalla «Accesos» para administradores que lo enseña y respeta la exclusión por caso (C1). Son acciones del equipo, así que llevan la hora (a diferencia de A4).
- **Por qué así:** el abuso de un gestor o administrador (leer o exportar casos que no le tocan) no dejaba rastro; con el registro, queda. La pantalla es solo para administradores porque es una herramienta de control.
- **Alternativa descartada:** anotar solo desde el navegador (se podría saltar llamando a la API directamente). Por eso las lecturas/exportaciones pasan por funciones que anotan, y el borrado por un disparador.
- **Dónde:** migración `024_registro_de_accesos.sql`, pantalla `src/v2/panel/Accesos.jsx` (`/admin/access`).

### A7 · Supresión con control
- **Qué:** suprimir una denuncia deja de ser inmediato y de una sola persona. Solo cuando la ley lo permite (art. 32.3/32.4: nunca con la investigación abierta), motivo de ≥ 30 caracteres, 7 días de gracia con aviso al resto de administradores (cualquiera la cancela), y los archivos solo se borran dentro de la supresión (no uno a uno).
- **Por qué así:** la persona denunciada que gestiona el canal podía borrar su propio caso o las pruebas al instante, con un motivo de 5 letras. La gracia + el aviso dan tiempo a reaccionar; el candado por estado respeta el art. 32; el borrado de archivos atado a la supresión evita que se borren pruebas sueltas sin rastro (A6 lo anota).
- **Alternativa descartada:** supresión con dos personas (aprobación previa). Se eligió la gracia + aviso + cancelación porque no obliga a tener siempre dos administradores disponibles y deja el mismo control.
- **Dónde:** migración `025_supresion_con_control.sql`. La ejecución automática tras 7 días y la limpieza de los bytes de los archivos van con pg_cron (M11). El texto del diálogo se actualizó para describir la gracia (sigue citando el art. 32).

### A3 · Que nadie pueda cerrar el canal de una empresa
- **Qué:** nunca se rechaza una denuncia; por encima de 50/hora y empresa entra marcada como «posible spam» (bandeja aparte, sin aviso una a una: un resumen por hora). Enviar exige la prueba de trabajo de la 021. Adjuntos: 25 MB por archivo y 500 MB por empresa y hora; si no caben, la denuncia entra igual y se avisa a quien denuncia.
- **Por qué así:** antes, 50 falsas por hora cerraban el canal (quien denunciaba de verdad recibía «inténtalo más tarde»). Un canal de denuncias es obligatorio por ley: no puede quedar inutilizable. «Nunca rechazar» lo garantiza; la bandeja de spam y los topes limitan el abuso sin cerrar la puerta.
- **Alternativa descartada:** captcha de terceros en el canal (rechazado en toda la ronda: el canal no depende de terceros ni guarda IP). La prueba de trabajo hace ese papel sin terceros.
- **Dónde:** migración `026_canal_no_se_cierra.sql`. El tope por hora se fijó en 500 MB (ajustable). El `submit_complaint` de 16 queda abierto como reserva (cerrarlo es un paso posterior, como la 022).

### A5 · Metadatos de los adjuntos
- **Qué:** en denuncias anónimas, antes de subir, se quitan los datos ocultos de los documentos de Office (autor, empresa, «modificado por», autores de comentarios y de control de cambios) y de los PDF (Info y XMP), todo en el navegador. Si no se puede limpiar con garantías, no se sube y quien denuncia decide. No se aceptan `.eml`, `.msg` ni `.zip` en anónimas. Vídeo y audio: aviso de que pueden llevar la ubicación y el modelo del móvil.
- **Por qué así:** un `.docx` lleva el nombre del autor en «Autor», un `.eml` lleva IPs y remitente; la mayoría de la gente no lo sabe. Limpiar en el navegador (sin terceros, con `DecompressionStream` nativo) lo evita. Lo que no se puede limpiar con seguridad, mejor no subirlo (prudente para quien denuncia).
- **Alternativa descartada:** limpiar en el servidor (una función con la clave de servicio). No hace falta: quien se salta el navegador solo se perjudica a sí mismo, y añade complejidad y un punto donde el archivo sin limpiar pasa por el servidor.
- **Dónde:** `src/lib/cleanDocs.js` (sin migración). Textos corregidos en `REVISION_LEGAL.md`.

### Medios con código (M1, M3, M5, M6, M7, M8, M11)
- **Qué:** M1 reescribe de golpe las huellas antiguas con el secreto (y luego se borra la copia, M2). M3 cierra la lista de autoridades externas (direcciones fijas en `config/producto.js`; nadie escribe una dirección libre). M5 ata la subida de adjuntos al «id de envío» que solo tiene quien envió. M6 hace de «ver identidad» un permiso propio (por defecto solo administradores), con motivo obligatorio. M7 fuerza la descarga de adjuntos (no se abren en pestaña), con nombre neutro y comprobación de los primeros bytes. M8 fija las versiones de las funciones de servidor. M11 añade la baja de empresa (solo Reportia).
- **Por qué así:** cada uno cierra un medio de la auditoría (huellas sin secreto, autoridad falsificable, pruebas falsas, identidad sin control, adjuntos que se abren, cadena de suministro, conservación/baja). Son los menos graves, pero baratos de cerrar.
- **Decisiones prudentes:** las autoridades autonómicas que no se pueden verificar van marcadas «por comprobar» y no se ofrecen hasta que David confirme su dirección. El antivirus de los adjuntos queda como propuesta escrita (necesita un servicio aparte). La supresión automática tras los 3 meses NO se hace (duda al abogado): solo se avisa.
- **Dónde:** migración `027_medios.sql`; `src/v2/config/producto.js`, `Ajustes.jsx`, `Caso.jsx`, `Equipo.jsx`; las funciones de `supabase/functions/`.

### Bajos (B1, B2, B5, B6, B7, B8, B9, B11, B13, N1)
- **Qué:** segundo paso también para leer empresa/equipo (B1); anon pierde privilegios de tabla que no usa (B2); las funciones nuevas no nacen ejecutables por anon y una sola detección de «¿viene del navegador?» (B13); Sentry nunca en el canal ni en el dominio propio (B5); secreto de notify en tiempo constante (B6); aviso del justificante «en un dispositivo tuyo» (B11); `Referrer-Policy: no-referrer` (N1); un administrador no borra directamente a otro (B7); tope global de invitaciones (B8); `actions/checkout` por hash (B9).
- **Decisiones:** B7 solo bloquea el borrado directo de un administrador (bajar de rol sigue siendo legítimo; la protección de dos personas completa queda como propuesta, para no romper la gestión del equipo). B9 fija checkout (verificado) y deja el comando para fijar las otras dos. B10: `npm audit fix` no arregla nada sin saltos de versión mayor (Vite 6, aparte). B3 (cadena de huellas del registro) y B4 (iframe por empresa) quedan como propuesta escrita.
- **Dónde:** migración `028_bajos.sql`; `vercel.json`, `main.jsx`, `supabase/functions/*`, `.github/workflows/ci.yml`, `translations*.js`.

### 8b · Modo claro por defecto
- **Qué:** el canal (todas las pantallas de `/canal/…`) y el acceso al panel se ven SIEMPRE en claro, aunque el sistema esté en oscuro. En el panel, el modo por defecto pasa a ser «Claro» (antes «Como el sistema»); cada persona puede seguir eligiendo Oscuro o Como el sistema en «Apariencia».
- **Por qué así:** el canal es de la empresa cliente; en claro, sus colores (su paleta) se ven tal como los eligió, no apagados por el modo oscuro del dispositivo de quien denuncia. El acceso al panel, igual, para que la marca de la empresa se vea bien.
- **Alternativa descartada:** que el canal siga el modo del sistema (como hasta ahora). Se descartó porque desvirtúa los colores de la empresa y da una primera impresión distinta según el dispositivo.
- **Dónde:** migración `029_modo_claro.sql` (`profiles.appearance` por defecto `light`, y los `system` pasan a `light` —no hay clientes reales, anotado en la guía); `useBrandTheme(..., 'light')` en `Canal.jsx` y `Acceso.jsx`; `?? 'light'` en `Panel.jsx` y la demo. En «Apariencia», «Claro» ya iba primero.

### Navegador: cableado y probado
C1, A1, A2, A4, A6, A7, A3, A5, los medios, los bajos y 8b (modo claro) están hechos (base de datos + navegador + demo) y con las pruebas de base de datos y lógica en verde (`npm run db:test` 494, `npm run test:logic` 49). En el canal (siempre en claro): el selector de «apartar personas», los códigos de 16 caracteres, la prueba de trabajo también al enviar, el id de envío (también para subir adjuntos), el aviso del 112, 25 MB por archivo, la limpieza de datos ocultos de fotos/Office/PDF y el bloqueo de .eml/.msg/.zip en anónimas. En el panel (por defecto en claro): «Quién gestiona este caso», las fechas sin hora en lo de quien denuncia, la pantalla «Accesos», la supresión con 7 días de gracia, la bandeja «Posible spam», «ver identidad» con permiso y motivo, la descarga forzada de adjuntos y la lista cerrada de autoridades. La e2e necesita Playwright (fuera del repositorio) y no se pudo ejecutar en estas tandas.

**Regrabar al final:** el paso 3 del formulario de denuncia tiene la sección de «apartar personas» (C1) y el paso 1, el aviso del 112 (A4); salen en el vídeo «Quien denuncia» de la portada.
