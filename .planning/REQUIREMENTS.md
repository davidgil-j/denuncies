# Requirements: Canal de Denúncies — v1.0 (Multi-tenant SaaS)

**Defined:** 2026-06-10
**Core Value:** El denunciant ha de poder informar amb confidencialitat total, i si tria l'anonimat, els gestors mai poden esbrinar la seva identitat.

## v1.0 Requirements

### Entorn separat (Plataforma 2)

- [x] **ENV-01**: Existeix un nou projecte Supabase (BD pròpia i buida) per a la Plataforma 2, separat del de Plataforma 1 (Reportia) — `canal-denuncies-saas` (zojrqjmauruishfvgdja)
- [x] **ENV-02**: Existeix un nou projecte Vercel amb domini propi per a la Plataforma 2, desplegant una branca pròpia del codi — https://canal-denuncies-saas.vercel.app (branca `saas-multitenant`)
- [x] **ENV-03**: Plataforma 1 (denuncias-neon.vercel.app + el seu projecte Supabase) no es modifica de cap manera

### Organitzacions (multi-tenant, dins de Plataforma 2)

- [x] **ORG-01**: Existeix una taula `organizations` (id, name, slug, created_at) a la base de dades de Plataforma 2
- [x] **ORG-02**: `profiles`, `complaints`, `manager_permissions` i `audit_logs` tenen una columna `organization_id` amb clau forana
- [x] **ORG-03**: Les polítiques RLS de totes les taules limiten l'accés a les dades de l'organització de l'usuari autenticat
- [ ] **ORG-04**: La submissió i el seguiment de denúncies públiques estan associats a una organització concreta

### Registre d'empreses (Crear Compte)

- [ ] **SIGNUP-01**: Existeix una pàgina pública "Crear Compte" (ca/es/en) on una empresa nova s'hi pot registrar (nom d'empresa + correu + contrasenya)
- [x] **SIGNUP-02**: En registrar-se, es crea automàticament una nova organització i el nou usuari hi queda com a `superadmin`, sense intervenció manual
- [x] **SIGNUP-03**: Cada organització nova obté un enllaç de canal públic propi (basat en un slug únic)

### Canal públic per organització

- [ ] **PUBLIC-02**: El formulari públic d'una organització nova és accessible a `/canal/:slug`
- [ ] **PUBLIC-03**: El portal de seguiment per codi només retorna denúncies de l'organització correcta

### Panell admin per organització

- [ ] **ADMIN-01**: El dashboard, el detall de denúncies i la gestió d'usuaris només mostren dades de l'organització de l'usuari autenticat
- [ ] **ADMIN-02**: El panell admin mostra l'enllaç públic del canal de la pròpia organització, llest per compartir
- [ ] **ADMIN-03**: La invitació de gestors i la gestió de permisos queden correctament associades a l'organització

### Verificació

- [ ] **VERIF-01**: Es verifica que Plataforma 1 (Reportia) segueix funcionant exactament igual que abans (login, dashboard, formulari públic, seguiment) — sense canvis perquè no s'ha tocat
- [ ] **VERIF-02**: Es verifica un flux complet a Plataforma 2: una empresa nova es registra, presenta una denúncia pel seu canal, i un gestor de la nova empresa la veu i hi respon, sense veure dades d'altres organitzacions

## v2 Requirements

Diferit a futurs milestones.

### Facturació

- **BILL-01**: Plans de pagament per organització
- **BILL-02**: Límits d'ús segons pla (nombre de denúncies, gestors, etc.)

### Personalització

- **CUST-01**: Logo i colors propis per organització
- **CUST-02**: Categories de denúncia personalitzades per organització

## Out of Scope

| Feature | Reason |
|---------|--------|
| Facturació/pagaments | No demanat en aquest milestone |
| Categories per organització | Taxonomia legal fixa (Llei 2/2023), igual per a totes les empreses |
| Branding/personalització visual | No demanat |
| Multi-tenant per subdomini | S'opta per rutes amb slug per simplicitat amb un sol desplegament Vercel |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENV-01 | Phase 1 | Complete |
| ENV-02 | Phase 1 | Complete |
| ENV-03 | Phase 1 | Complete |
| ORG-01 | Phase 1 | Complete |
| ORG-02 | Phase 1 | Complete |
| ORG-03 | Phase 1 | Complete |
| SIGNUP-01 | Phase 2 | Pending |
| SIGNUP-02 | Phase 2 | Complete |
| SIGNUP-03 | Phase 2 | Complete |
| ORG-04 | Phase 3 | Pending |
| PUBLIC-02 | Phase 3 | Pending |
| PUBLIC-03 | Phase 3 | Pending |
| ADMIN-01 | Phase 4 | Pending |
| ADMIN-02 | Phase 4 | Pending |
| ADMIN-03 | Phase 4 | Pending |
| VERIF-01 | Phase 5 | Pending |
| VERIF-02 | Phase 5 | Pending |

**Coverage:**

- v1.0 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-10*
*Last updated: 2026-06-10 after initial definition*
