# Canal de Denúncies — CLAUDE.md

## Què és aquest projecte

Aplicació web (Reportia) per a empreses privades que necessiten un **canal intern de denúncies** conforme a la Llei 2/2023 (transposició de la Directiva europea de protecció de denunciants, "whistleblowing").

Té el disseny **«dues meitats»**: l'entrada del canal ensenya els dos costats, meitat i meitat.
- **Denunciar** (sobre el color de l'empresa): qualsevol persona (empleat, proveïdor, client) presenta una denúncia, anònima o identificada, en tres passos, i en fa el seguiment amb un codi secret («El meu cas»).
- **Gestionar** (blanc): l'equip de l'empresa rep, investiga i respon les denúncies des d'un tauler de tres columnes.

En triar un costat, l'altre desapareix i el triat ocupa tota la pantalla (ja no hi ha franja lateral). Des del panell, «Veure el canal» és un enllaç de la capçalera.

L'aplicació està **en producció** a Vercel (frontend) + Supabase (base de dades i autenticació).

---

## Stack tecnològic

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18 + Vite 5 (JavaScript/JSX) |
| Routing | React Router DOM 7 (rutes amb `lazy()`) |
| Base de dades | Supabase (PostgreSQL, RLS, funcions RPC) |
| Autenticació | Supabase Auth (correu + MFA TOTP obligatòria) |
| Storage (adjunts) | Supabase Storage (bucket privat) |
| Funcions de servidor | Supabase Edge Functions (Deno) |
| Exportació | ExcelJS (Excel) + jsPDF (PDF, amb Manrope); es descarreguen només en exportar |
| Tipografia | Manrope variable (`@fontsource-variable/manrope`) a tot arreu: producte, portada i PDF |
| Icones | Lucide React |
| Antispam | Cloudflare Turnstile (opcional) |
| Monitoratge | Sentry (opcional, mai al canal de denúncies) |
| Deploy | Vercel |

---

## Estructura de carpetes

```
src/
├── main.jsx                 # Arrencada (Sentry opcional, mai al canal). La comparteixen index.html i canal.html
├── App.jsx                  # Totes les rutes (cada zona es descarrega quan cal)
├── entries.js               # Els import() de cada zona, compartits per App.jsx i main.jsx
├── translations.js          # Textos del canal i de les peces comunes, en ca / es / en (de la web, només v2site.metaDesc)
├── translations-panel.js    # Textos del panell i de les exportacions (només es descarreguen al panell)
├── translations-site.js     # Textos de la web de Reportia (alta, privacitat, portada); el canal no els descarrega
├── lib/
│   ├── supabase.js          # TOTES les crides a la base de dades i a les funcions
│   ├── demoStore.js         # Dades del mode demo (sessionStorage); només es carrega en demo
│   ├── deadlines.js         # Terminis legals en dies de calendari de Madrid (com la base de dades)
│   ├── businessDays.js      # Dies hàbils (termini de l'AIPI)
│   ├── format.js            # Formats comuns (mida d'un arxiu, locale de cada idioma)
│   ├── whenFallback.js      # El «quan» en text quan la BD no té la columna
│   └── cleanImage.js        # Treu les metadades de les fotos adjuntes
└── v2/
    ├── config/producto.js   # Les decisions de negoci (nom, adreça, preus, multa, peu «Amb Reportia», indexar…): una línia cada una
    ├── landing/             # La portada estàtica: generar.js (HTML per idioma), landing.css, landing.js (només el vídeo), iconos.js
    ├── ds.css               # Sistema visual: colors a :root (els de la paleta blava en clar), peces i les dues meitats (sota .ds)
    ├── ui/                  # Peces comunes: SplitShell, Button, Card, Chip, Field, Dialog, Menu, Segmented,
    │                        #   StepBar, PillNav, Kanban, CaseCard, DeadlineChip, ChatThread, OtpInput, Offline, BrandLogo,
    │                        #   ReportiaMark (icona oficial + nom) i Captcha (Turnstile: accés, alta i recuperar; mai al canal)
    ├── canal/               # Costat Denunciar (/canal/:slug)
    │   ├── Canal.jsx        #   Les dues meitats, idioma i esborrany (només en memòria)
    │   ├── Entrada.jsx      #   Entrada: Denunciar / Gestionar, meitat i meitat
    │   ├── Denuncia.jsx     #   Els 3 passos
    │   ├── Pruebas.jsx      #   Els adjunts del pas 2
    │   ├── Enviada.jsx      #   Codi secret i justificant PDF
    │   ├── Consulta.jsx     #   Escriure el codi i «El meu cas»
    │   ├── Privacidad.jsx   #   Política de privacitat dins del canal
    │   └── shared.jsx, canal.css
    ├── panel/               # Costat Gestionar (/admin)
    │   ├── Panel.jsx        #   Marc del panell: sessió, MFA, capçalera, cerca, avisos
    │   ├── Acceso.jsx       #   Accés i verificació en dos passos
    │   ├── Contrasena.jsx   #   Recuperar i canviar la contrasenya (enllaços del correu)
    │   ├── Tablero.jsx      #   Tauler de 3 columnes (Noves, En curs, Tancades); al mòbil, llista amb pestanyes
    │   ├── Caso.jsx         #   Fitxa del cas amb el «següent pas»; al mòbil, tres pestanyes
    │   ├── Registrar.jsx    #   Registrar un cas arribat per telèfon, en persona o per carta
    │   ├── Informe.jsx      #   Informe de l'any
    │   ├── Compartir.jsx    #   Enllaç, cartell amb QR, botó per al web, text de l'art. 25 i la posada en marxa
    │   ├── Ajustes.jsx      #   Equip i ajustos: Responsable, «La teva marca», pla, empresa, la teva seguretat (amb «Aparença»)
    │   ├── Equipo.jsx       #   Qui gestiona: invitar, permisos per tema, administradors, treure accés
    │   ├── Seguridad.jsx    #   Verificació en dos passos (/admin/mfa)
    │   ├── Ia.jsx           #   Ajudes d'IA (només amb VITE_AI_ENABLED=1)
    │   └── kit.jsx, primeros.jsx, PasswordField.jsx, texts.js, panel.css
    ├── lib/                 # exportV2.js (Excel, PDF del cas, informe, cartell), receipt.js (justificant),
    │                        #   pdfFonts.js i receiptFonts.js (Manrope; generats amb scripts/pdf-fonts.mjs),
    │                        #   brand.js (les 8 paletes, clar i fosc: l'única font dels colors), logo.js (prepara el logotip),
    │                        #   frame.js (el canal dins d'un iframe) i domain.js (adreça pròpia del canal)
    ├── site/                # Web de Reportia dins de l'aplicació: /crear-compte, /privacitat, 404; plans.js (tarifes, de config);
    │                        #   texts.js (afegeix translations-site.js). La portada ja no és aquí: és a landing/
    ├── admin/adminKit.jsx   # Dates, pla i textos del registre (compartit pel panell)
    ├── emails/              # Plantilles HTML dels correus de Supabase Auth (s'enganxen al dashboard)
    ├── dev/                 # /dev/ui: totes les peces del disseny (només en desenvolupament)
    ├── V2Layout.jsx         # Stable/Swap (que res no es mogui en canviar d'idioma), fmt, idiomes, enllaços legals
    ├── Ficha.jsx            # «Què guardem i què no»
    └── v2.css               # Estils comuns de la web dins de l'aplicació (i el reset comú)

supabase/
├── migrations/              # 001 … 019, totes additives i repetibles
├── rollback/                # Còpia abans de la 019 i tornada enrere de la 016 a la 019 (no són migracions: LEEME.md)
└── functions/               # invite-manager, delete-manager, notify, ai-assist (no desplegada); _shared/cors.ts (ALLOWED_ORIGINS)

scripts/
├── migrate.js               # Executa migracions a Supabase (no fer-lo servir sense permís)
├── test-rls.mjs             # Proves de la base de dades en memòria (npm run db:test)
├── test-logica.mjs          # Proves de la lògica: terminis, dies hàbils, neteja de fotos… (npm run test:logic)
├── pdf-fonts.mjs            # Regenera src/v2/lib/pdfFonts.js i receiptFonts.js (Manrope per als PDF)
├── textos-sin-uso.mjs       # Llista (o treu amb --write) els textos que no fa servir cap pantalla (els tres fitxers)
├── vite-portada.mjs         # Plugin de Vite: la portada a «/» en desenvolupament; en compilar, inicio-{es,ca,en}.html,
│                            #   robots.txt i sitemap.xml, i l'aplicació passa a app.html (vercel.json tria què dona «/»)
├── video-demo.mjs           # Grava els vídeos de la portada amb la demo (Playwright + ffmpeg) a public/landing/video
├── correos.mjs              # Genera les quatre plantilles de correu (src/v2/emails), un idioma per correu
└── landing-fotos.mjs, og-image.mjs  # Fotos de la portada i la imatge en compartir l'enllaç

e2e/                         # Proves de navegador (npm run e2e). Playwright va fora del repositori: e2e/README.md
                             #   lib/vercel.mjs serveix la web compilada com Vercel; lib/supabase-local.mjs, una base de dades real

docs/
├── PLAN_FASES.md            # El pla per fases de la «Vuelta», amb el que ja està fet
├── DECISIONES_TOMADAS.md    # Les decisions de negoci preses (19 oct): què, per què, l'alternativa i on es canvia
├── QUE_TIENE_QUE_HACER_DAVID.md  # El que falta i necessita els comptes de David, en ordre (SQL, secrets, Preview, commits)
├── TEXTOS_PROPUESTA.md      # Inventari de textos i la taula aprovada
├── AUDITORIA.md             # Auditoria tècnica (seguretat, accessibilitat, rendiment)
├── AUDITORIA_ESTETICA.md    # Auditoria d'estètica i to
├── IA.md                    # Què cal per encendre la IA
├── INTEGRACION.md           # Posar el canal al web d'un client: enllaç, script, iframe i adreça pròpia (i què fa Reportia)
├── REVISION_LEGAL.md        # Dubtes pendents de l'advocat (no canviar aquests textos sense resposta)
└── REVISION_UX.md           # Revisió de disseny i usabilitat
```

---

## Rutes de l'aplicació

### Web de Reportia
| Ruta | Pàgina |
|------|--------|
| `/` | Portada comercial: pàgina estàtica per idioma (`inicio-es.html`, `-ca`, `-en`; `?lang=` o l'idioma del navegador, castellà per defecte), generada en compilar des de `src/v2/landing` |
| `/crear-compte` | Alta d'una empresa |
| `/privacitat` | Política de privacitat de Reportia |

### Canal de cada empresa (costat Denunciar)
| Ruta | Pàgina |
|------|--------|
| `/canal/:slug` | Entrada en dues meitats |
| `/canal/:slug/formulario` | Els 3 passos i la denúncia enviada (l'adreça d'abans, `/denuncia`, hi redirigeix) |
| `/canal/:slug/consulta` | Escriure el codi i «El meu cas» |
| `/canal/:slug/privacidad` | Política de privacitat dins del canal |
| `/canal/demo` | Canal d'exemple (sempre en mode demo; «Gestionar» porta a `/crear-compte`) |

La resta de l'aplicació se serveix amb `app.html` (l'antic `index.html`, reanomenat en compilar perquè les regles de `vercel.json` decideixin què dona «/»). A producció, `/canal/*` se serveix amb `canal.html` (vercel.json): la mateixa aplicació, però la pestanya i la vista prèvia en compartir l'enllaç diuen «Canal de denuncias», sense Reportia. Només `/canal/*` es pot posar dins d'un iframe d'una altra web (amb https); el panell i la web, mai (també ho impedeix la mateixa aplicació). A l'adreça pròpia d'una empresa (`canal.acme.es`, migració 017) l'arrel obre el seu canal i la resta va a l'adreça principal. Vegeu `docs/INTEGRACION.md`.

### Panell (costat Gestionar, requereix login + MFA)
| Ruta | Pàgina |
|------|--------|
| `/admin/login` | Accés + verificació en dos passos (`?from=slug` mostra l'empresa) |
| `/admin/forgot-password` | Recuperar la contrasenya |
| `/admin/reset-password` | Contrasenya nova (enllaç de recuperació o d'invitació) |
| `/admin` | Tauler |
| `/admin/complaints/:id` | Fitxa del cas |
| `/admin/nueva` | Registrar un cas |
| `/admin/report` | Informe |
| `/admin/integration` | Compartir el canal (només administradors) |
| `/admin/ajustes` | Equip i ajustos (`/admin/users` i `/admin/account` hi redirigeixen) |
| `/admin/mfa` | Verificació en dos passos |

---

## Base de dades (taules principals)

- **organizations** — empresa: nom, slug, pla i prova, Responsable del Sistema (nom, càrrec, data de nomenament, data de comunicació a l'AIPI), autoritat autonòmica, facturació, `onboarding` (primers passos marcats a mà), `brand_palette` i `brand_logo` («La teva marca», 016), `custom_domain` (adreça pròpia del canal, 017; només la canvia Reportia), `show_powered_by` (peu «Amb Reportia», 018; només el canvia Reportia)
- **complaints** — denúncia: referència interna, empremta del codi de seguiment (des de la 019, amb un secret: HMAC; les d'abans es reescriuen en fer-les servir), categoria, descripció, «quan» en text, estat, prioritat, idioma, anònima o identificada, via d'entrada, reunió demanada i feta, resultat, títol, qui la porta, resum i títol d'IA, dates legals
- **attachments** — fitxers adjunts
- **messages** — missatges entre qui informa i qui gestiona
- **audit_logs** — registre de totes les accions sobre una denúncia
- **manager_permissions** — permisos per gestor i tema (can_view, can_edit, can_reply, can_delete)
- **profiles** — usuaris del panell (rol: superadmin o manager; `appearance`: clar, fosc o com el sistema, 016)

Migracions: de la `001` a la `019`, totes additives i repetibles. Fins a la `013` consten com a executades a producció; de la `014` i la `015`, comprova-ho abans de donar-ho per fet; la `016` (marca blanca) i la `017` (adreça pròpia) **executades a producció el 19 d'octubre de 2026**; la `018` (peu «Amb Reportia») i la `019` (empremta amb secret) escrites i provades, encara no executades (ordre i comprovacions a `docs/QUE_TIENE_QUE_HACER_DAVID.md`; còpia i tornada enrere a `supabase/rollback/`). L'app funciona igual si no hi són (provat amb una base de dades real: `e2e/base-real.mjs`). Qualsevol canvi nou va en una `020`, amb les seves proves a `scripts/test-rls.mjs`.

### Estats d'una denúncia
`received` → `reviewing` → `investigating` → `waiting` → `resolved` → `closed` → `archived`

Al tauler: **Noves** (`received`), **En curs** (`reviewing`, `investigating`, `waiting`) i **Tancades** (`resolved`, `closed`, `archived`, i qualsevol cas amb les dades suprimides).

### Prioritats
`low` | `normal` | `high` | `critical`

---

## Rols i permisos (panell)

- **Superadmin** (administració): totes les denúncies, l'equip, el compte i «Compartir el canal».
- **Manager** (gestió): només els temes assignats, amb permisos configurables (veure, editar, respondre, eliminar). A «Equip i ajustos» només veu «La teva seguretat».

---

## Seguretat

- **Row Level Security (RLS)** a totes les taules de Supabase — crític, no bypassar mai
- MFA TOTP obligatòria per veure denúncies (sense codis de recuperació: la restableix un administrador o Reportia)
- L'esborrany de la denúncia viu només a la memòria de React: res al navegador
- Honeypot al formulari públic. Turnstile (opcional) només a l'accés, l'alta i «He oblidat la contrasenya», mai al canal: sense la clau tot va com sempre; amb la clau, sense token no es deixa passar (si no carrega, avís i «Reintentar»)
- L'empremta del codi de seguiment porta un secret (019, a Supabase Vault): ni amb una còpia de la taula es poden endevinar els codis
- Storage privat per als adjunts
- El logotip de «La teva marca» es desa a la base de dades ja preparat pel navegador (imatge petita PNG o JPEG en `data:`, mai SVG); la base de dades rebutja qualsevol altra cosa. El canal sempre es veu en clar (també l'accés al panel), encara que el sistema de qui l'obre estigui en fosc; no desa res al navegador. Al panell, el mode per defecte és «Clar», i cada persona pot triar Fosc o Com el sistema a «Aparença»
- Conforme a RGPD i Llei 2/2023

---

## Variables d'entorn

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_PUBLIC_ORIGIN=          # opcional; l'adreça pública per als enllaços i el QR (si no, la de la pàgina)
VITE_TURNSTILE_SITE_KEY=     # opcional; antispam a l'accés, l'alta i «He oblidat la contrasenya» (mai al canal). Abans d'encendre'l a Supabase Auth
VITE_MAX_FILE_MB=            # opcional; mida màxima de cada adjunt (50 per defecte)
VITE_SENTRY_DSN=             # opcional
VITE_DEMO=                   # opcional; 1 = mode demo en un build sense credencials (per ensenyar la web)
VITE_AI_ENABLED=             # opcional; 1 encén les ajudes d'IA del panell (apagades per defecte, vegeu docs/IA.md)
```

Secrets de les funcions de servidor (a Supabase, mai al codi):
```
invite-manager:  SITE_URL
notify:          RESEND_API_KEY, MAIL_FROM, SITE_URL, WEBHOOK_SECRET
ai-assist:       AI_PROVIDER_URL, AI_API_KEY, AI_MODEL, AI_PROVIDER_FORMAT   (no desplegada)
invite-manager, delete-manager, ai-assist:  ALLOWED_ORIGINS   (opcional; webs que les poden cridar, separades per comes)
```

Variables locals (no al repositori):
```
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PAT=
```

---

## Scripts disponibles

```bash
npm run dev        # Servidor de desenvolupament (port 3000; no obre el navegador). «/» és la portada
npm run build      # Build per a producció
npm run db:test    # Proves de seguretat de la base de dades, en memòria (PGlite): no toca res real
npm run test:logic # Proves de la lògica (terminis, dies hàbils, neteja de fotos): sense navegador ni base de dades
npm run e2e        # Proves de navegador en mode demo i contra una xarxa simulada (vegeu e2e/README.md)
npm run db:migrate # Executa migracions a Supabase (només amb permís explícit)
node scripts/pdf-fonts.mjs        # Regenera la tipografia dels PDF
node scripts/textos-sin-uso.mjs   # Llista els textos sense ús (--write per treure'ls)
node scripts/video-demo.mjs       # Torna a gravar els vídeos de la portada (amb la demo al port 3111; ffmpeg i cwebp)
node scripts/correos.mjs          # Torna a generar les plantilles de correu
node scripts/og-image.mjs         # Torna a fer public/og.jpg (PLAYWRIGHT=…/index.mjs)
```

### Com provar sense tocar Supabase

- **Mode demo:** sense credencials, l'app funciona amb dades d'exemple.
  `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite --port 3111`
  Per entrar al panell: qualsevol correu i contrasenya i qualsevol codi de 6 xifres. Les dades viuen a `sessionStorage` (`reportia-demo-store-v4`) i es reinicien en tancar la pestanya.
  Amb `VITE_AI_ENABLED=1` es veuen les ajudes d'IA amb textos d'exemple.
- **Base de dades:** `npm run db:test` aplica totes les migracions a un Postgres en memòria i comprova les polítiques.
- **Sense una migració:** l'app continua funcionant si la base de dades no té les columnes de la 012, la 013, la 014 o la 016 (vegeu `withRedesign` a `supabase.js`; sense la 016, el canal i el panell surten en blau i «La teva marca» i «Aparença» no es mostren).
- **Navegador:** `npm run e2e` recorre el canal i el panell a 1440 i 375 px, en els tres idiomes, sense sortir de l'ordinador. També la portada compilada i servida com Vercel (`portada`, amb Lighthouse si està instal·lat), Turnstile (`captcha`) i la web contra una base de dades real amb les migracions de la 015 a la 019 (`base-real`, necessita `brew install postgresql@16 postgrest`).

---

## Convencions obligatòries

### 1. Sempre tres idiomes
Qualsevol text visible ha d'existir en **català (`ca`), castellà (`es`) i anglès (`en`)** a [src/translations.js](src/translations.js). Mai text directament al JSX en un sol idioma. To: **«tu»** a tot el producte. Títols i botons grans amb `Stable`/`Tc`/`Tp`, perquè res no es mogui en canviar d'idioma.

### 2. Canvis de base de dades sempre amb migració
Qualsevol modificació de l'estructura requereix un fitxer a `supabase/migrations/`, additiu i repetible, amb proves a `scripts/test-rls.mjs`. Mai modificar el schema directament des del dashboard de Supabase.

### 3. JavaScript, no TypeScript
Tot el frontend és JSX/JavaScript (les Edge Functions són TypeScript de Deno).

### 4. No bypassar RLS
No afegir `serviceRole` ni desactivar RLS al frontend. Només les funcions de servidor fan servir la clau de servei.

### 5. Totes les crides a BD passen per `src/lib/supabase.js`
Cap component crida Supabase directament.

### 6. Les peces del disseny, a `src/v2/ui`
Les pantalles noves fan servir les peces comunes i els tokens de `ds.css`. Accessibilitat: botons i enllaços de veritat, focus visible, `aria-label` als botons d'icona, contrast mínim 4,5:1 (mesurat), diàlegs propis (mai `confirm()`).

Regles de color: un sol tint (el suau de l'accent); vermell i ambre només en estats i terminis; com a màxim tres colors per pantalla. Al mòbil el panell va sobre blanc i sense caixes. Botons amb cantonades de 10 px a tot arreu.

Les decisions de negoci (nom, adreça, preus, multa, peu «Amb Reportia», indexar…) viuen a `src/v2/config/producto.js`, una línia cada una, i s'expliquen a `docs/DECISIONES_TOMADAS.md`: no es repeteixen enlloc més.

Marca blanca: els colors es fan servir sempre amb les variables (`var(--report)`, `var(--surface)`, `var(--on-report)`…), mai amb un hexadecimal fix, perquè canvien amb la paleta de l'empresa i amb el mode fosc. Totes surten de `src/v2/lib/brand.js` (`useBrandTheme` les posa a `<html>`); `npm run test:logic` comprova el contrast de les 8 paletes en clar i en fosc i que `ds.css` en porta els valors per defecte. El canal no porta res de Reportia: `canal.html` (pestanya i vista prèvia en compartir) i el logotip de l'empresa; només el peu «Amb Reportia», petit, que Reportia treu per empresa (018) o a totes (`PIE_CON_REPORTIA`).

### 7. Comentaris del codi, en castellà
Els comentaris de `src/`, `scripts/`, `e2e/` i les funcions de servidor s'escriuen en castellà (un sol idioma). Les migracions ja escrites es deixen com estan.

---

## Context legal i de negoci

- Llei aplicable: **Llei 2/2023**, de 20 de febrer, reguladora de la protecció de les persones que informen sobre infraccions normatives i de lluita contra la corrupció (transposició Directiva UE 2019/1937)
- Client tipus: empresa privada de 50+ treballadors obligada per llei a tenir canal intern de denúncies
- Requisit clau: garantir l'anonimat i la confidencialitat del denunciant
- Els gestors no han de poder esbrinar la identitat d'un denunciant anònim en cap cas
- Els textos legals pendents de revisió són a `docs/REVISION_LEGAL.md`: no canviar-los sense resposta de l'advocat
