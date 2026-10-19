# Lo que tiene que hacer David (encargo del 19 de octubre de 2026)

Todo lo del código está hecho y probado en local. Lo que queda necesita tus cuentas (GitHub, Vercel, Supabase, Cloudflare, el DNS de reportia.es), al abogado o al jefe. **En este orden.** Las decisiones que he tomado están en `docs/DECISIONES_TOMADAS.md`.

> La 016 y la 017 ya las ejecutaste en producción el 19 de octubre: la lista de SQL empieza en la 018.

---

## 1 · Mirarlo en tu ordenador (opcional)

```bash
npm run dev
```

Abre http://localhost:3000 tú mismo: el servidor ya no abre el navegador.
- En «/» sale la portada nueva. `?lang=ca` y `?lang=en` la cambian de idioma.
- Sin credenciales de Supabase, todo va en modo demo.

## 2 · Los commits

Cinco, en este orden. Cada uno lleva solo sus archivos. Los archivos borrados ya están preparados con `git rm`.

**Commit 1 · Base de datos**
```bash
git add -A -- supabase/migrations/018_pie_reportia.sql supabase/migrations/019_huella_con_secreto.sql supabase/rollback scripts/test-rls.mjs
git commit -m "Migraciones 018 (pie «Con Reportia») y 019 (huella del código con secreto), con copia, vuelta atrás y pruebas" -- supabase/migrations/018_pie_reportia.sql supabase/migrations/019_huella_con_secreto.sql supabase/rollback scripts/test-rls.mjs
```

**Commit 2 · Identidad de Reportia y decisiones**
```bash
F2="src/v2/config public/marca index.html src/v2/ui/ReportiaMark.jsx src/v2/ui/index.js src/v2/ds.css src/v2/canal/Entrada.jsx src/lib/demoStore.js src/v2/panel/Panel.jsx src/v2/panel/panel.css src/v2/panel/Equipo.jsx src/v2/lib/exportV2.js src/translations-panel.js src/v2/emails scripts/correos.mjs supabase/functions/invite-manager/index.ts"
git add -A -- $F2
git commit -m "Identidad de Reportia (icono oficial, «Con Reportia», PDF y correos) y decisiones en src/v2/config/producto.js" -- $F2
```

**Commit 3 · Turnstile**
```bash
F3="src/v2/ui/Captcha.jsx src/v2/ui/captcha.css src/v2/panel/Acceso.jsx src/v2/panel/Contrasena.jsx src/v2/site/fields.jsx src/v2/canal/Denuncia.jsx src/v2/canal/canal.css src/lib/supabase.js package.json package-lock.json"
git add -A -- $F3
git commit -m "Turnstile solo en el acceso, el alta y recuperar la contraseña; el canal nunca lo carga (n.º 71)" -- $F3
```

**Commit 4 · Portada y vídeo**
```bash
F4="src/v2/landing scripts/vite-portada.mjs scripts/video-demo.mjs scripts/og-image.mjs scripts/landing-shots.mjs public/landing public/og.jpg src/v2/site/V2Landing.jsx src/v2/site/V2NotFound.jsx src/v2/site/V2Privacy.jsx src/v2/site/V2Signup.jsx src/v2/site/V2SiteLayout.jsx src/v2/site/plans.js src/v2/site/site.css src/v2/site/texts.js src/translations.js src/translations-site.js src/App.jsx src/entries.js src/main.jsx src/v2/canal/Canal.jsx src/v2/canal/Privacidad.jsx src/v2/panel/Ajustes.jsx vercel.json vite.config.js scripts/textos-sin-uso.mjs"
git add -A -- $F4
git commit -m "Portada nueva estática con el vídeo de la demo (fase 5); los textos de la web, fuera de la carga del canal" -- $F4
```

**Commit 5 · Pruebas y documentación**
```bash
F5="e2e scripts/test-logica.mjs docs CLAUDE.md README.md"
git add -A -- $F5
git commit -m "Pruebas (portada, Turnstile, base de datos real, servidor como Vercel) y documentación del encargo" -- $F5
```

Comprueba que no queda nada: `git status` tiene que decir «nothing to commit». Después, `git push origin main`. **Nunca a upstream.**

Los commits intermedios no se han probado por separado; lo probado es el conjunto, que es lo que queda tras el quinto. Los vídeos suman unos 5 MB en el repositorio.

## 3 · Comprobar en la Preview de Vercel

Cuando Vercel lo haya publicado (como lo hacéis siempre), en la dirección de la Preview:

1. **Portada:**
   - «/» sale la portada (castellano), `/?lang=ca` en catalán y `/?lang=en` en inglés;
   - el vídeo «Quien denuncia» se reproduce al llegar a «Cómo funciona», y «Quien gestiona» cambia de vídeo;
   - en el móvil sale el vídeo vertical.
2. **Canal:** «Ver un canal de ejemplo» lleva a `/canal/demo`. Al final del pie del canal sale «Con Reportia», pequeño.
   - **No envíes denuncias de prueba al canal de una empresa real: la Preview usa la base de datos de producción.**
3. **Panel:**
   - entra en `/admin/login`: abajo sale el icono de Reportia;
   - dentro del panel, al final de la página, «Gestionado con Reportia»;
   - exporta el PDF de un caso: al pie, «Generado con Reportia» con el icono.
4. **Alta:** `/crear-compte` se ve con los botones de esquinas de 10 px. La marca de la cabecera vuelve a la portada.
5. **Compartir:** comparte la dirección en WhatsApp contigo mismo. Tiene que salir la imagen nueva, con el logotipo verde y «Canal».

## 4 · El SQL, en Supabase › SQL Editor

Uno a uno, cada uno con su comprobación. Todos se pueden ejecutar más de una vez sin romper nada.

**4.0 · Antes de nada, que esté la 014** (la 019 la necesita):
```sql
select to_regprocedure('public.code_attempts_blocked()') is not null as tiene_la_014;
```
Tiene que salir `true`. Si sale `false`, ejecuta antes `014_endurecimiento.sql` y `015_producto.sql`.

**4.1 · `supabase/migrations/018_pie_reportia.sql`**. Comprobación:
```sql
select show_powered_by, count(*) from organizations group by 1;
```
Todas las empresas en `true`. Para quitar el pie a una: `update organizations set show_powered_by = false where slug = '…';`.

**4.2 · `supabase/rollback/019_copia_antes.sql`** (la copia de seguridad: **antes** de la 019). Comprobación:
```sql
select (select count(*) from private.complaints_copia_019) = (select count(*) from complaints) as copia_completa;
```
Tiene que salir `true`.

**4.3 · `supabase/migrations/019_huella_con_secreto.sql`**. Comprobación:
```sql
select public.tracking_key(repeat('a', 64)) <> repeat('a', 64) as con_secreto,
       (select count(*) from vault.secrets where name = 'reportia_tracking_pepper') as en_vault;
```
- Tiene que salir `con_secreto = true` y `en_vault = 1`.
- Si `en_vault` da error o 0, el secreto está en la tabla privada `private.app_secrets`, que también vale.
- **Nunca borres ni cambies ese secreto:** quien ya tiene su código dejaría de poder entrar.

Después, prueba con un código que tengas de una denuncia real o de prueba: se tiene que abrir igual que antes.

**Si algo va mal:** en `supabase/rollback/` está la vuelta atrás de cada una (`019_atras.sql`, `018_atras.sql`; también `017_atras.sql` y `016_atras.sql`). `LEEME.md` explica el orden. Ninguna borra datos.

La web funciona igual con o sin estas migraciones (lo he probado contra una base de datos real en local). Puedes ejecutarlas antes o después de publicar el código.

## 5 · Redesplegar la función `invite-manager`

Ahora manda el idioma de quien invita, para que el correo de invitación salga en ese idioma:
```bash
npx supabase functions deploy invite-manager --project-ref sxasgssisuisdldbcotu
```

## 6 · Pegar las plantillas de correo

En Supabase › Authentication › Emails › Templates. **Después** de publicar el código, porque el logo se carga de la web (`/marca/reportia-logo-316.png`).

| Plantilla de Supabase | Archivo |
|---|---|
| Invite user | `src/v2/emails/invite.html` |
| Confirm signup | `src/v2/emails/confirm-signup.html` |
| Reset password | `src/v2/emails/reset-password.html` |
| Change email address | `src/v2/emails/change-email.html` |

- El asunto de cada uno está en la primera línea del archivo (`<!-- Asunto: … -->`).
- Comprueba que en Authentication › URL Configuration la **Site URL** es la dirección pública de la web.
- El correo propio (SMTP con el dominio reportia.es, n.º 72) necesita el DNS de reportia.es: va aparte.

## 7 · Encender Turnstile (cuando queráis)

**El orden importa.** Si se enciende en Supabase antes de que la web tenga la clave, nadie podrá entrar ni darse de alta. La web lo diría con un aviso, pero no dejaría pasar.

1. **Cloudflare** › Turnstile › Add widget:
   - direcciones: la de producción, la de Vercel y, si queréis probar en la Preview, la de la Preview;
   - te da una **clave pública** (site key) y una **clave secreta** (secret key).
2. **Vercel** › Settings › Environment Variables: `VITE_TURNSTILE_SITE_KEY` = la clave pública. Vuelve a publicar.
3. Comprueba que en `/admin/login`, `/crear-compte` y «He olvidado la contraseña» sale el recuadro de Cloudflare.
4. **Supabase** › Authentication › Attack Protection › **Enable Captcha protection**: proveedor Turnstile y la **clave secreta**.

El canal no cambia: nunca lo pide.

## 8 · canal.reportia.es

1. **Vercel** › Settings › Domains › Add: `canal.reportia.es`. Vercel enseña el registro CNAME.
   - El plan Hobby no admite uso comercial: para vender, Pro.
2. **DNS de reportia.es** (quien lo gestione): crear ese CNAME.
3. Cuando Vercel la dé por buena:
   - **Vercel:** `VITE_PUBLIC_ORIGIN` = `https://canal.reportia.es`, y vuelve a publicar. Los enlaces, el QR y los correos pasan a esa dirección.
   - **Supabase** › Authentication › URL Configuration: Site URL `https://canal.reportia.es` y, en Redirect URLs, `https://canal.reportia.es/**`.
   - **Supabase** › Edge Functions › Secrets: `SITE_URL` = `https://canal.reportia.es` y, si queréis limitar quién llama a las funciones, `ALLOWED_ORIGINS` = `https://canal.reportia.es`. Redesplegar `invite-manager`, `delete-manager` (y `ai-assist`, si algún día se enciende).
4. **Buscadores:** cuando la dirección funcione, cambia `INDEXAR_WEB` a `true` en `src/v2/config/producto.js` (una línea) y publica.

## 9 · Repositorio privado y carpetas de herramientas (n.º 76)

- **Privado:** GitHub › Settings › General › Danger zone › Change visibility. En `origin` (davidgil-j/denuncies) y en el de producción, si es tuyo.
- **Carpetas de herramientas fuera de git:** no lo he hecho porque es tu carpeta (AUDITORIA F-31). Ojo: a quien haga `pull` después se le borran del disco. Si lo quieres:
  ```bash
  git rm -r --cached -q .agents .claude .codex .planning AGENTS.md PLAN.md skills-lock.json
  printf '\n# Carpetas de herramientas (se quedan en el disco)\n/.agents/\n/.claude/\n/.codex/\n/.planning/\n/AGENTS.md\n/PLAN.md\n/skills-lock.json\n' >> .gitignore
  git add .gitignore && git commit -m "Carpetas de herramientas fuera del repositorio"
  ```
  Los archivos se quedan en tu ordenador.

## 10 · Lo que necesita al abogado o al jefe

- **Abogado:**
  - **Dudas 1 a 29** de `docs/REVISION_LEGAL.md` (n.º 75).
  - **Textos legales de la web** (n.º 67): aviso legal, privacidad, condiciones y contrato de encargado. Con ellos se podrían añadir las condiciones al alta (n.º 70) y un formulario de demostración (n.º 68).
  - **La campaña de correo** (n.º 81, LSSI).
- **Jefe:** repasar `docs/DECISIONES_TOMADAS.md`, sobre todo:
  - el nombre (n.º 77);
  - qué incluyen la puesta en marcha y la gestión externa (textos provisionales);
  - las dos frases del audio (n.º 82 y 89);
  - el visto bueno a la tabla de textos (n.º 88).

## Variables y secretos, en resumen (solo los nombres)

| Dónde | Nombre | Para qué |
|---|---|---|
| Vercel | `VITE_TURNSTILE_SITE_KEY` | Turnstile (paso 7) |
| Vercel | `VITE_PUBLIC_ORIGIN` | La dirección pública: enlaces, QR, correos (paso 8) |
| Supabase Auth (panel) | clave secreta de Turnstile | Paso 7 |
| Supabase Edge Functions | `SITE_URL`, `ALLOWED_ORIGINS` | Paso 8 |
| Cloudflare | site key y secret key | Paso 7 |
