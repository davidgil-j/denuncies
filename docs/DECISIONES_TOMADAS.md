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

### Pendiente de cablear en el navegador (no tocado aún)
El 21 oct, mientras se escribía esto, otro chat estaba grabando los vídeos de la portada con la demo. Para no romperle la grabación, **no se tocó ningún archivo de `src/`**. Queda por cablear (cuando la demo esté libre): el selector de «apartar personas» del formulario, el panel de accesos de la ficha, la prueba de trabajo (worker) y el id de envío en el canal, los códigos de 16 caracteres, y la demo (`demoStore.js`). La capa de base de datos ya está hecha y probada (`npm run db:test`).
