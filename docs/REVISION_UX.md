# Revisión de diseño y usabilidad, pantalla a pantalla

Fecha: 8 de octubre de 2026. Hecha en modo demo, en castellano, a 1470×800, 1440×760, 1366×768, 1280×720, 1280×700, 1440×900, 360×640 y 390×844, más una pasada en catalán y en inglés.

## Cómo se ha medido

| Qué | Cómo | Resultado |
|---|---|---|
| Contraste | Un guion calcula el contraste (WCAG) de cada texto visible contra el fondo real que tiene detrás, y el de los bordes de campos e iconos, en 40 pantallas y estados | Antes: 2 combinaciones por debajo del mínimo. Después: 0 |
| Tamaño en portátil | 15 pantallas × 6 tamaños: si cabe sin scroll, botones partidos en dos líneas, textos cortados y posición de la franja lateral | Antes: la franja se movía en todas las pantallas con scroll, y la entrada, el acceso y los pasos de la denuncia no cabían a 1366×768. Después: solo queda el tablero a 1280 px de ancho (arreglo 16) |
| Móvil con teclado en pantalla | Recorrido completo a 360×640 y 390×844, reduciendo la altura como hace el teclado | 100 comprobaciones, sin fallos |
| Teclado | Recorrido con Tab, Mayús+Tab, Intro, Espacio y Esc | 50 comprobaciones, sin fallos |

Las capturas de antes y después están en `capturas/pulido-2/antes` y `capturas/pulido-2/despues`.

## Arreglado

| # | Pantalla | Problema | Gravedad | Qué se ha hecho |
|---|---|---|---|---|
| 1 | Todo el panel y el acceso | La franja lateral azul se iba con el scroll: se cortaba arriba y perdía las esquinas redondas | Alta | Ahora es fija, del alto de la ventana y con su margen. Solo el contenido hace scroll |
| 2 | Todo el panel y la denuncia | La flecha de la franja cambiaba de altura según la página y en las largas se salía de la vista | Alta | Siempre en el mismo sitio, centrada en lo que se ve |
| 3 | Acceso | A 1440×760 no cabía; había que bajar el zoom | Alta | Icono, título y espacios se encogen cuando la pantalla es baja. Cabe hasta en 1280×700 |
| 4 | Entrada del canal | No cabía a 1366×768 (faltaban 73 px) | Alta | Título, icono y espacios según la altura. Cabe en todos los tamaños medidos |
| 5 | Denuncia, pasos 1 y 3, y «Mira tu caso» | No cabían a 1366×768 | Alta | Misma solución de escala. Caben |
| 6 | Denuncia, paso 2 | Faltaban 343 px a 1366×768: la columna de la derecha (lo que sepas + pruebas) era más alta que la pantalla | Alta | En portátil pasa a tres columnas (texto, lo que sepas, pruebas) y la caja de texto llena el alto que queda. Con más altura sigue como en la maqueta |
| 7 | Compartir el canal | A 1470 px salían 3 + 1 tarjetas, «Primeros pasos» era un bloque oscuro vacío, «Descargar PDF» se partía y la dirección ocupaba tres líneas | Alta | Siempre 2 + 2. Hasta 1600 px, «Primeros pasos» va arriba en horizontal con «Lo siguiente» a su derecha |
| 8 | Informe, Compartir, ficha | Botones partidos en dos líneas («Libro-registro (Excel)», «Descargar PDF», «Remitir al Ministerio Fiscal») | Media | No se parten |
| 9 | Equipo y ajustes, ficha, registrar | Los campos blancos sobre tarjeta gris casi no se distinguían (1,1:1) | Media | Llevan borde (3,2:1). **Cambia respecto a la maqueta G5**, que los dibuja sin borde; se puede deshacer en una línea |
| 10 | Equipo y ajustes | El borde ámbar de «Comunicado a la AIPI» no llegaba al mínimo (1,5:1) | Media | Ámbar más oscuro; ya pasa el mínimo de 3:1 |
| 11 | Diálogos en el móvil | Con el teclado abierto, los botones del diálogo podían quedar fuera de la vista | Media | Se quedan pegados abajo |
| 12 | Todo el producto | Sin conexión no se avisaba: se escribía o se pulsaba «Enviar» sin saber por qué fallaba | Media | Aviso arriba («Sin conexión…») que se va solo al volver la red |
| 13 | Panel | Doce errores decían solo «No se ha podido…» | Baja | Añaden qué hacer («Inténtalo de nuevo») |
| 14 | Panel | Palabras distintas para lo mismo: «categorías» y «temas»; «el informante» y «quien informa»; «Espera al informante» y «Esperando a quien informa» | Baja | Unificado en «temas» y «quien informa» (historial, Informe y avisos de «sin acceso»). En «Registrar», «caso» (propuesta 2) |
| 15 | Títulos y entradillas | Palabras sueltas en la última línea de algunos párrafos | Baja | Reparto de líneas equilibrado |
| 16 | Tablero | Con poca altura se veía una sola tarjeta por columna | Media | Dos por columna a 1366×768, 1280×720 y 1280×700 (con la propuesta 3) |

## Propuestas (decididas por David el 8 de octubre de 2026)

| # | Pantalla | Problema | Gravedad | Propuesta | Decisión |
|---|---|---|---|---|---|
| 1 | Todo el panel | «Registrar caso» va en azul en todas las pantallas y compite con el botón principal de cada una (el siguiente paso de la ficha, «Informe para dirección», «Guardar»). Hay dos o tres botones «principales» a la vez | Media | Dejarlo en azul solo en el tablero y en gris en las demás | **Hecha.** Azul en el tablero, gris en las demás pantallas |
| 2 | Registrar | El botón dice «Registrar caso» y la pantalla se titula «Registrar una denuncia» | Baja | Unificar. Las dos formas vienen de las maquetas (G2 y G7): dime cuál | **Hecha.** Botón «Registrar caso», título «Registrar un caso», y toda la pantalla habla de «caso» (también en CA y EN) |
| 3 | Cabecera del panel | Por debajo de 1367 px el menú baja a una segunda fila y quita altura al contenido | Media | En pantallas estrechas, esconder los chips «Demo» y «Prueba · 21 días» detrás del nombre, o acortar el menú a «Compartir» y «Ajustes» | **Hecha.** Por debajo de 1367 px se esconden los chips y el menú cabe en una fila hasta 1180 px. A 1280×720 y 1280×700 el tablero enseña dos tarjetas por columna |
| 4 | Panel | El idioma solo se cambia desde el menú del avatar; cuesta encontrarlo | Baja | Dejarlo también en Equipo y ajustes, «Tu seguridad» | **Hecha.** Selector CA/ES/EN en «Tu seguridad» |
| 5 | Tablero | «Cerradas» enseña 2 y «Ver las N»; al abrir N se alarga mucho | Baja | Paginar de 10 en 10 | **Hecha.** Las 2 últimas y luego «Ver 10 más (de N)»; al final, «Ver menos» |
| 6 | Ficha del caso | En casos largos, el siguiente paso queda arriba y hay que volver para darlo | Media | Que la franja oscura se quede fija arriba al bajar | **Descartada** de momento |
| 7 | Mi caso | No se enseña el resultado, solo que está cerrado | — | Pendiente del abogado (duda 12 de `REVISION_LEGAL.md`) | No se toca (pendiente del abogado) |
| 8 | Canal y panel | La reunión presencial se «propone» en 7 días | — | Texto legal, pendiente del abogado (duda 1) | No se toca (pendiente del abogado) |
| 9 | Campos de fecha | El navegador los pinta a su manera (formato e idioma del sistema) | Baja | Dejarlo: un selector propio pesa más de lo que aporta | No se toca |

## Lo que está bien y no se ha tocado

- **Estados**: cargando (esqueletos), vacío (tablero, informe, mensajes), error con «Reintentar», sin permiso, caso que no existe, canal que no existe y enlace caducado tienen diseño y texto. No hay pantallas en blanco.
- **Avisos de confirmación**: dicen qué ha pasado («Acuse enviado. El caso está en curso.», «Invitación enviada a …»).
- **Tono**: todo el producto en «tú», en los tres idiomas.
- **Radios, botones y chips**: salen de las mismas piezas (`src/v2/ui`), así que son iguales en todas las pantallas.
