# Plan por fases: todo lo que hay que cambiar, en una sola lista

Fecha: 13 de octubre de 2026. Fase 1 del encargo «Vuelta». Junta seis fuentes. Cada fila es **un trabajo**; la columna «fuente» dice quién lo pide y con qué número, para que nada se pierda.

**Fuentes:**

1. La auditoría nueva: `docs/AUDITORIA_ESTETICA.md` (C- canal, P- panel, M- móvil, E- correos, W- web) y `docs/TEXTOS_PROPUESTA.md`.
2. Lo que queda abierto en `docs/AUDITORIA.md` (⏳, 💡 y 👤).
3. El audio de David Comellas y Axel: `FEEDBACK_Comellas_Axel_13oct.md` (P1–P8, B1–B3, I1–I4, M1–M6).
4. Las observaciones de `PLAN_vuelta_completa.md`, §2 (1–21).
5. Lo que pide David: la escala, «Mira tu caso» grande, nada de marketing, Reportia fuera del canal, nada que parezca hecho por un niño, la web rehecha, «Tu marca» y «Apariencia», el panel del móvil y trabajar en `main` en local. Incluye `DIRECCION_VISUAL.md`.
6. Las propuestas de Claude Code: `AUDITORIA_ESTETICA.md`, §5 (CC-01 a CC-20).

**Fases:** 2 producto · 3 marca blanca · 4 integraciones · 5 landing y vídeo · antes de lanzar · decide el jefe.

---

## Fase 2 · Producto

**Estado a 13 de octubre de 2026:** hechos los bloques A a E de la fase 2. Quedan abiertos el n.º 33 (opcional), parte del n.º 29 (rendimiento del canal en el móvil), los que esperan al logo oficial (37, 38, 40 y 41) y el n.º 42 (abogado).

| n.º | qué | fuente | fase | depende de | estado |
|---|---|---|---|---|---|
| 1 | **Entrada nueva del canal**, según la maqueta elegida (la A+): dos mitades iguales de borde a borde, Denunciar sobre el color sólido y Gestionar en blanco, las dos palabras a 56 px, una frase, sin etiquetas ni iconos | 3·P2, P3, P5 · 4·2, 3, 7 · 1·C-01, C-02, C-03, C-05, C-06, C-10 · 5·marketing · 6·CC-01 | 2 | Elegida la A+ (n.º 86) | ✅ bloque A |
| 2 | **«Consultar mi caso» como segundo botón**, igual de visible que el principal | 3·P4 · 5·«Mira tu caso» · 1·C-04 | 2 | n.º 1 | ✅ bloque A |
| 3 | **Al elegir un lado, el otro desaparece.** Fuera la franja de 76 px del canal y del panel; «Volver al inicio del canal» | 3·P6 · 4·13 · 1·C-12, P-01 · 6·CC-20 | 2 | n.º 1. Rehacer las pruebas que usan la franja (n.º 39) | ✅ bloque A |
| 4 | **Escala nueva en `ds.css`** (tabla de `AUDITORIA_ESTETICA.md` §3.2): tamaños, pesos, altos, rellenos, radios y líneas de 1 px. Y las **reglas de color** de la ronda 3 (§10): un solo tinte, rojo y ámbar solo en estados, tres colores por pantalla como máximo | 5·escala, `DIRECCION_VISUAL.md` · 1·C-13 | 2 | n.º 87 (botones) | ✅ bloque A |
| 5 | **El canal, sobre blanco:** el color solo en el botón principal, la barra de progreso y lo seleccionado | 6·CC-01 · 1·C-11 | 2 | n.º 1 | ✅ bloque A |
| 6 | Pantalla del código: campo y botón compactos, la nota en una línea | 1·C-14 | 2 | n.º 4 | ✅ bloque A |
| 7 | Paso 1: opciones compactas, sin iconos | 1·C-15 · 6·CC-10 | 2 | n.º 4 | ✅ bloque A |
| 8 | **Paso 2 con menos texto** (maqueta): una frase y un enlace sobre los archivos, la ayuda como frase, una sola nota de privacidad | 4·5, 6 · 1·C-16, C-17, C-18 | 2 | Conviene que el abogado dé por buena la frase corta (n.º 75) | ✅ bloque A |
| 9 | Paso 3: quitar «Recomendado» y que quepa a 1366×768 | 1·C-19, C-20 | 2 | n.º 4 | ✅ bloque A |
| 10 | «Enviada»: el código, lo primero | 1·C-21 · 6·CC-15 | 2 | n.º 4 | ✅ bloque A |
| 11 | «Mi caso»: el estado en una línea y la conversación como protagonista | 1·C-22 | 2 | n.º 4 | ✅ bloque A |
| 12 | Canal que no existe: sin enlaces a Reportia ni invitación a crear un canal | 1·C-24 | 2 | — | ✅ bloque A |
| 13 | Política de privacidad del canal: solo la escala nueva | 1·C-25 | 2 | n.º 4 | ✅ bloque A |
| 14 | **Una cabecera de panel:** marca, menú en texto, «Ver el canal», el plan en texto pequeño y avatar gris | 4·15 · 1·P-02 · 6·CC-07 | 2 | n.º 3 | ✅ bloque B |
| 15 | **Tablero:** título «Tablero», tarjetas compactas con barra de urgencia a la izquierda, fondo suave solo en las etiquetas que importan, avisos en una línea y la puesta en marcha plegada | 4·12 · 1·P-03, P-05, P-06, P-07, P-08 · 6·CC-03, CC-08 | 2 | n.º 4, 16 | ✅ bloque B |
| 16 | **Título neutro por defecto** (referencia y tema) en el tablero, la ficha, la búsqueda, el PDF y el Excel; título propio opcional | 4·1 · 1·P-04, P-09 · 6·CC-02 | 2 | Ver si los títulos ya guardados se conservan (pregunta 5) | ✅ bloque B |
| 17 | **Ficha del caso:** el siguiente paso en una franja tintada con el botón a la derecha; la conversación en su bloque, con burbujas por lado y la caja pegada abajo; las notas internas aparte, en ámbar suave y con su rótulo; una sola columna de gestión con líneas | 1·P-10, P-11, P-12, P-13 | 2 | n.º 4, 16 | ✅ bloque B |
| 18 | Registrar un caso: la explicación, sin tarjeta negra | 1·P-14 | 2 | n.º 4 | ✅ bloque B |
| 19 | **Informe sobrio:** cifras en una fila, gráficos neutros y una sola cifra en rojo | 4·14 · 1·P-15, P-16, P-17 · 6·CC-09 | 2 | n.º 4 | ✅ bloque B |
| 20 | **Compartir como lista**, con la puesta en marcha en una línea | 4·16 · 1·P-18, P-19, P-20 | 2 | n.º 4 | ✅ bloque B |
| 21 | Equipo y ajustes: secciones con título y línea, avatares grises | 1·P-21 | 2 | n.º 4 | ✅ bloque B |
| 22 | Acceso y verificación a la escala nueva, y sin venta de Reportia en el acceso de un cliente | 1·P-22, P-23, P-24 | 2 | n.º 4 | ✅ bloque B |
| 23 | **Panel en el móvil:** lista por urgencia, ficha en tres pestañas con el siguiente paso fijo abajo, informe en 2 × 2, compartir en lista, sin «Primeros pasos» en el tablero y barra inferior discreta | 4·21 · 5·móvil · 1·M-01, M-02, M-03, M-04, M-05, M-06 · 6·CC-04 | 2 | n.º 15, 17, 19, 20 | ✅ bloque C |
| 24 | Iconos: quitar los decorativos y unificar el trazo | 4·3 · 6·CC-10 | 2 | — | ✅ bloques A y B |
| 25 | Estados vacíos, cargando y error, en la misma voz y sin cajas de color | 6·CC-11 | 2 | n.º 4 | ✅ bloques A, B y C |
| 26 | Pequeñas interacciones: cambio de lado, «Copiado», avisos de guardado, foco, paso del ratón y envío | 6·CC-16 | 2 | n.º 3 | ✅ bloques A y B |
| 27 | **Aplicar los textos elegidos** de `TEXTOS_PROPUESTA.md` (57 redacciones, 19 que se quitan y 9 nuevos), en catalán, castellano e inglés | 3·P7 · 4·7, 12 · 5·marketing · 1·C-07 | 2 | Visto bueno a la tabla (n.º 88) | ✅ bloques A a D (dos de los 9 textos nuevos no se usan: la entrada A+ no los necesita) |
| 28 | Borrar los 301 textos sin uso aparente y pasar a «tú» los mensajes de la demo | 1·C-23 · 6·CC-17 · 2·F-26 | 2 | Comprobar cada uno antes de borrar | ✅ bloques D y E: quitados 275 textos por idioma, comprobados uno a uno; el resto de los 301 sí se usa |
| 29 | Rendimiento en el móvil: que el canal se pinte antes (hoy, 3,5 s) | 2·D-1 | 2 | — | ⏳ en parte, bloque E: conexión anticipada con la base de datos y un archivo de arranque más ligero (de 46 a 37 KB comprimido, al quitar los textos sin uso). Lighthouse no cambia: el canal pinta a 2,3 s antes y después (los 3,5 s eran de antes de la fase 4 de «Mejora total»). Para bajar de ahí hay que separar los textos de la web y del panel de la carga del canal: fase 5 y n.º 33 |
| 30 | `README.md` y `.env.example` al día | 4·9 · 2·F-30 | 2 | — | ✅ bloque E |
| 31 | `CLAUDE.md` al día (15 migraciones, Manrope en todo, rutas y pruebas nuevas) | 2·fase 6 sin hacer | 2 | Al final de la fase | ✅ bloque E |
| 32 | Código muerto: el componente `V2Layout` y las clases sin uso de `v2.css` | 2·F-26 | 2 | `v2.css`, con la fase 5 | ✅ bloque E: fuera el componente `V2Layout`, la franja `SideTab` y un alias sin uso. `v2.css`, con la fase 5 |
| 33 | Partir los archivos grandes (`translations.js`, `Caso.jsx`) | 2·F-28 | 2 | Opcional: lo decide David | ⏳ opcional: lo decide David |
| 34 | Comentarios del código en un solo idioma, y decirlo en `CLAUDE.md` | 2·F-29 | 2 | — | ✅ bloque E: en castellano. Las migraciones ya escritas se dejan como están |
| 35 | Medir Lighthouse y el tamaño de la web antes y después | 2·D-13 | 2 | Al final de la fase | ✅ bloque E. Lighthouse en móvil, antes → después: portada 87 → 87, canal 92 → 92, acceso 88 → 88 (accesibilidad y buenas prácticas, 100). Peso del canal: 255 → 244 KB |
| 36 | Marcar como sustituidas las maquetas antiguas que dejan de valer | Plan, fase 2 | 2 | n.º 1 | ✅ bloque E: nota en el índice de `diseno-canal/propuestas` |
| 37 | **Identidad de Reportia** en el panel, el acceso sin empresa y «Contraseña nueva», con el logo oficial | 4·11 · 5·logo · 1·P-25 · 6·CC-05 | 2 | n.º 83, 84 | ⏳ espera al logo (lo decide el jefe) |
| 38 | Pestaña del navegador: icono oficial en el panel; neutro en el canal | 4·11 · 6·CC-18 | 2 | n.º 83 | ⏳ espera al logo (lo decide el jefe) |
| 39 | Rehacer las pruebas de navegador afectadas (franja, textos, recorrido, teclado, portátil) y volver a medir el contraste | 5·`DIRECCION_VISUAL.md` §5 | 2 | Cada cambio de pantalla | ✅ bloques A a E |
| 40 | PDF del caso y del informe: misma escala que la pantalla y pie «Generado con Reportia» | 6·CC-12 | 2 | n.º 83 | ⏳ espera al logo (n.º 83) |
| 41 | Correos: logo oficial, un idioma por correo, un solo botón y letra de 13 px como mínimo | 1·E-01, E-03, E-04, E-05 · 6·CC-14 | 2 | Pegarlos en Supabase es del n.º 68 | ⏳ espera al logo (n.º 83) |
| 42 | Correos: quitar el lema «Canal de denuncias anónimas» | 1·E-02 | 2 | Duda 23 del abogado | ⏳ espera al abogado (duda 23) |
| 43 | Forma de trabajo: en `main`, en local, sin ramas; David revisa y hace commit y push | 5·forma de trabajo | 2 | — | ✅ |

## Fase 3 · Marca blanca

**Estado a 16 de octubre de 2026:** hecha en el código, con la migración `016_marca.sql` escrita y probada en local (`npm run db:test`), **sin ejecutar en Supabase**: la ejecuta David. Hasta entonces la web funciona igual que hoy (azul, sin logo, sin «Tu marca» ni «Apariencia»). Queda el n.º 49, que decide el jefe.

| n.º | qué | fuente | fase | depende de | estado |
|---|---|---|---|---|---|
| 44 | **Fuera la marca Reportia del canal**: el canal lleva el logo y el nombre del cliente; sin logo, solo el nombre | 3·P1, B1 · 4·4 · 5·Reportia fuera del canal · 1·C-08 | 3 | n.º 45 | ✅ el logo y el nombre en la entrada, en las pantallas de Denunciar, en la privacidad y en el acceso que se abre desde el canal; la pestaña y la vista previa, sin Reportia (n.º 51). El pie «Con Reportia», con el n.º 49 |
| 45 | **«Tu marca»** en Equipo y ajustes: logo, nombre visible y una paleta entre ocho. Migración nueva y almacén de logos | 3·B1, B2 · 5·«Tu marca» · 6·CC-06 | 3 | David ejecuta la migración | ✅ como en la maqueta, con vista previa en claro y en oscuro. El logo no va a un almacén aparte: se prepara en el navegador (sin bordes, 480 × 160 px como mucho, un SVG pasa a PNG) y se guarda en la empresa como imagen pequeña; así el canal no pide nada a otro sitio, la política de seguridad no cambia y no se guarda nunca un SVG (puede llevar código). La 016 rechaza cualquier otra cosa |
| 46 | **«Apariencia»** por gestor (claro, oscuro o como el sistema), guardada en su perfil | 5·«Apariencia» · 6·CC-06, CC-19 | 3 | Misma migración | ✅ en «Tu seguridad»; se ve al momento y se guarda en el perfil |
| 47 | Modo oscuro del canal según el sistema de quien denuncia, sin guardar nada en su navegador | 5·«Apariencia» · 6·CC-19 | 3 | n.º 45 | ✅ también en el panel y el acceso. Medido: 0 fallos de contraste en las 40 pantallas de siempre en oscuro y en 5 pantallas con las 8 paletas en claro y en oscuro |
| 48 | La primera página del canal no es un acceso: ya es así. Mantenerlo | 3·B3 | 3 | Hecho | ✅ |
| 49 | Pie del canal sin «Con Reportia», o muy pequeño | 4·8 · 1·C-09 | 3 | n.º 79 | ⏳ espera al jefe (n.º 79). Hoy sigue como estaba |
| 50 | Cartel con QR con la marca del cliente | 6·CC-13 | 3 | n.º 45 | ✅ banda con el color de la paleta y el logo en una placa blanca. También el PDF del caso, el informe, el Excel y el botón para la web; el justificante de quien denuncia, solo con el color (sin nombre ni logo: sigue siendo neutro) |
| 51 | Vista previa al compartir el canal, sin Reportia | 6·CC-05 | 3 | n.º 45 | ✅ en parte: `canal.html` (la página de entrada de `/canal/*`) dice «Canal de denuncias», sin imagen ni nombre de Reportia y con un icono neutro. El nombre de cada empresa en la vista previa necesitaría generar la página en el servidor |

## Fase 4 · Integraciones

**Estado a 16 de octubre de 2026:** hecha en el código y probada contra la web compilada como en producción (prueba `csp`), con la migración `017_dominio_propio.sql` escrita y probada en local, **sin ejecutar**. Detalle y pasos para Reportia en `docs/INTEGRACION.md`.

| n.º | qué | fuente | fase | depende de | estado |
|---|---|---|---|---|---|
| 52 | Enlace o botón: ya existe (Compartir). Incluirlo en la guía | 3·I1 | 4 | — | ✅ primera forma de la guía, y la recomendada. El botón lleva ya el color de la paleta |
| 53 | Subdominio propio del cliente (CNAME) | 3·I2 | 4 | Límites de dominios del plan de Vercel | ✅ en el código y la 017: `canal.acme.es` abre el canal de Acme y todo lo que se comparte usa esa dirección; el panel sigue en la principal. El alta la hace Reportia (Vercel + una línea de SQL). Vercel: 50 direcciones por proyecto en Hobby, sin límite práctico en Pro (y Hobby no admite uso comercial). Pendiente: la vista previa de la raíz de la dirección propia sigue siendo la de Reportia (lo que se comparte usa `/canal/…`, que es neutra) |
| 54 | Canal dentro de un iframe: abrirlo solo para el canal, nunca para el panel | 3·I3 | 4 | Revisar cabeceras y política de seguridad | ✅ `vercel.json` solo deja incrustar `/canal/*` (desde webs con https); el panel tampoco se pinta si se llega dentro del recuadro sin recargar; «Acceder» se abre aparte y «Salir rápido» sale de la web entera |
| 55 | Script que pinta el botón | 3·I4 | 4 | — | ✅ `public/boton-canal.js`: el botón donde se pega o fijo en la esquina (`data-estilo="flotante"`), con idioma y color; no guarda nada ni envía de qué página se viene |
| 56 | Guía de integración para clientes, con las cuatro opciones | 3·I1, I2, I3, I4 | 4 | n.º 53–55 | ✅ en «Compartir el canal › Otras formas de ponerlo en tu web», en los tres idiomas, con el código para copiar. Para Reportia, `docs/INTEGRACION.md` |
| 57 | Limitar el origen de las funciones del servidor (CORS) al dominio propio | 2·A1-12 | 4 | Dominios definitivos | ✅ en el código: secreto `ALLOWED_ORIGINS` en `invite-manager`, `delete-manager` y `ai-assist` (sin él, como hoy). Ponerlo y redesplegar cuando se decida la dirección (n.º 78) |

## Fase 5 · Landing y vídeo

**Estado a 17 de octubre de 2026:** sin empezar; espera las decisiones del jefe (nombre, subdominio, precio y la multa: n.º 77, 78, 80 y 85). Comprobado ya el n.º 64: Supabase dice que «todos los datos de los clientes se cifran en reposo con AES-256 y en tránsito con TLS» (supabase.com/security), así que la frase de la portada es cierta y se puede quedar. El n.º 63 ya se cumple en el código: sin JavaScript, sin observador o con «menos movimiento», todo se ve desde el principio; lo que queda es que, si el navegador va lento, las piezas tardan en aparecer al bajar (se decide al rehacer la portada).

| n.º | qué | fuente | fase | depende de |
|---|---|---|---|---|
| 58 | **Landing nueva** en un subdominio de Reportia, neutra, con los planes | 3·M2 · 4·10, 17 · 5·web rehecha · 1·W-06, W-07, W-16 | 5 | n.º 76, 77, 78 |
| 59 | Escala común con el producto: seis tamaños y capturas nunca por debajo del 70 % | 5·escala · 4·17 · 1·W-01, W-02, W-13, W-15 | 5 | n.º 58 |
| 60 | «Qué se puede comunicar» sin aspecto de testimonio; botón «Pausar» | 4·18 · 1·W-03, W-04 | 5 | Los textos pueden ir antes (n.º 27) |
| 61 | La multa, como un artículo más y no como cifra destacada | 4·19 · 1·W-05 | 5 | n.º 85 |
| 62 | Tono sobrio en toda la web; inglés revisado; «Gestiona» en el paso 3 | 4·10, 20 · 1·W-09, W-10, W-12 · 2·G-1 | 5 | n.º 27 |
| 63 | El contenido, siempre a la vista aunque falle el movimiento | 1·W-08 | 5 | n.º 58 |
| 64 | Confirmar o quitar «los datos se guardan cifrados en el servidor» | 1·W-11 | 5 | Confirmarlo con el proveedor |
| 65 | Pendientes de la portada en `AUDITORIA.md`. Ya hechos en `8ee6a5e` y sin marcar: G-2, G-3, G-4, G-5, G-6 y C-14. Sin hacer: D-5 (capturas en dos tamaños) y D-11 (reservar espacio solo en títulos y botones) | 2·G-2, G-3, G-4, G-5, G-6, C-14, D-5, D-11 | 5 | Se rehace igualmente |
| 66 | Vídeo de demostración corto, con subtítulos | 3·M3 | 5 | n.º 58 |
| 67 | Aviso legal, dos políticas de privacidad, condiciones del servicio y contrato de encargado | 2·3.2, 3.3, 3.4, 3.5 | 5 | Textos del abogado |
| 68 | Formulario «Pide una demostración» | 2·4.2 | 5 | Abogado y migración |
| 69 | Indexación en Google (robots, sitemap, quitar el «no indexar» de la portada) | 2·5 | 5 | Dominio definitivo |
| 70 | Crear cuenta: sin captcha ni condiciones | 1·W-14 | 5 | n.º 67, 71 |

## Antes de lanzar

**Estado a 17 de octubre de 2026:** sin tocar, a propósito. **N.º 71:** el acceso ya pinta Turnstile, pero si no carga en 12 segundos deja entrar sin él; para comprobarlo de verdad (el captcha de Supabase Auth) hay que ponerlo también en el alta y en «He olvidado la contraseña» y decidir qué pasa cuando Turnstile no carga (¿se deja entrar o no?). **N.º 74:** cambia las huellas de los códigos ya guardados en producción y no se puede deshacer: necesita el visto bueno de David y hacerlo con una copia de seguridad a mano.

| n.º | qué | fuente | fase | depende de |
|---|---|---|---|---|
| 71 | Captcha de verdad en el alta y el acceso, comprobado en el servidor | 2·A1-6, A1-7, A2-2 | antes de lanzar | Turnstile real |
| 72 | Correo propio (SMTP), pegar las cuatro plantillas y configurar el aviso de denuncia nueva | 1·E-06 · Plan, §5 | antes de lanzar | Acceso al DNS de reportia.es |
| 73 | Ajustes de Supabase y Vercel de la lista «Para David» de `AUDITORIA.md` (puntos 0 y 4 a 20): ejecutar la 015, redesplegar `invite-manager`, contraseñas, límites, sesiones, plantillas, direcciones permitidas, políticas, almacenamiento, alertas y copias | 2·👤 | antes de lanzar | David |
| 74 | Huella del código de seguimiento con secreto | 2·A1-8, A1-1b | antes de lanzar | El código más largo se descartó el 9 de octubre; la huella con secreto sigue abierta |
| 75 | Dudas del abogado (`docs/REVISION_LEGAL.md`, 1 a 29) | 2·⚖️ | antes de lanzar | Abogado |
| 76 | Repositorio en privado y carpetas de herramientas fuera de git | 2·F-31, 7 | antes de lanzar | Lo decide David |

## Decide el jefe

| n.º | qué | fuente | fase | depende de |
|---|---|---|---|---|
| 77 | Nombre del producto y familia de nombres de las herramientas de Reportia | 3·M1 | decide el jefe | — |
| 78 | Subdominio de la landing y quién gestiona el DNS de reportia.es | 3·M2 | decide el jefe | n.º 77 |
| 79 | Pie «Con Reportia» en el canal: fuera o muy pequeño | 4·8 · 3·P1 | decide el jefe | — |
| 80 | Modelo de precio: anual o pago único con mantenimiento | 3·M5 | decide el jefe | — |
| 81 | Campaña de correo a empresas de 50 o más trabajadores | 3·M4 | decide el jefe | Abogado (LSSI, art. 21) |
| 82 | ❓ «No sacarlo a producción hasta estar integrados con esta gente»: qué significa | 3·M6 | decide el jefe | — |
| 83 | Logo de Reportia sobre blanco: icono oficial y nombre en tinta, o una versión oscura oficial del logotipo | 6·CC-05 · 4·11 | decide el jefe | — |
| 84 | ¿El producto se queda en azul (y luego en la paleta de cada cliente) o pasa a los colores de Reportia? | 6·CC-05 | decide el jefe | — |
| 85 | La multa de 1.000.000 € como cifra destacada en la web | 4·19 | decide el jefe | — |
| 86 | Entrada: elegida la A+ el 13 de octubre (dos mitades iguales). La A y la B quedan descartadas | 3·P2, P5, P6 | decide el jefe | Decidido |
| 87 | Botones con esquinas de 10 px o en píldora | 5·`DIRECCION_VISUAL.md` | decide el jefe (o David) | Ver la maqueta |
| 88 | Visto bueno a la tabla de textos | 3·P7 | decide el jefe (o David) | — |
| 89 | ❓ «lo de jai ja lo contraste»: qué quería decir | 3·P8 | decide el jefe | — |
| 90 | La palabra «denuncia» en el producto y en el nombre | 3·M1 | decide el jefe | n.º 77 |

---

## Recuento

| Fase | Puntos |
|---|---|
| 2 · Producto | 43 (n.º 1–43) |
| 3 · Marca blanca | 8 (n.º 44–51) |
| 4 · Integraciones | 6 (n.º 52–57) |
| 5 · Landing y vídeo | 13 (n.º 58–70) |
| Antes de lanzar | 6 (n.º 71–76) |
| Decide el jefe | 14 (n.º 77–90) |
| **Total** | **90** |

## Lo que tiene que decidir tu jefe antes de poder hacerlo

**Bloquea la fase 2:**

1. ~~Entrada A+, A o B~~ (n.º 86): elegida la A+ el 13 de octubre.
2. **Los textos** (n.º 88): basta con que dé por buena la sección 1 de `TEXTOS_PROPUESTA.md` (76 filas).
3. **El logo de Reportia sobre blanco** (n.º 83) y **los colores del producto** (n.º 84). Sin esto, la identidad del panel y de los correos se queda como está.
4. **Los botones** (n.º 87). Puede decidirlo David.

**Bloquea la fase 3:**

5. **El pie «Con Reportia»** del canal (n.º 79).

**Bloquea la fase 5:**

6. **Nombre del producto** (n.º 77) y si se mantiene la palabra «denuncia» (n.º 90).
7. **Subdominio y DNS** (n.º 78).
8. **Precio** (n.º 80).
9. **La multa como cifra destacada** (n.º 85).

**Fuera del código:**

10. **La campaña de correo** (n.º 81), con el abogado.
11. **Los dos ❓ del audio** (n.º 82 y 89): hay que preguntárselo.
