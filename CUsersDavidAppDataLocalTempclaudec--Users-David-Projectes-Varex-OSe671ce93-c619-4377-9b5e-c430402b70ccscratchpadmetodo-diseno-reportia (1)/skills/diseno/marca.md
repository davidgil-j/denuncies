# Medir una marca

Cuando el cliente o la empresa **no tiene ficha de marca**, no se adivina y no se inventa: se
mide de lo que exista y se documenta en una ficha con lo medido, lo que falta y a quién hay que
preguntárselo.

**Dónde vive la ficha.** En la carpeta de marca del proyecto. En este repositorio, en
`02-empresas/<empresa>/marca/LEEME.md` o en `clientes/<cliente>/marca/LEEME.md`. En otro
repositorio, donde el proyecto guarde su identidad. Una ficha, un sitio.

---

## 1 · Lo primero: buscar si ya existe

Antes de medir nada, se busca una ficha, un manual de marca, un archivo de tokens en el código o
un sistema de diseño publicado. Si existe, **manda** y esta guía no hace falta. Si existe a
medias (un logotipo suelto, un color en el código con el comentario "oficial"), se parte de ahí
y se completa.

## 2 · De dónde se mide

| Fuente | Qué da | Cómo |
|---|---|---|
| **Su web** | Colores, tipografías, tono, cómo usan el logotipo, si tienen movimiento | Se abre con el navegador y se mide (punto 3). Es la fuente más frecuente |
| **Su logotipo** | La forma, el color de tinta, si es vectorial, si lleva claim | Se descarga la versión más grande y vectorial que exista. Si el servidor bloquea la descarga directa, se baja desde el navegador |
| **Sus documentos** | Presentaciones, propuestas, papelería | A veces son más fieles a la marca que la web, que la hizo un tercero |
| **Su hoja de estilos** | Los valores exactos, sin redondeos | Si la web los expone, se leen de ahí |

## 3 · Medir el color por superficie, nunca contando elementos

**El error que hay que evitar** es contar cuántos elementos del código usan cada color. Una
portada bañada de un color cuenta como un elemento; setenta textos pequeños de otro color cuentan
setenta. Sale el color equivocado, y sale con precisión, que es lo peor.

**Lo correcto es medir cuánta pantalla ocupa cada color**, recorriendo la página entera, y
**confirmarlo mirando una captura**. El método:

1. Se abre la web a un tamaño de escritorio normal y se hace una captura del primer pantallazo.
   Se mira. Si el color de marca no es evidente a simple vista, ya hay una pista.
2. Se recorre la página entera por tramos y, en cada tramo, se muestrea en rejilla **qué color
   pinta de verdad cada punto de la pantalla**, subiendo por los elementos hasta el que tiene
   fondo. Un fondo con imagen cuenta como imagen.
3. Se suman las muestras por color y se ordenan por porcentaje de superficie.
4. Se cruza con la captura: el color que domina en la captura tiene que dominar en la medida. Si
   no coinciden, la medida está mal, no los ojos.

El muestreo, para no reescribirlo cada vez (se ejecuta en la página con el navegador):

```js
async () => {
  const cuenta = {}; let total = 0;
  const alto = Math.min(document.documentElement.scrollHeight, 12000);
  for (let y = 0; y < alto; y += 700) {
    window.scrollTo(0, y); await new Promise(r => setTimeout(r, 800));
    for (let px = 20; px < innerWidth; px += 40) for (let py = 20; py < innerHeight; py += 40) {
      let n = document.elementFromPoint(px, py), fondo = 'transparente';
      while (n && n !== document.documentElement) {
        const s = getComputedStyle(n);
        if (s.backgroundImage !== 'none' && /url\(/.test(s.backgroundImage)) { fondo = 'IMAGEN'; break; }
        if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') { fondo = s.backgroundColor; break; }
        n = n.parentElement;
      }
      cuenta[fondo] = (cuenta[fondo] || 0) + 1; total++;
    }
  }
  return Object.entries(cuenta).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([c, n]) => [c, (n / total * 100).toFixed(1) + ' %']);
}
```

Da el fondo, el color de marca y su porcentaje. Un color pintado con transparencia sobre blanco
se anota tal cual, con la advertencia de que el valor puro de la marca puede ser otro.

## 4 · Las tipografías

Se leen de los estilos calculados de titulares, párrafos y enlaces. Se anota cuál es de cuerpo y
cuál de titulares. Si son tipografías de Google muy comunes, se anota también: es una señal de
que la web la hizo un constructor y **el listón de la web no es el listón de la marca**.

## 5 · La ficha

Con etiquetas, como todo en este repositorio: `[HECHO]` lo que afirma quien puede, `(?)` lo que
falta, `[OPINIÓN]` lo que es lectura mía.

```
# La marca de <nombre>

Qué es · Dónde vive lo de negocio · Para qué se hizo esta ficha

## Lo que hay
Archivos descargados, con formato y si son vectoriales

## La identidad, medida por superficie
Tabla: fondo, color de marca, secundarios, con el % de pantalla de cada uno
Tipografías de cuerpo y de titulares
(fuente: su web, con la fecha de la medida)

## Cómo se lee esta marca
[OPINIÓN] Dos o tres frases: bañada o sobria, qué carga el color, qué es detalle y qué es identidad

## Aviso sobre el listón
Si su web actual está por debajo de lo que hay que hacer, se dice aquí

## Qué falta (?)
El valor oficial del color · el vectorial · si existe manual · a quién preguntar
```

## 6 · A quién se le pregunta lo que falta

La ficha termina con una lista corta de preguntas y **a quién**: el valor oficial del color, si
existe vectorial, si hay manual de marca, si un color secundario es identidad o es un resto de una
campaña. **Se pregunta antes de que nadie construya nada sobre la marca**, no después.

## Fallos típicos

- **Contar elementos en vez de medir superficie.** Sale el color equivocado con mucha precisión.
- **No mirar la captura.** La medida sin los ojos se cree cualquier cosa.
- **Dar por marca lo que es la web.** La web la pudo hacer un tercero con un constructor.
- **Descargar el logotipo con la terminal** cuando el servidor lo bloquea: se baja por el
  navegador.
- **Tratar un color minoritario como segundo color de marca** sin preguntar.
- **Inventar el valor puro** de un color medido con transparencia. Se anota tal cual y se
  pregunta.
