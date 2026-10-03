# Plan · Rediseño UI de Reportia (canal de denuncias anónimas)

Fase actual: 6 · Repaso (aprobado; pendiente de enseñar a la dirección)
Listón: pendiente. Todavía no hay pieza publicada de este método que marque el nivel
Rama: `main`, sin confirmar (decisión de David: todo en local, commit cuando el jefe lo valide) · Punto de retorno: tag `pre-rediseno`

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
Dónde: subweb /v2/canal/:slug (inicio, /denuncia, /consulta) dentro de la misma app; las rutas actuales no cambian
Se desvió de la espina: nada. Añadido: lista de categorías en vez de desplegable, aviso de metadatos en adjuntos, justificante descargable con nombre neutro, formato automático del código (A3B7-C9X2)
Decidido a propósito: el borrador NO se guarda en el navegador (en un equipo de empresa sería un riesgo para el anonimato)
Archivos de la pieza: src/v2/ (v2.css, V2Layout, V2Canal, V2Home, V2Form, V2Track), rutas en src/App.jsx, textos v2 en src/translations.js, modo demo en src/lib/supabase.js
Propuesta completa en v2 (las rutas antiguas siguen intactas):
- Canal: /v2/canal/:slug, /denuncia, /consulta
- Sitio: /v2 (landing), /v2/crear-cuenta, /v2/acceso, /v2/acceso/recuperar, /v2/acceso/restablecer, /v2/privacidad
- Panel: /v2/panel (listado con plazos Ley 2/2023), /v2/panel/denuncias/:id, /v2/panel/usuarios, /v2/panel/seguridad
- Documentos: src/v2/lib/exportV2.js (PDF informe y ficha, Excel con hoja Resumen; Wix Madefor incrustada)
- Correos de Supabase Auth: src/v2/emails/ (confirmación, invitación, recuperación, cambio de correo; se pegan en el dashboard de Supabase)
- Demo sin base de datos: src/lib/demoStore.js (18 denuncias, 4 usuarios), solo sin credenciales
Comprobado: recorridos automáticos de canal, sitio y panel en es/ca/en, a 1440 y 390 px, sin desbordes, sin botones partidos, sin errores de consola; build de producción OK

Pendiente para producción (no se ha tocado nada de producción):
- Seguridad (ya existe hoy, no lo introduce v2): la base de datos no limita a los gestores por categoría; un gestor puede abrir cualquier denuncia de su empresa por URL. Necesita migración de RLS
- No hay política RLS de borrado en complaints: "Eliminar" falla en producción. Al borrar, los adjuntos del storage no se eliminan
- Los registros de auditoría que crea updateComplaintStatus (antiguo) se guardan sin organización y no se pueden leer
- La lista de usuarios en producción sale sin correos (no se pueden leer con la clave pública)
- Redirecciones de Supabase (alta, invitación, recuperación) siguen en /admin/...; cambiar a /v2/acceso/... solo si se adopta v2
- Política de privacidad: dice que en la denuncia identificada todos los datos son opcionales, pero el formulario exige el correo (también en la versión actual). Validar con legal, junto con los artículos citados (10, 9, 36) y el plazo de 3 meses
- "Ver un canal de ejemplo" apunta a /v2/canal/demo: en producción hace falta una organización con slug "demo"

## 6 · Repaso
Veredicto: aprobado tras revisión de acabado independiente (8 arreglos aplicados: sin giny de pruebas de Turnstile en demo, un solo vocabulario de estados, radio de la ficha en el panel, sin tarjeta dentro de tarjeta en la landing, objetivos táctiles de 44 px, un solo formato de fecha, prioridad sin icono en baja/normal, botón desactivado legible; contraseña de alta mínimo 8)
Asumido: en el panel, con ratón, los controles compactos miden 40 px (densidad de Operar); en pantallas táctiles suben a 44 px · No se crean PRODUCT.md/DESIGN.md (regla del archivo único: este plan)

## 7 · Publicar
Estado: el diseño nuevo ya ocupa las direcciones de siempre en local (/, /canal/<slug>, /crear-compte, /admin/login, /admin/forgot-password, /admin/reset-password, /admin, /admin/complaints/:id, /admin/users, /admin/mfa, /privacitat). /v2 redirige a /. Las páginas antiguas (src/pages, src/global.css, src/contexts, src/lib/export.js) siguen en el repositorio pero ya no se usan; se pueden borrar cuando se valide
Cómo se publica: commit y push a main (Vercel despliega solo)
Antes de publicar: probar en local con las credenciales reales (.env) entrando con la cuenta administradora de Reportia
Comprobado en producción: pendiente
