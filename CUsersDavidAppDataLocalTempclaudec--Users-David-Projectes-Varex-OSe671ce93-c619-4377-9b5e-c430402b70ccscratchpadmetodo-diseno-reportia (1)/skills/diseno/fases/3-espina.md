# Fase 3 · La espina

**Queda decidido al cerrar:** todo lo que después no se puede cambiar sin rehacer. Escrito en el
plan, aprobado por David, y a partir de ahí es la referencia de la construcción.

---

## 0 · El modo plan: qué es, cuándo, y por qué es opcional

**Lo primero, porque hasta ahora estaba mal contado: yo no puedo encenderlo.** El modo plan lo
activa David desde su teclado. Así que la skill no «lo pone»: **lo pide, en el momento exacto, y
dice para qué.**

**Qué es.** Un candado del programa: mientras está puesto, **yo no puedo escribir ni modificar
ningún archivo**, solo leer y proponer. No es una promesa mía, lo impide la herramienta.

**Cuándo se pide.** En un solo momento: **cuando la espina ya está escrita y toca que la
apruebes**. Ni antes ni durante. Durante esta fase necesito escribir archivos para trabajar
(descargar tipografías, montar comparaciones, hacer capturas), y con el candado puesto no podría.

**Cómo se pide.** Con esta frase, literal, cuando la espina está lista:

> *«La espina está escrita. Si quieres el candado antes de aprobarla, activa el modo plan ahora
> (Mayús+Tab hasta que ponga "plan mode"). Te la presento, la lees, y al aprobarla se levanta y
> construyo. Si prefieres sin candado, dime que sí y empiezo igual.»*

**Para qué sirve de verdad.** Para una sola cosa: que yo no me adelante a construir mientras tú
todavía estás leyendo la espina. Es el fallo clásico, y con el candado es imposible.

**Por qué es opcional, dicho claro.** La regla de la skill ya dice que no se construye hasta que
la espina está aprobada. El candado no añade una regla nueva: **añade que sea mecánicamente
imposible saltármela.** Sirve cuando la espina es larga, cuando hay prisa (que es cuando más me
adelanto) o cuando David quiere leerla con calma sin que yo avance por detrás. En una pieza
pequeña, con la espina en diez líneas, es ceremonia.

**Lo que NO hace:** no guarda nada, no es un archivo, no sustituye al plan. El plan es el
documento; esto es solo un cerrojo mientras lo lees.

---

## 1 · La espina se EXTRAE del boceto, no se inventa

Es lo que más se malentiende de esta fase. No se llega aquí con una hoja en blanco a decidir
gustos: se llega con una dirección ya elegida y **se convierte en sistema**. Cuatro pasos:

1. **Medir lo que hace el boceto ganador.** Dónde se alinea cada cosa, qué tamaños de letra usa
   de verdad, cuánta superficie lleva color, qué separa una sección de otra. Con números.
2. **Regularizar.** El boceto se hizo rápido y sus valores son aproximados: seis tamaños de letra
   que en realidad son cuatro, márgenes que casi coinciden. Se convierten en una escala.
3. **Rellenar lo que el boceto no contestó.** Estados de los botones, qué pasa en móvil, el
   segundo nivel de titular, el foco del teclado. Un boceto nunca los tiene.
4. **Escribirlo.** A partir de aquí es la referencia y no se reabre sin decirlo.

> 🔁 **Si ya existe un sistema de diseño**, esta fase es de lectura, no de decisión: se hereda,
> se confirma en una línea y **solo se decide lo que falte**. Convertir una pantalla nueva de un
> producto que ya existe en un ejercicio de identidad cuesta días y rompe la coherencia.

## 2 · Qué va en la espina, y por qué aquí

Todo lo que se contagia a la pieza entera. Cambiar cualquiera de estas cosas a mitad de la
fase 4 obliga a tocar cada pantalla.

| Decisión | Qué es, en palabras llanas | Cómo se decide |
|---|---|---|
| **La rejilla** | Las líneas verticales invisibles con las que se alinea todo: dónde empieza un titular, dónde el texto de debajo, dónde una tarjeta. Cuando cada cosa empieza en un sitio propio, la página se siente descuadrada aunque nadie sepa decir por qué | Se cuentan las líneas distintas que necesita la dirección elegida. Pocas. Se escriben como un sistema de columnas y un margen exterior |
| **La escala de letras** | Cuántos tamaños hay y cómo se relacionan | Persuadir: fluida, con techo de tamaño en el titular. Operar: fija, con saltos cortos. Detalle en [criterio.md](../criterio.md) |
| **La pareja tipográfica** | Qué letra para titulares y cuál para texto, o una sola | Se emparejan por contraste, nunca dos parecidas. En Operar una familia suele bastar. Candidatas de [recursos.md](../recursos.md), enseñadas en captura con el titular real |
| **La estrategia de color** | Cuánta superficie lleva color, y cuál | Contenida, comprometida, de paleta completa o bañada. Se decide **viendo** el boceto elegido, no por categoría de producto. Detalle en criterio |
| **Claro u oscuro** | El fondo base | Por la escena de uso: quién lo abre, dónde, con qué luz. Nunca por costumbre del sector |
| **La postura ante la imagen** | Si la pieza lleva fotografía, textura de fondo, imagen generada o nada. Y si algo de eso se mueve | Contagia todo: una pieza fotográfica se compone distinto que una tipográfica. Se decide aquí, no cuando falta rellenar un hueco. Detalle en [recursos.md](../recursos.md) |
| **El efecto que manda** | **Uno.** El que lleva la identidad de la pieza. El resto son coro | Se nombra. Si hay dos candidatos, se elige. Con cuatro compitiendo no se lee ninguno como firma |
| **La línea de formas** | Un sistema de radios, un tipo de borde, una manera de dar profundidad | Se fija una vez. Radios coherentes entre botones, tarjetas y campos. Sombras con desplazamiento y desenfoque, no halos |
| **Los botones** | Forma, tamaño, y **todos sus estados**: reposo, hover, foco, pulsado, desactivado, cargando | Se diseña uno y se aplica a todos. Un botón que cambia de forma entre pantallas es un fallo |
| **Encabezados y navegación** | Cómo empieza cada sección, cómo se navega | Una regla para todos los encabezados. La navegación en una línea, de altura contenida |
| **El idioma del movimiento** | Una gramática: o curvas con duración, o muelles, no las dos | Se fija aquí para que la fase 5 no invente. Curvas de salida siempre |
| **Los aparatos** | Se repiten aquí los obligatorios de la fase 0 | Para que la construcción los tenga delante |

## 3 · Los tokens: un archivo que manda

Si el proyecto ya tiene un archivo de estilo con sus valores, **manda**, y la espina se escribe
con sus nombres. Si no lo tiene, la espina lo crea: **un solo archivo** con colores, tipografías,
escala, radios, sombras, curvas y espaciado. Todo lo demás lo importa de ahí.

**La regla que evita que dos pantallas del mismo producto no casen:** ninguna pantalla escribe
un valor a mano si existe un token. Se comprueba en la fase 6.

## 4 · Lo que investigo yo en esta fase

🔴 **Parada de referencias, la segunda.** La de la fase 2 era de dirección; esta es **de oficio**,
y es muy concreta: **cómo lo resuelven otros**. Antes de fijar cada decisión se mira al menos un
ejemplo real de quien lo hace bien. Qué se mira en cada caso:

| Decisión | Qué se busca en las referencias |
|---|---|
| **La rejilla** | Cuántas líneas usa una página que se siente ordenada, y dónde cae el margen exterior |
| **La pareja tipográfica** | Parejas que funcionan, en piezas reales y al tamaño real. Los sitios de tipografía enseñan la letra en uso, no solo el catálogo |
| **El color** | Cuánta superficie lleva color en piezas del mismo registro, medido con el método de [marca.md](../marca.md). Y un filtro rápido antes de montar nada: **Realtime Colors** repinta una página entera con la paleta al instante, para descartar sin trabajo lo que no aguanta |
| **Las formas** | Sistemas de radios y profundidad coherentes, en productos que se sienten caros |
| **Los botones y sus estados** | Piezas reales de producto, donde los estados están resueltos de verdad |

Los sitios y para qué va bien cada uno están en [referencias.md](../referencias.md). Los de
producto sirven especialmente aquí: en modo Operar no se busca originalidad, se busca **cómo
resuelven otros la misma tarea**, porque la familiaridad es una virtud.

Y lo demás que hago en esta fase:

- Las tipografías candidatas se **descargan** de Fontshare o de donde toque y se prueban con el
  titular real, no con un texto de muestra. Se enseñan en captura, dos o tres pares.
- Si la dirección lleva textura, se busca en Texturelabs y se prueba sobre el boceto.
- Si hace falta un componente complejo (tabla grande, menú de comandos, gráfico), se decide ya
  qué librería lo hace: **`/pick-ui-library`** da una respuesta seca, sin menú. Hay que llamarla a
  mano.
- Los valores concretos de contraste se calculan, no se estiman: cuerpo a 4,5:1 o más, texto
  grande a 3:1 o más. Sobre superficies de color, el texto secundario se tiñe del mismo tono, no
  de gris.

## 5 · Lo que se le pregunta a David

Solo lo que es gusto, y siempre en comparación visual:

- **Cuál de dos o tres pares tipográficos**, con el titular real en captura.
- **Cuánto color**: el boceto elegido con la estrategia contenida al lado de la comprometida.
- **Cuál es el efecto que manda**, si hay dos candidatos. Con los dos insinuados.
- **Claro u oscuro**, solo si la escena de uso no lo decide sola.

No se le pregunta por radios, curvas, tamaños de letra ni valores. Eso se decide con criterio y
se enseña el resultado.

## 6 · Las piezas que pueden ayudar aquí

- **`/impeccable typeset`** para la jerarquía y las fuentes, y **`/impeccable colorize`** para
  la estrategia de color. Son quirúrgicas: una dimensión cada vez. Se usan cuando la decisión no
  sale clara del boceto.
- **`/apple-design`** si la dirección lleva gestos, muelles o materiales translúcidos. Da las
  bases de respuesta, consistencia espacial y contención que sostienen ese lenguaje.
- **`/pick-ui-library`** para componentes complejos, antes de construir.
- **`/impeccable document`** existe para derivar el archivo de diseño de lo ya construido; aquí
  no toca todavía, porque aún no hay nada construido. Se menciona porque en la fase 7 puede
  servir en proyectos largos.

## 7 · Cierre

Se escribe la espina en el plan con la plantilla de [plan.md](../plan.md), se ofrece el candado
con la frase del punto 0, se presenta, y **David la aprueba**. Desde aquí:

- Reabrir cualquier línea de la espina es reabrir una fase cerrada: se dice y se anota.
- La construcción no inventa nada que esté en la espina. Lo que no está, se decide en la fase 4
  con el criterio general.

## Fallos típicos de esta fase

- **Decidir la rejilla después de construir.** Es el fallo más caro que existe en esta skill.
- **Preguntar valores.** David decide viendo, no leyendo un número.
- **Dos efectos que mandan.** Ninguno manda.
- **Elegir claro u oscuro por costumbre del sector.** Se elige por la escena.
- **Dos gramáticas de movimiento** en la misma pieza. Se nota aunque no se sepa decir.
- **Tokens que existen y no se usan.** La espina obliga a usarlos.
- **Construir mientras David todavía lee la espina.** Es el fallo que el candado del modo plan existe para impedir: si hay prisa, se pide.
