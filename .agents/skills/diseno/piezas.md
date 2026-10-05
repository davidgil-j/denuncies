# Las piezas

Todo lo que hay instalado para trabajar el diseño, **qué hace cada cosa, en qué fase suma y cómo
se instala en otro repositorio**. Es la única lista completa: si una pieza no está aquí, no tiene
sitio en el método y se quita.

**Cómo se leen las dos columnas que importan:**

- **Se enciende sola:** puedo cargarla yo cuando el encargo encaja. Las marcadas **a mano** llevan
  escrito en su archivo que no se disparan solas; hay que escribirlas.
- **Fase:** dónde suma. No es una obligación: cada archivo de fase dice cuándo ayuda y cuándo no.
  Si en un caso concreto una pieza no aporta, no se fuerza.

---

## 1 · Las tres grandes

Son cosas de naturaleza distinta y por eso se manejan distinto.

| | Qué es | Cómo se comporta | Instalación |
|---|---|---|---|
| **impeccable** | Un **programa**: veinticuatro comandos, un motor compilado, un detector con decenas de reglas, cuatro modos, y agentes propios | Cada comando abre solo su ficha. Se reenfoca cada vez. Te habla: pregunta con botones, escribe archivos, abre un navegador | `npx impeccable@latest install --yes --project --providers=claude` |
| **taste-skill** | Un **documento** largo de dirección visual para landings y portfolios: tres mandos de intensidad, mapa de sistemas de diseño, librería de bloques, protocolo de rediseño, lista de tics | Se carga entero. No pregunta, no escribe archivos: **solo cambia cómo escribo el código.** No se nota trabajando | `npx skills@latest add Leonxlnx/taste-skill --skill design-taste-frontend -y --project` |
| **emil-design-eng** | Un **documento** de criterio de movimiento y detalle fino, de un ingeniero concreto con librerías en producción | Se carga entero. Te contesta con tablas de antes, después y por qué | `npx skills@latest add emilkowalski/skills --skill emil-design-eng -y --project` |

**Cuando dos discrepan:** en dirección visual manda taste, en proceso y medida manda impeccable,
en movimiento manda Emil. No compiten: van en ese orden.

## 2 · Los comandos de impeccable, por fase

| Comando | Qué hace | Fase |
|---|---|---|
| `shape` | La entrevista: rondas cortas con opciones, afirma y confirma, devuelve un resumen sin código | 0 |
| `init` | Escribe el contexto duradero del producto. Solo en proyectos que duran meses | 0 |
| `critique` | Revisión de UX con puntuación, sin tocar nada | 0 (diagnóstico) · 6 |
| `audit` | Accesibilidad, rendimiento, responsive. Con números | 6 |
| `typeset` | Jerarquía y fuentes | 3 |
| `colorize` | Estrategia de color | 3 |
| `layout` | Espaciado, ritmo, jerarquía visual | 4 |
| `adapt` | Comportamiento por aparato y tamaño | 4 · 6 |
| `polish` | La última mano antes de dar algo por bueno | 6 |
| `bolder` · `quieter` · `distill` | Subir, bajar o limpiar una pieza que ya existe | 4 (cuando una dimensión se resiste) |
| `harden` | Errores, idiomas, casos límite | 4 (Operar) |
| `onboard` | Primer uso, estados vacíos | 4 (Operar) |
| `clarify` | Textos de interfaz, etiquetas, errores | 4 (Operar) |
| `delight` · `overdrive` | Personalidad; pasarse del límite a propósito | 5, solo si la espina lo pidió |
| `optimize` | Rendimiento de la interfaz | 6 |
| `document` | Deriva el archivo de diseño del código construido | 7, solo en proyectos largos |
| `extract` | Saca tokens y componentes reutilizables | 7, solo en proyectos largos |
| `live` | El navegador con barra flotante: señalar un elemento y elegir entre versiones | 2 (piezas) · 4 |
| `animate` | Movimiento | **No se usa**: manda Emil |
| `craft` | Retirado. Alias de un encargo normal | ninguna |

**Sus cuatro agentes.** Un agente no es una skill: es otra conversación aparte que hace un trabajo
y vuelve con el resultado. Se llaman solos cuando hace falta.

| Agente | Qué hace | Fase |
|---|---|---|
| **El revisor de acabado** | Compara lo construido contra la dirección aprobada y devuelve la lista de fallos. No es quien construyó | 6 |
| **El documentador** | Escribe el archivo de diseño a partir de lo construido | 7 |
| **El productor de imágenes** | Saca recursos limpios de los bocetos aprobados | 4 |
| **El aplicador de ediciones** | Lleva al código los retoques de texto del modo en vivo | 4 |

**Lo que necesita generación de imágenes:** sus composiciones de pantalla entera (fase 2). Sin
ella, las salta y avisa.

**Sus hooks.** Su instalador puede añadir dos enganches: uno tras cada edición y otro al terminar
cada respuesta, ambos llamando a su motor. Si una sesión va lenta sin motivo, se mira ahí primero;
se apagan con `/impeccable hooks off`.

## 3 · Las piezas de Emil

Del mismo repositorio, cada una instalable por separado con
`npx skills@latest add emilkowalski/skills --skill <nombre> -y --project`.

| Pieza | Qué hace | Se enciende | Fase |
|---|---|---|---|
| **prototype** | Tres o más versiones genuinamente distintas de una pieza suelta, cada una funcionando, detrás de un selector para pasar en vivo. Divergen en un eje nombrado | **A mano** | 2 |
| **review-animations** | Revisa el movimiento contra diez normas. Tabla de hallazgos y veredicto: aprobado o bloqueado. Por defecto bloquea | **A mano** | 5 · 6 |
| **animate** | Construye una animación siguiendo el marco de decisión y escribe el código. Con recetas | Sola | 5 |
| **improve-animations** | Audita todo el movimiento de un código y deja un plan ordenado. No aplica | Sola | 5 (inventario) |
| **find-animation-opportunities** | Busca dónde faltaría movimiento y dice qué no debe animarse. No aplica | Sola | 5 (inventario) |
| **animation-vocabulary** | Convierte una descripción vaga de un efecto en su nombre exacto | Sola | Cualquiera, cuando David describe algo sin nombre |
| **apple-design** | Los principios de interfaz y movimiento físico de Apple, para web | Sola | 3 · 5 |
| **mobile-native** | Que una web se sienta instalada en un móvil: los once fallos típicos y sus arreglos | Sola | 4 · 6 |
| **pick-ui-library** | Qué librería para cada cosa, respuesta seca | **A mano** | 3 · 4 |

**No instaladas, y por qué:** `write-swift` y `animate-expo` son para aplicaciones de tienda, no
para webs. `ask-sonner` es para una librería de avisos que no se usa por defecto.

## 4 · Las piezas de Taste

Del mismo repositorio que la grande, instalables por separado con
`npx skills@latest add Leonxlnx/taste-skill --skill <nombre> -y --project`.

| Pieza | Qué hace | Se enciende | Fase |
|---|---|---|---|
| **redesign-existing-projects** | Audita lo que hay (tipografía, color, layout, estados, contenido, componentes, iconos) y arregla por orden de impacto sin romper función | Sola | 0 (diagnóstico) · 4 |
| **image-to-code** | Genera primero las imágenes de diseño, las analiza y programa contra ellas | Sola | 2 (con imágenes) |
| **imagegen-frontend-web** | Una imagen por sección de la web, con variedad de composición obligada | Sola | 2 (con imágenes) |
| **brandkit** | Tablero de identidad: logotipo, paleta, tipografía, aplicaciones | Sola | 1 · 2 (con imágenes) |
| **full-output-enforcement** | Prohíbe los huecos, los "pendiente de hacer" y las salidas recortadas | Sola | 4 |
| **high-end-visual-design** | Estilo cerrado: agencia de gama alta, mucho aire, tipografía cara | Sola | 2 · 4 |
| **minimalist-ui** | Estilo cerrado: editorial, sobrio, monocromo cálido, sin degradados | Sola | 2 · 4 |
| **industrial-brutalist-ui** | Estilo cerrado: suizo, rejilla rígida, contraste de escala extremo | Sola | 2 · 4 |

**Los tres estilos cerrados a la vez** es la forma más barata de bocetar una página entera sin
generar imágenes: tres carpetas, un agente por carpeta con su estilo, y se elige viendo.

**No instaladas, y por qué:** la versión antigua de la grande; la variante afinada para GPT y
Codex (aquí se usa Claude); la de una herramienta de Google que no se usa; la de pantallas de
aplicación de tienda.

## 5 · El texto y el vídeo

| Pieza | Qué hace | Fase | Instalación |
|---|---|---|---|
| **slopmonster** | Quita la morralla del texto: mide, reescribe, vuelve a medir. **Su medida es de inglés**: en castellano la nota no vale y se aplica a mano su anexo `ES-castellano.md` | 1 · 6 | Copiada de `ItsssssJack/SlopMonster`. Necesita Python |
| **youtube** | Transcripción y ficha de un vídeo de YouTube, sin clave ni alta | 0 · 1 | Propia. Necesita `yt-dlp` (`winget install yt-dlp.yt-dlp`) |

## 6 · Instalar en otro repositorio

1. Copiar la carpeta `diseno/` entera a `.claude/skills/` del otro proyecto. Funciona sola.
2. Instalar las piezas que se quieran usar con las órdenes de arriba. El instalador de `skills`
   deja el contenido en una carpeta `.agents/` en la raíz y pone accesos directos en
   `.claude/skills/`; si no se quiere esa carpeta suelta, se copia el contenido real a
   `.claude/skills/` y se borra `.agents/`.
3. Si hay ficha de marca, dejarla en la carpeta de marca del proyecto. Si no, [marca.md](marca.md).
4. Nada más. La skill no depende de ningún archivo de este repositorio.
