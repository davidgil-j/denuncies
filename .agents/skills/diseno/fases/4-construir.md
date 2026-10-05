# Fase 4 · Construir

**Queda decidido al cerrar:** nada. Aquí se ejecuta la espina aprobada. Lo que no está en la
espina se resuelve con el criterio general de [criterio.md](../criterio.md); lo que sí está, no
se reabre sin decirlo.

**Termina cuando la pieza está construida y vista en captura**, a escritorio y a móvil. No
cuando compila.

---

## 1 · El orden de construcción

Se construye en este orden porque cada paso depende del anterior y porque es el orden que
permite enseñar pronto:

1. **Los tokens primero.** Si la espina creó el archivo de estilo, se escribe ahora y todo lo
   demás lo importa. Ninguna pantalla escribe un valor que exista como token.
2. **La estructura y la rejilla**, sección por sección, con el contenido real desde el
   principio. Nunca texto de relleno: el copy de la fase 1 entra desde la primera línea, porque
   la longitud real del texto es lo que decide si una caja funciona.
3. **Responsive desde la primera sección**, no al final. El móvil no es una adaptación: es la
   mitad de los lectores y, si hay iPhone en los aparatos obligatorios, es la prueba de la fase 6.
4. **Los estados de cada control**: reposo, hover, foco, pulsado, desactivado, cargando, error,
   vacío. Un componente sin sus estados está a medias.
5. **Las superficies que no dibujo yo pero se ven**: la selección de texto, el cursor de
   escritura, los anillos de foco, la barra de scroll, los números en tablas. Llevan valores del
   navegador que no pertenecen a ningún diseño; se tiñen de la paleta. Es la señal más barata de
   que una página se ha construido y no ensamblado.
6. **El efecto que manda**, insinuado, no acabado. Se remata en la fase 5.

## 2 · Enseñar pronto y a menudo

**Cada sección terminada se enseña en captura antes de pasar a la siguiente.** Escritorio y
móvil. Así una corrección de David cuesta una sección, no la página. Cuando algo se desvía de la
espina, se dice antes de que él lo vea.

## 3 · La ley 2, que se construye aquí

**Nada esencial depende de un efecto que pueda fallar.** Se aplica construyendo, no revisando:

- El HTML dice lo que tiene que decir **sin JavaScript**. El texto real existe en el documento
  aunque luego se pinte de otra forma; los lectores de pantalla y los buscadores lo encuentran.
- Un título con vídeo o textura dentro tiene debajo el título en texto normal, visible si lo
  demás no carga.
- Una sección que se revela al hacer scroll está visible por defecto y **se anima desde
  visible**; nunca se gatea su visibilidad a que una animación se dispare. Las animaciones se
  pausan en pestañas ocultas y en algunos aparatos con ahorro de energía, y entonces la sección
  no aparecería.
- Un efecto que carga recursos pesados (vídeo, tipografía) tiene su alternativa ligera.

## 4 · Por modo

**Persuadir.** La librería de bloques de `/taste-skill` da familias de sección con sus reglas de
móvil y de movimiento para no improvisar. Variedad obligada: no dos secciones seguidas con el
mismo esquema, no tres tarjetas iguales en fila, no zigzag imagen-texto tres veces. El hero cabe
en la pantalla sin hacer scroll: titular de dos líneas como mucho, subtexto corto, la acción
visible. Imágenes reales cuando el mensaje las pide; si no hay foto, se genera o se busca en
Unsplash ([recursos.md](../recursos.md)), nunca una maqueta falsa hecha de rectángulos.

**Operar.** Una familia tipográfica, escala fija, contraste de tamaños corto. Estados completos
en todo. Esqueletos al cargar, no ruedas en medio del contenido. Estados vacíos que enseñan a usar
la pantalla. Mismo vocabulario de componentes en todas las pantallas: si el botón de guardar es
distinto en dos sitios, uno está mal. Densidad cuando el usuario la necesita. Nada de secuencias
de carga: se entra en la tarea. Los desplegables escapan de su contenedor con la API de popover,
un diálogo nativo o posición fija, o quedan recortados.

**Leer.** Medida de línea de sesenta y cinco a setenta y cinco caracteres, navegación clara,
jerarquía que se recorre con los ojos. Lo demás se retira.

**Experimentar.** La obra ocupa el primer pantallazo. La interfaz aparece cuando hace falta.

## 5 · Las piezas que pueden ayudar aquí

- **`/impeccable`**, en general: carga el contexto del proyecto y el suelo de calidad
  (contraste, profundidad, espaciado, tipo, estados, superficies del navegador) y lo aplica
  mientras construye. Y sus comandos por dimensión cuando una se resiste: `layout`, `typeset`,
  `colorize`, `adapt`.
- **`/full-output-enforcement`** cuando la entrega es larga: prohíbe los huecos, los «pendiente
  de hacer» y las versiones recortadas por límite de salida.
- **`/pick-ui-library`** (a mano) para elegir la librería de un componente complejo, y el
  conector de **21st.dev** para traer piezas de interfaz reales: se busca por necesidad, se trae
  la pieza y se adapta a los tokens, nunca se pega con sus valores.
- **`/minimalist-ui`, `/high-end-visual-design`, `/industrial-brutalist-ui`**: si la dirección
  elegida en la fase 2 fue uno de esos estilos, se carga el suyo durante toda la construcción.
- **`/mobile-native`** desde el principio si hay móvil obligatorio: el hover que se queda pegado,
  la altura de pantalla que miente, el zoom al escribir en un campo, la zona del notch, el toque
  que tarda. Es más barato construirlo bien que arreglarlo en la fase 6.
- **`/apple-design`** si la espina lleva gestos, hojas deslizantes o materiales translúcidos.

## 6 · Cierre

Construido, con capturas de cada sección a escritorio y a móvil, y con la lista de lo que se
desvió de la espina (si algo). El plan no cambia en esta fase salvo que se haya reabierto algo.

## Fallos típicos de esta fase

- **Texto de relleno.** La longitud real es lo que decide si el diseño funciona.
- **El móvil al final.** Se hace desde la primera sección.
- **Escribir un valor a mano** cuando existe un token. Es la causa de que dos pantallas no casen.
- **Estados a medias.** Un botón sin foco ni desactivado no está hecho.
- **Enseñar todo al final.** Una corrección cuesta la página entera.
- **Gatear la visibilidad a una animación.** Si la animación no salta, la sección no existe.
- **Una maqueta de producto hecha de rectángulos** en el hero. Es el tic más reconocible de una
  página hecha por máquina.
- **Pegar un componente de 21st.dev con sus colores.** Se adapta a los tokens o no entra.
