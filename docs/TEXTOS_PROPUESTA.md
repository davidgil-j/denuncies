# Textos: inventario y propuesta de reescritura

Fecha: 13 de octubre de 2026. Fase 1 del encargo «Vuelta». **No se ha cambiado ningún texto del producto**: esto es la propuesta para que David y su jefe decidan.

## Cómo leerlo

- Están **todos los textos** de `src/translations.js` y `src/translations-panel.js`: 1678 claves, cada una en catalán, castellano e inglés. Los correos (que no viven en esos archivos) están en `docs/AUDITORIA_ESTETICA.md`.
- La columna «ES actual» es el texto de hoy en castellano. En las filas que no cambian, los textos de más de 180 caracteres van cortados con «…».
- **sin cambio**: el texto ya es sobrio y se queda.
- **legal: no se toca**: cita un artículo o es un texto pendiente del abogado (`docs/REVISION_LEGAL.md`). No se propone nada.
- **sin uso aparente**: la clave no aparece en ninguna pantalla actual (se ha buscado en el código). Son restos de la versión anterior; muchos siguen en «usted». Propuesta: comprobarlo y borrarlos en la fase 2.
- **(se quita)**: el texto desaparece de la pantalla.
- **(lo decide tu jefe)**: depende de una decisión de David Comellas.

## Criterios de la reescritura

1. **Sobrio y directo, en «tú».** Frases completas. Nada de frases de una palabra cerradas con punto («Enviada. Guarda tu código.»).
2. **Sin venta dentro del producto.** Ni promesas («en tres minutos»), ni etiquetas de beneficios, ni invitaciones a contratar dentro del canal o del acceso de un cliente.
3. **Los títulos dicen qué es la pantalla** («Tablero», «Informe de 2026», «Compartir el canal»), no saludan ni hacen gracia.
4. **Los botones se entienden solos** («Presentar una denuncia», «Consultar mi caso»).
5. **Un estado es un estado** («En investigación»), no una frase sobre terceros («La están investigando»).
6. **Lo legal no se toca.**
7. **Sin inventar:** ninguna propuesta añade un dato, una promesa ni una cifra que no estuviera ya.

## Resumen

| | claves |
|---|---|
| Cambian de redacción | 57 |
| Se quitan de la pantalla | 19 |
| Las decide tu jefe | 2 |
| Legales: no se tocan | 181 |
| Sin uso aparente (restos de la versión anterior) | 301 (de ellas, 38 siguen en «usted») |
| Sin cambio | 1118 |
| **Total** | **1678** |

Además hacen falta 9 textos nuevos para las maquetas (al final de la sección 1).

---

## 1. Lo que se propone cambiar

### 1.1 Canal

| clave | ES actual | ES propuesto | CA propuesto | EN propuesto | motivo |
|---|---|---|---|---|---|
| `canal.reportLead` | Cuenta lo que has visto. Sin nombre, sin crear cuenta y en tres minutos. | **Informa de una infracción o una irregularidad. Puedes hacerlo de forma anónima.** | Informa d’una infracció o una irregularitat. Ho pots fer de manera anònima. | Report a breach or an irregularity. You can do it anonymously. | Frase de venta: «en tres minutos» es una promesa, y son tres frases a golpe de punto (P2, P7) |
| `canal.trust[0]` | Puedes ser anónimo | **(se quita)** | — | — | Etiqueta comercial: tu jefe pide quitarlas (P3) |
| `canal.trust[1]` | Respuesta en 3 meses como máximo | **(se quita)** | — | — | Etiqueta comercial: tu jefe pide quitarlas (P3). Además es la duda 6 del abogado (el plazo se puede ampliar) |
| `canal.trust[2]` | Sin represalias, por ley | **(se quita)** | — | — | Etiqueta comercial: tu jefe pide quitarlas (P3). La prohibición de represalias sigue en «Enviada» y en el pie legal |
| `canal.already` | ¿Ya lo contaste? Mira tu caso | **Consultar mi caso** | Consultar el meu cas | Check my case | Pasa a ser una acción principal (P4): necesita nombre de acción, no una pregunta coloquial |
| `canal.start` | Empezar | **Presentar una denuncia** | Presentar una denúncia | Submit a report | «Empezar» no dice qué empieza; el botón tiene que entenderse solo |
| `canal.startAria` | Empezar a denunciar | **Presentar una denuncia** | Presentar una denúncia | Submit a report | El nombre para lectores de pantalla, igual que el texto visible |
| `canal.manageLead` | Para el equipo de {org} que recibe, investiga y responde. | **Acceso para el equipo que gestiona el canal de {org}.** | Accés per a l’equip que gestiona el canal de {org}. | Access for the team that manages the {org} channel. | «Recibe, investiga y responde» es un eslogan en tres tiempos (P2) |
| `canal.manageTrust[0]` | Plazos legales automáticos | **(se quita)** | — | — | Etiqueta comercial: tu jefe pide quitarlas (P3). Se le dice al equipo de la empresa, que ya lo ha contratado (obs. 7) |
| `canal.manageTrust[1]` | Libro-registro al día | **(se quita)** | — | — | Etiqueta comercial: tu jefe pide quitarlas (P3) (obs. 7) |
| `canal.manageTrust[2]` | Solo lo ve quien tú autorices | **(se quita)** | — | — | Etiqueta comercial: tu jefe pide quitarlas (P3) (obs. 7) |
| `canal.footBy` | Con Reportia | **(lo decide tu jefe)** | (lo decide tu jefe) | (lo decide tu jefe) | Marca Reportia fuera del canal (P1): o se queda muy pequeño en el pie o se quita (obs. 8) |
| `canal.nfHome` | Ir a Reportia | **(se quita)** | — | — | Marca Reportia fuera del canal (P1): un canal que no existe no debe llevar a la web comercial |
| `canal.nfCompany` | ¿Tienes una empresa? | **(se quita)** | — | — | Venta dentro del canal (P1, P2) |
| `canal.nfCreate` | Crea su canal | **(se quita)** | — | — | Venta dentro del canal (P1, P2) |
| `canal.q1Lead` | Elige lo que más se parezca. Si no lo tienes claro, elige la última. | **Elige el tema que más se acerque. Si dudas, elige «Otra cosa o no lo sé».** | Tria el tema que més s’hi acosti. Si dubtes, tria «Una altra cosa o no ho sé». | Choose the closest topic. If in doubt, choose “Something else, or not sure”. | «La última» obliga a buscarla; mejor nombrarla |
| `canal.cats.other[1]` | Cuéntalo igualmente, ya lo clasificaremos | **Descríbelo y el equipo lo clasificará** | Descriu-ho i l’equip ho classificarà | Describe it and the team will classify it | «Ya lo clasificaremos» suena informal para un tema serio (P7) |
| `canal.cats.accounting[1]` | Contabilidad maquillada o gastos falsos | **Contabilidad alterada o gastos falsos** | Comptabilitat alterada o despeses falses | Altered accounts or false expenses | «Maquillada» es coloquial (P7) |
| `canal.q2` | Cuéntalo con tus palabras | **Describe lo ocurrido** | Descriu què ha passat | Describe what happened | «Cuéntalo con tus palabras» es tono de anuncio (P2) |
| `canal.what` | ¿Qué ha pasado? | **Descripción** | Descripció | Description | El título ya hace la pregunta: la etiqueta del campo no la repite |
| `canal.help` | Ayuda: | **Conviene indicar qué ocurrió, dónde, cuándo y quién estaba presente.** | Convé indicar què va passar, on, quan i qui hi era present. | It helps to say what happened, where, when and who was present. | Las cuatro etiquetas con ✓ verde parecen un juego (obs. 6): pasa a ser una frase de ayuda |
| `canal.helps[0]` | Qué pasó | **(se quita)** | — | — | Ver canal.help (obs. 6) |
| `canal.helps[1]` | Dónde | **(se quita)** | — | — | Ver canal.help (obs. 6) |
| `canal.helps[2]` | Cuándo | **(se quita)** | — | — | Ver canal.help (obs. 6) |
| `canal.helps[3]` | Quién estaba | **(se quita)** | — | — | Ver canal.help (obs. 6) |
| `canal.helpDone` | ya está | **(se quita)** | — | — | Ver canal.help (obs. 6) |
| `canal.helpTodo` | falta | **(se quita)** | — | — | Ver canal.help (obs. 6) |
| `canal.proofMeta` | Los archivos pueden llevar datos ocultos, como el autor o la ubicación: revísalos si quieres seguir siendo anónimo. En una denuncia anónima no guardamos el nombre del archivo y las fotos se envían sin ubicación ni datos del dispositivo. Los demás archivos (PDF, vídeo, documentos) se envían tal cual. | **De las fotos se quitan la ubicación y los datos del dispositivo. Los demás archivos se envían tal cual: revísalos si quieres mantener el anonimato.** | De les fotos se’n treuen la ubicació i les dades del dispositiu. La resta d’arxius s’envien tal qual: revisa’ls si vols mantenir l’anonimat. | Location and device data are removed from photos. Other files are sent as they are: check them if you want to stay anonymous. | Un párrafo de 60 palabras en letra de 12 px (obs. 5). Dice lo mismo en dos frases; el detalle (nombre del archivo) pasa a «Qué guardamos y qué no». Conviene que el abogado lo dé por bueno |
| `canal.q3` | ¿Quieres dar tu nombre? | **¿Quieres identificarte?** | Et vols identificar? | Do you want to identify yourself? | Más preciso: quien se identifica da también el correo, no solo el nombre |
| `canal.recommended` | Recomendado | **(se quita)** | — | — | El canal no debe empujar hacia una opción: el anonimato ya va primero y marcado |
| `canal.sentTitle` | Enviada. Guarda tu código. | **Denuncia enviada** | Denúncia enviada | Report submitted | Frases cortas a golpe de punto (P7) |
| `canal.sentLead` | Con él podrás ver la respuesta y hablar con quien lleva tu caso. Es la única forma de volver: no lo podemos recuperar. | **Guarda este código. Es la única forma de consultar la respuesta y de escribir a quien gestiona tu caso, y no se puede recuperar.** | Desa aquest codi. És l’única manera de consultar la resposta i d’escriure a qui gestiona el teu cas, i no es pot recuperar. | Keep this code. It is the only way to see the reply and to write to the person handling your case, and it cannot be recovered. | La instrucción (guardar el código) pasa del título a la primera frase |
| `canal.caseTitle` | Mira tu caso | **Consultar mi caso** | Consultar el meu cas | Check my case | El mismo nombre que el botón de la entrada |
| `canal.caseLead` | Escribe el código secreto de 8 caracteres que recibiste al enviarla. | **Escribe el código de 8 caracteres que recibiste al enviar la denuncia.** | Escriu el codi de 8 caràcters que vas rebre en enviar la denúncia. | Enter the 8-character code you received when you submitted the report. | «Al enviarla» no dice qué: esta pantalla se abre sin contexto |
| `canal.st.sent` | Enviada. Aún no la han abierto | **Enviada, pendiente de revisión** | Enviada, pendent de revisió | Submitted, awaiting review | Frases cortas a golpe de punto (P7) |
| `canal.st.received` | La han recibido | **Recibida** | Rebuda | Received | Es el título de «Mi caso»: un estado, no una frase |
| `canal.st.investigating` | La están investigando | **En investigación** | En investigació | Under investigation | Es el título de «Mi caso»: un estado, no una frase |
| `canal.st.answered` | Te han respondido | **Respondida** | Amb resposta | Answered | Es el título de «Mi caso»: un estado, no una frase |
| `canal.waiting` | Están esperando tu respuesta. Escríbela aquí abajo. | **El equipo espera tu respuesta. Puedes escribirla abajo.** | L’equip espera la teva resposta. La pots escriure a sota. | The team is waiting for your reply. You can write it below. | Tono: aviso, no orden |
| `ds.colEmpty` | Aquí no hay nada | **Sin casos** | Sense casos | No cases | «Aquí no hay nada» es coloquial |

### 1.2 Panel

| clave | ES actual | ES propuesto | CA propuesto | EN propuesto | motivo |
|---|---|---|---|---|---|
| `panel.hello` | Hola, {name} | **(se quita)** | — | — | Saludo «simpático» en un tema serio (obs. 12) |
| `panel.needN` | {n} casos te necesitan hoy | **{n} casos requieren una acción hoy** | {n} casos requereixen una acció avui | {n} cases need action today | «Te necesitan» personifica los casos (obs. 12). El título de la pantalla pasa a ser «Tablero» y esto, su subtítulo |
| `panel.need1` | 1 caso te necesita hoy | **1 caso requiere una acción hoy** | 1 cas requereix una acció avui | 1 case needs action today | Igual que panel.needN |
| `panel.need0` | Todo al día | **Ningún caso requiere una acción hoy** | Cap cas requereix una acció avui | No cases need action today | «Todo al día» es coloquial (obs. 12) |
| `panel.codeTitle` | Un último paso | **Verificación en dos pasos** | Verificació en dos passos | Two-step verification | «Un último paso» es tono de app de consumo |
| `panel.thenCode` | Después, el código de 6 cifras de tu app | **Después se pide el código de 6 cifras de la app de verificación.** | Després es demana el codi de 6 xifres de l’app de verificació. | Next you will be asked for the 6-digit code from your authenticator app. | Frase sin verbo |
| `panel.noChannel` | ¿Tu empresa aún no tiene canal? | **(se quita)** | — | — | Venta de Reportia dentro del acceso de un cliente (P1) |
| `panel.createFree` | Créalo gratis 30 días | **(se quita)** | — | — | Venta de Reportia dentro del acceso de un cliente (P1) |
| `panel.byReportia` | Con Reportia | **(lo decide tu jefe)** | (lo decide tu jefe) | (lo decide tu jefe) | En el panel, Reportia sí puede firmar; cómo, depende de la propuesta de identidad |
| `panel.ackTpl` | Hola. Hemos recibido tu denuncia y ya la estamos revisando. Te responderemos por aquí: puedes volver cuando quieras con tu código. | **Hemos recibido tu denuncia y la estamos revisando. Te responderemos por este canal. Puedes consultar su estado en cualquier momento con tu código.** | Hem rebut la teva denúncia i l’estem revisant. Et respondrem per aquest canal. Pots consultar-ne l’estat en qualsevol moment amb el teu codi. | We have received your report and are reviewing it. We will reply through this channel. You can check its status at any time with your code. | Es el primer mensaje que lee quien denuncia: más formal, sin «Hola.» suelto |
| `panel.share.title` | Que toda la plantilla lo encuentre | **Compartir el canal** | Compartir el canal | Share the channel | Título «simpático» (obs. 12): el mismo nombre que en el menú |
| `panel.rep.title` | {year}, de un vistazo | **Informe de {year}** | Informe del {year} | {year} report | Título «simpático» (obs. 12) |
| `panel.rep.titleAll` | Todo el historial, de un vistazo | **Informe de todo el historial** | Informe de tot l’historial | Full history report | Título «simpático» (obs. 12) |
| `panel.onb.allDone` | Todo listo | **Puesta en marcha completada** | Posada en marxa completada | Set-up complete | «Todo listo» es coloquial |
| `panel.onb.allDoneText` | El canal está a la vista de la plantilla y la parte legal, al día. | **Los cinco pasos están hechos.** | Els cinc passos estan fets. | All five steps are done. | La frase anterior afirmaba que «la parte legal está al día»: el producto no puede saberlo |
| `panel.pw.titleInvite` | Te damos la bienvenida | **Crea tu contraseña** | Crea la teva contrasenya | Create your password | «Te damos la bienvenida» no dice qué hay que hacer |
| `panel.regLead` | Para los que llegan por teléfono, en persona o por carta. Entran al tablero con sus plazos. | **Para las denuncias que llegan por teléfono, en persona o por carta. Se incorporan al tablero con sus plazos.** | Per a les denúncies que arriben per telèfon, en persona o per carta. S’incorporen al tauler amb els seus terminis. | For reports received by phone, in person or by letter. They are added to the board with their deadlines. | «Para los que llegan» no dice qué |
| `panel.doneTitle` | Registrado. Entrega este código. | **Caso registrado** | Cas registrat | Case registered | Frases cortas a golpe de punto (P7) |
| `panel.doneLead` | Dáselo a quien informa: con él podrá ver la respuesta y escribirte. No se volverá a mostrar. | **Entrega este código a quien informa: con él podrá ver la respuesta y escribirte. No se volverá a mostrar.** | Lliura aquest codi a qui informa: amb ell podrà veure la resposta i escriure’t. No es tornarà a mostrar. | Give this code to the reporter: with it they can see the reply and write to you. It will not be shown again. | La instrucción pasa del título a la primera frase |

### 1.3 Web comercial

La portada se rehará en la fase 5. Estas propuestas sirven para no arrastrar el mismo tono a la web nueva.

| clave | ES actual | ES propuesto | CA propuesto | EN propuesto | motivo |
|---|---|---|---|---|---|
| `v2site.landing.promise` | Tu plantilla avisa de una irregularidad sin dar su nombre. Tu empresa la investiga y responde. | **Sistema interno de información conforme a la Ley 2/2023: denuncias anónimas o identificadas, seguimiento con código y gestión de los plazos.** | Sistema intern d’informació conforme a la Llei 2/2023: denúncies anònimes o identificades, seguiment amb codi i gestió dels terminis. | An internal reporting system compliant with Spanish Law 2/2023: anonymous or identified reports, follow-up by code and deadline management. | Dos frases cortas de anuncio (obs. 20): mejor decir qué es |
| `v2site.lp.pause` | Detener el paso automático | **Pausar** | Pausa | Pause | «Stop moving on» es mal inglés (obs. 18) y las tres versiones son largas para un botón |
| `v2site.lp.play` | Volver a pasar solo | **Reanudar** | Reprèn | Resume | Igual que lp.pause |
| `v2site.lp.howLead` | Del aviso a la respuesta, en cuatro pasos. | **El recorrido de una denuncia, en cuatro pasos.** | El recorregut d’una denúncia, en quatre passos. | The path of a report, in four steps. | Menos eslogan |
| `v2site.lp.panelTitle` | Así lo ve tu empresa | **El panel de gestión** | El panell de gestió | The management panel | Descriptivo |
| `v2site.lp.setupTitle` | Y tu empresa lo pone en marcha en tres pasos | **Puesta en marcha en tres pasos** | Posada en marxa en tres passos | Set-up in three steps | Un título no empieza por «Y» |
| `v2site.lp.catSay.fraud` | Se inflan las facturas de un proveedor amigo. | **Facturas infladas de un proveedor** | Factures inflades d’un proveïdor | Inflated invoices from a supplier | Entre comillas y en grande parece un testimonio inventado (obs. 18): pasa a ser un ejemplo descriptivo, sin comillas |
| `v2site.lp.catSay.harassment` | Un responsable humilla a dos compañeras delante del equipo. | **Humillaciones de un responsable a personas de su equipo** | Humiliacions d’un responsable a persones del seu equip | A manager humiliating members of the team | Igual que lp.catSay.fraud |
| `v2site.lp.catSay.discrimination` | A los mayores de 50 nunca les tocan los turnos buenos. | **Reparto de turnos que perjudica a los mayores de 50 años** | Repartiment de torns que perjudica els majors de 50 anys | Shift allocation that disadvantages staff over 50 | Igual que lp.catSay.fraud |
| `v2site.lp.catSay.safety` | La prensa del turno de noche trabaja sin protección. | **Una máquina que funciona sin sus protecciones** | Una màquina que funciona sense les proteccions | A machine operating without its guards | Igual que lp.catSay.fraud. El inglés actual («runs with no guard») no se entiende |
| `v2site.lp.catSay.data` | Se envían datos de clientes a otra empresa sin permiso. | **Datos de clientes enviados a otra empresa sin permiso** | Dades de clients enviades a una altra empresa sense permís | Customer data sent to another company without consent | Igual que lp.catSay.fraud |
| `v2site.lp.catSay.conflict` | Compras contrata siempre a la empresa de un familiar. | **Contratos adjudicados siempre a la empresa de un familiar** | Contractes adjudicats sempre a l’empresa d’un familiar | Contracts always awarded to a relative’s company | Igual que lp.catSay.fraud |
| `v2site.lp.catSay.accounting` | Hay gastos personales pasados como dietas. | **Gastos personales declarados como dietas** | Despeses personals declarades com a dietes | Personal expenses claimed as allowances | Igual que lp.catSay.fraud |
| `v2site.lp.catSay.environmental` | Los residuos se vierten al desagüe por la noche. | **Vertido de residuos al desagüe** | Abocament de residus al desguàs | Waste poured down the drain | Igual que lp.catSay.fraud |
| `v2site.lp.deadTitle` | Los plazos de la ley, siempre a la vista | **Los plazos de la Ley 2/2023** | Els terminis de la Llei 2/2023 | The deadlines in Law 2/2023 | «Siempre a la vista» es coletilla de venta |
| `v2site.lp.contactTitle` | ¿Prefieres que te lo enseñemos? | **¿Quieres una demostración?** | Vols una demostració? | Would you like a demonstration? | Más directo |
| `v2site.landing.step3t` | Gestione desde el panel | **Gestiona desde el panel** | Gestiona des del panell | sin cambio | Resto de «usted» («Gestione», «Gestioni») en una web que ya va en «tú» |
| `v2site.landing.custom` | A medida | **sin cambio** | sin cambio | Custom | «Tailored» se dice de un traje |
| `v2site.landing.intBtnLabel` | Canal de denuncias | **sin cambio** | sin cambio | Reporting channel | En inglés el producto dice «reporting channel» en todas partes menos aquí |

### 1.4 Textos nuevos que piden las maquetas

| dónde | ES | CA | EN | para qué |
|---|---|---|---|---|
| Entrada: título | Canal de denuncias de {org} | Canal de denúncies de {org} | {org} reporting channel | Con las dos acciones a la vista, el título dice dónde estás. Si el jefe prefiere otra palabra que «denuncias», cambia solo aquí |
| Entrada: ayuda de «Consultar mi caso» | Con el código que recibiste al enviarla | Amb el codi que vas rebre en enviar-la | With the code you received when you submitted it | Explica el botón sin una pregunta |
| Entrada: enlace al panel | Acceso para el equipo | Accés per a l’equip | Team sign-in | Si Gestionar pasa a ser un enlace discreto (Entrada B) |
| Acceso: título | Acceso al panel | Accés al panell | Panel sign-in | Hoy el título es «Gestionar» a 56 px |
| Volver a la entrada | Volver al inicio del canal | Tornar a l’inici del canal | Back to the channel home | Sin franja lateral, hace falta un camino de vuelta con nombre |
| Ficha: título por defecto | {ref} · {tema} | {ref} · {tema} | {ref} · {topic} | Título neutro (obs. 1): el principio de la denuncia deja de leerse a distancia |
| Ficha: poner un título | Añadir un título | Afegir un títol | Add a title | El gestor puede poner uno si quiere |
| Tablero: título | Tablero | Tauler | Board | Sustituye a «Hola, {name}» |
| Paso 2: enlace de detalle | Qué datos se quitan de los archivos | Quines dades es treuen dels arxius | What data is removed from files | Abre el detalle que hoy ocupa un párrafo (obs. 5) |

### 1.5 Lo que queda fuera de esta tabla

- **Los cuatro correos** (`src/v2/emails/`): su texto no está en estos archivos. Las propuestas (lema, saludo «Hola:», orden de idiomas) están en `docs/AUDITORIA_ESTETICA.md`.
- **Los datos de ejemplo de la demo** (`src/lib/demoStore.js`): los mensajes de ejemplo que «Empresa Demo» escribe a quien denuncia (al menos ocho) tratan de «usted» («Hemos recibido su denuncia…»). Se ven en el canal de ejemplo y en el panel de demostración. Propuesta: pasarlos a «tú» en la fase 2.
- **La palabra «denuncia».** En el audio, tu jefe duda sobre usarla en el nombre del producto (❓ M1). Estas propuestas la mantienen, porque es la que usa hoy todo el producto. Si se decide otra («comunicación», «aviso»), el cambio afecta a unas 150 claves y conviene hacerlo de una vez.

---

## 2. Inventario completo, por zona

### 2.1 Canal: entrada, pasos, enviada y «Mi caso»

219 claves.

| clave | ES actual | ES propuesto | CA propuesto | EN propuesto | motivo |
|---|---|---|---|---|---|
| `canal.quickExit` | Salir rápido | sin cambio | sin cambio | sin cambio | |
| `canal.quickExitShort` | Salir | sin cambio | sin cambio | sin cambio | |
| `canal.exampleNote` | Canal de ejemplo. Lo que envíes aquí no llega a nadie y se borra al cerrar la pestaña. | sin cambio | sin cambio | sin cambio | |
| `canal.privacyTu.datos.dl[0][0]` | Denuncia anónima | legal: no se toca | — | — | |
| `canal.privacyTu.datos.dl[0][1]` | No se recogen datos identificativos. | legal: no se toca | — | — | |
| `canal.privacyTu.datos.dl[1][0]` | Denuncia identificada | legal: no se toca | — | — | |
| `canal.privacyTu.datos.dl[1][1]` | Correo electrónico. El nombre y el teléfono, solo si los das. | legal: no se toca | — | — | |
| `canal.privacyTu.datos.dl[2][0]` | En todos los casos | legal: no se toca | — | — | |
| `canal.privacyTu.datos.dl[2][1]` | Categoría, descripción de los hechos e idioma. Si los aportas, también departamento, fecha, personas implicadas y archivos adjuntos, y los mensajes que intercambies con quien gest… | legal: no se toca | — | — | |
| `canal.privacyTu.derechos.title` | Tus derechos | legal: no se toca | — | — | |
| `canal.privacyTu.derechos.dl[0][0]` | Qué derechos | legal: no se toca | — | — | |
| `canal.privacyTu.derechos.dl[0][1]` | Acceso, rectificación, supresión, limitación, portabilidad y oposición. | legal: no se toca | — | — | |
| `canal.privacyTu.derechos.dl[1][0]` | Cómo ejercerlos | legal: no se toca | — | — | |
| `canal.privacyTu.derechos.dl[1][1]` | Dirígete a {org}. También puedes escribir a info@reportia.es con el asunto «Derechos RGPD» y le haremos llegar la solicitud. | legal: no se toca | — | — | |
| `canal.privacyTu.derechos.dl[2][0]` | Dónde reclamar | legal: no se toca | — | — | |
| `canal.privacyTu.derechos.dl[2][1]` | Ante la Agencia Española de Protección de Datos (aepd.es). | legal: no se toca | — | — | |
| `canal.exManageNote` | Esto es un ejemplo. El panel de verdad se abre al crear el canal de tu empresa. | sin cambio | sin cambio | sin cambio | |
| `canal.exManageCta` | Crear mi canal | sin cambio | sin cambio | sin cambio | |
| `canal.exManageShort` | Crea el canal de tu empresa | sin cambio | sin cambio | sin cambio | |
| `canal.ethics` | Canal ético | sin cambio | sin cambio | sin cambio | |
| `canal.docSent` | Hecho | sin cambio | sin cambio | sin cambio | |
| `canal.docLookup` | Seguimiento | sin cambio | sin cambio | sin cambio | |
| `canal.docCase` | Tu caso | sin cambio | sin cambio | sin cambio | |
| `canal.close` | Cerrar | sin cambio | sin cambio | sin cambio | |
| `canal.back` | Volver | sin cambio | sin cambio | sin cambio | |
| `canal.next` | Continuar | sin cambio | sin cambio | sin cambio | |
| `canal.report` | Denunciar | sin cambio | sin cambio | sin cambio | |
| `canal.reportLead` | Cuenta lo que has visto. Sin nombre, sin crear cuenta y en tres minutos. | **Informa de una infracción o una irregularidad. Puedes hacerlo de forma anónima.** | Informa d’una infracció o una irregularitat. Ho pots fer de manera anònima. | Report a breach or an irregularity. You can do it anonymously. | Frase de venta: «en tres minutos» es una promesa, y son tres frases a golpe de punto (P2, P7) |
| `canal.trust[0]` | Puedes ser anónimo | **(se quita)** | — | — | Etiqueta comercial: tu jefe pide quitarlas (P3) |
| `canal.trust[1]` | Respuesta en 3 meses como máximo | **(se quita)** | — | — | Etiqueta comercial: tu jefe pide quitarlas (P3). Además es la duda 6 del abogado (el plazo se puede ampliar) |
| `canal.trust[2]` | Sin represalias, por ley | **(se quita)** | — | — | Etiqueta comercial: tu jefe pide quitarlas (P3). La prohibición de represalias sigue en «Enviada» y en el pie legal |
| `canal.already` | ¿Ya lo contaste? Mira tu caso | **Consultar mi caso** | Consultar el meu cas | Check my case | Pasa a ser una acción principal (P4): necesita nombre de acción, no una pregunta coloquial |
| `canal.start` | Empezar | **Presentar una denuncia** | Presentar una denúncia | Submit a report | «Empezar» no dice qué empieza; el botón tiene que entenderse solo |
| `canal.startAria` | Empezar a denunciar | **Presentar una denuncia** | Presentar una denúncia | Submit a report | El nombre para lectores de pantalla, igual que el texto visible |
| `canal.manage` | Gestionar | sin cambio | sin cambio | sin cambio | |
| `canal.manageLead` | Para el equipo de {org} que recibe, investiga y responde. | **Acceso para el equipo que gestiona el canal de {org}.** | Accés per a l’equip que gestiona el canal de {org}. | Access for the team that manages the {org} channel. | «Recibe, investiga y responde» es un eslogan en tres tiempos (P2) |
| `canal.manageShort` | Para el equipo de {org} | sin cambio | sin cambio | sin cambio | |
| `canal.manageTrust[0]` | Plazos legales automáticos | **(se quita)** | — | — | Etiqueta comercial: tu jefe pide quitarlas (P3). Se le dice al equipo de la empresa, que ya lo ha contratado (obs. 7) |
| `canal.manageTrust[1]` | Libro-registro al día | **(se quita)** | — | — | Etiqueta comercial: tu jefe pide quitarlas (P3) (obs. 7) |
| `canal.manageTrust[2]` | Solo lo ve quien tú autorices | **(se quita)** | — | — | Etiqueta comercial: tu jefe pide quitarlas (P3) (obs. 7) |
| `canal.twoStep` | Acceso con verificación en dos pasos | sin cambio | sin cambio | sin cambio | |
| `canal.access` | Acceder | sin cambio | sin cambio | sin cambio | |
| `canal.footSystem` | Sistema interno de información de {org} · Ley 2/2023 | legal: no se toca | — | — | |
| `canal.footPrivacy` | Privacidad | sin cambio | sin cambio | sin cambio | |
| `canal.footExt` | Canales externos (AIPI) | sin cambio | sin cambio | sin cambio | |
| `canal.footExtWith` | Canales externos (AIPI, {name}) | sin cambio | sin cambio | sin cambio | |
| `canal.footExtShort` | Canales externos | sin cambio | sin cambio | sin cambio | |
| `canal.footKept` | Qué guardamos y qué no | sin cambio | sin cambio | sin cambio | |
| `canal.footBy` | Con Reportia | **(lo decide tu jefe)** | (lo decide tu jefe) | (lo decide tu jefe) | Marca Reportia fuera del canal (P1): o se queda muy pequeño en el pie o se quita (obs. 8) |
| `canal.law` | Ley 2/2023 | legal: no se toca | — | — | |
| `canal.anonMode` | Modo anónimo | sin cambio | sin cambio | sin cambio | |
| `canal.q1` | ¿Qué ha pasado? | sin cambio | sin cambio | sin cambio | |
| `canal.q1Lead` | Elige lo que más se parezca. Si no lo tienes claro, elige la última. | **Elige el tema que más se acerque. Si dudas, elige «Otra cosa o no lo sé».** | Tria el tema que més s’hi acosti. Si dubtes, tria «Una altra cosa o no ho sé». | Choose the closest topic. If in doubt, choose “Something else, or not sure”. | «La última» obliga a buscarla; mejor nombrarla |
| `canal.q1Group` | Tema de la denuncia | sin cambio | sin cambio | sin cambio | |
| `canal.cats.harassment[0]` | Acoso laboral o sexual | sin cambio | sin cambio | sin cambio | |
| `canal.cats.harassment[1]` | Humillaciones, insinuaciones o contacto no deseado | sin cambio | sin cambio | sin cambio | |
| `canal.cats.fraud[0]` | Fraude o corrupción | sin cambio | sin cambio | sin cambio | |
| `canal.cats.fraud[1]` | Sobornos, facturas falsas o desvío de dinero | sin cambio | sin cambio | sin cambio | |
| `canal.cats.discrimination[0]` | Discriminación | sin cambio | sin cambio | sin cambio | |
| `canal.cats.discrimination[1]` | Trato peor por sexo, origen, edad o religión | sin cambio | sin cambio | sin cambio | |
| `canal.cats.safety[0]` | Seguridad en el trabajo | sin cambio | sin cambio | sin cambio | |
| `canal.cats.safety[1]` | Riesgos sin protección o accidentes ocultados | sin cambio | sin cambio | sin cambio | |
| `canal.cats.data[0]` | Datos personales | sin cambio | sin cambio | sin cambio | |
| `canal.cats.data[1]` | Datos de clientes o de la plantilla mal usados | sin cambio | sin cambio | sin cambio | |
| `canal.cats.conflict[0]` | Conflicto de intereses | sin cambio | sin cambio | sin cambio | |
| `canal.cats.conflict[1]` | Favorecer a familiares o a empresas propias | sin cambio | sin cambio | sin cambio | |
| `canal.cats.accounting[0]` | Cuentas y gastos | sin cambio | sin cambio | sin cambio | |
| `canal.cats.accounting[1]` | Contabilidad maquillada o gastos falsos | **Contabilidad alterada o gastos falsos** | Comptabilitat alterada o despeses falses | Altered accounts or false expenses | «Maquillada» es coloquial (P7) |
| `canal.cats.environmental[0]` | Medio ambiente | sin cambio | sin cambio | sin cambio | |
| `canal.cats.environmental[1]` | Vertidos, residuos o emisiones | sin cambio | sin cambio | sin cambio | |
| `canal.cats.other[0]` | Otra cosa o no lo sé | sin cambio | sin cambio | sin cambio | |
| `canal.cats.other[1]` | Cuéntalo igualmente, ya lo clasificaremos | **Descríbelo y el equipo lo clasificará** | Descriu-ho i l’equip ho classificarà | Describe it and the team will classify it | «Ya lo clasificaremos» suena informal para un tema serio (P7) |
| `canal.q2` | Cuéntalo con tus palabras | **Describe lo ocurrido** | Descriu què ha passat | Describe what happened | «Cuéntalo con tus palabras» es tono de anuncio (P2) |
| `canal.what` | ¿Qué ha pasado? | **Descripción** | Descripció | Description | El título ya hace la pregunta: la etiqueta del campo no la repite |
| `canal.errDescription` | Escribe al menos 20 caracteres para poder continuar. | sin cambio | sin cambio | sin cambio | |
| `canal.help` | Ayuda: | **Conviene indicar qué ocurrió, dónde, cuándo y quién estaba presente.** | Convé indicar què va passar, on, quan i qui hi era present. | It helps to say what happened, where, when and who was present. | Las cuatro etiquetas con ✓ verde parecen un juego (obs. 6): pasa a ser una frase de ayuda |
| `canal.helps[0]` | Qué pasó | **(se quita)** | — | — | Ver canal.help (obs. 6) |
| `canal.helps[1]` | Dónde | **(se quita)** | — | — | Ver canal.help (obs. 6) |
| `canal.helps[2]` | Cuándo | **(se quita)** | — | — | Ver canal.help (obs. 6) |
| `canal.helps[3]` | Quién estaba | **(se quita)** | — | — | Ver canal.help (obs. 6) |
| `canal.helpDone` | ya está | **(se quita)** | — | — | Ver canal.help (obs. 6) |
| `canal.helpTodo` | falta | **(se quita)** | — | — | Ver canal.help (obs. 6) |
| `canal.anonWarn` | Para seguir siendo anónimo, no escribas tu nombre, tu puesto ni detalles que solo sepas tú. | sin cambio | sin cambio | sin cambio | |
| `canal.anonWarnShort` | No escribas tu nombre ni detalles que solo sepas tú. | sin cambio | sin cambio | sin cambio | |
| `canal.ifKnown` | Si lo sabes | sin cambio | sin cambio | sin cambio | |
| `canal.optional` | opcional | sin cambio | sin cambio | sin cambio | |
| `canal.when` | Cuándo | sin cambio | sin cambio | sin cambio | |
| `canal.whenPh` | Por ejemplo, desde septiembre | sin cambio | sin cambio | sin cambio | |
| `canal.where` | Dónde o en qué área | sin cambio | sin cambio | sin cambio | |
| `canal.who` | Personas implicadas | sin cambio | sin cambio | sin cambio | |
| `canal.whoPh` | Nombre o cargo | sin cambio | sin cambio | sin cambio | |
| `canal.proof` | Añadir pruebas | sin cambio | sin cambio | sin cambio | |
| `canal.proofLead` | Fotos, capturas o documentos. Hasta 5 archivos de {mb} MB. | sin cambio | sin cambio | sin cambio | |
| `canal.proofPick` | Elegir archivos | sin cambio | sin cambio | sin cambio | |
| `canal.proofDrop` | o arrástralos aquí | sin cambio | sin cambio | sin cambio | |
| `canal.proofMeta` | Los archivos pueden llevar datos ocultos, como el autor o la ubicación: revísalos si quieres seguir siendo anónimo. En una denuncia anónima no guardamos el nombre del archivo y las fotos se envían sin ubicación ni datos del dispositivo. Los demás archivos (PDF, vídeo, documentos) se envían tal cual. | **De las fotos se quitan la ubicación y los datos del dispositivo. Los demás archivos se envían tal cual: revísalos si quieres mantener el anonimato.** | De les fotos se’n treuen la ubicació i les dades del dispositiu. La resta d’arxius s’envien tal qual: revisa’ls si vols mantenir l’anonimat. | Location and device data are removed from photos. Other files are sent as they are: check them if you want to stay anonymous. | Un párrafo de 60 palabras en letra de 12 px (obs. 5). Dice lo mismo en dos frases; el detalle (nombre del archivo) pasa a «Qué guardamos y qué no». Conviene que el abogado lo dé por bueno |
| `canal.more` | Añadir pruebas o detalles | sin cambio | sin cambio | sin cambio | |
| `canal.q3` | ¿Quieres dar tu nombre? | **¿Quieres identificarte?** | Et vols identificar? | Do you want to identify yourself? | Más preciso: quien se identifica da también el correo, no solo el nombre |
| `canal.anonT` | No, prefiero el anonimato | sin cambio | sin cambio | sin cambio | |
| `canal.recommended` | Recomendado | **(se quita)** | — | — | El canal no debe empujar hacia una opción: el anonimato ya va primero y marcado |
| `canal.anonD` | No guardamos tu nombre, tu correo ni tu teléfono. Seguirás el caso con un código secreto. | sin cambio | sin cambio | sin cambio | |
| `canal.identT` | Sí, con mis datos | sin cambio | sin cambio | sin cambio | |
| `canal.identD` | Solo lo verá quien gestione tu caso, y cada vez que alguien lo mire queda registrado. La ley te protege igual. | sin cambio | sin cambio | sin cambio | |
| `canal.yourData` | Tus datos | sin cambio | sin cambio | sin cambio | |
| `canal.email` | Correo | sin cambio | sin cambio | sin cambio | |
| `canal.name` | Nombre | sin cambio | sin cambio | sin cambio | |
| `canal.phone` | Teléfono | sin cambio | sin cambio | sin cambio | |
| `canal.required` | obligatorio | sin cambio | sin cambio | sin cambio | |
| `canal.errEmail` | Escribe un correo válido. | sin cambio | sin cambio | sin cambio | |
| `canal.meetB` | También quiero explicarlo en persona. | sin cambio | sin cambio | sin cambio | |
| `canal.meetD` | La empresa te propondrá una reunión en un máximo de 7 días. | legal: no se toca | — | — | |
| `canal.review` | Revisa antes de enviar | sin cambio | sin cambio | sin cambio | |
| `canal.rTopic` | Tema | sin cambio | sin cambio | sin cambio | |
| `canal.rTold` | Lo que has contado | sin cambio | sin cambio | sin cambio | |
| `canal.rWhere` | Dónde | sin cambio | sin cambio | sin cambio | |
| `canal.rProof` | Pruebas | sin cambio | sin cambio | sin cambio | |
| `canal.rProof0` | Ninguna | sin cambio | sin cambio | sin cambio | |
| `canal.rProof1` | 1 archivo | sin cambio | sin cambio | sin cambio | |
| `canal.rProofN` | {n} archivos | sin cambio | sin cambio | sin cambio | |
| `canal.rIdentity` | Identidad | sin cambio | sin cambio | sin cambio | |
| `canal.rAnon` | Anónima | sin cambio | sin cambio | sin cambio | |
| `canal.rIdent` | Con tus datos | sin cambio | sin cambio | sin cambio | |
| `canal.rMeeting` | Reunión en persona | sin cambio | sin cambio | sin cambio | |
| `canal.rMeetingYes` | La pides | sin cambio | sin cambio | sin cambio | |
| `canal.change` | Cambiar algo | sin cambio | sin cambio | sin cambio | |
| `canal.consentA` | Creo que lo que cuento es cierto y he leído cómo se tratan los datos en la  | legal: no se toca | — | — | |
| `canal.consentLink` | política de privacidad | legal: no se toca | — | — | |
| `canal.consentZ` | . | legal: no se toca | — | — | |
| `canal.consentErr` | Marca la casilla para poder enviar. | sin cambio | sin cambio | sin cambio | |
| `canal.send` | Enviar denuncia | sin cambio | sin cambio | sin cambio | |
| `canal.sending` | Enviando… | sin cambio | sin cambio | sin cambio | |
| `canal.sendErr` | No se ha podido enviar. Comprueba tu conexión e inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `canal.sendLimit` | Ahora mismo el canal recibe demasiadas comunicaciones. Inténtalo de nuevo dentro de una hora. | sin cambio | sin cambio | sin cambio | |
| `canal.cleanErr` | No podemos quitar los datos ocultos de «{name}» (como la ubicación). Quítala en el paso 2, o conviértela a JPG o hazle una captura de pantalla y vuelve a añadirla. | sin cambio | sin cambio | sin cambio | |
| `canal.filesUploading` | Enviando las pruebas: {n} de {total}… No cierres esta página. | sin cambio | sin cambio | sin cambio | |
| `canal.sentTitle` | Enviada. Guarda tu código. | **Denuncia enviada** | Denúncia enviada | Report submitted | Frases cortas a golpe de punto (P7) |
| `canal.sentLead` | Con él podrás ver la respuesta y hablar con quien lleva tu caso. Es la única forma de volver: no lo podemos recuperar. | **Guarda este código. Es la única forma de consultar la respuesta y de escribir a quien gestiona tu caso, y no se puede recuperar.** | Desa aquest codi. És l’única manera de consultar la resposta i d’escriure a qui gestiona el teu cas, i no es pot recuperar. | Keep this code. It is the only way to see the reply and to write to the person handling your case, and it cannot be recovered. | La instrucción (guardar el código) pasa del título a la primera frase |
| `canal.yourCode` | Tu código secreto | sin cambio | sin cambio | sin cambio | |
| `canal.copy` | Copiar | sin cambio | sin cambio | sin cambio | |
| `canal.copied` | Copiado | sin cambio | sin cambio | sin cambio | |
| `canal.receipt` | Descargar justificante | sin cambio | sin cambio | sin cambio | |
| `canal.print` | Imprimir | sin cambio | sin cambio | sin cambio | |
| `canal.nextT` | Qué pasa ahora | sin cambio | sin cambio | sin cambio | |
| `canal.n1` | Te confirman que la han recibido | sin cambio | sin cambio | sin cambio | |
| `canal.n2` | La investigan | sin cambio | sin cambio | sin cambio | |
| `canal.n2d` | Puede que te hagan preguntas por aquí | sin cambio | sin cambio | sin cambio | |
| `canal.n3` | Te responden | sin cambio | sin cambio | sin cambio | |
| `canal.byDate` | Como tarde el {date} | sin cambio | sin cambio | sin cambio | |
| `canal.noRetaliation` | Nadie puede tomar represalias por haber informado de buena fe (Ley 2/2023). | legal: no se toca | — | — | |
| `canal.finish` | Terminar y salir | sin cambio | sin cambio | sin cambio | |
| `canal.seeCase` | Ver mi caso | sin cambio | sin cambio | sin cambio | |
| `canal.filesFailed1` | La denuncia se ha enviado, pero 1 archivo no se ha podido adjuntar. Puedes explicar qué era en un mensaje desde «Mi caso». | sin cambio | sin cambio | sin cambio | |
| `canal.filesFailedN` | La denuncia se ha enviado, pero {n} archivos no se han podido adjuntar. Puedes explicar qué eran en un mensaje desde «Mi caso». | sin cambio | sin cambio | sin cambio | |
| `canal.savedQ` | ¿Has guardado el código? | sin cambio | sin cambio | sin cambio | |
| `canal.savedText` | No se puede recuperar. Sin él no podrás ver la respuesta ni seguir tu caso. | sin cambio | sin cambio | sin cambio | |
| `canal.savedBack` | Volver al código | sin cambio | sin cambio | sin cambio | |
| `canal.savedGo` | Sí, salir | sin cambio | sin cambio | sin cambio | |
| `canal.leaveQ` | ¿Salir de la denuncia? | sin cambio | sin cambio | sin cambio | |
| `canal.leaveText` | Lo que has escrito no se ha enviado y se perderá. | sin cambio | sin cambio | sin cambio | |
| `canal.leaveStay` | Seguir aquí | sin cambio | sin cambio | sin cambio | |
| `canal.leaveGo` | Salir | sin cambio | sin cambio | sin cambio | |
| `canal.rcTitle` | Justificante de envío | sin cambio | sin cambio | sin cambio | |
| `canal.rcCode` | Código secreto | sin cambio | sin cambio | sin cambio | |
| `canal.rcSent` | Enviada el | sin cambio | sin cambio | sin cambio | |
| `canal.rcUrl` | Sigue tu caso en | sin cambio | sin cambio | sin cambio | |
| `canal.rcKeep` | Guarda este documento en un lugar seguro. El código no se puede recuperar. | sin cambio | sin cambio | sin cambio | |
| `canal.caseTitle` | Mira tu caso | **Consultar mi caso** | Consultar el meu cas | Check my case | El mismo nombre que el botón de la entrada |
| `canal.caseLead` | Escribe el código secreto de 8 caracteres que recibiste al enviarla. | **Escribe el código de 8 caracteres que recibiste al enviar la denuncia.** | Escriu el codi de 8 caràcters que vas rebre en enviar la denúncia. | Enter the 8-character code you received when you submitted the report. | «Al enviarla» no dice qué: esta pantalla se abre sin contexto |
| `canal.code` | Tu código | sin cambio | sin cambio | sin cambio | |
| `canal.seeing` | Buscando… | sin cambio | sin cambio | sin cambio | |
| `canal.lostB` | ¿Lo has perdido? | sin cambio | sin cambio | sin cambio | |
| `canal.lostD` | Por seguridad no se puede recuperar. Puedes enviar una nueva denuncia y decir que es sobre la anterior. | sin cambio | sin cambio | sin cambio | |
| `canal.codeErr` | No hemos podido abrir ningún caso con ese código. Revisa que esté bien escrito. | sin cambio | sin cambio | sin cambio | |
| `canal.codeBusy` | Ahora hay demasiados intentos con códigos que no existen. Espera unos minutos e inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `canal.codeShort` | El código tiene 8 caracteres. Revisa que lo has escrito entero. | sin cambio | sin cambio | sin cambio | |
| `canal.yourCase` | Tu caso · {code} | sin cambio | sin cambio | sin cambio | |
| `canal.st.sent` | Enviada. Aún no la han abierto | **Enviada, pendiente de revisión** | Enviada, pendent de revisió | Submitted, awaiting review | Frases cortas a golpe de punto (P7) |
| `canal.st.received` | La han recibido | **Recibida** | Rebuda | Received | Es el título de «Mi caso»: un estado, no una frase |
| `canal.st.investigating` | La están investigando | **En investigación** | En investigació | Under investigation | Es el título de «Mi caso»: un estado, no una frase |
| `canal.st.answered` | Te han respondido | **Respondida** | Amb resposta | Answered | Es el título de «Mi caso»: un estado, no una frase |
| `canal.st.closed` | Caso cerrado | sin cambio | sin cambio | sin cambio | |
| `canal.tl[0]` | Enviada | sin cambio | sin cambio | sin cambio | |
| `canal.tl[1]` | Recibida por la empresa | sin cambio | sin cambio | sin cambio | |
| `canal.tl[2]` | Investigando | sin cambio | sin cambio | sin cambio | |
| `canal.tl[3]` | Respuesta | sin cambio | sin cambio | sin cambio | |
| `canal.tlLabel` | Cómo va tu caso | sin cambio | sin cambio | sin cambio | |
| `canal.now` | Ahora | sin cambio | sin cambio | sin cambio | |
| `canal.pending` | Pendiente | sin cambio | sin cambio | sin cambio | |
| `canal.tlDone` | hecho | sin cambio | sin cambio | sin cambio | |
| `canal.tlNow` | ahora | sin cambio | sin cambio | sin cambio | |
| `canal.tlNext` | pendiente | sin cambio | sin cambio | sin cambio | |
| `canal.meetQ` | ¿Prefieres explicarlo en persona? | sin cambio | sin cambio | sin cambio | |
| `canal.meetAsk` | Pide una reunión | sin cambio | sin cambio | sin cambio | |
| `canal.meetAsking` | Pidiéndola… | sin cambio | sin cambio | sin cambio | |
| `canal.meetAsked` | Has pedido una reunión en persona. La empresa tiene 7 días para proponértela; te escribirá por aquí. | legal: no se toca | — | — | |
| `canal.meetErr` | No se ha podido pedir la reunión. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `canal.msgs` | Mensajes | sin cambio | sin cambio | sin cambio | |
| `canal.msgsNote` | Solo los lee quien gestiona tu caso | sin cambio | sin cambio | sin cambio | |
| `canal.msgEmpty` | Todavía no hay mensajes. Cuando te escriban, lo verás aquí. | sin cambio | sin cambio | sin cambio | |
| `canal.msgLoadErr` | No se han podido cargar los mensajes. | sin cambio | sin cambio | sin cambio | |
| `canal.msgErr` | No se ha podido enviar el mensaje. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `canal.msgTip` | Si quieres seguir siendo anónimo, no escribas datos que te identifiquen. | sin cambio | sin cambio | sin cambio | |
| `canal.waiting` | Están esperando tu respuesta. Escríbela aquí abajo. | **El equipo espera tu respuesta. Puedes escribirla abajo.** | L’equip espera la teva resposta. La pots escriure a sota. | The team is waiting for your reply. You can write it below. | Tono: aviso, no orden |
| `canal.closedOn` | Caso cerrado el {date}. | sin cambio | sin cambio | sin cambio | |
| `canal.closedNoDate` | Caso cerrado. | sin cambio | sin cambio | sin cambio | |
| `canal.closedMore` | La respuesta está en los mensajes. Si tienes algo nuevo, puedes escribir aquí o enviar una nueva denuncia. | legal: no se toca | — | — | |
| `canal.hidden` | Por confidencialidad, aquí no se muestra lo que contaste. | sin cambio | sin cambio | sin cambio | |
| `canal.leaveCase` | Salir de mi caso | sin cambio | sin cambio | sin cambio | |
| `canal.moreCase` | Más opciones | sin cambio | sin cambio | sin cambio | |
| `canal.caseMenu` | Tu caso | sin cambio | sin cambio | sin cambio | |
| `canal.nfTitle` | Este canal no existe | sin cambio | sin cambio | sin cambio | |
| `canal.loadErrT` | No se ha podido abrir el canal | sin cambio | sin cambio | sin cambio | |
| `canal.loadErrD` | Comprueba tu conexión e inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `canal.retry` | Volver a intentarlo | sin cambio | sin cambio | sin cambio | |
| `canal.nfText` | Revisa la dirección. Si sigue sin funcionar, pide el enlace correcto en tu empresa. | sin cambio | sin cambio | sin cambio | |
| `canal.nfHome` | Ir a Reportia | **(se quita)** | — | — | Marca Reportia fuera del canal (P1): un canal que no existe no debe llevar a la web comercial |
| `canal.nfCompany` | ¿Tienes una empresa? | **(se quita)** | — | — | Venta dentro del canal (P1, P2) |
| `canal.nfCreate` | Crea su canal | **(se quita)** | — | — | Venta dentro del canal (P1, P2) |
| `canal.backToChannel` | Volver al canal | sin cambio | sin cambio | sin cambio | |

### 2.2 Piezas comunes del canal y del panel (plazos, tablero, conversación)

36 claves.

| clave | ES actual | ES propuesto | CA propuesto | EN propuesto | motivo |
|---|---|---|---|---|---|
| `ds.stepOf` | Paso {n} de {total} | sin cambio | sin cambio | sin cambio | |
| `ds.today` | Hoy | sin cambio | sin cambio | sin cambio | |
| `ds.meeting` | Pide reunión | sin cambio | sin cambio | sin cambio | |
| `ds.wrote` | Te ha escrito | sin cambio | sin cambio | sin cambio | |
| `ds.offline` | Sin conexión. Hasta que vuelva, lo que hagas no se enviará ni se guardará. | sin cambio | sin cambio | sin cambio | |
| `ds.prioHigh` | Alta | sin cambio | sin cambio | sin cambio | |
| `ds.prioCritical` | Crítica | sin cambio | sin cambio | sin cambio | |
| `ds.ackMany` | {n} días para acusar recibo | sin cambio | sin cambio | sin cambio | |
| `ds.ackOne` | 1 día para acusar recibo | sin cambio | sin cambio | sin cambio | |
| `ds.ackToday` | Acuse: vence hoy | sin cambio | sin cambio | sin cambio | |
| `ds.ackShortMany` | {n} días para acusar | sin cambio | sin cambio | sin cambio | |
| `ds.ackShortOne` | 1 día para acusar | sin cambio | sin cambio | sin cambio | |
| `ds.ackOverMany` | Acuse vencido hace {n} días | sin cambio | sin cambio | sin cambio | |
| `ds.ackOverOne` | Acuse vencido ayer | sin cambio | sin cambio | sin cambio | |
| `ds.respMany` | {n} días para responder | sin cambio | sin cambio | sin cambio | |
| `ds.respOne` | 1 día para responder | sin cambio | sin cambio | sin cambio | |
| `ds.respToday` | Respuesta: vence hoy | sin cambio | sin cambio | sin cambio | |
| `ds.respFar` | {n} días | sin cambio | sin cambio | sin cambio | |
| `ds.respOverMany` | Respuesta vencida hace {n} días | sin cambio | sin cambio | sin cambio | |
| `ds.respOverOne` | Respuesta vencida ayer | sin cambio | sin cambio | sin cambio | |
| `ds.meetMany` | {n} días para la reunión | sin cambio | sin cambio | sin cambio | |
| `ds.meetOne` | 1 día para la reunión | sin cambio | sin cambio | sin cambio | |
| `ds.meetToday` | Reunión: vence hoy | sin cambio | sin cambio | sin cambio | |
| `ds.meetOverMany` | Reunión vencida hace {n} días | sin cambio | sin cambio | sin cambio | |
| `ds.meetOverOne` | Reunión vencida ayer | sin cambio | sin cambio | sin cambio | |
| `ds.onTime` | Respondida a tiempo | sin cambio | sin cambio | sin cambio | |
| `ds.late` | Respondida fuera de plazo | sin cambio | sin cambio | sin cambio | |
| `ds.erased` | Datos suprimidos | sin cambio | sin cambio | sin cambio | |
| `ds.moveTo` | Mover a «{col}» | sin cambio | sin cambio | sin cambio | |
| `ds.colEmpty` | Aquí no hay nada | **Sin casos** | Sense casos | No cases | «Aquí no hay nada» es coloquial |
| `ds.boardTabs` | Columnas del tablero | sin cambio | sin cambio | sin cambio | |
| `ds.navLabel` | Panel | sin cambio | sin cambio | sin cambio | |
| `ds.chatYou` | Tú | sin cambio | sin cambio | sin cambio | |
| `ds.chatWrite` | Escribe un mensaje | sin cambio | sin cambio | sin cambio | |
| `ds.chatSend` | Enviar mensaje | sin cambio | sin cambio | sin cambio | |
| `ds.chatLabel` | Mensajes | sin cambio | sin cambio | sin cambio | |

### 2.3 Canal: pie, canales externos y «Qué guardamos y qué no» (sección v2)

92 claves.

| clave | ES actual | ES propuesto | CA propuesto | EN propuesto | motivo |
|---|---|---|---|---|---|
| `v2.skip` | Ir al contenido | sin cambio | sin cambio | sin cambio | |
| `v2.channelName` | Canal de denuncias | sin cambio | sin cambio | sin cambio | |
| `v2.stripSystem` | Sistema interno de información | sin cambio | sin cambio | sin cambio | |
| `v2.stripConform` | conforme a la | sin cambio | sin cambio | sin cambio | |
| `v2.lawShort` | Ley 2/2023 | legal: no se toca | — | — | |
| `v2.quickExit` | Salir rápidamente | sin cambio | sin cambio | sin cambio | |
| `v2.exampleBack` | Volver a Reportia | sin cambio | sin cambio | sin cambio | |
| `v2.exampleNote` | Canal de ejemplo. Lo que envíe aquí no llega a nadie y se borra al cerrar la pestaña. | sin cambio | sin cambio | sin cambio | |
| `v2.langGroup` | Idioma | sin cambio | sin cambio | sin cambio | |
| `v2.euFlag` | Bandera de la Unión Europea | sin cambio | sin cambio | sin cambio | |
| `v2.footerSecure` | Conexión cifrada (HTTPS) | sin cambio | sin cambio | sin cambio | |
| `v2.footerLaw` | Ley 2/2023 en el BOE | legal: no se toca | — | — | |
| `v2.privacy` | Política de privacidad | sin cambio | sin cambio | sin cambio | |
| `v2.loading` | Cargando… | sin cambio | sin cambio | sin cambio | |
| `v2.notFoundTitle` | Canal no encontrado | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.notFoundDoc` | Canal no encontrado · Reportia | sin cambio | sin cambio | sin cambio | |
| `v2.title` | Canal de denuncias | sin cambio | sin cambio | sin cambio | |
| `v2.promise` | Puede denunciar sin dar su nombre. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.lead` | Es el canal interno de {org} para informar de fraude, acoso u otras infracciones. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.tipTitle` | Antes de empezar. | sin cambio | sin cambio | sin cambio | |
| `v2.tipText` | Para mayor privacidad, utiliza un dispositivo y una conexión que no sean de la empresa. | legal: no se toca | — | — | |
| `v2.fichaTitle` | Así consta una denuncia anónima | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.fichaSub` | Lo que se guarda y lo que no. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.fName` | Nombre y apellidos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.fEmail` | Correo electrónico | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.fPhone` | Teléfono | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.notStored` | No se registra | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.stored` | Se registra | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.ifProvided` | Solo si los aportas | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.fFacts` | Categoría y descripción de los hechos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.fOptional` | Departamento, fecha, personas implicadas y documentos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.fLang` | Idioma de la denuncia | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.fCode` | Código de seguimiento | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.fCodeNote` | Ejemplo. Se genera al enviarla. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.deadline` | La Ley 2/2023 establece un plazo máximo de tres meses para responder. | legal: no se toca | — | — | |
| `v2.legalTitle` | Marco legal | legal: no se toca | — | — | |
| `v2.legalText` | Este canal es el sistema interno de información de {org} y se rige por la Ley 2/2023. La ley prohíbe las represalias contra quien informa de una infracción con motivos razonables… | legal: no se toca | — | — | |
| `v2.extTitle` | También puedes acudir a una autoridad | legal: no se toca | — | — | |
| `v2.extText` | Usar este canal no te impide informar ante una autoridad externa. Puedes hacerlo además de este canal o en su lugar. | legal: no se toca | — | — | |
| `v2.ext1t` | Autoridad Independiente de Protección del Informante | legal: no se toca | — | — | |
| `v2.ext1d` | Canal externo de ámbito estatal. | legal: no se toca | — | — | |
| `v2.ext2d` | Autoridad autonómica, competente cuando los hechos afectan solo a su comunidad. | legal: no se toca | — | — | |
| `v2.extOpens` | (se abre en una pestaña nueva) | legal: no se toca | — | — | |
| `v2.ref1t` | Ley 2/2023, de 20 de febrero | legal: no se toca | — | — | |
| `v2.ref1d` | Protección de las personas que informen sobre infracciones normativas y de lucha contra la corrupción. | legal: no se toca | — | — | |
| `v2.ref2t` | Directiva (UE) 2019/1937 | legal: no se toca | — | — | |
| `v2.ref2d` | Protección de las personas que informen sobre infracciones del Derecho de la Unión. | legal: no se toca | — | — | |
| `v2.ref3t` | Reglamento (UE) 2016/679 (RGPD) | legal: no se toca | — | — | |
| `v2.ref3d` | Protección de datos personales. | legal: no se toca | — | — | |
| `v2.stepOf` | Paso {n} de {total} | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.progress` | Progreso de la denuncia | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.back` | Volver | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.next` | Continuar | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.recommended` | Recomendada | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.anonWarn` | Para proteger su anonimato, no escriba en la descripción datos que permitan identificarle. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2.yourData` | Sus datos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.category` | Tipo de infracción | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.department` | Empresa o departamento afectado | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.description` | Descripción de los hechos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.incidentDate` | Fecha aproximada | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.involved` | Personas implicadas | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.errDescription` | La descripción debe tener al menos 20 caracteres. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.errEmail` | Escriba un correo electrónico válido. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2.pick` | Seleccionar archivos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.drop` | o arrástrelos aquí | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.limits` | Hasta 5 archivos de {mb} MB como máximo cada uno. PDF, imágenes, vídeo, audio y documentos de oficina. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.remove` | Quitar {name} | sin cambio | sin cambio | sin cambio | |
| `v2.skipped` | Estos archivos no se han añadido: | sin cambio | sin cambio | sin cambio | |
| `v2.rejType` | tipo no admitido | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.rejEmpty` | archivo vacío | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.rejSize` | supera los {mb} MB | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.rejMax` | ya hay 5 archivos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.rejDup` | ya está en la lista | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.errDate` | Escriba una fecha válida que no sea posterior a hoy. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2.backToChannel` | Volver al canal | sin cambio | sin cambio | sin cambio | |
| `v2.edit` | Editar | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.none` | Sin indicar | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.consent` | Tengo motivos razonables para creer que la información es veraz y he leído la política de privacidad. | legal: no se toca | — | — | |
| `v2.consentErr` | Debe aceptar la declaración para enviar la denuncia. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2.verifying` | Verificación de seguridad | sin cambio | sin cambio | sin cambio | |
| `v2.submit` | Enviar denuncia | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.submitting` | Enviando… | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.submitError` | No se ha podido enviar. Compruebe su conexión e inténtelo de nuevo. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2.copy` | Copiar código | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.copied` | Copiado | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.download` | Descargar justificante | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.tlDone` | hecho | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.tlNow` | estado actual | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.tlNext` | pendiente | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.msgEmpty` | Todavía no hay mensajes. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2.msgPh` | Escriba su mensaje | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2.msgErr` | No se ha podido enviar el mensaje. Inténtelo de nuevo. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |

### 2.4 Panel

605 claves.

| clave | ES actual | ES propuesto | CA propuesto | EN propuesto | motivo |
|---|---|---|---|---|---|
| `panel.viewChannel` | Ver el canal | sin cambio | sin cambio | sin cambio | |
| `panel.viewChannelAria` | Ver el canal público (se abre en otra pestaña) | sin cambio | sin cambio | sin cambio | |
| `panel.nav.board` | Tablero | sin cambio | sin cambio | sin cambio | |
| `panel.nav.report` | Informe | sin cambio | sin cambio | sin cambio | |
| `panel.nav.share` | Compartir el canal | sin cambio | sin cambio | sin cambio | |
| `panel.nav.shareShort` | Compartir | sin cambio | sin cambio | sin cambio | |
| `panel.nav.settings` | Equipo y ajustes | sin cambio | sin cambio | sin cambio | |
| `panel.nav.settingsShort` | Ajustes | sin cambio | sin cambio | sin cambio | |
| `panel.navLabel` | Panel | sin cambio | sin cambio | sin cambio | |
| `panel.search` | Buscar | sin cambio | sin cambio | sin cambio | |
| `panel.register` | Registrar caso | sin cambio | sin cambio | sin cambio | |
| `panel.account` | Tu cuenta | sin cambio | sin cambio | sin cambio | |
| `panel.language` | Idioma | sin cambio | sin cambio | sin cambio | |
| `panel.logout` | Cerrar sesión | sin cambio | sin cambio | sin cambio | |
| `panel.demoChip` | Demo | sin cambio | sin cambio | sin cambio | |
| `panel.demoLong` | Datos de demostración: nada de lo que ves es real | sin cambio | sin cambio | sin cambio | |
| `panel.loading` | Cargando… | sin cambio | sin cambio | sin cambio | |
| `panel.close` | Cerrar | sin cambio | sin cambio | sin cambio | |
| `panel.cancel` | Cancelar | sin cambio | sin cambio | sin cambio | |
| `panel.save` | Guardar | sin cambio | sin cambio | sin cambio | |
| `panel.saving` | Guardando… | sin cambio | sin cambio | sin cambio | |
| `panel.saved` | Guardado. | sin cambio | sin cambio | sin cambio | |
| `panel.saveErr` | No se ha podido guardar. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.retry` | Reintentar | sin cambio | sin cambio | sin cambio | |
| `panel.searchTitle` | Buscar un caso | sin cambio | sin cambio | sin cambio | |
| `panel.searchPh` | Referencia o texto | sin cambio | sin cambio | sin cambio | |
| `panel.searchHint` | Busca por la referencia (REF-…) o por palabras del título, del tema o de lo que contó. | sin cambio | sin cambio | sin cambio | |
| `panel.searchNone` | Ningún caso coincide. | sin cambio | sin cambio | sin cambio | |
| `panel.searchErr` | No se han podido cargar los casos. Cierra y vuelve a abrir la búsqueda. | sin cambio | sin cambio | sin cambio | |
| `panel.searchOne` | 1 caso | sin cambio | sin cambio | sin cambio | |
| `panel.searchMany` | {n} casos | sin cambio | sin cambio | sin cambio | |
| `panel.manage` | Gestionar | sin cambio | sin cambio | sin cambio | |
| `panel.accessLead` | Entra con tu correo de {org}. | sin cambio | sin cambio | sin cambio | |
| `panel.accessLeadNoOrg` | Entra con tu correo de trabajo. | sin cambio | sin cambio | sin cambio | |
| `panel.email` | Correo | sin cambio | sin cambio | sin cambio | |
| `panel.password` | Contraseña | sin cambio | sin cambio | sin cambio | |
| `panel.showPw` | Mostrar la contraseña | sin cambio | sin cambio | sin cambio | |
| `panel.hidePw` | Ocultar la contraseña | sin cambio | sin cambio | sin cambio | |
| `panel.enter` | Entrar | sin cambio | sin cambio | sin cambio | |
| `panel.entering` | Entrando… | sin cambio | sin cambio | sin cambio | |
| `panel.forgot` | He olvidado la contraseña | sin cambio | sin cambio | sin cambio | |
| `panel.thenCode` | Después, el código de 6 cifras de tu app | **Después se pide el código de 6 cifras de la app de verificación.** | Després es demana el codi de 6 xifres de l’app de verificació. | Next you will be asked for the 6-digit code from your authenticator app. | Frase sin verbo |
| `panel.wrongA` | ¿Quieres presentar una denuncia? Usa el lado  | sin cambio | sin cambio | sin cambio | |
| `panel.wrongB` | Denunciar | sin cambio | sin cambio | sin cambio | |
| `panel.wrongC` | . Desde aquí no se pueden enviar. | sin cambio | sin cambio | sin cambio | |
| `panel.noChannel` | ¿Tu empresa aún no tiene canal? | **(se quita)** | — | — | Venta de Reportia dentro del acceso de un cliente (P1) |
| `panel.createFree` | Créalo gratis 30 días | **(se quita)** | — | — | Venta de Reportia dentro del acceso de un cliente (P1) |
| `panel.byReportia` | Con Reportia | **(lo decide tu jefe)** | (lo decide tu jefe) | (lo decide tu jefe) | En el panel, Reportia sí puede firmar; cómo, depende de la propuesta de identidad |
| `panel.report` | Denunciar | sin cambio | sin cambio | sin cambio | |
| `panel.reportAria` | Ir al lado Denunciar | sin cambio | sin cambio | sin cambio | |
| `panel.home` | Reportia | sin cambio | sin cambio | sin cambio | |
| `panel.homeAria` | Ir a la portada de Reportia | sin cambio | sin cambio | sin cambio | |
| `panel.codeTitle` | Un último paso | **Verificación en dos pasos** | Verificació en dos passos | Two-step verification | «Un último paso» es tono de app de consumo |
| `panel.codeLead` | Escribe el código de 6 cifras de tu app de verificación (Google Authenticator, 1Password…). | sin cambio | sin cambio | sin cambio | |
| `panel.codeGroup` | Código de verificación | sin cambio | sin cambio | sin cambio | |
| `panel.digit` | Cifra {n} | sin cambio | sin cambio | sin cambio | |
| `panel.codeBack` | Volver | sin cambio | sin cambio | sin cambio | |
| `panel.noPhone` | No tengo el móvil a mano | sin cambio | sin cambio | sin cambio | |
| `panel.noPhoneText` | Si pierdes el móvil, pide a un administrador de tu empresa o a Reportia que te restablezca la verificación en dos pasos. | sin cambio | sin cambio | sin cambio | |
| `panel.codeErr` | El código no es correcto. Prueba con el siguiente que te dé la app. | sin cambio | sin cambio | sin cambio | |
| `panel.codeDemo` | En la demostración vale cualquier código de 6 cifras. | sin cambio | sin cambio | sin cambio | |
| `panel.errEmail` | Escribe un correo válido. | sin cambio | sin cambio | sin cambio | |
| `panel.errPassword` | Escribe tu contraseña. | sin cambio | sin cambio | sin cambio | |
| `panel.errCaptcha` | Espera a que termine la comprobación de seguridad. | sin cambio | sin cambio | sin cambio | |
| `panel.idleOut` | Se ha cerrado la sesión tras 30 minutos sin actividad. | sin cambio | sin cambio | sin cambio | |
| `panel.errLogin` | El correo o la contraseña no son correctos. | sin cambio | sin cambio | sin cambio | |
| `panel.errConfirm` | Antes confirma tu correo: te enviamos un enlace al crear la cuenta. | sin cambio | sin cambio | sin cambio | |
| `panel.errRate` | Demasiados intentos. Espera unos minutos e inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.errGeneric` | No se ha podido entrar. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.hello` | Hola, {name} | **(se quita)** | — | — | Saludo «simpático» en un tema serio (obs. 12) |
| `panel.needN` | {n} casos te necesitan hoy | **{n} casos requieren una acción hoy** | {n} casos requereixen una acció avui | {n} cases need action today | «Te necesitan» personifica los casos (obs. 12). El título de la pantalla pasa a ser «Tablero» y esto, su subtítulo |
| `panel.need1` | 1 caso te necesita hoy | **1 caso requiere una acción hoy** | 1 cas requereix una acció avui | 1 case needs action today | Igual que panel.needN |
| `panel.need0` | Todo al día | **Ningún caso requiere una acción hoy** | Cap cas requereix una acció avui | No cases need action today | «Todo al día» es coloquial (obs. 12) |
| `panel.cols.new` | Nuevas | sin cambio | sin cambio | sin cambio | |
| `panel.cols.open` | En curso | sin cambio | sin cambio | sin cambio | |
| `panel.cols.closed` | Cerradas | sin cambio | sin cambio | sin cambio | |
| `panel.colEmpty.new` | Ninguna nueva. | sin cambio | sin cambio | sin cambio | |
| `panel.colEmpty.open` | Nada en curso. | sin cambio | sin cambio | sin cambio | |
| `panel.colEmpty.closed` | Ninguna cerrada. | sin cambio | sin cambio | sin cambio | |
| `panel.seeMore` | Ver {n} más (de {total}) | sin cambio | sin cambio | sin cambio | |
| `panel.seeLess` | Ver menos | sin cambio | sin cambio | sin cambio | |
| `panel.filter` | Filtrar | sin cambio | sin cambio | sin cambio | |
| `panel.filters` | Filtros | sin cambio | sin cambio | sin cambio | |
| `panel.clearFilters` | Quitar filtros | sin cambio | sin cambio | sin cambio | |
| `panel.done` | Listo | sin cambio | sin cambio | sin cambio | |
| `panel.fCategory` | Tema | sin cambio | sin cambio | sin cambio | |
| `panel.fPriority` | Prioridad | sin cambio | sin cambio | sin cambio | |
| `panel.fStatus` | Estado | sin cambio | sin cambio | sin cambio | |
| `panel.fDeadline` | Plazo | sin cambio | sin cambio | sin cambio | |
| `panel.fMine` | Solo los míos | sin cambio | sin cambio | sin cambio | |
| `panel.fFrom` | Recibidas desde | sin cambio | sin cambio | sin cambio | |
| `panel.fTo` | Hasta | sin cambio | sin cambio | sin cambio | |
| `panel.any` | Todos | sin cambio | sin cambio | sin cambio | |
| `panel.anyF` | Todas | sin cambio | sin cambio | sin cambio | |
| `panel.dlSoon` | Próximos a vencer | sin cambio | sin cambio | sin cambio | |
| `panel.dlOverdue` | Vencidos | sin cambio | sin cambio | sin cambio | |
| `panel.more` | Más acciones | sin cambio | sin cambio | sin cambio | |
| `panel.exportXls` | Libro-registro (Excel) | sin cambio | sin cambio | sin cambio | |
| `panel.exportPdf` | Informe en PDF | sin cambio | sin cambio | sin cambio | |
| `panel.exportErr` | No se ha podido exportar. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.emptyTitle` | Todavía no ha llegado ninguna denuncia | sin cambio | sin cambio | sin cambio | |
| `panel.emptyText` | Cuando alguien use el canal de {org}, aparecerá aquí con sus plazos. | sin cambio | sin cambio | sin cambio | |
| `panel.shareCta` | Compartir el canal | sin cambio | sin cambio | sin cambio | |
| `panel.emptyFiltered` | Ningún caso con estos filtros. | sin cambio | sin cambio | sin cambio | |
| `panel.loadErr` | No se han podido cargar los casos. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.ret1` | 1 caso debe suprimirse | sin cambio | sin cambio | sin cambio | |
| `panel.retN` | {n} casos deben suprimirse | sin cambio | sin cambio | sin cambio | |
| `panel.retText` | Han pasado 3 meses sin iniciar la investigación, o 10 años desde que llegaron (arts. 32.4 y 26.2 de la Ley 2/2023). Ábrelos y suprime sus datos. | legal: no se toca | — | — | |
| `panel.anon` | Anónima | sin cambio | sin cambio | sin cambio | |
| `panel.ident` | Con datos | sin cambio | sin cambio | sin cambio | |
| `panel.today` | hoy | sin cambio | sin cambio | sin cambio | |
| `panel.yesterday` | ayer | sin cambio | sin cambio | sin cambio | |
| `panel.daysAgo` | hace {n} días | sin cambio | sin cambio | sin cambio | |
| `panel.suppressed` | Datos suprimidos | sin cambio | sin cambio | sin cambio | |
| `panel.back` | Tablero | sin cambio | sin cambio | sin cambio | |
| `panel.received` | recibida {when} por {via} | sin cambio | sin cambio | sin cambio | |
| `panel.via.web` | el canal web | sin cambio | sin cambio | sin cambio | |
| `panel.via.phone` | teléfono | sin cambio | sin cambio | sin cambio | |
| `panel.via.in_person` | una reunión en persona | sin cambio | sin cambio | sin cambio | |
| `panel.via.mail` | correo postal | sin cambio | sin cambio | sin cambio | |
| `panel.via.email` | correo electrónico | sin cambio | sin cambio | sin cambio | |
| `panel.via.other` | otra vía | sin cambio | sin cambio | sin cambio | |
| `panel.editTitle` | Cambiar el título | sin cambio | sin cambio | sin cambio | |
| `panel.titleLabel` | Título del caso | sin cambio | sin cambio | sin cambio | |
| `panel.titleHelp` | Solo lo ve tu equipo. Nunca se le muestra a quien informa. | sin cambio | sin cambio | sin cambio | |
| `panel.prioChip.low` | Prioridad baja | sin cambio | sin cambio | sin cambio | |
| `panel.prioChip.high` | Prioridad alta | sin cambio | sin cambio | sin cambio | |
| `panel.prioChip.critical` | Prioridad crítica | sin cambio | sin cambio | sin cambio | |
| `panel.askMeeting` | Pide reunión presencial | sin cambio | sin cambio | sin cambio | |
| `panel.waitingChip` | Esperando a quien informa | sin cambio | sin cambio | sin cambio | |
| `panel.archivedChip` | Archivada | sin cambio | sin cambio | sin cambio | |
| `panel.fiscalChip` | Remitida al Ministerio Fiscal | legal: no se toca | — | — | |
| `panel.extendedChip` | Plazo ampliado | sin cambio | sin cambio | sin cambio | |
| `panel.exportOne` | Exportar PDF | sin cambio | sin cambio | sin cambio | |
| `panel.steps[0]` | Recibida | sin cambio | sin cambio | sin cambio | |
| `panel.steps[1]` | Acuse enviado | sin cambio | sin cambio | sin cambio | |
| `panel.steps[2]` | Investigando | sin cambio | sin cambio | sin cambio | |
| `panel.steps[3]` | Respondida | sin cambio | sin cambio | sin cambio | |
| `panel.stepsLabel` | Estado del caso | sin cambio | sin cambio | sin cambio | |
| `panel.next` | Siguiente paso | sin cambio | sin cambio | sin cambio | |
| `panel.meetLegal` | plazo legal: 7 días | legal: no se toca | — | — | |
| `panel.ackDoneOn` | Acuse enviado el {date} | sin cambio | sin cambio | sin cambio | |
| `panel.closedOn` | Cerrada el {date} | sin cambio | sin cambio | sin cambio | |
| `panel.respondedOn` | Respondida el {date} | sin cambio | sin cambio | sin cambio | |
| `panel.n1` | Enviar el acuse de recibo | sin cambio | sin cambio | sin cambio | |
| `panel.n2a` | Proponer la reunión | sin cambio | sin cambio | sin cambio | |
| `panel.n2b` | Marcar la reunión como hecha | sin cambio | sin cambio | sin cambio | |
| `panel.n3` | Iniciar la investigación | sin cambio | sin cambio | sin cambio | |
| `panel.n4` | Responder y cerrar | sin cambio | sin cambio | sin cambio | |
| `panel.noPerm` | No tienes permiso para dar este paso. | sin cambio | sin cambio | sin cambio | |
| `panel.ackTitle` | Acuse de recibo | sin cambio | sin cambio | sin cambio | |
| `panel.ackText` | Es el primer mensaje que verá quien informa. Puedes cambiarlo antes de enviarlo. El caso pasará a «En curso». | sin cambio | sin cambio | sin cambio | |
| `panel.ackLabel` | Mensaje | sin cambio | sin cambio | sin cambio | |
| `panel.ackSend` | Enviar el acuse | sin cambio | sin cambio | sin cambio | |
| `panel.ackSent` | Acuse enviado. El caso está en curso. | sin cambio | sin cambio | sin cambio | |
| `panel.ackErr` | No se ha podido enviar el acuse. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.ackPartial` | El acuse ya se ha enviado, pero el caso no ha pasado a «En curso». Inténtalo de nuevo: no se volverá a enviar. | sin cambio | sin cambio | sin cambio | |
| `panel.closePartial` | La respuesta ya se ha enviado, pero el caso no se ha cerrado. Inténtalo de nuevo: no se volverá a enviar. | sin cambio | sin cambio | sin cambio | |
| `panel.ackTpl` | Hola. Hemos recibido tu denuncia y ya la estamos revisando. Te responderemos por aquí: puedes volver cuando quieras con tu código. | **Hemos recibido tu denuncia y la estamos revisando. Te responderemos por este canal. Puedes consultar su estado en cualquier momento con tu código.** | Hem rebut la teva denúncia i l’estem revisant. Et respondrem per aquest canal. Pots consultar-ne l’estat en qualsevol moment amb el teu codi. | We have received your report and are reviewing it. We will reply through this channel. You can check its status at any time with your code. | Es el primer mensaje que lee quien denuncia: más formal, sin «Hola.» suelto |
| `panel.meetTpl` | Hemos visto que prefieres explicarlo en persona. Te proponemos reunirnos el [día] a las [hora] en [lugar]. Si no te va bien, dinos qué otro momento prefieres. | sin cambio | sin cambio | sin cambio | |
| `panel.invOk` | Investigación iniciada. | sin cambio | sin cambio | sin cambio | |
| `panel.closeTitle` | Responder y cerrar | sin cambio | sin cambio | sin cambio | |
| `panel.closeText` | Elige el resultado y escribe la respuesta final. Es lo último que verá quien informa, y el caso pasará a «Cerradas». | sin cambio | sin cambio | sin cambio | |
| `panel.outcome` | Resultado | sin cambio | sin cambio | sin cambio | |
| `panel.outcomes.none` | Sin decidir | sin cambio | sin cambio | sin cambio | |
| `panel.outcomes.founded` | Fundada | sin cambio | sin cambio | sin cambio | |
| `panel.outcomes.unfounded` | No fundada | sin cambio | sin cambio | sin cambio | |
| `panel.outcomes.inadmissible` | No admitida | sin cambio | sin cambio | sin cambio | |
| `panel.outcomes.out_of_scope` | Fuera del ámbito del canal | sin cambio | sin cambio | sin cambio | |
| `panel.outcomes.duplicate` | Duplicada | sin cambio | sin cambio | sin cambio | |
| `panel.finalMsg` | Respuesta final | sin cambio | sin cambio | sin cambio | |
| `panel.closeSend` | Enviar y cerrar | sin cambio | sin cambio | sin cambio | |
| `panel.closeErrOutcome` | Elige un resultado. | sin cambio | sin cambio | sin cambio | |
| `panel.closeErrMsg` | Escribe la respuesta final. | sin cambio | sin cambio | sin cambio | |
| `panel.closedOk` | Respuesta enviada. Caso cerrado. | sin cambio | sin cambio | sin cambio | |
| `panel.told` | Lo que ha contado | sin cambio | sin cambio | sin cambio | |
| `panel.where` | Dónde | sin cambio | sin cambio | sin cambio | |
| `panel.when` | Cuándo | sin cambio | sin cambio | sin cambio | |
| `panel.who` | Personas implicadas | sin cambio | sin cambio | sin cambio | |
| `panel.lang` | Idioma | sin cambio | sin cambio | sin cambio | |
| `panel.proof` | Pruebas | sin cambio | sin cambio | sin cambio | |
| `panel.downloadAria` | Descargar {name} | sin cambio | sin cambio | sin cambio | |
| `panel.downloadErr` | No se ha podido descargar. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.conv` | Conversación con quien informa | sin cambio | sin cambio | sin cambio | |
| `panel.convNote` | Lo verá con su código | sin cambio | sin cambio | sin cambio | |
| `panel.convEmptyFirst` | Todavía no hay mensajes. El acuse de recibo será el primero. | sin cambio | sin cambio | sin cambio | |
| `panel.convEmpty` | Todavía no hay mensajes. | sin cambio | sin cambio | sin cambio | |
| `panel.msgPh` | Escribe a quien informa. No pidas datos que permitan identificarla. | sin cambio | sin cambio | sin cambio | |
| `panel.msgPhIdent` | Escribe a quien informa. | sin cambio | sin cambio | sin cambio | |
| `panel.send` | Enviar | sin cambio | sin cambio | sin cambio | |
| `panel.msgErr` | No se ha podido enviar el mensaje. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.noReply` | No tienes permiso para escribir en este caso. | sin cambio | sin cambio | sin cambio | |
| `panel.reporter` | Quien informa | sin cambio | sin cambio | sin cambio | |
| `panel.manageT` | Gestión | sin cambio | sin cambio | sin cambio | |
| `panel.priority` | Prioridad | sin cambio | sin cambio | sin cambio | |
| `panel.prios.low` | Baja | sin cambio | sin cambio | sin cambio | |
| `panel.prios.normal` | Normal | sin cambio | sin cambio | sin cambio | |
| `panel.prios.high` | Alta | sin cambio | sin cambio | sin cambio | |
| `panel.prios.critical` | Crítica | sin cambio | sin cambio | sin cambio | |
| `panel.owner` | Quién lo lleva | sin cambio | sin cambio | sin cambio | |
| `panel.nobody` | Sin asignar | sin cambio | sin cambio | sin cambio | |
| `panel.addNote` | Añadir nota interna | sin cambio | sin cambio | sin cambio | |
| `panel.noteTitle` | Nota interna | sin cambio | sin cambio | sin cambio | |
| `panel.noteText` | Solo la ve tu equipo. Queda en el historial del caso. | sin cambio | sin cambio | sin cambio | |
| `panel.noteLabel` | Nota | sin cambio | sin cambio | sin cambio | |
| `panel.noteSave` | Guardar nota | sin cambio | sin cambio | sin cambio | |
| `panel.noteOk` | Nota guardada. | sin cambio | sin cambio | sin cambio | |
| `panel.meetT` | Reunión presencial | sin cambio | sin cambio | sin cambio | |
| `panel.meetPending` | La ha pedido. Hay que ofrecerla antes del {date} (plazo legal: 7 días desde la petición). | legal: no se toca | — | — | |
| `panel.meetLeftN` | Quedan {n} días. | sin cambio | sin cambio | sin cambio | |
| `panel.meetLeft1` | Queda 1 día. | sin cambio | sin cambio | sin cambio | |
| `panel.meetToday` | El plazo vence hoy. | sin cambio | sin cambio | sin cambio | |
| `panel.meetOverN` | El plazo venció hace {n} días. | sin cambio | sin cambio | sin cambio | |
| `panel.meetOver1` | El plazo venció ayer. | sin cambio | sin cambio | sin cambio | |
| `panel.meetHeld` | Hecha el {date}. | sin cambio | sin cambio | sin cambio | |
| `panel.meetMark` | Marcar como hecha | sin cambio | sin cambio | sin cambio | |
| `panel.meetOk` | Reunión marcada como hecha. | sin cambio | sin cambio | sin cambio | |
| `panel.closeT` | Cerrar el caso | sin cambio | sin cambio | sin cambio | |
| `panel.fiscal` | Remitir al Ministerio Fiscal | legal: no se toca | — | — | |
| `panel.fiscalTitle` | ¿Remitir al Ministerio Fiscal? | legal: no se toca | — | — | |
| `panel.fiscalText` | Se anotará en el caso que los hechos se han puesto en conocimiento del Ministerio Fiscal (art. 9.2 j de la Ley 2/2023). No se puede deshacer. | legal: no se toca | — | — | |
| `panel.fiscalNote` | Nota (opcional) | legal: no se toca | — | — | |
| `panel.fiscalDo` | Anotar la remisión | legal: no se toca | — | — | |
| `panel.fiscalDone` | Remitido al Ministerio Fiscal el {date}. | legal: no se toca | — | — | |
| `panel.fiscalOk` | Remisión anotada. | legal: no se toca | — | — | |
| `panel.identT` | Identidad | sin cambio | sin cambio | sin cambio | |
| `panel.identAnon` | Denuncia anónima: no hay nombre, correo ni teléfono guardados. | sin cambio | sin cambio | sin cambio | |
| `panel.identShow` | Ver la identidad | sin cambio | sin cambio | sin cambio | |
| `panel.identWarn` | Cada vez que alguien la mira queda anotado en el historial. | sin cambio | sin cambio | sin cambio | |
| `panel.identErr` | No se ha podido mostrar la identidad. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.name` | Nombre | sin cambio | sin cambio | sin cambio | |
| `panel.phone` | Teléfono | sin cambio | sin cambio | sin cambio | |
| `panel.notGiven` | No lo dio | sin cambio | sin cambio | sin cambio | |
| `panel.history` | Historial | sin cambio | sin cambio | sin cambio | |
| `panel.aMeetReq` | Quien informa ha pedido una reunión | sin cambio | sin cambio | sin cambio | |
| `panel.fillBlanks` | Completa lo que falta antes de enviar: {list}. | sin cambio | sin cambio | sin cambio | |
| `panel.resultIs` | Resultado: {outcome} | sin cambio | sin cambio | sin cambio | |
| `panel.reopenHint` | Para reabrirla, usa «Reabrir» en el menú «···». | sin cambio | sin cambio | sin cambio | |
| `panel.titleLikeColumn` | Ese título es el nombre de una columna del tablero y puede confundir. Mejor uno que describa el caso. | sin cambio | sin cambio | sin cambio | |
| `panel.yearN` | Año {year} | sin cambio | sin cambio | sin cambio | |
| `panel.sinceD` | Desde el {date} | sin cambio | sin cambio | sin cambio | |
| `panel.untilD` | Hasta el {date} | sin cambio | sin cambio | sin cambio | |
| `panel.ai.title` | Resumen | sin cambio | sin cambio | sin cambio | |
| `panel.ai.make` | Resumir con IA | sin cambio | sin cambio | sin cambio | |
| `panel.ai.again` | Volver a generar | sin cambio | sin cambio | sin cambio | |
| `panel.ai.working` | Generando… | sin cambio | sin cambio | sin cambio | |
| `panel.ai.empty` | Un resumen de 3 frases y un título corto para el tablero. Se hace con IA a partir de lo que contó, sin sus datos personales. | sin cambio | sin cambio | sin cambio | |
| `panel.ai.suggested` | Título propuesto: | sin cambio | sin cambio | sin cambio | |
| `panel.ai.useTitle` | Usar como título | sin cambio | sin cambio | sin cambio | |
| `panel.ai.note` | Hecho con IA el {date}. Compruébalo con lo que contó: puede tener errores. | sin cambio | sin cambio | sin cambio | |
| `panel.ai.done` | Resumen generado. | sin cambio | sin cambio | sin cambio | |
| `panel.ai.error` | La IA no ha podido responder. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.ai.draft` | Redactar con IA | sin cambio | sin cambio | sin cambio | |
| `panel.ai.kinds.ack` | Acuse de recibo | sin cambio | sin cambio | sin cambio | |
| `panel.ai.kinds.question` | Pedir más datos | sin cambio | sin cambio | sin cambio | |
| `panel.ai.kinds.answer` | Respuesta final | sin cambio | sin cambio | sin cambio | |
| `panel.ai.draftNote` | Borrador hecho con IA. Revísalo y cámbialo antes de enviar. | sin cambio | sin cambio | sin cambio | |
| `panel.ai.replaceT` | ¿Sustituir lo que has escrito? | sin cambio | sin cambio | sin cambio | |
| `panel.ai.replaceText` | El borrador de la IA sustituirá el texto que hay ahora en la caja. | sin cambio | sin cambio | sin cambio | |
| `panel.ai.replace` | Sustituir | sin cambio | sin cambio | sin cambio | |
| `panel.ai.keep` | Dejar mi texto | sin cambio | sin cambio | sin cambio | |
| `panel.ai.hist` | {who} generó el resumen con IA | sin cambio | sin cambio | sin cambio | |
| `panel.ai.histAnon` | Resumen generado con IA | sin cambio | sin cambio | sin cambio | |
| `panel.aAssigned` | {who} lo ha asignado a {to} | sin cambio | sin cambio | sin cambio | |
| `panel.aAssignedAnon` | Asignado a {to} | sin cambio | sin cambio | sin cambio | |
| `panel.aUnassigned` | Se ha quitado la asignación | sin cambio | sin cambio | sin cambio | |
| `panel.extend` | Ampliar el plazo de respuesta | sin cambio | sin cambio | sin cambio | |
| `panel.toWaiting` | Esperar a quien informa | sin cambio | sin cambio | sin cambio | |
| `panel.toInvestigating` | Volver a investigación | sin cambio | sin cambio | sin cambio | |
| `panel.archive` | Archivar | sin cambio | sin cambio | sin cambio | |
| `panel.reopen` | Reabrir | sin cambio | sin cambio | sin cambio | |
| `panel.suppress` | Suprimir datos | sin cambio | sin cambio | sin cambio | |
| `panel.statusOk` | Estado cambiado. | sin cambio | sin cambio | sin cambio | |
| `panel.regTitle` | Registrar un caso | sin cambio | sin cambio | sin cambio | |
| `panel.regLead` | Para los que llegan por teléfono, en persona o por carta. Entran al tablero con sus plazos. | **Para las denuncias que llegan por teléfono, en persona o por carta. Se incorporan al tablero con sus plazos.** | Per a les denúncies que arriben per telèfon, en persona o per carta. S’incorporen al tauler amb els seus terminis. | For reports received by phone, in person or by letter. They are added to the board with their deadlines. | «Para los que llegan» no dice qué |
| `panel.how` | ¿Cómo ha llegado? | sin cambio | sin cambio | sin cambio | |
| `panel.chan.phone` | Teléfono | sin cambio | sin cambio | sin cambio | |
| `panel.chan.in_person` | En persona | sin cambio | sin cambio | sin cambio | |
| `panel.chan.mail` | Correo postal | sin cambio | sin cambio | sin cambio | |
| `panel.chan.email` | Correo electrónico | sin cambio | sin cambio | sin cambio | |
| `panel.chan.other` | Otra | sin cambio | sin cambio | sin cambio | |
| `panel.receivedAt` | Recibida el | sin cambio | sin cambio | sin cambio | |
| `panel.topic` | Tema | sin cambio | sin cambio | sin cambio | |
| `panel.topicPick` | Elige un tema | sin cambio | sin cambio | sin cambio | |
| `panel.optional` | Opcional | sin cambio | sin cambio | sin cambio | |
| `panel.gaveName` | ¿Ha dado su nombre? | sin cambio | sin cambio | sin cambio | |
| `panel.noAnon` | No, anónimo | sin cambio | sin cambio | sin cambio | |
| `panel.yesData` | Sí, con sus datos | sin cambio | sin cambio | sin cambio | |
| `panel.regDo` | Registrar y obtener el código | sin cambio | sin cambio | sin cambio | |
| `panel.regBusy` | Registrando… | sin cambio | sin cambio | sin cambio | |
| `panel.whatHappens` | Qué pasa al guardarlo | sin cambio | sin cambio | sin cambio | |
| `panel.wh[0]` | Entra en «Nuevas» con los plazos contados desde la fecha de recepción. | sin cambio | sin cambio | sin cambio | |
| `panel.wh[1]` | Te damos un código secreto para entregar a quien informa. Con él podrá seguir el caso. | sin cambio | sin cambio | sin cambio | |
| `panel.wh[2]` | Queda en el libro-registro con la vía de entrada (art. 26 de la Ley 2/2023). Si fue verbal, documéntala como pide el art. 7.2. | legal: no se toca | — | — | |
| `panel.errTopic` | Elige un tema. | sin cambio | sin cambio | sin cambio | |
| `panel.errDesc` | Escribe al menos 20 caracteres. | sin cambio | sin cambio | sin cambio | |
| `panel.errDate` | La fecha no puede ser futura ni de hace más de un año. | sin cambio | sin cambio | sin cambio | |
| `panel.regErr` | No se ha podido registrar. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.regNoPerm` | No tienes permiso para registrar casos. Pídeselo a un administrador. | sin cambio | sin cambio | sin cambio | |
| `panel.doneTitle` | Registrado. Entrega este código. | **Caso registrado** | Cas registrat | Case registered | Frases cortas a golpe de punto (P7) |
| `panel.doneLead` | Dáselo a quien informa: con él podrá ver la respuesta y escribirte. No se volverá a mostrar. | **Entrega este código a quien informa: con él podrá ver la respuesta y escribirte. No se volverá a mostrar.** | Lliura aquest codi a qui informa: amb ell podrà veure la resposta i escriure’t. No es tornarà a mostrar. | Give this code to the reporter: with it they can see the reply and write to you. It will not be shown again. | La instrucción pasa del título a la primera frase |
| `panel.codeLabel` | Código secreto | sin cambio | sin cambio | sin cambio | |
| `panel.copy` | Copiar | sin cambio | sin cambio | sin cambio | |
| `panel.copied` | Copiado | sin cambio | sin cambio | sin cambio | |
| `panel.printReceipt` | Imprimir justificante | sin cambio | sin cambio | sin cambio | |
| `panel.openCase` | Abrir el caso | sin cambio | sin cambio | sin cambio | |
| `panel.toBoard` | Ir al tablero | sin cambio | sin cambio | sin cambio | |
| `panel.printNote` | Con este código, quien informa puede seguir su caso en | sin cambio | sin cambio | sin cambio | |
| `panel.aipiLateT` | Falta comunicar el responsable a la AIPI | sin cambio | sin cambio | sin cambio | |
| `panel.aipiLateText` | El plazo de 10 días hábiles venció el {date}. Comunícalo y anota la fecha en Equipo y ajustes. | sin cambio | sin cambio | sin cambio | |
| `panel.onb.title` | Primeros pasos | sin cambio | sin cambio | sin cambio | |
| `panel.onb.of` | {n} de 5 | sin cambio | sin cambio | sin cambio | |
| `panel.onb.ringAria` | {n} de 5 pasos hechos | sin cambio | sin cambio | sin cambio | |
| `panel.onb.missing` | Falta: {list} | sin cambio | sin cambio | sin cambio | |
| `panel.onb.and` | y | sin cambio | sin cambio | sin cambio | |
| `panel.onb.more` | {n} más | sin cambio | sin cambio | sin cambio | |
| `panel.onb.allDone` | Todo listo | **Puesta en marcha completada** | Posada en marxa completada | Set-up complete | «Todo listo» es coloquial |
| `panel.onb.allDoneText` | El canal está a la vista de la plantilla y la parte legal, al día. | **Los cinco pasos están hechos.** | Els cinc passos estan fets. | All five steps are done. | La frase anterior afirmaba que «la parte legal está al día»: el producto no puede saberlo |
| `panel.onb.steps.responsible` | Designar a la persona responsable | sin cambio | sin cambio | sin cambio | |
| `panel.onb.steps.web` | Poner el canal en la web | sin cambio | sin cambio | sin cambio | |
| `panel.onb.steps.invite` | Invitar a otra persona del equipo | sin cambio | sin cambio | sin cambio | |
| `panel.onb.steps.poster` | Colgar el cartel con el QR | sin cambio | sin cambio | sin cambio | |
| `panel.onb.steps.aipi` | Comunicar el responsable a la AIPI | sin cambio | sin cambio | sin cambio | |
| `panel.onb.short.responsible` | designar al responsable | sin cambio | sin cambio | sin cambio | |
| `panel.onb.short.web` | el canal en la web | sin cambio | sin cambio | sin cambio | |
| `panel.onb.short.invite` | invitar a alguien | sin cambio | sin cambio | sin cambio | |
| `panel.onb.short.poster` | cartel con QR | sin cambio | sin cambio | sin cambio | |
| `panel.onb.short.aipi` | comunicar a la AIPI | sin cambio | sin cambio | sin cambio | |
| `panel.onb.next` | Lo siguiente | sin cambio | sin cambio | sin cambio | |
| `panel.onb.nextText.responsible` | Nombra a la persona responsable del sistema y anota su nombre en Equipo y ajustes. | sin cambio | sin cambio | sin cambio | |
| `panel.onb.nextText.web` | Pon el enlace o el botón del canal en la página de inicio de la web de tu empresa. | sin cambio | sin cambio | sin cambio | |
| `panel.onb.nextText.invite` | Invita al menos a otra persona, para que el canal no dependa de una sola. | sin cambio | sin cambio | sin cambio | |
| `panel.onb.nextText.poster` | Imprime el cartel y cuélgalo en los tablones y zonas comunes. | sin cambio | sin cambio | sin cambio | |
| `panel.onb.nextText.aipi` | Comunica a la AIPI quién es la persona responsable y anota la fecha en Equipo y ajustes. | sin cambio | sin cambio | sin cambio | |
| `panel.onb.goSettings` | Ir a Equipo y ajustes | sin cambio | sin cambio | sin cambio | |
| `panel.onb.copyLink` | Copiar el enlace | sin cambio | sin cambio | sin cambio | |
| `panel.onb.inviteNow` | Invitar a alguien | sin cambio | sin cambio | sin cambio | |
| `panel.onb.getPoster` | Descargar el cartel | sin cambio | sin cambio | sin cambio | |
| `panel.onb.howAipi` | Cómo comunicarlo | sin cambio | sin cambio | sin cambio | |
| `panel.onb.done` | Ya está hecho | sin cambio | sin cambio | sin cambio | |
| `panel.onb.fold` | Plegar «Primeros pasos» | sin cambio | sin cambio | sin cambio | |
| `panel.onb.unfold` | Desplegar «Primeros pasos» | sin cambio | sin cambio | sin cambio | |
| `panel.onb.undo` | Desmarcar «{step}» | sin cambio | sin cambio | sin cambio | |
| `panel.onb.mark` | Marcar «{step}» como hecho | sin cambio | sin cambio | sin cambio | |
| `panel.onb.stDone` | hecho | sin cambio | sin cambio | sin cambio | |
| `panel.onb.stTodo` | pendiente | sin cambio | sin cambio | sin cambio | |
| `panel.onb.saveErr` | No se ha podido guardar el paso. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.share.title` | Que toda la plantilla lo encuentre | **Compartir el canal** | Compartir el canal | Share the channel | Título «simpático» (obs. 12): el mismo nombre que en el menú |
| `panel.share.lead` | La ley pide que el canal se vea en la página de inicio de la web de tu empresa y que la plantilla sepa usarlo. | legal: no se toca | — | — | |
| `panel.share.link` | El enlace | sin cambio | sin cambio | sin cambio | |
| `panel.share.copyLink` | Copiar enlace | sin cambio | sin cambio | sin cambio | |
| `panel.share.linkCopied` | Enlace copiado | sin cambio | sin cambio | sin cambio | |
| `panel.share.open` | Abrir | sin cambio | sin cambio | sin cambio | |
| `panel.share.poster` | Cartel con QR | sin cambio | sin cambio | sin cambio | |
| `panel.share.posterText` | A4 listo para el tablón, en catalán, castellano o inglés. | sin cambio | sin cambio | sin cambio | |
| `panel.share.posterLang` | Idioma del cartel | sin cambio | sin cambio | sin cambio | |
| `panel.share.posterGet` | Descargar PDF | sin cambio | sin cambio | sin cambio | |
| `panel.share.posterBusy` | Generando… | sin cambio | sin cambio | sin cambio | |
| `panel.share.posterOk` | Cartel descargado. | sin cambio | sin cambio | sin cambio | |
| `panel.share.posterErr` | No se ha podido generar el cartel. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.share.qrMore` | Más formatos del QR | sin cambio | sin cambio | sin cambio | |
| `panel.share.qrPng` | QR suelto en PNG | sin cambio | sin cambio | sin cambio | |
| `panel.share.qrSvg` | QR suelto en SVG | sin cambio | sin cambio | sin cambio | |
| `panel.share.qrSaved` | Código QR descargado. | sin cambio | sin cambio | sin cambio | |
| `panel.share.qrAlt` | Código QR con la dirección del canal | sin cambio | sin cambio | sin cambio | |
| `panel.share.qrErr` | No se ha podido generar el código QR. Recarga la página. | sin cambio | sin cambio | sin cambio | |
| `panel.share.qrFile` | canal-qr | sin cambio | sin cambio | sin cambio | |
| `panel.share.button` | Botón para la web de tu empresa | sin cambio | sin cambio | sin cambio | |
| `panel.share.kind` | Formato | sin cambio | sin cambio | sin cambio | |
| `panel.share.kindButton` | Botón | sin cambio | sin cambio | sin cambio | |
| `panel.share.kindLink` | Enlace de texto | sin cambio | sin cambio | sin cambio | |
| `panel.share.lang` | Idioma | sin cambio | sin cambio | sin cambio | |
| `panel.share.copyCode` | Copiar el código | sin cambio | sin cambio | sin cambio | |
| `panel.share.codeCopied` | Código copiado | sin cambio | sin cambio | sin cambio | |
| `panel.share.seeCode` | Ver el código | sin cambio | sin cambio | sin cambio | |
| `panel.share.legal` | Texto para la página de inicio | sin cambio | sin cambio | sin cambio | |
| `panel.share.legalNote` | Texto orientativo (art. 25 de la Ley 2/2023). Revísalo con la asesoría de tu empresa antes de publicarlo. | legal: no se toca | — | — | |
| `panel.share.copyText` | Copiar el texto | sin cambio | sin cambio | sin cambio | |
| `panel.share.textCopied` | Texto copiado | sin cambio | sin cambio | sin cambio | |
| `panel.share.whyTitle` | Por qué un enlace y no un formulario incrustado. | sin cambio | sin cambio | sin cambio | |
| `panel.share.whyText` | El canal se abre en una dirección ajena a la web de tu empresa. Quien denuncia ve que no escribe en una página de la empresa, y las herramientas de medición de la web de tu empres… | sin cambio | sin cambio | sin cambio | |
| `panel.rep.title` | {year}, de un vistazo | **Informe de {year}** | Informe del {year} | {year} report | Título «simpático» (obs. 12) |
| `panel.rep.titleAll` | Todo el historial, de un vistazo | **Informe de todo el historial** | Informe de tot l’historial | Full history report | Título «simpático» (obs. 12) |
| `panel.rep.period` | Periodo | sin cambio | sin cambio | sin cambio | |
| `panel.rep.all` | Todo el historial | sin cambio | sin cambio | sin cambio | |
| `panel.rep.xls` | Libro-registro (Excel) | sin cambio | sin cambio | sin cambio | |
| `panel.rep.pdf` | Informe para dirección (PDF) | sin cambio | sin cambio | sin cambio | |
| `panel.rep.received` | Recibidas | sin cambio | sin cambio | sin cambio | |
| `panel.rep.onTime` | Respondidas a tiempo | sin cambio | sin cambio | sin cambio | |
| `panel.rep.of` | de {total} | sin cambio | sin cambio | sin cambio | |
| `panel.rep.anonymous` | Anónimas | sin cambio | sin cambio | sin cambio | |
| `panel.rep.missed` | Con plazo vencido | sin cambio | sin cambio | sin cambio | |
| `panel.rep.open` | Abiertas | sin cambio | sin cambio | sin cambio | |
| `panel.rep.closed` | Cerradas | sin cambio | sin cambio | sin cambio | |
| `panel.rep.ackPending` | Sin acuse todavía | sin cambio | sin cambio | sin cambio | |
| `panel.rep.late` | Respondidas fuera de plazo | sin cambio | sin cambio | sin cambio | |
| `panel.rep.erased` | Suprimidas (art. 32) | legal: no se toca | — | — | |
| `panel.rep.openOverdue` | Abiertas con el plazo vencido | sin cambio | sin cambio | sin cambio | |
| `panel.rep.lateAck` | Acuses fuera de plazo | sin cambio | sin cambio | sin cambio | |
| `panel.rep.median` | Días hasta responder (mediana) | sin cambio | sin cambio | sin cambio | |
| `panel.rep.byMonth` | Denuncias por mes | sin cambio | sin cambio | sin cambio | |
| `panel.rep.byYear` | Denuncias por año | sin cambio | sin cambio | sin cambio | |
| `panel.rep.byTopic` | Por tema | sin cambio | sin cambio | sin cambio | |
| `panel.rep.byStatus` | Por estado | sin cambio | sin cambio | sin cambio | |
| `panel.rep.colCount` | Denuncias | sin cambio | sin cambio | sin cambio | |
| `panel.rep.colShare` | Porcentaje | sin cambio | sin cambio | sin cambio | |
| `panel.rep.colMonth` | Mes | sin cambio | sin cambio | sin cambio | |
| `panel.rep.colYear` | Año | sin cambio | sin cambio | sin cambio | |
| `panel.rep.colTopic` | Tema | sin cambio | sin cambio | sin cambio | |
| `panel.rep.colStatus` | Estado | sin cambio | sin cambio | sin cambio | |
| `panel.rep.colOpen` | Abiertas | sin cambio | sin cambio | sin cambio | |
| `panel.rep.total` | Total | sin cambio | sin cambio | sin cambio | |
| `panel.rep.seeList` | Ver las denuncias del periodo | sin cambio | sin cambio | sin cambio | |
| `panel.rep.emptyTitle` | No hay denuncias en este periodo | sin cambio | sin cambio | sin cambio | |
| `panel.rep.emptyText` | Elige otro periodo para ver su resumen. | sin cambio | sin cambio | sin cambio | |
| `panel.rep.medianNote` | La mediana cuenta los días entre la recepción y la respuesta de los casos cerrados. | sin cambio | sin cambio | sin cambio | |
| `panel.rep.detail` | Plazos y seguimiento | sin cambio | sin cambio | sin cambio | |
| `panel.set.title` | Equipo y ajustes | sin cambio | sin cambio | sin cambio | |
| `panel.set.respT` | Responsable del Sistema | sin cambio | sin cambio | sin cambio | |
| `panel.set.respLead` | La ley obliga a nombrar a una persona y comunicarlo a la autoridad en 10 días hábiles. | legal: no se toca | — | — | |
| `panel.set.respName` | Nombre | sin cambio | sin cambio | sin cambio | |
| `panel.set.respRole` | Cargo | sin cambio | sin cambio | sin cambio | |
| `panel.set.appointed` | Nombrada el | sin cambio | sin cambio | sin cambio | |
| `panel.set.notified` | Comunicado a la AIPI | sin cambio | sin cambio | sin cambio | |
| `panel.set.daysLeftN` | Quedan {n} días hábiles | sin cambio | sin cambio | sin cambio | |
| `panel.set.daysLeft1` | Queda 1 día hábil | sin cambio | sin cambio | sin cambio | |
| `panel.set.dueToday` | El plazo vence hoy | sin cambio | sin cambio | sin cambio | |
| `panel.set.overdue` | El plazo venció el {date} | sin cambio | sin cambio | sin cambio | |
| `panel.set.needAppointed` | Pendiente. Anota cuándo se nombró para contar el plazo. | sin cambio | sin cambio | sin cambio | |
| `panel.set.noHolidays` | La cuenta salta sábados y domingos, pero no descuenta los festivos. | legal: no se toca | — | — | |
| `panel.set.authority` | Autoridad autonómica que se muestra en el canal | sin cambio | sin cambio | sin cambio | |
| `panel.set.authNone` | Ninguna | sin cambio | sin cambio | sin cambio | |
| `panel.set.authAntifrau` | Oficina Antifrau de Catalunya | sin cambio | sin cambio | sin cambio | |
| `panel.set.authOther` | Otra… | sin cambio | sin cambio | sin cambio | |
| `panel.set.authName` | Nombre de la autoridad | sin cambio | sin cambio | sin cambio | |
| `panel.set.authUrl` | Enlace a su canal | sin cambio | sin cambio | sin cambio | |
| `panel.set.errAuth` | Escribe el nombre y un enlace que empiece por https://. | sin cambio | sin cambio | sin cambio | |
| `panel.set.howAipi` | Cómo comunicarlo a la AIPI | sin cambio | sin cambio | sin cambio | |
| `panel.set.saveErr` | No se han podido guardar los datos. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.set.planT` | Plan | sin cambio | sin cambio | sin cambio | |
| `panel.set.trial` | Prueba gratuita | sin cambio | sin cambio | sin cambio | |
| `panel.set.trialLeftN` | Quedan {n} días · el canal sigue abierto aunque acabe | sin cambio | sin cambio | sin cambio | |
| `panel.set.trialLeft1` | Queda 1 día · el canal sigue abierto aunque acabe | sin cambio | sin cambio | sin cambio | |
| `panel.set.trialToday` | Termina hoy · el canal sigue abierto aunque acabe | sin cambio | sin cambio | sin cambio | |
| `panel.set.trialEnded` | Prueba terminada | sin cambio | sin cambio | sin cambio | |
| `panel.set.trialEndedText` | Terminó el {date} · el canal sigue abierto | sin cambio | sin cambio | sin cambio | |
| `panel.set.active` | Plan {plan} | sin cambio | sin cambio | sin cambio | |
| `panel.set.activeUntil` | Activo hasta el {date} | sin cambio | sin cambio | sin cambio | |
| `panel.set.activeOpen` | Activo | sin cambio | sin cambio | sin cambio | |
| `panel.set.renewN` | Vence en {n} días, el {date} | sin cambio | sin cambio | sin cambio | |
| `panel.set.renew1` | Vence mañana, el {date} | sin cambio | sin cambio | sin cambio | |
| `panel.set.renewToday` | Vence hoy | sin cambio | sin cambio | sin cambio | |
| `panel.set.expired` | Plan {plan} vencido | sin cambio | sin cambio | sin cambio | |
| `panel.set.expiredText` | Venció el {date} · el canal sigue abierto | sin cambio | sin cambio | sin cambio | |
| `panel.set.contract` | Contratar | sin cambio | sin cambio | sin cambio | |
| `panel.set.renew` | Renovar | sin cambio | sin cambio | sin cambio | |
| `panel.set.plansT` | Planes y precios | sin cambio | sin cambio | sin cambio | |
| `panel.set.plansHow` | Para contratar o renovar, escríbenos. Te enviamos la factura y activamos el plan. | sin cambio | sin cambio | sin cambio | |
| `panel.set.byMail` | Contratar por correo | sin cambio | sin cambio | sin cambio | |
| `panel.set.renewByMail` | Renovar por correo | sin cambio | sin cambio | sin cambio | |
| `panel.set.yourPlan` | Tu plan | sin cambio | sin cambio | sin cambio | |
| `panel.set.billing` | Datos de facturación | sin cambio | sin cambio | sin cambio | |
| `panel.set.billLead` | Los que aparecerán en la factura anual. | sin cambio | sin cambio | sin cambio | |
| `panel.set.billName` | Razón social | sin cambio | sin cambio | sin cambio | |
| `panel.set.billTax` | NIF | sin cambio | sin cambio | sin cambio | |
| `panel.set.billEmail` | Correo para las facturas | sin cambio | sin cambio | sin cambio | |
| `panel.set.errTax` | Escribe un NIF válido (letras y números, sin espacios). | sin cambio | sin cambio | sin cambio | |
| `panel.set.dpa` | Contrato de encargado del tratamiento | sin cambio | sin cambio | sin cambio | |
| `panel.set.dpaSubject` | Contrato de encargado del tratamiento · {org} | sin cambio | sin cambio | sin cambio | |
| `panel.set.dpaBody` | Hola. Queremos recibir el contrato de encargado del tratamiento de Reportia para {org}. | sin cambio | sin cambio | sin cambio | |
| `panel.set.orgT` | La empresa | sin cambio | sin cambio | sin cambio | |
| `panel.set.orgName` | Nombre de la empresa | sin cambio | sin cambio | sin cambio | |
| `panel.set.orgNameHelp` | Aparece en la cabecera del canal y en los documentos. | sin cambio | sin cambio | sin cambio | |
| `panel.set.orgAddress` | Dirección del canal | sin cambio | sin cambio | sin cambio | |
| `panel.set.orgAddressHelp` | No se puede cambiar: los enlaces ya compartidos dejarían de funcionar. | sin cambio | sin cambio | sin cambio | |
| `panel.set.errOrgName` | Escribe el nombre de la empresa. | sin cambio | sin cambio | sin cambio | |
| `panel.set.teamT` | Quién gestiona | sin cambio | sin cambio | sin cambio | |
| `panel.set.invite` | Invitar | sin cambio | sin cambio | sin cambio | |
| `panel.set.you` | tú | sin cambio | sin cambio | sin cambio | |
| `panel.set.roleAdmin` | Administración | sin cambio | sin cambio | sin cambio | |
| `panel.set.seesAll` | ve todo | sin cambio | sin cambio | sin cambio | |
| `panel.set.roleManager` | Gestión | sin cambio | sin cambio | sin cambio | |
| `panel.set.catsNone` | sin temas asignados | sin cambio | sin cambio | sin cambio | |
| `panel.set.invited` | invitación pendiente | sin cambio | sin cambio | sin cambio | |
| `panel.set.change` | Cambiar | sin cambio | sin cambio | sin cambio | |
| `panel.set.changeAria` | Cambiar los permisos de {name} | sin cambio | sin cambio | sin cambio | |
| `panel.set.teamErr` | No se ha podido cargar el equipo. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.set.inviteT` | Invitar a alguien del equipo | sin cambio | sin cambio | sin cambio | |
| `panel.set.inviteLead` | Recibirá un correo para crear su contraseña. Después, dile qué temas lleva. | sin cambio | sin cambio | sin cambio | |
| `panel.set.fullName` | Nombre y apellidos | sin cambio | sin cambio | sin cambio | |
| `panel.set.sendInvite` | Enviar la invitación | sin cambio | sin cambio | sin cambio | |
| `panel.set.sending` | Enviando… | sin cambio | sin cambio | sin cambio | |
| `panel.set.inviteOk` | Invitación enviada a {email}. | sin cambio | sin cambio | sin cambio | |
| `panel.set.inviteErr` | No se ha podido enviar la invitación. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.set.inviteExists` | Ya hay alguien con este correo. | sin cambio | sin cambio | sin cambio | |
| `panel.set.inviteLimit` | Hoy ya has enviado muchas invitaciones. Inténtalo de nuevo mañana. | sin cambio | sin cambio | sin cambio | |
| `panel.set.errName` | Escribe el nombre y apellidos. | sin cambio | sin cambio | sin cambio | |
| `panel.set.permsT` | Permisos de {name} | sin cambio | sin cambio | sin cambio | |
| `panel.set.permsLead` | Marca qué puede hacer en cada tema. Sin «Ver», el tema no aparece en su tablero. | sin cambio | sin cambio | sin cambio | |
| `panel.set.perm.can_view` | Ver | sin cambio | sin cambio | sin cambio | |
| `panel.set.perm.can_edit` | Editar | sin cambio | sin cambio | sin cambio | |
| `panel.set.perm.can_reply` | Responder | sin cambio | sin cambio | sin cambio | |
| `panel.set.perm.can_delete` | Suprimir | sin cambio | sin cambio | sin cambio | |
| `panel.set.allTopics` | Todos los temas | sin cambio | sin cambio | sin cambio | |
| `panel.set.permHint` | Editar, Responder y Suprimir activan Ver. | sin cambio | sin cambio | sin cambio | |
| `panel.set.permAria` | {perm}: {cat} | sin cambio | sin cambio | sin cambio | |
| `panel.set.savePerms` | Guardar permisos | sin cambio | sin cambio | sin cambio | |
| `panel.set.permsSaved` | Permisos guardados. | sin cambio | sin cambio | sin cambio | |
| `panel.set.permsErr` | No se han podido guardar los permisos. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.set.unsaved` | Hay cambios sin guardar. | sin cambio | sin cambio | sin cambio | |
| `panel.set.discard` | Salir sin guardar | sin cambio | sin cambio | sin cambio | |
| `panel.set.keepEditing` | Seguir editando | sin cambio | sin cambio | sin cambio | |
| `panel.set.adminNote` | Ve todos los casos y puede cambiar el equipo y la cuenta. | sin cambio | sin cambio | sin cambio | |
| `panel.set.promote` | Hacer administrador | sin cambio | sin cambio | sin cambio | |
| `panel.set.demote` | Quitar como administrador | sin cambio | sin cambio | sin cambio | |
| `panel.set.promoteT` | ¿Hacer administrador a {name}? | sin cambio | sin cambio | sin cambio | |
| `panel.set.promoteText` | Verá todos los casos, el equipo y la cuenta. Conviene que haya dos personas administradoras, para que el canal no dependa de una sola. | sin cambio | sin cambio | sin cambio | |
| `panel.set.demoteT` | ¿Quitar como administrador a {name}? | sin cambio | sin cambio | sin cambio | |
| `panel.set.demoteText` | Pasará a gestionar sin ningún tema asignado. Después podrás darle permisos. | sin cambio | sin cambio | sin cambio | |
| `panel.set.promoted` | {name} ya administra el canal. | sin cambio | sin cambio | sin cambio | |
| `panel.set.demoted` | {name} ya no administra el canal. | sin cambio | sin cambio | sin cambio | |
| `panel.set.roleErr` | No se ha podido cambiar el rol. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.set.remove` | Quitar el acceso | sin cambio | sin cambio | sin cambio | |
| `panel.set.removeT` | ¿Quitar el acceso a {name}? | sin cambio | sin cambio | sin cambio | |
| `panel.set.removeText` | Ya no podrá entrar en el panel y se borrarán sus permisos. No se puede deshacer. | sin cambio | sin cambio | sin cambio | |
| `panel.set.removing` | Quitando… | sin cambio | sin cambio | sin cambio | |
| `panel.set.removed` | Se ha quitado el acceso a {name}. | sin cambio | sin cambio | sin cambio | |
| `panel.set.removeErr` | No se ha podido quitar el acceso. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.set.secT` | Tu seguridad | sin cambio | sin cambio | sin cambio | |
| `panel.set.mfaOn` | Verificación en dos pasos activada | sin cambio | sin cambio | sin cambio | |
| `panel.set.mfaOff` | Verificación en dos pasos sin activar | sin cambio | sin cambio | sin cambio | |
| `panel.set.manage` | Gestionar | sin cambio | sin cambio | sin cambio | |
| `panel.set.pwd` | Contraseña | sin cambio | sin cambio | sin cambio | |
| `panel.set.pwdT` | Cambiar la contraseña | sin cambio | sin cambio | sin cambio | |
| `panel.set.pwdOk` | Contraseña cambiada. | sin cambio | sin cambio | sin cambio | |
| `panel.set.pwdErr` | No se ha podido cambiar. Si sigue fallando, cierra la sesión y usa «He olvidado la contraseña». | sin cambio | sin cambio | sin cambio | |
| `panel.sec.title` | Verificación en dos pasos | sin cambio | sin cambio | sin cambio | |
| `panel.sec.lead` | Protege el acceso a las denuncias con un segundo paso al entrar. | sin cambio | sin cambio | sin cambio | |
| `panel.sec.back` | Equipo y ajustes | sin cambio | sin cambio | sin cambio | |
| `panel.sec.requiredT` | Activa la verificación en dos pasos para continuar | sin cambio | sin cambio | sin cambio | |
| `panel.sec.requiredText` | Es obligatoria para ver las denuncias: protege a quien informa aunque alguien conozca tu contraseña. | sin cambio | sin cambio | sin cambio | |
| `panel.sec.onT` | Activada | sin cambio | sin cambio | sin cambio | |
| `panel.sec.onText` | Al entrar se te pide un código de 6 cifras de tu app de verificación. | sin cambio | sin cambio | sin cambio | |
| `panel.sec.onNote` | Es obligatoria para ver las denuncias. Si cambias de móvil o lo pierdes, pide a un administrador de tu empresa o a Reportia que te la restablezca. | sin cambio | sin cambio | sin cambio | |
| `panel.sec.offT` | Sin activar | sin cambio | sin cambio | sin cambio | |
| `panel.sec.offText` | Con este paso, nadie puede entrar solo con tu contraseña. | sin cambio | sin cambio | sin cambio | |
| `panel.sec.enable` | Activar la verificación | sin cambio | sin cambio | sin cambio | |
| `panel.sec.stepOf` | Paso {n} de 2 | sin cambio | sin cambio | sin cambio | |
| `panel.sec.s1T` | Escanea el código QR | sin cambio | sin cambio | sin cambio | |
| `panel.sec.s1Text` | Abre Google Authenticator, Authy u otra app de verificación y escanea este código. | sin cambio | sin cambio | sin cambio | |
| `panel.sec.qrAlt` | Código QR para la app de verificación | sin cambio | sin cambio | sin cambio | |
| `panel.sec.manualKey` | Si no puedes escanearlo, escribe esta clave: | sin cambio | sin cambio | sin cambio | |
| `panel.sec.copyKey` | Copiar la clave | sin cambio | sin cambio | sin cambio | |
| `panel.sec.keyCopied` | Clave copiada | sin cambio | sin cambio | sin cambio | |
| `panel.sec.cont` | Continuar | sin cambio | sin cambio | sin cambio | |
| `panel.sec.backStep` | Volver | sin cambio | sin cambio | sin cambio | |
| `panel.sec.s2T` | Escribe el código de 6 cifras | sin cambio | sin cambio | sin cambio | |
| `panel.sec.s2Text` | Es el que muestra la app. Cambia cada 30 segundos. | sin cambio | sin cambio | sin cambio | |
| `panel.sec.verify` | Verificar y activar | sin cambio | sin cambio | sin cambio | |
| `panel.sec.verifying` | Verificando… | sin cambio | sin cambio | sin cambio | |
| `panel.sec.codeErr` | El código no es correcto. Comprueba que la hora del móvil es la correcta e inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.sec.startErr` | No se ha podido empezar. Inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.sec.enabledOk` | Verificación en dos pasos activada. | sin cambio | sin cambio | sin cambio | |
| `panel.sec.demo` | Demostración: el código QR es de ejemplo y vale cualquier código de 6 cifras. | sin cambio | sin cambio | sin cambio | |
| `panel.sec.accountT` | Tu cuenta | sin cambio | sin cambio | sin cambio | |
| `panel.sec.name` | Nombre | sin cambio | sin cambio | sin cambio | |
| `panel.sec.role` | Rol | sin cambio | sin cambio | sin cambio | |
| `panel.pw.fgTitle` | Recuperar la contraseña | sin cambio | sin cambio | sin cambio | |
| `panel.pw.fgLead` | Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva. | sin cambio | sin cambio | sin cambio | |
| `panel.pw.fgSend` | Enviar el enlace | sin cambio | sin cambio | sin cambio | |
| `panel.pw.fgSending` | Enviando… | sin cambio | sin cambio | sin cambio | |
| `panel.pw.back` | Volver al acceso | sin cambio | sin cambio | sin cambio | |
| `panel.pw.sentTitle` | Revisa tu correo | sin cambio | sin cambio | sin cambio | |
| `panel.pw.sentText` | Si hay una cuenta con la dirección {email}, recibirás un enlace para crear una contraseña nueva. | sin cambio | sin cambio | sin cambio | |
| `panel.pw.sentSpam` | Puede tardar unos minutos. Mira también en la carpeta de correo no deseado. | sin cambio | sin cambio | sin cambio | |
| `panel.pw.errNetwork` | No hay conexión con el servidor. Comprueba tu conexión e inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.pw.fgErr` | No se ha podido enviar el enlace. Inténtalo de nuevo dentro de unos minutos. | sin cambio | sin cambio | sin cambio | |
| `panel.pw.checking` | Comprobando el enlace… | sin cambio | sin cambio | sin cambio | |
| `panel.pw.titleReset` | Contraseña nueva | sin cambio | sin cambio | sin cambio | |
| `panel.pw.leadReset` | Escribe la nueva contraseña de tu cuenta. | sin cambio | sin cambio | sin cambio | |
| `panel.pw.titleInvite` | Te damos la bienvenida | **Crea tu contraseña** | Crea la teva contrasenya | Create your password | «Te damos la bienvenida» no dice qué hay que hacer |
| `panel.pw.leadInvite` | Crea una contraseña para entrar al panel de tu empresa. | sin cambio | sin cambio | sin cambio | |
| `panel.pw.newPw` | Contraseña nueva | sin cambio | sin cambio | sin cambio | |
| `panel.pw.confirmPw` | Repite la contraseña | sin cambio | sin cambio | sin cambio | |
| `panel.pw.reqTitle` | Requisitos | sin cambio | sin cambio | sin cambio | |
| `panel.pw.reqLength` | Al menos 8 caracteres | sin cambio | sin cambio | sin cambio | |
| `panel.pw.reqMatch` | Las dos contraseñas coinciden | sin cambio | sin cambio | sin cambio | |
| `panel.pw.reqOk` | cumplido | sin cambio | sin cambio | sin cambio | |
| `panel.pw.reqPending` | pendiente | sin cambio | sin cambio | sin cambio | |
| `panel.pw.saveReset` | Guardar la contraseña | sin cambio | sin cambio | sin cambio | |
| `panel.pw.saveInvite` | Crear la contraseña | sin cambio | sin cambio | sin cambio | |
| `panel.pw.errLength` | La contraseña debe tener al menos 8 caracteres. | sin cambio | sin cambio | sin cambio | |
| `panel.pw.errMatch` | Las contraseñas no coinciden. | sin cambio | sin cambio | sin cambio | |
| `panel.pw.errSame` | La contraseña nueva debe ser distinta de la anterior. | sin cambio | sin cambio | sin cambio | |
| `panel.pw.errWeak` | Esa contraseña es demasiado fácil de adivinar. Prueba con otra más larga. | sin cambio | sin cambio | sin cambio | |
| `panel.pw.errUpdate` | No se ha podido guardar la contraseña. Pide un enlace nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.pw.invalidTitle` | El enlace no es válido o ha caducado | sin cambio | sin cambio | sin cambio | |
| `panel.pw.invalidText` | Los enlaces para crear o cambiar la contraseña solo sirven una vez y caducan. Pide uno nuevo. | sin cambio | sin cambio | sin cambio | |
| `panel.pw.invalidCta` | Pedir un enlace nuevo | sin cambio | sin cambio | sin cambio | |
| `panel.xl.channel` | Vía de entrada | sin cambio | sin cambio | sin cambio | |
| `panel.xl.web` | Canal web | sin cambio | sin cambio | sin cambio | |
| `panel.xl.meetingReq` | Reunión pedida | sin cambio | sin cambio | sin cambio | |
| `panel.xl.meetingHeld` | Reunión celebrada | sin cambio | sin cambio | sin cambio | |
| `panel.xl.outcome` | Resultado | sin cambio | sin cambio | sin cambio | |
| `panel.xl.when` | Cuándo (texto) | sin cambio | sin cambio | sin cambio | |

### 2.5 Panel: estados, avisos de plan y restos de la versión anterior (sección v2admin)

207 claves.

| clave | ES actual | ES propuesto | CA propuesto | EN propuesto | motivo |
|---|---|---|---|---|---|
| `v2admin.navLabel` | Navegación del panel | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.chipTrial` | Prueba · {n} días | sin cambio | sin cambio | sin cambio | |
| `v2admin.chipTrialOne` | Prueba · 1 día | sin cambio | sin cambio | sin cambio | |
| `v2admin.chipTrialToday` | Prueba · termina hoy | sin cambio | sin cambio | sin cambio | |
| `v2admin.chipTrialEnded` | Prueba terminada | sin cambio | sin cambio | sin cambio | |
| `v2admin.chipExpired` | Plan vencido | sin cambio | sin cambio | sin cambio | |
| `v2admin.chipRenew` | Vence en {n} días | sin cambio | sin cambio | sin cambio | |
| `v2admin.chipRenewOne` | Vence mañana | sin cambio | sin cambio | sin cambio | |
| `v2admin.chipRenewToday` | Vence hoy | sin cambio | sin cambio | sin cambio | |
| `v2admin.viewChannel` | Ver el canal público | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.language` | Idioma | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.logout` | Cerrar sesión | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.loggingOut` | Cerrando… | sin cambio | sin cambio | sin cambio | |
| `v2admin.roleSuperadmin` | Administración | sin cambio | sin cambio | sin cambio | |
| `v2admin.roleManager` | Gestión | sin cambio | sin cambio | sin cambio | |
| `v2admin.menuOpen` | Abrir el menú | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.menuClose` | Cerrar el menú | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.skip` | Ir al contenido | sin cambio | sin cambio | sin cambio | |
| `v2admin.loading` | Cargando… | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.noProfileTitle` | No se ha encontrado tu perfil | sin cambio | sin cambio | sin cambio | |
| `v2admin.noProfileText` | La sesión es válida, pero la cuenta no tiene perfil en el panel. Pide acceso a quien administra el canal. | sin cambio | sin cambio | sin cambio | |
| `v2admin.euFlag` | Bandera de la Unión Europea | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.status.received` | Recibida | sin cambio | sin cambio | sin cambio | |
| `v2admin.status.reviewing` | En revisión | sin cambio | sin cambio | sin cambio | |
| `v2admin.status.investigating` | En investigación | sin cambio | sin cambio | sin cambio | |
| `v2admin.status.waiting` | Esperando a quien informa | sin cambio | sin cambio | sin cambio | |
| `v2admin.status.resolved` | Resuelta | sin cambio | sin cambio | sin cambio | |
| `v2admin.status.closed` | Cerrada | sin cambio | sin cambio | sin cambio | |
| `v2admin.status.archived` | Archivada | sin cambio | sin cambio | sin cambio | |
| `v2admin.priority.low` | Baja | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.priority.normal` | Normal | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.priority.high` | Alta | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.priority.critical` | Crítica | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.langs.ca` | Catalán | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.langs.es` | Castellano | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.langs.en` | Inglés | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.exportPdf` | Exportar PDF | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.exportErr` | No se ha podido exportar. Inténtelo de nuevo. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2admin.vOverdue` | Plazo vencido | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.searchPh` | Buscar referencia | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.fStatus` | Estado | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.fCategory` | Categoría | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.fPriority` | Prioridad | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.fFrom` | Desde | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.fTo` | Hasta | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.filters` | Filtros | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.clearFilters` | Quitar filtros | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.cCode` | Referencia | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.cCategory` | Categoría | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.cStatus` | Estado | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.cPriority` | Prioridad | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.cReceived` | Recibida | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.cDeadline` | Plazo legal | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.anon` | Anónima | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.ident` | Identificada | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.today` | Hoy | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.yesterday` | Ayer | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.daysAgo` | Hace {n} días | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.open` | Abrir {code} | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.copyLink` | Copiar el enlace del canal | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.linkCopied` | Enlace copiado | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.noAccessTitle` | No tienes temas asignados | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.noAccessText` | Pide a quien administra el canal que te dé acceso a los temas que debes gestionar. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.loadErr` | No se han podido cargar los datos. Compruebe la conexión e inténtelo de nuevo. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2admin.retry` | Reintentar | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.dlToday` | Vence hoy | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.dlOverdueOne` | Vencido hace 1 día | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.dlOverdue` | Vencido hace {n} días | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.back` | Denuncias | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.ackDoneOn` | Hecho el {date} | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.until` | Fecha límite: {date} | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.facts` | Hechos denunciados | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.reporter` | Informante | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.identityNone` | Identidad: no registrada | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.fName` | Nombre y apellidos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.fEmail` | Correo electrónico | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.fPhone` | Teléfono | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.notStored` | No se registra | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.copy` | Copiar | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.copied` | Copiado | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.docs` | Documentos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.download` | Descargar | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.downloadAria` | Descargar {name} | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.downloadDemo` | En la demostración los documentos no se descargan. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.downloadErr` | No se ha podido descargar. Inténtelo de nuevo. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2admin.msgs` | Mensajes con el informante | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.msgPh` | Escriba la respuesta al informante | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2admin.msgErr` | No se ha podido enviar. Inténtelo de nuevo. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2admin.manage` | Gestión | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.note` | Nota interna | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.save` | Guardar cambios | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.saving` | Guardando… | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.saved` | Cambios guardados. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.saveErr` | No se han podido guardar los cambios. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.audit` | Registro de actividad | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aCreated` | Denuncia recibida por el canal | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aStatus` | {who} cambió el estado a {to} | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aStatusAnon` | Estado cambiado a {to} | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aPriority` | {who} cambió la prioridad a {to} | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aPriorityAnon` | Prioridad cambiada a {to} | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aMessage` | {who} respondió a quien informa | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aMessageAnon` | Respuesta enviada a quien informa | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aNote` | {who} añadió una nota | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aNoteAnon` | Nota añadida | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aOther` | Acción registrada | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.exportOne` | Exportar PDF | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.del` | Suprimir los datos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.delConfirm` | Suprimir los datos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.deleting` | Suprimiendo… | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.deleted` | Se han suprimido los datos de {code}. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.delErr` | No se ha podido eliminar. Es posible que no tengas permiso. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.loadErrTitle` | No se ha podido cargar | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.loadErrText` | Comprueba la conexión e inténtalo de nuevo. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aReporterMsg` | Quien informa ha escrito un mensaje | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aExtended` | {who} ha ampliado el plazo de respuesta | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aExtendedAnon` | Plazo de respuesta ampliado | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aAnonymized` | {who} ha suprimido los datos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aAnonymizedAnon` | Datos suprimidos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aIdentity` | {who} ha consultado la identidad de quien informa | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aIdentityAnon` | Identidad de quien informa consultada | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aRegistered` | {who} ha registrado la comunicación | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aRegisteredAnon` | Comunicación registrada a mano | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aMeeting` | {who} ha anotado la reunión presencial | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aMeetingAnon` | Reunión presencial anotada | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aFiscal` | {who} ha anotado la remisión al Ministerio Fiscal | legal: no se toca | — | — | |
| `v2admin.aFiscalAnon` | Remisión al Ministerio Fiscal anotada | legal: no se toca | — | — | |
| `v2admin.aOutcome` | {who} ha indicado el resultado | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aOutcomeAnon` | Resultado indicado | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.ackSend` | Enviar el acuse de recibo | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.ackSent` | Acuse enviado. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.ackErr` | No se ha podido enviar el acuse. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.extendTitle` | Ampliar el plazo de respuesta | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.extendText` | La Ley 2/2023 (artículo 9.2 d) permite ampliar el plazo hasta 3 meses más en casos de especial complejidad. El motivo queda en el registro de actividad. | legal: no se toca | — | — | |
| `v2admin.extendReason` | Motivo de la ampliación | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.extendConfirm` | Ampliar hasta el {date} | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.extendErrReason` | Explica el motivo (mínimo 10 caracteres). | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.extendErr` | No se ha podido ampliar el plazo. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.extendOk` | Plazo ampliado hasta el {date}. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.supTitle` | ¿Suprimir los datos de {code}? | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.supText` | Se borrarán la descripción, los mensajes, los documentos y los datos de contacto. En el libro-registro se conservan la referencia, la categoría, las fechas y el estado (artículo 3… | legal: no se toca | — | — | |
| `v2admin.supReason` | Motivo de la supresión | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.supReasonPh` | Por ejemplo: tres meses sin iniciar investigación (art. 32.4) | legal: no se toca | — | — | |
| `v2admin.supErrReason` | Escribe el motivo. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.anonBanner` | Datos suprimidos el {date} | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.anonBannerText` | El contenido, los mensajes, los documentos y los datos de contacto se han suprimido conforme al artículo 32 de la Ley 2/2023. En el libro-registro se conservan la referencia, la c… | legal: no se toca | — | — | |
| `v2admin.retText` | Hace más de tres meses que se recibieron y no se ha iniciado ninguna investigación. La Ley 2/2023 (artículo 32.4) obliga a suprimir sus datos, salvo de forma anonimizada. | legal: no se toca | — | — | |
| `v2admin.cancel` | Cancelar | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.notFoundTitle` | Denuncia no encontrada | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.notFoundText` | Puede que se haya eliminado o que la dirección no sea correcta. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.noViewTitle` | No tienes acceso a esta denuncia | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.noViewText` | Pertenece a un tema que no tienes asignado. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.invite` | Invitar a un gestor | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.inviteLead` | Recibirá un correo para crear su contraseña. Después, asígnele las categorías que debe gestionar. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2admin.fullName` | Nombre y apellidos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.email` | Correo electrónico | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.sendInvite` | Enviar la invitación | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.sending` | Enviando… | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.inviteOk` | Invitación enviada a {email}. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.inviteErr` | No se ha podido enviar la invitación. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.inviteExists` | Ya hay un usuario con este correo. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.you` | Usted | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.catsOne` | 1 categoría | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.catsMany` | {n} categorías | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.catsNone` | Sin categorías | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.invited` | Invitado | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.permsLead` | Marque qué puede hacer en cada categoría. Sin «Ver», la categoría no aparece en su panel. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2admin.permHint` | Editar, Responder y Eliminar activan Ver. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.permAria` | {perm}: {cat} | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.unsaved` | Cambios sin guardar | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.discard` | Descartar | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.savePerms` | Guardar permisos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.permsSaved` | Permisos guardados. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.permsErr` | No se han podido guardar los permisos. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.remove` | Quitar el acceso | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.removeText` | Ya no podrá entrar en el panel y se borrarán sus permisos. No se puede deshacer. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.removing` | Quitando… | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.removed` | Se ha quitado el acceso a {name}. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.removeErr` | No se ha podido quitar el acceso. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.promote` | Hacer administrador | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.demote` | Quitar como administrador | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.promoteText` | Tendrá acceso a todas las denuncias, a los usuarios y a la cuenta. Conviene tener dos administradores para que el canal no dependa de una sola persona. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.demoteText` | Pasará a ser gestor sin ninguna categoría asignada. Después podrá darle permisos. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2admin.promoted` | {name} ya es administrador. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.demoted` | {name} ya no es administrador. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.roleErr` | No se ha podido cambiar el rol. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.account` | Su cuenta | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.role` | Rol | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.stepOf` | Paso {n} de 2 | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.s1Text` | Abra Google Authenticator, Authy u otra aplicación de autenticación y escanee este código. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2admin.qrAlt` | Código QR para la aplicación de autenticación | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.manualKey` | Si no puede escanearlo, escriba esta clave: | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2admin.copyKey` | Copiar la clave | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.next` | Continuar | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.backStep` | Volver | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.s2Text` | Es el código que muestra la aplicación. Cambia cada 30 segundos. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.codeLabel` | Código de verificación | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.verify` | Verificar y activar | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.verifying` | Verificando… | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.codeErr` | El código no es correcto. Compruebe que la hora del teléfono es la correcta y vuelva a intentarlo. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2admin.startErr` | No se ha podido iniciar la configuración. Inténtelo de nuevo. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2admin.enabledOk` | Verificación en dos pasos activada. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.iLegalBody` | {org} dispone de un canal interno de denuncias conforme a la Ley 2/2023, de 20 de febrero, reguladora de la protección de las personas que informen sobre infracciones normativas y… | legal: no se toca | — | — | |
| `v2admin.aTrialToday` | Termina hoy. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aRenewToday` | Vence hoy. Para renovarlo, escríbanos. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aMailSubject` | Contratar Reportia · {org} | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.aMailBody` | Empresa: {org} Canal: {url} Plan que nos interesa: Número de trabajadores:  | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2admin.rOpenOverdue` | Abiertas con el plazo vencido | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |

### 2.6 Documentos: Excel, PDF del caso, informe y cartel

121 claves.

| clave | ES actual | ES propuesto | CA propuesto | EN propuesto | motivo |
|---|---|---|---|---|---|
| `v2export.fView` | Vista | sin cambio | sin cambio | sin cambio | |
| `v2export.posterBand` | Sistema interno de información · Ley 2/2023 | legal: no se toca | — | — | |
| `v2export.posterTitle` | Canal de denuncias | sin cambio | sin cambio | sin cambio | |
| `v2export.posterPromise` | Puedes denunciar sin dar tu nombre. | sin cambio | sin cambio | sin cambio | |
| `v2export.posterLead` | Es el canal interno de {org} para informar de fraude, acoso u otras infracciones. | sin cambio | sin cambio | sin cambio | |
| `v2export.posterScan` | Escanea el código con tu móvil o escribe esta dirección: | sin cambio | sin cambio | sin cambio | |
| `v2export.posterPoints[0]` | No se te pedirá nombre, correo ni teléfono. | sin cambio | sin cambio | sin cambio | |
| `v2export.posterPoints[1]` | Recibirás un código para consultar el estado y responder mensajes. | sin cambio | sin cambio | sin cambio | |
| `v2export.posterPoints[2]` | Solo accede el personal autorizado de {org}. | sin cambio | sin cambio | sin cambio | |
| `v2export.posterTip` | Para mayor privacidad, utiliza un dispositivo y una conexión que no sean de la empresa. | sin cambio | sin cambio | sin cambio | |
| `v2export.posterLaw` | La Ley 2/2023 prohíbe las represalias contra quien informa con motivos razonables para creer que la información es veraz. | legal: no se toca | — | — | |
| `v2export.posterFile` | cartel-canal-denuncias | sin cambio | sin cambio | sin cambio | |
| `v2export.confidential` | Confidencial | sin cambio | sin cambio | sin cambio | |
| `v2export.docConfidential` | Documento confidencial | sin cambio | sin cambio | sin cambio | |
| `v2export.generated` | Generado el {date} a las {time} | sin cambio | sin cambio | sin cambio | |
| `v2export.page` | Página {n} de {total} | sin cambio | sin cambio | sin cambio | |
| `v2export.notStated` | No consta | sin cambio | sin cambio | sin cambio | |
| `v2export.identityWithheld` | Identificada. Los datos de contacto no se incluyen en este documento. | sin cambio | sin cambio | sin cambio | |
| `v2export.quoted` | «{q}» | sin cambio | sin cambio | sin cambio | |
| `v2export.summaryTitle` | Informe de denuncias | sin cambio | sin cambio | sin cambio | |
| `v2export.filters` | Filtros aplicados | sin cambio | sin cambio | sin cambio | |
| `v2export.noFilters` | ninguno | sin cambio | sin cambio | sin cambio | |
| `v2export.fStatus` | Estado | sin cambio | sin cambio | sin cambio | |
| `v2export.fCategory` | Tema | sin cambio | sin cambio | sin cambio | |
| `v2export.fPriority` | Prioridad | sin cambio | sin cambio | sin cambio | |
| `v2export.fFrom` | Desde | sin cambio | sin cambio | sin cambio | |
| `v2export.fTo` | Hasta | sin cambio | sin cambio | sin cambio | |
| `v2export.fSearch` | Búsqueda | sin cambio | sin cambio | sin cambio | |
| `v2export.kTotal` | Denuncias | sin cambio | sin cambio | sin cambio | |
| `v2export.kOpen` | Abiertas | sin cambio | sin cambio | sin cambio | |
| `v2export.kClosed` | Cerradas | sin cambio | sin cambio | sin cambio | |
| `v2export.kAnon` | Anónimas | sin cambio | sin cambio | sin cambio | |
| `v2export.kOverdue` | Respuesta vencida | sin cambio | sin cambio | sin cambio | |
| `v2export.empty` | Ninguna denuncia cumple los filtros aplicados. | sin cambio | sin cambio | sin cambio | |
| `v2export.emptyAll` | No hay denuncias registradas. | sin cambio | sin cambio | sin cambio | |
| `v2export.legendOverdue` | En rojo, denuncias abiertas que han superado el límite de respuesta. | sin cambio | sin cambio | sin cambio | |
| `v2export.legendDeadline` | Límite de respuesta: tres meses desde la recepción (artículo 9 de la Ley 2/2023), sin contar la posible ampliación de otros tres meses en casos de especial complejidad. | legal: no se toca | — | — | |
| `v2export.cCode` | Referencia | sin cambio | sin cambio | sin cambio | |
| `v2export.cCategory` | Tema | sin cambio | sin cambio | sin cambio | |
| `v2export.cStatus` | Estado | sin cambio | sin cambio | sin cambio | |
| `v2export.cPriority` | Prioridad | sin cambio | sin cambio | sin cambio | |
| `v2export.cMode` | Modalidad | sin cambio | sin cambio | sin cambio | |
| `v2export.cDept` | Departamento | sin cambio | sin cambio | sin cambio | |
| `v2export.cIncident` | Fecha de los hechos | sin cambio | sin cambio | sin cambio | |
| `v2export.cReceived` | Recepción | sin cambio | sin cambio | sin cambio | |
| `v2export.cReceivedLong` | Fecha de recepción | sin cambio | sin cambio | sin cambio | |
| `v2export.cAcked` | Acuse de recibo | sin cambio | sin cambio | sin cambio | |
| `v2export.cAnswered` | Respuesta | sin cambio | sin cambio | sin cambio | |
| `v2export.cDeadline` | Límite de respuesta | sin cambio | sin cambio | sin cambio | |
| `v2export.cLang` | Idioma | sin cambio | sin cambio | sin cambio | |
| `v2export.anonymous` | Anónima | sin cambio | sin cambio | sin cambio | |
| `v2export.identified` | Identificada | sin cambio | sin cambio | sin cambio | |
| `v2export.detailTitle` | Ficha de denuncia | sin cambio | sin cambio | sin cambio | |
| `v2export.code` | Referencia | sin cambio | sin cambio | sin cambio | |
| `v2export.sData` | Datos de la denuncia | sin cambio | sin cambio | sin cambio | |
| `v2export.sDeadlines` | Plazos de la Ley 2/2023 | legal: no se toca | — | — | |
| `v2export.sFacts` | Hechos denunciados | sin cambio | sin cambio | sin cambio | |
| `v2export.sAttachments` | Documentación adjunta | sin cambio | sin cambio | sin cambio | |
| `v2export.sMessages` | Mensajes | sin cambio | sin cambio | sin cambio | |
| `v2export.sAudit` | Registro de actividad | sin cambio | sin cambio | sin cambio | |
| `v2export.identity` | Identidad | sin cambio | sin cambio | sin cambio | |
| `v2export.identityNone` | No registrada | sin cambio | sin cambio | sin cambio | |
| `v2export.name` | Nombre y apellidos | sin cambio | sin cambio | sin cambio | |
| `v2export.email` | Correo electrónico | sin cambio | sin cambio | sin cambio | |
| `v2export.phone` | Teléfono | sin cambio | sin cambio | sin cambio | |
| `v2export.updated` | Última actualización | sin cambio | sin cambio | sin cambio | |
| `v2export.language` | Idioma de la denuncia | sin cambio | sin cambio | sin cambio | |
| `v2export.involved` | Personas implicadas | sin cambio | sin cambio | sin cambio | |
| `v2export.noDescription` | Sin descripción. | sin cambio | sin cambio | sin cambio | |
| `v2export.dStep` | Trámite | sin cambio | sin cambio | sin cambio | |
| `v2export.dTerm` | Plazo | sin cambio | sin cambio | sin cambio | |
| `v2export.dDate` | Fecha límite | sin cambio | sin cambio | sin cambio | |
| `v2export.dState` | Situación | sin cambio | sin cambio | sin cambio | |
| `v2export.dAck` | Acuse de recibo | sin cambio | sin cambio | sin cambio | |
| `v2export.dAckRule` | 7 días naturales | sin cambio | sin cambio | sin cambio | |
| `v2export.dReply` | Respuesta | sin cambio | sin cambio | sin cambio | |
| `v2export.dReplyRule` | 3 meses | sin cambio | sin cambio | sin cambio | |
| `v2export.dLeftOne` | Queda 1 día | sin cambio | sin cambio | sin cambio | |
| `v2export.dLeft` | Quedan {n} días | sin cambio | sin cambio | sin cambio | |
| `v2export.dToday` | Vence hoy | sin cambio | sin cambio | sin cambio | |
| `v2export.dOverOne` | Vencido hace 1 día | sin cambio | sin cambio | sin cambio | |
| `v2export.dOver` | Vencido hace {n} días | sin cambio | sin cambio | sin cambio | |
| `v2export.dFirstMsg` | Hecho el {date} | sin cambio | sin cambio | sin cambio | |
| `v2export.dReplied` | Respuesta el {date} | sin cambio | sin cambio | sin cambio | |
| `v2export.dClosed` | Sin plazo pendiente ({status}) | sin cambio | sin cambio | sin cambio | |
| `v2export.dNote` | Calculado desde la fecha de recepción ({date}), según el artículo 9 de la Ley 2/2023. No incluye la ampliación de hasta tres meses más prevista para casos de especial complejidad. | legal: no se toca | — | — | |
| `v2export.aName` | Archivo | sin cambio | sin cambio | sin cambio | |
| `v2export.aType` | Tipo | sin cambio | sin cambio | sin cambio | |
| `v2export.aSize` | Tamaño | sin cambio | sin cambio | sin cambio | |
| `v2export.mDate` | Fecha | sin cambio | sin cambio | sin cambio | |
| `v2export.mFrom` | Remitente | sin cambio | sin cambio | sin cambio | |
| `v2export.mText` | Mensaje | sin cambio | sin cambio | sin cambio | |
| `v2export.reporter` | Quien informa | sin cambio | sin cambio | sin cambio | |
| `v2export.manager` | Gestor | sin cambio | sin cambio | sin cambio | |
| `v2export.noMessages` | Todavía no hay mensajes en esta denuncia. | sin cambio | sin cambio | sin cambio | |
| `v2export.logDate` | Fecha | sin cambio | sin cambio | sin cambio | |
| `v2export.logAction` | Acción | sin cambio | sin cambio | sin cambio | |
| `v2export.logDetail` | Detalle | sin cambio | sin cambio | sin cambio | |
| `v2export.actCreated` | Denuncia recibida | sin cambio | sin cambio | sin cambio | |
| `v2export.actStatus` | Estado cambiado a «{status}» | sin cambio | sin cambio | sin cambio | |
| `v2export.priorities.low` | Baja | sin cambio | sin cambio | sin cambio | |
| `v2export.priorities.normal` | Normal | sin cambio | sin cambio | sin cambio | |
| `v2export.priorities.high` | Alta | sin cambio | sin cambio | sin cambio | |
| `v2export.priorities.critical` | Crítica | sin cambio | sin cambio | sin cambio | |
| `v2export.langNames.ca` | Catalán | sin cambio | sin cambio | sin cambio | |
| `v2export.langNames.es` | Castellano | sin cambio | sin cambio | sin cambio | |
| `v2export.langNames.en` | Inglés | sin cambio | sin cambio | sin cambio | |
| `v2export.xSheet` | Denuncias | sin cambio | sin cambio | sin cambio | |
| `v2export.xSummarySheet` | Resumen | sin cambio | sin cambio | sin cambio | |
| `v2export.xSummaryTitle` | Resumen de denuncias | sin cambio | sin cambio | sin cambio | |
| `v2export.xByStatus` | Por estado | sin cambio | sin cambio | sin cambio | |
| `v2export.xByCategory` | Por tema | sin cambio | sin cambio | sin cambio | |
| `v2export.xByPriority` | Por prioridad | sin cambio | sin cambio | sin cambio | |
| `v2export.xByMode` | Por modalidad | sin cambio | sin cambio | sin cambio | |
| `v2export.xCount` | Denuncias | sin cambio | sin cambio | sin cambio | |
| `v2export.xShare` | % del total | sin cambio | sin cambio | sin cambio | |
| `v2export.xTotal` | Total | sin cambio | sin cambio | sin cambio | |
| `v2export.xNote` | Recuentos calculados a partir de la hoja «{sheet}». | sin cambio | sin cambio | sin cambio | |
| `v2export.fileSummary` | denuncias_informe | sin cambio | sin cambio | sin cambio | |
| `v2export.fileDetail` | denuncia | sin cambio | sin cambio | sin cambio | |
| `v2export.fileExcel` | denuncias | sin cambio | sin cambio | sin cambio | |

### 2.7 Web comercial: cabecera, portada, alta y página no encontrada

231 claves.

| clave | ES actual | ES propuesto | CA propuesto | EN propuesto | motivo |
|---|---|---|---|---|---|
| `v2site.homeLabel` | Reportia, inicio | sin cambio | sin cambio | sin cambio | |
| `v2site.navLabel` | Navegación principal | sin cambio | sin cambio | sin cambio | |
| `v2site.navDemo` | Ver un canal de ejemplo | sin cambio | sin cambio | sin cambio | |
| `v2site.navLogin` | Acceder | sin cambio | sin cambio | sin cambio | |
| `v2site.navSignup` | Crear cuenta | sin cambio | sin cambio | sin cambio | |
| `v2site.menuOpen` | Abrir el menú | sin cambio | sin cambio | sin cambio | |
| `v2site.menuClose` | Cerrar el menú | sin cambio | sin cambio | sin cambio | |
| `v2site.navHow` | Cómo funciona | sin cambio | sin cambio | sin cambio | |
| `v2site.metaDesc` | Canal de denuncias para empresas conforme a la Ley 2/2023: denuncias anónimas o identificadas, seguimiento con código y panel de gestión. | legal: no se toca | — | — | |
| `v2site.navLaw` | Cumplimiento | sin cambio | sin cambio | sin cambio | |
| `v2site.navPricing` | Precios | sin cambio | sin cambio | sin cambio | |
| `v2site.navFaq` | Preguntas | sin cambio | sin cambio | sin cambio | |
| `v2site.navDemoShort` | Canal de ejemplo | sin cambio | sin cambio | sin cambio | |
| `v2site.footerContact` | Contacto | sin cambio | sin cambio | sin cambio | |
| `v2site.footerNav` | Enlaces del pie | sin cambio | sin cambio | sin cambio | |
| `v2site.footerName` | Reportia · Canal de denuncias para empresas | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.panelTitle` | Así lo ve tu empresa | **El panel de gestión** | El panell de gestió | The management panel | Descriptivo |
| `v2site.lp.panelAlt` | Panel de gestión con la lista de denuncias, sus estados y sus plazos legales | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.titleA` | Canal de denuncias | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.titleB` | para tu empresa | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.howTitle` | Cómo funciona | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.pause` | Detener el paso automático | **Pausar** | Pausa | Pause | «Stop moving on» es mal inglés (obs. 18) y las tres versiones son largas para un botón |
| `v2site.lp.play` | Volver a pasar solo | **Reanudar** | Reprèn | Resume | Igual que lp.pause |
| `v2site.lp.howLead` | Del aviso a la respuesta, en cuatro pasos. | **El recorrido de una denuncia, en cuatro pasos.** | El recorregut d’una denúncia, en quatre passos. | The path of a report, in four steps. | Menos eslogan |
| `v2site.lp.howShort[0]` | Entra al canal | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.howShort[1]` | Lo cuenta | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.howShort[2]` | Recibe un código | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.howShort[3]` | Tu empresa responde | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.howLine[0]` | Desde el enlace, el botón de tu web o un código QR. | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.howLine[1]` | Con su nombre o sin él, y con documentos si quiere. | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.howLine[2]` | Con él consulta su caso y responde, sin decir quién es. | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.howLine[3]` | Acusa recibo, investiga y responde dentro de plazo. | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.howAlt[0]` | Página de inicio del canal de una empresa | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.howAlt[1]` | Primer paso del formulario: denuncia anónima o identificada | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.howAlt[2]` | Pantalla con el código de seguimiento | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.howAlt[3]` | Ficha de una denuncia en el panel, con los plazos legales | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.setupTitle` | Y tu empresa lo pone en marcha en tres pasos | **Puesta en marcha en tres pasos** | Posada en marxa en tres passos | Set-up in three steps | Un título no empieza por «Y» |
| `v2site.lp.catTitle` | Qué se puede comunicar | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.catSay.fraud` | Se inflan las facturas de un proveedor amigo. | **Facturas infladas de un proveedor** | Factures inflades d’un proveïdor | Inflated invoices from a supplier | Entre comillas y en grande parece un testimonio inventado (obs. 18): pasa a ser un ejemplo descriptivo, sin comillas |
| `v2site.lp.catSay.harassment` | Un responsable humilla a dos compañeras delante del equipo. | **Humillaciones de un responsable a personas de su equipo** | Humiliacions d’un responsable a persones del seu equip | A manager humiliating members of the team | Igual que lp.catSay.fraud |
| `v2site.lp.catSay.discrimination` | A los mayores de 50 nunca les tocan los turnos buenos. | **Reparto de turnos que perjudica a los mayores de 50 años** | Repartiment de torns que perjudica els majors de 50 anys | Shift allocation that disadvantages staff over 50 | Igual que lp.catSay.fraud |
| `v2site.lp.catSay.safety` | La prensa del turno de noche trabaja sin protección. | **Una máquina que funciona sin sus protecciones** | Una màquina que funciona sense les proteccions | A machine operating without its guards | Igual que lp.catSay.fraud. El inglés actual («runs with no guard») no se entiende |
| `v2site.lp.catSay.data` | Se envían datos de clientes a otra empresa sin permiso. | **Datos de clientes enviados a otra empresa sin permiso** | Dades de clients enviades a una altra empresa sense permís | Customer data sent to another company without consent | Igual que lp.catSay.fraud |
| `v2site.lp.catSay.conflict` | Compras contrata siempre a la empresa de un familiar. | **Contratos adjudicados siempre a la empresa de un familiar** | Contractes adjudicats sempre a l’empresa d’un familiar | Contracts always awarded to a relative’s company | Igual que lp.catSay.fraud |
| `v2site.lp.catSay.accounting` | Hay gastos personales pasados como dietas. | **Gastos personales declarados como dietas** | Despeses personals declarades com a dietes | Personal expenses claimed as allowances | Igual que lp.catSay.fraud |
| `v2site.lp.catSay.environmental` | Los residuos se vierten al desagüe por la noche. | **Vertido de residuos al desagüe** | Abocament de residus al desguàs | Waste poured down the drain | Igual que lp.catSay.fraud |
| `v2site.lp.figs[0].v` | 50+ | legal: no se toca | — | — | |
| `v2site.lp.figs[0].l` | trabajadores: desde aquí es obligatorio | legal: no se toca | — | — | |
| `v2site.lp.figs[1].v` | 7 días | legal: no se toca | — | — | |
| `v2site.lp.figs[1].l` | naturales para acusar recibo | legal: no se toca | — | — | |
| `v2site.lp.figs[2].v` | 3 meses | legal: no se toca | — | — | |
| `v2site.lp.figs[2].l` | como máximo para responder | legal: no se toca | — | — | |
| `v2site.lp.figs[3].v` | 1.000.000 € | legal: no se toca | — | — | |
| `v2site.lp.figs[3].l` | de multa máxima por no tenerlo | legal: no se toca | — | — | |
| `v2site.lp.deadTitle` | Los plazos de la ley, siempre a la vista | **Los plazos de la Ley 2/2023** | Els terminis de la Llei 2/2023 | The deadlines in Law 2/2023 | «Siempre a la vista» es coletilla de venta |
| `v2site.lp.dead[0].k` | Día 0 | legal: no se toca | — | — | |
| `v2site.lp.dead[0].t` | Se recibe la comunicación | legal: no se toca | — | — | |
| `v2site.lp.dead[0].d` | Quien informa obtiene su código de seguimiento. | legal: no se toca | — | — | |
| `v2site.lp.dead[1].k` | 7 días naturales | legal: no se toca | — | — | |
| `v2site.lp.dead[1].t` | Acuse de recibo | legal: no se toca | — | — | |
| `v2site.lp.dead[1].d` | Se envía desde el panel con un clic. | legal: no se toca | — | — | |
| `v2site.lp.dead[2].k` | 3 meses | legal: no se toca | — | — | |
| `v2site.lp.dead[2].t` | Respuesta | legal: no se toca | — | — | |
| `v2site.lp.dead[2].d` | Plazo máximo para responder a las actuaciones de investigación. | legal: no se toca | — | — | |
| `v2site.lp.dead[3].k` | +3 meses | legal: no se toca | — | — | |
| `v2site.lp.dead[3].t` | Ampliación | legal: no se toca | — | — | |
| `v2site.lp.dead[3].d` | Solo en casos de especial complejidad, con el motivo anotado. | legal: no se toca | — | — | |
| `v2site.lp.deadRef` | Artículo 9 de la Ley 2/2023 | legal: no se toca | — | — | |
| `v2site.lp.contactTitle` | ¿Prefieres que te lo enseñemos? | **¿Quieres una demostración?** | Vols una demostració? | Would you like a demonstration? | Más directo |
| `v2site.lp.contactCopy` | Copiar el correo | sin cambio | sin cambio | sin cambio | |
| `v2site.lp.contactCopied` | Correo copiado | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.docTitle` | Reportia · Canal de denuncias para empresas | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.promise` | Tu plantilla avisa de una irregularidad sin dar su nombre. Tu empresa la investiga y responde. | **Sistema interno de información conforme a la Ley 2/2023: denuncias anónimas o identificadas, seguimiento con código y gestión de los plazos.** | Sistema intern d’informació conforme a la Llei 2/2023: denúncies anònimes o identificades, seguiment amb codi i gestió dels terminis. | An internal reporting system compliant with Spanish Law 2/2023: anonymous or identified reports, follow-up by code and deadline management. | Dos frases cortas de anuncio (obs. 20): mejor decir qué es |
| `v2site.landing.oblTitle` | ¿Está obligada tu empresa? | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.oblAnswer` | Sí, si es una empresa privada con 50 o más trabajadores. | legal: no se toca | — | — | |
| `v2site.landing.oblText` | La Ley 2/2023 les exige un sistema interno de información: un canal para comunicar infracciones que proteja a quien informa. | legal: no se toca | — | — | |
| `v2site.landing.oblLink` | Leer la Ley 2/2023 en el BOE | legal: no se toca | — | — | |
| `v2site.landing.oblRefs[0].art` | Artículo 10 | legal: no se toca | — | — | |
| `v2site.landing.oblRefs[0].text` | Obliga a las empresas privadas con 50 o más trabajadores a disponer de un sistema interno de información. | legal: no se toca | — | — | |
| `v2site.landing.oblRefs[1].art` | Artículo 9 | legal: no se toca | — | — | |
| `v2site.landing.oblRefs[1].text` | Fija un plazo máximo de tres meses para responder. | legal: no se toca | — | — | |
| `v2site.landing.oblRefs[2].art` | Artículo 36 | legal: no se toca | — | — | |
| `v2site.landing.oblRefs[2].text` | Prohíbe las represalias contra quien informa. | legal: no se toca | — | — | |
| `v2site.landing.oblRefs[3].art` | Artículos 63 y 65 | legal: no se toca | — | — | |
| `v2site.landing.oblRefs[3].text` | No disponer del sistema es una infracción muy grave: multa de 600.001 a 1.000.000 de euros para las personas jurídicas. | legal: no se toca | — | — | |
| `v2site.landing.opensBoe` | (se abre en el BOE) | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.lawTitle` | Lo que pide la ley, punto por punto | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.lawColArt` | Artículo | legal: no se toca | — | — | |
| `v2site.landing.lawRows[0].req` | Admitir denuncias anónimas | legal: no se toca | — | — | |
| `v2site.landing.lawRows[0].art` | 7.3 | legal: no se toca | — | — | |
| `v2site.landing.lawRows[0].how` | En modo anónimo, el formulario no pide nombre, correo ni teléfono. | legal: no se toca | — | — | |
| `v2site.landing.lawRows[1].req` | Acusar recibo en 7 días naturales | legal: no se toca | — | — | |
| `v2site.landing.lawRows[1].art` | 9.2 c) | legal: no se toca | — | — | |
| `v2site.landing.lawRows[1].how` | El panel señala las denuncias pendientes de acuse y los días que quedan. | legal: no se toca | — | — | |
| `v2site.landing.lawRows[2].req` | Responder en un máximo de 3 meses | legal: no se toca | — | — | |
| `v2site.landing.lawRows[2].art` | 9.2 d) | legal: no se toca | — | — | |
| `v2site.landing.lawRows[2].how` | Cada denuncia muestra su plazo. Las que vencen pronto y las vencidas se ven al entrar. | legal: no se toca | — | — | |
| `v2site.landing.lawRows[3].req` | Poder comunicarse con quien informa | legal: no se toca | — | — | |
| `v2site.landing.lawRows[3].art` | 9.2 e) | legal: no se toca | — | — | |
| `v2site.landing.lawRows[3].how` | Mensajes dentro de la denuncia, también si es anónima, con el código de seguimiento. | legal: no se toca | — | — | |
| `v2site.landing.lawRows[4].req` | Garantizar la confidencialidad e impedir el acceso no autorizado | legal: no se toca | — | — | |
| `v2site.landing.lawRows[4].art` | 5.2 b) | legal: no se toca | — | — | |
| `v2site.landing.lawRows[4].how` | Solo entran los gestores que tú autorices, con permisos por categoría y verificación en dos pasos. | legal: no se toca | — | — | |
| `v2site.landing.lawRows[5].req` | Llevar un libro-registro de las denuncias | legal: no se toca | — | — | |
| `v2site.landing.lawRows[5].art` | 26 | legal: no se toca | — | — | |
| `v2site.landing.lawRows[5].how` | Listado completo con estados y fechas, exportable a Excel y PDF. | legal: no se toca | — | — | |
| `v2site.landing.lawRows[6].req` | Informar de los canales externos | legal: no se toca | — | — | |
| `v2site.landing.lawRows[6].art` | 7.2 | legal: no se toca | — | — | |
| `v2site.landing.lawRows[6].how` | El canal indica cómo acudir a la Autoridad Independiente de Protección del Informante. | legal: no se toca | — | — | |
| `v2site.landing.lawRows[7].req` | Dar a conocer el canal en la página de inicio de la web | legal: no se toca | — | — | |
| `v2site.landing.lawRows[7].art` | 25 | legal: no se toca | — | — | |
| `v2site.landing.lawRows[7].how` | Enlace, botón, código QR y texto para tu web, listos para copiar desde el panel. | legal: no se toca | — | — | |
| `v2site.landing.lawOwnTitle` | Lo que corresponde a tu empresa | legal: no se toca | — | — | |
| `v2site.landing.lawOwnLead` | Reportia es la herramienta. Estos pasos solo los puede dar tu organización. | legal: no se toca | — | — | |
| `v2site.landing.lawOwn[0].text` | Designar a la persona Responsable del Sistema y comunicarlo a la Autoridad en 10 días hábiles. | legal: no se toca | — | — | |
| `v2site.landing.lawOwn[0].art` | Art. 8 | legal: no se toca | — | — | |
| `v2site.landing.lawOwn[1].text` | Aprobar la política del sistema y el procedimiento de gestión de las denuncias. | legal: no se toca | — | — | |
| `v2site.landing.lawOwn[1].art` | Arts. 5 y 9 | legal: no se toca | — | — | |
| `v2site.landing.lawOwn[2].text` | Consultar antes con la representación legal de las personas trabajadoras. | legal: no se toca | — | — | |
| `v2site.landing.lawOwn[2].art` | Art. 5.1 | legal: no se toca | — | — | |
| `v2site.landing.step1t` | Crea la cuenta | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.step1d` | Con el nombre de tu empresa y tu correo. | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.step2t` | Comparte el enlace | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.step2d` | En la intranet, el tablón de anuncios o el manual de acogida. | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.step2path` | /canal/tu-empresa | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.step3t` | Gestione desde el panel | **Gestiona desde el panel** | Gestiona des del panell | sin cambio | Resto de «usted» («Gestione», «Gestioni») en una web que ya va en «tú» |
| `v2site.landing.step3d` | Revisa cada denuncia y responde a quien informa. | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.intBtnLabel` | Canal de denuncias | **sin cambio** | sin cambio | Reporting channel | En inglés el producto dice «reporting channel» en todas partes menos aquí |
| `v2site.landing.intQrAlt` | Código QR del canal de ejemplo | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.secTitle` | Seguridad y privacidad | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.sec[0].t` | Datos en la Unión Europea | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.sec[0].d` | Se guardan en servidores de Irlanda. | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.sec[1].t` | Cifrado | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.sec[1].d` | La conexión va cifrada y los datos se guardan cifrados en el servidor. | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.sec[2].t` | Solo lo ven tus gestores | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.sec[2].d` | Cada empresa ve solo sus denuncias y, dentro, cada gestor los temas que tiene permitidos. La identidad de quien informa solo se ve con una acción que queda registrada. | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.sec[3].t` | Acceso protegido | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.sec[3].d` | Verificación en dos pasos obligatoria y registro de cada acción. | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.priceTitle` | Precios | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.priceLead` | Una cuota anual según el tamaño de la empresa. Todos los planes tienen las mismas funciones. | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.plans.essential.name` | Esencial | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.plans.essential.size` | Hasta 249 trabajadores | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.plans.business.name` | Empresa | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.plans.business.size` | De 250 a 999 trabajadores | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.plans.corporate.name` | Corporativo | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.plans.corporate.size` | 1.000 trabajadores o más, y grupos de empresas | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.perYear` | al año | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.plusVat` | más IVA | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.custom` | A medida | **sin cambio** | sin cambio | Custom | «Tailored» se dice de un traje |
| `v2site.landing.customNote` | Según el número de sociedades y de trabajadores. | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.priceCta` | Empezar la prueba | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.priceContact` | Hablar con nosotros | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.trialNote` | {days} días de prueba con todas las funciones. No se pide ningún dato de pago. | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.inclTitle` | Todos los planes incluyen | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.incl[0]` | Canal propio de tu empresa, en catalán, castellano e inglés | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.incl[1]` | Denuncias anónimas o con datos, con seguimiento por código | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.incl[2]` | Panel con plazos legales, estados, prioridades y mensajes | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.incl[3]` | Gestores con permisos por categoría | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.incl[4]` | Verificación en dos pasos y registro de auditoría | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.incl[5]` | Exportación a Excel y PDF | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.incl[6]` | Enlace, botón y código QR para tu web | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.incl[7]` | Denuncias y gestores sin límite | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faqTitle` | Preguntas frecuentes | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faqMore` | ¿Tienes otra pregunta? | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faqWrite` | Escríbenos a | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faq[0].q` | ¿Mi empresa está obligada si tiene menos de 50 trabajadores? | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faq[0].a` | En general, no. La obligación empieza en 50 trabajadores. Con independencia del tamaño, también están obligadas las entidades de los sectores que cita el artículo 10.1 b), como lo… | legal: no se toca | — | — | |
| `v2site.landing.faq[1].q` | ¿Cómo sabe quien denuncia que su denuncia es anónima? | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faq[1].a` | El canal le muestra, antes de empezar, qué datos se registran y cuáles no. En modo anónimo el formulario no pide nombre, correo ni teléfono, y el seguimiento se hace con un código… | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faq[2].q` | ¿Qué ocurre si quien denuncia pierde su código? | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faq[2].a` | El código es la única forma de consultar una denuncia anónima y no se puede recuperar. La denuncia sigue en el panel y se gestiona igual, pero esa persona tendría que presentar un… | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faq[3].q` | ¿Quién puede ver las denuncias dentro de la empresa? | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faq[3].a` | Solo las personas que el administrador invite como gestores. A cada una se le asignan las categorías que puede ver y lo que puede hacer en ellas: ver, editar, responder o suprimir… | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faq[4].q` | ¿Cómo se añade el canal a nuestra web? | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faq[4].a` | Con un enlace. Desde el panel se copia la dirección del canal, un botón para la web o un código QR para carteles. No hay que instalar nada. | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faq[5].q` | ¿Cuánto se tarda en ponerlo en marcha? | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faq[5].a` | El canal queda activo al crear la cuenta y confirmar el correo. Después solo hay que compartir el enlace e invitar a los gestores. | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faq[6].q` | ¿Qué tenemos que hacer nosotros, además de contratar el canal? | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faq[6].a` | Tres pasos que solo puede dar tu organización. Están en «Lo que corresponde a tu empresa», dentro de Cumplimiento. | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faq[7].q` | ¿Cómo se paga? | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.faq[7].a` | Con una cuota anual según el tamaño de la empresa. Durante la prueba no se pide ningún dato de pago. | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.endTitle` | Pon en marcha el canal de tu empresa | sin cambio | sin cambio | sin cambio | |
| `v2site.landing.endText` | Crea la cuenta con tu correo de empresa. Si antes quieres verlo, abre el canal de ejemplo. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.terms` | He leído y acepto la | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.termsLink` | política de privacidad | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.errTerms` | Para crear la cuenta hay que aceptar la política de privacidad. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.trialNote` | {days} días de prueba con todas las funciones. No se pide ningún dato de pago. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.docTitle` | Crear cuenta · Reportia | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.title` | Crear cuenta | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.lead` | Registra tu empresa y tendrás tu propio canal de denuncias. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.company` | Nombre de la empresa | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.companyHelp` | Aparecerá en la cabecera de tu canal. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.fullName` | Nombre y apellidos | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.email` | Correo electrónico | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.emailHelp` | Será tu usuario para acceder al panel. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.password` | Contraseña | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.passwordHelp` | Mínimo 8 caracteres. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.showPw` | Mostrar la contraseña | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.hidePw` | Ocultar la contraseña | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.submit` | Crear cuenta | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.submitting` | Creando la cuenta… | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.haveAccount` | ¿Ya tienes cuenta? | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.login` | Acceder | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.errCompany` | Escribe el nombre de la empresa. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.errName` | Escribe tu nombre. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.errEmail` | Escribe un correo electrónico válido. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.errPassword` | La contraseña debe tener al menos 8 caracteres. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.errInUse` | Ya hay una cuenta con este correo. Prueba a acceder. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.errWeak` | La contraseña es demasiado débil. Elige una más larga. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.errRate` | Has hecho demasiados intentos. Espera unos minutos e inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.errNetwork` | No hay conexión con el servidor. Comprueba la conexión e inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.errGeneric` | No se ha podido crear la cuenta. Inténtalo de nuevo dentro de unos minutos. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.doneTitle` | Revisa tu correo | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.doneText` | Te hemos enviado un enlace de confirmación a {email}. Ábrelo para activar la cuenta y después entra al panel. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.doneSpam` | Si no lo encuentras, revisa la carpeta de correo no deseado. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.doneCta` | Entrar al panel | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.incTitle` | Qué incluye | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.incItems[0]` | Un canal propio en /canal/tu-empresa, en catalán, castellano e inglés. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.incItems[1]` | Denuncias anónimas o con datos, con seguimiento por código y sin cuenta. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.incItems[2]` | Un panel con estados, prioridades y mensajes con quien informa. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.incItems[3]` | Gestores con permisos por categoría. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.incItems[4]` | Verificación en dos pasos y registro de auditoría. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.incItems[5]` | Exportación a Excel y PDF. | sin cambio | sin cambio | sin cambio | |
| `v2site.signup.incNote` | Tu usuario será el administrador principal de la cuenta y podrá invitar a otros gestores. | sin cambio | sin cambio | sin cambio | |
| `v2site.notFound.docTitle` | Página no encontrada · Reportia | sin cambio | sin cambio | sin cambio | |
| `v2site.notFound.title` | Esta página no existe | sin cambio | sin cambio | sin cambio | |
| `v2site.notFound.text` | Revisa la dirección. Puede que el enlace esté incompleto o que la página haya cambiado de sitio. | sin cambio | sin cambio | sin cambio | |
| `v2site.notFound.reportTitle` | ¿Quieres presentar una denuncia? | sin cambio | sin cambio | sin cambio | |
| `v2site.notFound.reportText` | Usa el enlace del canal de tu empresa. Lo encontrarás en la intranet, el tablón de anuncios o el manual de acogida. | sin cambio | sin cambio | sin cambio | |
| `v2site.notFound.home` | Ir al inicio | sin cambio | sin cambio | sin cambio | |
| `v2site.notFound.login` | Acceder al panel | sin cambio | sin cambio | sin cambio | |

### 2.8 Web comercial: política de privacidad

42 claves.

| clave | ES actual | ES propuesto | CA propuesto | EN propuesto | motivo |
|---|---|---|---|---|---|
| `v2site.privacy.docTitle` | Política de privacidad · Reportia | legal: no se toca | — | — | |
| `v2site.privacy.title` | Política de privacidad | legal: no se toca | — | — | |
| `v2site.privacy.updated` | Última actualización: mayo de 2026 | legal: no se toca | — | — | |
| `v2site.privacy.ownerGeneric` | la organización titular de cada canal | legal: no se toca | — | — | |
| `v2site.privacy.tocTitle` | En esta página | legal: no se toca | — | — | |
| `v2site.privacy.back` | Volver | legal: no se toca | — | — | |
| `v2site.privacy.sections[0].id` | responsable | legal: no se toca | — | — | |
| `v2site.privacy.sections[0].title` | Responsable del tratamiento | legal: no se toca | — | — | |
| `v2site.privacy.sections[0].p[0]` | El responsable del tratamiento es {org}, conforme al artículo 5.1 de la Ley 2/2023. Reportia (info@reportia.es) le presta el servicio tecnológico y actúa como encargado del tratam… | legal: no se toca | — | — | |
| `v2site.privacy.sections[1].id` | finalidad | legal: no se toca | — | — | |
| `v2site.privacy.sections[1].title` | Finalidad y base legal | legal: no se toca | — | — | |
| `v2site.privacy.sections[1].p[0]` | Los datos se tratan para gestionar las denuncias recibidas a través de este canal, en cumplimiento de la Ley 2/2023, de 20 de febrero, reguladora de la protección de las personas… | legal: no se toca | — | — | |
| `v2site.privacy.sections[1].dl[0][0]` | Base legal | legal: no se toca | — | — | |
| `v2site.privacy.sections[1].dl[0][1]` | Cumplimiento de una obligación legal (art. 6.1.c RGPD, en relación con el artículo 30.2 de la Ley 2/2023). Si la organización no está obligada a tener el sistema, interés público… | legal: no se toca | — | — | |
| `v2site.privacy.sections[2].id` | datos | legal: no se toca | — | — | |
| `v2site.privacy.sections[2].title` | Datos recogidos | legal: no se toca | — | — | |
| `v2site.privacy.sections[2].dl[0][0]` | Denuncia anónima | legal: no se toca | — | — | |
| `v2site.privacy.sections[2].dl[0][1]` | No se recogen datos identificativos. | legal: no se toca | — | — | |
| `v2site.privacy.sections[2].dl[1][0]` | Denuncia identificada | legal: no se toca | — | — | |
| `v2site.privacy.sections[2].dl[1][1]` | Correo electrónico. El nombre y el teléfono, solo si los da. | legal: no se toca | — | — | |
| `v2site.privacy.sections[2].dl[2][0]` | En todos los casos | legal: no se toca | — | — | |
| `v2site.privacy.sections[2].dl[2][1]` | Categoría, descripción de los hechos e idioma. Si los aporta, también departamento, fecha, personas implicadas y archivos adjuntos, y los mensajes que intercambie con quien gestio… | legal: no se toca | — | — | |
| `v2site.privacy.sections[3].id` | conservacion | legal: no se toca | — | — | |
| `v2site.privacy.sections[3].title` | Conservación | legal: no se toca | — | — | |
| `v2site.privacy.sections[3].p[0]` | Los datos se conservan solo el tiempo imprescindible para decidir si se abre una investigación. Si en tres meses desde la recepción no se ha iniciado ninguna, se suprimen, salvo l… | legal: no se toca | — | — | |
| `v2site.privacy.sections[4].id` | acceso | legal: no se toca | — | — | |
| `v2site.privacy.sections[4].title` | Confidencialidad y acceso | legal: no se toca | — | — | |
| `v2site.privacy.sections[4].p[0]` | Solo tienen acceso las personas que {org} autorice para gestionar el canal y, cuando proceda, las que prevé el artículo 32.1 de la Ley 2/2023 (responsable de recursos humanos o de… | legal: no se toca | — | — | |
| `v2site.privacy.sections[5].id` | terceros | legal: no se toca | — | — | |
| `v2site.privacy.sections[5].title` | Comunicación a terceros | legal: no se toca | — | — | |
| `v2site.privacy.sections[5].p[0]` | Los datos no se comunican a terceros, salvo cuando lo exija la ley o en los casos del artículo 32.2 de la Ley 2/2023. Reportia utiliza estos subencargados: Supabase Inc. (base de… | legal: no se toca | — | — | |
| `v2site.privacy.sections[6].id` | derechos | legal: no se toca | — | — | |
| `v2site.privacy.sections[6].title` | Sus derechos | legal: no se toca | — | — | |
| `v2site.privacy.sections[6].dl[0][0]` | Qué derechos | legal: no se toca | — | — | |
| `v2site.privacy.sections[6].dl[0][1]` | Acceso, rectificación, supresión, limitación, portabilidad y oposición. | legal: no se toca | — | — | |
| `v2site.privacy.sections[6].dl[1][0]` | Cómo ejercerlos | legal: no se toca | — | — | |
| `v2site.privacy.sections[6].dl[1][1]` | Dirigiéndose a {org}. También puede escribir a info@reportia.es con el asunto «Derechos RGPD» y le haremos llegar la solicitud. | legal: no se toca | — | — | |
| `v2site.privacy.sections[6].dl[2][0]` | Dónde reclamar | legal: no se toca | — | — | |
| `v2site.privacy.sections[6].dl[2][1]` | Ante la Agencia Española de Protección de Datos (aepd.es). | legal: no se toca | — | — | |
| `v2site.privacy.sections[7].id` | seguridad | legal: no se toca | — | — | |
| `v2site.privacy.sections[7].title` | Seguridad | legal: no se toca | — | — | |
| `v2site.privacy.sections[7].p[0]` | Se aplican medidas técnicas y organizativas para proteger la confidencialidad, la integridad y la disponibilidad de los datos: conexión cifrada (HTTPS), control de acceso por role… | legal: no se toca | — | — | |

### 2.9 Web comercial: acceso y contraseña de la versión anterior

69 claves.

| clave | ES actual | ES propuesto | CA propuesto | EN propuesto | motivo |
|---|---|---|---|---|---|
| `v2site.login.codeTitle` | Verificación en dos pasos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.codeLead` | Escriba el código de 6 dígitos de su aplicación de autenticación. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.login.codeLabel` | Código de verificación | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.codeSubmit` | Verificar y entrar | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.codeSubmitting` | Verificando… | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.codeErr` | El código no es correcto. Compruebe que la hora del teléfono es la correcta y vuelva a intentarlo. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.login.codeErrLength` | Escriba los 6 dígitos del código. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.login.codeOther` | Entrar con otra cuenta | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.codeDemo` | Demostración: se acepta cualquier código de 6 dígitos. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.docTitle` | Acceder · Reportia | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.title` | Acceder al panel | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.lead` | Para las personas que gestionan el canal de denuncias de su empresa. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.login.wrongTitle` | ¿Quiere presentar una denuncia? | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.wrongText` | Use el enlace del canal de su empresa. Desde aquí no se pueden presentar denuncias. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.login.email` | Correo electrónico | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.password` | Contraseña | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.forgot` | ¿Ha olvidado la contraseña? | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.login.verifying` | Verificación de seguridad | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.submit` | Entrar | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.submitting` | Entrando… | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.noAccount` | ¿Todavía no tiene cuenta? | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.login.signup` | Crear cuenta | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.errEmail` | Escriba un correo electrónico válido. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.login.errPassword` | Escriba la contraseña. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.login.errCaptcha` | Complete la verificación de seguridad. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.errUnconfirmed` | Todavía no ha confirmado su correo. Abra el enlace que le enviamos al crear la cuenta. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.login.errCredentials` | El correo o la contraseña no son correctos. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.login.errRate` | Ha hecho demasiados intentos. Espere unos minutos y vuelva a probar. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.login.errNetwork` | No hay conexión con el servidor. Compruebe la conexión y vuelva a probar. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.login.errGeneric` | No se ha podido entrar. Vuelva a probar dentro de unos minutos. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.forgot.docTitle` | Recuperar la contraseña · Reportia | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.forgot.title` | Recuperar la contraseña | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.forgot.lead` | Escriba el correo de su cuenta y le enviaremos un enlace para crear una contraseña nueva. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.forgot.email` | Correo electrónico | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.forgot.submit` | Enviar el enlace | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.forgot.submitting` | Enviando… | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.forgot.back` | Volver a Acceder | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.forgot.sentTitle` | Revise su correo | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.forgot.sentText` | Si hay una cuenta con la dirección {email}, recibirá un enlace para crear una contraseña nueva. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.forgot.sentSpam` | Puede tardar unos minutos. Revise también la carpeta de correo no deseado. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.forgot.errEmail` | Escriba un correo electrónico válido. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.forgot.errRate` | Ha hecho demasiadas solicitudes. Espere unos minutos y vuelva a probar. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.forgot.errNetwork` | No hay conexión con el servidor. Compruebe la conexión y vuelva a probar. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.forgot.errGeneric` | No se ha podido enviar el enlace. Vuelva a probar dentro de unos minutos. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.docTitle` | Contraseña nueva · Reportia | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.checking` | Comprobando el enlace… | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.titleReset` | Contraseña nueva | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.leadReset` | Escriba la nueva contraseña de su cuenta. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.titleInvite` | Le damos la bienvenida | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.leadInvite` | Cree una contraseña para acceder al panel de su empresa. | sin uso aparente | — | — | Sigue en «usted». Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.newPw` | Contraseña nueva | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.confirmPw` | Repita la contraseña | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.showPw` | Mostrar la contraseña | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.hidePw` | Ocultar la contraseña | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.reqTitle` | Requisitos | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.reqLength` | Al menos 8 caracteres | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.reqMatch` | Las dos contraseñas coinciden | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.reqOk` | Cumplido | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.reqPending` | Pendiente | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.submitReset` | Guardar la contraseña | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.submitInvite` | Crear la contraseña | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.submitting` | Guardando… | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.errLength` | La contraseña debe tener al menos 8 caracteres. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.errMatch` | Las contraseñas no coinciden. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.errSame` | La contraseña nueva debe ser distinta de la anterior. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.errUpdate` | No se ha podido guardar la contraseña. Solicite un enlace nuevo. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.invalidTitle` | El enlace no es válido o ha caducado | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.invalidText` | Los enlaces para crear o cambiar la contraseña solo sirven una vez y caducan. Solicite uno nuevo. | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |
| `v2site.reset.invalidCta` | Solicitar un enlace nuevo | sin uso aparente | — | — | Resto de la versión anterior: comprobar y borrar |

### 2.10 Textos de la raíz (comunes y de la versión anterior)

56 claves.

| clave | ES actual | ES propuesto | CA propuesto | EN propuesto | motivo |
|---|---|---|---|---|---|
| `langName` | Español | sin cambio | sin cambio | sin cambio | |
| `title` | Canal Ético | sin cambio | sin cambio | sin cambio | |
| `steps[0]` | Identidad | sin cambio | sin cambio | sin cambio | |
| `steps[1]` | Incidente | sin cambio | sin cambio | sin cambio | |
| `steps[2]` | Documentos | sin cambio | sin cambio | sin cambio | |
| `steps[3]` | Confirmación | sin cambio | sin cambio | sin cambio | |
| `anonymous` | Anónimo | sin cambio | sin cambio | sin cambio | |
| `identified` | Identificado | sin cambio | sin cambio | sin cambio | |
| `name` | Nombre y apellidos | sin cambio | sin cambio | sin cambio | |
| `email` | Correo electrónico | sin cambio | sin cambio | sin cambio | |
| `phone` | Teléfono | sin cambio | sin cambio | sin cambio | |
| `optional` | opcional | sin cambio | sin cambio | sin cambio | |
| `category` | Categoría del incidente | sin cambio | sin cambio | sin cambio | |
| `department` | Empresa / Departamento afectado | sin cambio | sin cambio | sin cambio | |
| `description` | Descripción detallada de los hechos | sin cambio | sin cambio | sin cambio | |
| `incidentDate` | Fecha aproximada del incidente | sin cambio | sin cambio | sin cambio | |
| `involvedPeople` | Personas implicadas | sin cambio | sin cambio | sin cambio | |
| `submit` | ENVIAR COMUNICACIÓN SEGURA | sin cambio | sin cambio | sin cambio | |
| `submitting` | Enviando... | sin cambio | sin cambio | sin cambio | |
| `copyCode` | Copiar código | sin cambio | sin cambio | sin cambio | |
| `copied` | ¡Copiado! | sin cambio | sin cambio | sin cambio | |
| `back` | Atrás | sin cambio | sin cambio | sin cambio | |
| `next` | Siguiente | sin cambio | sin cambio | sin cambio | |
| `status.received` | Recibido | sin cambio | sin cambio | sin cambio | |
| `status.reviewing` | Pendiente de revisión | sin cambio | sin cambio | sin cambio | |
| `status.investigating` | En investigación | sin cambio | sin cambio | sin cambio | |
| `status.waiting` | Esperando respuesta | sin cambio | sin cambio | sin cambio | |
| `status.resolved` | Resuelto | sin cambio | sin cambio | sin cambio | |
| `status.closed` | Cerrado | sin cambio | sin cambio | sin cambio | |
| `status.archived` | Archivado | sin cambio | sin cambio | sin cambio | |
| `categories[0].value` | fraud | sin cambio | sin cambio | sin cambio | |
| `categories[0].label` | Fraude o corrupción | sin cambio | sin cambio | sin cambio | |
| `categories[1].value` | harassment | sin cambio | sin cambio | sin cambio | |
| `categories[1].label` | Acoso laboral o sexual | sin cambio | sin cambio | sin cambio | |
| `categories[2].value` | discrimination | sin cambio | sin cambio | sin cambio | |
| `categories[2].label` | Discriminación | sin cambio | sin cambio | sin cambio | |
| `categories[3].value` | safety | sin cambio | sin cambio | sin cambio | |
| `categories[3].label` | Seguridad y salud laboral | sin cambio | sin cambio | sin cambio | |
| `categories[4].value` | data | sin cambio | sin cambio | sin cambio | |
| `categories[4].label` | Seguridad de datos / RGPD | legal: no se toca | — | — | |
| `categories[5].value` | conflict | sin cambio | sin cambio | sin cambio | |
| `categories[5].label` | Conflicto de intereses | sin cambio | sin cambio | sin cambio | |
| `categories[6].value` | accounting | sin cambio | sin cambio | sin cambio | |
| `categories[6].label` | Irregularidades contables | sin cambio | sin cambio | sin cambio | |
| `categories[7].value` | environmental | sin cambio | sin cambio | sin cambio | |
| `categories[7].label` | Medio ambiente | sin cambio | sin cambio | sin cambio | |
| `categories[8].value` | other | sin cambio | sin cambio | sin cambio | |
| `categories[8].label` | Otros | sin cambio | sin cambio | sin cambio | |
| `required` | Este campo es obligatorio | sin cambio | sin cambio | sin cambio | |
| `invalidEmail` | Formato de correo no válido | sin cambio | sin cambio | sin cambio | |
| `submitError` | Error al enviar la comunicación. Comprueba tu conexión e inténtalo de nuevo. | sin cambio | sin cambio | sin cambio | |
| `signup.submitting` | Creando cuenta... | sin cambio | sin cambio | sin cambio | |
| `signup.backToChannel` | Canal público | sin cambio | sin cambio | sin cambio | |
| `landing.navLogin` | Iniciar sesión | sin cambio | sin cambio | sin cambio | |
| `landing.navSignup` | Crear cuenta | sin cambio | sin cambio | sin cambio | |
| `landing.footer` | Todas las comunicaciones están protegidas por cifrado de extremo a extremo · © 2026 Reportia | sin cambio | sin cambio | sin cambio | |
