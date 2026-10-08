# Canal de Denúncies — CLAUDE.md

## Què és aquest projecte

Aplicació web (Reportia) per a empreses privades que necessiten un **canal intern de denúncies** conforme a la Llei 2/2023 (transposició de la Directiva europea de protecció de denunciants, "whistleblowing").

Té el disseny **«dues meitats»**: dos costats que sempre es veuen junts.
- **Denunciar** (blau): qualsevol persona (empleat, proveïdor, client) presenta una denúncia, anònima o identificada, en tres passos, i en fa el seguiment amb un codi secret («El meu cas»).
- **Gestionar** (blanc): l'equip de l'empresa rep, investiga i respon les denúncies des d'un tauler de tres columnes.

Quan s'és en un costat, l'altre queda plegat en una franja lateral fixa.

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
| Exportació | ExcelJS (Excel) + jsPDF (PDF, amb Manrope) |
| Tipografia | Manrope (`@fontsource/manrope`) al producte; Wix Madefor només a la portada |
| Icones | Lucide React |
| Antispam | Cloudflare Turnstile (opcional) |
| Monitoratge | Sentry (opcional, mai al canal de denúncies) |
| Deploy | Vercel |

---

## Estructura de carpetes

```
src/
├── main.jsx                 # Arrencada (Sentry opcional)
├── App.jsx                  # Totes les rutes
├── translations.js          # Tots els textos, en ca / es / en
├── lib/
│   ├── supabase.js          # TOTES les crides a la base de dades i a les funcions
│   ├── demoStore.js         # Dades del mode demo (sessionStorage); només es carrega en demo
│   ├── businessDays.js      # Dies hàbils (termini de l'AIPI)
│   ├── whenFallback.js      # El «quan» en text quan la BD no té la columna
│   └── cleanImage.js        # Treu les metadades de les fotos adjuntes
└── v2/
    ├── ds.css               # Sistema visual «B · Color»: tokens, peces i les dues meitats (tot sota .ds)
    ├── ui/                  # Peces comunes: SplitShell, SideTab, Button, Card, Field, Dialog, Kanban,
    │                        #   CaseCard, ChatThread, Menu, OtpInput, Offline… (index.js les exporta)
    ├── canal/               # Costat Denunciar (/canal/:slug)
    │   ├── Canal.jsx        #   Les dues meitats, idioma i esborrany (només en memòria)
    │   ├── Entrada.jsx      #   Entrada: Denunciar / Gestionar
    │   ├── Denuncia.jsx     #   Els 3 passos
    │   ├── Enviada.jsx      #   Codi secret i justificant PDF
    │   ├── Consulta.jsx     #   Escriure el codi i «El meu cas»
    │   ├── Privacidad.jsx   #   Política de privacitat dins del canal
    │   └── Pruebas.jsx, shared.jsx, canal.css
    ├── panel/               # Costat Gestionar (/admin)
    │   ├── Panel.jsx        #   Marc del panell: sessió, MFA, menú, cerca, avisos
    │   ├── Acceso.jsx       #   Accés i verificació en dos passos
    │   ├── Contrasena.jsx   #   Recuperar i canviar la contrasenya (enllaços del correu)
    │   ├── Tablero.jsx      #   Tauler de 3 columnes (Noves, En curs, Tancades)
    │   ├── Caso.jsx         #   Fitxa del cas amb el «següent pas»
    │   ├── Registrar.jsx    #   Registrar un cas arribat per telèfon, en persona o per carta
    │   ├── Informe.jsx      #   Informe de l'any
    │   ├── Compartir.jsx    #   Enllaç, cartell amb QR, botó per al web, text de l'art. 25 i «Primers passos»
    │   ├── Ajustes.jsx      #   Equip i ajustos: Responsable, pla, empresa, la teva seguretat
    │   ├── Equipo.jsx       #   Qui gestiona: invitar, permisos per tema, administradors, treure accés
    │   ├── Seguridad.jsx    #   Verificació en dos passos (/admin/mfa)
    │   ├── Ia.jsx           #   Ajudes d'IA (només amb VITE_AI_ENABLED=1)
    │   └── kit.jsx, primeros.jsx, panel.css
    ├── lib/                 # exportV2.js (Excel, PDF del cas, informe, cartell), pdfFonts.js (Manrope), receipt.js
    ├── site/                # Web de Reportia: portada (/), /crear-compte, /privacitat, 404
    ├── admin/adminKit.jsx   # Terminis legals, pla i textos del registre (compartit pel panell)
    ├── emails/              # Plantilles HTML dels correus de Supabase Auth (s'enganxen al dashboard)
    ├── dev/                 # /dev/ui: totes les peces del disseny (només en desenvolupament)
    ├── V2Layout.jsx         # Stable/Swap (que res no es mogui en canviar d'idioma), idiomes, enllaços legals
    ├── Ficha.jsx            # «Què guardem i què no»
    └── v2.css               # Estils de la portada

supabase/
├── migrations/              # 001 … 013, totes additives i repetibles
└── functions/               # invite-manager, delete-manager, notify, ai-assist (no desplegada)

scripts/
├── migrate.js               # Executa migracions a Supabase (no fer-lo servir sense permís)
├── test-rls.mjs             # Proves de la base de dades en memòria (npm run db:test)
├── pdf-fonts.mjs            # Regenera src/v2/lib/pdfFonts.js (Manrope per als PDF)
├── textos-sin-uso.mjs       # Llista (o treu amb --write) els textos que no fa servir cap pantalla
└── landing-*.mjs            # Captures i fotos de la portada

docs/
├── IA.md                    # Què cal per encendre la IA
├── REVISION_LEGAL.md        # Dubtes pendents de l'advocat (no canviar aquests textos sense resposta)
└── REVISION_UX.md           # Revisió de disseny i usabilitat
```

---

## Rutes de l'aplicació

### Web de Reportia
| Ruta | Pàgina |
|------|--------|
| `/` | Portada comercial |
| `/crear-compte` | Alta d'una empresa |
| `/privacitat` | Política de privacitat de Reportia |

### Canal de cada empresa (costat Denunciar)
| Ruta | Pàgina |
|------|--------|
| `/canal/:slug` | Entrada en dues meitats |
| `/canal/:slug/denuncia` | Els 3 passos i la denúncia enviada |
| `/canal/:slug/consulta` | Escriure el codi i «El meu cas» |
| `/canal/:slug/privacidad` | Política de privacitat dins del canal |
| `/canal/demo` | Canal d'exemple (sempre en mode demo; «Gestionar» porta a `/crear-compte`) |

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

- **organizations** — empresa: nom, slug, pla i prova, Responsable del Sistema (nom, càrrec, data de nomenament, data de comunicació a l'AIPI), autoritat autonòmica, facturació, `onboarding` (primers passos marcats a mà)
- **complaints** — denúncia: referència interna, hash del codi de seguiment, categoria, descripció, «quan» en text, estat, prioritat, idioma, anònima o identificada, via d'entrada, reunió demanada i feta, resultat, títol, qui la porta, resum i títol d'IA, dates legals
- **attachments** — fitxers adjunts
- **messages** — missatges entre qui informa i qui gestiona
- **audit_logs** — registre de totes les accions sobre una denúncia
- **manager_permissions** — permisos per gestor i tema (can_view, can_edit, can_reply, can_delete)
- **profiles** — usuaris del panell (rol: superadmin o manager)

Migracions: de la `001` a la `013`, totes executades a producció. Qualsevol canvi nou va en una `014` additiva i repetible, amb les seves proves a `scripts/test-rls.mjs`.

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
- Honeypot i Turnstile (opcional) al formulari públic
- Storage privat per als adjunts
- Conforme a RGPD i Llei 2/2023

---

## Variables d'entorn

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_PUBLIC_ORIGIN=          # opcional; l'adreça pública per als enllaços i el QR (si no, la de la pàgina)
VITE_TURNSTILE_SITE_KEY=     # opcional; antispam al formulari i a l'accés
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
```

Variables locals (no al repositori):
```
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PAT=
```

---

## Scripts disponibles

```bash
npm run dev        # Servidor de desenvolupament (port 3000)
npm run build      # Build per a producció
npm run db:test    # Proves de seguretat de la base de dades, en memòria (PGlite): no toca res real
npm run db:migrate # Executa migracions a Supabase (només amb permís explícit)
node scripts/pdf-fonts.mjs        # Regenera la tipografia dels PDF
node scripts/textos-sin-uso.mjs   # Llista els textos sense ús (--write per treure'ls)
```

### Com provar sense tocar Supabase

- **Mode demo:** sense credencials, l'app funciona amb dades d'exemple.
  `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite --port 3111`
  Per entrar al panell: qualsevol correu i contrasenya i qualsevol codi de 6 xifres. Les dades viuen a `sessionStorage` (`reportia-demo-store-v4`) i es reinicien en tancar la pestanya.
  Amb `VITE_AI_ENABLED=1` es veuen les ajudes d'IA amb textos d'exemple.
- **Base de dades:** `npm run db:test` aplica totes les migracions a un Postgres en memòria i comprova les polítiques.
- **Sense una migració:** l'app continua funcionant si la base de dades no té les columnes de la 012 o la 013 (vegeu `withRedesign` a `supabase.js`).

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

---

## Context legal i de negoci

- Llei aplicable: **Llei 2/2023**, de 20 de febrer, reguladora de la protecció de les persones que informen sobre infraccions normatives i de lluita contra la corrupció (transposició Directiva UE 2019/1937)
- Client tipus: empresa privada de 50+ treballadors obligada per llei a tenir canal intern de denúncies
- Requisit clau: garantir l'anonimat i la confidencialitat del denunciant
- Els gestors no han de poder esbrinar la identitat d'un denunciant anònim en cap cas
- Els textos legals pendents de revisió són a `docs/REVISION_LEGAL.md`: no canviar-los sense resposta de l'advocat
