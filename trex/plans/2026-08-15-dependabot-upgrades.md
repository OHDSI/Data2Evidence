# Dependabot Alert Remediation (Option A + Vitest) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use devx:subagent-driven-development (recommended) or devx:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close 154 live Dependabot alerts (all 5 criticals) via dependency-manifest updates plus a Vitest major upgrade, and land a `dependabot.yml` that triggers the rescan clearing 288 stale alerts.

**Architecture:** Five independent units, each its own commit: (1) npm lockfile refreshes, (2) Python direct pins, (3) pixi lockfile regeneration, (4) a new `.github/dependabot.yml`, (5) the Vitest 1.x/2.x → 4.0.18 upgrade. Units 1–4 are manifest-only. Unit 5 is the only one that may require source edits. Nothing is reported as "resolved" until Dependabot rescans `develop` post-merge.

**Tech Stack:** npm 10 / yarn 1 / pnpm 11 / bun 1.2.23 / nx, Python 3.11 + pip, pixi v0.72.2, vitest 4.0.18, GitHub Actions.

**Design spec:** `trex/specs/2026-08-15-dependabot-upgrades-design.md` — read §2 before starting.

---

## Ground rules

- **Commit after every task.** Each unit must be independently revertable.
- **Never run `npm audit fix`, `bun update`, or `pnpm up` unscoped.** Every version change in this plan is explicit.
- **Do not claim any alert is resolved.** Counts get verified in Task 12 only.
- **Two toolchain versions are pinned and must be matched exactly:** pixi `v0.72.2` and bun `1.2.23`. The sandbox ships bun 1.3.14 — Task 7 installs the correct one.
- If a step's actual output differs from "Expected", **stop and report** rather than improvising a fix.
- **`gh` needs authenticating first.** It is installed (2.65.0) but logged out. Task 1 and Task 12 both call `gh api`; run `gh auth login` before starting or those steps fail.
- **The alert counts in this plan are inherited, not re-verified** (see the provenance caveat in spec §1). Task 1 Step 2 establishes the real baseline; treat any count quoted in a task heading as indicative.

---

## File Structure

| File | Unit | Responsibility |
|---|---|---|
| `docs/website/package-lock.json` | 1 | 46 alerts; refreshed via `npm update --package-lock-only` |
| `package-lock.json`, `services/trex/package-lock.json` | 1 | 8 alerts; in-range transitive bumps |
| `tests/backend_integration_tests/{pg,hana}/yarn.lock` | 1 | 24 alerts; scoped `yarn upgrade` |
| `plugins/ui/alp-libs/python/{pyqe,pyodidepyqe}/requirements.txt` | 2 | PyJWT + pyarrow direct pins |
| `plugins/ui/alp-libs/python/pyomopql/requirements-dev.txt` | 2 | `wheel` pin |
| `plugins/flows/*/pyproject.toml` (7) | 2 | pyjwt / uv / pyarrow / setuptools pins |
| `plugins/flows/*/pixi.lock` (7) | 3 | Regenerated; gated by `_pixi-lock-check.yml` |
| `.github/dependabot.yml` | 4 | New; declares ecosystems, enables grouping, triggers rescan |
| `plugins/ui/apps/vue-mri-ui-lib/package.json` + `plugins/ui/bun.lock` | 5 | vitest + coverage-v8 + mocker/pretty-format → 4.0.18 |
| `services/alp-logto/connector-physionet-oidc/package.json` | 5 | vitest + coverage-v8 → 4.0.18 |
| `tests/regression/package.json` | 5 | vitest → 4.0.18 |
| `plugins/ui/apps/vue-mri-ui-lib/src/**/__tests__/*.test.ts` | 5 | Only if v4 mock semantics require fixes |

---

### Task 1: Branch and baseline

**Files:** none modified — this task only records state.

- [ ] **Step 1: Create the working branch**

```bash
git checkout -b <github-username>/dependabot-option-a-vitest
```

- [ ] **Step 2: Record the pre-change alert baseline**

```bash
gh api --paginate \
  '/repos/OHDSI/Data2Evidence/dependabot/alerts?state=open&per_page=100' \
  > /tmp/alerts-before.json
jq 'length' /tmp/alerts-before.json
```

Expected: `511` (or close — the number drifts as upstream advisories publish). Keep this file; Task 12 diffs against it.

- [ ] **Step 3: Record the per-manifest breakdown**

```bash
jq -r '.[] | .dependency.manifest_path' /tmp/alerts-before.json \
  | sort | uniq -c | sort -rn > /tmp/alerts-by-manifest.txt
head -20 /tmp/alerts-by-manifest.txt
```

Expected: `plugins/flows/*/uv.lock` paths dominate the top of the list. These are the 288 stale ones.

- [ ] **Step 4: Commit the plan and spec**

```bash
git add trex/plans/2026-08-15-dependabot-upgrades.md trex/specs/2026-08-15-dependabot-upgrades-design.md
git commit -m "plan: dependabot alert remediation (Option A + Vitest)"
```

---

### Task 2: docs/website lockfile (46 alerts, 2 criticals)

**Files:**
- Modify: `docs/website/package-lock.json`

This is the one already proven during design. `npm install --package-lock-only` is a **no-op here** — do not substitute it.

- [ ] **Step 1: Refresh the lockfile**

```bash
cd docs/website
npm update --package-lock-only
```

- [ ] **Step 2: Verify the two criticals moved**

```bash
npm ls shell-quote websocket-driver --all 2>/dev/null | grep -E 'shell-quote|websocket-driver' | sort -u
```

Expected: `shell-quote@1.10.0` and `websocket-driver@0.7.5`. If `shell-quote` is still `1.8.3`, the update did not apply — stop.

- [ ] **Step 3: Verify the build still passes**

```bash
npm ci && npm run build
```

Expected: exit 0, ending with `[SUCCESS] Generated static files in "build".`

- [ ] **Step 4: Confirm the four known-stuck packages are unchanged**

```bash
npm ls webpack serialize-javascript uuid --all 2>/dev/null | grep -cE 'webpack@5.95.0|serialize-javascript@6.0.2|uuid@8.3.2'
```

Expected: a non-zero count. These four are deliberately **not** fixed (spec §2 Unit 1); do not add `overrides` to force them.

- [ ] **Step 5: Commit**

```bash
cd ../..
git add docs/website/package-lock.json
git commit -m "chore(deps): refresh docs/website lockfile for security advisories"
```

---

### Task 3: Root and services/trex npm lockfiles (8 alerts)

**Files:**
- Modify: `package-lock.json`
- Modify: `services/trex/package-lock.json`

- [ ] **Step 1: Update the root lockfile (`undici` → 6.28.0, in-range)**

```bash
npm update undici --package-lock-only
npm ls undici --all 2>/dev/null | grep undici | sort -u
```

Expected: `undici@6.28.0` (or higher within `^6`).

- [ ] **Step 2: Verify the root build**

```bash
npm ci && npm run build:ts
```

Expected: exit 0. This runs `node scripts/embed-assets.mjs && tsc -p scripts/tsconfig.json`.

- [ ] **Step 3: Update services/trex (`brace-expansion` → 5.0.7)**

```bash
cd services/trex
npm update brace-expansion --package-lock-only
npm ls brace-expansion --all 2>/dev/null | grep brace-expansion | sort -u
```

Expected: `brace-expansion@5.0.7` present.

- [ ] **Step 4: Verify the install resolves**

```bash
npm ci
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
cd ../..
git add package-lock.json services/trex/package-lock.json
git commit -m "chore(deps): bump undici and brace-expansion in root and trex lockfiles"
```

---

### Task 4: Integration-test yarn lockfiles (24 alerts)

**Files:**
- Modify: `tests/backend_integration_tests/pg/yarn.lock`
- Modify: `tests/backend_integration_tests/hana/yarn.lock`

These are yarn 1 classic lockfiles. Scope the upgrade to the alerting packages — a bare `yarn upgrade` rewrites the whole tree.

- [ ] **Step 1: List the alerting packages for these two manifests**

```bash
jq -r '.[] | select(.dependency.manifest_path | test("backend_integration_tests"))
       | "\(.dependency.manifest_path)  \(.dependency.package.name)"' \
  /tmp/alerts-before.json | sort -u
```

Expected: a list of package names, 12 per directory. Use exactly these names in Step 2.

- [ ] **Step 2: Upgrade only those packages, in both directories**

Derive the package list mechanically so nothing is missed or mistyped:

```bash
PKGS=$(jq -r '.[] | select(.dependency.manifest_path | test("backend_integration_tests"))
              | .dependency.package.name' /tmp/alerts-before.json | sort -u | tr '\n' ' ')
echo "Upgrading: $PKGS"
(cd tests/backend_integration_tests/pg   && yarn upgrade $PKGS)
(cd tests/backend_integration_tests/hana && yarn upgrade $PKGS)
```

Expected: `$PKGS` is non-empty and both upgrades exit 0. An empty `$PKGS` means Task 1 Step 2 did not produce a usable baseline — go back and fix that first.

- [ ] **Step 3: Verify both lockfiles still install cleanly**

```bash
(cd tests/backend_integration_tests/pg && yarn install --frozen-lockfile)
(cd tests/backend_integration_tests/hana && yarn install --frozen-lockfile)
```

Expected: exit 0 for both. A `Your lockfile needs to be updated` error means Step 2 left the lock inconsistent — stop.

- [ ] **Step 4: Sanity-check the diff size**

```bash
git diff --stat tests/backend_integration_tests/
```

Expected: changes confined to the two `yarn.lock` files. If hundreds of unrelated entries moved, reset and redo Step 2 with a tighter package list.

- [ ] **Step 5: Commit**

```bash
git add tests/backend_integration_tests/pg/yarn.lock tests/backend_integration_tests/hana/yarn.lock
git commit -m "chore(deps): patch vulnerable transitives in integration-test lockfiles"
```

---

### Task 5: Python pins outside pixi

**Files:**
- Modify: `plugins/ui/alp-libs/python/pyqe/requirements.txt` (lines 3, 8)
- Modify: `plugins/ui/alp-libs/python/pyodidepyqe/requirements.txt` (line 4)
- Modify: `plugins/ui/alp-libs/python/pyomopql/requirements-dev.txt` (line 10)

`requirements-dev.txt` in `pyqe` and `pyodidepyqe` starts with `-r requirements.txt`, so editing the two `requirements.txt` files also clears the dev-file alerts.

- [ ] **Step 1: Apply the pins**

```bash
cd plugins/ui/alp-libs/python
sed -i 's/^PyJWT==2\.12\.0$/PyJWT==2.13.0/' pyqe/requirements.txt pyodidepyqe/requirements.txt
sed -i 's/^pyarrow==17\.0\.0$/pyarrow==23.0.1/' pyqe/requirements.txt
sed -i 's/^wheel==0\.45\.1$/wheel==0.46.2/' pyomopql/requirements-dev.txt
cd ../../../..
```

- [ ] **Step 2: Verify all four edits landed**

```bash
grep -nE '^(PyJWT|pyarrow)' plugins/ui/alp-libs/python/pyqe/requirements.txt \
                            plugins/ui/alp-libs/python/pyodidepyqe/requirements.txt
grep -n '^wheel' plugins/ui/alp-libs/python/pyomopql/requirements-dev.txt
```

Expected: `PyJWT==2.13.0` in both files, `pyarrow==23.0.1` in pyqe, `wheel==0.46.2` in pyomopql.

- [ ] **Step 3: Reproduce CI's Python version and install**

CI runs Python **3.11** (`ui-pyqe-test.yml`); the sandbox default is 3.13. The `pyarrow` 17 → 23 jump is six majors, so verify on 3.11 if available.

```bash
cd plugins/ui
python3.11 -m venv /tmp/pyqe-venv 2>/dev/null || python3 -m venv /tmp/pyqe-venv
/tmp/pyqe-venv/bin/python -m pip install --upgrade pip
/tmp/pyqe-venv/bin/pip install -r alp-libs/python/pyqe/requirements-dev.txt
```

Expected: exit 0, resolving `pyarrow-23.0.1` and `PyJWT-2.13.0`. If 3.11 was unavailable, note in the PR that the resolve was checked on 3.13 and CI is the authority.

- [ ] **Step 4: Run the pyqe suite — this is the gate for the pyarrow jump**

```bash
/tmp/pyqe-venv/bin/python -m pytest alp-libs/python/pyqe/
cd ../..
```

Expected: all tests pass. Failures here are real — pyarrow 23 removed APIs deprecated in 17. Do not proceed to Task 6 with a red suite; report instead.

- [ ] **Step 5: Commit**

```bash
git add plugins/ui/alp-libs/python/pyqe/requirements.txt \
        plugins/ui/alp-libs/python/pyodidepyqe/requirements.txt \
        plugins/ui/alp-libs/python/pyomopql/requirements-dev.txt
git commit -m "chore(deps): bump PyJWT, pyarrow and wheel in python libs"
```

---

### Task 6: Flow plugin Python pins

**Files:**
- Modify: `plugins/flows/{base,data_management,data_transformation,hades,i2b2,loyalty_score,search_embedding}/pyproject.toml`

`search_embedding` **is** in scope — it pins both `pyjwt` and `uv`. Do not skip it (spec §2 Unit 3).

- [ ] **Step 1: Apply pyjwt and uv pins across all 7 manifests**

```bash
sed -i 's/"pyjwt==2\.12\.0"/"pyjwt==2.13.0"/g' plugins/flows/*/pyproject.toml
sed -i 's/"uv==0\.11\.6"/"uv==0.11.15"/g'      plugins/flows/*/pyproject.toml
```

- [ ] **Step 2: Apply the data_transformation-only pins**

```bash
sed -i 's/"pyarrow==22\.0\.0"/"pyarrow==23.0.1"/'    plugins/flows/data_transformation/pyproject.toml
sed -i 's/"setuptools==80\.9\.0"/"setuptools==83.0.0"/' plugins/flows/data_transformation/pyproject.toml
```

- [ ] **Step 3: Verify the expected counts**

```bash
echo -n "pyjwt 2.13.0 pins (expect 8): "; grep -c '"pyjwt==2.13.0"' plugins/flows/*/pyproject.toml | awk -F: '{s+=$2} END {print s}'
echo -n "uv 0.11.15 pins (expect 6):   "; grep -c '"uv==0.11.15"'  plugins/flows/*/pyproject.toml | awk -F: '{s+=$2} END {print s}'
echo -n "stale pins remaining (expect 0): "; grep -c '"pyjwt==2.12.0"\|"uv==0.11.6"' plugins/flows/*/pyproject.toml | awk -F: '{s+=$2} END {print s}'
grep -n 'pyarrow\|setuptools' plugins/flows/data_transformation/pyproject.toml
```

Expected: 8, 6, 0, and `pyarrow==23.0.1` / `setuptools==83.0.0`.

- [ ] **Step 4: Confirm 7 manifests changed**

```bash
git diff --name-only plugins/flows/ | wc -l
```

Expected: `7`. If `6`, `search_embedding` was missed.

- [ ] **Step 5: Commit (locks follow in Task 7)**

```bash
git add plugins/flows/*/pyproject.toml
git commit -m "chore(deps): bump pyjwt, uv, pyarrow and setuptools in flow plugins"
```

---

### Task 7: Regenerate pixi lockfiles

**Files:**
- Modify: `plugins/flows/{base,data_management,data_transformation,hades,i2b2,loyalty_score,search_embedding}/pixi.lock`

The highest-risk task. Gate 2 (`no pypi sdists`) is what fails.

- [ ] **Step 1: Install pixi v0.72.2 — the exact CI version**

```bash
curl -fsSL https://pixi.sh/install.sh | PIXI_VERSION=v0.72.2 bash
export PATH="$HOME/.pixi/bin:$PATH"
pixi --version
```

Expected: `pixi 0.72.2`. Any other version — stop; a different resolver produces a lock CI will reject.

- [ ] **Step 2: Regenerate the 7 changed locks**

```bash
export PATH="$HOME/.pixi/bin:$PATH"
for d in base data_management data_transformation hades i2b2 loyalty_score search_embedding; do
  echo "=== $d"
  pixi lock --manifest-path plugins/flows/$d/pyproject.toml || echo "FAILED: $d"
done
```

Expected: each completes without `FAILED`. Resolution downloads metadata; allow several minutes for `search_embedding` (torch + transformers).

- [ ] **Step 3: Run gate 2 — the sdist check — exactly as CI does**

```bash
for d in base data_management data_transformation hades i2b2 loyalty_score search_embedding; do
  hits=$(grep -E 'pypi: https.*\.tar\.gz' plugins/flows/$d/pixi.lock | grep -vE 'lzstring-|pandasql-')
  if [ -n "$hits" ]; then echo "SDIST IN $d:"; echo "$hits"; else echo "OK: $d"; fi
done
```

Expected: `OK:` for all seven. **If any sdist appears**, that transitive has no wheel for the target platform — pin it back to its last wheel-bearing version in that env's `pyproject.toml`, re-run Step 2 for that directory, and re-check. Report which package forced the pin.

- [ ] **Step 4: Run gate 1 — `--check` on all eight manifests**

```bash
export PATH="$HOME/.pixi/bin:$PATH"
for d in plugins/flows/base plugins/flows/data_management plugins/flows/data_transformation \
         plugins/flows/hades plugins/flows/i2b2 plugins/flows/loyalty_score \
         plugins/flows/search_embedding services/alp-dataflow-gen-worker; do
  pixi lock --check --manifest-path $d/pyproject.toml && echo "OK: $d" || echo "STALE: $d"
done
```

Expected: `OK:` for all eight. `services/alp-dataflow-gen-worker` must pass **without** being regenerated — it has no in-scope edits.

- [ ] **Step 5: Review the lock diff for unintended drift**

```bash
git diff --stat plugins/flows/
```

Expected: exactly 7 `pixi.lock` files. Skim `search_embedding`'s diff first and confirm `torch` stays at `2.6.0` and `transformers` at `4.57.6` — neither is in scope.

- [ ] **Step 6: Commit**

```bash
git add plugins/flows/*/pixi.lock
git commit -m "chore(deps): regenerate pixi lockfiles for updated python pins"
```

---

### Task 8: Vitest — vue-mri-ui-lib (84 test files)

**Files:**
- Modify: `plugins/ui/apps/vue-mri-ui-lib/package.json` (lines 64, 65, 66, 85)
- Modify: `plugins/ui/bun.lock`
- Modify (only if required): `plugins/ui/apps/vue-mri-ui-lib/src/**/__tests__/*.test.ts`

Target is **4.0.18**. If the team chose 3.2.6 instead, substitute `^3.2.6` for `^4.0.18` in Step 2 and leave `@vitest/mocker` / `@vitest/pretty-format` at their current `^4.0.17` — nothing else in this task changes.

- [ ] **Step 1: Install the CI bun version (1.2.23, not the sandbox's 1.3.14)**

```bash
curl -fsSL https://bun.sh/install | BUN_INSTALL=/tmp/bun bash -s "bun-v1.2.23"
/tmp/bun/bin/bun --version
```

Expected: `1.2.23`.

- [ ] **Step 2: Capture the baseline, then bump the four versions**

```bash
cd plugins/ui
/tmp/bun/bin/bun install
/tmp/bun/bin/bunx nx run vue-mri:test:ci 2>&1 | tail -20 > /tmp/vue-mri-before.txt
cat /tmp/vue-mri-before.txt
```

Record the pass/fail counts — you need them to tell pre-existing failures from ones the upgrade caused.

```bash
sed -i 's/"@vitest\/coverage-v8": "\^1\.2\.2"/"@vitest\/coverage-v8": "^4.0.18"/' apps/vue-mri-ui-lib/package.json
sed -i 's/"@vitest\/mocker": "\^4\.0\.17"/"@vitest\/mocker": "^4.0.18"/'         apps/vue-mri-ui-lib/package.json
sed -i 's/"@vitest\/pretty-format": "\^4\.0\.17"/"@vitest\/pretty-format": "^4.0.18"/' apps/vue-mri-ui-lib/package.json
sed -i 's/"vitest": "\^1\.2\.2"/"vitest": "^4.0.18"/'                             apps/vue-mri-ui-lib/package.json
grep -nE '"(vitest|@vitest/)' apps/vue-mri-ui-lib/package.json
```

Expected: all four now read `^4.0.18`.

- [ ] **Step 3: Reinstall and confirm the duplicate trees collapsed**

```bash
/tmp/bun/bin/bun install
grep -oE '"(vitest|@vitest/expect)@[0-9][^"]*"' bun.lock | sort -u
```

Expected: no `1.6.1` entries remain. Some `3.2.6` entries persist — `apps/jobs` legitimately uses them.

- [ ] **Step 4: Run the suite**

```bash
/tmp/bun/bin/bunx nx run vue-mri:test:ci
```

Expected: pass count matches `/tmp/vue-mri-before.txt`. Coverage must still emit — `test:ci` is `vitest run --coverage`, so a coverage-v8 mismatch surfaces as a provider error here, not as test failures.

- [ ] **Step 5: Fix any v4 mock-semantics failures**

Only if Step 4 shows *new* failures. The two expected causes (spec §2 Unit 5):

1. A mock called with `new` now constructs the instance instead of calling `mock.apply`. Where a test asserted on `mock.mock.calls` for a constructor, switch to `mock.mock.instances`.
2. Automocked getters now return `undefined`. Where a test relied on an auto-mocked getter's value, set it explicitly:

```ts
vi.spyOn(someObject, 'someGetter', 'get').mockReturnValue(expectedValue)
```

Re-run Step 4 until the count matches the baseline. If a failure is neither of these, stop and report it — it may be a real regression in the upgrade.

- [ ] **Step 6: Commit**

```bash
cd ../..
git add plugins/ui/apps/vue-mri-ui-lib/package.json plugins/ui/bun.lock
git add plugins/ui/apps/vue-mri-ui-lib/src 2>/dev/null || true
git commit -m "chore(deps): upgrade vue-mri-ui-lib to vitest 4"
```

---

### Task 9: Vitest — logto connector (no CI gate)

**Files:**
- Modify: `services/alp-logto/connector-physionet-oidc/package.json` (lines 62, 70)

No workflow runs this suite. The local run in Step 3 is the **only** verification this change will ever get.

- [ ] **Step 1: Bump both versions**

```bash
cd services/alp-logto/connector-physionet-oidc
sed -i 's/"@vitest\/coverage-v8": "\^2\.1\.8"/"@vitest\/coverage-v8": "^4.0.18"/' package.json
sed -i 's/"vitest": "\^2\.1\.8"/"vitest": "^4.0.18"/' package.json
grep -nE '"(vitest|@vitest/coverage-v8)"' package.json
```

Expected: both read `^4.0.18`.

- [ ] **Step 2: Install**

```bash
pnpm install
```

Expected: exit 0. No lockfile is committed here, so this resolves fresh.

- [ ] **Step 3: Run the suite with coverage**

```bash
pnpm run test:ci
```

Expected: both test files pass and a coverage summary prints. `test:ci` is `vitest src --silent --coverage`.

- [ ] **Step 4: Confirm the build still works**

```bash
pnpm run check && pnpm run build
cd ../../..
```

Expected: exit 0 for both (`tsc --noEmit`, then `tsup`).

- [ ] **Step 5: Commit**

```bash
git add services/alp-logto/connector-physionet-oidc/package.json
git commit -m "chore(deps): upgrade physionet connector to vitest 4"
```

---

### Task 10: Vitest — tests/regression

**Files:**
- Modify: `tests/regression/package.json` (line 15)

The suite itself needs a live stack (`_test-regression.yml`: 60-minute job, prepulled flow images, `REG_URL`). Verify install and collection only; CI runs the real thing.

- [ ] **Step 1: Bump vitest**

```bash
cd tests/regression
sed -i 's/"vitest": "\^1\.0\.0"/"vitest": "^4.0.18"/' package.json
grep -n '"vitest"' package.json
```

Expected: `"vitest": "^4.0.18"`.

- [ ] **Step 2: Install**

```bash
npm install
npx vitest --version
```

Expected: `vitest/4.0.18`.

- [ ] **Step 3: Confirm the config is still accepted and tests collect**

```bash
npx vitest list
```

Expected: the test names from the 2 spec files print. This parses `vitest.config.ts` — so it proves `testTimeout`, `hookTimeout` and `globalSetup` are all still valid v4 options — without needing the stack. An error mentioning `globalSetup` means a real migration issue; report it.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
cd ../..
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add tests/regression/package.json
git commit -m "chore(deps): upgrade regression tests to vitest 4"
```

---

### Task 11: Add `.github/dependabot.yml`

**Files:**
- Create: `.github/dependabot.yml`

Two deliberate omissions, both load-bearing:
- **`plugins/flows/*` is absent** — Dependabot has no pixi parser. Listing those directories would recreate the exact stale-alert problem this PR is cleaning up.
- **`plugins/ui` is included but flagged** — it is a `bun.lock` workspace, and Dependabot's bun support is comparatively new. Task 12 checks whether it actually gets scanned.

- [ ] **Step 1: Write the file**

```yaml
version: 2

updates:
  - package-ecosystem: "npm"
    directories:
      - "/"
      - "/docs/website"
      - "/services/trex"
      - "/services/alp-logto/connector-physionet-oidc"
      - "/tests/backend_integration_tests/pg"
      - "/tests/backend_integration_tests/hana"
      - "/tests/regression"
      - "/plugins/ui"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    groups:
      npm-minor-and-patch:
        patterns:
          - "*"
        update-types:
          - "minor"
          - "patch"

  - package-ecosystem: "pip"
    directories:
      - "/plugins/ui/alp-libs/python/pyqe"
      - "/plugins/ui/alp-libs/python/pyodidepyqe"
      - "/plugins/ui/alp-libs/python/pyomopql"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    groups:
      pip-minor-and-patch:
        patterns:
          - "*"
        update-types:
          - "minor"
          - "patch"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      actions-minor-and-patch:
        patterns:
          - "*"
        update-types:
          - "minor"
          - "patch"
```

- [ ] **Step 2: Validate the YAML parses**

```bash
python3 -c "import yaml,sys; d=yaml.safe_load(open('.github/dependabot.yml')); print('version:', d['version']); print('ecosystems:', [u['package-ecosystem'] for u in d['updates']])"
```

Expected: `version: 2` and `ecosystems: ['npm', 'pip', 'github-actions']`.

- [ ] **Step 3: Confirm every listed directory exists**

```bash
python3 - <<'PY'
import yaml, os
d = yaml.safe_load(open('.github/dependabot.yml'))
for u in d['updates']:
    for p in u.get('directories', [u.get('directory')]):
        print(('OK   ' if os.path.isdir('.' + p) else 'MISS ') + p)
PY
```

Expected: every line `OK`. A `MISS` means a typo — Dependabot silently ignores bad paths, so this check matters.

- [ ] **Step 4: Confirm no pixi directory slipped in**

```bash
grep -c 'plugins/flows' .github/dependabot.yml
```

Expected: `0`.

- [ ] **Step 5: Commit**

```bash
git add .github/dependabot.yml
git commit -m "ci: add dependabot config with grouped updates"
```

---

### Task 12: Full verification, PR, and post-merge rescan

**Files:** none modified.

- [ ] **Step 1: Confirm the changed-file set matches the spec**

```bash
git diff --name-only origin/develop...HEAD | sort
```

Expected: matches spec §8. Anything else — especially an unrelated source file — must be explained or reverted.

- [ ] **Step 2: Re-run every local gate in one pass**

```bash
export PATH="$HOME/.pixi/bin:$PATH"
set -e
(cd docs/website && npm ci && npm run build)
(cd tests/backend_integration_tests/pg   && yarn install --frozen-lockfile)
(cd tests/backend_integration_tests/hana && yarn install --frozen-lockfile)
(cd plugins/ui && /tmp/bun/bin/bun install && /tmp/bun/bin/bunx nx run vue-mri:test:ci)
(cd services/alp-logto/connector-physionet-oidc && pnpm install && pnpm run test:ci)
for d in plugins/flows/base plugins/flows/data_management plugins/flows/data_transformation \
         plugins/flows/hades plugins/flows/i2b2 plugins/flows/loyalty_score \
         plugins/flows/search_embedding services/alp-dataflow-gen-worker; do
  pixi lock --check --manifest-path $d/pyproject.toml
done
set +e
```

Expected: exit 0 throughout.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin HEAD
gh pr create --base develop \
  --title "chore(deps): remediate Dependabot alerts (Option A + Vitest)" \
  --body "$(cat <<'EOF'
Targets 154 live Dependabot alerts, including all 5 criticals.

**Units**
1. npm lockfile refreshes — docs/website (46), integration-test yarn locks (24), root + trex (8)
2. Python direct pins — pyjwt, uv, pyarrow, setuptools, wheel (78)
3. pixi lockfile regeneration — 7 of 8 manifests
4. `.github/dependabot.yml` — new; enables grouped updates
5. Vitest 1.x/2.x → 4.0.18 across 3 packages (3 alerts, 3 criticals)

**Excluded by team decision:** Prefect, ECharts, Nx (51 alerts). **No upstream fix:** torch,
transformers, image-size, request (18 alerts).

**On the 288 stale alerts:** they reference `plugins/flows/*/uv.lock`, deleted in the uv → pixi
migration. Dependabot has no pixi parser, so it never rescanned. Landing the config should trigger
a rescan that clears them. That outcome is **not claimed here** — actual counts will be posted as a
follow-up comment once Dependabot has rescanned `develop`.

Design spec: `trex/specs/2026-08-15-dependabot-upgrades-design.md`
EOF
)"
```

- [ ] **Step 4: After CI, confirm the five gates are green**

Check: `website-build-check.yaml`, `_pixi-lock-check.yml` (8 jobs), `ui-test-vue.yml`, `ui-pyqe-test.yml`, `_test-regression.yml`.

Expected: all green. `_test-regression` takes up to 60 minutes.

- [ ] **Step 5: After merge, wait for the rescan and measure**

Do not run this until the PR is merged to `develop` **and** Dependabot has had time to rescan (allow several hours).

```bash
gh api --paginate \
  '/repos/OHDSI/Data2Evidence/dependabot/alerts?state=open&per_page=100' \
  > /tmp/alerts-after.json
echo "before: $(jq 'length' /tmp/alerts-before.json)"
echo "after:  $(jq 'length' /tmp/alerts-after.json)"
jq -r '.[] | .dependency.manifest_path' /tmp/alerts-after.json | sort | uniq -c | sort -rn | head -20
```

Expected: `after` ≈ 69 (51 excluded + 18 unfixable). Confirm no `uv.lock` paths remain — that is the stale-alert cleanup landing.

- [ ] **Step 6: Verify the bun workspace is actually being scanned**

```bash
jq -r '.[] | .dependency.manifest_path' /tmp/alerts-after.json | grep -c 'plugins/ui' || echo "no plugins/ui alerts"
gh api /repos/OHDSI/Data2Evidence/dependabot/alerts --paginate | jq -r '.[].dependency.manifest_path' | grep bun || echo "bun.lock not scanned"
```

If `bun.lock` is not scanned, note it in the follow-up comment as a known gap — the `plugins/ui` entry in `dependabot.yml` is then decorative and the workspace needs manual review until Dependabot's bun support lands.

- [ ] **Step 7: Post the actual numbers**

```bash
gh pr comment <PR-NUMBER> --body "Post-merge Dependabot rescan: <before> → <after> open alerts. Remaining: <n> excluded (Prefect/ECharts/Nx), <n> with no upstream fix. Stale uv.lock alerts: <cleared / still present>."
```

Substitute the real numbers from Step 5. This is the only place alert resolution gets asserted.

---

## Rollback

Each unit is one commit, so `git revert <sha>` isolates any regression. Highest-risk first:

| Symptom | Revert |
|---|---|
| `_pixi-lock-check` fails, cause not obvious | Task 7 commit, then Task 6 (locks must match manifests — revert both or neither) |
| `ui-test-vue` red | Task 8 commit |
| `ui-pyqe-test` red | Task 5 commit |
| Docs site build broken | Task 2 commit |
| Dependabot opens a flood of PRs | Task 11 commit; lower `open-pull-requests-limit` and re-land |
