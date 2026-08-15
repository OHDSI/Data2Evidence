# PR #2391 — Re-enable the CDM creation e2e test: branch update & conflict resolution

Date: 2026-08-15
PR: https://github.com/OHDSI/Data2Evidence/pull/2391 (`p-hoffmann/cdwtest` → `develop`)
Status: design agreed, implementation not started

## 1. Problem

PR #2391 ("reenable cdw test") has been open since 2026-05-03 and last updated 2026-05-20.
Since then it has fallen **255 commits behind `develop`** and GitHub reports it as
`CONFLICTING` / `DIRTY`. All its CI checks are red, but those runs are three months old and
pre-date the very fix that makes the PR viable, so they carry no signal.

The PR's stated goal — run the `CDM configuration creation` Playwright test again instead of
skipping it — is still wanted. What has changed is *why* the test was skipped: the underlying
CDW config defect the branch tried to work around has already been fixed properly on `develop`.

Goal of this work: bring the branch up to date, resolve the two conflicts in the direction the
team chose, and land a PR whose diff against `develop` is exactly the test enablement.

## 2. Current state

### 2.1 Branch shape

- Merge base with `develop`: `b14431c3c` ("update reviewers (#2528)").
- Branch commits: `e13348ab` ("reenable cdw test") + `cb795cf2` (merge of `develop` at the
  merge base, i.e. a no-op catch-up from May).
- Divergence today: `develop` +255, branch +2.
- All three file changes originate in `e13348ab`; the merge commit contributed nothing.

### 2.2 The three changed files

| File | Branch change | Verdict |
| --- | --- | --- |
| `plugins/functions/cdw-svc/src/qe/config/configSuggestion.ts` | ad-hoc `try/catch` around `EnvVarUtils.getAnalyticsConnectionParameters({tag:"analytics"})`, falling back to `{ vocabSchema: "" }` | superseded by `develop` |
| `plugins/functions/d2e-webapi/src/services/cohortdefinition.service.ts` | removes the defensive `.catch(→ [])`, `BookmarksSchema.safeParse`, and per-cohort `JSON.parse` guards in `getCohortDefinitionList` | dropped (team decision) |
| `tests/e2e/tests/17-configurations/CDM-creation.spec.ts` | `SHOULD_SKIP = true` → `false` | **keep — this is the PR** |

A trial merge (`git merge-tree`) confirms conflicts in exactly the first two files. The spec
file does not conflict: it is byte-identical on `develop` to the merge base and still carries
`SHOULD_SKIP = true`.

### 2.3 The CDW config issue — already fixed on develop

`develop` commit `70ef4b1e2` ("Jerome ng/2072 cdm creation fails in manual test", #2736)
replaced the failing lookup in `generateEmptyConfig`:

- **Old (merge base):** `generateEmptyConfig` called
  `EnvVarUtils.getAnalyticsConnectionParameters({ tag: "analytics" })` unguarded. When the
  environment exposed no `analytics`-tagged service, this threw, the `configDefaults` action
  errored out, and the admin "Clinical Data Model" creation screen could not seed a blank
  config — the failure that got the e2e test skipped in the first place.
- **New (`develop`):** a dedicated `getCdwServiceCredentials(vcapServices = env.VCAP_SERVICES)`
  parses `VCAP_SERVICES`, selects `mridb` entries tagged `cdw`, throws a clear
  `"Found 0 matching CDW services"` when none match, and logs a warning listing the candidates
  (via `summarizeCdwService`) when more than one matches, using the first as a best-effort
  fallback. `generateEmptyConfig` wraps the call in `try/catch` and surfaces failures through
  `callback(err, null)` rather than crashing.
- Coverage: `plugins/functions/cdw-svc/spec/qe/config/suggestion_test.ts` includes
  "uses the first generated CDW service when multiple CDW services exist" asserting the
  resolved `vocabSchema`.

The branch's `{ vocabSchema: "" }` fallback is strictly worse: it silently hands the UI a blank
schema instead of reporting a misconfigured environment. Taking `develop` here removes the last
reason the test was skipped, and does so with a real error path plus unit coverage.

### 2.4 Cohort defensive handling — keep develop's

`develop` has since rewritten `cohortdefinition.service.ts` substantially (+211/−174, including
the `portalServerApi` → `webApiApi` switch) and **deliberately kept** the defensive handling the
branch removed: per-call `.catch` fallbacks in the `Promise.all`, `BookmarksSchema.safeParse`,
and a guarded `JSON.parse` of each materialized cohort's `syntax` that skips unparseable rows.

Team decision (2026-08-15): **keep `develop`'s defensive handling.** Re-removing it inside this
PR would turn a degrade-gracefully cohort list into a hard failure — a behavioural change
unrelated to CDW configuration, in a file this PR otherwise has no business touching.

## 3. Design

### 3.1 Approach

Merge `origin/develop` into `p-hoffmann/cdwtest` (a merge, not a rebase — the branch is shared
and already contains a merge commit; rebasing would rewrite published history for a one-line
diff). Resolve both conflicts by taking `develop` wholesale. Keep only the spec flag flip.

Rejected alternatives, for the record:

- *Close #2391 and open a fresh one-line PR off `develop`.* Cleaner diff, but throws away the
  PR's review history and the discussion of why the test was skipped. Not worth it for a merge
  with two mechanical resolutions.
- *Rebase the branch onto `develop`.* Would drop the stale merge commit, but rewrites a pushed
  branch and forces a force-push for no diff benefit.

### 3.2 Conflict resolution rules

1. `plugins/functions/cdw-svc/src/qe/config/configSuggestion.ts` → take `develop`'s version
   entirely (`getCdwServiceCredentials` + `summarizeCdwService` + guarded `generateEmptyConfig`).
   The branch's `try/catch` and `{ vocabSchema: "" }` fallback disappear.
2. `plugins/functions/d2e-webapi/src/services/cohortdefinition.service.ts` → take `develop`'s
   version entirely. All defensive handling stays.
3. `tests/e2e/tests/17-configurations/CDM-creation.spec.ts` → keep the branch's
   `const SHOULD_SKIP = false`. No other edit to this file.

### 3.3 Expected end state

`git diff origin/develop...p-hoffmann/cdwtest` after the merge touches **one file, one line**:

```
-const SHOULD_SKIP = true
+const SHOULD_SKIP = false
```

plus this spec document, committed to the same branch.

### 3.4 PR housekeeping

Update the PR description to state that the CDW config defect was fixed upstream by #2736 and
that this PR now only re-enables the test, so a reviewer seeing a one-line diff understands why.

## 4. Validation

In order; each step gates the next.

1. **Merge sanity.** After resolving, `git diff origin/develop` shows only the spec flag and
   this document. Any other file in that diff means a resolution went wrong.
2. **Unit.** Run the `cdw-svc` suite, specifically
   `spec/qe/config/suggestion_test.ts` ("CDM Config empty config credentials"), plus a
   typecheck of `cdw-svc` and `d2e-webapi`.
3. **Service-level CDW config check.** Against the running stack, call the cdw-svc
   `configDefaults` action and assert it returns a populated blank config — non-empty
   `vocabSchema` — rather than an error. This is the direct probe of §2.3 and confirms the
   deployed environment really does expose an `mridb` service tagged `cdw`. If it returns
   `Found 0 matching CDW services`, stop: the defect is environmental, not code, and the test
   must stay skipped until the environment config is fixed (see Risk R1).
4. **End-to-end.** Run `tests/e2e/tests/17-configurations/CDM-creation.spec.ts` now that it is
   un-skipped, driving the real admin flow (Setup → Clinical Data Model → create config).
   The spec sets a 5-minute test timeout, 60s action/expect timeouts, and
   `test.describe.configure({ retries: 3 })`.
5. **Flakiness probe.** Run the spec 3 consecutive times. It was authored with 3 retries, which
   suggests a known flaky history; a test that only passes on retry is not a test worth
   re-enabling (see Risk R2). Record pass/attempt counts in the PR.
6. **CI.** Push and require a fresh green `test_demosetup_dev` (both shards) plus
   `docker-success`. The existing red checks are from 2026-05-20 and are not evidence.

## 5. Risks

- **R1 — the environment, not the code, lacks a `cdw`-tagged service.** `develop`'s fix resolves
  credentials from `VCAP_SERVICES.mridb` filtered by the `cdw` tag, built by the cdw-svc
  env converter. If the demo/CI environment produces zero matches, `generateEmptyConfig` errors
  by design and the re-enabled test fails for a config reason. Detected by validation step 3
  *before* any e2e run. Response: report it as an environment/config defect and leave the test
  skipped rather than merging a red test.
- **R2 — the test is genuinely flaky.** The 3 retries and the "temporarily disabled" note hint
  at instability beyond the CDW config defect. Step 5 exists to catch this. Response: keep the
  PR open, report the failure mode, do not paper over it with more retries.
- **R3 — a wrong-direction conflict resolution silently reverts develop.** Both conflicting
  files carry substantial `develop` work (the CDW fix; the `webApiApi` refactor). Mitigated by
  validation step 1: the final diff against `develop` must be one line.
- **R4 — merge churn.** `develop` moves fast; a long gap between merge and green CI invites a
  second conflict. Mitigated by doing the merge, validation, and push in one sitting.

## 6. Non-goals

- Re-removing the defensive error handling in `cohortdefinition.service.ts`. If "fail loud so
  the e2e catches regressions" is still wanted, it is a separate ticket with its own review.
- Any further change to `configSuggestion.ts`. `develop`'s implementation stands as-is.
- Re-enabling any other skipped test in `tests/e2e`.
- Rebasing or squashing the branch's existing history.

## 7. Scope amendment (2026-08-15, approved by the team)

Validation found the re-enabled test fails deterministically (4/4 attempts) against a live
stack, at the "Base Entity ID" dropdown in the *Placeholder mapping* step. The team approved
extending this PR to repair the test interactions. The original non-goal "do not de-flake
`CDM-creation.spec.ts`" is therefore withdrawn; all other non-goals stand.

### 7.1 Root cause — disabled UI5 select

A `sap.m.Select` stays disabled (`class` contains `sapMSltDisabled`) until its column data
arrives. The spec guarded readiness with `expect(arrow).toBeEnabled()`, but the arrow is a
plain `<div>`, which Playwright always reports as enabled. The test therefore clicked a
disabled control, the click was swallowed, and it then waited 60s for options that never
appeared. Diagnostic evidence, at the exact failure point:

```
SELECT class: sapMSlt sapMSltDefault sapMSltDisabled sapMSltMinWidth sapMSltWithArrow
[A: arrow.click]  role=option:8  person_id:0  popovers:0
[B: select.click] role=option:26 person_id:1 popovers:1
```

Fix: an `openSelect()` helper that waits for the select to lose `sapMSltDisabled` before
clicking it, plus a `selectInRow()` locator helper. Applied to every `sap.m.Select` in the
Placeholder-mapping step, replacing the arrow-click pattern, one `waitForTimeout(200)`, and a
`while` loop that had been re-clicking the arrow to paper over the same race.

### 7.2 Two further races of the same shape

Both check UI state immediately after an asynchronous commit:

- `clickTestConfig()` tested breadcrumb visibility right after `page.reload()`, racing the
  render; when it lost, the back-navigation was skipped and the config list never appeared.
  Fix: wait for whichever of breadcrumb-or-list renders first, then decide.
- The PA config rename loop re-checked visibility immediately after the blur, burning its
  three attempts without giving the rename time to commit. Fix: wait up to 15s for the name to
  appear inside each iteration.

### 7.3 Residual finding (not fixed here)

`configDefaults` returns `"@REF": "\"undefined\".\"CONCEPT\""` because the `cdw`-tagged
service's credentials carry no `vocabSchema`, and `getEmptyConfig` interpolates it unchecked
(`DefaultAttributes.ts:41`). `develop`'s fix guards against *zero* matching services but not
against a matching service *without* `vocabSchema`. Pre-existing on `develop`, does not block
this test (the spec sets the vocab mappings explicitly). Deserves its own ticket.

## 7. Open questions

None blocking. R1 and R2 are resolved by observation during validation, not by a decision.
