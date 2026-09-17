# Reportia — Canal de Denúncies

Aplicació web SaaS per a empreses privades que necessiten un **canal intern de denúncies** conforme a la Llei 2/2023 (transposició de la Directiva UE 2019/1937 de protecció de denunciants).

**Producció**: [canal-denuncies-saas.vercel.app](https://canal-denuncies-saas.vercel.app)  
**Repositori**: [github.com/lindachen-max/denuncies](https://github.com/lindachen-max/denuncies)

---

## Stack

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18 + Vite 5 (JavaScript/JSX) |
| Base de dades | Supabase (PostgreSQL + Auth + Storage) |
| Deploy | Vercel (auto-deploy des de `main`) |
| Icones | Lucide React |
| Antibot | Cloudflare Turnstile |

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

| Variable | On trobar-la |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon/public key |
| `VITE_TURNSTILE_SITE_KEY` | dash.cloudflare.com → Turnstile → el teu site |

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

Si és la primera vegada, les 7 migracions s'aplicaran en ordre. Si alguna ja existeix al projecte remot, Supabase les saltarà automàticament.

**Alternativa sense CLI**: obre l'editor SQL a [supabase.com/dashboard](https://supabase.com/dashboard) i executa manualment els fitxers de `supabase/migrations/` en ordre numèric.

### 5. Executar en local

```bash
npm run dev
# → http://localhost:3000
```

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
├── contexts/AdminAuth.jsx     # Sessió i permisos admin
├── lib/supabase.js            # Totes les crides a BD (mai cridar Supabase directament des de components)
├── lib/export.js              # Exportació Excel i PDF
├── pages/
│   ├── ComplaintForm.jsx      # Formulari públic (4 passos)
│   ├── TrackingPortal.jsx     # Portal seguiment per codi
│   ├── LandingPage.jsx        # Landing SaaS (/)
│   ├── Signup.jsx             # Alta nova organització (/crear-compte)
│   └── admin/                 # Panell d'administració (/admin/*)
├── translations.js            # Textos en ca / es / en
└── global.css

supabase/migrations/           # Migracions de BD en ordre
```

## Rutes

| Ruta | Descripció |
|------|-----------|
| `/` | Landing SaaS |
| `/crear-compte` | Alta nova empresa |
| `/canal/:slug` | Canal de denúncies de l'empresa |
| `/admin/login` | Login administradors |
| `/admin` | Dashboard denúncies |
| `/admin/complaints/:id` | Detall denúncia |
| `/admin/users` | Gestió usuaris (superadmin) |
| `/admin/mfa` | Configuració 2FA |

---

## Convencions importants

- **JavaScript/JSX only** — no TypeScript
- **Tots els textos en 3 idiomes** (ca/es/en) via `src/translations.js`
- **Totes les crides a BD** passen per `src/lib/supabase.js`
- **Canvis de BD** → sempre amb fitxer de migració a `supabase/migrations/`
- **RLS activat** a totes les taules — mai desactivar ni usar `serviceRole` des del frontend
