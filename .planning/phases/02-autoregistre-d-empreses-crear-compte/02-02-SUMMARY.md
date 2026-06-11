---
phase: 02-autoregistre-d-empreses-crear-compte
plan: 02
subsystem: auth
tags: [supabase-auth, react, react-router, i18n, signup]

# Dependency graph
requires:
  - phase: 02-autoregistre-d-empreses-crear-compte
    provides: "migration 006 handle_new_user() trigger that branches on raw_user_meta_data.company_name (plan 02-01)"
provides:
  - "Public /crear-compte signup page (ca/es/en) for self-registering organizations"
  - "signUpOrganization() helper in src/lib/supabase.js calling supabase.auth.signUp() with company_name/full_name metadata"
  - "signup translation namespace in src/translations.js (ca/es/en)"
affects: [02-03-end-to-end-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public auth pages use the .page wrapper (lang-bar) + .admin-login-card combo, mirroring Login.jsx form classes (field/field-label/field-input/btn-submit/admin-login-error)"
    - "Client never inserts into organizations/profiles directly — all org provisioning happens server-side via the auth.users insert trigger, client only passes metadata through supabase.auth.signUp()"

key-files:
  created:
    - src/pages/Signup.jsx
  modified:
    - src/lib/supabase.js
    - src/translations.js
    - src/App.jsx

key-decisions:
  - "Reused existing admin-login-* CSS classes for the signup card instead of creating new styles, keeping visual consistency with Login.jsx with zero new CSS"
  - "Password confirm-email message uses literal '{email}' substring in translations, replaced via .replace('{email}', form.email) at render time"

patterns-established:
  - "signUpOrganization() is the sole new Supabase touchpoint for self-signup; never writes to organizations/profiles from the client (RLS-safe, relies on migration 006 trigger)"

requirements-completed: [SIGNUP-01, SIGNUP-02]

# Metrics
duration: 12min
completed: 2026-06-11
---

# Phase 02 Plan 02: Crear Compte Signup Page Summary

**Public /crear-compte page (ca/es/en) wired to a new signUpOrganization() helper that calls supabase.auth.signUp() with company_name/full_name metadata, branching to a "check your email" state or redirect to /admin based on session presence**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-11T08:28:00Z
- **Completed:** 2026-06-11T08:40:29Z
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- Added `signUpOrganization({ companyName, fullName, email, password })` to `src/lib/supabase.js`, the only new Supabase call for self-signup, returning `{ user, needsConfirmation, error }`
- Added a complete `signup` translation namespace (21 keys) to all three language blocks (ca/es/en) in `src/translations.js`
- Created `src/pages/Signup.jsx`: a public signup form (company name, full name, email, password) with a ca/es/en language switcher, mirroring `Login.jsx` styling and `PublicApp`'s lang-bar pattern
- Registered `/crear-compte` as a new public route in `src/App.jsx`, outside any AdminGuard

## Task Commits

Each task was committed atomically:

1. **Task 1: Add signUpOrganization() to supabase.js and signup translations (ca/es/en)** - `3f93f84` (feat)
2. **Task 2: Create Signup.jsx page and wire /crear-compte route in App.jsx** - `6cd725a` (feat)

_Note: This is a worktree-isolated execution; STATE.md/ROADMAP.md metadata commit is owned by the orchestrator after merge._

## Files Created/Modified
- `src/pages/Signup.jsx` - New public signup page: form (company name, full name, email, password), lang switcher, "check your email" confirmation state, redirect to /admin on session
- `src/lib/supabase.js` - Added `signUpOrganization()` async function in the Auth (admin) section, right after `signInAdmin`
- `src/translations.js` - Added `signup` namespace (pageTitle, pageSubtitle, field labels/placeholders, submit states, login link, confirm-email message, error messages, backToChannel) to ca/es/en blocks
- `src/App.jsx` - Imported `Signup` and added `<Route path="/crear-compte" element={<Signup />} />` alongside other public routes

## Decisions Made
- Reused `admin-login-*` CSS classes (admin-login-card, admin-login-form, field, field-label, field-input, btn btn-submit, admin-login-error, admin-login-back) for the signup card — zero new CSS needed, visual consistency with existing Login.jsx
- Wrapped the page in `<div className="page">` (same as PublicApp) so `.lang-bar`'s translucent buttons render correctly against the dark gradient background, with `.admin-login-card` nested inside for the form

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `npm run build` completed successfully with no new warnings beyond the pre-existing chunk-size warnings (unrelated to this change).

## User Setup Required

None - no external service configuration required. The signup form depends on migration 006 (plan 02-01) being applied to the linked Supabase project for the org+superadmin provisioning trigger to fire; that is tracked separately in plan 02-01's summary.

## Known Stubs

None.

## Next Phase Readiness
- `/crear-compte` is reachable and renders in ca/es/en with a working language switcher
- `signUpOrganization()` is ready for end-to-end verification in plan 02-03 once migration 006 is confirmed live
- No blockers for plan 02-03

---
*Phase: 02-autoregistre-d-empreses-crear-compte*
*Completed: 2026-06-11*

## Self-Check: PASSED

- FOUND: src/pages/Signup.jsx
- FOUND: .planning/phases/02-autoregistre-d-empreses-crear-compte/02-02-SUMMARY.md
- FOUND: 3f93f84 (Task 1 commit)
- FOUND: 6cd725a (Task 2 commit)
- FOUND: 21d9b16 (SUMMARY commit)
