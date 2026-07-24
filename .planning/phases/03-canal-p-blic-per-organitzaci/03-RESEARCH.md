# Phase 3: Canal públic per organització - Research

**Researched:** 2026-06-29
**Domain:** Multi-tenant public routing (React Router 7 slug param) + Postgres RLS scoping for anonymous/unauthenticated access (Supabase)
**Confidence:** HIGH

## Summary

This phase converts the existing single-tenant public complaint channel (`/canal`, org-agnostic) into a multi-tenant channel addressed by organization slug (`/canal/:slug`). The database foundation for this was **already laid in Phase 1** (migration `005_multitenant_foundation.sql`): `complaints.organization_id` exists, the `public_insert_complaints` RLS policy already requires `organization_id is not null`, and a `get_organization_by_slug(p_slug text)` SECURITY DEFINER RPC already exists specifically to let an anonymous client resolve a slug to an organization id/name without exposing the full `organizations` table. **None of this needs to be re-invented — it needs to be wired up.**

The actual gap is entirely in the application layer plus two RLS policies that were deliberately left for this phase. `App.jsx` still routes `/canal` with no param; `ComplaintForm.jsx`/`TrackingPortal.jsx`/`supabase.js` have zero awareness of organization — `saveComplaint()` never sets `organization_id` (meaning every current insert attempt actually **fails** the existing `public_insert_complaints` check, since it requires `organization_id is not null`), and `getComplaintByCode()` does a bare `tracking_code` lookup with no organization filter. `tracking_code` is `unique not null` globally (migration 001, never changed) — so cross-tenant collision on the code itself is not a risk, but an unscoped lookup is still an organization-boundary leak risk in defense-in-depth terms (PUBLIC-03 requires the portal to "only return complaints from the correct organization", which the current `get_complaint_by_tracking_code` RPC already half-satisfies by returning `organization_id` in its result, but nothing currently checks it against the slug in context).

**The two genuinely new things to build are:** (1) the route + slug-resolution flow (`/canal/:slug` → call `get_organization_by_slug` → render 404/"channel not found" or the form, passing `organization_id` down); and (2) tightening `attachments` and `messages` RLS, which **migration 005 did not touch** — both tables still carry their original migration-001 policies of `using (true)` / `with check (true))` for anonymous SELECT/INSERT. This is a pre-existing cross-tenant leak surface (anyone holding any `complaint_id` UUID, regardless of org, can currently read/write messages and read attachment metadata for it) that becomes directly relevant once organization isolation is the stated goal of this phase, even though it is not explicitly named in the phase's three success criteria. It is flagged below as a recommended (not mandatory) hardening included in this phase's migration, since fixing it requires only adding an `organization_id`-aware EXISTS subquery, the same pattern already used for `complaints`.

**Primary recommendation:** Add one new migration that (a) requires `organization_id is not null` on `attachments`/`messages` insert policies via an EXISTS-join back to `complaints.organization_id` (no schema change, just RLS), and (b) leaves `get_organization_by_slug`/`get_complaint_by_tracking_code` as-is (already correctly scoped). On the frontend: add `/canal/:slug` as the only public channel route (replace `/canal`, do not keep both — see Open Question 1), resolve the slug client-side via a new `getOrganizationBySlug(slug)` wrapper in `supabase.js` before rendering `ComplaintForm`, thread `organizationId` as a prop into `ComplaintForm` so `saveComplaint()` can finally set it on insert, and scope `getComplaintByCode()` to also take and verify `organizationId`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Slug → organization_id resolution | Database / Storage (RPC) | Browser / Client (calls RPC, renders 404 on miss) | `get_organization_by_slug()` is already a SECURITY DEFINER RPC (migration 005) designed precisely so the client never queries `organizations` directly under RLS |
| Complaint submission scoped to org | Browser / Client (passes `organization_id`) | Database / Storage (RLS `with check (organization_id is not null)` enforces it cannot be omitted) | Client supplies the id resolved from the slug; DB enforces it's non-null but currently does NOT verify the id corresponds to a real row — see Pitfall 1 |
| Tracking-code lookup scoped to org | Database / Storage (RPC) | Browser / Client (passes both code and resolved org id) | `get_complaint_by_tracking_code` RPC already returns `organization_id` in its result; the client (or a tightened RPC signature) must verify it matches the slug-resolved org before showing any result |
| Messages/attachments read scoped to org | Database / Storage (RLS) | — | Currently NOT org-scoped (migration-001 `using (true)` policies untouched by migration 005) — must be fixed at the RLS layer, not in `supabase.js`, per CLAUDE.md "no bypassar RLS" |
| Route structure (`/canal/:slug`) | Browser / Client | — | Pure React Router concern, no backend involvement |
| Categories / i18n strings | Browser / Client | — | Hardcoded in `translations.js`, no DB table — confirmed unaffected by this phase (see Investigation 5 below) |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ORG-04 | La submissió i el seguiment de denúncies públiques estan associats a una organització concreta | `saveComplaint()` must set `organization_id` (resolved from slug) on insert; `getComplaintByCode()` must verify the returned complaint's `organization_id` matches the slug-resolved org before showing it to the reporter |
| PUBLIC-02 | El formulari públic d'una organització nova és accessible a `/canal/:slug` | New route in `App.jsx`; `get_organization_by_slug()` RPC (already exists) resolves slug → org before rendering `ComplaintForm` |
| PUBLIC-03 | El portal de seguiment per codi només retorna denúncies de l'organització correcta | `tracking_code` is globally unique (migration 001) so no collision risk, but the lookup must still filter/verify by `organization_id` to satisfy this requirement as an explicit boundary check, not just an accidental non-collision |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-router-dom | ^7.15.0 (already in package.json; 7.18.0 latest, verified `npm view`) [VERIFIED: npm registry] | `:slug` URL param via `useParams()` on a new `/canal/:slug` route | Already the project's only router; v7's `useParams` API for dynamic segments is unchanged from v6 and stable |
| @supabase/supabase-js | ^2.105.4 (already in package.json; 2.108.2 latest, verified `npm view`) [VERIFIED: npm registry] | Calling the existing `get_organization_by_slug` and `get_complaint_by_tracking_code` RPCs via `supabase.rpc(...)` | Already the project's only DB client; all calls must go through `src/lib/supabase.js` per CLAUDE.md |

No new npm packages are needed for this phase — purely additive use of already-installed, already-current dependencies.

### Supporting
None beyond the core stack — this phase is routing + RLS + existing-RPC wiring, not a new technology.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resolve slug via existing `get_organization_by_slug` RPC | Add RLS SELECT policy on `organizations` allowing anon `using (true)` and query the table directly from the client | Would expose every organization's `name`/`slug` to any unauthenticated caller via `supabase.from('organizations').select()` with no `eq('slug', ...)` filter possible to enforce client-side — defeats tenant-privacy intent. The RPC approach (already built in Phase 1) is strictly better: it takes the slug as a parameter and returns at most one row, with no way to enumerate other orgs. **Recommendation: keep using the existing RPC, do not add a direct table policy.** |
| Filtering tracking-code lookup by re-running `get_organization_by_slug` then comparing ids in JS | Add an `p_organization_id` parameter to a tightened `get_complaint_by_tracking_code` RPC, filtering server-side | Both work; server-side filtering is marginally more defense-in-depth (one round trip, no chance of the client forgetting to check the returned `organization_id`). Recommend tightening the RPC signature in the new migration — see Code Examples. |
| `/canal/:slug` only | Keep both `/canal` (legacy, no org) and `/canal/:slug` | `/canal` with no slug has no way to resolve an `organization_id`, and the `public_insert_complaints` policy already requires `organization_id is not null` — so a bare `/canal` submission would fail at the DB level today regardless. Phase 2's "Crear Compte" flow already gives every new org a slug-based link (per ROADMAP.md ADMIN-02), so there is no use case for an org-less public form in Plataforma 2. **Recommendation: replace `/canal` with `/canal/:slug`; do not keep a bare org-less form.** See Open Question 1 for the one nuance (redirect/404 UX for bare `/canal`). |

**Installation:** None — no new packages.

**Version verification:** `react-router-dom@7.18.0` and `@supabase/supabase-js@2.108.2` confirmed current via `npm view <pkg> version` (2026-06-29); both within the project's existing `^7.15.0` / `^2.105.4` ranges in `package.json`, no version bump required [VERIFIED: npm registry].

## Package Legitimacy Audit

Not applicable — this phase introduces zero new npm packages. Both libraries used (`react-router-dom`, `@supabase/supabase-js`) are pre-existing project dependencies, already vetted in prior phases.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| (none — no new packages) | — | — | — | — | — | N/A |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
[Browser: GET /canal/:slug]
        |
        | 1. useParams() extracts slug
        v
[PublicApp / new OrgChannel wrapper component]
        |
        | 2. getOrganizationBySlug(slug) -> supabase.rpc('get_organization_by_slug', { p_slug: slug })
        v
[Postgres RPC: get_organization_by_slug(p_slug)]  (SECURITY DEFINER, already exists - migration 005)
        |
        |-- found:  returns { id, name, slug }
        |-- not found: returns empty result set
        v
[Browser branches:]
        |
        |-- not found --> render "channel not found" (ca/es/en) -- NEW i18n strings needed
        |
        |-- found --> render <ComplaintForm organizationId={org.id} .../>
                            |
                            | 3. user submits form
                            v
                    [saveComplaint({ formData, files, organizationId })]
                            |
                            | 4. INSERT INTO complaints (..., organization_id) VALUES (..., organizationId)
                            v
                    [RLS: public_insert_complaints CHECK (organization_id IS NOT NULL)]
                            |   (already exists - migration 005; does NOT verify org row exists - see Pitfall 1)
                            v
                    [complaint row created, tracking_code returned to browser]

[Browser: tracking portal, same /canal/:slug page, "track" view]
        |
        | 1. user enters tracking_code; slug already resolved to organizationId in step 2 above
        v
[getComplaintByCode(trackingCode, organizationId)]
        |
        | 2a. EITHER: client-side double-check after calling existing get_complaint_by_tracking_code RPC
        |     (compare returned row.organization_id === organizationId, discard if mismatch)
        | 2b. OR (recommended): tightened RPC get_complaint_by_tracking_code(p_code, p_organization_id)
        |     filters server-side: WHERE tracking_code = upper(p_code) AND organization_id = p_organization_id
        v
[complaint found only if both tracking_code AND organization_id match -> shown to reporter]
[messages/attachments for that complaint_id -- RLS must also confirm organization_id match, see Pitfall 3]
```

### Recommended Project Structure
```
src/
├── pages/
│   ├── ComplaintForm.jsx       # MODIFIED: accept organizationId prop, pass to saveComplaint()
│   └── TrackingPortal.jsx      # MODIFIED: accept organizationId prop, pass to getComplaintByCode()
├── App.jsx                     # MODIFIED: PublicApp reads :slug via useParams, resolves org before rendering children;
│                                #           route changes /canal -> /canal/:slug
├── lib/
│   └── supabase.js             # MODIFIED: saveComplaint() sets organization_id on insert;
│                                #           getComplaintByCode() takes + forwards organizationId;
│                                #           NEW: getOrganizationBySlug(slug) wrapper around the RPC
└── translations.js             # MODIFIED: add "channel not found" / "organització no trobada" strings (ca/es/en)

supabase/
└── migrations/
    └── 007_org_scoped_public_channel.sql   # NEW: tighten get_complaint_by_tracking_code signature
                                              #      (+ optional: scope attachments/messages RLS, see Pitfall 3)
```

### Pattern 1: Slug resolution gate before rendering the form (client-side "org guard")
**What:** A wrapper component reads `:slug` from the URL, calls the existing RPC once, and only renders `ComplaintForm`/`TrackingPortal` if the slug resolves; otherwise shows a translated "not found" state. Mirrors the existing `AdminGuard` pattern in `App.jsx` (loading -> null, resolved -> render children or redirect).
**When to use:** Any time a route segment must be validated against the database before the page body can render.
**Example:**
```jsx
// Source: pattern derived from src/App.jsx AdminGuard (existing loading/redirect convention)
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getOrganizationBySlug } from '../lib/supabase.js';

function PublicApp() {
  const { slug } = useParams();
  const [org, setOrg] = useState(undefined); // undefined = loading, null = not found, object = found

  useEffect(() => {
    let cancelled = false;
    getOrganizationBySlug(slug).then(({ organization }) => {
      if (!cancelled) setOrg(organization ?? null);
    });
    return () => { cancelled = true; };
  }, [slug]);

  if (org === undefined) return null; // or a spinner
  if (org === null) return <ChannelNotFound />; // NEW component/state, ca/es/en
  // ...existing PublicApp body, passing org.id down as organizationId
}
```

### Pattern 2: RPC-side double-filtering instead of client-side trust
**What:** Extend `get_complaint_by_tracking_code` to accept `p_organization_id` and filter `WHERE tracking_code = upper(p_code) AND organization_id = p_organization_id` server-side, rather than fetching by code alone and checking `organization_id` in JavaScript afterward.
**When to use:** Whenever a public RPC result must be scoped to a tenant the caller has already proven context for (here: the slug they navigated to). Filtering server-side means a forgotten/buggy client-side check can never leak data — the database itself returns zero rows for a mismatched org.
**Example:**
```sql
-- Source: derived from supabase/migrations/005_multitenant_foundation.sql (existing get_complaint_by_tracking_code)
create or replace function get_complaint_by_tracking_code(p_code text, p_organization_id uuid)
returns table (
  id uuid, tracking_code text, status text, category text,
  organization_id uuid, created_at timestamptz, updated_at timestamptz
) as $$
  select id, tracking_code, status, category, organization_id, created_at, updated_at
  from complaints
  where tracking_code = upper(p_code)
    and organization_id = p_organization_id;
$$ language sql security definer stable;
```
Note: this is a **breaking signature change** (adds a required second parameter) — `supabase.rpc()` calls everywhere this RPC is used must be updated in the same plan. `create or replace function` with a different parameter list in Postgres creates a NEW overloaded function rather than truly replacing the old one if argument types/count differ — the migration should `drop function if exists get_complaint_by_tracking_code(text);` first to avoid leaving the old 1-arg overload callable. [CITED: postgresql.org/docs/current/sql-createfunction.html — "CREATE OR REPLACE FUNCTION... does not allow changing... an existing function's parameter types"; changing the count creates a distinct overloaded function unless the old one is dropped]

### Pattern 3: RLS EXISTS-join for child tables (messages/attachments) lacking their own organization_id column
**What:** Rather than adding an `organization_id` column to `attachments`/`messages` (a schema change + backfill that migration 005 deliberately avoided for `complaints`' children), scope their RLS policies via an `exists (select 1 from complaints where complaints.id = messages.complaint_id and complaints.organization_id = ...)` join — same idea already used implicitly by `current_org_id()` for authenticated tables.
**When to use:** Child tables that reference a parent already carrying the tenant key, where adding a redundant column is unnecessary schema churn.
**Example:**
```sql
-- Source: pattern derived from migration 005's current_org_id()/org_select_complaints,
-- adapted for anonymous (non-authenticated) reporter access to their OWN complaint's messages.
-- Anonymous callers have no current_org_id() (no profile), so this must check against
-- the complaint row directly, not the authenticated-user pattern.

drop policy if exists "allow_insert_messages" on messages;
drop policy if exists "allow_select_messages" on messages;

-- Reporter (anonymous) can insert/read messages only for a complaint that exists
-- and has an organization_id (i.e., was created post-Phase-1) - this does NOT
-- re-verify slug match because the reporter only ever has complaint_id from their
-- own successful submission/tracking lookup, already org-scoped at that point.
create policy "public_insert_messages" on messages
  for insert with check (
    exists (select 1 from complaints where complaints.id = messages.complaint_id)
  );

create policy "public_select_messages" on messages
  for select using (
    exists (select 1 from complaints where complaints.id = messages.complaint_id)
  );
```
**Important caveat:** this pattern does not by itself prevent a reporter from one org reading messages on another org's complaint if they somehow obtain that complaint's UUID (the UUID itself, not the org boundary, is the secret here — same as today). It only restores the *intent* of "messages belong to a complaint that exists" without widening scope. True per-tenant isolation for messages would additionally require either (a) an `organization_id` column on `messages`/`attachments` with the same join pattern used for `complaints`, or (b) accepting that the existing security model already relies on `complaint_id` UUIDs being unguessable bearer tokens (consistent with how `tracking_code` already works for reporters). See Pitfall 3 and Open Question 2 for the planner to decide scope here — **this is flagged as optional hardening, not a hard blocker for PUBLIC-02/PUBLIC-03**, since those two requirements are about the form and tracking-code lookup, not messages.

### Anti-Patterns to Avoid
- **Trusting a client-supplied `organization_id` on insert without resolving it from the slug server-side first:** The current `public_insert_complaints` policy only checks `organization_id is not null` — it does NOT verify the id corresponds to a real `organizations` row. If `ComplaintForm` is wired to accept any caller-controlled value (e.g., a stale prop, a manually-crafted POST), a complaint could be inserted with a `organization_id` belonging to no one or, worse, a guessed UUID belonging to another tenant. **Mitigation:** always resolve `organization_id` from the URL slug via `get_organization_by_slug` immediately before render, never from user-editable form state, and treat it as read-only context passed down as a prop.
- **Keeping `/canal` (no slug) as a fallback "default org" form:** There is no "default org" concept in this multi-tenant schema — every complaint requires a real `organization_id`. A bare `/canal` should 404/redirect, not silently submit to some arbitrarily chosen organization.
- **Re-querying `organizations` table directly from the client instead of the RPC:** Even with a `select` filter on slug, RLS today only allows `id = current_org_id()` (i.e., authenticated users reading their OWN org) — an anonymous caller gets zero rows from a direct table query. The RPC is the only viable path and is SECURITY DEFINER specifically to bypass this for the public use case. Do not attempt to "fix" this by adding an anon SELECT policy on `organizations` — that would expose every org's name/slug to enumeration.
- **Editing the existing `get_organization_by_slug`/`get_complaint_by_tracking_code` functions' return shape without checking all call sites:** Both are new-in-Phase-1 RPCs not yet called from any frontend code (grep confirms `supabase.js` has zero `supabase.rpc(` calls today) — so there is no existing caller to break for `get_organization_by_slug`, but `get_complaint_by_tracking_code` likewise has no existing caller either (the current `getComplaintByCode()` does a direct `.from('complaints').select(...)` query, NOT the RPC). This means **both RPCs are currently unused dead code** from the frontend's perspective — Phase 3 is what wires them up for the first time. Treat the existing RPC definitions as a starting contract to adapt (per Pattern 2), not a frozen API with live callers elsewhere.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slug → org_id lookup under RLS | A new permissive SELECT policy on `organizations`, or client-side filtering after fetching all orgs | Existing `get_organization_by_slug(p_slug)` SECURITY DEFINER RPC (migration 005) | Already built, already correctly scoped (returns at most one row, no enumeration), zero new SQL needed for this specific lookup |
| Tracking-code lookup scoped to org | Fetch all complaints with that code across all orgs and filter in JS, or add a `slug` column to `complaints` | Tightened `get_complaint_by_tracking_code(p_code, p_organization_id)` RPC filtering server-side (Pattern 2) | `tracking_code` is already globally unique (migration 001 `unique not null`) so no collision exists today, but server-side filtering by both fields is the correct defense-in-depth shape for PUBLIC-03 and avoids ever returning a row whose org doesn't match context |
| Per-org category customization | A `categories` table + per-org admin UI to manage it | Nothing — out of scope per REQUIREMENTS.md and CLAUDE.md ("Categories globals i fixes, no per organització"); categories remain the hardcoded array in `translations.js` | Confirmed: no `categories` table exists in any migration; this is a deliberate, already-locked v1 decision, not a gap to fill |

**Key insight:** Almost everything this phase needs at the database layer was already built in Phase 1 in anticipation of this exact phase (the migration 005 comment literally says "Les polítiques públiques d'inserció anònima i lectura per tracking_code es redefiniran a la Fase 3 amb resolució d'organització per slug"). The work here is primarily **wiring the frontend to use what already exists**, plus one small RPC signature tightening and an optional RLS hardening pass on `attachments`/`messages` that Phase 1 did not cover.

## Common Pitfalls

### Pitfall 1: `organization_id IS NOT NULL` does not mean `organization_id` is a *valid* organization
**What goes wrong:** The existing `public_insert_complaints` policy (`with check (organization_id is not null)`) allows an insert with ANY non-null UUID, including one that doesn't exist in `organizations` at all, or one belonging to a different organization than the slug in the URL implies.
**Why it happens:** Migration 005 added the column and a minimal not-null check, explicitly deferring the "resolve by slug" logic to this phase — it's not a bug, it's an intentionally incomplete placeholder.
**How to avoid:** The frontend must NEVER let `organizationId` come from anywhere except the result of `get_organization_by_slug(slug)` called fresh for the current route — not from a prop default, not from cached state across navigations, not from form data. Optionally (defense-in-depth), add a foreign-key-validating check via a trigger or `references organizations(id)` constraint if not already present — **verify**: migration 005 line 15 (`complaints` `organization_id uuid references organizations(id)`) already has the FK, so an insert with a non-existent org id will fail at the DB level with a foreign-key-violation error, NOT silently succeed. This significantly reduces (but doesn't eliminate — see next sentence) the risk: a *real* org id belonging to a *different* tenant than the slug shown to the user would still pass both the not-null check and the FK constraint. The only protection against that specific case is correct frontend wiring (always re-resolve from the current slug, never trust stale/passed-through state).
**Warning signs:** A complaint appearing under the wrong organization in the admin dashboard despite the reporter having used the correct `/canal/:slug` URL — would indicate the frontend resolved or cached the wrong `organizationId`.

### Pitfall 2: Postgres function overloading when changing an RPC's parameter list
**What goes wrong:** Running `create or replace function get_complaint_by_tracking_code(p_code text, p_organization_id uuid) ...` does NOT replace the existing 1-argument version — Postgres treats different parameter signatures as different functions (overloading). Both the old `get_complaint_by_tracking_code(text)` and the new `get_complaint_by_tracking_code(text, uuid)` would coexist, and any code still calling the 1-arg form (or a `supabase.rpc()` call that omits the second arg) would silently hit the OLD, unscoped version.
**Why it happens:** Function identity in Postgres includes the parameter type signature, not just the name.
**How to avoid:** In the new migration, explicitly `drop function if exists get_complaint_by_tracking_code(text);` before creating the 2-argument version. [CITED: postgresql.org/docs/current/sql-createfunction.html]
**Warning signs:** `supabase.rpc('get_complaint_by_tracking_code', { p_code: code })` (missing `p_organization_id`) succeeds instead of erroring — indicates the old overload is still live.

### Pitfall 3: `attachments` and `messages` RLS were never tightened in migration 005 — pre-existing cross-tenant gap
**What goes wrong:** Both tables still run on their original migration-001 policies: `allow_insert_attachments ... with check (true)`, `allow_insert_messages ... with check (true)`, `allow_select_messages ... using (true)`. Migration 005's comment explicitly defers `complaints`' public policies to Phase 3 but says nothing about these two tables — they were simply not touched. Today, **anyone holding any `complaint_id` UUID from ANY organization can insert/read messages, and insert attachment metadata rows, for that complaint** — bypassing the per-org boundary the rest of this phase is establishing.
**Why it happens:** `attachments`/`messages` reference `complaints` but have no `organization_id` column of their own, and no one has revisited their RLS since the original single-tenant schema.
**How to avoid:** This is not explicitly named in PUBLIC-02/PUBLIC-03's literal text (which talk about the *form* and *tracking-by-code*, not messages), so it is flagged as **recommended hardening within this phase's migration, not a strict blocker** — but leaving it unaddressed means a determined caller could still cross organizational boundaries via the messaging feature even after this phase ships, which somewhat undermines ORG-04's "associated with a specific organization" framing. The planner should decide: (a) include the Pattern 3 RLS tightening in this phase's migration (low effort, no schema change, no client code change needed since reporters always reach messages via a complaint_id they already legitimately have), or (b) explicitly defer to a documented follow-up. Given CLAUDE.md's "no bypassar RLS" directive and that this is a near-zero-cost fix, recommend (a).
**Warning signs:** A penetration test or code review noting `using (true)` / `with check (true)` policies still present on any table after this phase completes.

### Pitfall 4: Tightening `getComplaintByCode` while `saveComplaint` still doesn't set `organization_id` would cause a silent no-op regression
**What goes wrong:** If a plan only updates `getComplaintByCode()` to filter by `organizationId` but forgets to update `saveComplaint()` to actually persist `organization_id` on insert, then either (a) inserts start failing outright (the `public_insert_complaints` `with check (organization_id is not null)` already rejects nulls today — meaning **the current production form is already broken for new submissions** unless something else is setting it, which nothing currently does — see Open Question 3), or (b) if a default/trigger silently back-fills it, lookups would never find a match since the reporter's `organizationId` (from slug) wouldn't equal whatever default was used.
**Why it happens:** The two functions (`saveComplaint`, `getComplaintByCode`) are independently called from two different components (`ComplaintForm`, `TrackingPortal`) and easy to update one without the other.
**How to avoid:** Both changes belong in the same plan/wave — they are two halves of the same requirement (ORG-04). Verify end-to-end manually: submit via `/canal/:slug-A`, then track via the same `/canal/:slug-A`, confirm found; then attempt to track the same code via `/canal/:slug-B` (different org), confirm NOT found.
**Warning signs:** `npm run build` passes but manual E2E submission silently fails with a swallowed DB error (note: `ComplaintForm.jsx`'s current error handling on submit failure shows a **fake fallback tracking code** (`'DEMO-' + random`) instead of surfacing the real error — see Open Question 3, this existing behavior could mask the exact "insert failed because organization_id was null" bug during manual testing).

### Pitfall 5: `npm run db:migrate` vs Supabase CLI — confirm which mechanism actually applies migrations to this project
**What goes wrong:** The repo has both a custom `scripts/migrate.js` (run via `npm run db:migrate`) and the Supabase CLI (`supabase db push --linked`, confirmed used for migration 006 per STATE.md's decision log: "applied to zojrqjmauruishfvgdja via `supabase db push --linked`"). Using the wrong one, or assuming both are kept in sync automatically, risks a migration being "applied" by one tool's bookkeeping but not actually run, or run twice.
**Why it happens:** Two parallel migration-running mechanisms exist in the repo history; STATE.md shows the project settled on the Supabase CLI for at least migration 006, but `package.json`'s `db:migrate` script still exists and could be invoked by habit.
**How to avoid:** Follow Phase 2's precedent — apply the new migration via `supabase db push --linked` (Supabase CLI 2.101.0 is installed and on PATH, confirmed via `supabase --version` during this research) against the `canal-denuncies-saas` project (zojrqjmauruishfvgdja), the same mechanism used for migration 006.
**Warning signs:** A migration file exists in `supabase/migrations/` but `select * from organizations` (or similar smoke test) on the live Supabase project doesn't reflect the expected schema/RLS state.

## Code Examples

### New migration: 007_org_scoped_public_channel.sql (combines Pattern 2 + Pattern 3)
```sql
-- Migració 007: aïllament per organització del canal públic i del seguiment
-- Estreny get_complaint_by_tracking_code() perquè filtri també per organization_id
-- (en lloc de confiar només en la unicitat global de tracking_code), i opcionalment
-- restringeix attachments/messages perquè només siguin accessibles via un complaint_id
-- existent (les polítiques "using (true)" originals de la migració 001 mai es van
-- estrènyer a la migració 005).

-- Cal eliminar explícitament la versió d'1 paràmetre: PostgreSQL tracta funcions amb
-- llistes de paràmetres diferents com a sobrecàrregues independents, no com la mateixa
-- funció — "create or replace" NO substitueix una funció amb una signatura diferent.
drop function if exists get_complaint_by_tracking_code(text);

create or replace function get_complaint_by_tracking_code(p_code text, p_organization_id uuid)
returns table (
  id uuid, tracking_code text, status text, category text,
  organization_id uuid, created_at timestamptz, updated_at timestamptz
) as $$
  select id, tracking_code, status, category, organization_id, created_at, updated_at
  from complaints
  where tracking_code = upper(p_code)
    and organization_id = p_organization_id;
$$ language sql security definer stable;

-- Recomanat (no bloquejant per ORG-04/PUBLIC-02/PUBLIC-03 literalment, però tanca un
-- forat pre-existent no cobert per la migració 005): restringeix attachments/messages
-- a complaint_id existents, en lloc de "using (true)"/"with check (true)" globals.
drop policy if exists "allow_insert_attachments" on attachments;
create policy "public_insert_attachments" on attachments
  for insert with check (
    exists (select 1 from complaints where complaints.id = attachments.complaint_id)
  );

drop policy if exists "allow_insert_messages" on messages;
create policy "public_insert_messages" on messages
  for insert with check (
    exists (select 1 from complaints where complaints.id = messages.complaint_id)
  );

drop policy if exists "allow_select_messages" on messages;
create policy "public_select_messages" on messages
  for select using (
    exists (select 1 from complaints where complaints.id = messages.complaint_id)
  );
```

### supabase.js changes
```javascript
// NEW: resolve a slug to an organization (or null if not found)
export async function getOrganizationBySlug(slug) {
  const { data, error } = await supabase.rpc('get_organization_by_slug', { p_slug: slug });
  return { organization: data?.[0] ?? null, error };
}

// MODIFIED: saveComplaint now requires organizationId and sets it on insert
export async function saveComplaint({ formData, files, organizationId }) {
  const trackingCode = generateTrackingCode();

  const { data: complaint, error: dbError } = await supabase
    .from('complaints')
    .insert({
      organization_id: organizationId, // NEW — resolved from slug by the caller, never user input
      tracking_code:   trackingCode,
      is_anonymous:    formData.isAnonymous,
      reporter_name:   formData.isAnonymous ? null : formData.name  || null,
      reporter_email:  formData.isAnonymous ? null : formData.email || null,
      reporter_phone:  formData.isAnonymous ? null : formData.phone || null,
      category:        formData.category,
      department:      formData.department  || null,
      description:     formData.description,
      incident_date:   formData.incidentDate || null,
      involved_people: formData.involvedPeople || null,
      language:        formData.language ?? 'ca',
      status:          'received',
      priority:        'normal',
    })
    .select()
    .single();
  // ... rest unchanged (attachments/audit_logs upload loop)
}

// MODIFIED: getComplaintByCode now requires organizationId, uses the tightened RPC
export async function getComplaintByCode(trackingCode, organizationId) {
  const { data, error } = await supabase.rpc('get_complaint_by_tracking_code', {
    p_code: trackingCode.toUpperCase(),
    p_organization_id: organizationId,
  });
  return { complaint: data?.[0] ?? null, error };
}
```

### App.jsx routing change
```jsx
// Source: pattern derived from existing AdminGuard (loading/redirect convention)
// REMOVE: <Route path="/canal" element={<PublicApp />} />
// ADD:
<Route path="/canal/:slug" element={<PublicApp />} />
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `/canal` org-agnostic form, `getComplaintByCode()` does a bare unscoped `.from('complaints')` query | `/canal/:slug` resolves org via existing RPC; tracking lookup also RPC-based and org-filtered | This phase (Phase 3) | `getComplaintByCode()` switches from a direct table SELECT to an RPC call — confirm RLS on `complaints` (the `org_select_complaints` policy, scoped to `current_org_id()`) would otherwise have BLOCKED the current direct-table-select approach for an anonymous caller entirely once migration 005's policies are live; the SECURITY DEFINER RPC is the only path that still works for anonymous tracking lookups post-Phase-1. **This means the current `getComplaintByCode()` implementation is very likely already broken in production-equivalent terms on Plataforma 2** — see Open Question 3. |

**Deprecated/outdated:** The direct `.from('complaints').select(...)` pattern in the current `getComplaintByCode()` for anonymous callers is obsolete the moment migration 005's `org_select_complaints` policy (scoped to `current_org_id()`, which is `null` for anonymous callers) is the only SELECT policy on `complaints` — confirmed by reading migration 005 lines 71-83, which drop the old `allow_select_by_tracking_code using (true)` policy and do NOT replace it with any new public SELECT policy on the table itself, relying entirely on the `get_complaint_by_tracking_code` RPC instead.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The bare `/canal` route should be fully replaced by `/canal/:slug`, with no org-less fallback, since Plataforma 2 has no concept of a default organization | Standard Stack (Alternatives Considered), Architecture | If the user actually wants `/canal` to redirect somewhere (e.g., to the landing page or a "which company?" search) rather than simply ceasing to exist, an extra small UX task is needed — low risk, easy to add a catch-all redirect in `App.jsx`'s existing `<Route path="*" element={<Navigate to="/" replace />} />` pattern |
| A2 | Including the `attachments`/`messages` RLS tightening (Pitfall 3) in THIS phase's migration is the right call, rather than deferring it to a separate security-hardening phase | Pitfall 3, Code Examples | If deferred, ORG-04 ships with a known (documented) cross-tenant gap in the messaging feature; if included, this phase's scope grows slightly beyond the literal text of PUBLIC-02/PUBLIC-03. Recommend including it since the fix is small and the gap is real, but flagging as the planner's call to make explicitly rather than silently expanding scope |
| A3 | `getComplaintByCode()`'s current direct-table-select implementation is non-functional today under migration 005's RLS (i.e., this is an existing bug this phase happens to fix, not something this phase risks "breaking") | State of the Art, Open Question 3 | If somehow still working today (e.g., if migration 005 was not yet applied to the live `zojrqjmauruishfvgdja` project, or if a leftover permissive policy still exists that this research didn't surface), the planner should verify current production behavior before assuming "this was already broken" — verify via a live manual test or by querying `pg_policies` on the actual Supabase project before writing the plan |

**If this table is empty:** N/A — see entries above.

## Open Questions

1. **Should `/canal` (no slug) continue to exist in any form, e.g. as a redirect?**
   - What we know: `public_insert_complaints` already requires `organization_id is not null`, so a bare `/canal` submission fails today regardless of routing; Phase 2's signup flow gives every org a slug-based link.
   - What's unclear: Whether removing the route entirely (falling through to the catch-all `*` → `/` redirect) is acceptable UX, or whether a friendlier "search for your company" / "this link needs a company slug" message is wanted at the bare `/canal` path specifically.
   - Recommendation: Default to removing `/canal` and letting the existing catch-all handle it (simplest, matches "no default org" reality). If the user wants a friendlier intermediate page, that's a small additive task, not a blocker.

2. **How far should `attachments`/`messages` tenant isolation go in this phase — RLS-only tightening (Pattern 3) or a full `organization_id` column addition?**
   - What we know: Neither table has an `organization_id` column; Pattern 3's EXISTS-join approach restores "must reference a real complaint" without a schema change; it does NOT add true column-level tenant scoping.
   - What's unclear: Whether the business considers "must hold a real complaint_id UUID" sufficient isolation for messages (mirroring how tracking_code already works as a bearer secret) or whether a stricter, column-based join to `organization_id` is wanted for defense-in-depth given this is a legal whistleblowing product.
   - Recommendation: Pattern 3 (EXISTS-join, no schema change) is proportionate for this phase and consistent with the existing security model (complaint_id/tracking_code as unguessable bearer tokens). A full `organization_id` column on `attachments`/`messages` would be a reasonable v1.1 hardening but is not required to satisfy ORG-04/PUBLIC-02/PUBLIC-03's literal text — flag for discuss-phase if the user wants to lock in a stricter posture now.

3. **Is the current `getComplaintByCode()` implementation (direct `.from('complaints').select(...)`) actually already failing in the live Plataforma 2 Supabase project (zojrqjmauruishfvgdja), confirming it's dead/broken code this phase fixes rather than working code this phase risks regressing?**
   - What we know: Reading migration 005's SQL shows no anon-accessible SELECT policy remains on `complaints` after it runs (only `org_select_complaints` scoped to `current_org_id()`, which is null for anonymous callers) — so a direct anonymous SELECT should return zero rows / a permission-denied-shaped empty result.
   - What's unclear: Whether migration 005 has actually been pushed to the live `zojrqjmauruishfvgdja` project (STATE.md confirms migration 005 was part of Phase 1, marked complete, and migration 006 was separately confirmed pushed via `supabase db push --linked` — strongly implying 005 is live too, but this research did not have direct Supabase dashboard/MCP access to query `pg_policies` and confirm with certainty).
   - Recommendation: Before writing the plan, do a quick live check (`supabase db diff --linked` or a manual SQL query via the dashboard/CLI against zojrqjmauruishfvgdja) confirming `complaints` has no `using (true)`-style SELECT policy currently live. If confirmed, this phase's `getComplaintByCode` rewrite is a straightforward bug fix rather than a behavior change requiring extra caution.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | Applying migration 007 to `canal-denuncies-saas` (zojrqjmauruishfvgdja) | Yes | 2.101.0 [VERIFIED: `supabase --version`] | — |
| Node.js | Build/dev scripts (`npm run build`, `npm run dev`) | Yes | v24.15.0 [VERIFIED: `node --version`] | — |
| npm | Dependency install/verification | Yes | 11.12.1 [VERIFIED: `npm --version`] | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Project Constraints (from CLAUDE.md)

- **Sempre tres idiomes**: any new UI text (e.g., "channel not found" state for an unresolvable slug) must be added to `src/translations.js` for ca, es, AND en — never hardcoded in JSX in a single language.
- **Canvis de BD sempre amb migració**: the RPC signature change (`get_complaint_by_tracking_code`) and any RLS policy changes (`attachments`/`messages`) must go in a new numbered migration file (`007_...sql`), never applied ad hoc via the Supabase dashboard.
- **JavaScript, no TypeScript**: all new/modified files (`App.jsx`, `ComplaintForm.jsx`, `TrackingPortal.jsx`, `supabase.js`) remain `.jsx`/`.js`.
- **No bypassar RLS**: the slug-resolution and tracking-lookup mechanisms must continue using SECURITY DEFINER RPCs with minimal, purpose-built return shapes (as already established in migration 005) — never add a service-role client or a permissive `using (true)` policy to "simplify" the public channel.
- **Totes les crides a BD passen per `src/lib/supabase.js`**: the new `getOrganizationBySlug()` wrapper and modifications to `saveComplaint()`/`getComplaintByCode()` must live in `src/lib/supabase.js`; `App.jsx`/`ComplaintForm.jsx`/`TrackingPortal.jsx` must call these wrappers, never `supabase.rpc()` or `supabase.from()` directly.
- **Anonymous identity must never be discoverable by managers**: confirmed — adding `organization_id` to the complaints insert payload does not touch `reporter_name`/`reporter_email`/`reporter_phone` (still null when `is_anonymous`), and `organization_id` only identifies which COMPANY a complaint belongs to, not who filed it. No new deanonymization vector is introduced by this phase.
- **Separate branch/Supabase project**: all migration and code changes apply only to the `saas-multitenant` branch and the `canal-denuncies-saas` (zojrqjmauruishfvgdja) Supabase project — Plataforma 1 (Reportia, main branch, separate Supabase project) is untouched by anything in this research.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no `vitest`/`jest` config, no test files, no `test` script in `package.json` (consistent with Phase 2's research findings) |
| Config file | none |
| Quick run command | none — manual verification only |
| Full suite command | none |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PUBLIC-02 | `/canal/:slug` resolves a real org and renders the form; an invalid/unknown slug shows "not found" | manual-only | Visit `/canal/<real-slug>` and `/canal/does-not-exist` in browser, visually confirm both states | N/A — no test infra |
| ORG-04 | Submitting the form at `/canal/:slug-A` creates a `complaints` row with `organization_id` matching org A | manual-only (SQL verification) | `select organization_id, tracking_code from complaints order by created_at desc limit 1;` via Supabase SQL editor, compare to org A's id | N/A — no test infra |
| PUBLIC-03 | Tracking a code from org A's portal succeeds; the SAME code is not found when looked up via org B's portal/slug | manual-only | Submit at `/canal/:slug-A`, get code, track it at `/canal/:slug-A` (found) and at `/canal/:slug-B` (not found) | N/A — no test infra |

**Justification for manual-only:** Identical situation to Phase 2 — zero test framework exists in this repo (`package.json` has no `test` script, no `*.test.*` files anywhere outside `node_modules`), and introducing one is out of scope for this phase per REQUIREMENTS.md. All v1.0 success criteria in ROADMAP.md are phrased as manually-verifiable end states.

### Sampling Rate
- **Per task commit:** Manual smoke test in dev (`npm run dev`) — visit `/canal/:slug` for a known org, submit a test complaint, confirm tracking code returned (not a `DEMO-` fallback — see Pitfall 4's note on the existing error-swallowing behavior in `ComplaintForm.jsx`).
- **Per wave merge:** Full two-organization cross-check: create or use two existing orgs (e.g., via `/crear-compte` twice), submit a complaint to each, confirm tracking by code only succeeds for the matching org's slug and fails for the other's.
- **Phase gate:** All 3 success criteria (ROADMAP.md Phase 3) manually verified before `/gsd:verify-work`, including the explicit cross-org negative test (org B cannot track org A's code).

### Wave 0 Gaps
None — no test infrastructure exists and none is being introduced, consistent with the rest of this milestone.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Public channel is intentionally unauthenticated by design (anonymous/identified reporter choice, not a login) |
| V3 Session Management | no | No session created for public submissions; tracking is via a bearer code (`tracking_code`), not a session token |
| V4 Access Control | yes | RLS is the sole access-control mechanism for the public channel — `public_insert_complaints` (organization_id not null), `org_select_complaints` (authenticated, own org only), and the two SECURITY DEFINER RPCs (`get_organization_by_slug`, `get_complaint_by_tracking_code`) are the complete access-control surface for this phase |
| V5 Input Validation | yes | `:slug` from the URL is passed as a parameterized RPC argument (`p_slug`), never interpolated into SQL — Supabase's `rpc()` client uses parameterized calls, not string concatenation, eliminating SQL injection risk by construction |
| V6 Cryptography | no | No new cryptographic operations — `tracking_code` generation (existing `generateTrackingCode()` using `Math.random()`) is unchanged by this phase and out of scope here |

### Known Threat Patterns for {Supabase RLS + React public multi-tenant routing}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Slug enumeration to discover organization names via repeated `/canal/<guess>` requests | Information Disclosure | `get_organization_by_slug` already returns only `id, name, slug` for an exact match, nothing for a miss — no way to enumerate beyond brute-forcing exact slugs, and slugs are not secrets (Phase 4 plans to display them as shareable public links per ADMIN-02) — acceptable, no additional mitigation needed |
| Cross-tenant complaint insertion via a forged/stale `organization_id` not matching the visited slug | Tampering / Elevation of Privilege | Mitigated by Pitfall 1's guidance: always re-resolve `organization_id` from the current route's slug immediately before render, never accept it from form state or cached props; the existing FK constraint on `complaints.organization_id` additionally guarantees the value refers to a real org (just not necessarily the "correct" one without correct frontend wiring) |
| Cross-tenant message/attachment access via complaint_id UUID guessing or leakage | Information Disclosure / Tampering | Existing mitigation: UUIDs are not practically guessable (122 bits of randomness); Pattern 3's RLS tightening additionally ensures these policies require the referenced complaint to exist at all (closing the literal `using (true)` gap), though full per-tenant column-level scoping is flagged as optional (Open Question 2) |
| RPC signature confusion after this phase's migration (old 1-arg `get_complaint_by_tracking_code` still callable) | Tampering (bypass of new org filter) | Mitigated by Pitfall 2's explicit `drop function if exists ...(text);` before creating the 2-arg version — must be included in the migration, not optional |

## Sources

### Primary (HIGH confidence)
- Codebase: `supabase/migrations/001_initial_schema.sql` through `006_org_signup.sql` — direct inspection confirming `tracking_code` global uniqueness, `organizations`/`organization_id`/RLS state, and the exact, unmodified state of `attachments`/`messages` policies since migration 001
- Codebase: `src/App.jsx`, `src/pages/ComplaintForm.jsx`, `src/pages/TrackingPortal.jsx`, `src/lib/supabase.js`, `src/translations.js` — direct inspection of current implementation and exact gaps
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md` — locked v1.0 scope, phase success criteria, and decision history (categories global/fixed, slug-based routing chosen over subdomains)
- `npm view react-router-dom version` / `npm view @supabase/supabase-js version` — confirmed current versions against already-pinned `package.json` ranges [VERIFIED: npm registry]
- `supabase --version` / `node --version` / `npm --version` — confirmed local environment availability for applying the new migration

### Secondary (MEDIUM confidence)
- postgresql.org/docs/current/sql-createfunction.html — function-overloading-by-signature behavior, used to justify the explicit `drop function` step in Pattern 2/Pitfall 2 [CITED]

### Tertiary (LOW confidence)
- Whether migration 005's RLS changes are confirmed *live* on the production `zojrqjmauruishfvgdja` Supabase project at research time (vs. only present in the migration file) — could not be verified without direct dashboard/MCP database access; flagged as Open Question 3

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; both libraries' versions verified directly via `npm view` against already-installed ranges
- Architecture: HIGH — every claim about existing RLS policies, RPCs, and table schemas is from direct file inspection of the actual migration SQL in this repository, not inference
- Pitfalls: HIGH for Pitfalls 1, 2, 4, 5 (derived from direct code/SQL reading); MEDIUM for Pitfall 3's exact severity assessment (the gap is real and directly observed in the SQL, but how much it matters is a scope judgment, not a technical fact)

**Research date:** 2026-06-29
**Valid until:** 30 days (stable Postgres/Supabase/React Router APIs; no fast-moving dependencies; main risk to validity is if migration 005's live deployment state changes or Phase 2's wave 2/3 work alters assumptions documented here)
