# Supply Chain Risk Report — `denuncies`

**Scanned:** `/Users/davidgiljaques/Documents/GitHub/denuncies`  
**Commit:** `d2a8840b6bfd`  
**Manifests read:** `package.json`, `package-lock.json`  
**Scanned at:** 2026-10-21T08:28:52+00:00  
**Direct dependencies:** 15 (npm 15)

## Summary

- **1 of 15 dependencies have known advisories.** See the findings below.
- **9 transitive packages carry known advisories** at the locked versions — see Transitive advisories.
- 4 of 15 dependencies carry at least one finding, 3 of which reach production.
- Weakest coverage: **Publisher concentration**, established for 3 of 15; the Coverage section lists every criterion.

## Production dependencies

11 dependencies are declared as runtime dependencies and ship in the built artifact. Advisory status is given for every one, clean or not.

| Dependency | Version | Advisories | Other findings |
|---|---|---|---|
| `@fontsource-variable/manrope` | 5.3.0 | none known | — |
| `@sentry/react` | 10.53.1 | none known | — |
| `@supabase/supabase-js` | 2.105.4 | none known | — |
| `exceljs` | 4.4.0 | none known | — |
| `jspdf` | 4.2.1 | none known | Publisher concentration |
| `jspdf-autotable` | 5.0.8 | none known | — |
| `lucide-react` | 1.14.0 | none known | — |
| `qrcode` | 1.5.4 | none known | Maintenance activity |
| `react` | 18.3.1 | none known | — |
| `react-dom` | 18.3.1 | none known | — |
| `react-router-dom` | 7.18.1 | none known | — |

## Findings

### Reaches production

| Dependency | Version | Weekly downloads | Findings |
|---|---|---|---|
| `jspdf` | 4.2.1 | 9,412,068/wk | single human publisher (mrjameshall) of 1 listed |
| `qrcode` | 1.5.4 | 18,476,870/wk | no push in 2 years (last 2024-08-23) |

### Build-time only

Declared as development dependencies. A compromise here reaches build and CI hosts rather than users of the shipped artifact.

| Dependency | Version | Weekly downloads | Findings |
|---|---|---|---|
| `vite` | 5.4.21 | 119,005,168/wk | 6 advisories affect the installed 5.4.21 |

## Upstream repository and CI hygiene — OpenSSF Scorecard

These criteria describe each dependency's own repository, not the audited
project. Remediation, where any exists, is upstream.

### Reaches production

| Dependency | Version | Weekly downloads | Findings |
|---|---|---|---|
| `@sentry/react` | 10.53.1 | 16,930,954/wk | Binary-Artifacts scores 8/10 (below 10) |

### Build-time only

Declared as development dependencies. A compromise here reaches build and CI hosts rather than users of the shipped artifact.

| Dependency | Version | Weekly downloads | Findings |
|---|---|---|---|
| `vite` | 5.4.21 | 119,005,168/wk | Binary-Artifacts scores 1/10 (below 10) |

## Transitive advisories

9 packages of the 255 registry-verified packages beyond the direct set (resolved by `package-lock.json`) carry known advisories at the locked versions. Only advisories were checked at this depth.

| Package | Version | Reaches | Advisories |
|---|---|---|---|
| `brace-expansion` (npm) | 1.1.16 | production | GHSA-6j4f-fj2g-mc7p, GHSA-mh99-v99m-4gvg, GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7, GHSA-rgw5-rvv9-x895 |
| `brace-expansion` (npm) | 2.1.2 | production | GHSA-6j4f-fj2g-mc7p, GHSA-mh99-v99m-4gvg, GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7, GHSA-rgw5-rvv9-x895 |
| `dompurify` (npm) | 3.4.12 | production | GHSA-55q2-fjhq-7xh7, GHSA-6688-9rhm-gjv2 |
| `esbuild` (npm) | 0.21.5 | build-time only | GHSA-67mh-4wv8-2f99 |
| `nanoid` (npm) | 3.3.16 | build-time only | GHSA-2v37-7h3g-55p8 |
| `postcss` (npm) | 8.5.22 | build-time only | GHSA-fxqj-rqcc-2cmp |
| `react-router` (npm) | 7.18.1 | production | GHSA-qwww-vcr4-c8h2 |
| `source-map-js` (npm) | 1.2.1 | build-time only | GHSA-68fv-2mgg-jv7q |
| `uuid` (npm) | 8.3.2 | production | GHSA-w5hq-g745-h8pq |

## Informational

Measured, not flagged.

- **CI token permissions**: median 0/10 across 8 scored dependencies; 5 score below 6. Not flagged — this measures whether CI workflows declare least-privilege tokens, which tracks project maturity rather than the likelihood of malicious code being published.
- **Changes reviewed by a second person**: median 7/10 across 9 scored dependencies; 4 score below 6. Not flagged — this measures the share of recent commits reviewed by a second person, which is low for most small single-maintainer projects and largely restates publisher concentration.
- **Publish provenance**: 11 of 15 publish with build provenance.
  Without: `@sentry/react`, `exceljs`, `jspdf`, `qrcode`
- **Security policy published**: 9 of 15 publish a security policy.
  Without: `@electric-sql/pglite`, `@fontsource-variable/manrope`, `@fontsource/manrope`, `exceljs`, `lucide-react`, `qrcode`
- **Download volume**: established for 15 of 15; median 18,476,870/week. Lowest: `@fontsource/manrope` (352,978/wk), `@fontsource-variable/manrope` (587,458/wk), `jspdf-autotable` (2,609,896/wk).

## Coverage

What was and was not measured, per criterion.

| Criterion | Tier | Assessed | Flagged | Not assessable |
|---|---|---|---|---|
| Known advisories | A | 15/15 | 1 | 0 |
| Deprecated or yanked | A | 15/15 | 0 | 0 |
| Repository archived | A | 15/15 | 0 | 0 |
| Maintenance activity | A | 15/15 | 1 | 0 |
| Publisher concentration | B | 3/15 | 1 | 12 |
| Install-time script execution | B | 15/15 | 0 | 0 |
| Dangerous CI workflow | scorecard | 8/15 | 0 | 7 |
| CI token permissions | scorecard | 8/15 | 0 | 7 |
| Checked-in binaries | scorecard | 9/15 | 2 | 6 |
| Changes reviewed by a second person | scorecard | 9/15 | 0 | 6 |
| Publish provenance | info | 15/15 | 0 | 0 |
| Security policy published | info | 15/15 | 0 | 0 |
| Download volume | info | 15/15 | 0 | 0 |

## Not assessable

**Checked-in binaries**

- 6 dependencies — OpenSSF Scorecard has no report for this repository: `@electric-sql/pglite`, `@fontsource-variable/manrope`, `@fontsource/manrope`, `jspdf`, `react`, `react-dom`

**Changes reviewed by a second person**

- 6 dependencies — OpenSSF Scorecard has no report for this repository: `@electric-sql/pglite`, `@fontsource-variable/manrope`, `@fontsource/manrope`, `jspdf`, `react`, `react-dom`

**Dangerous CI workflow**

- 6 dependencies — OpenSSF Scorecard has no report for this repository: `@electric-sql/pglite`, `@fontsource-variable/manrope`, `@fontsource/manrope`, `jspdf`, `react`, `react-dom`
- 1 dependency — Scorecard could not evaluate Dangerous-Workflow (score -1): `qrcode`

**Publisher concentration**

- 11 dependencies — publishes from CI with provenance, so the effective publisher set is whoever can merge to the release branch — not externally observable: `@electric-sql/pglite`, `@fontsource-variable/manrope`, `@fontsource/manrope`, `@supabase/supabase-js`, `@vitejs/plugin-react`, `jspdf-autotable` and 5 more
- 1 dependency — every listed maintainer looks automated; the human population is unknown: `@sentry/react`

**CI token permissions**

- 6 dependencies — OpenSSF Scorecard has no report for this repository: `@electric-sql/pglite`, `@fontsource-variable/manrope`, `@fontsource/manrope`, `jspdf`, `react`, `react-dom`
- 1 dependency — Scorecard could not evaluate Token-Permissions (score -1): `qrcode`

## Method and caveats

- gh is not authenticated. GitHub allows 60 requests/hour unauthenticated against 5000 authenticated, so repository signals may be unassessable.
- Repository-level criteria (archived, maintenance activity, security policy, and the Scorecard checks) describe the source repository rather than the package. 15 dependencies resolve to 13 distinct repositories, so one repository can appear as several findings. Shared: github.com/fontsource/font-files, github.com/react/react
- Optional tooling detected: npm, osv-scanner. Not installed, so not used: bundler-audit, cargo-audit, pip-audit.
- Every criterion except advisories applies to direct dependencies only. The 255 registry-verified packages resolved by package-lock.json were checked for known advisories at their locked versions, and for nothing else.
- HTTP sources: 62 fetched, 25 served from cache (oldest 0.0h old), 0 refetched as stale, 0 unavailable offline, 0 errors.
