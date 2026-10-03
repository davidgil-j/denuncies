# Fase 5 · El movimiento

**Queda decidido al cerrar:** cómo se siente la pieza al tocarla, con cada animación
justificada, y **aprobada por el revisor de animaciones**.

**Solo sobre algo construido.** Animar antes de la fase 4 es decorar humo. Y aquí manda un
criterio concreto, el de Emil Kowalski: sus curvas y duraciones salen de su curso y de librerías
que están en producción en miles de sitios, no de un promedio. Cuando `impeccable` y Emil
discrepan en movimiento, gana Emil.

---

## 1 · El inventario

Antes de tocar nada, se lista **qué se mueve y por qué**. Dos herramientas hacen ese inventario
mejor que a mano:

- **`/find-animation-opportunities`** recorre la pieza y propone dónde faltaría movimiento, con
  valores exactos, y también **qué no debe animarse**. Solo propone, no toca.
- **`/improve-animations`** cuando ya hay mucho movimiento escrito sin criterio (un rediseño, un
  producto que creció): audita el código entero como un asesor y deja un plan ordenado por
  prioridad que se ejecuta después. Solo planifica, no aplica.

Del inventario sale una lista corta: **la firma** (el efecto que manda, decidido en la espina)
y **el coro** (lo que la acompaña). La firma recibe el presupuesto de tiempo; el coro se
resuelve con recetas.

## 2 · Cada animación pasa el marco de decisión, en este orden

El orden importa porque cada pregunta puede terminar el proceso:

1. **¿Debe animarse siquiera?** Se mira la frecuencia. Lo que se dispara con teclado o cien
   veces al día **no se anima**: un menú de comandos, un cambio de pestaña en una herramienta.
   Lo que se ve decenas de veces se anima poco. Lo ocasional, normal. Lo raro o la primera vez
   puede llevar deleite.
2. **¿Para qué?** Consistencia espacial (de dónde viene, a dónde va), indicar estado, dar
   respuesta a una acción, explicar un cambio, evitar un salto brusco. Si la respuesta es
   «queda bonito» en algo frecuente, se quita.
3. **¿Con qué herramienta más barata?** Una transición de CSS antes que una librería. Las
   transiciones se interrumpen bien: si dos avisos salen seguidos, el segundo no reinicia desde
   cero. Los fotogramas clave no se interrumpen; se reservan para lo que no se dispara dos veces.
4. **¿Qué propiedades?** Solo transformación y opacidad. Animar anchura, altura, márgenes o
   posición obliga al navegador a recalcular la página y se nota como tirón. Desenfoque,
   recorte y máscara valen cuando se mantienen fluidos.
5. **¿Qué curva y cuánto dura?** De tabla, no aproximado. Salida rápida en lo que entra y en lo
   que responde; nunca curva de entrada en interfaz, porque retrasa justo el momento que el
   usuario mira. Interfaz por debajo de trescientos milisegundos; en Operar, entre ciento
   cincuenta y doscientos cincuenta. Las curvas de serie del navegador son flojas: se usan
   curvas propias fuertes.
6. **¿Cómo se interrumpe y cómo sale?** Lo deliberado (una pulsación mantenida, un borrado)
   va más lento; la respuesta del sistema, seca. Tiempos simétricos en una pulsación son un fallo.
7. **¿Y sin movimiento?** Se respeta la preferencia de movimiento reducido: se quita el
   desplazamiento y se conserva el fundido, no se deja todo a cero. El hover se limita a los
   aparatos con puntero fino: en táctil, un toque dispara hover falsos.

## 2 bis · Parada de referencias, la tercera

🔴 **El movimiento también se mira antes de escribirlo**, y es donde más se nota la diferencia
entre copiar una curva de una tabla y haber visto cómo se siente.

- **La firma se busca en piezas reales**, no se imagina. Si la espina dice que el efecto que manda
  es el titular que se descubre, se miran tres páginas que hagan algo parecido y se mira **a qué
  velocidad**, desde dónde entra y qué hace el resto mientras tanto.
- **Los componentes corrientes se miran en producto**: cómo abre su menú una herramienta buena,
  cómo entra su aviso, qué hace su botón al pulsarlo. Los sitios de pantallas reales de
  [referencias.md](../referencias.md) sirven justo para esto.
- **Si David describe un efecto y no sabe cómo se llama**, `/animation-vocabulary` le da el nombre
  exacto. Con el nombre, buscar referencias deja de ser adivinar.

## 3 · Las reglas que más se repiten

1. **Nunca se entra desde la nada.** Desde una escala de 0,95 y opacidad, no desde cero.
2. **Lo que se abre crece desde donde se pulsó.** Un desplegable nace en su botón; solo los
   diálogos centrados nacen del centro.
3. **Nunca `transition: all`.** Se nombra la propiedad exacta.
4. **El botón responde al dedo.** Un encogimiento leve al pulsar.
5. **El aviso que vuelve no repite la espera.** El segundo tooltip sale al instante.
6. **Un desenfoque tapa una transición imperfecta** mejor que un fundido seco.
7. **Un solo idioma de movimiento** en toda la pieza: el fijado en la espina. Curvas con
   duración o muelles, no las dos mezcladas.

## 4 · Por modo

**Persuadir.** Una firma autorizada y el resto en calma. Animaciones ligadas al scroll con CSS
antes que con JavaScript, y siempre desde un estado ya visible. No una entrada idéntica en cada
sección: eso es un reflejo, no una decisión. La página no escucha el evento de scroll a mano.

**Operar.** Ciento cincuenta a doscientos cincuenta milisegundos. El movimiento transmite estado,
no decora. Sin secuencias de carga: se entra en la tarea. Lo frecuente no se mueve.

## 4 bis · Si la espina dijo que hay imagen, se le da movimiento

`[David, 2026-09-20]` Es lo que más rinde por lo poco que cuesta, y lo que más se olvida. Una
textura de fondo que se desplaza muy despacio, una fotografía con paralaje al bajar, una escala
mínima que respira: la pieza deja de parecer una lámina.

**Se agota siempre el movimiento con código sobre la imagen fija antes de pasar a vídeo
generado.** Es gratis, no pesa y no puede fallar. Los tres niveles, con sus límites de peso y la
regla de que la imagen fija se queda debajo como respaldo, están en [recursos.md](../recursos.md).

Y pasa el mismo marco que todo lo demás: un fondo que se mueve **se ve todo el rato**, así que va
muy lento y muy sutil, o cansa. Si compite con el efecto que manda, se quita.

## 5 · Las piezas que pueden ayudar aquí

- **`/animate`** construye una animación siguiendo exactamente el marco del punto 2 y escribe la
  implementación, con un resumen de qué decidió y por qué. Trae recetas para botones,
  desplegables, tooltips, diálogos, hojas, avisos, acordeones y escalonados.
- **`/emil-design-eng`** es el criterio de fondo entero: se carga cuando hace falta razonar un
  caso que no está en las recetas.
- **`/apple-design`** cuando la pieza lleva gestos, arrastre, muelles o materiales físicos.
- **`/animation-vocabulary`** cuando David describe un efecto sin saber cómo se llama: le da el
  nombre exacto para pedirlo bien la próxima vez.
- **`/review-animations`** cierra la fase: revisa contra diez normas y termina en aprobado o
  bloqueado. Por defecto bloquea. Hay que llamarla a mano.

## 6 · Cierre

Se pasa **`/review-animations`** y se obtiene aprobado. Su salida es una tabla de hallazgos
(antes, después, por qué) y un veredicto. Con bloqueado, se aplica su jerarquía de remedio en
orden: quitar, reducir, arreglar la curva, arreglar el origen, hacer interrumpible, mover a
transformación y opacidad, asimetría de tiempos, pulir, accesibilidad. Y se vuelve a pasar.

Cuando está aprobado, el plan anota la firma y las reglas de movimiento que se usaron, en tres
líneas.

## Fallos típicos de esta fase

- **Animar lo que se usa cien veces al día.** Se quita.
- **Curva de entrada en interfaz.** Sale pesado.
- **Fotogramas clave en algo que se dispara dos veces seguidas.** Se reinicia y se nota.
- **Animar anchura o posición.** Tirón en móvil.
- **La misma entrada en cada sección.** Reflejo, no diseño.
- **Mezclar muelles con curvas fijas.** Dos gramáticas.
- **Olvidar la preferencia de movimiento reducido.** Bloquea la revisión.
- **Dar por buena una animación sin pasar el revisor.** El revisor está para eso.
