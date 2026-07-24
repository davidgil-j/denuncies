---
phase: 2
slug: autoregistre-d-empreses-crear-compte
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework in this project (no vitest/jest config or test files) |
| **Config file** | none — manual verification only |
| **Quick run command** | `npm run dev` (manual smoke test in browser) |
| **Full suite command** | manual end-to-end flow (signup -> confirm -> login -> dashboard) |
| **Estimated runtime** | ~5 minutes manual |

---

## Sampling Rate

- **After every task commit:** Manual smoke check relevant to that task (e.g., run migration via `supabase db push --linked`, check SQL editor for new functions/columns)
- **After every plan wave:** Full manual flow — fill `/crear-compte`, submit, check Supabase dashboard for `organizations`/`profiles` rows, then attempt login at `/admin/login`
- **Before `/gsd:verify-work`:** All 4 phase success criteria manually verified
- **Max feedback latency:** ~60s (migration push + dashboard check)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | SIGNUP-02, SIGNUP-03 | T-02-01 | New migration `006_org_signup.sql` extends `handle_new_user()` with `security definer` + `set search_path = public`; `organizations` insert only reachable via trigger (no client INSERT policy) | manual-only | `supabase db push --linked` then SQL check: `select * from organizations; select * from profiles where role='superadmin';` | N/A — no test infra | ⬜ pending |
| 02-01-02 | 01 | 1 | SIGNUP-01, SIGNUP-02 | T-02-01 | `signUpOrganization()` in `src/lib/supabase.js` passes `company_name`/`full_name` via `options.data`, never inserts directly into `organizations`/`profiles` | manual-only | Code review: `src/lib/supabase.js` contains `signUpOrganization` exported function | ✅ planned | ⬜ pending |
| 02-01-03 | 01 | 1 | SIGNUP-01 | — | New `/crear-compte` route renders signup form in ca/es/en with lang switcher | manual-only | Visual check in browser at `/crear-compte`, switch lang, verify all 3 languages render | ✅ planned | ⬜ pending |
| 02-01-04 | 01 | 1 | SIGNUP-02, SIGNUP-03 | T-02-01 | End-to-end: submit signup form -> new org with unique slug + superadmin profile created -> login at `/admin` shows empty dashboard scoped to new org | manual-only | Manual flow per Sampling Rate above | N/A — no test infra | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework introduction is in scope (not in REQUIREMENTS.md or CLAUDE.md conventions).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Crear Compte" page renders in ca/es/en | SIGNUP-01 | No test framework; UI/i18n is visual | Open `/crear-compte`, switch language selector through ca/es/en, confirm all visible strings translate |
| Signup creates organization + superadmin profile atomically | SIGNUP-02 | Requires live Supabase project + trigger execution | After signup, run `select id, name, slug from organizations order by created_at desc limit 1;` and `select id, role, organization_id from profiles where role='superadmin' order by created_at desc limit 1;` — confirm `organization_id` matches |
| New organization has unique slug | SIGNUP-03 | Requires live DB state | Confirm `slug` column is non-null, lowercase, URL-safe, and unique (`unique not null` constraint enforces this; spot-check value is human-readable) |
| New superadmin can log in and see empty dashboard | Success Criterion 3 | Requires full auth flow (possibly email confirmation) | Confirm email if "Confirm email" is enabled, then log in at `/admin/login`, verify Dashboard shows zero complaints (RLS-scoped to new `organization_id`) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (manual-only, justified above)
- [x] Sampling continuity: no 3 consecutive tasks without verification step
- [x] Wave 0 covers all MISSING references (none missing)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-10
