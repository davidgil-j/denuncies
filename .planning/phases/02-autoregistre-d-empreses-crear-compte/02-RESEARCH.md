# Phase 2: Autoregistre d'empreses (Crear Compte) - Research

**Researched:** 2026-06-10
**Domain:** Supabase Auth signup + Postgres trigger-based multi-tenant provisioning + React form/i18n
**Confidence:** HIGH

## Summary

This phase adds a public "Crear Compte" page that lets a new company self-register: it creates a `auth.users` row (Supabase Auth signUp), a new `organizations` row (with a unique slug derived from the company name), and a `profiles` row with `role = 'superadmin'` and `organization_id` pointing at the new org — all atomically, without manual intervention.

The codebase already has the exact mechanism needed for "do privileged work on user creation": migration 003 created a `handle_new_user()` trigger function (`security definer`, fires `after insert on auth.users`) that currently inserts a `profiles` row with `role = 'manager'`. **This trigger must be extended (new migration, not edited in place)** to also read the company name from `raw_user_meta_data`, create the `organizations` row, generate a unique slug, and insert the `profiles` row with `role = 'superadmin'` and the new `organization_id` — but ONLY when `raw_user_meta_data` indicates "this is a self-signup" (vs. the existing manager-invitation flow via `invite-manager` Edge Function, which must keep producing `role = 'manager'` profiles with no organization of their own — they get `organization_id` set to the inviting superadmin's org separately, in a later phase).

Because `organizations` has RLS enabled with **only a SELECT policy** (`org_read_own_organization`, requires `current_org_id()` which itself depends on `profiles.organization_id`), there is **no INSERT policy** — anon/authenticated clients cannot insert into `organizations` directly. The trigger's `security definer` privilege is therefore the only viable path; it bypasses RLS by design. A client-side "signUp then insert org then insert profile" sequence would fail at step 2 (RLS blocks it) and is also unsafe due to partial-failure risk.

Email confirmation does NOT block this flow: `auth.users` row insertion happens synchronously during `signUp()` regardless of whether "Confirm email" is enabled in the Supabase Auth settings — the `after insert on auth.users` trigger fires immediately, so the organization + superadmin profile are created before (or independent of) the user clicking a confirmation link. The user simply cannot log in (`/admin`) until they confirm, per existing Login.jsx error handling which already has a Catalan message for "email not confirmed".

**Primary recommendation:** Extend `handle_new_user()` (new migration `006_signup_organizations.sql`) to branch on a `raw_user_meta_data->>'company_name'` flag: if present, create org + slug + superadmin profile; otherwise (existing invite-manager flow), keep current manager-profile-only behavior. Build the "Crear Compte" page as a new public route (`/crear-compte` or `/signup`) calling `supabase.auth.signUp()` with `options.data = { company_name, full_name }`. Generate slugs in Postgres using `unaccent` + a collision-handling loop, all inside the trigger (server-side, atomic, no client-side slug logic needed).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Signup form UI (ca/es/en) | Browser / Client | — | New React page, follows existing ComplaintForm/Login patterns |
| Create `auth.users` record | API / Backend (Supabase Auth) | Browser triggers via `supabase.auth.signUp()` | Standard Supabase Auth responsibility |
| Create `organizations` row + slug | Database / Storage | — | Must run as `security definer` trigger — RLS forbids direct insert from client |
| Create `profiles` row (role=superadmin, organization_id) | Database / Storage | — | Same trigger, same transaction as org creation |
| Slug uniqueness/collision handling | Database / Storage | — | Atomic with org creation; client cannot safely generate+check+insert without a race |
| Post-signup routing (to login or "check your email") | Browser / Client | — | Depends on whether email confirmation is enabled for this Supabase project |
| Session/profile loading after login | Frontend Server (AdminAuth context) | — | Existing `AdminAuthProvider` pattern unchanged — already reads `profiles` via `getProfile()` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.105.4 (already in package.json; 2.108.1 latest) [VERIFIED: npm registry] | `supabase.auth.signUp()` for new user creation | Already the project's only DB/auth client; all calls go through `src/lib/supabase.js` per CLAUDE.md |
| PostgreSQL `unaccent` extension | bundled with Supabase Postgres | Strip accents (à, ç, ñ, ü — common in Catalan/Spanish company names) before slugifying | [CITED: supabase.com/docs/guides/database/extensions] — pre-installed, enable via `create extension unaccent with schema extensions;` |
| PostgreSQL `pgcrypto` (gen_random_uuid) | already used (migration 001/005) | UUID generation for `organizations.id` | Already in use project-wide |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | already in package.json | Signup form validation | Matches CLAUDE.md stack table; used by ComplaintForm |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Postgres trigger on `auth.users` (security definer) | SECURITY DEFINER RPC called explicitly after `signUp()` from the client | RPC approach requires the client to make a second call after signup, which can fail/be skipped (network drop, user closes tab) leaving an `auth.users` row with no org/profile — an orphaned account that can never log in successfully (profile lookup in `AdminAuth.jsx` would return null). The trigger approach is atomic with user creation and cannot be skipped. **Recommendation: trigger.** |
| Postgres trigger | Client-side sequential inserts (signUp → insert organizations → insert profiles) | Blocked entirely: `organizations` has no INSERT RLS policy, so step 2 fails with a permission error for any non-service-role client. Not viable. |
| `unaccent` extension | Hand-rolled regex replacing only common Catalan/Spanish accented chars | `unaccent` is a one-line `CREATE EXTENSION`, handles the full Unicode accent range correctly (à, é, í, ò, ú, ï, ü, ç, ñ, etc.), and is maintained by Postgres core. Hand-rolling risks missing characters in real company names. |

**Installation:**
No new npm packages required. This phase is migration + frontend route only.

```sql
-- in the new migration file
create extension if not exists unaccent with schema extensions;
```

**Version verification:** `@supabase/supabase-js` is already pinned in `package.json` (`^2.105.4`); `npm view @supabase/supabase-js version` returns `2.108.1` as of research date — within the existing `^2.105.4` range, no `package.json` change needed [VERIFIED: npm registry].

## Package Legitimacy Audit

No new external packages are introduced by this phase (no `npm install` required). The only "new" dependency is the Postgres `unaccent` extension, which ships with Supabase's Postgres image and is enabled via SQL `CREATE EXTENSION`, not a package manager. Package Legitimacy Gate is **not applicable** to this phase.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| (none — no new packages) | — | — | — | — | — | N/A |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
[Browser: /crear-compte page]
        |
        | 1. user fills form: company_name, full_name, email, password, lang
        v
[supabase.auth.signUp()]  --(via src/lib/supabase.js: signUpOrganization())
        |
        | 2. Supabase Auth creates row in auth.users
        |    raw_user_meta_data = { company_name, full_name, signup_type: 'org_owner' }
        v
[Postgres trigger: on_auth_user_created -> handle_new_user()]  (security definer)
        |
        |--3a. IF raw_user_meta_data->>'signup_type' = 'org_owner':
        |       - generate base slug from company_name (unaccent + lowercase + replace)
        |       - loop: append -1, -2... until slug is unique in organizations
        |       - INSERT INTO organizations (name, slug) VALUES (company_name, slug) RETURNING id
        |       - INSERT INTO profiles (id, role, full_name, organization_id)
        |               VALUES (new.id, 'superadmin', full_name, new_org_id)
        |
        |--3b. ELSE (existing invite-manager flow, unchanged):
        |       - INSERT INTO profiles (id, role, full_name) VALUES (new.id, 'manager', full_name)
        v
[auth.users row committed] -- signUp() resolves in browser
        |
        | 4. If "Confirm email" enabled (Supabase project setting):
        |      -> show "check your email" message, no session yet
        |    Else:
        |      -> session returned immediately, redirect to /admin
        v
[/admin/login] -- existing AdminAuthProvider loads profile via getProfile(),
                  sees role='superadmin', organization_id=<new org>,
                  Dashboard queries are scoped by current_org_id() RLS -> empty list
```

### Recommended Project Structure
```
src/
├── pages/
│   └── Signup.jsx              # NEW: public "Crear Compte" page (3 fields: company name, email, password [+ confirm])
├── lib/
│   └── supabase.js             # add: signUpOrganization({ companyName, email, password, fullName, lang })
├── translations.js             # add `signup` block to ca/es/en
└── App.jsx                     # add route: <Route path="/crear-compte" element={<Signup />} />

supabase/
└── migrations/
    └── 006_org_signup.sql      # NEW: extends handle_new_user(), adds slugify + org creation
```

### Pattern 1: Conditional trigger logic via `raw_user_meta_data` discriminator
**What:** The single `handle_new_user()` trigger branches based on a metadata flag (`signup_type` or simply presence of `company_name`) to decide whether to provision a new organization or just create a manager profile (existing invite flow).
**When to use:** Whenever one `auth.users` insert trigger must serve two distinct signup origins (self-signup vs. admin-invited).
**Example:**
```sql
-- Source: pattern derived from existing supabase/migrations/003_roles_permissions.sql
-- combined with Supabase official trigger pattern (supabase.com/docs/guides/auth/managing-user-data)
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_name text := new.raw_user_meta_data->>'company_name';
  v_full_name    text := new.raw_user_meta_data->>'full_name';
  v_org_id       uuid;
  v_slug         text;
begin
  if v_company_name is not null and length(trim(v_company_name)) > 0 then
    -- Self-signup: create organization + superadmin profile
    v_slug := generate_unique_org_slug(v_company_name);

    insert into organizations (name, slug)
    values (v_company_name, v_slug)
    returning id into v_org_id;

    insert into profiles (id, role, full_name, organization_id)
    values (new.id, 'superadmin', v_full_name, v_org_id)
    on conflict (id) do nothing;
  else
    -- Existing flow: manager invited by a superadmin (no org assigned here)
    insert into profiles (id, role, full_name)
    values (new.id, 'manager', v_full_name)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;
```

### Pattern 2: Slug generation with collision loop (server-side, atomic)
**What:** A `generate_unique_org_slug(text)` helper function that slugifies a company name and appends `-2`, `-3`, etc. on collision, called inside the same trigger transaction so there's no TOCTOU race between two simultaneous signups with the same company name.
**When to use:** Any time a unique human-readable identifier must be derived from free-text input.
**Example:**
```sql
-- Source: pattern derived from bqst.fr "Using PostgreSQL to Generate Unique Slugs" (community, verified against
-- Postgres unaccent docs: https://www.postgresql.org/docs/current/unaccent.html)
create extension if not exists unaccent with schema extensions;

create or replace function slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(extensions.unaccent(value)), '[^a-z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    )
  );
$$;

create or replace function generate_unique_org_slug(company_name text)
returns text
language plpgsql
as $$
declare
  base_slug text := slugify(company_name);
  candidate text;
  counter   int := 1;
begin
  if base_slug is null or base_slug = '' then
    base_slug := 'empresa';
  end if;

  candidate := base_slug;

  while exists (select 1 from organizations where slug = candidate) loop
    counter := counter + 1;
    candidate := base_slug || '-' || counter;
  end loop;

  return candidate;
end;
$$;
```

### Pattern 3: Public signup page with i18n + react-hook-form (matches ComplaintForm/Login conventions)
**What:** New page at a public route, language switcher consistent with `App.jsx` `PublicApp`/`LandingPage`, three-language strings in `translations.js`.
**When to use:** All new public-facing pages per CLAUDE.md convention #1.
**Example structure:**
```jsx
// Source: pattern derived from src/pages/admin/Login.jsx (existing form/error-handling conventions)
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUpOrganization } from '../lib/supabase.js';
import { translations } from '../translations.js';

export default function Signup({ lang = 'ca' }) {
  const t = translations[lang].signup; // new namespace
  const navigate = useNavigate();
  const [form, setForm] = useState({ companyName: '', fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err, needsConfirmation } = await signUpOrganization({
      companyName: form.companyName,
      fullName: form.fullName,
      email: form.email,
      password: form.password,
      lang,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (needsConfirmation) { setDone(true); return; }
    navigate('/admin', { replace: true });
  }
  // ... render form or "check your email" confirmation message
}
```

### Anti-Patterns to Avoid
- **Generating the slug in JavaScript and sending it to the server:** Race condition between two organizations signing up with the same name simultaneously; also requires an extra round-trip to check uniqueness before insert. Do it inside the trigger transaction.
- **Calling `supabase.from('organizations').insert(...)` from the client after `signUp()`:** Will fail — RLS has no INSERT policy on `organizations`. Even if a policy were added permissively, this creates a two-step non-atomic flow with orphaned-account risk.
- **Editing `handle_new_user()` in place by modifying migration 003:** Violates "migrations are append-only history" — write a new migration (006) that does `create or replace function handle_new_user()` with the full new body. Never edit a previously-applied migration file.
- **Assuming `signUp()` always returns a session:** If "Confirm email" is enabled (likely the default for this Supabase project, same as Platform 1 — see Login.jsx's existing "email not confirmed" error handling), `data.session` will be `null` until the user clicks the confirmation link. The signup page must handle both cases.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slug generation/uniqueness | Custom JS slug + client-side uniqueness check via SELECT | Postgres `unaccent` + `slugify()` + `generate_unique_org_slug()` inside the trigger | Atomic, no race condition, handles Catalan/Spanish accents correctly |
| "Create user + provision tenant" orchestration | Sequential client-side calls with manual rollback on partial failure | `security definer` trigger on `auth.users` insert | Already the established pattern in this codebase (migration 003); atomic with auth.users insert |
| Password strength / email format validation | Custom regex | Supabase Auth's built-in validation (returns specific error codes) + `react-hook-form` `required`/`type="email"`/`minLength` for UX-level pre-check | Supabase already enforces minimum password length server-side; client validation is just UX |

**Key insight:** The hard part of this phase is not the form UI — it's getting org + profile creation to happen exactly once, atomically, regardless of email-confirmation timing. The codebase already has 80% of the answer in migration 003's `handle_new_user()` trigger; this phase extends it rather than inventing a new mechanism.

## Common Pitfalls

### Pitfall 1: Trigger fires for invited managers too — must not create a spurious organization
**What goes wrong:** If the new trigger logic doesn't correctly distinguish "self-signup" from "admin invited me as a manager" (via `invite-manager` Edge Function, which calls `auth.admin.inviteUserByEmail`), every invited manager would get their own new organization and become a superadmin of it instead of joining the inviter's org.
**Why it happens:** Both flows insert into `auth.users` and fire the same `on_auth_user_created` trigger.
**How to avoid:** Branch strictly on presence of `raw_user_meta_data->>'company_name'` (only set by the new self-signup form). The `invite-manager` Edge Function's `inviteUserByEmail` call passes `data: { full_name }` only — no `company_name` — so it falls through to the existing manager-profile branch unchanged. Verify this by reading `supabase/functions/invite-manager/index.ts` (already done — confirms only `full_name` is passed).
**Warning signs:** A newly invited manager ends up with `role='superadmin'` and a brand-new `organization_id` instead of joining the inviting org.

### Pitfall 2: `on conflict (id) do nothing` silently swallows errors if profile already exists
**What goes wrong:** The existing trigger uses `on conflict (id) do nothing`. If a signup retries (e.g., user double-clicks submit, or Supabase retries the trigger), the second invocation would silently skip profile creation — but the first invocation already created an `organizations` row, so a retry could create a duplicate, orphaned organization with no linked profile.
**Why it happens:** `auth.users.id` is the conflict target for `profiles`, but `organizations` has no natural dedup key tied to the user.
**How to avoid:** Either (a) make the trigger idempotent by checking `if not exists (select 1 from profiles where id = new.id)` before doing anything, or (b) accept that `auth.users` inserts only happen once per signup (Supabase Auth itself prevents duplicate signups with the same email — a retry with the same email returns an existing-user error before the trigger fires again). Recommend (a) as a defensive measure since it's cheap.
**Warning signs:** Orphaned rows in `organizations` with no `profiles.organization_id` pointing to them.

### Pitfall 3: Email confirmation makes "log in immediately after signup" impossible by default
**What goes wrong:** If the Supabase project (canal-denuncies-saas / zojrqjmauruishfvgdja) has "Confirm email" enabled (the Platform 1 project does, per existing Login.jsx error message "El correu electrònic encara no s'ha confirmat"), `signUp()` returns `data.session = null` and `data.user` with `email_confirmed_at = null`. Redirecting straight to `/admin` would hit `AdminGuard`, which calls `getAdminSession()` — returns `null` — and bounces back to `/admin/login`. The user would see a confusing redirect loop or a login form with no explanation.
**Why it happens:** Supabase Auth's default security posture requires verified email before issuing a session.
**How to avoid:** After `signUp()`, check `data.session`. If `null`, show a "Comprova el teu correu per confirmar el compte" message (in all 3 languages) instead of redirecting to `/admin`. This requires checking the actual project setting (Supabase Dashboard > Authentication > Providers > Email > "Confirm email") — flagged as an Open Question below since this can't be verified without dashboard/MCP access.
**Warning signs:** Success criteria #3 ("new user can log in to /admin and see empty dashboard") fails immediately after signup with "email not confirmed" error.

### Pitfall 4: `search_path` security on SECURITY DEFINER functions
**What goes wrong:** `security definer` functions without `set search_path` are vulnerable to search-path-hijacking if a malicious user can create objects in a schema earlier in the search path.
**Why it happens:** Default Postgres behavior resolves unqualified identifiers using the caller's `search_path`, not the function owner's.
**How to avoid:** The existing `handle_new_user()` (migration 003) does NOT set `search_path` — but `current_org_id()` and `is_superadmin()` (migrations 004/005) also don't. This is a pre-existing pattern in the codebase. For the NEW function, follow Supabase's official current guidance and add `set search_path = public` (or `= ''` with fully-qualified `public.organizations` etc.) as a hardening improvement, without needing to retrofit the older functions in this phase.
**Warning signs:** None currently exploitable (no untrusted schema-creation vector in this app), but worth doing correctly for new code. [CITED: supabase.com/docs/guides/auth/managing-user-data]

### Pitfall 5: Company name producing an empty or purely-numeric slug
**What goes wrong:** A company name like "🚀🚀🚀" or "123" or "S.A." (after stripping punctuation, a name like "Cïa. & Cïa." could collapse to very short/odd slugs).
**Why it happens:** `slugify()` strips all non-alphanumeric characters; edge-case inputs can produce empty strings or collide trivially.
**How to avoid:** The `generate_unique_org_slug` function already falls back to `'empresa'` if the slugified result is empty, then the collision loop appends `-2`, `-3`, etc. Recommend also enforcing a minimum length check or NOT NULL/CHECK constraint isn't strictly needed since `organizations.slug` is already `unique not null` — the collision loop guarantees uniqueness regardless of base value.
**Warning signs:** Two unrelated companies named with only emoji/symbols both get slug `empresa`, `empresa-2` — functionally fine (still unique), just not pretty. Acceptable for v1.

## Code Examples

### Full new migration (006_org_signup.sql) — combines patterns 1 & 2
```sql
-- Source: derived from supabase/migrations/003_roles_permissions.sql (existing handle_new_user)
-- + Supabase official trigger docs (supabase.com/docs/guides/auth/managing-user-data)
-- + community slug pattern (bqst.fr/using-postgresql-to-generate-unique-slugs)

create extension if not exists unaccent with schema extensions;

create or replace function slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(extensions.unaccent(value)), '[^a-z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    )
  );
$$;

create or replace function generate_unique_org_slug(company_name text)
returns text
language plpgsql
as $$
declare
  base_slug text := slugify(company_name);
  candidate text;
  counter   int := 1;
begin
  if base_slug is null or base_slug = '' then
    base_slug := 'empresa';
  end if;

  candidate := base_slug;

  while exists (select 1 from organizations where slug = candidate) loop
    counter := counter + 1;
    candidate := base_slug || '-' || counter;
  end loop;

  return candidate;
end;
$$;

-- Replace handle_new_user to support self-signup (org creation) alongside
-- the existing invite-manager flow (manager profile only, no org here)
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_name text := new.raw_user_meta_data->>'company_name';
  v_full_name    text := new.raw_user_meta_data->>'full_name';
  v_org_id       uuid;
  v_slug         text;
begin
  if exists (select 1 from profiles where id = new.id) then
    return new; -- idempotency guard
  end if;

  if v_company_name is not null and length(trim(v_company_name)) > 0 then
    v_slug := generate_unique_org_slug(v_company_name);

    insert into organizations (name, slug)
    values (trim(v_company_name), v_slug)
    returning id into v_org_id;

    insert into profiles (id, role, full_name, organization_id)
    values (new.id, 'superadmin', v_full_name, v_org_id);
  else
    insert into profiles (id, role, full_name)
    values (new.id, 'manager', v_full_name);
  end if;

  return new;
end;
$$;

-- Trigger already exists from migration 003 (on_auth_user_created), no need to recreate
-- since create or replace function updates the function body the existing trigger calls.
```

### supabase.js addition
```javascript
// Source: pattern matches existing signInAdmin/signOutAdmin in src/lib/supabase.js
export async function signUpOrganization({ companyName, fullName, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { company_name: companyName, full_name: fullName },
    },
  });

  return {
    user: data?.user ?? null,
    needsConfirmation: !!data?.user && !data?.session,
    error,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Single-tenant `handle_new_user()` always assigns `role='manager'` | Branching trigger: self-signup creates org + superadmin, invite flow keeps manager-only | This phase (006) | New migration must be additive — `create or replace function` preserves the trigger binding from migration 003 |

**Deprecated/outdated:** None — this is additive to the existing trigger pattern, no removals.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The Supabase project for Platform 2 (canal-denuncies-saas / zojrqjmauruishfvgdja) has "Confirm email" enabled (same as Platform 1, inferred from existing Login.jsx error-message handling for "email not confirmed") | Pitfall 3, Architecture diagram | If confirmation is actually OFF for this new project, the signup flow can redirect straight to `/admin` and the "check your email" UI branch is simply unused (harmless) — but if ON and the plan doesn't build the "check your email" UI, success criterion 3 (login immediately after signup) will fail for users |
| A2 | `raw_user_meta_data->>'company_name'` is a safe, unused-elsewhere discriminator key (no existing code path sets this key for the invite-manager flow) | Pattern 1, Pitfall 1 | Verified by reading `supabase/functions/invite-manager/index.ts` — it only sets `data: { full_name }`. Low risk, but should be double-checked if invite-manager is modified in a later phase |
| A3 | Route path `/crear-compte` (vs `/signup` or `/registre`) is acceptable; not specified in CONTEXT.md (none exists for this phase) | Recommended Project Structure | Low — purely cosmetic, easy to change in routing/translations |

**If this table is empty:** N/A — see entries above.

## Open Questions

1. **Is "Confirm email" enabled for the Platform 2 Supabase project (zojrqjmauruishfvgdja)?**
   - What we know: Platform 1's Login.jsx has explicit handling for "Email not confirmed" errors, suggesting Platform 1 has it enabled. Platform 2 was created fresh in Phase 1 (migration 005 applied to an empty DB) — Auth settings are project-level dashboard config, not part of any SQL migration, so they wouldn't be replicated automatically.
   - What's unclear: Whether Phase 1's setup process copied Auth settings, or left Platform 2 at Supabase defaults (which, as of recent Supabase versions, default "Confirm email" to ON for new projects).
   - Recommendation: The planner should include a task to verify this setting (Supabase Dashboard > Authentication > Sign In / Providers > Email > "Confirm email" toggle) as an early checkpoint, OR build the signup page defensively to handle BOTH outcomes (check `data.session` after `signUp()` and branch UI accordingly) — this is already reflected in the recommended `signUpOrganization()` return shape (`needsConfirmation` flag). Building defensively avoids blocking on dashboard access.

2. **Should there be a check for duplicate organization names (not just slug collision)?**
   - What we know: `organizations.slug` is `unique not null`; two companies with the same/similar name will get `acme`, `acme-2`, etc. — both succeed.
   - What's unclear: Whether the business wants to prevent two unrelated companies both registering as "Acme S.L." (potential brand confusion on `/canal/acme` vs `/canal/acme-2`), or whether this is acceptable for v1.
   - Recommendation: Out of scope for v1 per REQUIREMENTS.md (no such requirement listed). The collision-suffix approach is sufficient; defer any "name already taken, are you the same company?" UX to v2 if needed.

3. **Route naming for the signup page** (`/crear-compte`, `/signup`, `/registre`) and whether it lives inside `PublicApp` (with lang switcher state) or as a standalone top-level route like `LandingPage`.
   - What we know: `LandingPage` is a standalone top-level route (`/`) with no lang switcher; `PublicApp` (`/canal`) has the `lang` state + switcher bar.
   - What's unclear: Phase 5 ("Landing, traduccions i verificació E2E") is explicitly responsible for adding the "Crear Compte" CTA to the landing page — so Phase 2 just needs the page + route to exist and be reachable (e.g., direct link), with its own lang switcher (matching `PublicApp`'s pattern) since it must be ca/es/en per SIGNUP-01.
   - Recommendation: Build `/crear-compte` as a standalone route with its own internal `lang` state + switcher bar (copy the pattern from `PublicApp`'s lang-bar), independent of the landing page integration which Phase 5 will handle.

## Environment Availability

Skipped — this phase has no new external CLI/runtime dependencies beyond what's already used (Supabase CLI for migrations, already established in Phase 1; Node/npm for the existing Vite project).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no `vitest`/`jest` config or test files found in repo |
| Config file | none |
| Quick run command | none — manual verification only |
| Full suite command | none |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SIGNUP-01 | "Crear Compte" page renders in ca/es/en, accessible via direct route | manual-only | — (visual/manual check in browser, switch lang, verify all 3 strings) | N/A — no test infra |
| SIGNUP-02 | Submitting form creates `organizations` row + `profiles` row with `role='superadmin'` and matching `organization_id` | manual-only (or SQL verification query against Supabase) | `select * from organizations; select * from profiles where role='superadmin';` run via Supabase SQL editor or `supabase db` CLI after manual signup | N/A — no test infra |
| SIGNUP-03 | New organization has a unique `slug` | manual-only | Same SQL check above — confirm `slug` is non-null and unique | N/A — no test infra |

**Justification for manual-only:** This project has zero test framework (`package.json` has no `test` script, no `vitest.config`/`jest.config`, no `__tests__`/`*.test.*` files anywhere in the repo outside `node_modules`). Introducing a test framework is out of scope for this phase (not listed in REQUIREMENTS.md or CLAUDE.md conventions) and would be a significant scope expansion. All v1.0 success criteria across all 5 phases are phrased as manually-verifiable end states ("una empresa nova es registra...", "es verifica un flux complet..."), consistent with this project's existing verification style (Phase 1 was verified by checking deployed URLs and running migrations, not automated tests).

### Sampling Rate
- **Per task commit:** Manual smoke test — fill out signup form in dev (`npm run dev`), submit, check Supabase dashboard for new `organizations`/`profiles` rows
- **Per wave merge:** Full manual flow — signup, (confirm email if required), log in at `/admin`, verify empty dashboard (no complaints visible, since `organization_id` scoping via `current_org_id()` returns the new org with zero complaints)
- **Phase gate:** All 4 success criteria manually verified before `/gsd:verify-work`

### Wave 0 Gaps
None — no test infrastructure exists and none is being introduced. If the user wants automated tests for this phase, that would be a separate scope decision (not currently in REQUIREMENTS.md).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth `signUp()` with email/password — Supabase enforces minimum password length server-side (default 6 chars, configurable in dashboard). No custom auth logic introduced. |
| V3 Session Management | yes | Unchanged — existing `AdminAuthProvider`/`getAdminSession()` pattern handles the session created by `signUp()`/login identically to existing flows |
| V4 Access Control | yes | RLS on `organizations`/`profiles` (migration 005) — new org/profile rows are scoped by `organization_id` via `current_org_id()`; the new superadmin can only ever see their own org's data, enforced at DB level, not app level |
| V5 Input Validation | yes | `react-hook-form` for client-side UX validation (required fields, email format, password length) + Postgres `unique not null` constraint on `organizations.slug` and `check (role in ('superadmin','manager'))` on `profiles.role` as DB-level guarantees |
| V6 Cryptography | no | No custom cryptography — passwords handled entirely by Supabase Auth (bcrypt/argon2 server-side, never touched by app code) |

### Known Threat Patterns for {Supabase + React signup}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Privilege escalation via crafted `raw_user_meta_data` (e.g., a manager-invite signup also sending `company_name` to become a superadmin of a new org) | Elevation of Privilege | The trigger logic (Pattern 1) treats ANY `auth.users` insert with non-empty `company_name` as a self-signup that creates a NEW org with the new user as superadmin of THAT org only — it cannot affect or escalate privileges within an EXISTING organization, because `organization_id` is freshly generated, not attacker-supplied. The worst a malicious actor gains is "superadmin of their own brand-new empty org" — which is exactly what self-signup is supposed to grant. No actual escalation risk. |
| Slug enumeration / organization name disclosure via `/canal/:slug` (Phase 3 concern, but slug is created in this phase) | Information Disclosure | `get_organization_by_slug()` (migration 005) already returns only `id, name, slug` — minimal exposure, by design for the public channel. Out of scope to change in this phase. |
| Mass account creation / spam signups creating many empty organizations | Denial of Service (resource exhaustion) | Not addressed by this phase's scope (REQUIREMENTS.md does not list rate-limiting/CAPTCHA for signup). Existing `Turnstile` (Cloudflare CAPTCHA) is used on `/admin/login` and the public complaint form — the planner should consider whether `/crear-compte` also needs a Turnstile widget, following the `Login.jsx` pattern (`@marsidev/react-turnstile`, already a dependency). Flagging as a recommendation, not a blocking requirement, since it's not in REQUIREMENTS.md. |

## Sources

### Primary (HIGH confidence)
- supabase.com/docs/guides/auth/managing-user-data — official `handle_new_user()` trigger pattern (security definer, search_path, after-insert timing)
- supabase.com/docs/guides/database/extensions — `unaccent` extension availability/enabling on Supabase
- Codebase: `supabase/migrations/001-005_*.sql`, `src/lib/supabase.js`, `src/contexts/AdminAuth.jsx`, `src/pages/admin/Login.jsx`, `src/App.jsx`, `supabase/functions/invite-manager/index.ts` — direct inspection of existing patterns this phase must integrate with

### Secondary (MEDIUM confidence)
- bqst.fr/using-postgresql-to-generate-unique-slugs — slug generation + collision-handling SQL pattern (community, cross-checked against PostgreSQL `unaccent` official docs)
- WebSearch on RLS default-deny behavior (cross-checked against PostgreSQL official docs and supabase.com/docs/guides/database/postgres/row-level-security)

### Tertiary (LOW confidence)
- WebSearch on email confirmation timing relative to `auth.users` insert trigger — confirmed logically consistent with `after insert` semantics (HIGH confidence on the SQL mechanism itself) but the specific "Confirm email" toggle state for THIS Supabase project (zojrqjmauruishfvgdja) is unverified — see Open Question 1

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new packages; extends an existing, already-applied trigger pattern (migration 003) verified by direct file inspection
- Architecture: HIGH - RLS policies on `organizations` (migration 005) directly inspected, confirming SECURITY DEFINER trigger is the only viable path; `unaccent`/slug pattern cross-verified against official Postgres + Supabase docs
- Pitfalls: HIGH - all 5 pitfalls derived from direct inspection of existing trigger/RLS/Login code, not speculation; only the email-confirmation TOGGLE STATE (not the mechanism) is unverified

**Research date:** 2026-06-10
**Valid until:** 30 days (stable Postgres/Supabase APIs; no fast-moving dependencies)
