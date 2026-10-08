# IA en Reportia: preparada y apagada

Reportia tiene dos ayudas de inteligencia artificial para **quien gestiona** los casos. Están hechas, pero **apagadas**: hoy no se ve nada de IA en el producto ni se envía ningún dato a ningún proveedor.

Este documento explica qué hacen, qué datos saldrían si se encienden y qué hay que decidir y configurar antes.

## Qué hace

1. **Resumen y título del caso.** Un resumen de 3 frases y un título de 6 a 10 palabras. Se guarda en el caso y queda anotado en el historial con el nombre de quien lo pidió. El título propuesto se usa en el tablero solo si nadie ha puesto uno a mano.
2. **«Redactar con IA».** Propone un borrador de mensaje (acuse de recibo, petición de más datos o respuesta final). El borrador va a la caja de texto: la persona lo lee, lo cambia y decide si lo envía.

## Lo que no hace nunca

- No existe para quien denuncia: ni el formulario ni «Mi caso» tienen nada de IA, y el resumen y el título no se le muestran.
- No envía mensajes, no cambia el estado de un caso y no toma decisiones.
- No recibe el nombre, el correo ni el teléfono de quien informa. La función ni siquiera los lee.

## Qué datos saldrían hacia el proveedor

Solo estos campos del caso:

| Se envía | No se envía |
|---|---|
| El tema (categoría) | Nombre, correo y teléfono de quien informa |
| La descripción de los hechos | Las personas implicadas (campo aparte) |
| El departamento o lugar | Los mensajes de la conversación |
| El «cuándo» | Los archivos adjuntos |
| | El nombre de la empresa y la referencia del caso |

**Aviso importante:** la descripción es texto libre. Si quien informa escribió en ella nombres de personas (suyos o de terceros), esos nombres sí saldrían. Por eso el proveedor tiene que cumplir las condiciones de abajo.

## Qué hay que decidir antes de encenderla

1. **Elegir proveedor.** Tiene que procesar los datos en la Unión Europea, no conservarlos después de responder y no usarlos para entrenar modelos.
2. **Firmar su contrato de encargado del tratamiento** (art. 28 del RGPD). Reportia pasaría a tener un subencargado nuevo.
3. **Actualizar los textos legales:** la política de privacidad del canal (lista de subencargados) y el contrato de encargado entre Reportia y cada empresa cliente.
4. **Valorar con el abogado** si hace falta una evaluación de impacto (los datos de un canal de denuncias son especialmente sensibles) y si cada empresa cliente debe poder activarla o no por su cuenta. Hoy el interruptor es único para todo Reportia.

## Qué hay que configurar para encenderla (cuando esté decidido)

Son cuatro pasos. Mientras falte cualquiera de ellos, sigue apagada.

1. **Ejecutar la migración `013_ia_supresion.sql`** en Supabase (SQL Editor). Hay que ejecutarla aunque la IA no se encienda nunca, porque también corrige la supresión de datos.
2. **Guardar los secretos de la función** en Supabase (Edge Functions → Secrets). No van en el código ni llegan al navegador:

   | Secreto | Qué es |
   |---|---|
   | `AI_PROVIDER_URL` | Dirección completa del servicio del proveedor |
   | `AI_API_KEY` | La clave que da el proveedor |
   | `AI_MODEL` | Nombre del modelo |
   | `AI_PROVIDER_FORMAT` | `openai` (por defecto) o `anthropic`, según el formato que use el proveedor |

3. **Desplegar la función `ai-assist`** (`supabase/functions/ai-assist`). Sin los secretos responde «apagada» y no hace nada.
4. **Poner `VITE_AI_ENABLED=1`** en las variables de entorno de Vercel y volver a publicar. Es lo que hace aparecer los botones en el panel.

Para apagarla otra vez basta con quitar `VITE_AI_ENABLED` y volver a publicar; para cortarla del todo, borrar los secretos.

## Cómo verla sin encenderla

En el modo demo (sin credenciales de Supabase) y con `VITE_AI_ENABLED=1`, las dos ayudas se ven con textos fijos de ejemplo. No se llama a ningún servicio.

## Cómo está protegida

- La función comprueba la sesión y la verificación en dos pasos, y lee el caso con la sesión de quien lo pide: si esa persona no puede ver el caso en el panel, la función tampoco.
- Resumir exige permiso de editar en ese tema; redactar, permiso de responder.
- El resumen solo puede guardarlo el servidor. Desde el navegador no se puede escribir (hay una prueba de ello en `npm run db:test`).
- Al suprimir los datos de un caso (art. 32 de la Ley 2/2023) se borran también el resumen y el título.
- Lo que escribió quien informa se le pasa a la IA como dato, con la instrucción de no tratarlo como órdenes. Aun así, un resumen puede equivocarse: por eso la ficha lo avisa y pide comprobarlo.
