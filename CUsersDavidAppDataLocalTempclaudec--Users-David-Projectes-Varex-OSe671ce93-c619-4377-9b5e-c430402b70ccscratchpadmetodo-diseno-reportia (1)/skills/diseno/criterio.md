# El criterio visual

Lo que hace bueno un diseño no es un estilo: es **un número corto de decisiones tomadas con
intención y sostenidas hasta el final**. Esta es la línea con la que se toman, se comprueban y se
defienden. Se lee en la fase 3 para decidir y en la fase 6 para medir.

---

## 1 · Las decisiones que sostienen todo

### La rejilla

Las líneas verticales invisibles con las que se alinea cada cosa. Cuando cada elemento empieza
en un sitio propio, la página se siente descuadrada aunque nadie sepa decir por qué; cuando todo
se apoya en pocas líneas, encaja sola.

- Se decide **antes de construir** y se escribe: número de columnas, hueco entre ellas, margen
  exterior, anchura máxima del contenido.
- **Pocas líneas.** Si una sección necesita una línea nueva, se pregunta primero si puede usar una
  que ya existe.
- Los márgenes exteriores no tienen que ser iguales por ley, pero **se miden en píxeles reales y
  se dice si lo son**. Un diseño puede romper la simetría a propósito; lo que no puede es romperla
  sin saberlo.
- Cuadrícula para lo bidimensional, flexbox para una fila o una columna. No se calcula anchura
  con porcentajes y restas: se usa la cuadrícula.

### La tipografía

- **Dos familias se emparejan por contraste, no por parecido.** Una con serifa y una sin, o una
  geométrica con una humanista. Dos sin serifa parecidas es el error más común y se nota como
  incomodidad sin causa.
- **Una familia suele bastar en Operar**, en varios pesos. Un panel no necesita letra de
  exhibición.
- **Escala fluida en Persuadir** (crece con la pantalla), **fija en Operar** (la gente trabaja a
  la misma distancia siempre). Techo del titular: unos noventa y seis píxeles; por encima, la
  página grita. Espaciado entre letras no más cerrado de menos cuatro centésimas del tamaño, o
  las letras se tocan.
- **Medida de línea de sesenta y cinco a setenta y cinco caracteres** en texto corrido. Tablas y
  datos pueden ir más densos.
- Los titulares se equilibran en líneas parejas; el texto largo evita las viudas.
- **Las tipografías se prueban con el titular real**, nunca con un texto de muestra, y se enseñan
  en captura.
- Prohibido el patrón de serifa con cursiva de acento como recurso por defecto. Solo si David lo
  pide.

### El color

Primero se elige **cuánto** color, después cuál. Cuatro grados de compromiso:

| Grado | Qué es | Cuándo |
|---|---|---|
| **Contenido** | Neutros teñidos y un acento en un diez por ciento de la superficie o menos | El suelo de Operar. Marcas sobrias |
| **Comprometido** | Un color saturado lleva entre un tercio y dos tercios de la superficie | Persuadir cuando la identidad es fuerte |
| **Paleta completa** | Tres o cuatro colores con papel propio cada uno | Campañas. Visualización de datos |
| **Bañado** | La superficie es el color | Portadas, campañas, una pantalla de bienvenida |

- Se decide **viendo el boceto elegido**, no por categoría de producto. Un panel puede ganarse
  una pantalla bañada; una landing puede ser contenida si el mensaje lo pide.
- **Claro u oscuro se decide por la escena de uso**: quién lo abre, dónde, con qué luz, en qué
  estado. Nunca por costumbre del sector. Si la escena no lo decide, se pregunta.
- **Contraste medido, no estimado.** Cuerpo y texto de campos a 4,5:1 o más; texto grande a 3:1 o
  más. Es el fallo más frecuente: gris suave "por elegancia" sobre un blanco teñido.
- **Sobre una superficie de color, el texto secundario se tiñe del mismo tono**, más oscuro o más
  claro. El gris sobre color se ve lavado.
- **Un solo acento usado igual en toda la pieza.** Cambia el acento a mitad y la pieza son dos.
- Nada de negro puro como tinta; un casi negro. Nada de acentos saturados hasta doler. Nada de
  halos ni brillos de neón por defecto.

### Las formas y la profundidad

- **Un sistema de radios**, aplicado igual a botones, tarjetas, campos y diálogos. Radios
  distintos en la misma pieza se leen como descuido.
- 🔴 **Radios concéntricos: la regla de las esquinas anidadas.** Cuando una caja redondeada va
  dentro de otra, sus curvas tienen que ser **concéntricas**, o sea compartir centro. Si no, el
  hueco entre las dos se estrecha en las esquinas y la pieza se ve mal sin que nadie sepa decir
  por qué. Es de los defectos más frecuentes y de los que menos se nombran.

  **La fórmula, que es exacta:** `radio de dentro = radio de fuera − el hueco`. Y el hueco es
  **todo** lo que separa las dos curvas: el relleno más el grosor del borde. Con un radio exterior
  de 24 y un relleno de 8, el interior va a 16. Si además hay un borde de 1, va a 15.

  ```css
  .fuera  { --radio: 24px; --hueco: 8px; border-radius: var(--radio); padding: var(--hueco); }
  .dentro { border-radius: calc(var(--radio) - var(--hueco)); }
  ```

  **Se escribe así, calculado**, no con dos números puestos a ojo: al cambiar el radio exterior o
  el relleno, el interior se recoloca solo. Y vale igual hacia dentro con tres niveles, restando
  cada hueco.
- **Las sombras llevan desplazamiento y desenfoque suave.** Un halo de color sin desplazamiento
  es decoración, no profundidad. Una sombra dura sin desenfoque es un disfraz salvo en un mundo
  brutalista que lo eligió.
- **Nada de franjas de color en un lateral** de una tarjeta, un aviso o una fila. Nunca es
  intencional; se sustituye por un borde completo, un fondo teñido, un número o nada.
- Cristal y desenfoque de fondo **solo como efecto concreto**, nunca como acabado por defecto.
- Las máscaras geométricas (círculos, polígonos) para recortar una foto se ven baratas; se recorta
  con la forma real o no se recorta.

### El efecto que manda

**Uno.** El que lleva la identidad. Todo lo demás le hace de coro y va en calma. Con dos firmas
compitiendo no se lee ninguna; con cuatro, la página es un muestrario. Se nombra en la espina y
recibe el presupuesto de la fase 5.

### Los botones, los encabezados y la navegación

- **Un botón se diseña una vez con todos sus estados** y se aplica a todos. Reposo, hover, foco,
  pulsado, desactivado, cargando. Ninguna etiqueta de botón se parte en dos líneas a escritorio.
  No hay dos botones con la misma intención en la misma pantalla.
- **Los encabezados de sección siguen una regla**, la misma en toda la pieza. Sin etiqueta pequeña
  en mayúsculas encima de cada titular: el titular carga solo. Sin números de sección salvo que la
  secuencia sea información real.
- **La navegación cabe en una línea** a escritorio y no pasa de unos ochenta píxeles de alto.

### El ritmo

- **Se varía el espaciado.** Grupos apretados, separaciones generosas, más aire encima de un
  titular que debajo. El aire no tiene que ser constante por ley, pero **sigue una escala** y se
  sabe cuál.
- **No dos secciones seguidas con el mismo esquema.** Ni tres tarjetas iguales en fila como
  estructura de página. Ni el zigzag imagen-texto tres veces. Las tarjetas son la respuesta
  perezosa; se usan cuando son la mejor forma, y nunca una tarjeta dentro de otra.
- **El hero cabe en la pantalla sin hacer scroll.** Titular de dos líneas como mucho, subtexto
  corto, la acción visible. Como mucho cuatro elementos de texto.

---

## 2 · Lo que huele a máquina

Son los reflejos de la máquina cuando intenta "parecer diseñado". **No son prohibiciones
absolutas**: el encargo puede pedir cualquiera. Son las cosas que, si aparecen sin que nadie las
haya decidido, delatan que no se decidió.

**En la estructura**

- Una etiqueta pequeña en mayúsculas espaciadas encima de cada titular de sección.
- Números de sección (01, 02, 03) como decoración.
- Tres tarjetas iguales de icono, título y texto como esqueleto de la página.
- El bloque de cifra grande, etiqueta pequeña y datos de apoyo.
- Una maqueta de producto falsa hecha de rectángulos en la portada, en vez de una captura real,
  una imagen generada o nada.
- "Desliza para ver" y flechas de scroll. Quien no ha bajado está mirando la portada.
- Puntos de color decorativos delante de cada elemento de menú o de lista.
- Rayas finas y cruces de rejilla dibujadas solo para que "parezca diseñado".
- Franjas de texto decorativo al pie de la portada ("Diseño · Marca · Movimiento").
- Un párrafo pequeño flotando arriba a la derecha de un titular grande, sin alinear con nada.
- Etiquetas, pastillas o créditos superpuestos a las fotos.
- Filas con borde arriba y abajo en cada línea de una lista larga.
- Barras de progreso con pista rellena como comparación en una página de venta.

**En el texto visible**

- Etiquetas de versión en la portada ("beta", "acceso anticipado") sin que sea un lanzamiento.
- Tiras de ciudad, hora y temperatura en la cabecera o el pie.
- "Quietly trusted by", "notas de campo", "ahora en la mesa" y demás etiquetas poéticas.
- Nombres genéricos de ejemplo, avatares de huevo, cifras redondas perfectas, marcas inventadas
  de sonido genérico.
- Verbos de relleno: elevar, desbloquear, potenciar, impulsar, revolucionar, sin fisuras.
- Pies de foto pretenciosos bajo imágenes de banco.

**En el tratamiento**

- Texto con degradado. El énfasis viene del peso o del tamaño.
- Cristal y desenfoque como acabado en todo.
- Brillos de neón, negro puro, acentos saturados hasta doler.
- Una tipografía de sistema como letra de exhibición cuando la pieza tiene mundo propio.
- Monoespaciada como disfraz de "técnico" fuera de código, datos o medidas.
- Emojis o glifos de texto en lugar de un sistema de iconos. Los iconos vienen de una librería,
  con un mismo grosor de trazo, o se dibujan; nunca se dibujan a mano rutas de icono.
- Cursor personalizado.
- La misma entrada animada en cada sección.
- Un modal como primera idea para una tarea que no exige interrumpir.

**En el texto, la ley 1, que sí es absoluta**

- **La raya larga**, en cualquier sitio visible: titulares, cuerpo, botones, citas, textos
  alternativos. Ni una. Es el tic número uno. Se sustituye por punto, coma, dos puntos o guion
  normal.
- **Datos inventados**: cifras, testimonios, "más de trescientas empresas confían". Si falta el
  número, se escribe que falta.
- **El párrafo final que resume lo ya dicho.** Se corta en el último punto de verdad.
- **Las fórmulas huecas**: "no se trata solo de X, sino de Y" y sus primas; "en el vertiginoso
  mundo de"; "la clave está en"; las tríadas por reflejo; "sumérgete"; "desbloquea el
  potencial". El anexo en castellano de `/slopmonster` tiene la lista larga.

---

## 3 · El modo Operar tiene su propio listón

En una herramienta, **la familiaridad es una virtud**. La prueba no es si sorprende: es si
alguien que conoce el tipo de producto puede confiar en la interfaz al instante o tiene que
pararse en cada control ligeramente raro.

- Rareza sin propósito es el fallo: botones sobredecorados, controles de formulario que no
  parecen controles, letra de exhibición en etiquetas, afordancias inventadas para tareas
  estándar, movimiento que decora.
- Se permite lo que una landing no: tipografías de sistema, navegación estándar (barra arriba y
  lateral, migas, pestañas, paleta de comandos), densidad, consistencia antes que sorpresa.
- Cada control con todos sus estados. Esqueletos al cargar. Vacíos que enseñan. Los desplegables
  escapan de su contenedor.
- Movimiento entre ciento cincuenta y doscientos cincuenta milisegundos, solo para transmitir
  estado. Sin secuencias de carga.
- El acento solo en acción principal, selección actual e indicadores de estado. Un segundo
  neutro, algo más frío o más cálido, para barras y paneles.

---

## 4 · Las comprobaciones de David

**No son leyes.** Son lo que él corrige siempre que se le escapa, así que **se miden y se le
cuentan** en la fase 6, con el número al lado. Él decide qué hacer con cada una.

| Qué se mira | Cómo se mide |
|---|---|
| **La rejilla** | Cuántas líneas verticales distintas usan los elementos de una sección. Se cuentan |
| **Los márgenes exteriores** | Los cuatro, en píxeles reales, en escritorio y en móvil |
| **La simetría** | Medida con las coordenadas, no a ojo |
| **El aire entre secciones** | Si sigue una escala o cada una va a su aire. Se listan los valores |
| **Que el texto llene su caja** | Si una columna queda coja al lado de otra llena |
| **Los tokens mandan** | Se buscan valores escritos a mano en pantallas cuando existe archivo de estilo |
| **Un solo idioma de movimiento** | Que no convivan curvas con duración y muelles con rebote |
| **Un solo efecto que manda** | Se cuentan los candidatos a firma. Si hay dos, se dice |
| **El color de marca, por superficie** | Se mide cuánta pantalla ocupa cada color, nunca cuántos elementos lo usan |
| **Que se vea en el aparato real** | Captura de verdad. Si no se puede, se instrumenta y se pide |

---

## 5 · Cómo se defiende una decisión

Cuando David pregunta por qué algo está así, la respuesta buena tiene esta forma: **qué problema
resuelve, qué alternativa se descartó y qué costaría cambiarlo ahora.** Si no puedo decir las tres
cosas, la decisión no se tomó: se dejó caer, y hay que tomarla.
