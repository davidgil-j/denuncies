---
phase: 3
slug: canal-p-blic-per-organitzaci
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-29
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected — no vitest/jest config, no test files, no `test` script in `package.json` (consistent with Phase 2) |
| **Config file** | none |
| **Quick run command** | none — manual verification only |
| **Full suite command** | none — manual verification only |
| **Estimated runtime** | N/A |

---

## Sampling Rate

- **After every task commit:** Manual smoke test in dev (`npm run dev`) — visit `/canal/:slug` for a known org, submit a test complaint, confirm a real tracking code is returned (not a `DEMO-` fallback).
- **After every plan wave:** Full two-organization cross-check — submit a complaint to each of two orgs, confirm tracking by code only succeeds for the matching org's slug and fails for the other's.
- **Before `/gsd:verify-work`:** All 3 phase success criteria (ROADMAP.md Phase 3) manually verified, including the explicit cross-org negative test.
- **Max feedback latency:** N/A (manual-only, no automated suite to bound).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-xx | 01 | 1 | PUBLIC-02 | T-03-01 | `/canal/:slug` resolves a real org and renders the form; unknown slug shows "not found" | manual | Visit `/canal/<real-slug>` and `/canal/does-not-exist` | ❌ W0 | ⬜ pending |
| 03-01-xx | 01 | 1 | ORG-04 | T-03-02 | Submitting at `/canal/:slug-A` creates a `complaints` row with `organization_id` = org A's id | manual (SQL) | `select organization_id, tracking_code from complaints order by created_at desc limit 1;` | ❌ W0 | ⬜ pending |
| 03-01-xx | 01 | 1 | PUBLIC-03 | T-03-03 | Tracking a code from org A succeeds at A's slug, fails at org B's slug | manual | Submit at A, track at A (found) and at B (not found) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements at the "manual-only" tier — no automated test framework exists in this repo and introducing one is out of scope for this phase (same precedent as Phase 2).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Slug resolves to org, unknown slug shows "not found" | PUBLIC-02 | No test framework; requires live Supabase RPC + browser render | Visit `/canal/<real-slug>` (form renders) and `/canal/does-not-exist` (not-found state, ca/es/en) |
| Complaint insert carries correct `organization_id` | ORG-04 | Requires live DB write + SQL read against `canal-denuncies-saas` (zojrqjmauruishfvgdja) | Submit a test complaint at a known org's `/canal/:slug`, then query `complaints` via Supabase SQL editor and confirm `organization_id` matches |
| Cross-org tracking isolation | PUBLIC-03 | Requires two live orgs + two live submissions to prove negative case | Submit at org A, get tracking code, look it up at org A's portal (found) and org B's portal (not found) |

---

## Validation Sign-Off

- [x] All tasks have `<manual>` verify steps (no automated framework exists project-wide)
- [x] Sampling continuity: manual smoke test after every task commit
- [x] Wave 0 covers all MISSING references (none — manual-only confirmed sufficient, same as Phase 2 precedent)
- [x] No watch-mode flags
- [x] Feedback latency: N/A (manual-only)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
