# ETL Node Save Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use devx:subagent-driven-development (recommended) or devx:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Warn users to save the flow before refresh/navigation when White Rabbit or Rabbit in a Hat node configuration is unsaved, and make a save fully round-trip that configuration — including the server-side uploaded CSV reference — so reopening a node restores it without re-scanning (OHDSI/Data2Evidence#1162).

**Architecture:** The saved dataflow revision (`Graph.flow` jsonb) is the single authoritative store. The `flow` app registers with the portal's **existing** cross-app unsaved-changes registry (`window.__d2eUnsavedChangesRegistry`) plus a native `beforeunload` listener. Dirty state is *derived*, not tracked: `hasUnsavedChanges()` deep-compares live ETL node data in redux against the saved revision already cached by RTK Query, so the baseline self-updates after save, restore, import, and duplicate with no manual reset anywhere. Separately, the Rabbit in a Hat `sessionStorage` cache is scoped by node ID so sibling nodes stop colliding; it remains a same-tab convenience only.

**Tech Stack:** TypeScript, React 18, Redux Toolkit + RTK Query, reactflow, single-spa, Vite, Vitest + jsdom.

---

## Background: read this first

### The issue

**#1162** — *"[Dataflow UI] White rabbit & Rabbit in a hat should persist scan settings after page refresh"*. Body: *"After refreshing page user sees [blank fields]... Ideally the populated fields and uploaded csv file can be retained without having to re-scan."*

### What already exists (do not rebuild it)

The portal ships a documented cross-app unsaved-changes guard. **Read `plugins/ui/docs/cross-app-unsaved-changes.md` before starting Task 3** — it contains the integration contract and a checklist.

| Path | Role |
| --- | --- |
| `plugins/ui/docs/cross-app-unsaved-changes.md` | Integration guide + checklist for a new app |
| `plugins/ui/apps/vue-mri-ui-lib/src/shared/unsavedChangesRegistry.ts` | Registry implementation; self-installs on `window.__d2eUnsavedChangesRegistry` |
| `plugins/ui/apps/vue-mri-ui-lib/src/composables/useUnsavedChanges.ts` | **Reference implementation** (Patient Analytics). Mirror its install/uninstall shape. |
| `plugins/ui/apps/portal/src/components/NavigationGuardRouter/` | Intercepts react-router `push`/`replace`, shows the shared dialog |
| `plugins/ui/apps/portal/src/components/UnsavedChangesDialog/` | The shared Leave / Stay dialog — **reused unchanged** |

The `flow` app is **not** registered. Only Patient Analytics participates today.

The registry contract:

```ts
interface UnsavedChangesRegistration {
  hasUnsavedChanges: () => boolean          // MUST be synchronous and cheap
  clearUnsavedChanges?: () => void          // called on "Leave"
}
```

**Documented limitation, inherited as-is:** browser Back/Forward cannot be blocked in this single-spa + declarative-router setup. Reload and tab-close are covered by `beforeunload` only. Do not attempt to fix this here.

### The four persistence defects

Verified by reading the code. A save today does **not** round-trip a scan because:

1. **`ScanMetadata` is lossy** — `{dataType, databaseCode?, schemaName?, fileName?, delimiter?}` at `ScanDataDialog.tsx:36`. `selectedTables` is dropped entirely; CSV names are stored as one joined string, so nothing can repopulate a selection.
2. **`ScanDataDialog` never rehydrates** — no prop for prior metadata; reopening shows an empty form even when node data holds a valid config.
3. **`WhiteRabbitDrawer` discards on close** — renders `<NodeDrawer onOk={handleOk} onClose={onClose}>`, whereas `DataMappingDrawer` uses `onClose={handleOk}` and saves. Closing via X silently drops edits.
4. **`MappingLayout`'s hydration guard is too narrow** — loads `data` only when `data.field?.edges?.length > 0 || data.table?.edges?.length > 0`, so a scanned-but-unmapped node falls through to `sourceNode` and loses restored state.

### The CSV reference

Uploads already persist server-side keyed by `nodeId`:

- `POST /jobplugins/dataflow/node/file?nodeId=` → `PortalServerAPI.uploadFile`
- `GET /jobplugins/dataflow/node/file/list?nodeId=`
- `GET` / `DELETE /jobplugins/dataflow/node/file?nodeId=&fileName=`

Node ids are client-generated UUIDs stored in the flow JSON, so they are **stable across save and reload**. The bytes are already durable. What is missing is a *reference* from node data to them — that is what `uploadedFileNames` in Task 5 provides.

### The Rabbit in a Hat cache

`plugins/ui/apps/mapping/src/contexts/AppContext.tsx` calls `usePersistedReducer(reducer, initialState, storageKey, whitelist)` with the **constant** `storageKey = "d2e_mapping_app"`. Two Rabbit-in-a-Hat nodes on one canvas share and overwrite one bucket. Per the approved direction the cache **stays** — it is a same-tab convenience — but is scoped by node ID, and the saved revision remains authoritative.

Note: `sessionStorage` survives an F5 reload in the same tab and is cleared on tab close. It is *not* the mechanism that satisfies #1162 — the saved revision is.

### Explicitly out of scope

Server-side CSV existence reconciliation, missing-file UX, and orphan-file retention policy. Do **not** touch `plugins/functions/jobplugins` or `plugins/functions/white-rabbit`. Do **not** modify the shared `UnsavedChangesDialog` (it is used by Patient Analytics).

---

## File Structure

**Created:**
- `plugins/ui/apps/flow/vitest.config.ts` — Vitest config for the flow app
- `plugins/ui/apps/flow/src/test/setup.ts` — jsdom test setup
- `plugins/ui/apps/flow/src/features/flow/utils/etlNodeDirty.ts` — pure ETL-node extraction + comparison. One responsibility: deciding "is ETL config different?"
- `plugins/ui/apps/flow/src/features/flow/utils/etlNodeDirty.test.ts` — unit tests
- `plugins/ui/apps/flow/src/features/flow/hooks/useFlowUnsavedChanges.ts` — registry + `beforeunload` wiring
- `plugins/ui/apps/mapping/vitest.config.ts` — Vitest config for the mapping app
- `plugins/ui/apps/mapping/src/test/setup.ts` — jsdom test setup
- `plugins/ui/apps/mapping/src/contexts/storage-key.ts` — pure key derivation
- `plugins/ui/apps/mapping/src/contexts/storage-key.test.ts` — unit tests

**Modified:**
- `plugins/ui/apps/flow/package.json` — `test:unit` script + dev deps
- `plugins/ui/apps/flow/src/features/flow/utils/index.ts` — re-export
- `plugins/ui/apps/flow/src/features/flow/hooks/index.ts` — re-export
- `plugins/ui/apps/flow/src/FlowApp.tsx` — install/uninstall the guard
- `plugins/ui/apps/flow/src/components/Dialog/ScanDataDialog/ScanDataDialog.tsx` — widen `ScanMetadata`, emit new fields, rehydrate from `initialMetadata`
- `plugins/ui/apps/flow/src/features/flow/containers/Node/NodeTypes/WhiteRabbitNode/WhiteRabbitDrawer.tsx` — pass `initialMetadata`, seed local metadata, commit on close
- `plugins/ui/apps/mapping/package.json` — `test:unit` script + dev deps
- `plugins/ui/apps/mapping/src/main.tsx` — add `nodeId` to `MappingMetadataParams`
- `plugins/ui/apps/mapping/src/App.tsx` — pass `nodeId` to `AppProvider`
- `plugins/ui/apps/mapping/src/contexts/AppContext.tsx` — per-node storage key
- `plugins/ui/apps/mapping/src/MappingLayout.tsx` — widen the hydration guard

---

### Task 1: Test harness for the flow app

The flow app builds with Vite but has no test runner. Add one, following `plugins/ui/apps/concept-mapping`.

**Files:**
- Create: `plugins/ui/apps/flow/vitest.config.ts`
- Create: `plugins/ui/apps/flow/src/test/setup.ts`
- Modify: `plugins/ui/apps/flow/package.json`

- [ ] **Step 1: Add the test script and dev dependencies**

In `plugins/ui/apps/flow/package.json`, add to `"scripts"`:

```json
    "test:unit": "vitest"
```

Add to `"devDependencies"`:

```json
    "@testing-library/jest-dom": "^6.4.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.0.0",
    "vitest": "^4.0.18"
```

- [ ] **Step 2: Create the test setup file**

Create `plugins/ui/apps/flow/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Create the Vitest config**

`plugins/ui/apps/flow/vite.config.ts` exports a **callback-form** config, so it must be invoked with a `configEnv` before merging — `mergeConfig` cannot merge a function.

Create `plugins/ui/apps/flow/vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { mergeConfig, defineConfig, configDefaults } from "vitest/config";
import viteConfig from "./vite.config";

export default defineConfig((configEnv) =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/test/setup.ts"],
        exclude: [...configDefaults.exclude],
        root: fileURLToPath(new URL("./", import.meta.url)),
      },
    })
  )
);
```

- [ ] **Step 4: Install**

Run from `plugins/ui`:

```bash
bun install
```

Expected: completes without error.

- [ ] **Step 5: Verify the runner starts**

Run from `plugins/ui/apps/flow`:

```bash
bun run test:unit --run
```

Expected: exits reporting `No test files found`. A config or parse error here means Step 3 is wrong — fix before continuing.

- [ ] **Step 6: Commit**

```bash
git add plugins/ui/apps/flow/vitest.config.ts plugins/ui/apps/flow/src/test/setup.ts plugins/ui/apps/flow/package.json plugins/ui/bun.lock
git commit -m "chore(flow): add vitest test harness"
```

---

### Task 2: Pure ETL dirty-comparison module

This is the heart of the approved approach. Keep it pure — no React, no redux imports — so it is fully testable and so the hook in Task 3 stays thin.

**Design notes for the implementer:**
- Only `white_rabbit_node` and `rabbit_in_a_hat` are compared. Moving a node, adding a Python node, or editing an edge must **not** trigger the ETL warning.
- Comparison is against the *saved revision*, so reverting an edit by hand correctly reports clean again. That is the property that makes the warning trustworthy.
- `lodash.isequal` is already used in this app (`DataMappingDrawer.tsx:21`). Reuse it rather than adding a dependency.
- A node present live but absent from the saved revision (newly added, never saved) counts as dirty. A node deleted live but present in the saved revision also counts as dirty.

**Files:**
- Create: `plugins/ui/apps/flow/src/features/flow/utils/etlNodeDirty.ts`
- Test: `plugins/ui/apps/flow/src/features/flow/utils/etlNodeDirty.test.ts`
- Modify: `plugins/ui/apps/flow/src/features/flow/utils/index.ts`

- [ ] **Step 1: Confirm `lodash.isequal` resolves in this app**

Run from `plugins/ui/apps/flow`:

```bash
bunx node -e "require.resolve('lodash.isequal'); console.log('resolved')"
```

Expected: prints `resolved`. It is imported by `DataMappingDrawer.tsx` and hoisted from the workspace root. If this fails, add `"lodash.isequal": "^4.5.0"` to `plugins/ui/apps/flow/package.json` dependencies and `@types/lodash.isequal` to devDependencies, then `bun install` from `plugins/ui`.

- [ ] **Step 2: Write the failing tests**

Create `plugins/ui/apps/flow/src/features/flow/utils/etlNodeDirty.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  ETL_NODE_TYPES,
  collectEtlNodeData,
  isEtlDirty,
} from "./etlNodeDirty";

describe("ETL_NODE_TYPES", () => {
  it("covers exactly the two ETL nodes in scope", () => {
    expect([...ETL_NODE_TYPES].sort()).toEqual([
      "rabbit_in_a_hat",
      "white_rabbit_node",
    ]);
  });
});

describe("collectEtlNodeData", () => {
  it("keeps only ETL node data, keyed by node id", () => {
    const nodes = [
      { id: "n1", type: "white_rabbit_node", data: { name: "WR" } },
      { id: "n2", type: "rabbit_in_a_hat", data: { name: "RiaH" } },
      { id: "n3", type: "python_node", data: { name: "Py" } },
    ];

    expect(collectEtlNodeData(nodes)).toEqual({
      n1: { name: "WR" },
      n2: { name: "RiaH" },
    });
  });

  it("returns an empty map for no nodes", () => {
    expect(collectEtlNodeData([])).toEqual({});
    expect(collectEtlNodeData(undefined)).toEqual({});
  });
});

describe("isEtlDirty", () => {
  const wr = (name: string) => [
    { id: "n1", type: "white_rabbit_node", data: { name } },
  ];

  it("is clean when ETL data matches the saved revision", () => {
    expect(isEtlDirty(wr("same"), wr("same"))).toBe(false);
  });

  it("is dirty when ETL data differs", () => {
    expect(isEtlDirty(wr("edited"), wr("saved"))).toBe(true);
  });

  it("is clean again when an edit is reverted", () => {
    expect(isEtlDirty(wr("saved"), wr("saved"))).toBe(false);
  });

  it("ignores changes to non-ETL nodes", () => {
    const live = [
      { id: "n1", type: "white_rabbit_node", data: { name: "same" } },
      { id: "n2", type: "python_node", data: { code: "changed" } },
    ];
    const saved = [
      { id: "n1", type: "white_rabbit_node", data: { name: "same" } },
      { id: "n2", type: "python_node", data: { code: "original" } },
    ];

    expect(isEtlDirty(live, saved)).toBe(false);
  });

  it("is dirty when a new ETL node has been added", () => {
    expect(isEtlDirty(wr("new"), [])).toBe(true);
  });

  it("is dirty when an ETL node has been deleted", () => {
    expect(isEtlDirty([], wr("gone"))).toBe(true);
  });

  it("is clean when neither side has ETL nodes", () => {
    const other = [{ id: "n9", type: "python_node", data: { code: "x" } }];
    expect(isEtlDirty(other, other)).toBe(false);
  });

  it("treats a missing saved revision as clean", () => {
    // The revision has not loaded yet — there is nothing to lose, so do not
    // block navigation.
    expect(isEtlDirty(wr("anything"), undefined)).toBe(false);
  });

  it("is order-independent", () => {
    const live = [
      { id: "n1", type: "white_rabbit_node", data: { name: "A" } },
      { id: "n2", type: "rabbit_in_a_hat", data: { name: "B" } },
    ];
    const saved = [
      { id: "n2", type: "rabbit_in_a_hat", data: { name: "B" } },
      { id: "n1", type: "white_rabbit_node", data: { name: "A" } },
    ];

    expect(isEtlDirty(live, saved)).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run from `plugins/ui/apps/flow`:

```bash
bun run test:unit --run src/features/flow/utils/etlNodeDirty.test.ts
```

Expected: FAIL — `Failed to resolve import "./etlNodeDirty"`.

- [ ] **Step 4: Write the implementation**

Create `plugins/ui/apps/flow/src/features/flow/utils/etlNodeDirty.ts`:

```ts
import isEqual from "lodash.isequal";

/**
 * The two ETL nodes covered by OHDSI/Data2Evidence#1162. Only these are
 * compared, so moving a node or editing an unrelated node does not raise the
 * ETL unsaved-changes warning.
 */
export const ETL_NODE_TYPES = new Set([
  "white_rabbit_node",
  "rabbit_in_a_hat",
]);

export interface ComparableNode {
  id: string;
  type?: string;
  data?: unknown;
}

export type EtlNodeDataMap = Record<string, unknown>;

export function collectEtlNodeData(
  nodes: ComparableNode[] | undefined
): EtlNodeDataMap {
  const collected: EtlNodeDataMap = {};
  if (!nodes) return collected;

  for (const node of nodes) {
    if (node.type && ETL_NODE_TYPES.has(node.type)) {
      collected[node.id] = node.data;
    }
  }
  return collected;
}

/**
 * True when live ETL node configuration differs from the saved revision.
 *
 * Comparing against the saved revision (rather than tracking edit events)
 * means the answer self-corrects: it goes clean after a save, after a revision
 * restore, and if the user manually reverts an edit.
 *
 * `savedNodes` is undefined while the revision query is still in flight. There
 * is nothing to lose in that window, so report clean rather than blocking
 * navigation on incomplete information.
 */
export function isEtlDirty(
  liveNodes: ComparableNode[] | undefined,
  savedNodes: ComparableNode[] | undefined
): boolean {
  if (!savedNodes) return false;

  return !isEqual(collectEtlNodeData(liveNodes), collectEtlNodeData(savedNodes));
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run from `plugins/ui/apps/flow`:

```bash
bun run test:unit --run src/features/flow/utils/etlNodeDirty.test.ts
```

Expected: PASS — 12 tests passed.

- [ ] **Step 6: Re-export from the utils barrel**

`plugins/ui/apps/flow/src/features/flow/utils/index.ts` currently re-exports `isDuplicateNodeName` and `sanitizeFlow`. Add:

```ts
export * from "./etlNodeDirty";
```

- [ ] **Step 7: Commit**

```bash
git add plugins/ui/apps/flow/src/features/flow/utils/etlNodeDirty.ts plugins/ui/apps/flow/src/features/flow/utils/etlNodeDirty.test.ts plugins/ui/apps/flow/src/features/flow/utils/index.ts
git commit -m "feat(flow): add ETL node dirty comparison against the saved revision"
```

---

### Task 3: Register the flow app with the shared guard

**Read `plugins/ui/docs/cross-app-unsaved-changes.md` before this task.** Mirror the Patient Analytics reference implementation at `plugins/ui/apps/vue-mri-ui-lib/src/composables/useUnsavedChanges.ts`.

**Design notes for the implementer:**
- `hasUnsavedChanges()` must be **synchronous** — the portal calls it during navigation. It therefore reads the redux `store` singleton directly (exported from `plugins/ui/apps/flow/src/store`) rather than going through React state.
- The saved-revision baseline comes from the RTK Query cache entry that `FlowPanel` already populates: `dataflowApiSlice.endpoints.getLatestDataflowById.select(dataflowId)(state)`. Nothing new is stored, and the baseline updates automatically when the `Dataflow` tag is invalidated on save.
- `clearUnsavedChanges` is deliberately a **no-op**. The portal calls it when the user confirms "Leave"; since dirty state is derived from a comparison rather than a flag, there is nothing to reset, and the user has chosen to discard. Leave an explanatory comment so a future reader does not think it was forgotten.
- `unregister` on unmount is **mandatory** — single-spa keeps module state alive, and a stale registration makes the portal think the unmounted app is still dirty.

**Files:**
- Create: `plugins/ui/apps/flow/src/features/flow/hooks/useFlowUnsavedChanges.ts`
- Modify: `plugins/ui/apps/flow/src/features/flow/hooks/index.ts`
- Modify: `plugins/ui/apps/flow/src/FlowApp.tsx`

- [ ] **Step 1: Confirm the redux node shape used by the comparison**

Run:

```bash
grep -n "nodesAdapter\|state.flow.nodes" plugins/ui/apps/flow/src/features/flow/reducers.ts | head
```

Expected: nodes are an entity adapter, so live nodes are `Object.values(state.flow.nodes.entities)`. Use that directly — do **not** use the `selectFlowNodes` selector, which decorates nodes with `sourcePosition`/`targetPosition`/`dragHandle` for reactflow and would produce false differences against the saved revision.

- [ ] **Step 2: Write the hook**

Create `plugins/ui/apps/flow/src/features/flow/hooks/useFlowUnsavedChanges.ts`:

```ts
import { useEffect } from "react";
import { store } from "~/store";
import { dataflowApiSlice } from "../slices";
import { ComparableNode, isEtlDirty } from "../utils";

const APP_NAME = "flow";

/**
 * Reads dirty state straight from the store so the registry contract's
 * "synchronous and cheap" requirement is met — the portal calls this during
 * navigation.
 */
function hasUnsavedChanges(): boolean {
  const state = store.getState();
  const dataflowId = state.flow.dataflowId;
  if (!dataflowId) return false;

  const liveNodes = Object.values(
    state.flow.nodes.entities
  ) as ComparableNode[];

  const savedRevision = dataflowApiSlice.endpoints.getLatestDataflowById.select(
    dataflowId
  )(state as never);

  return isEtlDirty(liveNodes, savedRevision.data?.flow?.nodes);
}

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  if (!hasUnsavedChanges()) return;
  event.preventDefault();
  event.returnValue = "";
}

/**
 * Registers the flow app with the portal's shared unsaved-changes guard so the
 * user is prompted to save before refresh, tab close, or cross-plugin
 * navigation (OHDSI/Data2Evidence#1162).
 *
 * See plugins/ui/docs/cross-app-unsaved-changes.md for the contract.
 */
export function useFlowUnsavedChanges() {
  useEffect(() => {
    window.__d2eUnsavedChangesRegistry?.register(APP_NAME, {
      hasUnsavedChanges,
      // Intentionally a no-op. Dirty state is derived by comparing against the
      // saved revision, so there is no flag to reset — and the user has just
      // chosen to discard their changes.
      clearUnsavedChanges: () => {},
    });
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // Mandatory: single-spa keeps module state alive, so a stale
      // registration would make the portal think this app is still dirty.
      window.__d2eUnsavedChangesRegistry?.unregister(APP_NAME);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
}
```

- [ ] **Step 3: Declare the registry on the window type**

The flow app has no ambient declaration for the registry. Add it to `plugins/ui/apps/flow/src/types/portal.ts` (or the nearest ambient `.d.ts` in `src/types/`):

```ts
export interface D2EUnsavedChangesRegistration {
  hasUnsavedChanges: () => boolean;
  clearUnsavedChanges?: () => void;
}

export interface D2EUnsavedChangesRegistry {
  register: (appName: string, api: D2EUnsavedChangesRegistration) => void;
  unregister: (appName: string) => void;
  hasAnyUnsavedChanges: () => boolean;
  getDirtyApps: () => string[];
  clearAll: () => void;
}

declare global {
  interface Window {
    __d2eUnsavedChangesRegistry?: D2EUnsavedChangesRegistry;
  }
}
```

- [ ] **Step 4: Re-export from the hooks barrel**

Add to `plugins/ui/apps/flow/src/features/flow/hooks/index.ts`:

```ts
export * from "./useFlowUnsavedChanges";
```

- [ ] **Step 5: Install the guard at the app root**

In `plugins/ui/apps/flow/src/FlowApp.tsx`, add the import:

```tsx
import { useFlowUnsavedChanges } from "./features/flow/hooks";
```

and call it inside the `FlowApp` component body, immediately after the `useState` for `customProps`:

```tsx
  useFlowUnsavedChanges();
```

`FlowApp` is the single-spa `rootComponent`, so mounting here means the guard installs on mount and uninstalls on unmount, exactly as the checklist requires.

- [ ] **Step 6: Typecheck**

Run from `plugins/ui/apps/flow`:

```bash
bunx tsc --noEmit -p tsconfig.json
```

Expected: no errors referencing `useFlowUnsavedChanges.ts` or `FlowApp.tsx`. Pre-existing errors elsewhere are out of scope — do not fix them here.

- [ ] **Step 7: Commit**

```bash
git add plugins/ui/apps/flow/src/features/flow/hooks/useFlowUnsavedChanges.ts plugins/ui/apps/flow/src/features/flow/hooks/index.ts plugins/ui/apps/flow/src/FlowApp.tsx plugins/ui/apps/flow/src/types/portal.ts
git commit -m "feat(flow): register with the shared unsaved-changes guard"
```

---

### Task 4: Commit White Rabbit edits on drawer close

`WhiteRabbitDrawer` discards edits when closed via X, while `DataMappingDrawer` saves. That inconsistency loses configuration before the guard ever sees it.

**Files:**
- Modify: `plugins/ui/apps/flow/src/features/flow/containers/Node/NodeTypes/WhiteRabbitNode/WhiteRabbitDrawer.tsx`

- [ ] **Step 1: Locate the drawer render**

Run:

```bash
grep -n "NodeDrawer onOk\|<NodeDrawer" plugins/ui/apps/flow/src/features/flow/containers/Node/NodeTypes/WhiteRabbitNode/WhiteRabbitDrawer.tsx
```

Expected: `<NodeDrawer onOk={handleOk} onClose={onClose} {...props}>`.

- [ ] **Step 2: Commit on close**

Change that line to:

```tsx
      <NodeDrawer onOk={handleOk} onClose={handleOk} {...props}>
```

This matches `DataMappingDrawer.tsx`, which already uses `onClose={handleOk}`.

- [ ] **Step 3: Typecheck**

Run from `plugins/ui/apps/flow`:

```bash
bunx tsc --noEmit -p tsconfig.json
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add plugins/ui/apps/flow/src/features/flow/containers/Node/NodeTypes/WhiteRabbitNode/WhiteRabbitDrawer.tsx
git commit -m "fix(flow): commit White Rabbit edits when the drawer is closed"
```

---

### Task 5: Carry the full scan configuration and CSV reference in node data

**Files:**
- Modify: `plugins/ui/apps/flow/src/components/Dialog/ScanDataDialog/ScanDataDialog.tsx`

- [ ] **Step 1: Widen the type**

`ScanDataDialog.tsx` currently declares (around line 36):

```tsx
export interface ScanMetadata {
  dataType: string;
  databaseCode?: string;
  schemaName?: string;
  fileName?: string;
  delimiter?: string;
}
```

Replace with:

```tsx
export interface ScanMetadata {
  dataType: string;
  databaseCode?: string;
  schemaName?: string;
  /** Human-readable summary, kept for the existing drawer display. */
  fileName?: string;
  delimiter?: string;
  /** Tables (DB scan) or file names (CSV scan) the user selected. */
  selectedTables?: string[];
  /**
   * Names of CSVs already uploaded for this node. The bytes live server-side
   * under the node id (POST/GET /jobplugins/dataflow/node/file), so only this
   * reference is persisted in the revision — never the file contents.
   */
  uploadedFileNames?: string[];
}
```

- [ ] **Step 2: Populate the new fields on apply**

In `handleApply`, the CSV branch currently reads:

```tsx
        setScanMetadata({
          dataType: "csv",
          fileName: uploadedFiles.map((f) => f.name).join(", "),
          delimiter,
        });
```

Replace with:

```tsx
        setScanMetadata({
          dataType: "csv",
          fileName: uploadedFiles.map((f) => f.name).join(", "),
          delimiter,
          selectedTables,
          uploadedFileNames: uploadedFiles.map((f) => f.name),
        });
```

The DB branch currently reads:

```tsx
        setScanMetadata({
          dataType: "postgresql",
          databaseCode: dbConnectionForm.databaseCode,
          schemaName: dbConnectionForm.schema,
        });
```

Replace with:

```tsx
        setScanMetadata({
          dataType: "postgresql",
          databaseCode: dbConnectionForm.databaseCode,
          schemaName: dbConnectionForm.schema,
          selectedTables,
        });
```

- [ ] **Step 3: Typecheck**

Run from `plugins/ui/apps/flow`:

```bash
bunx tsc --noEmit -p tsconfig.json
```

Expected: no new errors. The new fields are optional, so `WhiteRabbitDrawer`'s `EMPTY_FORM_DATA` (`scanMetadata: { dataType: "" }`) still typechecks.

- [ ] **Step 4: Commit**

```bash
git add plugins/ui/apps/flow/src/components/Dialog/ScanDataDialog/ScanDataDialog.tsx
git commit -m "feat(flow): persist selected tables and uploaded CSV names in scan metadata"
```

---

### Task 6: Repopulate the scan dialog from saved metadata

Restoring node data is not enough — reopening the dialog must show the previous selections. This is the visible half of "retained without having to re-scan".

**Files:**
- Modify: `plugins/ui/apps/flow/src/components/Dialog/ScanDataDialog/ScanDataDialog.tsx`
- Modify: `plugins/ui/apps/flow/src/features/flow/containers/Node/NodeTypes/WhiteRabbitNode/WhiteRabbitDrawer.tsx`

- [ ] **Step 1: Accept the saved metadata as a prop**

In `ScanDataDialog.tsx` the props interface currently reads:

```tsx
interface ScanDataDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
  nodeId: string;
  setScanId: (id: string) => void;
  setScanMetadata: (metadata: ScanMetadata) => void;
}
```

Replace with:

```tsx
interface ScanDataDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
  nodeId: string;
  setScanId: (id: string) => void;
  setScanMetadata: (metadata: ScanMetadata) => void;
  /** Scan configuration from the saved revision, replayed into the form. */
  initialMetadata?: ScanMetadata;
}
```

Add `initialMetadata` to the destructured parameter list alongside `setScanMetadata`.

- [ ] **Step 2: Seed the form when the dialog opens**

Add this effect immediately after the existing cleanup effect (the one clearing `intervalRef`):

```tsx
  useEffect(() => {
    if (!open || !initialMetadata?.dataType) return;

    setInternalDataType(initialMetadata.dataType);
    setSelectedTables(initialMetadata.selectedTables ?? []);

    if (initialMetadata.dataType === "csv") {
      setDelimiter(initialMetadata.delimiter ?? DELIMITERS[0].value);
      // Previously uploaded CSVs are already stored server-side under this
      // node id, so listing their names is enough to re-select them without
      // re-uploading.
      setAvailableTables(initialMetadata.uploadedFileNames ?? []);
    } else {
      setDbConnectionForm({
        databaseCode: initialMetadata.databaseCode ?? "",
        schema: initialMetadata.schemaName ?? "",
      });
      // A configuration that was previously applied was, by definition,
      // connectable. The user can still re-test the connection.
      setCanConnect(true);
    }
  }, [open, initialMetadata]);
```

- [ ] **Step 3: Pass the metadata from the drawer**

In `WhiteRabbitDrawer.tsx`, find the `<ScanDataDialog ... />` usage and add:

```tsx
            initialMetadata={formData.scanMetadata}
```

- [ ] **Step 4: Seed the drawer's local metadata from node data**

`WhiteRabbitDrawer` keeps `const [scanMetadata, setScanMetadata] = useState<ScanMetadata>({ dataType: "" })`, which starts empty on every mount — so a restored node's metadata is dropped as soon as the drawer commits without re-scanning. Add this effect after the existing `useEffect` that calls `setFormData`:

```tsx
  useEffect(() => {
    if (node.data?.scanMetadata) {
      setScanMetadata(node.data.scanMetadata);
    }
  }, [node.data?.scanMetadata]);
```

- [ ] **Step 5: Typecheck**

Run from `plugins/ui/apps/flow`:

```bash
bunx tsc --noEmit -p tsconfig.json
```

Expected: no new errors in `ScanDataDialog.tsx` or `WhiteRabbitDrawer.tsx`.

- [ ] **Step 6: Commit**

```bash
git add plugins/ui/apps/flow/src/components/Dialog/ScanDataDialog/ScanDataDialog.tsx plugins/ui/apps/flow/src/features/flow/containers/Node/NodeTypes/WhiteRabbitNode/WhiteRabbitDrawer.tsx
git commit -m "feat(flow): repopulate the scan dialog from saved scan metadata"
```

---

### Task 7: Test harness for the mapping app

Same pattern as Task 1, so the storage-key change in Task 8 can be test-driven.

**Files:**
- Create: `plugins/ui/apps/mapping/vitest.config.ts`
- Create: `plugins/ui/apps/mapping/src/test/setup.ts`
- Modify: `plugins/ui/apps/mapping/package.json`

- [ ] **Step 1: Add the test script and dev dependencies**

In `plugins/ui/apps/mapping/package.json`, add to `"scripts"`:

```json
    "test:unit": "vitest"
```

Add to `"devDependencies"`:

```json
    "@testing-library/jest-dom": "^6.4.0",
    "jsdom": "^24.0.0",
    "vitest": "^4.0.18"
```

`@vitejs/plugin-react` is already a dev dependency of this app — do not add it twice.

- [ ] **Step 2: Create the test setup file**

Create `plugins/ui/apps/mapping/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Create the Vitest config**

`plugins/ui/apps/mapping/vite.config.ts` is also callback-form. Create `plugins/ui/apps/mapping/vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { mergeConfig, defineConfig, configDefaults } from "vitest/config";
import viteConfig from "./vite.config";

export default defineConfig((configEnv) =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/test/setup.ts"],
        exclude: [...configDefaults.exclude],
        root: fileURLToPath(new URL("./", import.meta.url)),
      },
    })
  )
);
```

- [ ] **Step 4: Install and verify**

Run from `plugins/ui`:

```bash
bun install
```

Then from `plugins/ui/apps/mapping`:

```bash
bun run test:unit --run
```

Expected: exits reporting `No test files found`.

- [ ] **Step 5: Commit**

```bash
git add plugins/ui/apps/mapping/vitest.config.ts plugins/ui/apps/mapping/src/test/setup.ts plugins/ui/apps/mapping/package.json plugins/ui/bun.lock
git commit -m "chore(mapping): add vitest test harness"
```

---

### Task 8: Scope the Rabbit in a Hat draft cache by node ID

Per the approved direction the cache stays as a same-tab convenience, but sibling nodes must stop colliding. The saved revision remains authoritative.

**Files:**
- Create: `plugins/ui/apps/mapping/src/contexts/storage-key.ts`
- Test: `plugins/ui/apps/mapping/src/contexts/storage-key.test.ts`
- Modify: `plugins/ui/apps/mapping/src/main.tsx`
- Modify: `plugins/ui/apps/mapping/src/App.tsx`
- Modify: `plugins/ui/apps/mapping/src/contexts/AppContext.tsx`

- [ ] **Step 1: Write the failing tests**

Create `plugins/ui/apps/mapping/src/contexts/storage-key.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mappingStorageKey } from "./storage-key";

describe("mappingStorageKey", () => {
  it("scopes the key by node id", () => {
    expect(mappingStorageKey("node-1")).toBe("d2e_mapping_app:node-1");
  });

  it("gives sibling nodes distinct keys", () => {
    expect(mappingStorageKey("node-1")).not.toBe(mappingStorageKey("node-2"));
  });

  it("falls back to a standalone key when there is no node id", () => {
    expect(mappingStorageKey("")).toBe("d2e_mapping_app:standalone");
    expect(mappingStorageKey(undefined)).toBe("d2e_mapping_app:standalone");
  });
});
```

The `standalone` fallback matters: `main.tsx` renders the app outside any dataflow node for local development, where `nodeId` is absent.

- [ ] **Step 2: Run the tests to verify they fail**

Run from `plugins/ui/apps/mapping`:

```bash
bun run test:unit --run src/contexts/storage-key.test.ts
```

Expected: FAIL — `Failed to resolve import "./storage-key"`.

- [ ] **Step 3: Write the implementation**

Create `plugins/ui/apps/mapping/src/contexts/storage-key.ts`:

```ts
const STORAGE_KEY_PREFIX = "d2e_mapping_app";

/**
 * Scopes the mapping draft cache to a single ETL node. Previously every node
 * shared one constant key, so two Rabbit in a Hat nodes on one canvas
 * overwrote each other (OHDSI/Data2Evidence#1162).
 *
 * This cache is a same-tab convenience only — the saved flow revision is
 * authoritative.
 */
export function mappingStorageKey(nodeId: string | undefined) {
  return `${STORAGE_KEY_PREFIX}:${nodeId || "standalone"}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run from `plugins/ui/apps/mapping`:

```bash
bun run test:unit --run src/contexts/storage-key.test.ts
```

Expected: PASS — 3 tests passed.

- [ ] **Step 5: Declare `nodeId` on the plugin metadata type**

`DataMappingDrawer` already passes `nodeId: node.id` into `pluginData`, but `MappingMetadataParams` does not declare it. In `plugins/ui/apps/mapping/src/main.tsx`, the interface currently reads:

```tsx
export interface MappingMetadataParams {
  mappingSuggestion: boolean;
  data: AppState;
  onChange: (data: any) => void;
}
```

Replace with:

```tsx
export interface MappingMetadataParams {
  mappingSuggestion: boolean;
  nodeId?: string;
  data: AppState;
  onChange: (data: any) => void;
}
```

The mock metadata below it needs no change — `nodeId` is optional, and its absence exercises the `standalone` fallback.

- [ ] **Step 6: Thread the node id into the provider**

In `plugins/ui/apps/mapping/src/App.tsx`, the provider is rendered as `<AppProvider>`. Change it to:

```tsx
        <AppProvider nodeId={pluginMetadata.data.nodeId}>
```

- [ ] **Step 7: Use the scoped key**

In `plugins/ui/apps/mapping/src/contexts/AppContext.tsx`, the file currently reads:

```tsx
const storageKey = "d2e_mapping_app";
const whitelist: (keyof AppState)[] = ["datasetSelected", "table", "field", "scannedSchema", "cdmVersion", "cdmTables"];

interface AppProviderProps {
  children?: React.ReactNode;
}

export const AppProvider: FC<AppProviderProps> = ({ children }) => {
  const { state, dispatch } = usePersistedReducer(reducer, initialState, storageKey, whitelist);
```

Replace with:

```tsx
const whitelist: (keyof AppState)[] = ["datasetSelected", "table", "field", "scannedSchema", "cdmVersion", "cdmTables"];

interface AppProviderProps {
  nodeId?: string;
  children?: React.ReactNode;
}

export const AppProvider: FC<AppProviderProps> = ({ nodeId, children }) => {
  const { state, dispatch } = usePersistedReducer(reducer, initialState, mappingStorageKey(nodeId), whitelist);
```

Add the import at the top of the file:

```tsx
import { mappingStorageKey } from "./storage-key";
```

- [ ] **Step 8: Typecheck**

Run from `plugins/ui/apps/mapping`:

```bash
bunx tsc --noEmit -p tsconfig.json
```

Expected: no new errors.

- [ ] **Step 9: Commit**

```bash
git add plugins/ui/apps/mapping/src/contexts/storage-key.ts plugins/ui/apps/mapping/src/contexts/storage-key.test.ts plugins/ui/apps/mapping/src/contexts/AppContext.tsx plugins/ui/apps/mapping/src/App.tsx plugins/ui/apps/mapping/src/main.tsx
git commit -m "fix(mapping): scope the draft cache to a single ETL node"
```

---

### Task 9: Restore scanned-but-unmapped Rabbit in a Hat nodes

`MappingLayout` only loads the `data` prop when it already contains edges, so a node that has been scanned but not yet mapped falls through to `sourceNode` and loses its restored state.

**Files:**
- Modify: `plugins/ui/apps/mapping/src/MappingLayout.tsx`

- [ ] **Step 1: Replace the guard**

The effect currently reads:

```tsx
  useEffect(() => {
    if (data && (data.field?.edges?.length > 0 || data.table?.edges?.length > 0)) {
      load(data);
    } else if (sourceNode) {
      setScannedSchema(sourceNode.data.scannedSchema);
      setTableSourceHandles(sourceNode.data.sourceHandles);
    } else {
      reset();
    }
```

Replace with:

```tsx
  useEffect(() => {
    // Hydrate from saved node data whenever it carries any mapping work —
    // edges, a scanned schema, or table handles. Keying only on edges dropped
    // scanned-but-unmapped nodes on reload (#1162).
    const hasSavedWork =
      !!data &&
      (data.field?.edges?.length > 0 ||
        data.table?.edges?.length > 0 ||
        !!data.scannedSchema ||
        data.table?.sourceHandles?.length > 0);

    if (hasSavedWork) {
      load(data);
    } else if (sourceNode) {
      setScannedSchema(sourceNode.data.scannedSchema);
      setTableSourceHandles(sourceNode.data.sourceHandles);
    } else {
      reset();
    }
```

`scannedSchema` and `table.sourceHandles` are both real fields of `AppState` (see `contexts/states/state.ts`), and `scannedSchema` is already on the persistence whitelist.

- [ ] **Step 2: Typecheck**

Run from `plugins/ui/apps/mapping`:

```bash
bunx tsc --noEmit -p tsconfig.json
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add plugins/ui/apps/mapping/src/MappingLayout.tsx
git commit -m "fix(mapping): hydrate scanned-but-unmapped nodes from saved data"
```

---

### Task 10: Full verification against issue #1162

Unit tests cover the pure logic. This task exercises the reported flow — the guard is a browser-lifecycle feature and cannot be proven by unit tests alone. Do not skip it.

- [ ] **Step 1: Run both unit suites**

From `plugins/ui/apps/flow`:

```bash
bun run test:unit --run
```

Expected: PASS — 12 tests in `etlNodeDirty.test.ts`.

From `plugins/ui/apps/mapping`:

```bash
bun run test:unit --run
```

Expected: PASS — 3 tests in `storage-key.test.ts`.

- [ ] **Step 2: Build both apps**

Run from `plugins/ui`:

```bash
bunx nx build flow && bunx nx build mapping
```

Expected: both succeed. A failure usually means a barrel export was missed in Task 2 Step 6 or Task 3 Step 4.

- [ ] **Step 3: Launch the app**

REQUIRED SUB-SKILL: use the `devx:run` skill to launch and drive the app. Drive it yourself — do not hand the user manual instructions.

- [ ] **Step 4: Verify the refresh warning fires**

1. Open the ETL page and open or create a dataflow. Save it once so it has a revision.
2. Add a **White Rabbit** node, open *Configure White Rabbit*, run a CSV scan (`plugins/ui/apps/mapping/sampleCSV/healthcare_dataset.csv` works), close the drawer.
3. Without saving the flow, press **F5**.

Expected: the browser's native "Leave site?" prompt appears.

- [ ] **Step 5: Verify the warning does NOT fire when clean**

1. Save the flow.
2. Press F5 again.

Expected: **no** prompt. The RTK Query baseline refreshed on save, so the comparison is clean. If a prompt still appears, the `Dataflow` tag invalidation is not refreshing the cached revision — investigate before continuing.

- [ ] **Step 6: Verify the warning clears when an edit is reverted**

1. Change the White Rabbit node's description, close the drawer (do not save the flow).
2. Change it back to the original value, close the drawer.
3. Press F5.

Expected: **no** prompt. This is the property that distinguishes this approach from a coarse dirty flag, and is the main reason it was chosen.

- [ ] **Step 7: Verify non-ETL changes do not raise the ETL warning**

1. With the flow saved, drag a node to a new position. Do not save.
2. Press F5.

Expected: no prompt from the flow app. Node position is not ETL configuration.

- [ ] **Step 8: Verify cross-plugin navigation is guarded**

1. Make an unsaved White Rabbit change.
2. Use the portal's left-hand navigation to move to another plugin.

Expected: the shared `UnsavedChangesDialog` appears with Leave / Stay. Choosing *Stay* keeps you on the flow; choosing *Leave* navigates away.

- [ ] **Step 9: Verify the scan survives a save + refresh**

1. Configure a CSV scan on a White Rabbit node and save the flow.
2. Press F5 and let the page reload.
3. Reopen *Configure White Rabbit* → *Scan data*.

Expected: data type `csv`, the previous delimiter, and the previously uploaded file listed and selected. **No re-upload and no re-scan required.** This is the core acceptance criterion of #1162.

- [ ] **Step 10: Repeat for a database scan**

Repeat Step 9 with data type **postgresql**.

Expected after save + refresh: database code and schema repopulated, selected tables still checked.

- [ ] **Step 11: Verify sibling Rabbit in a Hat nodes no longer collide**

1. Add **two** Rabbit in a Hat nodes, each fed by its own White Rabbit node.
2. Create a different table mapping in each, then save the flow.
3. Refresh, then open each node in turn.

Expected: each node shows its own mapping. Before the fix both shared the single `d2e_mapping_app` key and the second overwrote the first.

- [ ] **Step 12: Verify unmount deregistration**

1. With the flow **saved** (clean), navigate to another plugin, then attempt to navigate again.

Expected: no spurious unsaved-changes dialog. A dialog here means `unregister` is not running on unmount — single-spa keeps module state alive, so a stale registration would make the portal think the unmounted flow app is still dirty.

- [ ] **Step 13: Commit the plan**

The plan ships with the change so reviewers see the intent alongside the implementation.

```bash
git add trex/plans/2026-08-14-etl-node-save-guard.md
git commit -m "plan: ETL node save guard"
```

---

## Notes for the reviewer

- **Why the baseline is derived, not stored:** a stored baseline would need resetting on save, revision restore, import, and duplicate — four-plus sites. Missing one leaves the flow permanently "dirty", and a dialog that always fires trains users to click through it. Deriving from the RTK Query cache entry means the baseline updates automatically wherever the `Dataflow` tag is invalidated, with no reset step to forget.
- **Why `clearUnsavedChanges` is a no-op:** dirty state is a comparison, not a flag, so there is nothing to reset. The comment in the code says so explicitly to prevent a future reader "fixing" it.
- **Why `selectFlowNodes` is not used for the comparison:** it decorates nodes with `sourcePosition`, `targetPosition`, and `dragHandle` for reactflow, which would produce false differences against the saved revision. The comparison reads `state.flow.nodes.entities` directly.
- **Why CSV bytes are not stored in the revision:** uploads already persist server-side under a stable node UUID, with list/get/delete endpoints. Only the file-name reference goes into node data.
- **Known limitation, inherited and documented:** browser Back/Forward is not guarded — see `plugins/ui/docs/cross-app-unsaved-changes.md`. Reload and tab close are covered by `beforeunload`.
- **Explicitly out of scope:** CSV existence reconciliation, missing-file UX, orphan retention. A CSV uploaded for a node whose flow is never saved remains on the server; that deserves its own issue.
- **Unrelated defect noticed during investigation, not fixed here:** `plugins/functions/white-rabbit/src/scan-data/scan-data.router.ts` ends its `result-as-resource` handler with `catch (error) {}`, swallowing errors so the request hangs instead of returning a status. One-line `next(error)` fix; separate issue.
