# Canal de Denúncies

## What This Is

Aplicació web de canal intern de denúncies (whistleblowing) conforme a la Llei 2/2023 i el RGPD. Té un canal públic on qualsevol persona pot presentar una denúncia (anònima o identificada) i fer-ne seguiment per codi, i un panell d'administració privat on els gestors de l'empresa la revisen i hi responen. Actualment està en producció a Vercel + Supabase per a l'empresa pròpia de l'usuari (Reportia).

## Core Value

El denunciant ha de poder informar amb confidencialitat total i, si tria l'anonimat, els gestors mai poden esbrinar la seva identitat — això no es pot trencar mai, ni amb el canvi a multi-tenant.

## Requirements

### Validated

- ✓ Formulari públic de denúncia en 4 passos, anònim o identificat, amb categories i adjunts (ca/es/en) — producció
- ✓ Portal de seguiment de denúncies per codi de tracking — producció
- ✓ Panell admin: login + MFA TOTP, dashboard amb filtres, detall de denúncia + missatgeria, gestió d'usuaris i permisos (superadmin/manager), audit log — producció
- ✓ RLS a totes les taules de Supabase, Storage privat per adjunts — producció
- ✓ Landing page que separa canal públic (`/canal`) i panell admin (`/admin`) — producció

### Active

<!-- Milestone v1.0 (GSD-tracked): Conversió a SaaS multi-empresa -->

- [ ] Taula `organizations` + columna `organization_id` a totes les taules rellevants, amb RLS d'aïllament per tenant
- [ ] Pàgina pública "Crear Compte" perquè una empresa nova es registri
- [ ] El primer usuari que crea el compte d'una empresa esdevé superadmin del seu propi espai automàticament
- [ ] Canal públic de denúncies per organització (enllaç propi per empresa), mantenint `/canal` actual com a empresa per defecte
- [ ] Panell admin mostra només dades de l'organització de l'usuari logat, i mostra l'enllaç públic de la seva organització
- [ ] Verificació completa que la instància de producció actual (Reportia) segueix funcionant igual després de la migració

### Out of Scope

- Facturació / pagaments / subscripcions — no demanat en aquest milestone, es planificarà més endavant
- Categories personalitzades per organització — les categories són una taxonomia fixa definida per la Llei 2/2023, vàlida per a totes les empreses
- Branding/personalització visual per organització (logo, colors) — no demanat
- Multi-tenant per subdomini (acme.reportia.es) — s'opta per rutes amb slug (`/canal/acme`) per simplicitat amb un sol desplegament a Vercel

## Context

- La instància de producció actual (denuncias-neon.vercel.app) és l'empresa pròpia de l'usuari ("Plataforma 1") i NO s'ha de tocar de cap manera
- `info@reportia.es` és l'actual superadmin de l'organització existent (Plataforma 1)
- Aquest milestone construeix una "Plataforma 2": un lloc/desplegament separat (nou domini, nou projecte Vercel, nou projecte Supabase amb base de dades pròpia i buida) basat en el mateix codi, on s'afegeix la capa multi-tenant (`organizations`, `organization_id`, RLS, "Crear Compte")
- Com que la Plataforma 2 parteix d'una base de dades buida, no cal migrar ni fer backfill de dades de producció — elimina el risc principal
- Objectiu de negoci: vendre la Plataforma 2 a altres empreses com a producte SaaS autoservei

## Constraints

- **Stack**: React 18 + Vite 5 (JSX, sense TypeScript), Supabase (Postgres + Auth + Storage), Vercel — segons CLAUDE.md, no es pot canviar
- **Seguretat**: RLS no es pot desactivar ni bypassar mai; l'anonimat del denunciant és crític fins i tot amb dades multi-tenant
- **i18n**: tot text nou ha d'existir en ca/es/en a `src/translations.js`
- **Base de dades**: tot canvi d'esquema via nou fitxer a `supabase/migrations/`
- **Aïllament total de Plataforma 1**: cap canvi de codi/infra d'aquest milestone pot afectar el projecte Supabase ni el desplegament Vercel de Reportia (Plataforma 1)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Plataforma 2 = desplegament separat (nova branca, nou projecte Vercel, nou projecte Supabase amb BD pròpia) | Risc zero per a Plataforma 1 (Reportia); no cal migrar dades de producció | — Pending |
| Dins de Plataforma 2: BD compartida entre clients + `organization_id` + RLS (no un projecte Supabase per client) | Operativament simple i barat per gestionar moltes empreses client | — Pending |
| Rutes amb slug (`/canal/:slug`) en lloc de subdominis | Un sol desplegament Vercel per a Plataforma 2, sense gestió de DNS/certificats wildcard | — Pending |
| Categories globals i fixes, no per organització | Taxonomia legal (Llei 2/2023), evita complexitat innecessària | — Pending |
| El primer usuari que registra una organització n'esdevé superadmin automàticament | Requisit de venda autoservei, sense intervenció manual | — Pending |

---
*Last updated: 2026-06-10 after milestone v1.0 (multi-tenant SaaS) kickoff*
