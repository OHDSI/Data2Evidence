# PR #2391 — Re-enable CDM creation e2e test: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use devx:subagent-driven-development (recommended) or devx:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring PR #2391 up to date with `develop`, resolving both conflicts in `develop`'s favour, so the PR's only functional change is re-enabling the `CDM configuration creation` Playwright test — and prove that test passes.

**Architecture:** A merge (not a rebase) of `origin/develop` into `p-hoffmann/cdwtest`. Both conflicting files are resolved by taking `develop` verbatim: `configSuggestion.ts` because `develop`'s `getCdwServiceCredentials()` (commit `70ef4b1e2`, PR #2736) already fixes the CDW config defect properly, and `cohortdefinition.service.ts` because the team decided to keep `develop`'s defensive handling. The only surviving branch edit is `SHOULD_SKIP = true → false`. Validation is behavioural: probe the live cdw-svc `configDefaults` endpoint, then run the un-skipped spec against the running stack, three times.

**Tech Stack:** git (merge/conflict resolution), Playwright 1.55.1 (`tests/e2e`), the running local d2e stack at `https://localhost:41100`, GitHub Actions (`test_demosetup_dev`), `gh` CLI.

**Design spec:** `trex/specs/2026-08-15-pr2391-cdw-test-reenable-design.md`

---

## Context an engineer new to this repo needs

**Repo root in this environment:**
`/tmp/devx-workspaces/00000000-0000-0000-0000-000000000001/0f556950-f1a8-47fe-84e2-c8b4ed0e3caf`
(referred to below as `$D2E`). The default worktree is currently on an unrelated branch, so
Task 1 creates a dedicated worktree.

**`gh` needs a token.** The CLI is not logged in; the token is embedded in the origin URL:

```bash
export GH_TOKEN=$(git -C "$D2E" remote get-url origin | sed -E 's|.*x-access-token:([^@]+)@.*|\1|')
```

**The repo was cloned shallow and has already been unshallowed** in this environment. If you
work in a fresh clone, run `git fetch --unshallow origin develop p-hoffmann/cdwtest` first —
without it `git merge-base` returns nothing and every comparison below is wrong.

**Why there is no unit-test task.** `cdw-svc`'s suite is jasmine over compiled output
(`jasmine.json` → `target/spec/**/*_test.js`) and its CI workflow (`functions-mri-tests.yml`)
needs HANA credentials plus a Postgres service, and still points at the stale `services/cdw-svc`
path. It is not runnable here. This plan substitutes something stronger for our purposes: Task 3
proves the merged `configSuggestion.ts` is **byte-identical to `develop`**, so `develop`'s own
coverage (`plugins/functions/cdw-svc/spec/qe/config/suggestion_test.ts`, the "uses the first
generated CDW service when multiple CDW services exist" case) applies unchanged, and Task 4
exercises the endpoint for real.

**The running stack already serves `develop`'s CDW fix.** Verified:
`/usr/src/plugins/d2ef/cdw-svc/src/qe/config/configSuggestion.ts` contains
`getCdwServiceCredentials`. So Task 4's probe tests the *environment* (risk R1 in the spec),
which is exactly the open question — it needs no deployment of our branch.

**There is no docker CLI in this container.** CI runs the e2e suite via the `d2e-e2e` image; we
run Playwright directly from `tests/e2e` against the live stack instead.

---

## File Structure

| Path | Change | Responsibility |
| --- | --- | --- |
| `tests/e2e/tests/17-configurations/CDM-creation.spec.ts` | Modify (1 line) | The only functional change: un-skip the test |
| `plugins/functions/cdw-svc/src/qe/config/configSuggestion.ts` | Conflict → take `develop` | CDW credential resolution for blank configs |
| `plugins/functions/d2e-webapi/src/services/cohortdefinition.service.ts` | Conflict → take `develop` | Cohort list assembly; defensive handling preserved |
| `trex/specs/2026-08-15-pr2391-cdw-test-reenable-design.md` | Add to branch | Approved design |
| `trex/plans/2026-08-15-pr2391-cdw-test-reenable.md` | Add to branch | This plan |
| `/tmp/cdw-probe/probe.spec.ts` | Create (outside repo) | Throwaway endpoint probe; must not enter the diff |

---

### Task 1: Create a worktree on the PR branch

**Files:**
- Create: worktree at `$D2E/.worktrees/pr2391`

- [ ] **Step 1: Set the repo root and token in your shell**

```bash
export D2E=/tmp/devx-workspaces/00000000-0000-0000-0000-000000000001/0f556950-f1a8-47fe-84e2-c8b4ed0e3caf
export GH_TOKEN=$(git -C "$D2E" remote get-url origin | sed -E 's|.*x-access-token:([^@]+)@.*|\1|')
```

- [ ] **Step 2: Fetch the two refs**

```bash
git -C "$D2E" fetch origin develop p-hoffmann/cdwtest
```

Expected: exits 0. If it prints `shallow`, run
`git -C "$D2E" fetch --unshallow origin develop p-hoffmann/cdwtest`.

- [ ] **Step 3: Create the worktree tracking the PR branch**

```bash
git -C "$D2E" worktree add "$D2E/.worktrees/pr2391" -B p-hoffmann/cdwtest origin/p-hoffmann/cdwtest
```

Expected: `Preparing worktree ... HEAD is now at cb795cf25 Merge branch 'develop' into p-hoffmann/cdwtest`

- [ ] **Step 4: Confirm the starting point**

```bash
cd "$D2E/.worktrees/pr2391" && git log --oneline -2 && git status --short
```

Expected: `cb795cf25` then `e13348aba`; `git status` clean (no output).

- [ ] **Step 5: Record the pre-merge divergence**

```bash
git rev-list --left-right --count origin/develop...HEAD
```

Expected: `255<TAB>2` (the left number grows as `develop` moves; that is fine).

---

### Task 2: Merge develop and resolve both conflicts in develop's favour

**Files:**
- Modify: `plugins/functions/cdw-svc/src/qe/config/configSuggestion.ts` (take `develop`)
- Modify: `plugins/functions/d2e-webapi/src/services/cohortdefinition.service.ts` (take `develop`)
- Keep: `tests/e2e/tests/17-configurations/CDM-creation.spec.ts` (branch version)

- [ ] **Step 1: Start the merge and let it conflict**

```bash
cd "$D2E/.worktrees/pr2391"
git merge origin/develop --no-commit
```

Expected output contains exactly these two conflicts and nothing else:

```
CONFLICT (content): Merge conflict in plugins/functions/cdw-svc/src/qe/config/configSuggestion.ts
CONFLICT (content): Merge conflict in plugins/functions/d2e-webapi/src/services/cohortdefinition.service.ts
Automatic merge failed; fix conflicts and then commit the result.
```

If a *third* file conflicts, stop and report it — `develop` has moved into new territory and the
spec's one-line-diff expectation needs revisiting before you resolve anything.

- [ ] **Step 2: Confirm the conflicted set is what you expect**

```bash
git diff --name-only --diff-filter=U
```

Expected, exactly:

```
plugins/functions/cdw-svc/src/qe/config/configSuggestion.ts
plugins/functions/d2e-webapi/src/services/cohortdefinition.service.ts
```

- [ ] **Step 3: Take develop's version of both files**

`--theirs` here means `origin/develop`, the branch being merged in. This discards the branch's
ad-hoc `try/catch` in `configSuggestion.ts` and the branch's removal of defensive handling in
`cohortdefinition.service.ts` — both intended.

```bash
git checkout --theirs -- \
  plugins/functions/cdw-svc/src/qe/config/configSuggestion.ts \
  plugins/functions/d2e-webapi/src/services/cohortdefinition.service.ts
git add \
  plugins/functions/cdw-svc/src/qe/config/configSuggestion.ts \
  plugins/functions/d2e-webapi/src/services/cohortdefinition.service.ts
```

- [ ] **Step 4: Verify no conflict markers survived**

```bash
grep -rn '^<<<<<<<\|^=======$\|^>>>>>>>' \
  plugins/functions/cdw-svc/src/qe/config/configSuggestion.ts \
  plugins/functions/d2e-webapi/src/services/cohortdefinition.service.ts
```

Expected: no output (grep exits 1).

- [ ] **Step 5: Verify both files are byte-identical to develop**

```bash
git diff origin/develop -- \
  plugins/functions/cdw-svc/src/qe/config/configSuggestion.ts \
  plugins/functions/d2e-webapi/src/services/cohortdefinition.service.ts
```

Expected: no output. This is the check that `develop`'s CDW fix and cohort defensive handling
survived intact, and it is what lets us inherit `develop`'s unit coverage.

- [ ] **Step 6: Verify the defensive handling is actually present**

```bash
grep -c "continuing with empty list" plugins/functions/d2e-webapi/src/services/cohortdefinition.service.ts
grep -n "safeParse" plugins/functions/d2e-webapi/src/services/cohortdefinition.service.ts
grep -n "getCdwServiceCredentials" plugins/functions/cdw-svc/src/qe/config/configSuggestion.ts
```

Expected: the first prints `2` or more; the second prints a `BookmarksSchema.safeParse` line; the
third prints the `export function getCdwServiceCredentials` line plus its call site inside
`generateEmptyConfig`.

- [ ] **Step 7: Verify the test flag survived the merge**

```bash
grep -n "SHOULD_SKIP" tests/e2e/tests/17-configurations/CDM-creation.spec.ts
```

Expected:

```
11:const SHOULD_SKIP = false
12:test.fixme(SHOULD_SKIP, `${TEST_NAME} test is temporarily disabled.`)
```

If line 11 says `true`, the merge took `develop`'s spec file. Fix it:

```bash
sed -i 's/^const SHOULD_SKIP = true$/const SHOULD_SKIP = false/' tests/e2e/tests/17-configurations/CDM-creation.spec.ts
git add tests/e2e/tests/17-configurations/CDM-creation.spec.ts
```

- [ ] **Step 8: Complete the merge**

```bash
git commit --no-edit
```

Expected: a merge commit `Merge remote-tracking branch 'origin/develop' into p-hoffmann/cdwtest`.

- [ ] **Step 9: The gate — the diff against develop must be one line**

```bash
git diff origin/develop --stat
```

Expected, exactly:

```
 tests/e2e/tests/17-configurations/CDM-creation.spec.ts | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

Any other file listed means a resolution went the wrong way (spec risk R3). Do not proceed —
`git reset --hard origin/p-hoffmann/cdwtest` and redo Task 2.

- [ ] **Step 10: Read the one-line diff to be sure**

```bash
git diff origin/develop
```

Expected: only `-const SHOULD_SKIP = true` / `+const SHOULD_SKIP = false`.

---

### Task 3: Commit the spec and this plan to the branch

The spec and plan ship with the PR so reviewers see the intent alongside a one-line diff.

**Files:**
- Add: `trex/specs/2026-08-15-pr2391-cdw-test-reenable-design.md`
- Add: `trex/plans/2026-08-15-pr2391-cdw-test-reenable.md`

- [ ] **Step 1: Copy both documents into the worktree**

They were authored in the default worktree; copy them across (paths are identical relative to
the repo root):

```bash
cd "$D2E/.worktrees/pr2391"
mkdir -p trex/specs trex/plans
cp "$D2E/.worktrees/7b42e7c8-dbb6-41ca-a4b6-615c1d686bd1/trex/specs/2026-08-15-pr2391-cdw-test-reenable-design.md" trex/specs/
cp "$D2E/.worktrees/7b42e7c8-dbb6-41ca-a4b6-615c1d686bd1/trex/plans/2026-08-15-pr2391-cdw-test-reenable.md" trex/plans/
```

- [ ] **Step 2: Commit them**

```bash
git add trex/specs/2026-08-15-pr2391-cdw-test-reenable-design.md \
        trex/plans/2026-08-15-pr2391-cdw-test-reenable.md
git commit -m "plan: re-enable CDM creation e2e test"
```

- [ ] **Step 3: Re-check the diff against develop**

```bash
git diff origin/develop --stat
```

Expected: three files now — the spec, the plan, and `CDM-creation.spec.ts` with `1 +-`. No
source file may appear.

---

### Task 4: Probe the live CDW config endpoint (spec risk R1)

This is the gate before spending 5 minutes on an e2e run. It answers: does this environment
expose an `mridb` service tagged `cdw`, so `generateEmptyConfig` returns a config instead of
`Found 0 matching CDW services`? The UI calls `POST /d2e/hc/hph/cdw/config/services/config.xsjs`
with `Content-Type: application/json` and body `{"action":"configDefaults"}` (see
`plugins/ui/apps/portal/src/plugins/mri/CDM/ui5/lib/BackendLinker.js`, `_postJson` +
`getConfigDefaults`). The call needs an authenticated session, so drive it through a
Playwright login rather than hand-minting a token.

**Files:**
- Create: `/tmp/cdw-probe/probe.spec.ts` (outside the repo — it must never appear in the diff)

- [ ] **Step 1: Confirm the stack is up**

```bash
curl -sk -o /dev/null -w "%{http_code}\n" https://localhost:41100/
```

Expected: `302`. If you get a connection error, the stack is down — stop and report that; do not
interpret it as a test failure.

- [ ] **Step 2: Confirm the served cdw-svc has develop's fix**

```bash
grep -c getCdwServiceCredentials /usr/src/plugins/d2ef/cdw-svc/src/qe/config/configSuggestion.ts
```

Expected: `2` or more (definition + call site). If `0`, the running stack predates #2736 and this
probe would test the old code — report it and skip to Task 5, noting the probe was inconclusive.

- [ ] **Step 3: Write the probe spec**

```bash
mkdir -p /tmp/cdw-probe
```

Write `/tmp/cdw-probe/probe.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

const BASE = process.env.D2E_BASE_URL ?? 'https://localhost:41100'

test('cdw configDefaults returns a populated blank config', async ({ page }) => {
  test.setTimeout(180 * 1000)

  await page.goto(`${BASE}/d2e/portal`)
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByTestId('button').nth(1)).toBeVisible({ timeout: 60000 })

  const response = await page.request.post(
    `${BASE}/d2e/hc/hph/cdw/config/services/config.xsjs`,
    {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      data: { action: 'configDefaults' }
    }
  )

  const body = await response.text()
  console.log('STATUS', response.status())
  console.log('BODY', body.slice(0, 2000))

  expect(response.status(), `configDefaults failed: ${body}`).toBe(200)
  expect(body).not.toContain('Found 0 matching CDW services')

  const parsed = JSON.parse(body)
  const vocabSchema =
    parsed?.config?.advancedSettings?.vocabSchema ??
    parsed?.advancedSettings?.vocabSchema ??
    parsed?.vocabSchema
  console.log('vocabSchema', vocabSchema)
  expect(vocabSchema, `no vocabSchema in response: ${body}`).toBeTruthy()
})
```

- [ ] **Step 4: Install the Playwright browser if it is missing**

```bash
cd "$D2E/.worktrees/pr2391/tests/e2e" && npm install && npx playwright install chromium --with-deps
```

Expected: ends with the chromium version installed. Safe to re-run if already present.

- [ ] **Step 5: Run the probe**

```bash
cd "$D2E/.worktrees/pr2391/tests/e2e"
D2E_BASE_URL=https://localhost:41100 npx playwright test /tmp/cdw-probe/probe.spec.ts \
  --config=playwright.config.ts --reporter=list
```

Expected: `1 passed`, with `STATUS 200` and a non-empty `vocabSchema` in the log.

**If it fails on `Found 0 matching CDW services` or a 500:** stop. This is spec risk R1 — the
environment has no `cdw`-tagged `mridb` service. Report it as an environment/config defect,
leave `SHOULD_SKIP = false` uncommitted-to-`develop` (i.e. do not push for merge), and ask the
team whether to fix the environment or keep the test skipped.

**If it fails on the `vocabSchema` assertion but returned 200:** the response shape differs from
the three paths probed. Print the body, read the actual key out of it, and adjust the lookup —
a 200 with a populated config is the real signal.

- [ ] **Step 6: Confirm the probe left no trace in the repo**

```bash
cd "$D2E/.worktrees/pr2391" && git status --short
```

Expected: no output, or only `tests/e2e/node_modules`-related ignored paths. Nothing tracked may
be modified.

---

### Task 5: Run the re-enabled e2e test once

**Files:**
- Exercise: `tests/e2e/tests/17-configurations/CDM-creation.spec.ts`

- [ ] **Step 1: Confirm the test is no longer skipped**

```bash
cd "$D2E/.worktrees/pr2391/tests/e2e"
D2E_BASE_URL=https://localhost:41100 npx playwright test tests/17-configurations/CDM-creation.spec.ts --list
```

Expected: lists `CDM configuration creation`. (`test.fixme` still lists the test; the run in the
next step is what proves it executes rather than being marked skipped.)

- [ ] **Step 2: Run it**

```bash
cd "$D2E/.worktrees/pr2391/tests/e2e"
D2E_BASE_URL=https://localhost:41100 npx playwright test tests/17-configurations/CDM-creation.spec.ts \
  --reporter=list 2>&1 | tee /tmp/cdw-probe/run1.log
```

Expected: `1 passed`. A line reading `1 skipped` means `SHOULD_SKIP` is still `true` — go back to
Task 2 Step 7.

- [ ] **Step 3: On failure, collect evidence before changing anything**

```bash
ls -R "$D2E/.worktrees/pr2391/tests/e2e/test-results" | head -40
```

The config records screenshots, video, and trace on failure, and the fixtures attach a HAR when
`GITHUB_ACTIONS` is unset. Read the failure, decide whether it is the CDW config path (R1),
flakiness (R2), or a genuine product regression — and report which. Do not add retries or
timeouts to make it pass.

---

### Task 6: Flakiness probe — three consecutive runs

The spec sets `test.describe.configure({ retries: 3 })`, which suggests a known flaky history.
A test that only passes on retry is not worth re-enabling (spec risk R2). Note that
`playwright.config.ts` sets `retries: 0` globally, so the file-level 3 retries are what apply.

- [ ] **Step 1: Run it three times, recording each outcome**

```bash
cd "$D2E/.worktrees/pr2391/tests/e2e"
for i in 1 2 3; do
  echo "=== attempt $i ==="
  D2E_BASE_URL=https://localhost:41100 npx playwright test tests/17-configurations/CDM-creation.spec.ts \
    --reporter=list 2>&1 | tee "/tmp/cdw-probe/flaky-$i.log" | tail -5
done
```

Expected: `1 passed` three times.

- [ ] **Step 2: Check whether any pass needed a retry**

```bash
grep -l "retry #" /tmp/cdw-probe/flaky-*.log || echo "no retries used"
```

Expected: `no retries used`.

- [ ] **Step 3: Record the result for the PR**

Write down "3/3 passed, N retries used" — this goes in the PR comment in Task 7. If a run needed
a retry, or any run failed, stop and report: the honest outcome is that the test is still flaky
and the PR should not merge yet.

---

### Task 7: Push, update the PR, and get CI green

- [ ] **Step 1: Push the branch**

```bash
cd "$D2E/.worktrees/pr2391" && git push origin p-hoffmann/cdwtest
```

Expected: a normal (non-force) push. If git demands `--force`, something rebased the branch —
stop and investigate rather than forcing.

- [ ] **Step 2: Confirm GitHub now sees the PR as mergeable**

```bash
gh pr view 2391 --repo OHDSI/Data2Evidence --json mergeable,mergeStateStatus,changedFiles
```

Expected: `"mergeable":"MERGEABLE"` and `"changedFiles":3` (spec, plan, test file).

- [ ] **Step 3: Update the PR description**

Replace the body so a reviewer understands why the diff is one line:

```bash
gh pr edit 2391 --repo OHDSI/Data2Evidence --body "$(cat <<'EOF'
Re-enables the `CDM configuration creation` e2e test (`SHOULD_SKIP = false`).

The CDW config defect that caused the test to be skipped is already fixed on `develop` by
#2736, which replaced the unguarded `getAnalyticsConnectionParameters({tag:"analytics"})`
lookup in `generateEmptyConfig` with `getCdwServiceCredentials()` (resolves `mridb` services
tagged `cdw` from `VCAP_SERVICES`, reports a clear error when none match). This branch's own
workaround is therefore dropped in favour of `develop`'s implementation, and the defensive
error handling in `cohortdefinition.service.ts` is kept as-is on `develop`.

Net diff against `develop`: one line in the spec, plus the design doc and plan under `trex/`.

Verification: cdw-svc `configDefaults` returns a populated blank config against a live stack;
the re-enabled spec passes 3/3 consecutive local runs with no retries.
EOF
)"
```

- [ ] **Step 4: Post the verification evidence as a comment**

```bash
gh pr comment 2391 --repo OHDSI/Data2Evidence --body "Local verification against a live stack: \`configDefaults\` returns HTTP 200 with a populated vocabSchema; \`CDM-creation.spec.ts\` passed 3/3 consecutive runs, 0 retries used."
```

- [ ] **Step 5: Watch CI**

```bash
gh pr checks 2391 --repo OHDSI/Data2Evidence --watch
```

Expected: `test_demosetup_dev` (both shards), `test_demosetup_dev_gate`, `docker-success`, and
`check-vote` all pass. The previously red checks were from 2026-05-20 and are superseded.

- [ ] **Step 6: If `test_demosetup_dev` fails, read the actual failure**

```bash
gh run view <run-id> --repo OHDSI/Data2Evidence --log-failed | grep -iE "CDM configuration|17-configurations|✘|Error:" | head -40
```

Report whether the failure is our test or unrelated infrastructure. Do not re-run blindly more
than once.

---

### Task 8: Final verification

- [ ] **Step 1: Diff is still exactly what the spec promised**

```bash
cd "$D2E/.worktrees/pr2391" && git diff origin/develop --stat
```

Expected: `CDM-creation.spec.ts` (1 insertion, 1 deletion) plus the two `trex/` documents.

- [ ] **Step 2: Working tree clean, nothing stray committed**

```bash
git status --short
```

Expected: no output.

- [ ] **Step 3: Confirm develop's protected code is untouched**

```bash
git diff origin/develop -- plugins/
```

Expected: no output.

- [ ] **Step 4: Report to the team**

State: merge done and pushed; conflicts resolved toward `develop`; the CDW fix in place is
#2736's; local probe + 3/3 e2e runs; CI status. Flag anything that had to deviate from this plan.

---

## Rollback

If anything in Task 2 goes wrong before the push:

```bash
cd "$D2E/.worktrees/pr2391" && git merge --abort   # mid-merge
git reset --hard origin/p-hoffmann/cdwtest         # after a bad merge commit
```

Nothing is pushed until Task 7, so the remote branch is untouched until then.

## Non-goals (do not do these)

- Do not re-remove the defensive error handling in `cohortdefinition.service.ts`.
- Do not modify `configSuggestion.ts` in any way.
- Do not re-enable any other skipped test.
- Do not rebase, squash, or force-push the branch.

## Amendment — Task 9: repair the e2e interactions (approved 2026-08-15)

Task 5 found the re-enabled test failing deterministically (4/4) at the "Base Entity ID"
dropdown. The team approved repairing the test in this PR, so the non-goal forbidding changes
to `CDM-creation.spec.ts` beyond the flag is withdrawn. See §7 of the design spec for the root
causes and evidence. Work done, all in
`tests/e2e/tests/17-configurations/CDM-creation.spec.ts`:

- [x] Add `openSelect()` — waits for a `sap.m.Select` to lose `sapMSltDisabled` before
      clicking, because the arrow `<div>` reports as enabled even while the select is not.
- [x] Add `selectInRow(section, rowLabel)` locator helper.
- [x] Replace all nine arrow-click sites in the Placeholder-mapping step, removing a
      `waitForTimeout(200)` and a `while` loop that re-clicked the arrow.
- [x] Harden `clickTestConfig()` — wait for breadcrumb-or-list after `page.reload()`.
- [x] Harden the PA config rename loop — allow up to 15s per attempt for the commit.
- [x] Validate: 3 consecutive runs against a live stack (see report).
