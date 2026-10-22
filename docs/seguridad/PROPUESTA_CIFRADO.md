# Propuesta · Cifrado a nivel de aplicación (clave por empresa)

**Esto es una propuesta, no está implementado.** La encargó David en la ronda 2. El objetivo: que **nadie de Reportia** (ni quien robe la clave de servicio o un volcado de la base de datos, ni el personal de Supabase) pueda leer el texto de las denuncias ni los adjuntos. Decide David, con el abogado.

Escrito para: David, su jefe, el abogado y quien lo implemente algún día.

---

## 1. De qué protege, y de qué NO

Hoy las denuncias están cifradas **en reposo** (el disco de Supabase) y **en tránsito** (HTTPS), pero las claves las gestiona el proveedor y Reportia tiene la clave de servicio: con ella, o con un volcado de la base de datos y las claves del proveedor, **se puede leer todo**. La RLS, la verificación en dos pasos, la exclusión por caso (C1) y el freno del código (A1/A2) protegen frente a **otras empresas, gestores que no tocan y la persona denunciada**; no protegen frente a **Reportia o su proveedor**.

«Cifrar a nivel de aplicación» quiere decir: **cifrar los datos antes de que lleguen a la base de datos**, con una clave que Reportia no pueda usar. Así, aunque alguien vea la tabla, solo vería texto cifrado.

**Qué se cifraría:** descripción, «cuándo», departamento, personas implicadas, título, identidad (nombre, correo, teléfono), mensajes y adjuntos. **Qué no hace falta:** referencias, fechas, estado, categoría, idioma y los plazos (hacen falta en claro para el tauler y los informes).

---

## 2. Opciones (de menos a más protección, y de menos a más riesgo)

### Opción A · Clave por empresa en el Vault de Supabase (servidor)
Una clave por empresa guardada en el Vault; las funciones del servidor cifran y descifran. Un **volcado de la tabla** ya no se puede leer sin el Vault.
- **Protege de:** una fuga de la base de datos (una copia de la tabla, una copia de seguridad robada).
- **NO protege de:** Reportia ni Supabase (que pueden leer el Vault). No cumple el objetivo «nadie de Reportia».
- **Esfuerzo:** medio. Apenas rompe nada (el servidor sigue pudiendo buscar y exportar).
- **Es, en el fondo, lo que ya hace la 019 con la huella del código**, extendido al contenido.

### Opción B · Clave por empresa que tiene la empresa, no Reportia (sobre cifrado)
Cada empresa tiene una **clave de datos** con la que se cifra todo su contenido. Esa clave se guarda **envuelta** (cifrada) con la credencial de cada gestor (derivada de su contraseña + un secreto del servidor). Para leer, el navegador del gestor desenvuelve la clave y descifra. Reportia nunca ve la clave de datos.
- **Protege de:** Reportia, el proveedor y las fugas de base de datos.
- **Rompe:** la búsqueda por texto en el servidor, las exportaciones en el servidor y la IA (ver §3). Hay que rehacerlas en el navegador.
- **Esfuerzo:** alto.

### Opción C · Cifrado de extremo a extremo, asimétrico (el que de verdad cumple el objetivo)
Cada empresa tiene un **par de claves**. La **pública** va en el canal: el navegador de quien denuncia cifra la denuncia contra ella (nadie más puede leerla, ni en el momento del envío). La **privada** solo la tienen los gestores de esa empresa (envuelta con su credencial). Los mensajes de ida y vuelta usan una clave por caso, envuelta (a) a la clave pública de la empresa —para los gestores— y (b) con una clave derivada del **código de seguimiento** —para quien denuncia, que no tiene cuenta—.
- **Protege de:** todo el mundo salvo quien deba leer (gestores con acceso + quien tiene el código). Cumple «nadie de Reportia».
- **Rompe:** lo mismo que B, y además obliga a resolver el **acceso de quien denuncia** con el código.
- **Esfuerzo:** muy alto. Es el diseño correcto para el objetivo, pero toca casi todo.

---

## 3. Riesgos y qué se rompe (vale para B y C)

- **Pérdida de claves (el riesgo grande).** Si todos los gestores de una empresa pierden su contraseña a la vez, hoy Reportia o un administrador restablece la verificación en dos pasos y se recupera el acceso. Con cifrado de verdad, **si se pierde la clave, las denuncias son ilegibles para siempre**: Reportia no puede ayudar (ese es el punto). Y la Ley 2/2023 **obliga a conservar** el libro registro: perder la clave = perder el registro = incumplir. Hace falta una **clave de recuperación** que la empresa imprima y guarde (o repartir la clave entre varias personas, «M de N»). Esto es una decisión de negocio y legal, no solo técnica.
- **Búsqueda.** El texto cifrado no se puede buscar en el servidor. La búsqueda del panel (por descripción) deja de funcionar tal cual. Opciones: buscar en el navegador tras descargar y descifrar (va bien con pocas denuncias), o «índices ciegos» (filtran algún patrón: peor para el anonimato). 
- **Exportaciones (PDF y Excel).** Hoy se generan con el contenido. Con cifrado, el contenido solo existe descifrado en el navegador: hay que generar los informes **en el navegador** (ya se hace con jsPDF/ExcelJS, así que encaja), pero el servidor no puede volver a generarlos.
- **IA (`ai-assist`, hoy apagada).** Manda el texto del caso a un proveedor. Con cifrado de extremo a extremo el servidor no tiene el texto; tendría que descifrarse en el navegador y llamar a la IA desde allí, y aun así **el proveedor vería el texto en claro**. En la práctica, cifrado y IA en la nube no encajan bien.
- **Adjuntos.** Se cifran en el navegador antes de subirlos y se descifran al descargarlos. Efecto: la lista cerrada de tipos (015) y un futuro antivirus (M7) **no pueden mirar el contenido** (solo verían bytes cifrados): el análisis tendría que hacerse en el navegador antes de cifrar, o renunciar a él.
- **Avisos por correo (`notify`).** No llevan contenido: no les afecta.
- **Rotación y bajas.** Cuando un gestor se va, hay que volver a envolver la clave para el resto. Cuando entra uno nuevo (invitación), hay que envolvérsela sin que Reportia vea la clave: no es trivial.
- **Rendimiento y complejidad.** WebCrypto (ECDH + AES-GCM) es rápido, pero el diseño toca **todos** los caminos de lectura y escritura, el alta de empresa (generar claves), la invitación de gestores (envolver claves), la recuperación, y la demo. Riesgo alto de errores sutiles que, si fallan, **pierden datos**.

---

## 4. Recomendación

1. **Corto plazo, bajo riesgo:** la **opción A** (clave por empresa en el Vault, con un secreto fuera de Supabase como en la 019). Cierra el escenario más probable —una fuga o un volcado de la base de datos— con poco riesgo y sin romper la búsqueda ni las exportaciones. No cumple «nadie de Reportia», y hay que decirlo con claridad.
2. **Si se quiere de verdad «nadie de Reportia»:** la **opción C**, asumiendo sus costes (búsqueda y exportaciones en el navegador, nada de IA en la nube, y **una política de recuperación de claves** acordada con el abogado para no incumplir la conservación). Es un proyecto grande (semanas), con pruebas específicas de pérdida/recuperación de claves.
3. **No mezclar** con el resto de la ronda 2: esto es un proyecto aparte, con su propia decisión de negocio y legal.

**La decisión clave no es técnica:** es si Reportia quiere asumir que, a cambio de no poder leer nunca las denuncias, **tampoco podrá ayudar a recuperar** una empresa que pierda sus claves, y cómo se concilia eso con la obligación legal de conservar el registro. Conviene llevarlo al abogado antes de escribir una sola línea de código.

---

## 5. Esfuerzo (orientativo)

| Opción | Esfuerzo | Rompe búsqueda/export/IA | Protege de Reportia | Riesgo de pérdida de datos |
|---|---|---|---|---|
| A · Vault | Medio (1-2 semanas) | No | No | Bajo |
| B · clave de empresa envuelta por gestor | Alto (3-5 semanas) | Sí | Sí | Medio-alto |
| C · extremo a extremo asimétrico | Muy alto (5-8 semanas) | Sí | Sí | Alto (sin recuperación, irreversible) |
