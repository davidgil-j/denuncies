# Fase 6 · El repaso

**Queda decidido al cerrar:** que la pieza cumple las tres leyes y se ha medido contra todas las
comprobaciones, con un veredicto escrito.

**Bloquea.** No se publica con un fallo de ley abierto. Con un fallo de comprobación, David puede
decidir asumirlo, y **eso sí se anota en el plan** en una línea con el motivo: es la única
excepción a la regla de no llevar historial.

---

## 1 · El orden, porque importa

Se revisa de lo más grave a lo más fino. Un problema de ley invalida el resto del repaso hasta
que se arregla.

| Orden | Qué | Cómo |
|---|---|---|
| 1 | **Ley 1 · Cero morralla en el texto** | Se lee todo el texto visible, a mano, contra la lista de [criterio.md](../criterio.md). `/slopmonster` ayuda en inglés; en castellano su nota no vale y se aplica su anexo `ES-castellano.md` leído |
| 2 | **Ley 2 · Nada esencial depende de un efecto** | Se abre la pieza con JavaScript desactivado y con el vídeo bloqueado. Se lee igual, se navega igual. Se prueba con la preferencia de movimiento reducido activada |
| 3 | **Ley 3 · El aparato real** | Captura de verdad de cada aparato obligatorio de la fase 0. Si no se puede acceder al aparato, se instrumenta (punto 4) y se le pide la captura a David |
| 4 | **Accesibilidad, rendimiento, responsive** | `/impeccable audit`: contraste, foco, orden de teclado, peso, tiempos de carga, comportamiento a cada anchura. Con números |
| 5 | **UX y jerarquía** | `/impeccable critique`: qué falla de diseño, con puntuación, sin tocar nada |
| 6 | **El suelo de calidad** | Contraste de 4,5:1 en cuerpo y 3:1 en texto grande; sombras con desplazamiento y desenfoque; grupos apretados y separaciones generosas; más aire encima de un titular que debajo; medida de línea; techo del titular; estados de cada control; superficies del navegador teñidas; el copy con el lenguaje del producto; todo lo del plan presente y encontrable en segundos |
| 7 | **El móvil como aparato, no como anchura** | `/mobile-native`: hover pegado tras el toque, destello al tocar, altura de pantalla que miente, zoom al escribir, toque lento, tirar para refrescar que roba el scroll, contenido bajo el notch, pulsación larga que selecciona texto de botón, carrusel que hace scroll vertical, barra de estado descoordinada |
| 8 | **El movimiento** | `/review-animations`, si no se pasó al cerrar la fase 5 o si algo cambió después |
| 9 | **Las comprobaciones de David** | Se miden y se le cuentan, una por una: rejilla, márgenes, simetría, aire, texto que llena su caja, tokens que mandan, un solo idioma de movimiento, un solo efecto que manda, color de marca por superficie. Lista y método en criterio |
| 10 | **El revisor de acabado** | `impeccable` puede llamar a su agente revisor, que compara lo construido contra la dirección aprobada y devuelve la lista de lo que falla. Lo valioso es que **no es quien construyó**: no defiende su propio trabajo |

## 2 · Cómo se presenta

Una sola tabla, con tres columnas: **antes, después, por qué**. Una fila por hallazgo. Debajo,
el veredicto: **aprobado** o **bloqueado**, y si es bloqueado, qué lo bloquea y qué cuesta
arreglarlo.

Nada de listas de "antes:" y "después:" en líneas sueltas. Nada de recomendaciones sin hallazgo.

## 3 · La salida cuando David quiere dejar pasar algo

Solo para comprobaciones, nunca para leyes. David dice que lo asume, y en el plan queda:

```
Asumido: <qué> · <por qué> · <fase en que se decidió>
```

Así no pelea con su propia herramienta y queda rastro de cada excepción. Si las excepciones se
acumulan, es señal de que la comprobación está mal calibrada, no de que David esté equivocado, y
se revisa la comprobación en [criterio.md](../criterio.md).

## 4 · Cuando algo "se ve mal" y no lo reproduzco

Regla dura: **se instrumenta, no se razona.** Deducir por qué debería verse bien en un aparato
que no tengo delante tiene un límite de dos intentos. Después:

1. Se añade a la pieza un cuadro de diagnóstico que solo aparece con un parámetro en la
   dirección (por ejemplo `?diag=1`): tamaño de pantalla y densidad, estado del vídeo o del
   recurso que falla, cuadros por segundo, tamaño real de lo que se dibuja, batería, errores.
2. Se le pide a David que abra esa dirección en el aparato y mande una captura.
3. Se arregla lo que dicen los números. Un cambio, una comprobación.

El cuadro se queda en el código detrás del parámetro: no molesta y sirve la próxima vez.

## 5 · Cierre

Veredicto aprobado, o bloqueado con la lista de arreglos hechos y vuelto a pasar hasta aprobado.
Las excepciones asumidas, anotadas. Las capturas de los aparatos obligatorios, vistas.

## Fallos típicos de esta fase

- **Revisar el detalle antes que las leyes.** Se pule algo que luego no pasa.
- **Fiarse de la nota de slopmonster en castellano.** Mide inglés.
- **Dar por probado el móvil con una anchura de navegador.** Un iPhone no es una anchura.
- **Razonar sobre un fallo que no se reproduce.** Dos intentos y se instrumenta.
- **Presentar recomendaciones sin hallazgos.** La tabla lleva antes y después.
- **Dejar pasar un fallo de ley porque hay prisa.** Las leyes no tienen salida.
- **No anotar lo asumido.** Sin rastro, la próxima sesión lo reabre.
