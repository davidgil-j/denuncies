# Cómo poner el canal en la web de un cliente

Fase 4 de `docs/PLAN_FASES.md` (n.º 52 a 57). Escrito el 16 de octubre de 2026.

El cliente lo ve en el panel: **Compartir el canal › «Otras formas de ponerlo en tu web»**, en catalán, castellano e inglés. Aquí está lo mismo y, además, lo que tiene que hacer Reportia en cada caso.

## Las cuatro formas

| | Qué es | Qué hace el cliente | Qué hace Reportia |
|---|---|---|---|
| 1 | **Enlace o botón** (la recomendada) | Copia el botón o el enlace de «Compartir el canal» y lo pega en la página de inicio de su web. El canal se abre en una pestaña aparte | Nada |
| 2 | **Script** | Pega `<script src="…/boton-canal.js" data-canal="…" data-idioma="es" data-color="#…" async></script>`. Con `data-estilo="flotante"`, el botón queda fijo en la esquina de abajo de todas las páginas | Nada. El script es `public/boton-canal.js` |
| 3 | **Dentro de una página de su web** (iframe) | Pega el `<iframe>` que da la guía | Nada |
| 4 | **Dirección propia** (por ejemplo, `canal.acme.es`) | Nos escribe con la dirección y crea en su proveedor de dominio el registro CNAME que le digamos | Darla de alta en Vercel y en la base de datos (abajo) |

### Por qué la primera es la mejor

Con el enlace, quien denuncia escribe en una dirección que no es la de su empresa y las herramientas de medición de la web de la empresa no se ejecutan mientras escribe. Con el iframe, el canal funciona igual, pero la página de fuera (la de la empresa) sigue abierta alrededor. Por eso la guía lo dice tal cual y recomienda el enlace.

## Lo que se ha hecho para que el iframe sea seguro

- `vercel.json`: **solo `/canal/*` se puede incrustar**, y solo desde webs con `https` (`frame-ancestors https:`). El panel, el acceso y la web de Reportia siguen con `frame-ancestors 'none'` y `X-Frame-Options: DENY`.
- Si, ya dentro del recuadro, alguien llega al panel o al acceso sin recargar la página, la aplicación no los pinta: enseña un aviso con un enlace para abrirlos en su propia ventana (`src/v2/ui/Framed.jsx`).
- «Acceder» (el equipo) se abre en una ventana nueva; la denuncia a medias se queda en el recuadro.
- «Salir rápido» sale de la web entera, no solo del recuadro (`src/v2/lib/frame.js`).
- El `<iframe>` que damos lleva `referrerpolicy="no-referrer"`: el canal no recibe la dirección de la página de la empresa.

Todo esto lo comprueba la prueba de navegador `csp` contra la web compilada como en producción.

## Dirección propia: cómo se da de alta

Hace falta la migración `017_dominio_propio.sql` ejecutada en Supabase.

1. **Vercel** (proyecto de producción): *Settings › Domains › Add* con la dirección (`canal.acme.es`). Vercel enseña el registro CNAME que hay que crear; **cada proyecto tiene el suyo** (algo como `d1d4fc829fe7bc7c.vercel-dns-017.com`), así que no se puede dar uno fijo en la guía.
2. El cliente crea ese registro en su proveedor de dominio. Cuando Vercel lo da por bueno, pone el certificado él solo.
3. **Supabase › SQL**:
   ```sql
   update organizations set custom_domain = 'canal.acme.es' where slug = 'acme';
   ```
   Desde el panel nadie puede cambiar esta columna; solo con la clave de servicio.
4. Desde ese momento:
   - `https://canal.acme.es` abre el canal de Acme;
   - «Compartir el canal», el cartel, el QR, el botón y el texto del art. 25 usan `https://canal.acme.es/canal/acme`;
   - el acceso del equipo y la web de Reportia se abren en la dirección principal (nunca en la del cliente).

Para quitarla: `custom_domain = null` y quitar la dirección en Vercel.

**Límites de Vercel** (comprobado el 16 de octubre de 2026 en vercel.com/docs/limits): el plan **Hobby admite 50 direcciones por proyecto**; el **Pro, sin límite práctico** (100.000 como tope blando). Además, el plan Hobby es solo para uso no comercial: para vender el canal hace falta el Pro.

Lo que queda pendiente: la vista previa al compartir `https://canal.acme.es` (la raíz) muestra la de la web de Reportia, porque la raíz se sirve con `index.html`. Por eso todo lo que se comparte usa `…/canal/acme`, que sí es neutra (`canal.html`).

## Funciones del servidor: desde qué webs se pueden llamar (n.º 57)

`invite-manager`, `delete-manager` y `ai-assist` leen el secreto **`ALLOWED_ORIGINS`**: las direcciones desde las que el navegador puede llamarlas, separadas por comas. Por ejemplo:

```
ALLOWED_ORIGINS=https://reportia-canal.vercel.app,https://canal.reportia.es
```

Sin el secreto, se pueden llamar desde cualquier web, como hasta ahora (la sesión y la verificación en dos pasos siguen siendo la barrera real). Hay que ponerlo cuando esté decidida la dirección definitiva (n.º 78) y volver a desplegar las tres funciones. `notify` no lo necesita: la llama la base de datos, no el navegador.
