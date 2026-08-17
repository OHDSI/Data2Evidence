# Preserve Typed Edits in ManageViewerDialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use devx:subagent-driven-development (recommended) or devx:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `ManageViewerDialog` from discarding a name, code or query the user has typed when an in-flight or re-triggered fetch resolves — which is also the root cause of the intermittent `demosetup-dev` patient-analytics E2E failure.

**Architecture:** All the damage happens in one 175-line hook, `useViewerData`. Three defects compound: (1) a resolving fetch unconditionally overwrites edit-bearing state, (2) `initialLoading` starts `false` so the dialog claims "not loading" for the first paint, before the fetch has even started, and (3) there is no stale-response guard, so overlapping fetches can land out of order. The fix adds a dirty flag (ref-based, so the async closure reads a current value), a monotonic request-id guard, and corrects the initial loading state. No component API changes.

**Tech Stack:** React 18 + TypeScript, CRA (`react-scripts test` → Jest + jsdom), `@testing-library/react` 13, `@testing-library/jest-dom` 6, nx + bun.

**Background:** `trex/specs/2026-08-15-dependabot-upgrades-design.md` is unrelated — do not conflate. The CI evidence for this bug is PR #3131 run `31889876156` and `develop` run `31894889423`.

---

## Root cause (read before starting)

The E2E test `tests/e2e/tests/09-patient-analytics/wizard.spec.ts` fails with the "Enter new name" box empty. The failure snapshot shows `Name = __new__`, `New name = ""` — exactly the state `fetchData` writes at `useViewerData.ts:73-78` when `codes.length === 0`.

Sequence:

1. Dialog mounts with `open=true`. `initialLoading` is initialised `false` (`useViewerData.ts:45`).
2. React paints once **before** the effect at line 107 runs. In that frame the dialog is visible and the loading element is absent.
3. The E2E helper `waitForDashboardDialog()` asserts `.manage-viewer-dialog__loading` `toBeHidden()`. Playwright passes that immediately for an absent element, so the test proceeds.
4. The test fills the name. State is correct at this moment.
5. `fetchData` resolves and unconditionally runs `setName("")` / `setCode("")`. **The typed name is gone.**
6. Downstream the Shiny asset is built without the expected name, so the researcher-portal dashboard never renders — the second, later `toBeVisible` timeout in the other shard.

A human hits the same bug: type a name fast enough after opening the dialog and it is silently erased.

**Scope note the team should know:** the decision was worded "preserve typed edits when switching viewer type". Switching **Viewer type** (R ↔ Python, `setTemplateLanguage`, `ManageViewerDialog.tsx:332`) does *not* currently refetch, so it is not itself destructive. The destructive refetch is triggered by **Config type** (`setCodeType`, `ManageViewerDialog.tsx:300`), because `codeType` is a dependency of `fetchData` (`useViewerData.ts:105`), plus the open-race above. This plan preserves edits across *any* refetch, which covers the intended behaviour and the actual bug. Nothing in the plan depends on that wording being re-litigated.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `plugins/ui/apps/portal/src/plugins/SystemAdmin/StudyOverview/ManageViewerDialog/hooks/useViewerData.ts` | Owns all dialog data state and fetching | Modify — dirty flag, request-id guard, initial loading |
| `plugins/ui/apps/portal/src/plugins/SystemAdmin/StudyOverview/ManageViewerDialog/hooks/__tests__/useViewerData.test.tsx` | Unit tests for the above | Create |

`ManageViewerDialog.tsx`, `CodeNameSelect.tsx` and `useQueryManagement.ts` are **not** modified — the hook's returned shape is unchanged.

---

## Ground rules

- Run every command from `plugins/ui` unless stated otherwise.
- `react-scripts test` watches by default. Always prefix `CI=true` locally, as CI does.
- Do **not** change `tests/e2e/**` in this plan. The E2E is the acceptance signal, not the fix.
- Commit after each task.

---

### Task 1: Failing test — typed name survives a late-resolving fetch

**Files:**
- Create: `plugins/ui/apps/portal/src/plugins/SystemAdmin/StudyOverview/ManageViewerDialog/hooks/__tests__/useViewerData.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useViewerData } from "../useViewerData";
import { ConfigStrategy } from "../../configStrategies";

const DASHBOARD_NAME = "cross-sectional-demographics";

type StrategyOverrides = Partial<ConfigStrategy>;

const makeStrategy = (overrides: StrategyOverrides = {}): ConfigStrategy => ({
  fetchTemplates: jest.fn().mockResolvedValue([]),
  fetchCodes: jest.fn().mockResolvedValue([]),
  fetchStrategusCode: jest.fn().mockResolvedValue(""),
  saveCode: jest.fn().mockResolvedValue(undefined),
  supportsMultipleCodes: true,
  supportsQueries: true,
  ...overrides,
});

const Harness: React.FC<{
  strategy: ConfigStrategy;
  open: boolean;
  codeType: "dashboard" | "cohort";
}> = ({ strategy, open, codeType }) => {
  const { name, code, initialLoading, updateName, updateCode } = useViewerData({
    open,
    configId: "cfg-1",
    configType: "dashboard",
    codeType,
    strategy,
  });
  return (
    <>
      <div data-testid="name">{name}</div>
      <div data-testid="code">{code}</div>
      <div data-testid="loading">{String(initialLoading)}</div>
      <button data-testid="type-name" onClick={() => updateName(DASHBOARD_NAME)}>
        type name
      </button>
      <button data-testid="type-code" onClick={() => updateCode("print('hi')")}>
        type code
      </button>
    </>
  );
};

describe("useViewerData", () => {
  it("keeps a name the user typed while the initial fetch is still in flight", async () => {
    let resolveCodes: (value: []) => void = () => undefined;
    const codesPromise = new Promise<[]>((resolve) => {
      resolveCodes = resolve;
    });
    const strategy = makeStrategy({ fetchCodes: jest.fn(() => codesPromise as never) });

    render(<Harness strategy={strategy} open codeType="dashboard" />);

    fireEvent.click(screen.getByTestId("type-name"));
    expect(screen.getByTestId("name")).toHaveTextContent(DASHBOARD_NAME);

    await act(async () => {
      resolveCodes([]);
    });

    expect(screen.getByTestId("name")).toHaveTextContent(DASHBOARD_NAME);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd plugins/ui
CI=true bunx nx run portal:test -- --testPathPattern=useViewerData
```

Expected: **FAIL**. The `name` element renders empty because `fetchData` ran `setName("")` after the click. The assertion reports an element with no text content where `cross-sectional-demographics` was expected.

If it *passes*, stop — the bug is not reproduced and the rest of the plan is invalid. Re-check that `fetchCodes` resolves to `[]`.

- [ ] **Step 3: Commit the failing test**

```bash
cd ../..
git add plugins/ui/apps/portal/src/plugins/SystemAdmin/StudyOverview/ManageViewerDialog/hooks/__tests__/useViewerData.test.tsx
git commit -m "test(portal): reproduce ManageViewerDialog dropping typed name on fetch resolve"
```

---

### Task 2: Preserve edits and guard stale responses

**Files:**
- Modify: `plugins/ui/apps/portal/src/plugins/SystemAdmin/StudyOverview/ManageViewerDialog/hooks/useViewerData.ts`

- [ ] **Step 1: Extend the React import**

Replace line 1. `useViewerData.ts` imports named hooks only — there is no `React` namespace in scope — so `Dispatch` and `SetStateAction` must be imported by name, not written as `React.Dispatch`:

```ts
import { useState, useEffect, useCallback, useRef, Dispatch, SetStateAction } from "react";
```

- [ ] **Step 2: Add the two refs**

Immediately after the `initialLoading` state declaration (currently line 45), add:

```ts
  // Set once the user edits name/code/queries. While true, a resolving fetch must
  // not overwrite their input — see the dialog's open-race in the plan.
  const dirtyRef = useRef(false);
  // Monotonic id so an older, slower fetch cannot clobber a newer one's result.
  const requestIdRef = useRef(0);
```

- [ ] **Step 3: Replace `fetchData` entirely**

Replace the whole `fetchData` callback (currently lines 47-105) with:

```ts
  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isStale = () => requestId !== requestIdRef.current;

    setInitialLoading(true);
    try {
      let fetchedTemplates: StudyDashboardTemplateData[] = [];
      try {
        fetchedTemplates = await strategy.fetchTemplates();
      } catch (error) {
        console.error("Failed to fetch templates:", error);
      }
      if (isStale()) return;
      setTemplates(fetchedTemplates);

      if (strategy.supportsMultipleCodes) {
        let codes: ViewerCodeWithQueries[] = [];
        let failed = false;
        try {
          codes = await strategy.fetchCodes(configId, codeType);
        } catch (error) {
          console.error("Failed to fetch codes:", error);
          failed = true;
        }
        if (isStale()) return;

        setSavedCodes(failed ? [] : codes);

        // The user has already typed something — the server list is still worth
        // showing, but their edits win.
        if (dirtyRef.current) return;

        if (!failed && codes.length > 0) {
          const firstCode = codes[0];
          setIsNewName(false);
          setName(firstCode.name);
          setCode(firstCode.code);
          setOriginalCode(firstCode.code);
          setQueries(firstCode.queries.map((q) => ({ queryName: q.queryName, sql: q.sql })));
          setOriginalQueryNames(firstCode.queries.map((q) => q.queryName));
        } else {
          setIsNewName(true);
          setName("");
          setCode("");
          setOriginalCode("");
          setQueries([]);
          setOriginalQueryNames([]);
        }
      } else {
        // Strategus - single code
        let fetchedCode = "";
        try {
          fetchedCode = await strategy.fetchStrategusCode(configId);
        } catch (error) {
          console.error("Failed to fetch viewer code:", error);
        }
        if (isStale()) return;
        if (dirtyRef.current) return;
        setCode(fetchedCode);
        setOriginalCode(fetchedCode);
      }
    } finally {
      if (!isStale()) setInitialLoading(false);
    }
  }, [configId, codeType, strategy]);
```

Note: `setIsNewName(false)` moved from before the fetch into the success branch. Previously it flipped the UI to "existing name" mode before any data arrived, which made the dialog flicker between modes on every refetch.

- [ ] **Step 4: Reset the dirty flag when the dialog opens**

Replace the effect (currently lines 107-110) with:

```ts
  useEffect(() => {
    if (!open) return;
    // A freshly opened dialog has no user edits to protect.
    dirtyRef.current = false;
    fetchData();
  }, [open, fetchData]);
```

- [ ] **Step 5: Mark edits dirty, and clear it on explicit load/save**

Replace `selectCode`'s first line, and the `updateCode` / `updateName` / `markSaved` callbacks (currently lines 112-156), so the flag is maintained. Add `dirtyRef.current = false;` as the first statement inside `selectCode`:

```ts
  const selectCode = useCallback((selectedName: string) => {
    // Explicitly loading a different code discards the working copy by design.
    dirtyRef.current = false;
    if (selectedName === "__new__") {
```

…leave the rest of `selectCode` unchanged. Then replace `updateCode`, `updateName` and `markSaved`:

```ts
  const updateCode = useCallback((newCode: string) => {
    dirtyRef.current = true;
    setCode(newCode);
  }, []);

  const updateName = useCallback((newName: string) => {
    dirtyRef.current = true;
    setName(newName);
  }, []);

  const updateQueries = useCallback<Dispatch<SetStateAction<QueryEntry[]>>>((value) => {
    dirtyRef.current = true;
    setQueries(value);
  }, []);

  const markSaved = useCallback(() => {
    dirtyRef.current = false;
    setOriginalCode(code);
    const currentQueryNames = queries.filter((q) => q.queryName).map((q) => q.queryName);
    setOriginalQueryNames(currentQueryNames);
  }, [code, queries]);
```

- [ ] **Step 6: Return the tracked query setter**

In the return object (currently line 168), replace `setQueries,` with:

```ts
    setQueries: updateQueries,
```

The key stays `setQueries`, so `ManageViewerDialog.tsx` and `useQueryManagement` need no change.

- [ ] **Step 7: Run the test**

```bash
cd plugins/ui
CI=true bunx nx run portal:test -- --testPathPattern=useViewerData
```

Expected: **PASS** (1 test).

- [ ] **Step 8: Typecheck**

```bash
cd apps/portal
npx tsc --noEmit -p tsconfig.json
cd ../..
```

Expected: exit 0. The `Dispatch`/`SetStateAction` import from Step 1 is what makes `updateQueries` typecheck against the `setQueries` consumers in `useQueryManagement`.

- [ ] **Step 9: Commit**

```bash
cd ../..
git add plugins/ui/apps/portal/src/plugins/SystemAdmin/StudyOverview/ManageViewerDialog/hooks/useViewerData.ts
git commit -m "fix(portal): preserve typed edits when ManageViewerDialog refetches"
```

---

### Task 3: Report loading from the first paint

**Files:**
- Modify: `plugins/ui/apps/portal/src/plugins/SystemAdmin/StudyOverview/ManageViewerDialog/hooks/useViewerData.ts:45`
- Modify: `plugins/ui/apps/portal/src/plugins/SystemAdmin/StudyOverview/ManageViewerDialog/hooks/__tests__/useViewerData.test.tsx`

Task 2 makes the data safe. This closes the window where the dialog *looks* ready before the fetch begins — the thing the E2E's `toBeHidden()` check trips over.

- [ ] **Step 1: Add the failing test**

Append inside the existing `describe("useViewerData", ...)` block:

```tsx
  it("reports loading on the first render when opened, before the fetch resolves", () => {
    const strategy = makeStrategy({
      fetchCodes: jest.fn(() => new Promise(() => undefined) as never),
    });

    render(<Harness strategy={strategy} open codeType="dashboard" />);

    expect(screen.getByTestId("loading")).toHaveTextContent("true");
  });
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd plugins/ui
CI=true bunx nx run portal:test -- --testPathPattern=useViewerData
```

Expected: **FAIL** on the new test — received `false`, because `initialLoading` is initialised `false` and the effect has not run yet. The Task 1 test still passes.

- [ ] **Step 3: Initialise from `open`**

Replace line 45 of `useViewerData.ts`:

```ts
  const [initialLoading, setInitialLoading] = useState(open);
```

- [ ] **Step 4: Run the tests**

```bash
CI=true bunx nx run portal:test -- --testPathPattern=useViewerData
```

Expected: **PASS** (2 tests).

- [ ] **Step 5: Commit**

```bash
cd ../..
git add plugins/ui/apps/portal/src/plugins/SystemAdmin/StudyOverview/ManageViewerDialog/hooks/useViewerData.ts \
        plugins/ui/apps/portal/src/plugins/SystemAdmin/StudyOverview/ManageViewerDialog/hooks/__tests__/useViewerData.test.tsx
git commit -m "fix(portal): report ManageViewerDialog loading from first render"
```

---

### Task 4: Cover config-type switching and the reset paths

**Files:**
- Modify: `plugins/ui/apps/portal/src/plugins/SystemAdmin/StudyOverview/ManageViewerDialog/hooks/__tests__/useViewerData.test.tsx`

These lock in the behaviour the team chose and prevent an over-eager dirty flag from breaking normal loading.

- [ ] **Step 1: Add three tests**

Append inside the existing `describe` block:

```tsx
  it("preserves typed edits across the refetch caused by a config-type switch", async () => {
    const strategy = makeStrategy({
      fetchCodes: jest.fn().mockResolvedValue([
        {
          datasetId: "ds-1",
          name: "server-side-name",
          code: "server code",
          type: "dashboard",
          queries: [],
        },
      ]),
    });

    const { rerender } = render(<Harness strategy={strategy} open codeType="dashboard" />);
    await act(async () => undefined);

    fireEvent.click(screen.getByTestId("type-name"));
    fireEvent.click(screen.getByTestId("type-code"));

    // Switching config type re-creates fetchData and re-runs the effect.
    rerender(<Harness strategy={strategy} open codeType="cohort" />);
    await act(async () => undefined);

    expect(screen.getByTestId("name")).toHaveTextContent(DASHBOARD_NAME);
    expect(screen.getByTestId("code")).toHaveTextContent("print('hi')");
  });

  it("still loads server data when the user has typed nothing", async () => {
    const strategy = makeStrategy({
      fetchCodes: jest.fn().mockResolvedValue([
        {
          datasetId: "ds-1",
          name: "server-side-name",
          code: "server code",
          type: "dashboard",
          queries: [],
        },
      ]),
    });

    render(<Harness strategy={strategy} open codeType="dashboard" />);
    await act(async () => undefined);

    expect(screen.getByTestId("name")).toHaveTextContent("server-side-name");
    expect(screen.getByTestId("code")).toHaveTextContent("server code");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("ignores a slow earlier fetch that resolves after a newer one", async () => {
    let resolveFirst: (value: never) => void = () => undefined;
    const firstCall = new Promise((resolve) => {
      resolveFirst = resolve as (value: never) => void;
    });
    const fetchCodes = jest
      .fn()
      .mockImplementationOnce(() => firstCall)
      .mockImplementationOnce(() =>
        Promise.resolve([
          {
            datasetId: "ds-1",
            name: "second-result",
            code: "second code",
            type: "dashboard",
            queries: [],
          },
        ])
      );
    const strategy = makeStrategy({ fetchCodes: fetchCodes as never });

    const { rerender } = render(<Harness strategy={strategy} open codeType="dashboard" />);
    rerender(<Harness strategy={strategy} open codeType="cohort" />);
    await act(async () => undefined);

    // The stale first request now lands; it must not overwrite the newer result.
    await act(async () => {
      resolveFirst([
        {
          datasetId: "ds-1",
          name: "first-result",
          code: "first code",
          type: "dashboard",
          queries: [],
        },
      ] as never);
    });

    expect(screen.getByTestId("name")).toHaveTextContent("second-result");
  });
```

- [ ] **Step 2: Run the full hook suite**

```bash
cd plugins/ui
CI=true bunx nx run portal:test -- --testPathPattern=useViewerData
```

Expected: **PASS** (5 tests). All three new tests should pass against the Task 2/3 implementation without further source changes. If "still loads server data" fails, the dirty flag is being set during mount — check that nothing in `Harness` calls `updateName`/`updateCode` on render.

- [ ] **Step 3: Commit**

```bash
cd ../..
git add plugins/ui/apps/portal/src/plugins/SystemAdmin/StudyOverview/ManageViewerDialog/hooks/__tests__/useViewerData.test.tsx
git commit -m "test(portal): cover config-type refetch, clean load and stale-response guard"
```

---

### Task 5: Verify nothing else in the portal regressed

**Files:** none modified.

- [ ] **Step 1: Run the whole portal unit suite**

```bash
cd plugins/ui
bun install
bunx nx run @portal/components:build
CI=true bunx nx run portal:test
```

Expected: exit 0. This mirrors `.github/workflows/ui-alp-portal-test-fe.yml` exactly, including the `@portal/components` build the test run depends on.

- [ ] **Step 2: Confirm the dialog's consumers still typecheck**

```bash
cd apps/portal
npx tsc --noEmit -p tsconfig.json
cd ../../..
```

Expected: exit 0. This is the check that `setQueries: updateQueries` kept the returned shape compatible with `useQueryManagement`.

- [ ] **Step 3: Confirm no unintended files changed**

```bash
git status --short
git diff --stat origin/develop...HEAD
```

Expected: exactly two files — `useViewerData.ts` and the new `__tests__/useViewerData.test.tsx`. Anything under `tests/e2e/` or `ManageViewerDialog.tsx` means the plan was overstepped.

---

### Task 6: Confirm the E2E failure is actually gone

**Files:** none modified.

The unit tests prove the state machine. Only the E2E proves the original symptom is fixed. It needs the full demo stack, so CI is the authority.

- [ ] **Step 1: Push the branch and let CI run**

```bash
git push -u origin HEAD
```

- [ ] **Step 2: Check the two relevant jobs**

`ui-alp-portal-test-fe` must be green (it gates the changed files), and `test_demosetup_dev (1)` and `(2)` must both pass.

- [ ] **Step 3: Confirm the specific test passes**

```bash
gh run view <run-id> --log | grep -a '09-patient-analytics/wizard.spec.ts'
```

Expected: `✓` for `patient-analytics-wizard-dashboard`, with no `retry #1` line. A pass that only succeeds on retry means the race is narrowed but not closed — report that rather than declaring success.

- [ ] **Step 4: Sanity-check the neighbours**

`tests/09-patient-analytics/bookmark.spec.ts` and `tests/03-researcher/dataset-overview-chart.spec.ts` have also failed on `develop` recently. If they still fail while `wizard.spec.ts` passes, they are separate issues — do **not** extend this branch to chase them. Report them for triage.

---

## Rollback

Each task is one commit. `git revert` the Task 2 commit alone restores the previous fetch behaviour; the tests from Tasks 1/3/4 will then fail, which is the correct signal.

## Out of scope

- Any change to `tests/e2e/**`. If the E2E still proves flaky after this fix, harden it in a follow-up with its own evidence.
- The other failing patient-analytics specs (Task 6 Step 4).
- The `cohort_discovery` pixi CI-matrix gap noted separately.
- Anything in PR #3131.
