# Fase 2 · Los bocetos

**Queda decidido al cerrar:** la dirección visual, **elegida por David viendo** varias
genuinamente distintas, y qué se toma prestado de las descartadas.

**Es obligatoria también cuando la pieza ya existe.** Un rediseño sin bocetos es pulir a ciegas.
Y es la fase que se siente lenta: las primeras horas no producen nada aprovechable. Ese es
exactamente el precio que evita el día entero de retoques sobre una dirección equivocada.

---

## 1 · Qué es un boceto y qué no

Un boceto **enseña una dirección, no un acabado**. Tiene que verse en una captura y contestar a
una sola pregunta: *¿es por aquí?*

| Un boceto sí tiene | Un boceto no tiene |
|---|---|
| La estructura de la pieza entera, con las secciones aprobadas en la fase 1 | Copy final. Vale con la frase y los titulares reales; el cuerpo puede ser un párrafo aproximado |
| El titular real, no un texto de relleno | Responsive afinado. Se hace a un tamaño |
| Un color y una tipografía elegidos, aunque provisionales | Animación fina. Como mucho, la firma insinuada |
| Contenido con forma real: nombres, cifras, imágenes plausibles | Estados, formularios que funcionen, detalles de componente |
| Veinte o treinta minutos de trabajo | Nada que duela tirar |

Si un boceto lleva más de una hora, se ha convertido en una versión y hay que parar.

## 2 · Antes de bocetar: las referencias

Bocetar sin referencias es bocetar desde el defecto de la máquina. El método entero está en
[referencias.md](../referencias.md); lo esencial:

1. **Se le piden a David dos o tres cosas concretas que le gusten**, con qué de cada una. Objetos
   con nombre, no adjetivos: *«la entrada de imágenes de tal web»*, no *«algo moderno»*.
2. **Yo traigo tres enlaces concretos** de los sitios de inspiración, con una línea de qué mirar
   en cada uno. Y si puedo, capturas, para que las vea aquí sin salir. No elijo por él.
3. **De cada referencia se extrae el recurso**, no el aspecto: cómo entra una imagen, cómo se
   usa la tipografía grande, cómo se encadenan dos secciones, qué ritmo lleva el scroll.
4. Todo eso cabe en cinco líneas del plan. Si son quince, sobra.

## 3 · Tres direcciones que difieran de verdad

**El valor de esta fase es la divergencia.** Tres tonos de lo mismo no dejan elegir nada: David
las mira y no aprende nada de sí mismo. Cada dirección tiene que ser defendible por sí sola y
contestar de forma distinta al mismo mensaje.

Antes de construir ninguna, se escribe la terna con **un nombre y un eje** cada una:

| Eje posible | Ejemplo de dos direcciones opuestas en ese eje |
|---|---|
| **Estructura** | Una columna larga que se lee de arriba abajo · Bloques asimétricos que se descubren |
| **Densidad** | Mucho aire y pocas cosas grandes · Compacto, con muchas piezas pequeñas |
| **Personalidad** | Sobrio y de confianza · Atrevido, con la marca bañándolo todo |
| **Movimiento** | Quieto, donde manda la tipografía · Con una firma que se mueve y el resto en calma |
| **Material** | Plano, tipográfico · Con textura, fotografía, profundidad |

Los nombres describen la dirección: *Quieta*, *Editorial*, *Bañada*, *Densa*. Nunca *A*, *B*, *C*.
Si dos direcciones solo se diferencian en el acento de color o en el copy, son una; se sustituye
una por otra de verdad.

**Tres es el número por defecto.** Hasta cinco si el espacio es genuinamente amplio o David lo
pide. Más de cinco diluye la comparación.

## 4 · Con qué se boceta, según el alcance

| Alcance | Cómo | Qué hace falta |
|---|---|---|
| **Una pieza suelta** (un aviso, una tarjeta de precio, un desplegable, un botón especial) | **`/prototype`** construye las versiones en un archivo aislado con un selector para pasar de una a otra en vivo, cada una funcionando de verdad y con contenido plausible. Hay que llamarla a mano: no se enciende sola | Nada |
| **Una página entera, sin generación de imágenes** | **Tres carpetas, tres direcciones, un agente por carpeta** para que no se contaminen entre sí. Cada agente construye su dirección como HTML estático a partir del plan. Si las direcciones coinciden con un estilo cerrado, cada agente carga el suyo: `/minimalist-ui`, `/high-end-visual-design` o `/industrial-brutalist-ui`. Si no, `/taste-skill` con sus tres mandos puestos a valores distintos en cada carpeta (variación, movimiento, densidad) | Nada |
| **Una página entera, con generación de imágenes** | **`impeccable`** genera tres composiciones de la pantalla entera, las guarda y las enseña juntas en una página de decisión; no escribe código hasta que se aprueba una. **`/imagegen-frontend-web`** hace una imagen por sección con variedad de composición obligada. **`/image-to-code`** dibuja primero y programa después contra lo dibujado | Generación de imágenes disponible |
| **Una marca desde cero** | **`/brandkit`** monta el tablero de identidad antes de bocetar la pieza | Generación de imágenes |

Cuando no hay generación de imágenes, `impeccable` salta su ronda de composiciones y avisa; la
ruta buena entonces es la de las tres carpetas, no quedarse sin bocetos.

**La pieza suelta dentro de una página:** cuando la página ya tiene dirección y lo que se está
decidiendo es un componente concreto, se usa `/prototype` sobre ese componente, con los tokens de
la página, sin reabrir la dirección.

## 5 · Cómo se enseñan

- **Capturas, al mismo tamaño, una pantalla completa cada una.** La misma sección en las tres
  cuando se compara una sección. Nunca miniaturas lado a lado: el aire y la escala se distorsionan
  y se juzga mal.
- **Cada una con su nombre, su eje, cuándo sería la buena y qué cuesta.** En una tabla de cuatro
  columnas. Sin recomendar ninguna salvo que David lo pida.
- **Se le pregunta tres cosas:** cuál, qué se llevaría de las otras, y qué le chirría de la
  elegida. Combinar es una respuesta válida y frecuente.
- **Si no le encaja ninguna**, no se hace una cuarta variación de las mismas: se vuelve a las
  referencias y se pregunta qué falta. Lo que falta está en su cabeza.

## 6 · Iterar

Dentro de esta fase se itera sin límite y sin avisar. Nueva terna, mezcla de dos, una cuarta en
otro eje. Lo único que se vigila es que **cada vuelta siga siendo un boceto** y no una versión
que ya duele tirar.

## 7 · Cierre

En el plan:

```
Dirección elegida (nombre y eje)
Qué se toma de las descartadas
Referencias que la sostienen (dos o tres, con qué de cada una)
Lo que David dijo que le chirría, para vigilarlo en la espina
```

Los bocetos descartados se borran, salvo que David pida guardarlos. No son documentación.

## Fallos típicos de esta fase

- **Tres tonos de lo mismo.** No hay decisión posible.
- **Pulir un boceto** porque ya gustaba. Se convierte en versión y luego cuesta reabrirlo.
- **Enseñar código, o describir con palabras.** Se enseña en captura.
- **Enseñar miniaturas.** Se juzga mal la escala.
- **Decidir yo.** La elección es de David, siempre. Recomendar solo si lo pide.
- **Saltar las referencias** por prisa. El boceto sale del defecto de la máquina.
- **Hacer una cuarta variación** cuando ninguna encaja, en vez de preguntar qué falta.
