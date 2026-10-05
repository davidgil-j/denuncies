# De dónde sale cada cosa

**La columna que importa es la última.** Hay sitios donde yo entro, busco y traigo el archivo;
sitios donde el trabajo es mirar y elegir, que es de David; y sitios donde puedo hacer las dos
cosas: traerle capturas para que elija sin salir del chat.

> En los sitios de "mira David", **mi trabajo es mandarle enlaces concretos con qué mirar en cada
> uno, no elegir por él.** El método entero de referencias está en [referencias.md](referencias.md).

---

## Letras

| Sitio | Qué tiene | Quién |
|---|---|---|
| **Fontshare** · fontshare.com | Tipografías de calidad, gratis para uso comercial, con carácter | **Yo.** Descargo los archivos y los pruebo con el titular real |
| **Google Fonts** · fonts.google.com | El catálogo de siempre | **Yo.** Como reserva o cuando la marca ya las usa; nunca como elección por defecto |

**Cómo se eligen.** Dos o tres pares candidatos, emparejados por contraste (una con serifa y una
sin, o geométrica con humanista), probados con el titular real y enseñados a David en captura. En
Operar, una sola familia en varios pesos suele ser lo correcto.

**Cómo se sirven.** Descargadas e incrustadas o alojadas con la pieza. Nunca enlazadas a un
servicio externo: un bloqueador o una red corporativa las corta y la página cambia de letra sin
avisar. En un artefacto publicado, además, solo cargan hojas de estilo de Google; las demás hay
que incrustarlas.

## 🖼️ La imagen como material, no como relleno

Es de las cosas que más separan una pieza viva de una plana, y la que más se deja para el final.
**Una textura de fondo y una fotografía elegida con criterio hacen más por una página que
cualquier efecto**, y las dos son baratas.

### Las texturas sirven de fondo, no de adorno

Una textura detrás de una sección le da cuerpo sin competir con nada: grano, papel, tinta, luz,
metal. Puesta al diez o al quince por ciento de opacidad, no se ve, **se nota**. Es lo que hace
que un fondo plano deje de parecer un vacío.

| Sitio | Qué tiene | Quién |
|---|---|---|
| **Texturelabs** · texturelabs.org | Grano, papel, tinta, luz, metal, químicos. Gratis, y de calidad alta | **Yo.** Descargo y pruebo sobre el boceto |

Reglas para que sume y no estorbe: **una sola textura por pieza**, teñida de la paleta y no en su
color original, y sin que llegue a molestar la lectura del texto que tenga encima. Se mide el
contraste después de ponerla, no antes.

### Las fotos, con sentido

Una fotografía que dice algo del mundo del cliente vale más que diez de personas sonriendo delante
de un portátil. **Elegir la foto es una decisión de mensaje, no de decoración**, y por eso se
piensa en la fase 1 y se busca en la 3.

| Sitio | Qué tiene | Quién |
|---|---|---|
| **Unsplash** · unsplash.com | Fotografía libre de calidad alta, buscable por tema y por tono | **Yo**, si David dice el tema. Se enlaza a la imagen concreta, nunca a una dirección que pueda romperse |

Lo que se busca: el sitio real donde pasa el trabajo, el material del que está hecho el producto,
la escena que el lector reconoce. Lo que no: gente genérica, manos sobre teclados, gráficos que no
son de nadie.

### 🎬 Y a una imagen quieta se le puede dar movimiento

`[David, 2026-09-20]` Esta es la palanca que menos se usa y más rinde. Tres niveles, del más
barato al más caro. **Se empieza siempre por el primero.**

| Nivel | Qué es | Qué cuesta |
|---|---|---|
| **1 · Movimiento con código** | La imagen no cambia: se mueve. Una textura que se desplaza muy despacio en bucle, una foto con paralaje al bajar, una escala mínima que respira | Nada. Un archivo y unas líneas. **Es lo que hay que agotar antes de pasar al 2** |
| **2 · Vídeo generado a partir de una imagen** | Una textura o una foto que se convierte en unos segundos de vídeo en bucle. Se genera desde una imagen fija que ya gustó, así que no se pierde la dirección | Un servicio de generación y **peso de descarga**. Se mide |
| **3 · Vídeo generado como firma** | El efecto que manda es el propio vídeo | Lo anterior más el tiempo de acertar con el material |

**Dos límites que no se negocian:**

- **La ley 2.** Si el vídeo no carga, la pieza se ve y se lee igual. La imagen fija de la que
  salió el vídeo es su propio respaldo: se deja puesta debajo.
- **El peso, medido en la fase 6.** Un fondo en movimiento se puede comer un móvil con mala
  conexión, que es justo donde más gente lo abre. Si pesa, se baja a nivel 1.

## ⭐ Generar imagen y vídeo: la palanca de Gemini

`[HECHO, David, 2026-09-20]` **David tiene Gemini y lo puede usar cuando haga falta.** Esto no es
una posibilidad lejana: es una herramienta disponible, y **cambia lo que se puede hacer en cuatro
fases distintas**. Hay que proponerlo activamente, no esperar a que él se acuerde.

### Para qué sirve, en concreto

| Qué | En qué fase | Qué resuelve |
|---|---|---|
| **Crear imágenes que no existen** | 2 · 3 · 4 | La foto que el mensaje necesita y no está en ningún banco: el sitio exacto, el objeto exacto, la escena exacta |
| **Animar una imagen fija** | 5 | Una textura o una fotografía que ya gustó, convertida en unos segundos de vídeo en bucle. **La dirección no se pierde porque se parte de la imagen aprobada** |
| **Juntar y componer texturas** | 3 · 4 | Fundir dos materiales, teñir una textura de la paleta, generar una variante del mismo grano para otra sección |
| **Bocetos de pantalla entera** | 2 | Las tres composiciones de `impeccable`, `/imagegen-frontend-web` (una imagen por sección) y `/image-to-code` (dibujar antes de programar) |
| **Tableros de identidad** | 1 · 2 | `/brandkit`, cuando el cliente no tiene marca documentada |

### Las dos vías, y las dos valen

| Vía | Cómo funciona | Cuándo |
|---|---|---|
| **🖐️ David la fuerza** | Él genera en la aplicación de Gemini con el texto que yo le paso, y me deja el archivo en la carpeta del proyecto | **Siempre disponible, sin clave y sin coste extra.** Es la vía por defecto |
| **🔌 Automática** | Una clave de programación, y las piezas que la necesitan la usan solas | Más cómoda para muchas imágenes seguidas. `(?)` Falta comprobar si generar con esa clave cuesta dinero: **se prueba con una imagen antes de montar una fase encima** |

**Cómo se usa la vía manual, que es la que hay hoy:** yo escribo el texto de generación completo
y afinado, se lo paso, él lo genera y me devuelve el archivo. Mi trabajo es que ese texto sea
bueno: qué se ve, en qué encuadre, con qué luz, con qué paleta, qué NO tiene que salir. Un texto
vago devuelve una imagen genérica y se pierde el viaje.

> 🚫 **Lo que no cambia aunque haya generación.** La ley 2 sigue: si el vídeo no carga, la pieza
> se lee igual, y la imagen fija de la que salió se queda debajo como respaldo. Y el peso se mide
> en la fase 6, porque un fondo en movimiento es lo que mata un móvil con mala conexión.

## Piezas de interfaz

### 🥇 21st.dev es el primero, siempre

`[ACORDADO de David, 2026-09-20]` *«21st.dev debería ser 100 % prioritaria.»* **Antes de
construir a mano cualquier pieza de interfaz, se busca ahí.** Y no es solo un catálogo: **está
conectado como herramienta, así que busco dentro y traigo la pieza**, sin que David tenga que
abrir nada.

Cómo se usa bien:

1. **Se busca por la necesidad, no por el nombre.** *«Tarjeta de precio con tres planes y uno
   destacado»*, *«fondo con partículas suaves»*, *«menú que se despliega desde el botón»*.
2. **Se busca antes de escribir, no después de atascarse.** Construir a mano algo que ya existe
   resuelto, con sus estados y su movimiento, es tirar horas.
3. **Dos o tres candidatas a David en captura** cuando la decisión es de gusto. Si es de función,
   elijo yo.
4. **Se adapta a los tokens** del proyecto y **se pasa por la fase 5**, porque casi todas traen
   movimiento de serie que no cumple el criterio.

| Sitio | Qué tiene | Quién |
|---|---|---|
| 🥇 **21st.dev** · 21st.dev | Miles de componentes reales: menús, tarjetas, fondos, efectos, formularios | **Yo.** Conectado como herramienta. **Primera parada siempre** |
| **Watermelon UI** · ui.watermelon.sh | Más de 600 componentes libres sobre Tailwind 4, Radix y una librería de movimiento, con animaciones, bloques, **paneles enteros y plantillas de página completa** | **Los dos.** No sustituye a 21st: **lo complementa donde 21st es más flojo**, que es el modo Operar. Para un panel, la segunda parada |
| **Skiper UI** · skiper-ui.com | Componentes con el movimiento ya resuelto, y pantallas de carga | **Los dos.** ⭐ Referencia de David. Se copia el criterio de movimiento, no el código |
| **`/pick-ui-library`** | Qué librería usar para cada cosa (números, gráficos, tablas grandes, menús de comandos, avisos, arrastre), sin menú de opciones | **Yo.** Hay que llamarla a mano |

**Regla de las piezas traídas:** se adaptan a los tokens del proyecto (colores, radios,
tipografía, curvas) y pasan la fase 5 como cualquier otra cosa. Nunca se pegan con sus valores.

## Inspiración

Aquí no elijo yo. Traigo tres enlaces con qué mirar en cada uno, y capturas cuando el sitio se
deja. La lista completa, con para qué va bien cada uno, está en [referencias.md](referencias.md).
Los que más se usan: **Awwwards** para el nivel de agencia, **el repositorio de Jack Roberts**
(design-inspo-bay.vercel.app) para empezar cuando no se sabe por dónde, **Godly** y **Siteinspire**
para firmas y soluciones concretas, **Mobbin** y **Refero** para pantallas de producto.

## Vídeo

| Herramienta | Qué hace | Quién |
|---|---|---|
| **`/youtube`** | Saca la transcripción y la ficha de un vídeo de YouTube | **Yo.** David manda el enlace |
| **ffmpeg** | Parte un vídeo grabado (un móvil enseñando un fallo) en fotogramas que sí puedo mirar | **Yo.** David manda el archivo |

Yo no veo vídeo ni oigo audio. Lo que hago es leer subtítulos y mirar fotogramas. Si el audio
importa y no hay subtítulos, se le pide a David que lo cuente escrito.

## Las marcas ya medidas en este repositorio

Cada una tiene su ficha en su carpeta de marca, hecha con el método de [marca.md](marca.md). Se
lee la ficha antes de tocar nada de esa marca; **si la ficha dice que falta confirmar algo, se
confirma antes de construir**, no después.

| Marca | Dónde |
|---|---|
| Reportia y ReportIA | `02-empresas/reportia/marca/` (con un sistema de diseño publicado y sus tipografías) |
| Los clientes de Reportia | `02-empresas/reportia/clientes/<cliente>/marca/` |
| Vanster Design | `02-empresas/vanster-design/marca/` |
| Expats Adviser | `02-empresas/expats-adviser/marca/` |

Fuera de este repositorio, la carpeta de marca del proyecto que sea, o se hace con marca.md.
