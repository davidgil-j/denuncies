# Roadmap: Canal de Denúncies — v1.0 Multi-tenant SaaS

## Overview

Crear una "Plataforma 2" — un desplegament separat (nou domini, nou projecte Vercel, nou projecte Supabase amb base de dades pròpia i buida) basat en el codi actual, com a producte SaaS multi-empresa per vendre. Primer es prepara l'entorn separat i s'hi construeix la base de dades multi-tenant des de zero (sense migració de dades de producció, ja que comença buida), després s'afegeix l'autoregistre "Crear Compte" amb superadmin automàtic, després es fa que el canal públic i el portal de seguiment siguin específics per organització, després s'actualitza el panell admin perquè mostri només dades pròpies i l'enllaç del seu canal, i finalment es polueix la landing page i es verifica de cap a cap tot el flux — confirmant també que Plataforma 1 (Reportia, denuncias-neon.vercel.app) queda completament intacta.

## Phases

- [x] **Phase 1: Entorn separat + fonament de base de dades multi-tenant** - Nou projecte Supabase + nou projecte Vercel/domini per a Plataforma 2, amb taula `organizations`, `organization_id` i RLS des de zero
- [ ] **Phase 2: Autoregistre d'empreses (Crear Compte)** - Pàgina pública de registre que crea organització + superadmin automàtic
- [ ] **Phase 3: Canal públic per organització** - Formulari de denúncia i seguiment per codi específics per organització dins de Plataforma 2
- [ ] **Phase 4: Panell admin amb context d'organització** - Dades i enllaç públic propis de cada organització al panell
- [ ] **Phase 5: Landing, traduccions i verificació E2E** - CTA "Crear Compte" a la landing, i18n completa, verificació E2E de Plataforma 2 i confirmació que Plataforma 1 segueix intacta

## Phase Details

### Phase 1: Entorn separat + fonament de base de dades multi-tenant

**Goal**: Existeix una Plataforma 2 desplegada de forma independent (domini, Vercel i Supabase propis), amb una base de dades multi-tenant des de zero (`organizations` + `organization_id` + RLS), sense tocar res de Plataforma 1.
**Depends on**: Nothing (first phase)
**Requirements**: ENV-01, ENV-02, ENV-03, ORG-01, ORG-02, ORG-03
**Success Criteria** (what must be TRUE):

  1. Existeix un nou projecte Supabase (BD buida) i un nou projecte Vercel amb domini propi per a Plataforma 2
  2. L'esquema de Plataforma 2 inclou `organizations`, i `organization_id` a `profiles`, `complaints`, `manager_permissions` i `audit_logs`
  3. Les polítiques RLS de Plataforma 2 impedeixen que un usuari d'una organització llegeixi o escrigui dades d'una altra
  4. Plataforma 1 (denuncias-neon.vercel.app i el seu projecte Supabase) no ha rebut cap canvi

**Plans**: 1 plan

Plans:

- [x] 01-01: Crear projecte Supabase i Vercel separats, aplicar migració 005 (organizations + organization_id + RLS), desplegar a https://canal-denuncies-saas.vercel.app

### Phase 2: Autoregistre d'empreses (Crear Compte)

**Goal**: Una empresa nova es pot registrar ella mateixa i obté el seu propi espai aïllat amb superadmin automàtic, sense intervenció manual.
**Depends on**: Phase 1
**Requirements**: SIGNUP-01, SIGNUP-02, SIGNUP-03
**Success Criteria** (what must be TRUE):

  1. Existeix una pàgina pública "Crear Compte" en ca/es/en, accessible des de la landing
  2. En completar el formulari, es crea una nova organització i el nou usuari queda registrat com a `superadmin` d'aquesta organització
  3. El nou usuari pot iniciar sessió a `/admin` i veure un dashboard buit, propi de la seva organització
  4. La nova organització obté un slug únic per al seu canal públic

**Plans**: 3 plans

Plans:
**Wave 1**

- [ ] 02-01-PLAN.md — Migració 006: slugify, generate_unique_org_slug i extensió de handle_new_user() (org + superadmin automàtic), aplicada via supabase db push --linked
- [ ] 02-02-PLAN.md — signUpOrganization() a supabase.js, traduccions ca/es/en i pàgina pública /crear-compte amb selector d'idioma

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 02-03-PLAN.md — Verificació E2E: signup -> organització + superadmin amb slug únic -> login -> dashboard buit

### Phase 3: Canal públic per organització

**Goal**: El formulari públic de denúncia i el portal de seguiment funcionen de manera aïllada per organització dins de Plataforma 2.
**Depends on**: Phase 1, Phase 2
**Requirements**: ORG-04, PUBLIC-02, PUBLIC-03
**Success Criteria** (what must be TRUE):

  1. `/canal/:slug` envia denúncies a l'organització corresponent al slug
  2. El seguiment per codi de tracking només retorna denúncies de l'organització correcta
  3. Categories i traduccions (ca/es/en) funcionen igual que abans

**Plans**: TBD

Plans:

- [ ] 03-01: TBD (es definirà a `/gsd:plan-phase 3`)

### Phase 4: Panell admin amb context d'organització

**Goal**: El panell admin només mostra dades de l'organització de l'usuari logat i li facilita l'enllaç públic del seu propi canal.
**Depends on**: Phase 3
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03
**Success Criteria** (what must be TRUE):

  1. El dashboard, el detall de denúncies i la gestió d'usuaris només mostren dades de l'organització pròpia (verificat amb dues organitzacions diferents)
  2. El panell admin mostra l'enllaç públic del canal propi (p.ex. `/canal/acme`), copiable
  3. Les invitacions de gestors i la gestió de permisos queden correctament associades a l'organització

**Plans**: TBD

Plans:

- [ ] 04-01: TBD (es definirà a `/gsd:plan-phase 4`)

### Phase 5: Landing, traduccions i verificació E2E

**Goal**: La landing page ofereix clarament l'opció de crear un compte nou, tot el text nou existeix en ca/es/en, i es verifica de cap a cap que el sistema multi-tenant funciona i que la producció de Reportia no ha patit cap regressió.
**Depends on**: Phase 4
**Requirements**: SIGNUP-01 (polish), VERIF-01, VERIF-02
**Success Criteria** (what must be TRUE):

  1. La landing page té una crida a l'acció clara per a "Crear Compte" en ca/es/en
  2. Flux E2E complet: una empresa nova es registra, rep el seu enllaç, algú hi presenta una denúncia, i un gestor de la nova empresa la veu i hi respon — sense veure dades d'altres organitzacions
  3. La instància de producció original (Reportia / denuncias-neon.vercel.app) es verifica intacta: login, dashboard, formulari públic i seguiment funcionen igual que abans

**Plans**: TBD

Plans:

- [ ] 05-01: TBD (es definirà a `/gsd:plan-phase 5`)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Entorn separat + fonament multi-tenant | 1/1 | Complete | 2026-06-10 |
| 2. Autoregistre d'empreses (Crear Compte) | 0/3 | Not started | - |
| 3. Canal públic per organització | 0/TBD | Not started | - |
| 4. Panell admin amb context d'organització | 0/TBD | Not started | - |
| 5. Landing, traduccions i verificació E2E | 0/TBD | Not started | - |
