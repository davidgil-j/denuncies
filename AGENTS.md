# Canal de Denúncies — AGENTS.md

## Què és aquest projecte

Aplicació web per a empreses privades que necessiten un **canal intern de denúncies** conforme a la Llei 2/2023 (transposició de la Directiva europea de protecció de denunciants, "whistleblowing").

Consta de dues parts:
- **Canal públic**: qualsevol persona (empleat, proveïdor, client) pot presentar una denúncia de forma anònima o identificada, i fer-ne seguiment per codi.
- **Panell de control privat**: els gestors de l'empresa revisen, investiguen i responen les denúncies.

L'aplicació està **en producció** a Vercel (frontend) + Supabase (base de dades i autenticació).

---

## Stack tecnològic

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18 + Vite 5 (JavaScript/JSX) |
| Routing | React Router DOM 7 |
| Formularis | React Hook Form |
| Base de dades | Supabase (PostgreSQL) |
| Autenticació | Supabase Auth (email + MFA TOTP) |
| Storage (adjunts) | Supabase Storage (bucket privat) |
| Exportació | ExcelJS (Excel) + jsPDF (PDF) |
| Deploy | Vercel |
| Icones | Lucide React |
| Monitoratge | Sentry (configurat via variable d'entorn, opcional) |
| Email | EmailJS (configurat via variable d'entorn, opcional) |

---

## Estructura de carpetes

```
src/
├── contexts/
│   └── AdminAuth.jsx          # Gestió de sessió i permisos del panell admin
├── lib/
│   ├── supabase.js            # Totes les crides a la base de dades
│   └── export.js              # Lògica d'exportació Excel i PDF
├── pages/
│   ├── ComplaintForm.jsx      # Formulari públic de denúncia (4 passos)
│   ├── TrackingPortal.jsx     # Portal de seguiment per codi
│   ├── PrivacyPolicy.jsx      # Política de privacitat (RGPD + Llei 2/2023)
│   └── admin/
│       ├── Login.jsx          # Login admin + MFA
│       ├── Dashboard.jsx      # Llistat i filtres de denúncies
│       ├── ComplaintDetail.jsx# Detall, missatgeria i gestió d'una denúncia
│       ├── Users.jsx          # Gestió d'usuaris (només superadmin)
│       ├── MFASetup.jsx       # Configuració autenticació en dos passos
│       ├── ForgotPassword.jsx
│       └── ResetPassword.jsx
├── translations.js            # Totes les cadenes de text en ca/es/en
├── App.jsx                    # Definició de rutes
├── global.css
└── main.jsx

supabase/
├── migrations/                # Canvis de schema de base de dades
└── functions/                 # Edge functions serverless

scripts/
└── migrate.js                 # Executa migracions a Supabase
```

---

## Rutes de l'aplicació

### Canal públic
| Ruta | Pàgina |
|------|--------|
| `/` | Formulari de denúncia + portal de seguiment |
| `/privacitat` | Política de privacitat |

### Panell admin (requereix login)
| Ruta | Pàgina |
|------|--------|
| `/admin/login` | Login + verificació MFA |
| `/admin/forgot-password` | Recuperació de contrasenya |
| `/admin/reset-password` | Reset de contrasenya |
| `/admin` | Dashboard de denúncies |
| `/admin/complaints/:id` | Detall d'una denúncia |
| `/admin/users` | Gestió d'usuaris (superadmin) |
| `/admin/mfa` | Configuració 2FA |

---

## Base de dades (taules principals)

- **complaints** — dades de la denúncia (tracking_code, categoria, descripció, estat, prioritat, idioma, anònim o identificat)
- **attachments** — fitxers adjunts vinculats a una denúncia
- **messages** — missatgeria entre el denunciant i el gestor
- **audit_logs** — registre de totes les accions fetes sobre una denúncia
- **manager_permissions** — permisos granulars per gestor i categoria (can_view, can_edit, can_reply, can_delete)
- **profiles** — perfils d'usuaris admin (rol: superadmin o manager)

### Estats d'una denúncia
`received` → `reviewing` → `investigating` → `waiting` → `resolved` → `closed` → `archived`

### Prioritats
`low` | `normal` | `high` | `critical`

---

## Rols i permisos (admin)

- **Superadmin**: accés complet a totes les denúncies i a la gestió d'usuaris
- **Manager**: accés limitat a les categories assignades, amb permisos configurables (veure, editar, respondre, eliminar)

---

## Seguretat

- **Row Level Security (RLS)** a totes les taules de Supabase — crític, no bypassar mai
- MFA TOTP (Google Authenticator / Authy) per als administradors
- Honeypot anti-spam al formulari públic
- Storage privat per als adjunts (no accessibles públicament per URL directa)
- Conforme a RGPD i Llei 2/2023

---

## Variables d'entorn necessàries

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SENTRY_DSN=             # opcional
VITE_EMAILJS_SERVICE_ID=     # opcional
VITE_EMAILJS_TEMPLATE_ID=    # opcional
VITE_EMAILJS_PUBLIC_KEY=     # opcional
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
npm run db:migrate # Executa migracions de base de dades
```

---

## Convencions obligatòries

### 1. Sempre tres idiomes
Qualsevol text visible a la interfície ha d'existir en **els tres idiomes**: Català (`ca`), Espanyol (`es`) i Anglès (`en`). El fitxer [src/translations.js](src/translations.js) conté totes les cadenes. Mai s'ha d'afegir text directament al JSX en un sol idioma.

### 2. Canvis de base de dades sempre amb migració
Qualsevol modificació a l'estructura de la base de dades (nova columna, nova taula, canvi de tipus) requereix un fitxer de migració a `supabase/migrations/`. Mai modificar el schema directament des del dashboard de Supabase sense crear primer la migració.

### 3. JavaScript, no TypeScript
Tot el projecte és en JSX/JavaScript. No migrar ni afegir TypeScript.

### 4. No bypassar RLS
Les polítiques de seguretat a nivell de fila de Supabase protegeixen totes les dades. No afegir `serviceRole` ni desactivar RLS per simplificar consultes.

### 5. Totes les crides a BD passen per `src/lib/supabase.js`
Cap component ha de fer crides directes a Supabase. Totes les operacions de dades es fan a través de les funcions exportades per `supabase.js`.

---

## Context legal i de negoci

- Llei aplicable: **Llei 2/2023**, de 20 de febrer, reguladora de la protecció de les persones que informen sobre infraccions normatives i de lluita contra la corrupció (transposició Directiva UE 2019/1937)
- Client tipus: empresa privada de 50+ treballadors obligada per llei a tenir canal intern de denúncies
- Requisit clau: garantir l'anonimat i la confidencialitat del denunciant
- Els gestors no han de poder esbrinar la identitat d'un denunciant anònim en cap cas
