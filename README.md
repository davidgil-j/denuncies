# Reportia — Canal de Denúncies

Aplicació web SaaS per a empreses privades que necessiten un **canal intern de denúncies** conforme a la Llei 2/2023 (transposició de la Directiva UE 2019/1937 de protecció de denunciants).

**Producció**: [canal-denuncies-saas.vercel.app](https://canal-denuncies-saas.vercel.app)  
**Repositori**: [github.com/lindachen-max/denuncies](https://github.com/lindachen-max/denuncies)

---

## Stack

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18 + Vite 5 (JavaScript/JSX), React Router 7 |
| Base de dades | Supabase (PostgreSQL amb RLS, Auth amb verificació en dos passos, Storage privat) |
| Funcions de servidor | Supabase Edge Functions (Deno) |
| Exportació | ExcelJS (Excel) i jsPDF (PDF) |
| Tipografia i icones | Manrope variable (`@fontsource-variable/manrope`) i Lucide React |
| Antispam | Cloudflare Turnstile (opcional) |
| Monitoratge | Sentry (opcional; mai al canal de denúncies) |
| Deploy | Vercel (auto-deploy des de `main`) |

---

## Configuració per a nous desenvolupadors

### 1. Clonar i instal·lar

```bash
git clone https://github.com/lindachen-max/denuncies.git
cd denuncies
npm install
```

### 2. Variables d'entorn

Copia `.env.example` a `.env` i omple els valors:

```bash
cp .env.example .env
```

| Variable | Per a què |
|----------|-----------|
| `VITE_SUPABASE_URL` | Obligatòria en producció. Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Obligatòria en producció. Project Settings → API → anon/public key |
| `VITE_PUBLIC_ORIGIN` | Opcional. L'adreça pública per als enllaços, el QR i la vista prèvia en compartir |
| `VITE_TURNSTILE_SITE_KEY` | Opcional. Antispam a l'accés, l'alta i «He oblidat la contrasenya»; mai al canal (dash.cloudflare.com → Turnstile). Posar-la abans d'encendre el captcha a Supabase Auth |
| `VITE_MAX_FILE_MB` | Opcional. Mida màxima de cada adjunt (50 per defecte) |
| `VITE_SENTRY_DSN` | Opcional. Avís d'errors al panell i a la web |
| `VITE_DEMO` | Opcional. `1` = mode demo en un build sense credencials (només per ensenyar la web) |
| `VITE_AI_ENABLED` | Opcional. `1` encén les ajudes d'IA del panell (apagades per defecte: vegeu `docs/IA.md`) |

Sense les dues primeres, en desenvolupament l'aplicació arrenca en **mode demo** (dades d'exemple al navegador).
Els secrets de les funcions de servidor (`SITE_URL`, `RESEND_API_KEY`…) es posen a Supabase, mai al codi: són a `.env.example`.

**Valors del projecte Reportia:**
- Supabase URL: `https://zojrqjmauruishfvgdja.supabase.co`
- Supabase project ref: `zojrqjmauruishfvgdja`

> Les claus reals (`anon key`, `service_role key`) s'han de demanar al propietari del projecte — no estan al repositori.

### 3. Connectar Supabase CLI

```bash
# Genera un Personal Access Token a: supabase.com/dashboard/account/tokens
supabase login --token <EL_TEU_PAT>

# Vincula el projecte (project-ref = ID de Supabase)
supabase link --project-ref zojrqjmauruishfvgdja
```

### 4. Aplicar migracions

```bash
npm run db:migrate
```

Són dinou (`001` … `019`), additives i repetibles. La `016` (marca blanca) i la `017` (adreça pròpia del canal) es van executar a producció el 19 d'octubre de 2026; la `018` (peu «Amb Reportia») i la `019` (empremta del codi amb secret) encara no: l'ordre, les comprovacions i la còpia prèvia són a `docs/QUE_TIENE_QUE_HACER_DAVID.md`, i la tornada enrere, a `supabase/rollback/`. Si és la primera vegada, totes s'aplicaran en ordre. Si alguna ja existeix al projecte remot, Supabase les saltarà automàticament.

Abans d'aplicar una migració nova, comprova les regles de seguretat en local (no toca cap base de dades real):

```bash
npm run db:test
```

Aplica totes les migracions a un Postgres en memòria i verifica les polítiques RLS (aïllament entre empreses, permisos per categoria, missatges, adjunts, auditoria).

**Alternativa sense CLI**: obre l'editor SQL a [supabase.com/dashboard](https://supabase.com/dashboard) i executa manualment els fitxers de `supabase/migrations/` en ordre numèric.

### 5. Executar en local

```bash
npm run dev
# → http://localhost:3000 (no obre el navegador). «/» és la portada; la resta, l'aplicació
```

Per provar-ho tot sense tocar cap base de dades (mode demo, amb dades d'exemple que es reinicien en tancar la pestanya):

```bash
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite --port 3111
# → http://localhost:3111/canal/demo (el canal) i http://localhost:3111/admin/login?from=demo (el panell:
#   qualsevol correu i contrasenya, i qualsevol codi de 6 xifres)
```

### 6. Proves

```bash
npm run test:logic   # lògica: terminis legals, dies hàbils, neteja de fotos, decisions de producte i portada (sense navegador)
npm run db:test      # regles de seguretat de la base de dades, en un Postgres en memòria
npm run e2e          # navegador: el canal, el panell i la portada, en mode demo, contra una xarxa simulada i contra una base de dades real local
```

Cap de les tres toca Supabase. Les de navegador necessiten Playwright, que s'instal·la fora del repositori: vegeu `e2e/README.md`.

---

## Deploy a producció

El deploy s'activa **automàticament** quan fas `git push` a `main` gràcies a la integració nativa de Vercel amb GitHub. No calen configuracions addicionals.

Si necessites desplegar manualment (per exemple, sense push):

```bash
vercel --prod
```

**Identificadors del projecte Vercel** (per si cal connectar una nova màquina):
- Org ID: `team_3bcd9MdETUvRxXs2e2bN5WAL`
- Project ID: `prj_CYTx6c6MtVlhO3dMFseNQUgQLOY7`

---

## Estructura del projecte

```
src/
├── App.jsx, main.jsx, entries.js   # Rutes i arrencada (cada zona es descarrega quan cal)
├── translations.js                 # Textos del canal i les peces comunes, en ca / es / en
├── translations-panel.js           # Textos del panell i de les exportacions
├── translations-site.js            # Textos de la web de Reportia (alta, privacitat, portada)
├── lib/supabase.js                 # Totes les crides a la BD (mai cridar Supabase des d'un component)
├── lib/                            # demoStore (mode demo), deadlines (terminis), cleanImage (fotos netes)…
└── v2/
    ├── ds.css, ui/                 # Sistema visual i peces comunes
    ├── canal/                      # Costat Denunciar: entrada, 3 passos, codi i «El meu cas»
    ├── panel/                      # Costat Gestionar: accés, tauler, fitxa del cas, informe, compartir, ajustos
    ├── config/producto.js          # Decisions de negoci (nom, adreça, preus, multa…): docs/DECISIONES_TOMADAS.md
    ├── landing/                    # La portada: pàgina estàtica per idioma, generada en compilar
    ├── site/                       # Web de Reportia dins de l'aplicació: alta, privacitat i «no trobada»
    ├── lib/                        # Excel, PDF del cas, informe, cartell i justificant
    └── emails/                     # Plantilles dels correus de Supabase Auth

supabase/migrations/                # 001 … 019, en ordre
supabase/rollback/                  # Còpia abans de la 019 i tornada enrere de la 016 a la 019
supabase/functions/                 # invite-manager, delete-manager, notify, ai-assist (no desplegada)
scripts/                            # migracions, proves, portada (vite-portada), vídeos (video-demo), correus, tipografia dels PDF, textos sense ús
e2e/                                # Proves de navegador
docs/                               # Auditories, pla per fases, textos, IA i dubtes legals
```

El detall de cada carpeta és a `CLAUDE.md`.

## Rutes

| Ruta | Descripció |
|------|-----------|
| `/` | Portada comercial (pàgina estàtica per idioma: `?lang=ca|es|en` o l'idioma del navegador) |
| `/crear-compte` | Alta d'una empresa |
| `/privacitat` | Política de privacitat de Reportia |
| `/canal/:slug` | Entrada del canal de l'empresa: Denunciar i Gestionar, meitat i meitat |
| `/canal/:slug/formulario` | Els 3 passos i la denúncia enviada |
| `/canal/:slug/consulta` | Escriure el codi i «El meu cas» |
| `/canal/:slug/privacidad` | Política de privacitat dins del canal |
| `/canal/demo` | Canal d'exemple (sempre en mode demo) |
| `/admin/login` | Accés al panell i verificació en dos passos |
| `/admin/forgot-password`, `/admin/reset-password` | Recuperar i canviar la contrasenya |
| `/admin` | Tauler |
| `/admin/complaints/:id` | Fitxa del cas |
| `/admin/nueva` | Registrar un cas arribat per una altra via |
| `/admin/report` | Informe |
| `/admin/integration` | Compartir el canal: enllaç, cartell amb QR, botó per al web (només administradors) |
| `/admin/ajustes` | Equip i ajustos (`/admin/users` i `/admin/account` hi redirigeixen) |
| `/admin/mfa` | Verificació en dos passos |

---

## Convencions importants

- **JavaScript/JSX only** — no TypeScript (les funcions de servidor sí que són TypeScript de Deno)
- **Tots els textos en 3 idiomes** (ca/es/en) a `src/translations.js`, `src/translations-panel.js` o `src/translations-site.js`, i de «tu»
- **Totes les crides a BD** passen per `src/lib/supabase.js`
- **Canvis de BD** → sempre amb fitxer de migració a `supabase/migrations/`, additiu i repetible, amb proves a `scripts/test-rls.mjs`
- **Verificació en dos passos obligatòria** per veure denúncies (també a la base de dades, migració 010)
- **El codi de seguiment** només el coneix qui denuncia: la base de dades en guarda l'empremta (des de la 019, amb un secret) i el panell usa una referència (REF-XXXXXX)
- **Mode demo** només en desenvolupament o amb `VITE_DEMO=1`
- **RLS activat** a totes les taules — mai desactivar ni usar `serviceRole` des del frontend
- **Les peces del disseny** són a `src/v2/ui` i els colors, a `src/v2/ds.css`
- **Els comentaris del codi**, en castellà
