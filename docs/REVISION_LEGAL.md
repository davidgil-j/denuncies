# Textos legales del producto: revisión y dudas para el abogado

Fecha: 8 de octubre de 2026. Alcance: los textos del canal (`/canal/…`) y del panel (`/admin/…`) en castellano, catalán e inglés. La portada comercial y `/privacitat` no se han tocado.

## 1. Citas comprobadas (no se han cambiado)

Las 32 citas de artículos coinciden en los tres idiomas. Estas se han contrastado con el texto de la Ley 2/2023 y del RGPD y son correctas:

| Cita | Para qué se usa |
|---|---|
| Ley 2/2023, art. 5.1 | La empresa es responsable del tratamiento; consulta previa a la representación legal de la plantilla |
| art. 7.2 | Comunicaciones verbales, reunión presencial (7 días) e información sobre canales externos |
| art. 8 y 8.3 | Responsable del Sistema y comunicación de su nombramiento en 10 días hábiles |
| art. 9, 9.2 d) y 9.2 j) | Acuse en 7 días, respuesta en 3 meses, ampliación de otros 3, y remisión al Ministerio Fiscal |
| art. 10, 10.1 b) y c) | Quién está obligado |
| art. 25 | Información sobre el canal en la página de inicio |
| art. 26 y 26.2 | Libro-registro y máximo de 10 años |
| art. 30.2 | Licitud del tratamiento |
| art. 32, 32.1, 32.2 y 32.4 | Quién accede, comunicación a terceros y supresión a los 3 meses |
| art. 36 | Prohibición de represalias |
| arts. 63 y 65 | Infracciones y sanciones |
| RGPD, arts. 6.1.c, 6.1.e y 28 | Base legal y encargado del tratamiento |

## 2. Lo que se ha corregido

- **Aviso de casos que hay que suprimir (panel).** Decía «3 meses sin investigación, o 10 años (art. 32)». Los 10 años son del art. 26.2. Ahora cita «arts. 32.4 y 26.2».
- **Tono.** Los textos del producto que aún trataban de «usted» pasan a «tú» (en catalán, de «vostè» a «tu»): avisos del panel, panel de canales externos, consejo de privacidad, ficha «qué guardamos», el cartel y, en la política de privacidad dentro del canal, los apartados «Datos recogidos» y «Tus derechos». Solo cambia la persona del verbo; el contenido es el mismo.

## 3. Dudas para el abogado (no se ha cambiado nada)

1. **Reunión presencial: ¿«proponer» o «celebrar» en 7 días?** El art. 7.2 habla de presentar la comunicación «mediante una reunión presencial dentro del plazo máximo de siete días». Nuestros textos dicen que la empresa «te propondrá una reunión en un máximo de 7 días» y, en el panel, «hay que ofrecerla antes del…». Si la reunión tiene que celebrarse dentro de los 7 días, hay que cambiar la redacción. También conviene confirmar que los 7 días cuentan desde la petición.
2. **«De buena fe».** El canal dice «Nadie puede tomar represalias por haber informado de buena fe (Ley 2/2023)». La ley (art. 35) protege a quien tiene «motivos razonables para pensar que la información es veraz». En otros puntos del producto ya se usa esa fórmula. ¿Unificamos?
3. **Derechos de portabilidad y oposición.** La política lista «acceso, rectificación, supresión, limitación, portabilidad y oposición». Con base legal de obligación legal (art. 6.1.c), la portabilidad y la oposición en principio no se aplican, y el art. 31 de la Ley 2/2023 tiene reglas propias (por ejemplo, la persona denunciada no puede conocer la identidad de quien informa). ¿Se deja la lista o se matiza?
4. **A quién se comunica el Responsable del Sistema.** El panel habla siempre de «comunicarlo a la AIPI». El art. 8.3 dice a la Autoridad Independiente «o, en su caso, a las autoridades u órganos competentes de las comunidades autónomas». Para una empresa que solo opera en Cataluña, ¿es la Oficina Antifrau?
5. **Cómputo de los 10 días hábiles.** El panel descuenta sábados y domingos, pero no los festivos, y lo avisa en pantalla. ¿Basta con el aviso?
6. **«Respuesta en 3 meses máximo».** Es la promesa de la entrada del canal. La ley permite ampliar otros 3 meses en casos de especial complejidad. ¿Conviene matizarla?
7. **Subencargados y transferencias.** La política nombra a Supabase Inc., Vercel Inc. y Cloudflare Inc. «con las garantías del capítulo V del RGPD». Hay que confirmar las entidades, las regiones donde se alojan los datos y la base de la transferencia. Si se enciende la IA, habrá que añadir a su proveedor (ver `docs/IA.md`).
8. **Supresión y libro-registro.** Al suprimir un caso se borran descripción, mensajes, archivos, datos de contacto y, desde la migración 013, también el título, el «cuándo» y el resumen de IA. Se conservan la referencia, el tema, las fechas, el estado y el resultado. ¿Es suficiente como «forma anonimizada» (art. 32.4)?
9. **Texto para la página de inicio (art. 25).** El texto que el panel ofrece para copiar ya lleva la nota «texto orientativo, revísalo con vuestra asesoría». Conviene que el abogado dé por bueno el modelo.
10. **Contrato de encargado del tratamiento.** No existe todavía; el enlace del panel abre un correo para pedirlo.

11. **Escribir en un caso ya cerrado.** Quien informa puede seguir escribiendo en «Mi caso» después del cierre (la base de datos lo admite y el gestor lo ve). Desde el pulido final, «Mi caso» avisa de que el caso está cerrado y dice: «Si tienes algo nuevo, puedes escribir aquí o enviar una nueva denuncia». ¿Es correcto dejarlo abierto o debe cerrarse la conversación al responder?
12. **Enseñar el resultado a quien informa.** Hoy «Mi caso» dice que el caso está cerrado y cuándo, y la respuesta va en los mensajes. No enseña el resultado interno («Fundada», «No fundada»…). ¿Debe verlo?

### Dudas nuevas de la auditoría «Mejora total» (octubre 2026, ver `docs/AUDITORIA.md`)

Ninguna ha cambiado ningún texto. Donde había que elegir, el producto hace ahora lo más prudente y lo dice entre paréntesis.

13. **Ampliación del plazo (art. 9.2 d): ¿6 meses desde la recepción o 3 + 3 encadenados?** Solo cambia a final de mes: recibida el 30 de noviembre, el producto amplía hasta el 30 de mayo; encadenando, sería el 28 de mayo.
14. **¿Se puede ampliar un plazo ya vencido?** En el procedimiento administrativo la Ley 39/2015 (art. 32.3) lo prohíbe. (Ahora el producto no lo permite.)
15. **Inicio del plazo de 3 meses.** La ley lo cuenta desde la recepción o, si no hubo acuse, desde que vencen los 7 días. El producto cuenta siempre desde la recepción, que es lo más estricto. ¿Vale así?
16. **Zona horaria de referencia.** Los plazos se cuentan en días de calendario de Madrid (como la base de datos). Para una empresa de Canarias, ¿debería contar su hora local? Solo cambia algo en las denuncias recibidas entre las 23:00 y las 24:00 de Canarias.
17. **Casos cerrados sin investigar** (inadmitidos, duplicados, fuera de ámbito): ¿se suprimen a los 3 meses (art. 32.4) o se pueden conservar anonimizados «para dejar evidencia del funcionamiento del sistema»? (Ahora el aviso de supresión los incluye; la empresa decide.)
18. **Reabrir un caso.** ¿La primera respuesta ya cumple el art. 9.2, o reabrir abre un plazo nuevo, y desde cuándo? (Ahora un caso reabierto conserva la fecha de su primera respuesta y no tiene cuenta atrás.)
19. **¿Un mensaje cualquiera vale como acuse de recibo**, o tiene que ser un acuse expreso? Hoy solo cuenta el acuse que se envía con el botón.
20. **Festivos para la AIPI (art. 8.3).** ¿Hay que descontar festivos nacionales, autonómicos y locales? (Igual que la n.º 5.)
21. **Nota de plazos del PDF de un caso.** Dice que el plazo no incluye la ampliación, pero en un caso ampliado la ficha ya muestra la fecha ampliada: hay que validar una variante para esos casos.
22. **«Nombrar a una persona» como Responsable.** El art. 8 también admite un órgano colegiado. ¿Se menciona?
23. **Lema de los correos: «Canal de denuncias anónimas».** El canal también admite denuncias identificadas.
24. **«Cifrado de extremo a extremo».** Aparece en un texto que ya no se muestra en ninguna pantalla; se propone borrarlo (no es cierto en sentido estricto).
25. **IP en los registros de los proveedores.** Ni la base de datos ni la denuncia guardan la IP de quien informa, pero los registros técnicos de Vercel y Supabase sí la guardan durante su periodo de retención (Reportia puede verlos; la empresa cliente no). ¿Hay que decirlo en la política de privacidad del canal y fijar un plazo?
26. **Freno de intentos del portal de seguimiento.** Para que nadie pueda adivinar códigos, si hay muchos intentos con códigos falsos el portal se frena unos minutos para todos (sin guardar IPs). Alguien podría provocarlo a propósito y retrasar unos minutos que una persona consulte su caso. ¿Es aceptable frente a la garantía de confidencialidad?

## 4. Lo que no se ha revisado

- La portada comercial, `/crear-compte` y `/privacitat` (fuera de este trabajo).
- Los correos que envía el sistema.
- Los textos de los PDF y del Excel más allá de las citas de artículos y del cartel.
