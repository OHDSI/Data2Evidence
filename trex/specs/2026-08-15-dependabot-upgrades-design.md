# Dependabot alert remediation — Option A + Vitest

**Date:** 2026-08-15 (rev. 2)
**Repo:** OHDSI/Data2Evidence (`develop`)
**Status:** scope confirmed by team — not implemented
**Implementation plan:** `trex/plans/2026-08-15-dependabot-upgrades.md`

**Scope decision:** Option A, **plus the Vitest major upgrade**. Prefect, ECharts and Nx remain excluded. Team confirmed three previously-blocking points:

1. **Vitest** — include it (was: deferred pending decision).
2. **pixi** — install **v0.72.2** (matching CI) and regenerate the affected lockfiles here.
3. **Stale alerts** — **wait for a Dependabot rescan** before claiming any alert resolved. No bulk API dismissal.

---

## 1. Problem

The Dependabot page reports **511 open alerts**. That number overstates the actionable work by more than 2×.

Every alert was pulled from `GET /repos/OHDSI/Data2Evidence/dependabot/alerts` and each `manifest_path` cross-checked against `origin/develop`.

> **Provenance caveat.** These counts come from the original design session's API query. They could **not** be re-verified while writing this revision — `gh` is installed in the sandbox but not authenticated. Treat every number in §1, §2 and §7 as the earlier query's snapshot, subject to drift as upstream advisories publish. The file-level findings (which manifests exist, which pins are present, which CI gates run) *were* re-verified against the working tree and are reliable. Task 1 of the plan re-establishes the baseline before any edit.

| Class | Count | Meaning |
|---|---:|---|
| **Stale** | **288** | Manifest no longer exists on `develop` |
| **Live** | **223** | Real, actionable |
| Total | 511 | |

The 288 stale alerts all reference `plugins/flows/*/uv.lock` and `plugins/flows/requirements-dev.txt`. Those files were deleted when the flow plugins migrated from uv to **pixi** (`pixi.lock` + `.github/workflows/_pixi-lock-check.yml`); a `find plugins/flows -name uv.lock` now returns zero files. Dependabot has no pixi parser, so it never re-scanned those directories and never auto-closed the alerts. **No code change can resolve them.**

### Disposition of the 223 live alerts

| Bucket | Count | Notes |
|---|---:|---|
| **In scope (this PR)** | **154** | 5 critical, 57 high, 72 medium, 20 low |
| Excluded — Prefect / ECharts / Nx | 51 | Team decision; deferred to follow-up PRs |
| No fix available upstream | 18 | `torch`, `transformers`, `image-size`, `request` |

With Vitest included, this PR now addresses **all 5 criticals**.

---

## 2. Architecture of the change

Four of the five units are dependency-manifest changes only. Unit 5 (Vitest) is the one that can require source edits. Each unit is independently verifiable.

### Unit 1 — npm lockfile refreshes (66 alerts)

| Manifest | Alerts | Mechanism |
|---|---:|---|
| `docs/website/package-lock.json` | 46 | `npm update --package-lock-only` |
| `tests/backend_integration_tests/pg/yarn.lock` | 12 | `yarn upgrade` (transitives only) |
| `tests/backend_integration_tests/hana/yarn.lock` | 12 | `yarn upgrade` (transitives only) |
| `package-lock.json` (root CLI) | 7 | `undici` `^6.25.0` → 6.28.0, in-range |
| `services/trex/package-lock.json` | 1 | `brace-expansion` → 5.0.7 |

**Verified finding — the obvious approach does not work.** `npm install --package-lock-only` on `docs/website` is a **no-op**: it changed zero of 21 vulnerable transitives, because the existing lock already satisfies its parents' ranges. `npm update --package-lock-only` moves **17 of 21**, including both criticals in this unit:

| Package | Before | After | Needed |
|---|---|---|---|
| `shell-quote` | 1.8.3 | **1.10.0** | 1.8.4 (critical) |
| `websocket-driver` | 0.7.4 | **0.7.5** | 0.7.5 (critical) |
| `js-yaml` | 3.14.2, 4.1.1 | 4.3.1 | 4.3.1 |
| `brace-expansion` | 1.1.14 | 1.1.18 | 1.1.18 |
| `postcss` | 8.5.6 | 8.5.26 | 8.5.23 |
| `fast-uri` | 3.0.6 | 3.1.5 | 3.1.5 |
| `nanoid` | 3.3.11 | 3.3.18 | 3.3.18 |
| `ws` | 7.5.10, 8.20.0 | 7.5.13, 8.21.3 | 8.21.0 |

Four stay stuck behind parent ranges and are **not** fixed by this PR: `webpack` (5.95.0, needs 5.104 — 2 low), `serialize-javascript` (6.0.2, needs 7.x — major), `uuid` (8.3.2, needs 11.x — major), `image-size` (no fix exists). Forcing them needs `overrides`, which trades a low-severity alert for real compatibility risk. Not worth it here.

### Unit 2 — Python direct pins (78 alerts)

| Change | Files | Alerts |
|---|---|---:|
| `pyjwt` / `PyJWT` 2.12.0 → **2.13.0** | 7 flow `pyproject.toml` (8 pins), `pyqe/requirements.txt`, `pyodidepyqe/requirements.txt` | 60 |
| `uv` 0.11.6 → **0.11.15** (dev groups) | 6 flow `pyproject.toml` | 6 |
| `pyarrow` 22.0.0 → **23.0.1** | `data_transformation/pyproject.toml` | 2 |
| `pyarrow` 17.0.0 → **23.0.1** | `pyqe/requirements.txt` | 2 |
| `setuptools` 80.9.0 → **83.0.0** | `data_transformation/pyproject.toml` | 2 |
| `wheel` 0.45.1 → **0.46.2** | `pyomopql/requirements-dev.txt` | 1 |

`requirements-dev.txt` in `pyqe` and `pyodidepyqe` starts with `-r requirements.txt`, so editing the two `requirements.txt` files clears the alerts attributed to all four.

`data_transformation/requirements_ner.txt` was listed as a pyjwt file in an earlier draft. It is **not** — it holds `scispacy`, `scipy` and a direct CPU-wheel URL for `torch` 2.8.0, no pyjwt pin. It is not touched by this PR.

Not every line here is a patch bump. **`pyarrow` 17 → 23 in pyqe is a six-major jump** and **`setuptools` 80 → 83 is a three-major jump**. They are in scope because pyqe/data_transformation use pyarrow only as a pandas/Arrow interchange format, but they get real test runs rather than being waved through (§4).

> **Arithmetic caveat.** The rows above sum to **73**, not the 78 in this unit's heading, and the five unit subtotals (66 + 73 + 0 + 0 + 3 = 142) do not reach the 154 in §1. The gap is most likely the mirrored `requirements-dev.txt` entries, which Dependabot counts as separate alerts against separate manifest paths but which need no separate edit. This was carried over from the original design session and could not be reconciled here without an authenticated API query. **Do not treat the per-unit counts as exact** — Task 1 and Task 12 of the plan measure the real before/after, which is what gets reported.

### Unit 3 — pixi lockfile regeneration

Any edit to a flow `pyproject.toml` invalidates its committed `pixi.lock`. `_pixi-lock-check.yml` enforces two gates across 8 manifests (`plugins/flows/{base,data_management,data_transformation,hades,i2b2,loyalty_score,search_embedding}` + `services/alp-dataflow-gen-worker`):

1. `pixi lock --check --manifest-path <dir>/pyproject.toml` must pass.
2. No pypi **sdists** in the lock — envs must stay binary-only; the allowlist is `lzstring-` and `pandasql-` only.

CI pins `pixi` to **v0.72.2** via `prefix-dev/setup-pixi@v0.9.0`. Local regeneration uses the same version — now approved — or the lock diff will be noise.

Gate 2 is the sharp edge: a re-lock that pulls a source distribution for any newly-resolved transitive fails CI. This is the single most likely cause of iteration in this PR.

**Seven of the eight manifests change.** An earlier draft claimed six, excluding `search_embedding` on the grounds that it "only carries Prefect alerts". That is wrong: `search_embedding/pyproject.toml` pins both `pyjwt==2.12.0` (line 22) and `uv==0.11.6` (line 40), which are in-scope Unit 2 edits, so its `pyproject.toml` and `pixi.lock` both change. Only `services/alp-dataflow-gen-worker` is untouched. All eight still get a `--check` run.

This correction matters for risk, not just bookkeeping: `search_embedding` is the heaviest environment in the repo (`torch==2.6.0`, `transformers==4.57.6`), so it is the **most likely of the seven to trip the sdist gate** — and the edits landing in it are two pins the team considers trivial.

### Unit 4 — `.github/dependabot.yml`

Confirmed absent today, so there are no grouped update PRs and no mechanism for Dependabot to re-evaluate the deleted uv directories. The new file declares the live ecosystems and directories with grouping, so patch-level transitive churn arrives as one PR per ecosystem rather than dozens.

Landing it is also what triggers the rescan that should clear the 288 stale alerts. Per the team decision, that outcome is **observed, not asserted** (§7).

### Unit 5 — Vitest major upgrade (3 alerts, 3 criticals)

| Package | Current `vitest` | Current `@vitest/coverage-v8` | Manager | CI gate |
|---|---|---|---|---|
| `plugins/ui/apps/vue-mri-ui-lib` | `^1.2.2` (resolves 1.6.1) | `^1.2.2` | bun (`plugins/ui/bun.lock`) | `ui-test-vue.yml` → `nx run vue-mri:test:ci` |
| `services/alp-logto/connector-physionet-oidc` | `^2.1.8` | `^2.1.8` | pnpm, **no committed lockfile** | **none — see below** |
| `tests/regression` | `^1.0.0` | n/a | npm, **no committed lockfile** | `_test-regression.yml` (via `docker-build-push.yaml`, runs on PRs) |

**The earlier draft's stated migration risk was wrong.** It claimed the jump "changes config surface (workspace → projects, `environmentMatchGlobs` removal)". Neither is used anywhere:

- `vue-mri-ui-lib` — inline `test` block in `vite.config.ts`: `globals`, `environment: 'happy-dom'`, `setupFiles`, `include`, `server.deps.inline: ['vuetify']`, `coverage`. Already uses the v4-shaped `server.deps.*` (v4 removed top-level `deps.inline`).
- `tests/regression` — `vitest.config.ts`: `testTimeout`, `hookTimeout`, `globalSetup` only.
- `connector-physionet-oidc` — no vitest config file at all.

The real risk surface is different, and the draft missed all four items:

1. **`@vitest/coverage-v8` must move in lockstep.** Both `vue-mri-ui-lib` (`test:ci` = `vitest run --coverage`) and the connector (`test:ci` = `--coverage`) depend on it, and its major must match vitest's. The earlier draft never mentioned it.
2. **`vue-mri-ui-lib` already carries a version skew:** it declares `@vitest/mocker` and `@vitest/pretty-format` at `^4.0.17` while `vitest` is `^1.2.2`. `bun.lock` currently resolves **three parallel vitest trees** — 1.6.1, 3.2.6 and 4.0.18.
3. **It is also already running an unsupported combination:** vitest 1.6.1 against the workspace-wide `vite` override of `6.4.2` (vitest 1 supports Vite 5). Upgrading fixes existing drift rather than introducing it.
4. **The connector's tests are never run by CI.** No workflow references `connector-physionet-oidc`; only its Docker image is built. Its bump must be verified locally or it ships untested.

**Repo precedent.** Within the `plugins/ui` bun workspace, `apps/{concept-sets,wizards,concept-mapping}` already run `vitest ^4.0.18` and `apps/jobs` runs `^3.2.6`. `vue-mri-ui-lib` is the lone laggard. The caveat: every v4 sibling uses **jsdom**, whereas `vue-mri-ui-lib` uses **happy-dom `^20.3.4`** with `@vue/test-utils 2`, Vuetify inlining and coverage — so the in-repo precedent proves v4 works with Vite 6 here, but not with this specific environment.

**Target: `4.0.18` for all three**, with `@vitest/coverage-v8` moved to match. Rationale: it satisfies the advisory (`>=3.2.6`), aligns with the three sibling apps, collapses a duplicate tree in `bun.lock`, resolves the `@vitest/mocker@4` skew, and avoids migrating the same 84-test suite twice. Prerequisites are met — v4 needs Vite >= 6 (override is 6.4.2) and Node >= 20 (CI and local are 22).

> **If the team prefers `3.2.6` instead:** it is a pure substitution of the version string in the four `package.json` edits (Task 6/7/8 of the plan) — `vitest` and `@vitest/coverage-v8` both to `^3.2.6`. Everything else in the plan is unchanged, because none of the removed-in-v4 config options are in use. The trade is a smaller behavioural delta on the 84 tests against leaving `vue-mri-ui-lib` on a third vitest tree with the `@vitest/mocker@4` skew unresolved.

**Where breakage will actually land:** `vue-mri-ui-lib` has **84 test files** (`src/**/__tests__/*.test.ts`). Vitest 4 changes mock semantics — mocks called with `new` now construct the instance instead of calling `mock.apply`, and automocked getters return `undefined` by default. That, not config, is the plausible failure mode. The connector has 2 test files and `tests/regression` has 2.

---

## 3. Vitest — resolved

Previously listed here as a blocking decision; the team has confirmed inclusion. The advisory is an arbitrary file read/execute issue that requires the **Vitest UI server to be listening** (`vitest --ui`, a local interactive mode). As CI-only dev dependencies the practical exposure was low, which is why deferral was defensible — but including it closes the last 3 criticals. Details in §2 Unit 5.

---

## 4. Validation

Each unit is verified locally before the PR opens; CI is the backstop, not the first signal.

| Unit | Local verification | CI gate |
|---|---|---|
| docs/website | `npm ci && npm run build` | `website-build-check.yaml` |
| integration-test yarn locks | `yarn install --frozen-lockfile` both dirs | `_test-http-duckdb`, `_test-http-hana` |
| root + trex npm | `npm ci`, `npm run build:ts` | existing build |
| Python pins | `pip install -r` resolve check; pyqe test suite for the pyarrow jump | `ui-pyqe-test.yml` |
| pixi locks | `pixi lock --check` ×8 + sdist grep | `_pixi-lock-check.yml` |
| Vitest — vue-mri-ui-lib | `bun install && bunx nx run vue-mri:test:ci` (84 files, with coverage) | `ui-test-vue.yml` |
| Vitest — connector | `pnpm install && pnpm test:ci` | **none** — local run is the only gate |
| Vitest — tests/regression | `npm install && npx vitest run` (needs stack; else typecheck + collect-only) | `_test-regression.yml` |

**Already verified during design** (in `/tmp`, repo untouched):

- `npm install --package-lock-only` on docs/website → no-op, 0 of 21 moved.
- `npm update --package-lock-only` → 17 of 21 moved, both criticals cleared.
- `npm ci && npm run build` on the updated lock → **exit 0**, "Generated static files in build". Docusaurus 3.10.2, Node 22.

**Toolchain confirmed available here:** node 22.23.2, npm 10.9.8, yarn 1.22.22, pnpm 11.21.0, bun 1.3.14, python 3.13.5. npm, PyPI and GitHub releases are all reachable. `pixi` and `uv` are absent; pixi v0.72.2 will be installed per the team decision.

**Two version mismatches to manage during implementation:**

- **bun:** CI pins **1.2.23**, local is **1.3.14**. `ui-test-vue.yml` runs a bare `bun install` (not `--frozen-lockfile`), so a local install with the newer bun can rewrite `bun.lock` in a format CI's older bun did not produce. Install bun 1.2.23 for the lock-touching step, or review the `bun.lock` diff and discard incidental churn.
- **pixi:** must be exactly **v0.72.2**.

`tests/regression` cannot run fully here — `_test-regression.yml` needs a 60-minute job with prepulled flow Docker images and a live `REG_URL` stack. Verification there is limited to install + typecheck + test collection; the suite itself is CI's job.

---

## 5. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| pixi re-lock pulls an sdist → `_pixi-lock-check` fails | **Medium** | Run the sdist grep locally before pushing; pin the offending transitive if hit |
| `search_embedding` re-lock disturbs the `torch`/`transformers` env | **Medium** | Heaviest env, highest sdist-gate exposure; diff its lock first and treat it as the pacing item |
| Vitest 4 mock-semantics change breaks some of the 84 vue-mri tests | **Medium** | Expected failure mode; run locally before pushing. Test-file edits are in scope for this PR |
| pixi re-lock drifts unrelated transitives across 7 envs | Medium | Review the lock diff per env; flow e2e suites gate it |
| Connector vitest bump ships untested | Medium | No CI gate exists; local `pnpm test:ci` is mandatory, not optional |
| `bun install` with local bun 1.3.14 rewrites `bun.lock` unexpectedly | Medium | Use bun 1.2.23, or review and trim the lock diff |
| happy-dom 20 + Vuetify + coverage-v8 unproven on v4 in this repo | Medium | Siblings prove v4 only with jsdom; this combination gets a real local run |
| `pyarrow` 17 → 23 breaks pyqe | Low-Medium | Six-major jump; `ui-pyqe-test.yml` must be green, not assumed |
| `setuptools` 80 → 83 breaks a build backend | Low | Only affects `data_transformation` build-time |
| docs/website transitive churn (postcss 8.5.26, ws 8.21.3) | Low | Build verified green already |
| `yarn upgrade` moves more than intended in test locks | Low | Constrain to the alerting packages; test-only blast radius |
| Stale alerts do not clear after the config lands | Medium | Report them as still-open; do not claim resolution (§7) |

The dominant risks are Unit 3 (pixi) and Unit 5 (Vitest). Units 1, 2 and 4 are close to mechanical.

---

## 6. Non-goals

Explicitly **not** in this PR:

- **Prefect 3.6.10 → 3.6.28** (~51 alerts with ECharts/Nx). Drags `prefecthq/prefect:3.6.10-python3.12` in `docker-compose.yml` and two Helm templates, plus the deliberate `fastapi==0.128.0` pin whose in-repo comment records that 0.129+ breaks `prefect.server`'s `PrefectRouter`. Needs the flow e2e suites as a gate. Separate PR.
- **ECharts 5.6.0 → 6.1.0** (`portal`, `vue-mri-ui-lib`) — charting-API major.
- **Nx ^18 → 22.7.2** (`plugins/ui`) — build-tooling major.
- **`torch`** — `search_embedding` pins 2.6.0; the `<= 2.6.0` advisory has **no patched version**, and the fix line is 2.13.0.
- **`transformers` 4.57.6 → 5.x** — the pin carries an explicit comment: *"transformers v5 changes embedding outputs, breaking score-exact e2e assertions (hybrid search)"*. Needs an embedding-stability decision, not a version bump.
- **`image-size`, `request`** — no upstream fix.
- **Migrating the other `plugins/ui` apps' vitest versions** — `apps/jobs` stays on 3.2.6; it has no alert.
- Any application source change unrelated to a Vitest 4 test fix.

---

## 7. Expected outcome

Per the team decision, these are **projections to be confirmed against a Dependabot rescan**, not claims.

| | Count | Confirmation |
|---|---:|---|
| Live alerts targeted by this PR | **154** | Re-query the alerts API after the rescan |
| Stale alerts expected to clear | 288 | Observed only; no bulk dismissal |
| **Projected total resolved** | **442 of 511** | |
| Remaining: Prefect / ECharts / Nx | 51 | Follow-up PRs |
| Remaining: no upstream fix | 18 | Tracked, not fixable |

All **5 criticals** are addressed: 2 in `docs/website` (Unit 1) and 3 in Vitest (Unit 5).

**Reporting rule:** the PR description states the intended effect and the verification method. The actual counts get posted as a follow-up comment once Dependabot has rescanned `develop` after merge. Nothing is reported as "resolved" before that.

---

## 8. Files touched

```
.github/dependabot.yml                                    (new)
docs/website/package-lock.json
package-lock.json
services/trex/package-lock.json
tests/backend_integration_tests/pg/yarn.lock
tests/backend_integration_tests/hana/yarn.lock
plugins/flows/base/{pyproject.toml,pixi.lock}
plugins/flows/data_management/{pyproject.toml,pixi.lock}
plugins/flows/data_transformation/{pyproject.toml,pixi.lock}
plugins/flows/hades/{pyproject.toml,pixi.lock}
plugins/flows/i2b2/{pyproject.toml,pixi.lock}
plugins/flows/loyalty_score/{pyproject.toml,pixi.lock}
plugins/flows/search_embedding/{pyproject.toml,pixi.lock}
plugins/ui/alp-libs/python/pyqe/requirements.txt
plugins/ui/alp-libs/python/pyodidepyqe/requirements.txt
plugins/ui/alp-libs/python/pyomopql/requirements-dev.txt
plugins/ui/apps/vue-mri-ui-lib/package.json
plugins/ui/bun.lock
services/alp-logto/connector-physionet-oidc/package.json
tests/regression/package.json
plugins/ui/apps/vue-mri-ui-lib/src/**/__tests__/*.test.ts        (only if v4 mock changes require it)
```

---

## 9. Decisions taken

| # | Question | Resolution |
|---|---|---|
| 1 | Vitest — defer or include? | **Include.** All 5 criticals now covered. §2 Unit 5 |
| 2 | May pixi be installed to re-lock? | **Yes — v0.72.2**, matching CI. 7 of 8 locks regenerate |
| 3 | Stale alerts — dismiss or rescan? | **Wait for the rescan.** No bulk API dismissal; report actuals afterwards |

**One open item, defaulted rather than blocked:** the Vitest target version. This spec assumes **4.0.18**; the fallback to `3.2.6` and its exact delta are documented at the end of §2 Unit 5.
