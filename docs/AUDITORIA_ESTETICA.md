# Auditoría de estética y tono · «Vuelta», fase 1

Fecha: 13 de octubre de 2026. Rama `main` (commit `8ee6a5e`). **No se ha tocado el código del producto**: este documento, `docs/TEXTOS_PROPUESTA.md`, `docs/PLAN_FASES.md` y las maquetas de `diseno-canal/propuestas/` son propuestas para que David y su jefe elijan.

Manda sobre lo visual `DIRECCION_VISUAL.md` (13 oct 2026). Las maquetas ya lo aplican.

**Las maquetas van por la ronda 3** (ver §10): la ronda 1 era demasiado neutra y la 2, demasiado tintada. La 3 es la ronda 1 con seis añadidos y unas reglas de color cerradas.

## Cómo se ha hecho

- **Modo demo, navegador al 100 %**, en castellano (la web comercial, en los tres idiomas), a 1440×900, 1366×768, 1280×720 y 390×844.
- **33 pantallas × 4 tamaños = 132 capturas**, cada una con sus medidas: tamaños de letra, alto de botones y campos, radios, rellenos, cajas anidadas, cuánta pantalla es azul y cuánto hay que bajar.
- Las maquetas se han medido igual: ningún texto por debajo de 12 px y nada se sale de lado.

**Dónde está cada cosa** (todo en `~/Documents/Canal de denuncias SAAS/`):

| Qué | Carpeta |
|---|---|
| Las 132 capturas de hoy y `medidas.json` | `capturas/vuelta-fase-1/auditoria/` |
| Antes y después al 100 % (tablero, ficha, informe, compartir, entrada y paso 2) | `capturas/vuelta-fase-1/antes-despues/` |
| Capturas de cada maqueta (ronda 3) | `capturas/vuelta-fase-1/maquetas/` |
| Las tres rondas lado a lado, y hoy frente a la ronda 3 (ficha, tablero, entrada e informe; 1440×900 y 390×844) | `capturas/vuelta-fase-1/ronda-3/` |
| Capturas de las rondas 1 y 2 | `capturas/vuelta-fase-1/ronda-1-maquetas/` y `ronda-2-maquetas/` |
| Primera prueba de escala (mismo producto, tamaños nuevos por CSS inyectado) | `capturas/vuelta-fase-1/escala/` |
| Maquetas HTML de la ronda 3 (abre `index.html`); las anteriores, en `ronda-1/` y `ronda-2/` | `diseno-canal/propuestas/` |

**Gravedad:** alta (lo ha señalado tu jefe o tú, o da mala imagen a primera vista) · media · baja.

---

## 1. Lo más importante, en diez líneas

1. **El producto grita en todas partes a la vez.** En una pantalla del panel conviven hasta ocho tamaños de letra, cuatro pesos, seis radios distintos y cinco colores de fondo. No hay una cosa más importante que el resto.
2. **Los títulos son de cartel:** 80 px en la entrada, 56 px en los pasos y el acceso, 48 px en el panel. El texto normal va a 15–16 px. Entre medias no hay casi nada.
3. **La ficha del caso enseña el principio de la denuncia a 40 px.** «Comentarios sexuales a compañeras en el turno de noche» se lee desde tres metros.
4. **El panel en el móvil abruma:** la ficha mide 2.800 px de alto (3,3 pantallas), con banda negra, aviso ámbar, chips rojos y burbujas azules. Compartir, 2.587 px; el informe, 2.491 px.
5. **El canal es azul en un 84 %** de la pantalla en cada paso. Nada destaca sobre un fondo que ya es el color de acento.
6. **Tono de venta dentro del producto:** «Sin nombre, sin crear cuenta y en tres minutos», seis etiquetas de beneficios en la entrada, «Créalo gratis 30 días» en el acceso de un cliente, «Hola, Laura · 9 casos te necesitan hoy».
7. **La marca:** las iniciales «ED» en un cuadrado hacen de logo de la empresa, y una «R» en un cuadrado negro, de logo de Reportia. Ninguno es un logo.
8. **Hay 301 textos de la versión anterior sin uso aparente**, 38 de ellos todavía en «usted», y la demo escribe a quien denuncia tratándole de «usted».
9. **La web comercial tiene 19 tamaños de letra** (de 12 a 89 px). Los «textos de 10–11 px» que ves son las capturas del producto encogidas al 49 % dentro de los móviles: su letra queda a 6–7 px.
10. **Los correos mandan el mismo mensaje dos veces** (castellano y catalán enteros, más un resumen en inglés) con dos botones iguales, y firman con un lema, «Canal de denuncias anónimas», que el abogado tiene pendiente.

---

## 2. Hallazgos, pantalla por pantalla

### 2.1 Canal (quien denuncia)

| n.º | pantalla | qué pasa | por qué molesta | gravedad | propuesta |
|---|---|---|---|---|---|
| C-01 | Entrada | «Denunciar» y «Gestionar» a 80 px (72 px a 1366, 68 px a 1280) | Dos palabras ocupan media pantalla; el resto queda en letra de 14–20 px sin escalón intermedio | alta | Palabra a 56 px como máximo (maquetas Entrada A y B) |
| C-02 | Entrada | Seis etiquetas con icono («Puedes ser anónimo», «Plazos legales automáticos»…) | Son beneficios de venta (P3). Las de Gestionar se le dicen a quien ya lo ha contratado | alta | Quitarlas |
| C-03 | Entrada | Dos cuadros de 84 px con icono (bocadillo y cuadrícula) | No informan y ocupan la parte alta de cada tarjeta (obs. 3) | alta | Quitarlos |
| C-04 | Entrada | «¿Ya lo contaste? Mira tu caso» es una píldora azul oscuro sobre azul, más pequeña que «Empezar» | Es la segunda acción más usada y casi no se ve (P4) | alta | Segundo botón, del mismo tamaño que el principal: «Consultar mi caso» |
| C-05 | Entrada | Las dos mitades flotan con 32 px de margen y esquinas de 32 px | Tu jefe las quiere de borde a borde (P5). Las esquinas dan aire de «app» | alta | A todo el ancho, sin esquinas |
| C-06 | Entrada | Gestionar pesa exactamente lo mismo que Denunciar | Casi todas las visitas son de la plantilla (obs. 2) | media | Se probó (62 % / 38 %) y se descartó: David decidió dos mitades iguales (entrada A+, §10) |
| C-07 | Entrada | «Cuenta lo que has visto. Sin nombre, sin crear cuenta y en tres minutos.» | Promesa y frases a golpe de punto (P2, P7) | alta | Ver `TEXTOS_PROPUESTA.md` |
| C-08 | Entrada | «ED» en un cuadrado negro como logo | No es un logo (P1, obs. 4) | alta | Logo del cliente o solo el nombre (fase 3); en las maquetas, un símbolo de ejemplo |
| C-09 | Entrada | Pie con cuatro enlaces subrayados y «Con Reportia» | Reportia fuera del canal (P1, obs. 8) | media | Lo decide tu jefe: fuera o al final, en gris |
| C-10 | Entrada (móvil) | No cabe en 844 px (mide 889) y la tarjeta azul ocupa el 60 % | Hay que bajar para ver el pie; el azul manda | media | Maqueta de móvil: una columna, dos botones y Gestionar en una fila al pie |
| C-11 | Todos los pasos | El 81–84 % de la pantalla es azul intenso | Cansa y no deja que el botón principal destaque: es blanco sobre azul, como las tarjetas | alta | Formulario sobre blanco; el color, solo en el botón y en la barra de progreso |
| C-12 | Todos los pasos | Franja blanca «Gestionar» de 76 px a toda altura | Tu jefe pide que desaparezca (P6). Además invita a salir del formulario | alta | Sin franja; «Volver al inicio del canal» arriba |
| C-13 | Todos los pasos | Título a 56 px y botones de 58 px | Escala de cartel para una pregunta de formulario | alta | Título a 28 px, botón principal a 44 px |
| C-14 | Escribir el código | Cuadro con icono de llave, campo de 76 px con letra de 34 px, botón de 58 px, nota en caja | Cinco piezas grandes para un solo campo | media | Campo de 48 px con el botón al lado; la nota, en una línea |
| C-15 | Paso 1 | Nueve tarjetas de 126 px con cuadro de icono cada una, y la novena con borde discontinuo | Nueve iconos compitiendo; el discontinuo parece otra cosa | media | Opciones de radio compactas en tres columnas, sin iconos |
| C-16 | Paso 2 | Párrafo de 60 palabras a 12 px dentro del recuadro de pruebas (el 30 % del texto de la pantalla va por debajo de 13 px) | No se lee; es justo la información delicada (obs. 5) | alta | Una frase y un enlace «Qué datos se quitan de los archivos» (maqueta Paso 2) |
| C-17 | Paso 2 | «Ayuda: ✓ Qué pasó ✓ Dónde ✓ Cuándo ✓ Quién estaba» en verde | Aire de juego en un tema serio (obs. 6) | alta | Una frase de ayuda bajo el campo |
| C-18 | Paso 2 | Tres cajas dentro del azul (blanca, blanca y discontinua) y un aviso ámbar dentro de la primera | Cajas dentro de cajas; el ámbar grita para un consejo | media | Una columna con secciones separadas por línea; la nota de privacidad, en una línea gris |
| C-19 | Paso 3 | Etiqueta «Recomendado» junto al anonimato | El canal empuja hacia una opción | media | Quitarla: ya va primero y marcado |
| C-20 | Paso 3 | A 1366×768 no cabe (782 px) | Hay que bajar para llegar a «Enviar denuncia» | media | Con la escala nueva cabe |
| C-21 | Enviada | «Enviada. Guarda tu código.» a 56 px, círculo con ✓ de 64 px y tres botones iguales | El código, que es lo único importante, es lo cuarto que se mira | alta | El código arriba y grande; «Copiar» como único botón principal; «Qué pasa ahora», en tres líneas |
| C-22 | Mi caso | El título es el estado como frase («La están investigando») a 48 px | Un estado no es un titular | media | «En investigación», en una línea con su fecha; la conversación, protagonista |
| C-23 | Mi caso | Los mensajes de ejemplo tratan de «usted» | El producto va en «tú» | baja | Pasarlos a «tú» en la demo |
| C-24 | Canal que no existe | «Ir a Reportia», «¿Tienes una empresa? Crea su canal» | Venta dentro del canal (P1) | media | Quitarlo |
| C-25 | Privacidad | Correcta: texto legal en una hoja | — | — | Solo la escala nueva (título a 28 px) |

### 2.2 Panel (quien gestiona), en ordenador

| n.º | pantalla | qué pasa | por qué molesta | gravedad | propuesta |
|---|---|---|---|---|---|
| P-01 | Todo el panel | Franja azul «Ver el canal» de 76 px a toda altura | Un enlace que se usa poco ocupa el 5 % de cada pantalla (obs. 13, P6) | alta | Enlace «Ver el canal ↗» en la cabecera |
| P-02 | Cabecera | Iniciales en cuadrado, chips «Demo» y «Prueba · 21 días», menú en píldoras dentro de otra píldora, lupa en círculo, botón azul y avatar melocotón | Siete piezas de siete formas compiten (obs. 15) | alta | Marca, menú en texto con el activo subrayado, plan en texto pequeño, avatar gris |
| P-03 | Tablero | «Hola, Laura» y «9 casos te necesitan hoy» a 48 px | Título «simpático» y enorme (obs. 12) | alta | «Tablero» a 28 px; debajo, «9 casos requieren una acción hoy» |
| P-04 | Tablero | Las tarjetas se titulan con el principio de la denuncia | Cualquiera que pase por detrás lo lee (obs. 1) | alta | Referencia y tema; título propio si el gestor lo pone |
| P-05 | Tablero | Aviso ámbar a toda anchura, de 100 px | Un fondo de color para un aviso que no es urgente | alta | Una línea plegada con un punto ámbar |
| P-06 | Tablero | Cada tarjeta lleva hasta cuatro chips de colores («Hoy» en negro, rojo, ámbar, azul) | Todo parece urgente; no se sabe por dónde empezar | alta | El plazo en texto con un punto de color; lo demás, en gris |
| P-07 | Tablero | A 1440×900 se ven tres tarjetas por columna; la página mide 1.817 px | Poca densidad para una herramienta de trabajo | media | Tarjetas compactas: caben cinco por columna |
| P-08 | Tablero | «Primeros pasos» con un anillo «3/5» y un botón de plegar pegado | Pieza rara que compite con el título | media | Una línea plegada: «Puesta en marcha: 3 de 5» |
| P-09 | Ficha del caso | Título de 40 px con el principio de la denuncia, a dos líneas | Delicado y enorme (obs. 1) | alta | «REF-7P2MQA · Acoso laboral o sexual» a 26 px |
| P-10 | Ficha del caso | Banda negra de 116 px con el paso a paso y un botón blanco | El bloque más pesado de la pantalla no es el contenido | alta | Paso a paso fino sobre blanco; el siguiente paso, único botón de color |
| P-11 | Ficha del caso | Cinco tarjetas grises apiladas a la derecha, con campos y botones blancos dentro | Cajas dentro de cajas (15 cajas, 5 de ellas anidadas) | alta | Una columna con secciones separadas por líneas |
| P-12 | Ficha del caso | Cuatro datos («Dónde», «Cuándo»…) en cuatro cajas grises | Más cajas | media | Lista de dos columnas con líneas finas |
| P-13 | Ficha del caso | Burbujas del equipo en azul intenso | Otro bloque de color; la conversación no necesita destacar al remitente con el acento | media | Burbujas grises; el remitente, en el nombre |
| P-14 | Registrar | Tarjeta negra «Qué pasa al guardarlo» | Bloque oscuro para una explicación secundaria | media | Texto gris a la derecha, sin caja |
| P-15 | Informe | Título «2026, de un vistazo» a 48 px | Título «simpático» (obs. 12) | alta | «Informe de 2026» |
| P-16 | Informe | Cuatro cifras en cuatro tarjetas: una azul intenso, dos grises y una rosa | El azul no significa nada; el rosa es una caja de alarma entera (obs. 14) | alta | Una fila de cifras a 30 px sin rellenos; solo la de plazos vencidos, en rojo |
| P-17 | Informe | Barras de 170 px en azul claro y azul intenso; siete tarjetas blancas dentro de una gris | Gráficos desproporcionados; cajas en cajas | media | Gráficos pequeños y neutros; el acento, solo en el mes en curso |
| P-18 | Compartir | Título «Que toda la plantilla lo encuentre» | Título «simpático» (obs. 12) | alta | «Compartir el canal» |
| P-19 | Compartir | Bloque negro «Primeros pasos» a toda anchura, con otra caja dentro | Pesa más que el enlace, el QR y el botón (obs. 16) | alta | Una línea con el progreso |
| P-20 | Compartir | Cuatro tarjetas y 24 botones y selectores en la pantalla, casi todos en píldora | No se ve cuál es la acción de cada una | media | Lista de cuatro filas: qué es, vista previa y su acción a la derecha |
| P-21 | Equipo y ajustes | Tres niveles: página, tarjeta gris y filas blancas; avatares de tres colores | Cajas en cajas; colores sin significado | media | Secciones con título y línea; avatares grises |
| P-22 | Acceso | Cuadro con icono de 72 px, «Gestionar» a 56 px, campos de 54 px y botón de 58 px | Escala de cartel | alta | Formulario de 400 px, título a 26 px (maqueta Entrada A, «Al elegir Acceder») |
| P-23 | Acceso | «¿Tu empresa aún no tiene canal? Créalo gratis 30 días» | Venta de Reportia en el acceso de un cliente (P1) | alta | Quitarlo |
| P-24 | Verificación | «Un último paso» a 48 px; casillas de 66 px | Tono de app de consumo | media | «Verificación en dos pasos»; casillas de 48 px |
| P-25 | Contraseña nueva | Una «R» blanca en un cuadrado negro con «Reportia» al lado, y la franja azul dice «Reportia» | Es lo que parece hecho por un niño (obs. 11) | alta | Icono oficial y nombre (maqueta Identidad) |

### 2.3 Panel en el móvil (observación 21)

| n.º | pantalla | qué pasa | por qué molesta | gravedad | propuesta |
|---|---|---|---|---|---|
| M-01 | Tablero | En la primera pantalla: título de 34 px, tarjeta «Primeros pasos», aviso ámbar de unos 160 px y pestañas; la primera tarjeta empieza a media pantalla | Lo importante (los casos) queda abajo | alta | Título de 22 px, el aviso en una línea y la lista desde arriba; «Primeros pasos» fuera del tablero del móvil |
| M-02 | Tablero | Tarjetas con borde rojo y chips negros, rojos y ámbar | Todo parece urgente | alta | Lista ordenada por urgencia; el plazo en texto con un punto |
| M-03 | Ficha | Mide 2.800 px (3,3 pantallas). Banda negra, chips, cajas grises, burbujas azules | Abruma; el siguiente paso se pierde al bajar | alta | Pestañas Resumen · Conversación · Gestión y el siguiente paso fijo abajo |
| M-04 | Informe | 2.491 px; tarjeta azul y tarjeta rosa en una cuadrícula | Hipercolorido | alta | Cuadrícula de 2 × 2 sin rellenos; gráficos debajo |
| M-05 | Compartir | 2.587 px; el bloque negro ocupa la primera pantalla | Lo que se viene a buscar (el enlace) está abajo | alta | Lista; la puesta en marcha, en una línea |
| M-06 | Barra inferior | Iconos con una píldora azul claro detrás del activo | Otra forma más | baja | Activo en el color de acento, sin píldora |

### 2.4 Los cuatro correos

| n.º | qué pasa | por qué molesta | gravedad | propuesta |
|---|---|---|---|---|
| E-01 | Cabecera con la «R» en un cuadrado negro y «Reportia» en texto | No es el logo (obs. 11) | alta | Logo oficial, verde sobre azul petróleo (maqueta Identidad) |
| E-02 | Lema «Canal de denuncias anónimas» | El canal también admite denuncias identificadas (duda 23 del abogado) | media | Quitar el lema hasta que el abogado responda |
| E-03 | El mismo mensaje entero en castellano y en catalán, cada uno con su botón, y un resumen en inglés | El correo mide 1.259 px; dos botones azules iguales | media | Un solo idioma por correo cuando se sepa el de la persona; si no, un botón y los otros dos idiomas como texto |
| E-04 | Entre el 21 y el 30 % del texto va a 12 px | Poco legible en el móvil | media | Mínimo 13 px; cuerpo a 15 px |
| E-05 | Botón en píldora azul | Igual que el producto | baja | El mismo botón que salga elegido para el producto |
| E-06 | Las plantillas se pegan a mano en Supabase | Según el plan, sin correo propio (SMTP) Supabase no deja editarlas: los correos reales de hoy no serían estos | alta | Antes de lanzar: SMTP propio (ver `PLAN_FASES.md`) |

### 2.5 Web comercial (se rehará en la fase 5; no hay maqueta)

| n.º | pantalla | qué pasa | por qué molesta | gravedad | propuesta |
|---|---|---|---|---|---|
| W-01 | Portada | 19 tamaños de letra distintos, de 12 a 89 px | No hay escala: cada bloque inventa la suya (obs. 17) | alta | La misma escala que el producto, con un solo tamaño más para el titular (ver §3) |
| W-02 | Portada · Cómo funciona | Cuatro capturas del producto dentro de móviles de 190 px: se ven al 49 % y su letra queda a 6–7 px | Son los «textos de 10–11 px»: ilegibles (obs. 17) | alta | Una captura grande y recortada por paso, nunca por debajo del 70 % de su tamaño |
| W-03 | Portada · Qué se puede comunicar | Bloque oscuro con una frase entre comillas a 46 px | Parece un testimonio inventado (obs. 18) | alta | Ejemplos descriptivos, sin comillas y sin bloque oscuro |
| W-04 | Portada · botón de pausa | «Detener el paso automático» / «Stop moving on» | Mal inglés y demasiado largo (obs. 18) | alta | «Pausar» / «Pause» |
| W-05 | Portada · ¿Está obligada? | Cuatro cifras en tarjetas pequeñas; la cuarta, «1.000.000 € de multa máxima» | Usar la multa de gancho suena a meter miedo (obs. 19) | alta | La multa, como un artículo más de la lista, sin cifra grande. Lo decide tu jefe |
| W-06 | Portada | Ocho bloques con las mismas cajas redondeadas (cifras, plazos, requisitos, seguridad, precios, preguntas) | Todo pesa igual: mil cajas sin jerarquía (obs. 17) | alta | Menos bloques y un foco por bloque |
| W-07 | Portada · inicio | Foto de stock oscura a pantalla completa con titular de 89 px | La decisión de la foto fue tuya (6 oct); la escala no casa con el producto nuevo (obs. 10) | media | Se decide al rehacerla |
| W-08 | Portada | Las piezas aparecen al bajar; hasta entonces son invisibles | En las capturas de cada sección quedan huecos en blanco donde aún no habían aparecido: si el navegador va lento, es lo que se ve | media | Que el contenido esté siempre a la vista; el movimiento, un añadido |
| W-09 | Portada · paso 3 | «Gestione desde el panel» (CA: «Gestioni») | Resto de «usted» | media | «Gestiona desde el panel» |
| W-10 | Portada (inglés) | «Tailored», «runs with no guard», «employees: mandatory from here», «Whistleblowing channel» frente a «Reporting channel» | Inglés poco natural y vocabulario distinto del producto | media | Ver `TEXTOS_PROPUESTA.md` |
| W-11 | Portada · Seguridad | «Los datos se guardan cifrados en el servidor» | Es una afirmación técnica que conviene comprobar con el proveedor antes de publicarla | media | Confirmarla o quitarla |
| W-12 | Portada · tono | «Tu plantilla avisa… Tu empresa la investiga y responde.», «Los plazos de la ley, siempre a la vista», «¿Prefieres que te lo enseñemos?» | Tono de anuncio (obs. 20) | alta | Ver `TEXTOS_PROPUESTA.md` |
| W-13 | Crear cuenta | Título a 38 px, campos de 52 px, tarjeta azul claro «Qué incluye» | Tercera escala distinta (producto 48–56, portada 56–89) | media | La escala común |
| W-14 | Crear cuenta | Sin captcha ni condiciones del servicio | Ya consta en `AUDITORIA.md` (A1-6, 3.4) | — | Antes de lanzar |
| W-15 | Privacidad | Correcta | — | — | Solo la escala común |
| W-16 | Toda la web (móvil) | La portada mide 11.587 px en el móvil | Catorce pantallas de scroll | media | Menos bloques |

### 2.6 Lo que está bien y conviene no perder

- Los estados (cargando, vacío, error, sin conexión, sin permiso) existen y tienen texto. Solo hay que rebajarles el tamaño y el color.
- El contraste de hoy pasa el mínimo en todas las pantallas; las maquetas lo mantienen.
- La estructura de las pantallas (qué hay en cada una) es buena. El problema es cómo se ve, no qué se ve.
- Nada se mueve al cambiar de idioma. Es una regla que hay que mantener al programar las pantallas nuevas (las maquetas solo están en castellano).

---

## 3. Escala nueva (§2 bis del plan y `DIRECCION_VISUAL.md`)

### 3.1 De dónde viene el problema, medido

| Hoy (1440×900) | Medida |
|---|---|
| Tamaños de letra por pantalla | 5–8 en el producto; 19 en la portada |
| Título | 80 px (entrada), 56 px (pasos, acceso), 48 px (panel), 40 px (ficha) |
| Botones | 64, 58, 54, 48, 44 y 40 px de alto, a veces en la misma pantalla |
| Radios | 6, 10, 11, 14, 16, 18, 20, 22, 24, 28, 32 px y píldora |
| Rellenos de tarjeta | 14, 16, 18, 20, 22, 24, 26 y 48 px |
| Pesos de letra | 400, 500, 600, 700 y 800 |
| Pantalla en azul intenso | 37 % en la entrada; 81–84 % en cada paso |

### 3.2 Tabla de tokens (`ds.css`): valor actual y propuesto

| Token o pieza | Hoy | Propuesto (ordenador) | Propuesto (móvil) |
|---|---|---|---|
| Palabra de la entrada (`.ds-hero`) | 80 px, peso 800 | **56 px**, peso 700 | 40 px |
| Título de página (`.ds-h1`) | 34–56 px, peso 800 | **28 px**, peso 700, tracking −0,02 em | 22 px |
| Título de la ficha | 40 px | **26 px** | 20 px |
| Título de sección (`.ds-card-title`) | 17–24 px, peso 800 | **17 px**, peso 600 | 16 px |
| Entradilla (`.ds-lead`) | 19–20 px | **15 px** (17 px solo en la entrada) | 15–16 px |
| Texto normal | 16 px | **15 px**, interlineado 1,55 | 15 px; **16 px en campos** |
| Texto secundario y etiquetas | 12–14 px | **13 px** | 13 px |
| Mínimo absoluto | 11,7 px (un caso) | **12 px** | 12 px |
| Pesos | 400, 500, 600, 700, 800 | **400, 500, 600, 700** (el 800 desaparece) | igual |
| Botón principal (`.is-lg`, `.is-xl`) | 58–64 px | **44 px** (48 px en la entrada) | 44–48 px |
| Botón normal (`.is-md`) | 48 px | **40 px** | 44 px |
| Botón pequeño (`.is-sm`, `.is-xs`) | 40–44 px | **32 px** | 44 px (zona táctil) |
| Campo (`.ds-input`) | 54 px; pequeño, 44 px | **40 px** (44 px en el acceso) | 44–48 px |
| Campo del código | 76 px, letra de 34 px | **48 px**, letra de 22 px | 48 px |
| Casilla del código de 6 cifras | 66 px | **48 px** | 48 px |
| Relleno de tarjeta (`.ds-card`) | 18–48 px | **20 px** (24 px en tarjetas grandes) | 16 px |
| Relleno de la página del panel | 24–32 px | **28 px arriba, 24 px a los lados** | 16 px |
| Separaciones | 4–32 px, sin escala | **8, 12, 16, 20, 24, 32, 48** | igual |
| `--r-xl` (paneles) | 32 px | **0** en las mitades; 14 px en tarjetas | igual |
| `--r-lg`, `--r-md` (tarjetas) | 24 y 20 px | **14 px** | 12 px |
| `--r-input` | 16 y 12 px | **8 px** | 8 px |
| `--r-pill` (botones) | 999 px | **10 px** (o píldora: ver 3.4) | igual |
| Etiquetas (`.ds-chip`) | fondo de color, 10–18 px de radio | **texto con un punto de color**; etiqueta gris de 6 px de radio | igual |
| Bordes | casi ninguno; se separa con fondos | **línea de 1 px** `#E3E6ED` | igual |
| Sombras | una (`--shadow-picked`) | **ninguna** | igual |
| Ancho máximo del contenido | sin límite | **1.184 px** en el panel; 880 px en los pasos; 400 px en el acceso | márgenes de 16 px |
| Objetivo táctil mínimo | 40–44 px | 32 px con ratón (el mínimo exigido es 24) | **44 px** |

### 3.3 La misma escala para la web comercial

La web tiene el problema contrario en parte: titulares de 56–89 px junto a capturas ilegibles. Propuesta: **una sola escala para todo**, con un único tamaño añadido para el titular de la portada.

| Papel | Producto | Web comercial |
|---|---|---|
| Titular de la portada | — | **48 px** (36 px en el móvil) |
| Título de página o de sección | 28 px | **28–32 px** |
| Subtítulo | 17 px | **18–20 px** |
| Texto | 15 px | **16 px** |
| Secundario | 13 px | **14 px** |
| Mínimo | 12 px | **13 px** |
| Capturas del producto | — | **nunca por debajo del 70 %** de su tamaño real; si no caben, se recortan |
| Botones | 44 / 40 px | 48 / 44 px |

Son seis tamaños en lugar de diecinueve.

### 3.4 Botones: esquinas de 10 px o píldora

`DIRECCION_VISUAL.md` pide verlo con capturas. Está en la maqueta `Botones-10px-o-pildora.html` (la misma ficha y la misma entrada, de las dos maneras) y en `capturas/vuelta-fase-1/maquetas/botones-*.png`.

**Recomendación: 10 px.** Con campos y tarjetas de esquinas casi rectas, la píldora es lo único redondo que queda y es lo que da el aire de «app». Es un solo valor: se puede cambiar de opinión sin rehacer nada.

### 3.5 Antes y después al 100 %

En `capturas/vuelta-fase-1/antes-despues/` está hoy frente a la **ronda 1**. Hoy frente a la **ronda 3** (la propuesta vigente) está en `capturas/vuelta-fase-1/ronda-3/`, en los archivos `*-hoy-y-ronda-3.png`. Cada pareja tiene el antes, el después y una imagen con los dos lado a lado.

| Pantalla | 1440×900 | 390×844 |
|---|---|---|
| Tablero | `tablero-1440-antes-y-despues.png` | `tablero-390-antes-y-despues.png` |
| Ficha del caso | `ficha-1440-antes-y-despues.png` | `ficha-390-antes-y-despues.png` |
| Informe | `informe-1440-antes-y-despues.png` | `informe-390-antes-y-despues.png` |
| Compartir | `compartir-1440-antes-y-despues.png` | `compartir-390-antes-y-despues.png` |
| Entrada | `entrada-1440-1-antes.png`, `-2-despues-A.png`, `-3-despues-B.png` | `entrada-390-antes-A-B.png` |
| Paso 2 | `paso2-1440-1-antes.png`, `-2-despues.png` | (en `maquetas/paso2-390.png`) |

**Cómo se ha hecho el «después»:** son las maquetas nuevas, que cambian escala **y** estructura.

**La primera prueba** (carpeta `escala/`) aplicaba solo los tamaños nuevos al producto real, inyectando CSS en el navegador de pruebas, a 1440×900 y 1366×768. Sirvió para comprobar que el tablero, la ficha y compartir mejoran solo con la escala. En la entrada no: al encoger, queda mucho azul vacío con textos pequeños. **La entrada no se arregla encogiendo, sino con la estructura nueva** (maquetas A y B). Se conserva la carpeta como referencia, con la hoja de estilos usada (`escala-nueva.css`).

---

## 4. Las 21 observaciones del plan, comprobadas

| n.º | Observación | ¿Se confirma? | Evidencia | Dónde se resuelve |
|---|---|---|---|---|
| 1 | La ficha se titula con el principio de la denuncia, en letra gigante | **Sí** | 40 px, dos líneas; el tablero hace lo mismo en cada tarjeta | Maquetas Ficha y Tablero |
| 2 | Gestionar pesa lo mismo que Denunciar | **Sí** | Dos tarjetas idénticas de 680 px | Decidido el 13 de octubre: se quedan dos mitades iguales (entrada A+, §10) |
| 3 | Cuadros con icono enormes en la entrada | **Sí** | 84 × 84 px cada uno | Entradas A y B |
| 4 | El «logo» son las iniciales | **Sí** | «ED» en un cuadrado de 40 px, en el canal y en el panel | Símbolo de ejemplo; logo real en la fase 3 |
| 5 | Paso 2: párrafo largo en letra pequeña | **Sí** | 60 palabras a 12 px | Maqueta Paso 2 |
| 6 | Etiquetas «Ayuda» con ✓ verdes | **Sí** | Cuatro chips verdes | Maqueta Paso 2 |
| 7 | Frases de venta en la entrada | **Sí** | Seis etiquetas y la entradilla | `TEXTOS_PROPUESTA.md` |
| 8 | Pie «Con Reportia» | **Sí** | En el canal y en el acceso | Decide tu jefe |
| 9 | `README.md` y `.env.example` son de la época de Linda | **Sí** | El README enlaza y clona su repositorio; `.env.example` aún lista las tres variables de EmailJS, que ya no se usa, y no `VITE_AI_ENABLED` | Fase 2 (limpieza) |
| 10 | Portada: foto oscura y «para su empresa» | **A medias** | La foto sigue; el «su» ya es «tu» desde `8ee6a5e`. Queda «Gestione» en el paso 3 | Fase 5 |
| 11 | El «logo» de Reportia parece hecho por un niño | **Sí** | «R» en cuadrado negro en «Contraseña nueva», en los correos y en el acceso sin empresa; la pestaña lleva un escudo que no es de nadie | Maqueta Identidad |
| 12 | Títulos «simpáticos» en el panel | **Sí** | «Hola, Laura», «9 casos te necesitan hoy», «Que toda la plantilla lo encuentre», «2026, de un vistazo», «Un último paso», «Te damos la bienvenida» | `TEXTOS_PROPUESTA.md` |
| 13 | Franja azul «Ver el canal» | **Sí** | 76 px a toda altura en las nueve pantallas del panel | Enlace en la cabecera |
| 14 | Informe: cifras gigantes y tarjeta azul | **Sí** | Cifras a 48 px; una tarjeta azul y otra rosa | Maqueta Informe |
| 15 | Cabecera del panel recargada | **Sí** | Siete piezas de siete formas | Cabecera de las maquetas |
| 16 | Compartir: el bloque oscuro pesa demasiado | **Sí** | 217 px de alto a toda anchura, con otra caja dentro | Maqueta Compartir |
| 17 | Portada: escalas incoherentes y textos de 10–11 px | **Sí, con un matiz** | 19 tamaños. El texto más pequeño de la página es de 12 px; lo ilegible son las capturas del producto al 49 % (letra a 6–7 px) | §3.3 y fase 5 |
| 18 | «Qué se puede comunicar» parece un testimonio; «Stop moving on» | **Sí** | Frase entre comillas a 46 px sobre negro; el botón dice eso en inglés | `TEXTOS_PROPUESTA.md` y fase 5 |
| 19 | La multa como gancho | **Sí** | «1.000.000 €» es una de las cuatro cifras destacadas | Decide tu jefe |
| 20 | Textos de venta en la portada | **Sí** | Ver W-12 | `TEXTOS_PROPUESTA.md` y fase 5 |
| 21 | El panel en el móvil abruma | **Sí** | Ficha de 2.800 px; aviso ámbar, chips rojos, banda negra, tarjeta azul y bloque oscuro en la misma pantalla | Maquetas de móvil |

---

## 5. Propuestas propias, por orden de impacto

Cada una dice por qué y dónde se ve. Pasan a `PLAN_FASES.md` como fuente 6.

| n.º | Propuesta | Por qué | Dónde se ve |
|---|---|---|---|
| CC-01 | **El color solo para la acción principal.** Los pasos dejan de ser azules de fondo: formulario sobre blanco, y el acento en el botón, la barra de progreso y lo seleccionado. En la entrada, la mitad de Denunciar sí va sobre el color (entrada A+, ronda 3) | Hoy el 84 % de la pantalla es el color de acento y el botón principal es blanco: está al revés. Además, con la marca blanca ese fondo será el color de cada cliente | Entrada A; Paso 2 |
| CC-02 | **Título neutro en tablero y ficha** (referencia y tema), con título propio opcional | Confidencialidad: hoy el contenido se lee a distancia | Tablero, Ficha |
| CC-03 | **La urgencia, sin leer.** Barra a la izquierda de la tarjeta y etiqueta con fondo suave: rojo si el plazo está vencido, ámbar si vence en 6 días o menos (acuse) o 14 (respuesta). Lo demás, en gris (ronda 3) | Si todo lleva chip, nada es urgente | Tablero, Ficha |
| CC-04 | **Panel en el móvil como herramienta de consulta:** lista por urgencia, ficha en tres pestañas y el siguiente paso fijo abajo | La ficha pasa de 3,3 pantallas a una por pestaña | Maquetas de móvil |
| CC-05 | **Identidad de Reportia con el logo oficial**, y fuera del canal | Lo de hoy no es un logo. Detalle en §6 | Maqueta Identidad |
| CC-06 | **«Tu marca»: logo, nombre y ocho paletas cerradas**, y «Apariencia» por gestor | Idea de David para la fase 3. Detalle en §7 | Maqueta Tu marca; Modo oscuro |
| CC-07 | **Una cabecera de panel:** marca del cliente, menú en texto, «Ver el canal», buscar, «Registrar caso» y avatar gris; el plan, en texto pequeño | Quita siete formas distintas y la franja lateral | Todas las maquetas del panel |
| CC-08 | **Avisos en una línea**, que se despliegan al pulsar (supresión, puesta en marcha, AIPI) | Un aviso no urgente no puede ser lo más grande de la pantalla | Tablero, Compartir |
| CC-09 | **Informe sobrio:** cifras en una fila, gráficos neutros y pequeños, una sola cifra en rojo | Un informe para dirección debe poder leerse como un documento | Informe |
| CC-10 | **Iconos: quitar los decorativos, dejar los funcionales.** Fuera los cuadros con icono de la entrada, del acceso, de «Mira tu caso», de cada tema del paso 1 y de «Enviada». Se quedan los de acción (copiar, descargar, adjuntar, salir, buscar) y los de la barra del móvil. Trazo de 1,8 px y 16–20 px en todos | Hoy hay 27 iconos entre la entrada (13) y el paso 1 (14) | Todas |
| CC-11 | **Estados vacíos, cargando y error, en la misma voz:** una línea gris con la acción al lado («Todavía no hay mensajes.», «No se han podido cargar los casos. Reintentar»). Sin ilustraciones, sin icono grande y sin caja de color. El esqueleto de carga, con la forma final y sin parpadeo fuerte | Hoy el vacío del tablero tiene título de 22 px e icono; el error, una caja rosa | Ficha (conversación vacía) |
| CC-12 | **PDF del caso y del informe:** cabecera con el nombre o el logo de la empresa, cuerpo a 10 pt, tablas con líneas finas y pie «Generado con Reportia» con fecha y página. Mismos tamaños y los mismos nombres que la pantalla | Hoy los PDF no llevan ninguna marca visible: «Reportia» solo figura en las propiedades del archivo. No se han vuelto a generar en esta fase (ver §9) | Maqueta Identidad (PDF) |
| CC-13 | **Cartel con QR:** el logo o el nombre de la empresa arriba, una frase, el QR grande, la dirección escrita y la línea legal. Los tres puntos informativos de hoy, en una frase | Con la marca blanca, el cartel debe parecer de la empresa | Fase 3 (con la marca) |
| CC-14 | **Correos:** un idioma por correo, un solo botón, logo oficial y sin lema | Ver E-01 a E-05 | Maqueta Identidad (correo) |
| CC-15 | **«Enviada»: el código, lo primero.** Código grande, «Copiar» como botón principal, «Descargar justificante» secundario y tres líneas de «qué pasa ahora» | Es la pantalla más importante para quien denuncia: si pierde el código, pierde el caso | Fase 2 (sin maqueta: sigue el patrón del Paso 2) |
| CC-16 | **Pequeñas interacciones:** (1) cambio de lado en 250 ms, instantáneo con «reducir movimiento»; (2) «Copiar» pasa a «Copiado» durante 2 s sin cambiar de ancho; (3) los avisos de «guardado» salen abajo, 4 s, en gris oscuro, nunca en verde; (4) foco de 2 px en el color de acento con 2 px de separación, igual en todas las piezas; (5) los botones se oscurecen un 8 % al pasar el ratón, sin moverse ni crecer; (6) al enviar, el botón muestra «Enviando…» y no se puede pulsar dos veces | Dan sensación de producto cuidado sin llamar la atención | Notas de las maquetas Entrada A y B |
| CC-17 | **Borrar los 301 textos sin uso** y pasar a «tú» los mensajes de ejemplo de la demo | Hay 38 textos en «usted» esperando a aparecer en un descuido | `TEXTOS_PROPUESTA.md` |
| CC-18 | **La pestaña del navegador:** icono oficial en el panel y la web; en el canal, uno neutro (y el logo del cliente en la fase 3). El título de la pestaña del canal, sin «Reportia» | Hoy es un escudo que no es de nadie | Maqueta Identidad |
| CC-19 | **Modo oscuro** en el canal (según el sistema) y en el panel (lo elige cada gestor) | Sale casi solo si los colores pasan a ser variables por paleta | Maqueta Modo oscuro |
| CC-20 | **«Ver el canal» abre el canal de la empresa en otra pestaña**, y desde el canal no hay camino al panel salvo «Acceder» | Sin franjas, los dos lados dejan de mezclarse | Cabecera del panel |

---

## 6. Identidad de Reportia

Archivos oficiales: `marca-reportia/reportia-logo-verde.svg` (logotipo) y `reportia-icono-R.png` (icono). Son los mismos que usa reportia.es. **No se ha dibujado ningún logo nuevo.**

**Contraste medido:**

| Combinación | Contraste | Sirve para |
|---|---|---|
| Verde `#27D18D` sobre azul petróleo `#294E59` | 4,5:1 | El logotipo en correos, vista previa y web |
| Verde sobre blanco | 2,0:1 | Solo como logo, nunca como texto ni botón |
| Verde sobre la tinta del producto `#0D1530` | 9,1:1 | Modo oscuro |
| Blanco sobre azul petróleo | 9,0:1 | Texto sobre bandas petróleo |

**Dónde va cada cosa:**

| Sitio | Hoy | Propuesta |
|---|---|---|
| Canal de cada cliente | «Con Reportia» en el pie; pestaña «Reportia» | Nada de Reportia (marca blanca). Lo del pie lo decide tu jefe |
| Panel | Iniciales del cliente en un cuadrado; «Con Reportia» subrayado | Manda la marca del cliente. En el pie, «Gestionado con» + icono oficial de 18 px + «Reportia» |
| Acceso sin empresa y «Contraseña nueva» | «R» blanca en cuadrado negro | Icono oficial de 28 px y «Reportia» |
| Correos | «R» en cuadrado y lema | Banda azul petróleo con el logotipo verde |
| PDF | Sin marca visible (solo en las propiedades del archivo) | Pie «Generado con Reportia» con el icono; la cabecera, de la empresa |
| Pestaña | Escudo blanco sobre azul | Icono oficial (panel y web); neutro en el canal |
| Vista previa al compartir | «Reportia» en letra sobre la foto | Web: logotipo sobre azul petróleo. Canal: «Canal de denuncias de {empresa}», sin Reportia |

**Dos decisiones para tu jefe:**

1. **«Reportia» escrito en tinta junto al icono, sobre blanco.** El logotipo verde sobre blanco se ve flojo (2,0:1). La propuesta usa el icono oficial y el nombre en la letra del producto. Si prefiere el logotipo siempre, hace falta una versión oscura oficial.
2. **¿El producto pasa a los colores de Reportia?** Recomendación: no. El producto, neutro con la paleta de cada cliente (por defecto, la azul actual). Los colores de Reportia, solo donde firma Reportia y en la web comercial. El verde no sirve para botones con texto blanco (2,0:1); con texto oscuro sí.

Se ve en `diseno-canal/propuestas/Identidad-Reportia.html`.

---

## 7. «Tu marca» y «Apariencia» (propuesta para la fase 3)

- **«Tu marca»** (Equipo y ajustes, solo administradores): logo, nombre visible y una paleta entre ocho. No hay color libre.
- **«Apariencia»** (Tu seguridad, cada gestor): claro, oscuro o como el sistema.
- **Se guarda en la base de datos:** la marca en la empresa y la apariencia en el perfil. Nunca solo en el navegador.
- **El canal** usa la paleta de la empresa y sigue el modo del sistema de quien denuncia, sin guardar nada en su navegador.
- Hace falta una migración nueva (columnas en `organizations` y `profiles`, y un almacén para los logos).

**Base común** (igual para las ocho paletas):

| | Claro | Oscuro |
|---|---|---|
| Fondo | `#F6F7F9` | `#0E1220` |
| Superficie | `#FFFFFF` | `#171C2B` |
| Línea | `#E3E6ED` | `#2B3348` |
| Texto | `#0D1530` (16,8:1 sobre el fondo) | `#EEF1F7` (16,5:1) |
| Texto secundario | `#4D5672` (7,3:1 sobre la superficie) | `#A8B1C6` (7,9:1) |
| Borde de campo | `#8A93AD` (3,1:1) | `#7480A0` (4,3:1) |
| Vencido | `#B42318` (6,6:1) | `#FF9B8F` (8,4:1) |
| Vence pronto | `#8A5A00` (5,9:1) | `#F2C063` (10,1:1) |
| Hecho | `#17694A` (6,7:1) | `#6FCF9F` (9,0:1) |

**Las ocho paletas**, con el contraste medido (mínimo exigido en texto: 4,5:1):

| Paleta | Claro: acento | texto del botón | enlace sobre blanco | enlace sobre fondo | seleccionado | Oscuro: acento | texto del botón | enlace sobre superficie | enlace sobre fondo | seleccionado |
|---|---|---|---|---|---|---|---|---|---|---|
| Azul (por defecto) | `#2F54EB` | 5,9:1 | 5,9:1 | 5,5:1 | 7,0:1 | `#8FA6FF` | 8,1:1 | 7,3:1 | 8,1:1 | 8,6:1 |
| Marino | `#1E3A8A` | 10,4:1 | 10,4:1 | 9,7:1 | 8,7:1 | `#9DB4F0` | 9,1:1 | 8,3:1 | 9,1:1 | 9,5:1 |
| Petróleo | `#0F5E6B` | 7,4:1 | 7,4:1 | 6,9:1 | 7,9:1 | `#6CC5D1` | 9,4:1 | 8,5:1 | 9,4:1 | 8,8:1 |
| Bosque | `#17694A` | 6,7:1 | 6,7:1 | 6,2:1 | 7,9:1 | `#6FCF9F` | 9,9:1 | 9,0:1 | 9,9:1 | 9,1:1 |
| Burdeos | `#8E1F3C` | 8,7:1 | 8,7:1 | 8,1:1 | 8,7:1 | `#F09AB0` | 8,8:1 | 8,0:1 | 8,8:1 | 9,5:1 |
| Violeta | `#5B3FD9` | 6,7:1 | 6,7:1 | 6,2:1 | 7,1:1 | `#B3A4FF` | 8,6:1 | 7,8:1 | 8,6:1 | 8,9:1 |
| Teja | `#A0401C` | 6,5:1 | 6,5:1 | 6,0:1 | 6,9:1 | `#F0A27F` | 9,0:1 | 8,2:1 | 9,0:1 | 9,3:1 |
| Grafito | `#1F2937` | 14,7:1 | 14,7:1 | 13,7:1 | 12,4:1 | `#D5DAE3` | 13,3:1 | 12,1:1 | 13,3:1 | 11,3:1 |

En oscuro, el texto del botón principal es oscuro sobre el acento claro. Las ocho pasan en las diez combinaciones.

Se ve en `Tu-marca.html` y en `Modo-oscuro.html` (entrada y tablero, en ordenador y móvil).

---

## 8. Las maquetas

En `diseno-canal/propuestas/`. Son HTML estático con los estilos en línea; se abren con doble clic (`index.html` las lista). Dentro de `_fuente/` está el guion que las genera, por si en la fase 2 hace falta sacar una variante.

| Maqueta | Qué enseña |
|---|---|
| `Entrada-A-plus.html` | **La entrada elegida (ronda 3):** dos mitades iguales, con Denunciar sobre el color sólido de la empresa y Gestionar en blanco; al elegir cada lado; móvil; las ocho paletas |
| `Entrada-A.html` | Ronda 1, descartada: dos mitades neutras (62/38). Ya no sale en el índice |
| `Entrada-B.html` | Ronda 1, descartada: dos mitades iguales con Denunciar en color. Ya no sale en el índice |
| `Paso-2.html` | Paso 2 con menos texto, en ordenador y móvil |
| `Tablero.html` | Tablero, en ordenador y móvil |
| `Ficha-del-caso.html` | Ficha con título neutro, en ordenador y móvil |
| `Informe.html` | Informe, en ordenador y móvil |
| `Compartir.html` | Compartir, en ordenador y móvil |
| `Botones-10px-o-pildora.html` | La misma ficha y la misma entrada con los dos tipos de botón |
| `Modo-oscuro.html` | Entrada A+, tablero y ficha en oscuro |
| `Tu-marca.html` | «Tu marca», «Apariencia» y la tabla de paletas |
| `Identidad-Reportia.html` | El logo oficial en cada sitio |

**Entrada elegida: la A+** (David, 13 de octubre).

- Cumple lo que pide tu jefe (limpia, sin etiquetas, de borde a borde, «Consultar mi caso» igual de visible, el otro lado desaparece).
- Corrige lo que le faltaba a la A: era fría para quien llega nervioso a denunciar, y Gestionar en gris parecía desactivado.
- Las dos mitades son iguales, en el ordenador y en el móvil, con las dos palabras al mismo tamaño. Lo que distingue a Denunciar es el color.
- Vale para las ocho paletas: el texto blanco sobre el color pasa el mínimo en todas (la más justa, la azul, con 5,9:1).
- La A y la B de la ronda 1 siguen en la carpeta, fuera del índice.

Las maquetas antiguas de `diseno-canal/` no se han tocado.

---

## 9. Lo que no se ha podido hacer o comprobar

- **Las capturas del «antes» son de la demo**, no de un canal real: llevan el aviso negro «Canal de ejemplo» arriba, que un cliente no ve.
- **Los correos** se han mirado abriendo el archivo en un navegador, no en Gmail ni en Outlook, que los pintan a su manera.
- **Las maquetas no se han probado con lector de pantalla ni con teclado**: son dibujos. Los colores sí están medidos.
- **Las maquetas están solo en castellano.** No se ha comprobado que el catalán y el inglés quepan en ellas. De las 55 redacciones nuevas, en 30 el castellano es la más larga; las otras 25 hay que medirlas al programar.
- **PDF, Excel y cartel** no se han vuelto a generar en esta fase: las propuestas salen de los que ya había en `capturas/pulido-3` y del código.

---

## 10. Las tres rondas de maquetas y las reglas de color que quedan

| Ronda | Qué era | Qué dijo David |
|---|---|---|
| 1 | Casi todo en neutros, con el color solo en el botón principal | «Vas bien en un 70 %», pero demasiado neutra: las zonas no se distinguen y en la ficha no se ve dónde empieza la conversación |
| 2 | Zonas con tintes, estados con fondo de color y cifras del informe tintadas | Demasiados tintes: «un pastel distinto para cada cosa», infantil. Se salvan la conversación de la ficha y los títulos con icono |
| 3 | **La ronda 1 más seis añadidos** | Es la que está en `diseno-canal/propuestas/` |

**Los seis añadidos de la ronda 3** (y nada más):

1. La conversación de la ficha en su bloque: burbujas por lado (quien informa a la izquierda, en gris; el equipo a la derecha, con el tinte), nombre y hora en cada mensaje, la caja de escribir pegada abajo y la nota interna aparte, en ámbar suave, con el rótulo «Nota interna · no la ve quien informa».
2. Títulos de sección con peso 700 e icono pequeño.
3. Tablero: una barra de 4 px a la izquierda de las tarjetas vencidas (rojo) o que vencen pronto (ámbar).
4. Fondo suave solo en estas etiquetas: «Prioridad alta» (ámbar), «Prioridad crítica» (rojo), «Pide reunión» (tinte del acento) y el plazo vencido (rojo) o próximo (ámbar). Las demás, en gris.
5. **Entrada A+, la elegida: dos mitades iguales, de borde a borde, en el ordenador y en el móvil.** Denunciar sobre el color sólido; Gestionar en blanco (en oscuro, sobre la superficie oscura). «Denunciar» y «Gestionar», al mismo tamaño. Los dos bloques van centrados en vertical y a la misma altura, con los botones de los dos lados en la misma línea; ya no queda hueco vacío arriba.
   - Medido a 1440×900, en claro y en oscuro: 720 + 720 px; las dos palabras a 56 px y a la misma altura; los tres botones, de 48 px, en la misma línea; el bloque, centrado en la zona entre la cabecera y el pie.
   - Medido a 390×844: 422 + 422 px, Denunciar arriba y Gestionar abajo; las dos palabras a 40 px.
6. El siguiente paso de la ficha, en una franja con el tinte del acento y el botón a la derecha.

**Reglas de color, sin excepciones** (pasan a la fase 2 tal cual):

- **Un solo tinte en toda la aplicación:** el suave del acento de la paleta. Solo en el siguiente paso, la cabecera de la conversación, las burbujas del equipo y el elemento seleccionado. La única excepción es el ámbar suave de la nota interna.
- **Rojo y ámbar, solo en estados:** barra izquierda, etiqueta pequeña o número. Nunca como fondo de tarjeta ni de cifra.
- **Informe:** cifras en blanco, con el número en negro; en rojo, solo los plazos vencidos cuando son más de cero. Gráficos con el acento y un gris.
- **Avisos** (supresión, puesta en marcha): una línea con un punto, sin caja de color.
- **Como máximo tres colores por pantalla:** neutros, acento y, si hace falta, rojo o ámbar de estado. Por eso «Respondida a tiempo» y «Activada» van en gris o en negro, no en verde.

**Contraste de lo nuevo** (mínimo en texto: 4,5:1):

| | Claro | Oscuro |
|---|---|---|
| Etiqueta de vencido (`#B42318` sobre `#FDECEA`; en oscuro, `#FF9B8F` sobre `#3B1B19`) | 5,7:1 | 7,6:1 |
| Etiqueta de vence pronto (`#8A5A00` sobre `#FFF3D6`; `#F2C063` sobre `#3A2D12`) | 5,4:1 | 8,0:1 |
| Texto de la nota interna (sobre `#FFF8E5`; en oscuro, sobre `#2E2614`) | 17,0:1 | 13,2:1 |
| Rótulo de la nota interna | 5,6:1 | 8,9:1 |
| Etiqueta «Pide reunión» y elemento seleccionado (tinte del acento) | 6,9:1 o más en las ocho paletas | 8,6:1 o más |
| Entrada A+: texto blanco sobre el color sólido | de 5,9:1 (azul) a 14,7:1 (grafito) | el mismo color en oscuro |

**Lo que se ha dejado como en la ronda 1** porque no está entre los seis añadidos, aunque se pidió para la ronda 2: los datos de «Lo que ha contado» siguen en filas (no en rejilla de dos columnas) y la columna derecha de la ficha sigue en una sola tarjeta con líneas (no en cinco tarjetas). Si se quieren, son dos cambios pequeños.

**Comparaciones:** `capturas/vuelta-fase-1/ronda-3/`, con las tres rondas lado a lado (`*-rondas-1-2-3.png`) y hoy frente a la ronda 3 (`*-hoy-y-ronda-3.png`), de ficha, tablero, entrada e informe, a 1440×900 y 390×844. En la entrada, la columna de la ronda 2 es la variante con tinte, que queda descartada.

**La entrada elegida, a 1440×900:** `entrada-1440-ronda-3-claro.png`, `entrada-1440-ronda-3-oscuro.png` y las dos juntas en `entrada-1440-claro-y-oscuro.png`. La versión anterior de esta misma ronda (62 / 38 y el bloque anclado abajo) se conserva en `entrada-1440-ronda-3-antes-del-50-50.png`, y la del móvil en `entrada-390-ronda-3-antes-del-50-50.png`.

**En el índice de las maquetas** (`diseno-canal/propuestas/index.html`), la A+ va la primera y marcada como elegida. La A y la B ya no salen en la portada; sus archivos siguen en la carpeta y en `ronda-1/`.
