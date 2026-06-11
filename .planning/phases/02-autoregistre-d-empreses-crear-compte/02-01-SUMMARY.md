---
phase: 02-autoregistre-d-empreses-crear-compte
plan: 01
subsystem: database
tags: [supabase, postgres, plpgsql, triggers, multi-tenant, slug]

# Dependency graph
requires:
  - phase: 02-autoregistre-d-empreses-crear-compte
    provides: "organizations table + RLS foundation (migration 005, Phase 1)"
provides:
  - "Migration 006: slugify(), generate_unique_org_slug(), and extended handle_new_user() trigger live on zojrqjmauruishfvgdja"
  - "Self-signup path: auth.users insert with raw_user_meta_data.company_name atomically creates organizations row + profiles row (role='superadmin')"
  - "Invite-manager path unchanged: auth.users insert without company_name creates profiles row (role='manager'), no organization"
affects: [02-02-crear-compte-signup-page, 02-03-end-to-end-verification]

# Tech tracking
tech-stack:
  added: ["unaccent (Postgres extension, schema extensions)"]
  patterns:
    - "Additive migrations only — handle_new_user() updated via create or replace function, never edits prior migration files (003/005)"
    - "security definer functions hardened with set search_path = public"
    - "Idempotency guard (if exists profiles where id = new.id) at top of auth trigger functions to prevent duplicate org creation on retry"

key-files:
  created:
    - supabase/migrations/006_org_signup.sql
  modified: []

key-decisions:
  - "slugify() declared STABLE (not IMMUTABLE) because it calls extensions.unaccent(), which is itself STABLE — an IMMUTABLE wrapper would fail at CREATE FUNCTION time"
  - "Collision-safe slug generation via generate_unique_org_slug() loop (-2, -3, ...) executed inside the same transaction as the organizations insert, avoiding races"
  - "Branch discriminator is presence of non-empty raw_user_meta_data->>'company_name', confirmed as safe/unused-elsewhere via review of invite-manager Edge Function (only ever sets full_name)"

patterns-established:
  - "New self-signup organizations always get id via gen_random_uuid() default and a freshly generated unique slug — never client-supplied, eliminating org-id spoofing risk (T-02-01)"

requirements-completed: [SIGNUP-02, SIGNUP-03]

# Metrics
duration: ~10min (across two sessions, including auth-gate detour)
completed: 2026-06-11
---

# Phase 02 Plan 01: Migration 006 — Org Self-Signup Trigger Summary

**Additive Postgres migration (006_org_signup.sql) adding slugify()/generate_unique_org_slug()/extended handle_new_user() trigger, applied live to canal-denuncies-saas (zojrqjmauruishfvgdja) via `supabase db push --linked`, enabling self-signup to atomically create an organization + superadmin profile while leaving the invite-manager flow unchanged**

## Performance

- **Duration:** ~10 min total
- **Started:** 2026-06-11
- **Completed:** 2026-06-11
- **Tasks:** 2
- **Files modified:** 1 (created)

## Accomplishments
- Wrote `supabase/migrations/006_org_signup.sql` containing:
  - `create extension if not exists unaccent with schema extensions;`
  - `slugify(value text)` — STABLE SQL function: lowercases, strips accents via `extensions.unaccent`, collapses non-`[a-z0-9]` runs to `-`, trims leading/trailing `-`
  - `generate_unique_org_slug(company_name text)` — PL/pgSQL function with `'empresa'` fallback for empty input and `-2`/`-3`/... collision-avoidance loop against `organizations.slug`
  - `handle_new_user()` (replacing the migration-003 version, same trigger binding preserved) — idempotency guard, branches on `raw_user_meta_data->>'company_name'`: self-signup creates `organizations` row + `profiles` row (`role='superadmin'`, `organization_id` set); invite-manager flow (no `company_name`) creates `profiles` row (`role='manager'`) exactly as before
  - `security definer` + `set search_path = public` hardening on `handle_new_user()`
- Applied migration 006 to the linked Supabase project (`zojrqjmauruishfvgdja`, canal-denuncies-saas / Platform 2) via `supabase db push --linked` — orchestrator confirmed: "Applying migration 006_org_signup.sql... Finished supabase db push."

## Task Commits

Each task was committed atomically:

1. **Task 1: Write migration 006 — slugify, generate_unique_org_slug, extended handle_new_user** - `97c5ea8` (feat)
2. **Task 2: Apply migration 006 to the linked Supabase project** - push-only task, no new files to commit (see below)

**Plan metadata:** (this commit) - `docs(02-01): complete migration 006 plan`

## Files Created/Modified
- `supabase/migrations/006_org_signup.sql` - New additive migration: `unaccent` extension, `slugify()`, `generate_unique_org_slug()`, and the extended `handle_new_user()` trigger function (created in Task 1, commit `97c5ea8`)

## Decisions Made
- No new files were produced by Task 2 (it is a deploy-only task against an already-committed migration file), so there is no separate Task 2 commit beyond this plan's metadata commit.
- See `key-decisions` in frontmatter for the slugify STABLE-vs-IMMUTABLE and idempotency-guard decisions made during Task 1.

## Deviations from Plan

### Auto-fixed Issues

None - the migration file (Task 1) was written exactly per the plan's interface spec, and matches all `acceptance_criteria` (verified by re-reading `supabase/migrations/006_org_signup.sql` against the plan: contains `create or replace function handle_new_user`, `create or replace function generate_unique_org_slug`, `create or replace function slugify`, `create extension if not exists unaccent`, both branches present, `security definer` + `set search_path = public` present, no edits to migrations 003/005).

### Authentication Gate (Task 2)

- **Found during:** Task 2 (`supabase db push --linked`)
- **Issue:** The CLI session in this working tree is not authenticated for live Supabase operations — `supabase migration list --linked` and `supabase db push --linked --dry-run` both fail with `unexpected login role status 401: {"message":"Unauthorized"}` / `Connect to your database by setting the env var correctly: SUPABASE_DB_PASSWORD`. Neither `SUPABASE_ACCESS_TOKEN` nor `SUPABASE_DB_PASSWORD` is set in this session's environment.
- **Resolution:** This is a normal auth-gate, not a bug. The orchestrator (running with the correct credentials/`SUPABASE_ACCESS_TOKEN` set) ran `supabase db push --linked` directly and reported success: "Applying migration 006_org_signup.sql... Finished supabase db push." against project `zojrqjmauruishfvgdja` (canal-denuncies-saas / Platform 2, branch `saas-multitenant`).
- **Outcome:** Migration 006 is live. No code change required.

---

**Total deviations:** 0 auto-fixed. 1 authentication gate (resolved by orchestrator, documented as normal flow per execute-plan.md).
**Impact on plan:** None — plan executed exactly as written; only the execution context (who runs the push) differed from a single-agent flow.

## Issues Encountered

- Live SQL verification of the applied functions (`select proname from pg_proc where proname in (...)` and `select extname from pg_extension where extname='unaccent'`) could not be run from this session — the Supabase CLI in this shell has no `SUPABASE_ACCESS_TOKEN`/`SUPABASE_DB_PASSWORD` and returns `401 Unauthorized` for any `--linked` query (`migration list`, `db push --dry-run`).
- **Verification method used instead:** (1) the orchestrator's direct report of a successful `supabase db push --linked` run against `zojrqjmauruishfvgdja` (output: "Applying migration 006_org_signup.sql... Finished supabase db push."), and (2) a full re-read of `supabase/migrations/006_org_signup.sql` confirming its content matches every behavior described in the plan's `<interfaces>`, `<action>`, and `<acceptance_criteria>` sections (slugify STABLE + unaccent, generate_unique_org_slug with `'empresa'` fallback and `-N` collision loop, handle_new_user with idempotency guard + company_name branch + security definer + search_path hardening, no edits to 003/005).
- This is documented per the resume instructions as the substitute verification method given no direct DB query access in this session.

## User Setup Required

None - no external service configuration required. Migration 006 is now live on the linked Supabase project; no manual dashboard steps needed.

## Next Phase Readiness
- Migration 006 (`slugify`, `generate_unique_org_slug`, extended `handle_new_user`) is live on `zojrqjmauruishfvgdja` (canal-denuncies-saas / Platform 2).
- Plan 02-02 (Signup page, already executed per `02-02-SUMMARY.md`) can now have its `signUpOrganization()` flow exercised end-to-end against a real database.
- Plan 02-03 (end-to-end verification) is unblocked: the trigger-side mechanism for "self-signup creates org + superadmin profile" and "invite-manager creates manager profile only" is deployed and ready to be exercised via `/crear-compte`.
- Recommended follow-up for 02-03: a live signup through `/crear-compte` followed by a check that `organizations` gained a new row with the expected slug and `profiles` gained a `role='superadmin'` row with matching `organization_id` would constitute the live functional verification that this session's CLI auth gate prevented from being run directly here.

---
*Phase: 02-autoregistre-d-empreses-crear-compte*
*Completed: 2026-06-11*
