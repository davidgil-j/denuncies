# Rediseño completo del producto: «dos mitades»

Escrito el 7 de octubre de 2026. El dueño del producto (David Comellas) ha dado vía libre para rehacer el producto entero, la parte de quien denuncia y la parte de quien gestiona, con una idea central y un estilo ya elegido. Las pantallas de referencia (19) están en la carpeta **`/Users/davidgiljaques/Documents/Canal de denuncias SAAS/diseno-canal/`** (fuera del repositorio; no las copies dentro). Ábrelas en el navegador: son maquetas estáticas en HTML con los estilos escritos en línea. Cópialas fielmente: colores, tamaños, radios, textos y orden.

> Este rediseño va **antes** que `PROMPT_repaso_completo.md`. Al final de este documento se indica qué partes de aquel siguen vigentes.

---

## 0. La idea (léela dos veces)

1. **Un enlace por empresa, dos mitades.** `/canal/:slug` ya no es una página con texto. En ordenador es la pantalla partida en dos tarjetas enormes e iguales:
   - **Denunciar**, en azul;
   - **Gestionar**, en blanco.
   La plantilla entra por un lado y el equipo de la empresa por el otro. En el móvil se apilan: Denunciar arriba, grande, y Gestionar abajo, en pequeño.
2. **El lado elegido ocupa la pantalla.** Al pulsar Denunciar, la tarjeta azul crece y el otro lado queda como una **franja vertical de 76 px** con la palabra girada. Transición de anchura de 250 ms, y sin animación si `prefers-reduced-motion`. Qué dice la franja según la pantalla:

   | Pantalla | Franja | Qué hace |
   |---|---|---|
   | Flujo de denuncia (D1–D6) | Blanca, «Gestionar» y →. Discreta | Si hay un borrador escrito, pide confirmación antes de salir (diálogo propio) y conserva el borrador en `sessionStorage` |
   | Acceso y verificación (G1, G1b) | Azul, «Denunciar» y ← | Lleva al canal. Es para quien ha llegado por error |
   | Panel ya dentro (G2–G7) | Azul, **«Ver el canal»** y ↗ | Abre el canal público de su empresa (`/canal/:slug`), para comprobar cómo lo ve la plantilla |
3. **Una cosa por pantalla.** Quien denuncia responde 3 preguntas grandes, no un formulario largo. Quien gestiona ve un **tablero de 3 columnas** (Nuevas, En curso, Cerradas) y en cada caso un único botón con el **siguiente paso**.
4. **Lenguaje de persona, en tú.** Nada de «Sistema interno de información» en los títulos (sí en el pie, por la ley). En catalán y en inglés, el mismo tono.

---

## 1. Reglas

- **No hagas push. Nunca a `upstream`.** Yo hago commit y push desde GitHub Desktop, solo a `origin`.
- No toques el Supabase ni el Vercel de Linda. Si hace falta SQL, crea una migración nueva en `supabase/migrations/` (que se pueda ejecutar dos veces sin error) y dime que la ejecute yo.
- **No pierdas funcionalidad.** Todo lo que hace hoy el producto tiene que seguir funcionando:
  - plazos legales, verificación en dos pasos, permisos por categoría, registro de auditoría;
  - exportación a Excel y PDF, supresión a los 3 meses, ampliación de plazo;
  - mensajes con quien informa, adjuntos, modo demo y canal de ejemplo (`/canal/demo`), los 3 idiomas.
  Cambia **cómo se ve y dónde está**, no lo que hace. Antes de borrar un componente, comprueba con grep que su función ya existe en la pantalla nueva.
- Tres idiomas (CA/ES/EN) con el patrón Stable/Swap de siempre. Nada se mueve al cambiar de idioma.
- Sin dependencias nuevas. Manrope se instala con `@fontsource/manrope` (es la única excepción permitida; quita Wix Madefor del producto, pero no de la portada `/` hasta la fase 7).
- Accesibilidad:
  - `<button>` y `<a>` de verdad, nunca `div` con `onClick`;
  - foco visible en todo y `aria-label` en los botones que solo tienen icono;
  - contraste mínimo de 4.5:1 en texto (3:1 a partir de 24 px); las maquetas ya lo cumplen, compruébalo con una herramienta al acabar;
  - zonas táctiles: botones principales de 44 px como mínimo, píldoras del menú y botones secundarios de 40 px, y los enlaces de texto con un área clicable de al menos 24 px (con padding, aunque no se vea).
- **Móvil:** las maquetas de escritorio ya se adaptan a 390 px sin desbordar (la franja lateral se oculta, las tarjetas reducen el padding y los títulos bajan a 34 px). Las pantallas `M1`–`M4` mandan donde existan.
- No inventes datos ni textos legales. Los textos de la ley que ya existen en `translations.js` se reutilizan.
- **Las maquetas mandan.** Si una maqueta y este texto no coinciden, pregúntame. Si ves que algo de la maqueta no se puede hacer bien en el producto real (por accesibilidad, rendimiento o porque falta un dato), dímelo con una propuesta, no lo cambies sin avisar.
- Al acabar cada fase: **para**, enséñame capturas a 1440 y 375 px y la lista de archivos tocados. `npm run build` sin errores.

### Inventario: lo que existe hoy y debe seguir funcionando
Antes de empezar, recorre el código y completa esta lista si falta algo. Al final de la fase 6, márcala entera.

| Función actual | Dónde queda en el diseño nuevo |
|---|---|
| Elegir idioma (CA/ES/EN) en canal y panel; el idioma de la denuncia se guarda | Selector en píldora (entrada, acceso) y en el menú del avatar |
| Banda «Canal de ejemplo» cuando `is_example` | Encima de todo en el lado Denunciar |
| Salir rápido | Cabecera de todo el lado Denunciar |
| Adjuntos (5 archivos, tamaño de `VITE_MAX_FILE_MB`) | D2 y mensajes de «Mi caso» |
| Turnstile (si está configurado) | D3, antes de «Enviar denuncia», y acceso |
| Justificante PDF con el código | D4 «Descargar justificante» |
| Mensajes con quien informa, con adjuntos | D5 y G3 |
| Acuse de recibo con mensaje plantilla | G3, siguiente paso 1 |
| Ampliar el plazo de respuesta (con motivo) | G3 «···» |
| Suprimir o anonimizar datos (art. 32) y aviso de los casos que deben suprimirse | G3 «···» y banda en el tablero |
| Ver la identidad con registro (`get_reporter_identity`) | G3 «···» o tarjeta Identidad |
| Notas internas y registro de actividad | G3 |
| Estados, prioridades, filtros, búsqueda | G2 (columnas, panel «Filtrar», buscar) y G3 |
| Exportar Excel, PDF del caso, PDF del informe, libro-registro | G3, G6 y «···» del tablero |
| Invitar gestores, cambiar permisos por categoría, **eliminar gestores** (`delete-manager`) | G5 «Quién gestiona» |
| Verificación en dos pasos: alta, entrada y gestión | `/admin/mfa`, G1b, G5 |
| Recuperar y cambiar contraseña | Pantallas con el diseño de G1 |
| Nombre de la empresa, dirección del canal, Responsable del Sistema, facturación, plan y prueba | G5 |
| Enlace, botón, QR (PNG/SVG), cartel A4 y texto del art. 25 | G4 |
| Avisos por correo al equipo (función `notify`: denuncia nueva, mensaje nuevo; sin datos de la denuncia) | Sin pantalla. Actualiza también las plantillas de correo (`src/v2/emails/`) al estilo nuevo: azul `#2F54EB`, botón en píldora, Manrope con alternativa del sistema |
| Sentry (errores) | Sin cambios |
| Modo demo (`VITE_DEMO=1`) | Todas las pantallas |

---

## 2. Sistema visual (estilo «B · Color»)

Créalo como variables CSS en un archivo nuevo, `src/v2/ds.css`, y úsalo en todo el producto.

| Token | Valor | Uso |
|---|---|---|
| `--font` | `'Manrope', system-ui, sans-serif` | Todo |
| `--bg` | `#F2F4F8` | Fondo de página y tarjetas secundarias |
| `--surface` | `#FFFFFF` | Tarjetas principales |
| `--ink` | `#0D1530` | Texto, botón oscuro |
| `--muted` | `#4D5672` | Texto secundario |
| `--line` | `#D7DEEF` | Bordes de inputs (2 px) |
| `--soft` | `#EEF1F7` | Botón secundario, chips neutros |
| `--report` | `#2F54EB` | Lado Denunciar, acento principal |
| `--report-soft` | `#E8EDFF` / texto `#1F3FC4` | Chips azules, enlaces |
| `--on-report-muted` | `#E3E9FF` | Texto secundario sobre azul |
| `--warn` | fondo `#FFF0D6` / texto `#7A4100` | Plazo cercano |
| `--danger` | fondo `#FCE5E2` / texto `#9C1C12`, borde `#F3B5AE` | Plazo vencido |
| `--ok` | fondo `#E1F5EC` / texto `#0E5C41` | Hecho, a tiempo |
| `--on-ink-muted` | `#C9D3F5` | Texto secundario sobre `--ink` (banda «siguiente paso», «Primeros pasos») |
| `--on-ink-accent` | `#7EA0FF` | Acento sobre `--ink` (progreso, ✓ de primeros pasos) |
| `--on-ink-warn` | `#FFC46B` | Días que quedan, sobre `--ink` |
| `--chart-soft` | `#A9BCFA` | Barras secundarias del Informe |
| Superposiciones sobre azul | `rgba(13,21,48,.18)` tarjetas, `.20` botones secundarios, `.22` chips e iconos | **Siempre oscurecer, nunca aclarar**: el blanco translúcido sobre el azul baja el contraste del texto por debajo de 4.5:1 |

**Formas y tamaños:**
- **Radios:**
  - tarjetas grandes: 32 px;
  - tarjetas: 24 px;
  - tarjetas pequeñas o de caso: 20 px;
  - inputs: 16 px (12 px en los pequeños);
  - botones y chips: 999 px, en píldora.
- **Botones:**
  - principal: 58 px de alto;
  - normal: 44–48 px;
  - letra 800 y sin bordes.
  - Sobre azul: el principal es blanco con texto `--ink`, y el secundario `rgba(255,255,255,.14)`.
  - Sobre blanco: el principal es `--ink` o `--report`, y el secundario `--soft`.
- **Títulos:**
  - H1 de 48–60 px, peso 800, `letter-spacing: -0.04em`, `line-height: 1`;
  - las palabras «Denunciar» y «Gestionar» de la entrada van a 80 px.
- **Chips:** 12–13 px, peso 800, `padding: 5px 10px`, radio 10 px.
- **Icono IA:** estrella de 4 puntas rellena, en el color del acento. Va siempre junto a la frase «hecho con IA, revísalo».
- **Sin:** degradados de fondo, sombras duras, bordes izquierdos de color ni emojis. Una sola sombra permitida: la de la tarjeta elegida, `0 8px 24px rgba(13,21,48,.18)`.

**Componentes nuevos** en `src/v2/ui/`, cada uno pequeño y reutilizable:
- `SplitShell`: las dos mitades y la franja plegada;
- `SideTab`: la franja vertical;
- `PillNav`: el menú en píldora del panel;
- `Button`, `Chip`, `Card`, `Field`;
- `StepBar`: los segmentos de progreso;
- `DeadlineChip`: elige color y texto según los días que quedan;
- `CaseCard`;
- `Kanban`;
- `ChatThread`.

---

## 3. Rutas: qué cambia

| Ruta | Antes | Ahora | Maqueta |
|---|---|---|---|
| `/canal/:slug` | V2Home (texto largo) | **Entrada en dos mitades** | `00-Entrada.html`, `M1-Entrada.html` |
| `/canal/:slug/denuncia` | V2Form, 4 pasos | **3 pasos grandes + enviada** | `D1-Que`, `D2-Cuentalo`, `D3-Identidad`, `D4-Enviada`, `M2-Cuentalo` |
| `/canal/:slug/consulta` | V2Track | **Escribir el código** y luego **Mi caso** (estado + conversación) | `D0-Codigo`, `D5-MiCaso`, `M3-MiCaso` |
| `/canal/:slug/privacidad` | igual | Mismo contenido con el estilo nuevo | — |
| `/admin/login` | V2Login | **Gestionar · Acceso** + **verificación en dos pasos** (con franja Denunciar). Si se llega desde un canal (`?from=slug`), muestra el nombre de esa empresa | `G1-Acceso`, `G1b-Verificacion` |
| `/admin/nueva` (nueva) | — | **Registrar una denuncia** que llega por teléfono, en persona o por carta | `G7-Registrar` |
| `/admin` | V2Dashboard (tabla) | **Tablero** de 3 columnas | `G2-Tablero`, `M4-Tablero` |
| `/admin/complaints/:id` | V2Detail | **Ficha del caso** con el «siguiente paso» | `G3-Caso` |
| `/admin/integration` | V2Integrate | **Compartir el canal** + primeros pasos | `G4-Compartir` |
| `/admin/users` + `/admin/account` + `/admin/mfa` | 3 pantallas | **Equipo y ajustes** (una sola). `/admin/users` y `/admin/account` redirigen aquí. `/admin/mfa` sigue existiendo para el alta de la verificación | `G5-Ajustes` |
| `/admin/report` | V2Report (tablas) | **Informe** con barras | `G6-Informe` |

Menú del panel (`PillNav`): **Tablero · Informe · Compartir el canal · Equipo y ajustes**. En el móvil es una barra fija abajo con las 4 opciones, cada una con icono y la activa resaltada con una píldora `--report-soft` (`M4-Tablero`), y un botón «+» redondo arriba para registrar un caso.

---

## 4. Lado Denunciar, pantalla a pantalla

Fondo de página `--bg`, con 16 px de margen. La tarjeta azul ocupa todo menos la franja «Gestionar» de la derecha. El contenido va centrado a un máximo de 1000 px.

**Cabecera de cada pantalla:**
- logo de la empresa (iniciales en un cuadrado blanco) y su nombre;
- chip «Modo anónimo», solo mientras sea anónima;
- botón **«Salir rápido»**, en `--ink`. Debe ir a una web neutra (`https://www.google.com`) con `location.replace`, para que no quede en el historial, y borrar el borrador.

### 4.1 Entrada (`00-Entrada`)
- **Tarjeta azul:**
  - icono de bocadillo;
  - «Denunciar» a 80 px;
  - el subtítulo;
  - 3 chips de confianza: «Puedes ser anónimo», «Respuesta en 3 meses máximo», «Sin represalias, por ley»;
  - abajo, el enlace «¿Ya lo contaste? Mira tu caso» (a `/consulta`) y el botón blanco «Empezar» (a `/denuncia`).
- **Tarjeta blanca:**
  - icono de tablero;
  - «Gestionar»;
  - el subtítulo;
  - 3 chips: «Plazos legales automáticos», «Libro-registro al día», «Solo lo ve quien autoricéis»;
  - la nota «Acceso con verificación en dos pasos»;
  - el botón oscuro «Acceder» (a `/admin/login?from=:slug`).
- **Arriba:** selector CA/ES/EN en píldora y «Salir rápido».
- **Pie:** «Sistema interno de información de [empresa] · Ley 2/2023» · Privacidad · «Canales externos (AIPI[, autoridad autonómica])» · «Con Reportia».
  - El enlace de canales externos abre un panel con la AIPI y, si la empresa la ha configurado, la autoridad autonómica.
  - Esa información existe hoy en V2Home: muévela ahí, no la pierdas.
  - El bloque «Así consta una denuncia anónima» de la V2Home actual pasa a un enlace «Qué guardamos y qué no», que abre un panel lateral con la misma tabla.
- **Canal de ejemplo:** mantén la banda «Canal de ejemplo. Lo que envíes aquí no llega a nadie» encima de todo, cuando `is_example`.

### 4.2 Paso 1 · ¿Qué ha pasado? (`D1-Que`)
- Barra de 3 segmentos y «Paso 1 de 3».
- H1 «¿Qué ha pasado?» y el subtítulo.
- Rejilla de **9 tarjetas** (3 × 3 en ordenador) de 112 px de alto como mínimo, con icono, nombre y **una línea de ejemplos**. Son exactamente las 9 categorías actuales del producto, con estos nombres para la persona que denuncia (el valor que se guarda no cambia):

  | Valor guardado | Nombre en la tarjeta | Ejemplos |
  |---|---|---|
  | acoso | Acoso laboral o sexual | Humillaciones, insinuaciones o contacto no deseado |
  | fraude | Fraude o corrupción | Sobornos, facturas falsas o desvío de dinero |
  | discriminación | Discriminación | Trato peor por sexo, origen, edad o religión |
  | seguridad y salud | Seguridad en el trabajo | Riesgos sin protección o accidentes ocultados |
  | datos / RGPD | Datos personales | Datos de clientes o de la plantilla mal usados |
  | conflicto de intereses | Conflicto de intereses | Favorecer a familiares o a empresas propias |
  | irregularidades contables | Cuentas y gastos | Contabilidad maquillada o gastos falsos |
  | medio ambiente | Medio ambiente | Vertidos, residuos o emisiones |
  | otros | Otra cosa o no lo sé | Cuéntalo igualmente, ya lo clasificaremos |

  Usa los valores reales de la base de datos; esta tabla es solo la correspondencia. Traduce nombres y ejemplos a CA y EN.
  - Elegida: fondo blanco, icono sobre `--report-soft`, insignia azul con ✓ arriba a la derecha y la sombra permitida.
  - Sin elegir: `rgba(255,255,255,.12)`. La última, con borde discontinuo.
  - Son botones de radio de verdad (`role=radiogroup`, flechas del teclado).
- Abajo: «Volver» (a la entrada) y «Continuar», desactivado hasta que se elija una.

### 4.3 Paso 2 · Cuéntalo (`D2-Cuentalo`)
- Chip con la categoría elegida y H1 «Cuéntalo con tus palabras».
- **Tarjeta blanca grande:**
  - área de texto («¿Qué ha pasado?», 20 caracteres como mínimo, como ahora);
  - debajo, la fila **«Ayuda»** con 4 chips: Qué pasó, Dónde, Cuándo, Quién estaba. Se ponen en verde con ✓ cuando el texto o los campos de la derecha los cubren. Para esto basta una heurística sencilla con palabras clave en los 3 idiomas, y si el campo correspondiente está relleno, se marca. Es una ayuda, nunca bloquea.
  - el aviso ámbar de anonimato (solo si es anónima; el texto ya existe).
- **A la derecha:**
  - tarjeta «Si lo sabes · opcional», con Cuándo, Dónde o en qué área, y Personas implicadas (los campos actuales);
  - zona de **pruebas** con borde discontinuo, que acepta arrastrar archivos. Muestra cada archivo con nombre, tamaño y botón de quitar. Usa los mismos límites de hoy y saca el tamaño máximo de `VITE_MAX_FILE_MB`, por defecto 50.
- **Borrador:** lo escrito se guarda en `sessionStorage` (nunca en `localStorage`) y se borra al enviar o con «Salir rápido».

### 4.4 Paso 3 · ¿Quieres dar tu nombre? (`D3-Identidad`)
- **Dos tarjetas de radio:**
  - «No, prefiero el anonimato», con la etiqueta «Recomendado», elegida por defecto;
  - «Sí, con mis datos», que al elegirla despliega correo (obligatorio), nombre y teléfono (opcionales). Hoy la identidad va en el paso 1: muévela aquí.
- **Casilla nueva:** «También quiero explicarlo en persona. La empresa te propondrá una reunión en un máximo de 7 días». Guarda `meeting_requested` (art. 7.2; la columna ya existe por la migración 011). Comprueba el texto con el artículo 7.2 antes de dejarlo.
- **Tarjeta «Revisa antes de enviar»:** tema, lo contado (recortado), número de pruebas e identidad, con «Cambiar algo» para volver al paso 2.
- **Casilla de la política de privacidad**, obligatoria, como ahora.
- **Botón «Enviar denuncia»:** deja el Turnstile justo encima si está configurado, igual que ahora.

### 4.5 Enviada (`D4-Enviada`)
- Círculo blanco con ✓, H1 «Enviada. Guarda tu código.» y el subtítulo.
- **Tarjeta blanca:**
  - «Tu código secreto» con el código a 56 px, en `tabular-nums` y espaciado;
  - **Copiar**, **Descargar justificante** (el PDF que ya existe) e **Imprimir**.
- **«Qué pasa ahora»:** 3 pasos con las fechas reales calculadas (acuse a 7 días naturales y respuesta a 3 meses) y la frase de las represalias.
- **Abajo:** «Terminar y salir», que limpia la sesión y vuelve a la entrada, y «Ver mi caso».
- **Al salir sin copiar:** si el usuario intenta irse sin haber pulsado Copiar, Descargar o Imprimir, pregúntale una vez con un diálogo propio (no `confirm()`): «¿Has guardado el código? No se puede recuperar».

### 4.6 Escribir el código (`D0-Codigo`)
- Icono de llave, H1 «Mira tu caso» y el subtítulo.
- Un input enorme (76 px de alto, 34 px de letra, espaciado) con la máscara `XXXX-XXXX` y mayúsculas automáticas.
- Botón oscuro «Ver mi caso».
- Recuadro «¿Lo has perdido? Por seguridad no se puede recuperar. Puedes enviar una nueva denuncia y decir que es sobre la anterior».
- Error de código: texto claro debajo del input, sin decir si el código existe o no (no dar pistas).

### 4.7 Mi caso (`D5-MiCaso`, `M3-MiCaso`)
- **Columna izquierda:**
  - «Tu caso · CÓDIGO»;
  - H1 con el estado en palabras humanas: «La han recibido», «Lo están investigando», «Te han respondido», «Caso cerrado»;
  - línea de tiempo vertical (Enviada → Recibida por la empresa → Investigando → Respuesta), con fechas;
  - recuadro «¿Prefieres explicarlo en persona? Pide una reunión», que activa `meeting_requested` si no lo estaba.
- **Derecha:** conversación tipo chat. Los mensajes de la empresa van a la izquierda en `--soft` y los tuyos a la derecha en azul. Debajo, área de texto, adjuntar (si hoy se puede) y enviar.
- **Arriba a la derecha:** «Salir de mi caso», que solo borra la sesión (no cierra la denuncia), y «Salir rápido».

---

## 5. Lado Gestionar, pantalla a pantalla

Fondo `--bg` con 16 px de margen. A la izquierda va la **franja azul de 76 px** (en el acceso dice «Denunciar»; ya dentro del panel dice «Ver el canal» y abre el canal público de la empresa; ver sección 0). A la derecha, la tarjeta blanca con el contenido. En el móvil la franja desaparece.

**Cabecera del panel:**
- logo y nombre de la empresa;
- `PillNav`;
- a la derecha, buscar (abre un buscador por referencia o texto), «+ Registrar caso» (azul) y el avatar, que abre: tu nombre, rol, idioma y cerrar sesión.
- La cuenta de días de prueba y la etiqueta de datos demo siguen existiendo: ponlas como chip junto al nombre de la empresa.

### 5.1 Acceso (`G1-Acceso`)
- H1 «Gestionar» a 56 px, «Entra con tu correo de [empresa]» (si viene `from`), correo, contraseña y «Entrar».
- «He olvidado la contraseña» y la nota «Luego, el código de tu app».
- Recuadro: «¿Quieres presentar una denuncia? Usa el lado Denunciar. Desde aquí no se pueden enviar».
- **Pie:** «¿Tu empresa aún no tiene canal? Créalo gratis 30 días» (a `/crear-compte`).
- Microcopia bajo el botón: «Después, el código de 6 cifras de tu app».
- **Verificación (`G1b-Verificacion`):** H1 «Un último paso», 6 casillas de una cifra (pegar el código completo las rellena todas, y al completar la sexta se envía solo), «Entrar», «Volver» y «No tengo el móvil a mano» (códigos de recuperación, si existen; si no, el texto de ayuda actual).
- Las pantallas de recuperar o cambiar la contraseña usan este mismo diseño.

### 5.2 Tablero (`G2-Tablero`, `M4-Tablero`)
- «Hola, [nombre]» y el H1 con **cuántos casos necesitan algo hoy**: acuse pendiente, mensaje nuevo, reunión pendiente o plazo vencido, o con menos de 7 días. Si no hay ninguno: «Todo al día».
- **Tarjeta «Primeros pasos»:** anillo con X/5 y lo que falta. Al pulsarla va a Compartir. Desaparece cuando están los 5.
- **Tres columnas:**

  | Columna | Estados |
  |---|---|
  | **Nuevas** | recibida, sin acuse |
  | **En curso** | en revisión, en investigación, esperando al informante |
  | **Cerradas** | resuelta, cerrada, archivada; solo las 2 últimas y «Ver las N» |

- **`CaseCard`:**
  - título del caso (ver 5.6), categoría, anónima o con datos, y fecha;
  - fila de chips: primero el chip oscuro **«Hoy»** si el caso cuenta para el número del H1, y después `DeadlineChip`, «Pide reunión», «Te ha escrito», prioridad «Alta» o «Crítica»;
  - borde rojo si hay un plazo vencido; borde azul si está seleccionada.
- **Orden dentro de cada columna:** plazo más urgente primero.
- **Mover de columna** con arrastrar (HTML5 nativo) **y** con un botón accesible en la tarjeta. Pasar de Nuevas a En curso equivale a enviar el acuse: abre la ficha con el acuse preparado, no lo envíes en silencio.
- **Filtros:** categoría, prioridad, «solo los míos» y fechas, en un panel que se abre desde un botón «Filtrar». Los filtros de la tabla actual no se pierden.
- **Exportar Excel y PDF:** en el Informe y en un menú «···» del tablero.
- **El aviso amarillo de «X denuncias deben suprimirse»** (retención) se mantiene, como banda encima de las columnas.
- **Móvil:** las columnas pasan a ser pestañas en píldora («Nuevas · 2», …) y la barra de abajo.

### 5.3 Ficha del caso (`G3-Caso`)
- **Cabecera:**
  - «← Tablero»;
  - «REF-… · recibida [cuándo] por [vía]»;
  - H1 con el título del caso;
  - chips: categoría, anónima, prioridad, «Pide reunión presencial»;
  - a la derecha, «Exportar PDF» y «···» (suprimir datos, ampliar plazo, ver identidad si existe).
- **Banda oscura «siguiente paso»** (`--ink`):
  - estado en 4 segmentos: Recibida, Acuse enviado, Investigando, Respondida;
  - los plazos en una línea («6 días para acusar recibo · 7 días para la reunión · 91 días para responder»);
  - a la derecha, **un solo botón blanco con la acción que toca**:
    1. Sin acuse → **Enviar el acuse de recibo**. Usa el mensaje plantilla actual, editable antes de enviar.
    2. Con reunión pedida y no hecha → **Proponer la reunión** o **Marcar la reunión como hecha** (`mark_meeting_held`).
    3. Acusada y sin investigación iniciada → **Iniciar la investigación** (`investigation_started_at`).
    4. Investigando → **Responder y cerrar**: elegir el resultado (`outcome`) y enviar la respuesta final.
    5. Cerrada → nada; se muestra «Cerrada el [fecha]».
- **Columna principal:**
  - **«En pocas palabras»:** resumen hecho con IA (ver sección 7). Si la IA está desactivada, no aparece esta tarjeta.
  - **«Lo que ha contado»:** texto completo y tarjetas de Dónde, Cuándo, Personas implicadas y Pruebas (descarga, como ahora).
  - **«Conversación con quien informa»:** hilo de mensajes y composer con el aviso de anonimato, el botón **«Redactar con IA»** (sección 7, solo si está activa) y «Enviar». La primera vez el hilo dice «El acuse de recibo será el primero».
- **Columna lateral:**
  - **Gestión:** prioridad, «Quién lo lleva» (si no existe en la base de datos, crea `assigned_to` con su migración) y «Añadir nota interna» (las notas actuales).
  - **Reunión presencial:** solo si se ha pedido. Plazo y botón.
  - **Cerrar el caso:** «Resultado» (`outcome`) y el enlace «Remitir al Ministerio Fiscal» (`mark_fiscal_referral`), con un diálogo de confirmación que diga que no se puede deshacer.
  - **Identidad:** si es con datos, «Ver la identidad», que llama a `get_reporter_identity` y avisa de que queda registrado.
  - **Historial:** el registro de actividad actual, en lista con puntos.

### 5.4 Registrar una denuncia (`G7-Registrar`, ruta `/admin/nueva`)
Página para registrar denuncias que llegan por teléfono, en persona, por correo o por carta (`register_complaint`, migración 011):
- «¿Cómo ha llegado?» con chips de radio (Teléfono, En persona, Correo postal, Email, Otra), «Recibida el» (fecha y hora), Tema, «Lo que ha contado», Dónde, Cuándo y Personas implicadas, y «¿Ha dado su nombre?» (si dice sí, aparecen sus datos);
- a la derecha, la tarjeta oscura «Qué pasa al guardarla» con los 3 puntos de la maqueta;
- botones «Cancelar» y «Registrar y obtener el código»;
- al guardar, muestra el **código de seguimiento** en grande, como en la pantalla Enviada, con Copiar e Imprimir justificante, y el aviso «no se volverá a mostrar».

### 5.5 Compartir el canal (`G4-Compartir`)
H1 «Que toda la plantilla lo encuentre» y la frase sobre la ley.

**Tarjeta oscura «Primeros pasos»** con barra de progreso:
1. Designar a la persona responsable: se marca solo si está rellenado en Ajustes.
2. Poner el canal en la web: se marca a mano.
3. Invitar a otra persona del equipo: se marca solo si hay más de una.
4. Colgar el cartel con el QR: se marca a mano.
5. Comunicar el responsable a la AIPI: se marca solo con la fecha de Ajustes.

Los pasos a mano se guardan en la organización (migración si hace falta).

Debajo de los pasos va el recuadro **«Lo siguiente»**: explica el primer paso pendiente con su botón directo (en la maqueta, «Descargar el cartel») y «Ya está hecho» para marcarlo.

**4 tarjetas en rejilla de 2 × 2,** con la funcionalidad actual de V2Integrate:
- **El enlace:** dirección y «Copiar enlace».
- **Cartel con QR:** QR de verdad, idioma y «Descargar PDF». Añade también descargar el QR suelto en PNG y SVG desde un «···».
- **Botón para vuestra web:** vista previa, formato e idioma, y «Copiar el código».
- **Texto para la página de inicio** (art. 25): idioma y «Copiar el texto», con la nota de revisarlo con su asesoría.

### 5.6 Título de cada caso
- Las tarjetas y la ficha muestran un **título corto**, de 6 a 10 palabras.
- Con la IA activa, lo genera la IA (sección 7).
- Sin IA: las primeras 9 palabras de la descripción más «…».
- El gestor puede editarlo a mano con un lápiz en la ficha. Se guarda en `complaints.title`, una columna nueva.
- **Nunca** se le muestra a quien informa.

### 5.7 Equipo y ajustes (`G5-Ajustes`)
Dos columnas: a la izquierda (más ancha) Responsable del Sistema y Plan; a la derecha Quién gestiona y Tu seguridad.

1. **Quién gestiona:**
   - lista de personas con avatar, rol y categorías;
   - «Cambiar» abre el panel de permisos actual;
   - «+ Invitar» abre la invitación actual;
   - la gestión de usuarios que hoy está en V2Users entra aquí entera.
2. **Responsable del Sistema:**
   - nombre y cargo (ya existen);
   - **«Nombrada el»** y **«Comunicado a la AIPI»**, dos fechas nuevas (migración);
   - **«Autoridad autonómica que se muestra en el canal»**, un select que guarda `regional_authority_name/url`, con «Ninguna» y la «Oficina Antifrau de Catalunya» (`ANTIFRAU_URL`).
   - Si «Comunicado a la AIPI» está vacío, el campo se ve en ámbar con la cuenta atrás «Quedan N días hábiles» (10 días hábiles desde «Nombrada el», sin contar sábados, domingos ni festivos nacionales; si no puedes calcular festivos, solo fines de semana y dilo). Si ya han pasado, el aviso pasa a rojo y sale también en el tablero.
  - Enlace «Cómo comunicarlo a la AIPI» y botón «Guardar».
3. **Plan:**
   - estado de la prueba con la frase «el canal sigue abierto aunque acabe» (compruébalo en el código; si no es así, dímelo);
   - «Contratar», que es el mailto de hoy;
   - enlaces a Datos de facturación (los campos actuales, en un panel) y al Contrato de encargado del tratamiento.
4. **Tu seguridad:** estado de la verificación en dos pasos (lleva a `/admin/mfa`) y cambiar la contraseña.

El nombre de la empresa (editable) y la dirección del canal (no editable) van en un «···» de la cabecera de la página, o como quinta tarjeta pequeña.

### 5.8 Informe (`G6-Informe`)
- H1 «[Año], de un vistazo» con el selector de año al lado.
- Botones: «Libro-registro (Excel)» y «Informe para dirección (PDF)», que son las exportaciones actuales.
- **4 cifras grandes:**
  - recibidas (fondo azul);
  - respondidas a tiempo «X de Y»;
  - % anónimas;
  - con plazo vencido (fondo `--danger`).
- **Por mes:** barras verticales en HTML y CSS, con el mes con más denuncias en azul fuerte y el resto en `#A9BCFA`.
- **Por tema:** barras horizontales.
- Las barras llevan `aria-hidden`, y debajo hay una tabla accesible oculta visualmente con los mismos números.
- «Ver las denuncias del periodo» sigue existiendo.

---

## 5.9 Coherencia de los datos de ejemplo
Las maquetas cuentan una sola historia; los datos demo deben cuadrar igual:
- **Hoy** es el 7 de octubre. La denuncia de acoso se recibió el 6 de octubre a las 23:12.
- **Acuse:** hasta el 13 de octubre (6 días). **Reunión:** hasta el 13 de octubre. **Respuesta:** hasta el 6 de enero (91 días).
- El código secreto (5P7Y-983E) y la referencia interna (REF-7P2MQA) son cosas distintas: la referencia nunca se le muestra a quien denuncia, y el código nunca se muestra en el panel.

## 6. Estados que no están en las maquetas (hazlos con el mismo estilo)
- **Panel vacío:** «Todavía no ha llegado ninguna denuncia», con el botón «Compartir el canal». Las 3 columnas se ven vacías con un texto suave.
- **Cargando:** esqueletos con la forma de las tarjetas, en `--soft`.
- **Errores:** recuadro `--danger` con un texto claro y «Reintentar».
- **Canal que no existe:** tarjeta blanca centrada, «Este canal no existe», enlace «Ir a Reportia». Mantén el idioma: no lo cambies a inglés como pasa ahora.
- **404 general:** igual.
- **Confirmaciones** (suprimir, remitir al Fiscal, cerrar): diálogo propio, nunca `confirm()`.

---

## 7. IA (preparada, apagada por defecto)
Dos ayudas para el gestor, **nunca** para quien denuncia:
1. **Resumen y título** del caso: 3 frases y un título de 6 a 10 palabras.
2. **«Redactar con IA»**: propone un borrador de mensaje (acuse, pregunta o respuesta final) que el gestor edita antes de enviar. Nunca se envía solo.

Cómo hacerlo:
- **Edge function nueva `ai-assist`** en `supabase/functions/`:
  - recibe el `complaint_id` y la acción;
  - comprueba con el JWT que el gestor tiene acceso a ese caso (las mismas reglas que RLS);
  - llama al proveedor que diga `AI_PROVIDER_URL` / `AI_API_KEY`;
  - guarda el resultado en `complaints.ai_summary`, `ai_title` y `ai_generated_at`, con una entrada en el registro de actividad.
- Que la función **no envíe nunca** el nombre, correo ni teléfono de quien informa: solo la categoría, la descripción y los campos opcionales.
- **Frontend:** todo detrás de `VITE_AI_ENABLED=1`. Sin esa variable, no se ve nada de IA.
- **No la actives ni la despliegues.** Antes hay que elegir un proveedor que procese en la UE y sin conservar los datos, y firmar su contrato de encargado. Eso lo decido yo con mi jefe. Déjame en `docs/IA.md` qué hace falta.
- En el modo demo, la IA sí se ve, con textos fijos de ejemplo, para poder enseñarla.

---

## 8. Modo demo y canal de ejemplo
- Los datos demo deben cubrir todas las pantallas:
  - casos en las 3 columnas, uno con reunión pedida y uno con mensaje nuevo;
  - uno vencido y uno registrado por teléfono;
  - el responsable con la fecha de la AIPI vacía;
  - los primeros pasos a 3 de 5.
- Actualiza `scripts/landing-shots.mjs`, porque las capturas de la portada (`public/landing/*.webp`) muestran el diseño antiguo, y regenéralas al final.

---

## 9. Fases (para al final de cada una)
1. **Sistema visual y componentes:**
   - `ds.css`, Manrope y `src/v2/ui/*`;
   - una página `/dev/ui`, solo en modo desarrollo, que muestre todos los componentes en sus estados.
2. **Lado Denunciar:** entrada, los 3 pasos, enviada, escribir el código y mi caso, en escritorio y en móvil, con el modo demo funcionando de principio a fin.
3. **Acceso, verificación, Tablero, Ficha del caso y Registrar una denuncia:** con el siguiente paso y el móvil.
4. **Compartir, Equipo y ajustes, Informe:** más las migraciones nuevas (`title`, `assigned_to`, fechas del responsable, primeros pasos, IA), en **una sola** migración `012_rediseno.sql`.
5. **IA preparada y apagada,** y los textos de la ley revisados en los 3 idiomas.
6. **Limpieza:**
   - borra los componentes y el CSS antiguo que ya no se usen, comprobándolo antes con grep;
   - revisa que ninguna ruta antigua dé error;
   - pasa una revisión de accesibilidad con el teclado y lanza `npm run build`.
7. **(Opcional, pregúntame antes)** Adaptar la portada `/` al estilo nuevo: Manrope, el azul `#2F54EB` y los radios. Las capturas nuevas del producto ya saldrán con el diseño nuevo.

---

## 10. Comprobación final
- Recorrido completo en modo demo, con capturas a 1440 y 375 px, en castellano, y una en catalán y otra en inglés:
  1. entrar al canal, denunciar de forma anónima con una reunión pedida y guardar el código;
  2. abrir «Mi caso» y escribir un mensaje;
  3. entrar como gestor y ver el caso en «Nuevas»;
  4. enviar el acuse y verlo pasar a «En curso»;
  5. marcar la reunión hecha, iniciar la investigación, responder y cerrar con un resultado;
  6. registrar un caso telefónico;
  7. exportar el PDF del caso y el libro-registro.
- Ninguna pantalla con desbordamiento horizontal a 375 px.
- Lista de: migraciones que tengo que ejecutar, variables de entorno nuevas y cosas que no hayas podido hacer.
- Un resumen de 10 líneas, sin tecnicismos, para enseñárselo a David Comellas.

---

## 11. Qué queda de `PROMPT_repaso_completo.md`
Cuando acabes esto, de aquel documento solo siguen vigentes:
- **1.3** (límite de archivos; ya cubierto aquí si lo hiciste), **1.4** (etiqueta «Referencia» en el PDF) y **1.7** (`og:image` absoluta);
- **Bloque 3** (datos de Reportia, aviso legal, privacidad separada, condiciones, contrato de encargado y bloque de seguridad de la portada);
- **4.2** (formulario «Pida una demostración» en la portada);
- **Bloque 5** (Google);
- **Bloque 7** (limpieza del repositorio).

El resto (1.1, 1.2, 1.5, 1.6, bloque 2, 4.1, 4.3, 4.4, bloque 6) queda sustituido por este rediseño.
