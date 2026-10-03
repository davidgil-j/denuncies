# Fase 0 · La entrevista

**Queda decidido al cerrar:** qué es esto, para quién, en qué modo, en qué aparatos tiene que
funcionar, y **qué partes vienen ya trabajadas**.

**Dura:** diez minutos. Si dura más, estoy preguntando lo que debería haber mirado.

---

## 1 · Antes de preguntar nada, mirar

Todo lo que se pueda saber sin David se sabe antes de abrir la boca. La entrevista se hace
**después** de esto, y solo sobre lo que falte.

| Qué busco | Dónde |
|---|---|
| La ficha de marca del cliente o de la empresa | La carpeta de marca del proyecto. En este repositorio, `02-empresas/<empresa>/marca/` o `clientes/<cliente>/marca/`. Si no existe, se hace: [marca.md](../marca.md) |
| El perfil del cliente: qué hace, quién decide, qué le duele | Su ficha en el repositorio, sus reuniones, lo que ya se ha escrito de él |
| Su web actual | Se abre con el navegador y se mira entera. Es referencia de **qué es** el cliente, no autoridad sobre cómo tiene que quedar lo nuevo |
| Código existente, si lo hay | El archivo de estilo con los tokens, dos pantallas representativas, cómo se ha hecho el movimiento. Se anota qué idioma visual ya existe y si las pantallas lo respetan |
| Contenido ya escrito | Manuales, copys, guiones. Se lee entero antes de la fase 1 |
| Vídeos o charlas de referencia | Se sacan con `/youtube` y se leen |

Al terminar, tengo una lectura. Se dice en una línea antes de la primera pregunta, para que
David corrija en vez de rellenar: *«Lo leo como una landing de captación para un administrador
que no le da vueltas a las cosas, en modo Persuadir, con la marca del cliente medida de su web.
¿Corrijo algo?»*

### 🔴 Y se abre la caja de referencias, aquí, no en la fase 2

**La recolección empieza el primer día**, aunque la elección sea después. En la ronda 1 se le
piden a David **dos o tres cosas concretas que le gusten y qué de cada una**, y yo salgo a buscar
por mi cuenta. Llegar a los bocetos con la caja vacía es lo que produce el reflejo de la máquina:
portada centrada, tres tarjetas iguales, la misma entrada en cada sección.

El método entero, con los sitios y cómo se extrae el recurso de cada uno, está en
[referencias.md](../referencias.md).

## 2 · El modo, que se elige por la pantalla

Es la primera decisión y condiciona todo el criterio de después. **Se elige por la pantalla que
vamos a hacer, no por el producto.** La landing de una herramienta es Persuadir; la documentación
de una marca de lujo es Leer.

| Modo | El visitante… | Lo que manda |
|---|---|---|
| **Persuadir** | Decide y actúa. Landing, campaña, precios, propuesta | El diseño es el producto. Ganar atención y una acción. Imágenes reales cuando el mensaje las necesita |
| **Operar** | Completa una tarea. Gestor, panel, editor, herramienta interna | Escaneabilidad, consistencia, que todo se comporte igual. La marca vive en el detalle, no en el gesto |
| **Leer** | Entiende algo. Documentación, guía, artículo | Estructura para comprender, y que quedarse leyendo compense |
| **Experimentar** | Está dentro de la obra. Portfolio, galería | La obra manda desde el primer pantallazo; la interfaz se retira |

En Operar, el listón es distinto y está descrito en [criterio.md](../criterio.md): una familia
tipográfica suele bastar, escala fija en vez de fluida, estados completos en cada control, nada
de secuencias de carga. Lo que hace bueno un panel es que desaparece dentro de la tarea.

## 3 · La entrevista, en rondas cortas

**Dos o tres preguntas por ronda, con opciones, y se espera.** Una ronda es lo normal; la segunda
solo si las respuestas abren un hueco material. Nunca un cuestionario de diez. Nunca convertir lo
obvio en un menú: se afirma la lectura y se invita a corregir.

### Ronda 1 · Propósito, lector y lo que ya viene hecho

Se eligen las dos o tres que más cambian el resultado:

- **¿Qué tiene que pasarle por la cabeza a quien lo abre, y qué tiene que hacer al terminar?**
  Una acción, una creencia. Si son varias, se pide la primera.
- **¿Quién es exactamente, y en qué estado llega?** Un administrador con prisa que decide en
  dos minutos no es un equipo técnico que lo va a leer entero. El lector elige la estética, no
  el gusto de nadie.
- **¿Qué viene ya trabajado?** Se pregunta por partes, porque son independientes:
  - el **contenido** (qué se dice): ¿existe y está decidido, existe a medias, o hay que
    construirlo?
  - la **marca** (colores, letras, logotipo): ¿hay ficha, hay web de la que medirla, o no hay nada?
  - la **dirección visual** (cómo tiene que sentirse): ¿hay referencias, hay algo anterior que
    gustó, o está en blanco?
  - el **código**: ¿hay pantallas hechas que hay que respetar?

  Lo que viene trabajado **se lee y se confirma**, no se vuelve a preguntar en su fase.

### Ronda 2 · Aparatos, material y límites

Solo para lo que siga abierto:

- **¿En qué aparatos y navegadores tiene que funcionar, sin excusa?** Si la respuesta incluye un
  iPhone, se apunta en el plan como obligatorio y la fase 6 lo comprueba en un iPhone. Lo que no
  se pregunta aquí se descubre después de publicar.
- **¿Qué material real hay?** Fotos, logotipos, cifras, testimonios, documentos. Y qué rangos:
  una landing con dos casos reales no se diseña igual que una con veinte.
- **¿Qué no se puede tocar?** Y qué haría que el resultado se sintiera mal aunque estuviera
  pulido.
- **¿Qué límites hay?** Plazo, idioma o idiomas, accesibilidad exigida, plataforma de publicación,
  presupuesto de peso de página.

**Nunca se pregunta por valores de CSS ni por estilos con nombre.** Eso se decide viendo, en la
fase 2, y se cierra en la 3.

## 4 · Cuando la pieza ya existe: rediseño o revisión

Si hay algo construido, la entrevista cambia de forma. Lo primero es un diagnóstico, no una
pregunta:

1. Se leen los tokens y dos o tres pantallas. Se comprueba si las pantallas **usan** el archivo
   de estilo o escriben sus valores a mano: es la causa más frecuente de que dos pantallas del
   mismo producto no casen.
2. Se hace una auditoría corta: tipografía, color y superficies, layout, estados, contenido,
   componentes, iconos. `/redesign-existing-projects` trae exactamente esa auditoría y un orden
   de arreglo por impacto; `/impeccable critique` da la revisión de UX con puntuación. Se usa
   una u otra según lo que David quiera: mejorar lo que hay, o saber qué falla sin tocarlo.
3. Se decide con David si es **rediseño** (se sustituye el mundo visual, se conserva el
   producto) o **refinamiento** (se conserva la identidad y se arregla lo que falla). No se
   mezclan: pulir un aspecto que se va a descartar es trabajo perdido.

## 5 · Las piezas que pueden ayudar aquí

- **`/impeccable shape`** hace esta entrevista con más disciplina que yo a mano: rondas cortas,
  opciones, afirma y confirma, y devuelve un resumen sin código. Si está instalada, se usa; si
  no, esta fase la sustituye.
- **`/impeccable init`** escribe un archivo de contexto de producto que sobrevive al chat. Tiene
  sentido en un proyecto que va a durar meses con muchas pantallas. En una landing suelta va
  contra la regla del archivo único: el contexto cabe en el plan.
- **`/redesign-existing-projects`** y **`/impeccable critique`**, para el punto 4.
- **`/youtube`**, si David manda vídeos como referencia o como material.

## 6 · Cierre

La fase cierra cuando el plan tiene escrita su primera parte, cinco o seis líneas:

```
Qué es · Para quién · Modo · Éxito (una frase)
Aparatos obligatorios
Viene trabajado: contenido [sí/parcial/no] · marca [ficha/web/nada] · dirección [refs/anterior/blanco] · código [sí/no]
```

Y David ha dicho que la lectura es correcta.

## Fallos típicos de esta fase

- **Preguntar lo que estaba en el repositorio o en la web.** Se nota como pereza y lo es.
- **Suponer que el diseño está decidido porque el contenido lo está.** Son fases distintas.
- **Un cuestionario largo de golpe.** David contesta bien a dos preguntas con opciones y mal a
  diez abiertas.
- **No preguntar por el móvil.** Es la pregunta que más cara sale cuando se olvida.
- **Elegir el modo por el producto y no por la pantalla.** Una herramienta también tiene landing.
