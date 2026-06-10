# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-10)

**Core value:** El denunciant ha de poder informar amb confidencialitat total, i si tria l'anonimat, els gestors mai poden esbrinar la seva identitat.
**Current focus:** Phase 1 — Fonament de base de dades multi-tenant

## Current Position

Phase: 1 of 5 (Entorn separat + fonament de base de dades multi-tenant)
Plan: 0 of TBD in current phase
Status: Ready to plan (pendent de decidir detalls d'infraestructura amb l'usuari)
Last activity: 2026-06-10 — Roadmap v1.0 actualitzat: Plataforma 2 serà un desplegament separat (nou Vercel + nou Supabase), no una conversió in-place de producció

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1: Base de dades compartida + `organization_id` + RLS (no projectes Supabase separats)
- Phase 1: Rutes amb slug (`/canal/:slug`) en lloc de subdominis
- Phase 1: Categories globals i fixes, no per organització

### Pending Todos

- Eliminar el fitxer orfe `supabase/functions/debug-user/index.ts` (no desplegat, no commitejat — pendent de neteja)
- Eliminar emojis residuals (⏳, ⚠️) a `src/pages/admin/ResetPassword.jsx`

### Blockers/Concerns

- La instància de producció actual (Reportia) ha de seguir funcionant durant tota la migració — qualsevol migració de schema ha de ser additiva i amb backfill, mai destructiva

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Infra | Configurar SMTP (Resend) per evitar límits de correu de Supabase | Deferred | Pre-milestone |
| Infra | Pujar Supabase a pla Pro per evitar auto-pausa setmanal | Deferred | Pre-milestone |

## Session Continuity

Last session: 2026-06-10
Stopped at: Roadmap v1.0 creat i a punt de presentar-se a l'usuari per a confirmació
Resume file: None
