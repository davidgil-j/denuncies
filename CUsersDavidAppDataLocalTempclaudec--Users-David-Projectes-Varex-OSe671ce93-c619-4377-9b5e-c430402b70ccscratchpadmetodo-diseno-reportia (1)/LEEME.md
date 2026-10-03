# Método de diseño de Reportia

Esto es el método con el que se hacen aquí las páginas y las interfaces. No es un manual de
estilo: es un procedimiento, con su orden, sus reglas duras y las herramientas que usa en cada
paso. Está escrito para que lo lea **tu Claude**, no para que te lo estudies tú.

**Lo que hay en este paquete:**

| Carpeta | Qué es |
|---|---|
| `skills/diseno/` | El método entero, quince archivos. Esto es lo que se instala |
| `marca-vanster/` | Los colores, las tipografías y los logotipos de Vanster, medidos de su web |

---

## 1 · Instalar el método

Copia la carpeta `diseno` dentro de `.claude/skills/` de tu proyecto. Si esa carpeta no existe,
la creas:

```
tu-proyecto/
└── .claude/
    └── skills/
        └── diseno/        <- la carpeta de este paquete, entera
```

Y ya está. Se invoca escribiendo `/diseno` seguido de lo que vayas a hacer. No depende de ningún
archivo de fuera: funciona en cualquier repositorio.

## 2 · Instalar las herramientas que usa

El método llama a piezas de terceros en fases concretas. **Funciona sin ellas**, pero rinde mucho
más con ellas. Están todas listadas en `skills/diseno/piezas.md`, con qué hace cada una y en qué
fase entra. Las órdenes, desde la raíz de tu proyecto:

```bash
# La grande: proceso, comandos y medición
npx impeccable@latest install --yes --project --providers=claude

# Dirección visual para páginas de marca
npx skills@latest add Leonxlnx/taste-skill --skill design-taste-frontend -y --project

# Movimiento y detalle fino
npx skills@latest add emilkowalski/skills --skill emil-design-eng --skill animate --skill review-animations --skill prototype --skill mobile-native -y --project
```

⚠️ **Un aviso sobre el instalador de `skills`:** deja el contenido en una carpeta `.agents/` en la
raíz y pone accesos directos en `.claude/skills/`. Si no quieres esa carpeta suelta, copia el
contenido real a `.claude/skills/` y borra `.agents/`.

## 3 · Lo que hay que saber antes de usarlo

**Las tres leyes** no admiten excepción y bloquean la publicación. Están en la primera página del
método y son: cero morralla de IA en el texto, nada esencial puede depender de un efecto que
falle, y probado en el aparato real antes de publicar.

**Las ocho fases** van en orden, pero no son una cadena: dentro de cada una se itera sin límite.
Lo que se controla es reabrir una fase ya cerrada.

**El orden que más sorprende y el que más ahorra:** los bocetos van ANTES de fijar la rejilla, las
letras y el color. El motivo está explicado en la primera página, y resumido es que todo eso solo
se puede juzgar viendo. La rejilla no se decide en abstracto: se extrae del boceto que se eligió.

**Un solo archivo de salida por proyecto**, el plan. El método tiene prohibido generar archivos
de diseño, de decisiones o de reglas sueltos.

## 4 · La marca de Vanster

En `marca-vanster/` están los valores medidos de su web, no inventados: el color de marca es un
**fucsia**, y ocupa alrededor del 18 % de la pantalla. El amarillo es un detalle del menú, no la
identidad.

🔴 **Dos cosas que hay que preguntar antes de construir nada:** el valor oficial del fucsia (el
medido está pintado con transparencia, así que el puro puede ser otro) y si existe manual de
marca. Lo sabe Jasmina.

⚠️ **Y un aviso que importa:** la web actual de Vanster **no es el listón**. Es WordPress con un
constructor visual, una sola página pesa 1,74 MB y usa dos tipografías de Google muy vistas.
Vanster es un estudio de diseño gráfico: lo nuevo tiene que estar por encima de su propia web, no
parecerse a ella.

## 5 · El nivel al que hay que llegar

Hay una página publicada que sirve de vara de medir, y David te pasa el enlace aparte.

**Se mira, no se copia.** La regla está escrita dentro del método con estas palabras: se congela
el listón, no el aspecto. Si la página nueva lleva otra vez los mismos recursos que aquella, será
la misma página con otro logotipo. Lo que se repite es el nivel de exigencia y el tipo de
detalle; el recurso concreto se elige cada vez, y el método dice cómo.
