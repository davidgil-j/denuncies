---
name: diseno
description: Usar cuando David vaya a diseñar, construir, rehacer o revisar cualquier cosa que se vea (una landing, una web de cliente, una pantalla de software interno, un rediseño, una pieza suelta), o cuando diga "monta la landing de", "esto se ve mal", "hazlo bonito", "revisa el diseño de", "no me gusta cómo ha quedado", "quiero que quede como". También cuando otra persona vaya a construir algo visual y necesite llegar al mismo nivel sin conocer este repositorio.
user-invocable: true
argument-hint: "<qué vamos a diseñar o revisar>"
---

# Diseño

**El principio.** David decide viendo, no leyendo, y eso no se cambia: se cambia **qué se le
enseña y cuándo**. Un boceto que no duele tirar cuesta veinte minutos; una versión acabada cuesta
tres horas. Todo el método sale de ahí: enseñar pronto, barato y en comparación; decidir lo que
luego no se puede cambiar antes de construir; construir una vez; revisar con un listón que bloquea.

**Lo que resuelve.** Sin método, el trabajo visual se hace al revés: se pule antes de elegir
dirección, la rejilla se decide cuando ya hay veinte pantallas, el copy se reescribe cinco veces
porque nunca hubo un punto de decisión, y lo que falla en un móvil se descubre después de
publicar. El resultado puede ser bueno, pero cuesta días y deja al que decide agotado.

---

## Las tres leyes

No admiten excepción. Se comprueban en la fase 6 y bloquean la publicación.

| | Ley | Qué significa en la práctica |
|---|---|---|
| **1** | **Cero morralla de IA en el texto** | Sin raya larga. Sin datos inventados. Sin el párrafo final que resume lo ya dicho. Sin las fórmulas huecas. La lista completa está en [criterio.md](criterio.md) |
| **2** | **Nada esencial depende de un efecto que pueda fallar** | Si el vídeo no carga, el título se lee. Si la animación no salta, la sección se ve. Si el JavaScript falla, el HTML dice lo que tiene que decir |
| **3** | **Probado en el aparato real antes de publicar** | Captura de verdad del móvil y del ordenador. Si algo "se ve mal" y no se reproduce, se instrumenta y se pide captura: no se razona a ciegas |

Todo lo demás en esta skill es **criterio y comprobación**, no ley. Hay diseños excelentes que
rompen cualquier comprobación a propósito; lo obligatorio es medirla y decirlo.

---

## Las ocho fases

| Fase | Qué queda decidido al cerrarla | Archivo |
|---|---|---|
| **0 · La entrevista** | Qué es, para quién, en qué modo, en qué aparatos, y qué partes vienen ya trabajadas | [fases/0-entrevista.md](fases/0-entrevista.md) |
| **1 · El mensaje** | Qué tiene que creer quien lo lee, y las secciones como argumentos | [fases/1-mensaje.md](fases/1-mensaje.md) |
| **2 · Los bocetos** | La dirección visual, elegida viendo entre varias | [fases/2-bocetos.md](fases/2-bocetos.md) |
| **3 · La espina** | Rejilla, letras, color, formas, botones, encabezados, el efecto que manda, el idioma del movimiento | [fases/3-espina.md](fases/3-espina.md) |
| **4 · Construir** | La pieza construida y vista | [fases/4-construir.md](fases/4-construir.md) |
| **5 · El movimiento** | Cómo se siente al tocarla, aprobado | [fases/5-movimiento.md](fases/5-movimiento.md) |
| **6 · El repaso** | Las leyes y las comprobaciones, con veredicto | [fases/6-repaso.md](fases/6-repaso.md) |
| **7 · Publicar** | En su sitio, comprobado en producción, con el plan cerrado | [fases/7-publicar.md](fases/7-publicar.md) |

**Se abre el archivo de la fase en la que estamos, no los ocho.** Cada uno dice qué se decide,
cómo se hace, qué investigo yo y dónde, qué se le pregunta a David y cómo, qué piezas pueden
ayudar, y qué tiene que existir para cerrarla.

### No es una cadena, es un trinquete

Dentro de una fase se itera sin límite: tres bocetos o doce, las vueltas que hagan falta. Lo que
se controla es **reabrir una fase cerrada**: se puede, pero se dice en una línea y se anota en el
plan, porque reabrir la dirección con la página medio pulida es lo que convierte un día en tres.
También se avisa, en una línea, cuando llevamos muchas vueltas en la misma fase, por si conviene
parar y replantear en vez de seguir afinando.

### Fases que vienen trabajadas

El contenido puede llevar semanas decidido mientras el diseño está en blanco; la marca puede
existir y la dirección no. **La fase 0 pregunta qué viene trabajado y esas fases no se reabren
desde cero:** se lee lo que hay, se confirma en una línea y se sigue. Preguntar lo que ya está
decidido es el fallo más irritante que puede cometer esta skill.

### Por qué los bocetos van ANTES que la espina

Parece del revés: lo normal sería fijar la rejilla, las letras y el color, y después dibujar con
eso puesto. Va al revés a propósito, y el motivo es el principio de arriba.

**Todo lo que contiene la espina son cosas que solo se pueden juzgar viendo.** Si se deciden en
abstracto y luego se dibuja, el boceto deja de ser una elección y pasa a ser la confirmación de
algo ya decidido. Es el mismo error de pulir antes de elegir, disfrazado de orden.

**Y la espina no se inventa en la fase 3: se extrae del boceto elegido.** Se mira qué está
haciendo de verdad la dirección que ganó, se mide, se regulariza, se rellenan los huecos que no
resolvió y se escribe. La pregunta de la fase 3 no es *«¿qué rejilla me gusta?»*, es **«¿qué
sistema necesita esta dirección para construirse entera sin descuadrarse?»**.

**Lo que sí existe antes de bocetar, y no es la espina:** el material. La marca si la hay, el
modo, los aparatos y los rangos reales del contenido. Eso sale de las fases 0 y 1, y es lo que
comparten los tres bocetos para que lo que cambie entre ellos sea la dirección y no el punto de
partida.

> **Cuando ya existe un sistema de diseño** (un archivo de tokens, una marca con manual), la
> espina se **hereda**, no se decide: se lee, se confirma y se anotan solo los huecos. Entonces
> los bocetos no exploran identidad, exploran **composición**. Convertir una pantalla nueva de un
> producto que ya existe en un ejercicio de identidad es un error caro.

---

## Cómo se trabaja con ella

1. **Cada respuesta empieza con una línea que dice en qué fase estamos.** Sin excepción. Es lo
   que impide que el plan se deshaga sin que nadie lo note.
2. **Antes de preguntar, mirar.** Lo que está en el repositorio, en el código o en la web del
   cliente se investiga y se trae resuelto. Se pregunta solo lo que está en la cabeza de David:
   qué quiere, qué le preocupa, cuál de dos le gusta. Y se pregunta con opciones que digan qué
   pasa si se elige cada una, con la recomendada marcada.
3. 🔴 **Nada se dibuja sin haber mirado antes.** Es la regla que más distancia marca entre un
   resultado bueno y uno del montón, y la más fácil de saltarse por prisa. Diseñar sin referencias
   delante no produce una página neutra: produce **el reflejo de la máquina**, que es siempre el
   mismo. Hay una parada de referencias **en cada fase que decide algo visual**, y el método
   completo está en [referencias.md](referencias.md).
4. **Cuando se le enseña algo, se le enseña en captura**, al mismo tamaño y en comparación.
   Nunca se le pide que juzgue código, ni una miniatura, ni una descripción.
5. **Un solo archivo de salida: el plan.** Vive en la carpeta del proyecto, no se borra al
   terminar, y dice lo que está decidido ahora, no el historial. Plantilla y reglas en
   [plan.md](plan.md). Prohibido generar archivos de diseño, de decisiones, de reglas o de gusto
   aparte de ese.
6. 🎨 **Generar imagen y vídeo está disponible: se propone, no se espera.** David tiene Gemini y
   lo puede usar cuando haga falta. Sirve para crear la imagen que el mensaje necesita y no existe,
   **animar una imagen fija que ya gustó**, componer texturas y sacar bocetos de pantalla entera.
   La vía por defecto es que **yo escribo el texto de generación, afinado, y él lo genera y me deja
   el archivo**. Todo en [recursos.md](recursos.md).
7. **El modo plan de Codex es opcional, y lo activas tú.** Yo no puedo encenderlo. Lo que sí
   hago es **pedírtelo en el momento exacto**: cuando la espina está escrita y lista para que la
   apruebes. Por qué ahí y no antes, y por qué es opcional, en
   [fases/3-espina.md](fases/3-espina.md).
8. **Las otras skills instaladas son herramientas, no jefes.** Cada fase dice cuáles pueden
   ayudar y cuándo. Se usan cuando el caso lo pide; si en un caso concreto no aportan, no se
   fuerzan. El inventario completo, con qué hace cada una y cómo se instala en otro repositorio,
   está en [piezas.md](piezas.md).

## Los archivos de método

| Archivo | Para qué |
|---|---|
| [referencias.md](referencias.md) | Cómo se buscan, se extraen y se enseñan las referencias. Qué mira David y qué traigo yo |
| [criterio.md](criterio.md) | La línea visual: cómo se toman las decisiones de rejilla, letras, color, formas y firma. Lo que huele a IA. Las comprobaciones de David |
| [marca.md](marca.md) | Cómo se mide y documenta una marca cuando no existe ficha |
| [recursos.md](recursos.md) | De dónde salen letras, texturas, imágenes, componentes e inspiración |
| [piezas.md](piezas.md) | Las piezas instaladas: qué hace cada una, en qué fase suma, cómo se instala |
| [plan.md](plan.md) | La plantilla del único archivo de salida |

---

## Cuándo NO usar esta skill

- Un arreglo de una línea en algo que ya funciona.
- Algo que no se ve: una consulta, un script, una automatización.
- Cuando David ya está iterando a gusto sobre algo construido y pide retoques sueltos. Meter las
  ocho fases ahí es burocracia; se aplica la fase 6 si hace falta y punto.

## Señales de que lo estoy haciendo mal

| Señal | Lo que significa |
|---|---|
| Llevo dos respuestas sin decir en qué fase estamos | El plan se está deshaciendo |
| Estoy puliendo y todavía no hay boceto elegido | Fabrico trabajo que dolerá tirar |
| He escrito un segundo archivo de salida | Va contra la regla del archivo único |
| Le he preguntado algo que estaba en el repositorio o en la web | Pereza. Se busca |
| Le he preguntado algo que ya venía trabajado | No leí la fase 0 |
| David dice "se ve mal" y yo explico por qué debería verse bien | Toca instrumentar y pedir captura |
| Le propongo cosas y ninguna encaja, una tras otra | Lo que falta está en su cabeza: preguntar hasta que lo diga él |
| Los tres bocetos son tres tonos de lo mismo | No hay decisión posible; hay que divergir en un eje nombrado |
| He decidido yo cuál era el mejor boceto | La elección es suya |

## Para usarla fuera de este repositorio

La skill es una carpeta de texto: se copia entera a `.Codex/skills/diseno/` del otro proyecto y
funciona. Lo que necesita del proyecto: una ficha de marca si existe (si no, [marca.md](marca.md)
explica cómo hacerla), y las piezas de [piezas.md](piezas.md) que se quieran usar, cada una con
su orden de instalación. Nada de esta skill depende de archivos de este repositorio.
