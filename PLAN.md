# Plan · Rediseño UI de Reportia (canal de denuncias anónimas)

Fase actual: 6 · Repaso (tercera vuelta aprobada el 5 oct 2026, tras la prueba con diez revisores; pendiente de enseñar a la dirección)
Listón: pendiente. Todavía no hay pieza publicada de este método que marque el nivel
Rama: `main`. El rediseño está confirmado (dd54e10) y subido a `origin` (davidgil-j/denuncies); `upstream` (lindachen-max) sigue en la versión anterior. La ampliación del 4 oct 2026 está sin confirmar, solo en local · Punto de retorno: tag `pre-rediseno` (solo en local)

## 0 · Entrevista
Qué es: canal público de denuncias (entrada, formulario de 4 pasos, seguimiento). Después vienen la landing, el alta, el login y el panel
Para quién: un empleado, proveedor o cliente que denuncia algo grave, a menudo desde el móvil, con miedo a que su jefe se entere
Modo: Operar, en tono formal e institucional
Éxito: que se atreva a enviar la denuncia
Aparatos obligatorios: iOS y Android, de gama baja (Samsung J5) a alta, en 390 px. Escritorio Mac, Windows y Linux
Viene trabajado: contenido [sí, en translations.js, ca/es/en] · marca [nada: wordmark "Reportia" y azul #2563eb] · dirección [blanco] · código [sí, React + Vite]

## 1 · Mensaje
Qué tiene que creer al terminar: que este canal es serio y que, si elige anónimo, nadie de su empresa puede saber quién es
Lector: persona nerviosa que duda de si fiarse; desconfía de lo "anónimo" de los formularios de Drive y las encuestas
Secciones y su argumento:
- Cabecera con organización, idioma y marco legal (UE, Ley 2/2023) · esto es un sistema oficial, no un formulario cualquiera
- Título y acciones · sé exactamente qué hacer
- Garantías: datos que se registran y datos que no · el anonimato se ve, no solo se dice
- Protección legal, seguimiento con código, acceso restringido · estoy protegido y no necesito cuenta
Lo que no se dice: nada que no sea verificable. Ni "no guardamos su IP", ni "cifrado de extremo a extremo", ni cifras o sellos inventados
La acción final: "Presentar una denuncia"
Expresiones de David, tal cual: «que su jefe no lo va a saber, esa es la gracia» · «transmite debilidad» · «parece una web hecha con ChatGPT en 2024» · «mucho más formal y profesional» · «nivel de rigurosidad visual de Apple, sin ser Apple»
Nombre en interfaz: "Canal de denuncias anónimas". Trato de usted. Se usa "denuncia", no "comunicación"

## 2 · Bocetos
Ronda 1 (Quieta, Bóveda, Cálida): rechazadas por tono informal ("Cuéntalo", "sin miedo")
Ronda 2 (Formal: claro, azul marino, IBM Plex, tabla de datos sí/no): «me gusta un pelín más», no del todo
Ronda 3: cinco direcciones formales (Institucional rigurosa, Documento notarial, Banca privada, Servicio público, Bóveda formal)
Dirección elegida: **Institucional rigurosa** · claro, azul marino #0F2242 / acento #1C4C96, Wix Madefor Display + Text, franja "Sistema interno de información" con bandera UE, ficha "Así consta una denuncia anónima" como efecto que manda. «La primera es la que más me gusta con mucha diferencia»
Se toma de las descartadas: de Servicio público, la intuición («es muy intuitiva»): frase directa grande, "Qué pasará después" numerado, frases cortas, controles grandes, foco visible, aviso de no escribir datos identificativos
Segunda vuelta aprobada («vale porfavor, generame una subweb que tenga el rediseño»), con: modo anónimo visible en todo el formulario, consejo de usar dispositivo y red ajenos a la empresa, botón "Salir rápidamente", enlace a la Ley 2/2023 en el BOE
Lo que chirría, para vigilar: tono de app de consumo; cualquier fallo visual (textos que saltan al cambiar idioma, selector pegado a una caja, botón de volver diminuto)

## 3 · Espina
Rejilla: 12 columnas · hueco 24 · margen 16/24/32 (móvil/tableta/escritorio) · anchura máxima 1136 (tareas: 820)
Letras: Wix Madefor Display 600 (titulares) + Wix Madefor Text 400/500/600 · escala fluida en portada, fija en formulario · techo del titular 56 px
Color: contenido · claro · acento único #1C4C96 sobre neutros fríos; franja #0A1830 · error #B42318 solo en validación · texto ≥ 5,2:1
El efecto que manda: la ficha "Así consta una denuncia anónima"
Formas: radios 8 / 12 / 20, interiores calculados · sombras con desplazamiento, sin halos · sin cristal
Botones: primario, secundario y discreto, con reposo, hover (solo puntero fino), foco, pulsado, desactivado y cargando · 52 px de alto
Encabezados y navegación: titular sin etiqueta encima · franja legal + cabecera + pie iguales en todas las páginas · "Salir rápidamente" siempre visible
Idioma del movimiento: curvas con duración (cubic-bezier(.23,1,.32,1), 150 a 220 ms), sin rebote, respeta movimiento reducido
Tokens: src/v2/v2.css (todo bajo .v2 para no chocar con global.css)
Aparatos: iOS y Android desde 360 px, escritorio

## 4 · Construir
Dónde: las direcciones de siempre (/, /canal/:slug, /crear-compte, /admin/...). Todo el código vigente vive en src/v2/
Se desvió de la espina: tokens de contraste (fondo #EAEEF3, líneas #CDD5E0 y #DCE2EA, borde de campos #7E8BA0, banda teñida #DFE5EE) y titulares de sección hasta 36 px. Motivo: David dijo «no se acaba de entender qué es cada cosa»; las superficies se fundían con el fondo (1,09:1). Probado con capturas de antes y después
Decidido a propósito:
- El borrador de la denuncia NO se guarda en el navegador: vive en memoria, sobrevive a atrás y adelante dentro del canal y se pierde al recargar o cerrar
- El canal ocupa una sola entrada del historial (toda la navegación interna sustituye): así «Salir rápidamente» no deja el canal detrás al pulsar atrás
- El idioma del canal va en la dirección (?lang=), no en el almacenamiento del navegador
- El canal se integra con enlace, botón o QR, nunca incrustado
- El código de seguimiento solo lo conoce quien denuncia: la base de datos guarda su huella y el panel usa una referencia propia (REF-XXXXXX)
- Verificación en dos pasos obligatoria para ver denuncias, exigida también por la base de datos
- No se borran denuncias: se suprimen los datos (art. 32) y la fila queda anonimizada en el libro-registro
- La sesión del panel vive en sessionStorage: una pestaña nueva pide entrar otra vez (seguridad antes que comodidad)

Piezas:
- Canal (src/v2/V2Home, V2Form, V2Track): entrada con canales externos (art. 7.2), formulario de 4 pasos, consulta con código y mensajes, política de privacidad dentro del canal (/canal/:slug/privacidad) con la empresa como responsable
- Sitio (src/v2/site/): portada con bandas (obligación y sanciones, dos partes, ley punto por punto, puesta en marcha, integración, precios, preguntas, cierre), alta con aceptación de privacidad y aviso de prueba, acceso con segundo paso, recuperación, privacidad, página 404
- Panel (src/v2/admin/): Denuncias (plazos, mensajes nuevos, aviso de supresión), ficha (enviar acuse, ampliar plazo, comunicar resultado al cerrar, suprimir datos), Informe, Usuarios (invitar, permisos, segundo administrador), Integrar el canal (enlace, botón, QR, cartel A4, texto legal), Cuenta (plan, organización, Responsable del Sistema, facturación), Seguridad
- Documentos: src/v2/lib/exportV2.js (PDF informe, ficha y cartel; Excel con fechas de acuse y respuesta). Se carga solo al exportar
- Demo sin base de datos: src/lib/demoStore.js. Solo en desarrollo o con VITE_DEMO=1. Imita a la base de datos de la migración 010
- Datos comerciales en un solo sitio: src/v2/site/plans.js
- Carga por partes (src/App.jsx): quien entra al canal no descarga el panel. La portada baja unos 600 KB en lugar de 2,35 MB

Base de datos (escrito y probado en local, SIN aplicar a ningún proyecto de Supabase):
- 008_security_hardening.sql: mensajes, roles, permisos por categoría, contenido inmutable, registro, storage, lista de miembros
- 009_organization_account.sql: plan, prueba, Responsable del Sistema y facturación
- 010_integrity_mfa_deadlines.sql: segundo paso obligatorio (aal2), código en huella y referencia, fechas de acuse y respuesta, ampliación del plazo, registro escrito por la base de datos, supresión de datos, permisos ligados a la organización, adjuntos ligados a su carpeta, campos que decide el servidor
- supabase/functions/: invite-manager y delete-manager endurecidas; notify (avisos por correo de denuncia y mensaje nuevos) escrita y SIN probar
- vercel.json: cabeceras de seguridad (CSP, HSTS, sin incrustación, sin caché del HTML)
- Pruebas: `npm run db:test`, 112 reglas contra un Postgres en memoria. Los ataques que demostró el auditor dejan de funcionar con la 010

## Pendiente de decidir (dirección)
- Tarifas (390 € y 790 € al año más IVA, a medida desde 1.000 trabajadores), prueba de 30 días y qué pasa al terminar, cobro por correo y factura, «denuncias y gestores sin límite»
- Verificar cada empresa antes de activar su canal: hoy cualquiera puede crear un canal con el nombre de otra empresa
- Segundo paso obligatorio para todos los usuarios del panel (ya implementado así)
- Proveedor de correo para los avisos (la función usa Resend) y servidor de correo propio en Supabase para altas e invitaciones
- Documentos legales que faltan: condiciones del servicio, contrato de encargo del tratamiento (art. 28 RGPD), aviso legal con razón social, NIF y domicilio
- Idioma por defecto de los metadatos (hoy catalán) y quitar «noindex» cuando se quiera captar clientes

## Pendiente de construir
- Antibot verificado en el servidor (hoy Turnstile solo se comprueba en el navegador)
- Comunicaciones verbales o presenciales registradas a mano y petición de reunión presencial (art. 7.2)
- Resultado de la investigación como dato (fundada, infundada, inadmitida) y remisión al Ministerio Fiscal (art. 9.2 j)
- Tarea programada de supresión (pg_cron): hoy el panel avisa y el administrador suprime
- Aviso al informante cuando hay novedades, si deja un contacto
- Permiso aparte para ver la identidad del informante identificado; exclusión de un gestor en una denuncia concreta (conflicto de interés)
- Autoridad externa según la comunidad autónoma de la empresa (hoy se muestra siempre la Oficina Antifraude de Cataluña, con su ámbito indicado)
- Exportación completa y baja de un cliente; lista de clientes y activación de planes sin SQL
- Fuentes alojadas en el propio dominio (hoy Google Fonts recibe la IP de quien visita el canal)
- Quitar metadatos (EXIF) de las imágenes adjuntas

## Pendiente para producción
- Aplicar 008, 009 y 010 y publicar el frontend a la vez. El frontend nuevo necesita las tres; el antiguo deja de funcionar en el portal de seguimiento
- Antes: contar filas sin organización y listar políticas creadas a mano (consultas en la cabecera de la 008). Fijar el plan de los clientes que ya pagan: la 009 pone a todos en prueba
- Tras la 010, cada usuario del panel tendrá que configurar la verificación en dos pasos al entrar
- Los códigos de seguimiento existentes siguen valiendo (se convierten en huella); los gestores dejan de verlos
- Desplegar las edge functions con SITE_URL definido. Para los avisos: secretos de notify y dos webhooks (instrucciones en su cabecera)
- Sustituir el proyecto en la CSP si no se usa *.supabase.co; probar Turnstile con las cabeceras en un despliegue de prueba
- Validar con legal la política de privacidad reescrita (responsable y encargado, base jurídica, conservación, subencargados)
- «Ver un canal de ejemplo» apunta a /canal/demo: en producción hace falta una organización con slug «demo»
- Probar en móviles reales (iOS y Android)

## 6 · Repaso
Veredicto: aprobado en las comprobaciones automáticas. Tercera vuelta, 5 oct 2026: diez revisores independientes (informante en ordenador y en móvil, gestor, administrador, compradora, dirección de arte, seguridad, textos, accesibilidad, cumplimiento) entregaron unos 190 hallazgos; arreglados los graves y la mayoría de los medios
Comprobado: 112 reglas de base de datos; recorrido completo en demo (25 pasos: denuncia, segundo paso, acuse, ampliación, resultado, supresión, segundo administrador, 404, idioma); canal (17 pasos: salir rápidamente, borrador, validaciones, código pegado, privacidad); barrido de 16 pantallas en ca/es/en a 1280, 1024, 390 y 360 px sin desbordes, errores de consola ni textos rotos; build de producción correcto
Asumido: en el panel, con ratón, los controles compactos miden 40 px; en táctil suben a 44 px · No se crean PRODUCT.md/DESIGN.md · Las secciones nuevas de la portada se construyeron sin ronda de bocetos, sobre la espina aprobada · La cabecera de la web pública pasa a quedarse fija arriba
No comprobado: aparato real (ley 3); la función notify; las migraciones contra un Supabase real; las cabeceras en Vercel

## 7 · Publicar
Estado: sin publicar. Producción (Vercel, que según el README despliega desde `upstream`) sigue con la versión anterior
Cómo se publica: commit y push a la rama que despliega Vercel, junto con las migraciones 008, 009 y 010 y las edge functions
Antes de publicar: probar en local con las credenciales reales (.env) entrando con la cuenta administradora de Reportia
Comprobado en producción: pendiente

## Ronda 4 · Estabilidad al cambiar de idioma y fluidez (5 oct 2026)

- **Textos estables.** Cada texto visible se pinta en los tres idiomas en la misma celda y solo se ve el activo (`Stable`, `stableOf` y `Swap` en `src/v2/V2Layout.jsx`; `L` y `SwapL` en el panel). Las cajas ocupan siempre el espacio del idioma más largo: al cambiar de idioma no se mueve nada.
- **Qué se deja natural.** Píldoras y etiquetas (estado, prioridad, «Recomendado») conservan su ancho propio; lo que se reserva es la fila entera. El texto corrido dentro de una línea fluye como texto.
- **Botones.** Mismo ancho en los tres idiomas, con icono y texto centrados (rejilla con `:has()` en `v2.css`).
- **A media página.** Al cambiar de idioma se mantiene a la misma altura lo que se estaba mirando (`useLangAnchor`).
- **Fluidez.** Precarga de las pantallas siguientes con el navegador libre, entrada suave de página (solo opacidad) e indicador de carga que solo aparece si la carga se alarga.
- **Fuentes** servidas desde la propia web. **Imágenes** de denuncias anónimas sin metadatos.
- **Migración 011 (escrita y probada en local, no aplicada).** De su interfaz está hecho: columnas explícitas e identidad del informante solo bajo consulta, anotada en el registro. Pendiente de interfaz: solicitud de reunión presencial, resultado de la investigación, registro manual de comunicaciones, remisión a Fiscalía y autoridad autonómica en Cuenta.
- **Comprobado:** 59 de 60 combinaciones pantalla × ancho sin movimiento (la restante es la línea de metadatos de las tarjetas en tableta), 139 pruebas de base de datos, 25 + 17 de recorrido y barrido de rutas sin desbordes ni errores de consola.

## Portada de Reportia (rondas 5 a 7, 5 oct 2026)

Motivo: la dirección dijo que no quedaba claro qué es el producto y que era poco visual. Versión vigente: la de la ronda 6 (azul noche con acento azul). David pidió volver a ella después de ver la ronda 7.

- **Paleta.** Azul noche, blanco y un solo acento: un azul más vivo (`--pop`). Ningún color cálido. Vive en `.v2-lp` (`src/v2/site/site.css`); el resto del producto no cambia.
- **Mensaje.** Titular «Canal de denuncias / para su empresa», una frase que lo explica y dos botones. Primero qué es; la ley, después.
- **Primera pantalla.** Texto a la izquierda y, a la derecha, el funcionamiento en tres piezas legibles hechas con los textos reales del producto (alguien lo cuenta, recibe su código, su empresa responde).
- **Orden.** Portada → Qué es (tres ideas) → Cómo funciona (recorrido de cuatro pasos con capturas reales) → Qué se puede comunicar (las ocho categorías del formulario, con un ejemplo de cada una) → Plazos del artículo 9 → ¿Está obligada? → Dos partes → Ley punto por punto → Puesta en marcha e integración → Precios → Preguntas → Contacto → cierre.
- **Movimiento.** Las piezas entran al llegar a la pantalla; el recorrido avanza solo y se para cuando la persona elige un paso; las tres piezas de la portada se destacan por turnos. Con «reducir movimiento» no se esconde nada y nada avanza solo.
- **Capturas reales.** 15 imágenes en `public/landing/` (canal, formulario, código, seguimiento y plazos, en ca/es/en), hechas con `scripts/landing-shots.mjs`. Hay que repetirlas cuando cambie la interfaz.
- **Canal de ejemplo.** `/canal/demo` funciona en cualquier compilación, también publicada, sin tocar la base de datos real. Pendiente: reservar el identificador `demo`.
- **Contacto.** El correo a la vista, con botón de copiar que confirma y botón de escribir. Abierto para la dirección: formulario o agenda de citas.
- **Comprobado tras restaurarla:** sin movimiento al cambiar de idioma a 1440, 1280, 768 y 390 px; sin desbordes; 25 + 17 pruebas de recorrido; el recorrido interactivo mantiene su alto en los cuatro pasos.

**Descartado (no volver a proponer sin que David lo pida):**
- Ronda 5: web de producto en azul grisáceo con una captura pequeña del panel («pobre», «proporciones horribles», «colores muy similares», «sin dinamismo»).
- Ronda 6, primera paleta: marino con dorado y crema («amarillo?», «mezclando colores»).
- Ronda 7: blanco y negro con titulares en serif y el nombre tachado con una barra. David pidió borrarla y volver a la anterior.

**Cerrado por David (5 oct 2026):** al verla restaurada dijo «está perfecto, continúa». La versión vigente queda aprobada; lo que sigue es repasar el resto de la página con este mismo diseño, sin cambiarle el estilo.
