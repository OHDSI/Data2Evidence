# ETL Node Draft Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use devx:subagent-driven-development (recommended) or devx:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist White Rabbit and Rabbit in a Hat ETL node work — scan settings and the uploaded CSV reference — in a per-node `sessionStorage` draft cache, so a same-tab page refresh restores them without re-scanning (OHDSI/Data2Evidence#1162).

**Architecture:** The versioned dataflow revision (`Graph.flow` jsonb) stays the single source of truth for *saved* work. On top of it we add a **draft layer**: the flow app snapshots node `data` into `sessionStorage` under a key scoped by dataflow id, and replays it over the server-loaded nodes when the dataflow is re-fetched after a refresh. Drafts are cleared on a successful save. Separately, the embedded Rabbit in a Hat (`mapping`) app's existing `sessionStorage` cache — today written to a single **unkeyed global** key — is scoped by `nodeId` so concurrent nodes stop clobbering each other. Uploaded CSV bytes are never cached client-side; they already live server-side keyed by `nodeId` (`GET/POST /jobplugins/dataflow/node/file`), so only the *reference* (file names + selected tables) is drafted.

**Tech Stack:** TypeScript, React 18, Redux Toolkit (`@reduxjs/toolkit`), reactflow, Vite, Vitest + jsdom + @testing-library.

---

## Background: what is actually broken

Read this before starting. It is the result of a code investigation and explains why each task exists.

**Issue #1162** (title: *"[Dataflow UI] White rabbit & Rabbit in a hat should persist scan settings after page refresh"*) says: *"After refreshing page user sees [blank fields]. Ideally the populated fields and uploaded csv file can be retained without having to re-scan."*

There are two independent root causes:

1. **White Rabbit blanks on refresh** because the flow app persists *nothing* client-side. `plugins/ui/apps/flow/src/components/Dialog/ScanDataDialog/ScanDataDialog.tsx` holds `uploadedFiles`, `selectedTables` and `dbConnectionForm` in drawer-local `useState`. Only a committed `scanMetadata` (`dataType`, `databaseCode`, `schemaName`, `fileName`, `delimiter`) ever reaches node data, and only via `WhiteRabbitDrawer.handleOk`. After a refresh, redux is rebuilt from the last *saved* revision, so unsaved node edits are gone.

2. **Rabbit in a Hat corrupts/loses state** because `plugins/ui/apps/mapping/src/contexts/AppContext.tsx` calls `usePersistedReducer(..., storageKey, whitelist)` with the **constant** `storageKey = "d2e_mapping_app"`. Two Rabbit-in-a-Hat nodes on one canvas — or two dataflows open in one tab — share and overwrite one bucket. Additionally `MappingLayout` only rehydrates from the `data` prop when `data.field?.edges?.length > 0 || data.table?.edges?.length > 0`, so a scanned-but-not-yet-mapped node silently falls through to `sourceNode` and drops in-progress work.

**Correction to a common misconception:** `sessionStorage` *does* survive an F5 reload in the same tab. It is cleared on tab close. The mapping app's cache therefore already survives refresh — it is just unkeyed and shadowed by a too-narrow hydration guard.

**Key files (verified):**

| Path | Role |
| --- | --- |
| `plugins/ui/apps/flow/src/features/flow/reducers.ts` | flow redux slice; `replaceNodes`, `setNode`, `markStatusAsSaved`, `dataflowId` |
| `plugins/ui/apps/flow/src/features/flow/containers/Flow/FlowPanel/FlowPanel.tsx` | loads dataflow into redux (`useEffect` calling `replaceNodes(savedNodes)`) |
| `plugins/ui/apps/flow/src/features/flow/containers/Node/NodeTypes/WhiteRabbitNode/WhiteRabbitNode.tsx` | `WhiteRabbitNodeData` type |
| `plugins/ui/apps/flow/src/features/flow/containers/Node/NodeTypes/WhiteRabbitNode/WhiteRabbitDrawer.tsx` | commits node data on `handleOk` |
| `plugins/ui/apps/flow/src/components/Dialog/ScanDataDialog/ScanDataDialog.tsx` | `ScanMetadata` type + scan form |
| `plugins/ui/apps/flow/src/features/flow/containers/Node/NodeTypes/DataMappingNode/DataMappingDrawer.tsx` | hosts the mapping plugin, builds `pluginData` |
| `plugins/ui/apps/mapping/src/contexts/AppContext.tsx` | unkeyed `storageKey` bug |
| `plugins/ui/apps/mapping/src/contexts/persisted-reducer.ts` | `usePersistedReducer` |
| `plugins/ui/apps/mapping/src/MappingLayout.tsx` | too-narrow hydration guard |
| `plugins/ui/apps/mapping/src/main.tsx` | `MappingMetadataParams` (missing `nodeId`) |

---

## File Structure

**Created:**
- `plugins/ui/apps/flow/vitest.config.ts` — Vitest config for the flow app
- `plugins/ui/apps/flow/src/test/setup.ts` — jsdom test setup
- `plugins/ui/apps/flow/src/features/flow/utils/nodeDraftCache.ts` — pure sessionStorage draft read/write/clear. One responsibility: serialising node drafts.
- `plugins/ui/apps/flow/src/features/flow/utils/nodeDraftCache.test.ts` — unit tests for the above
- `plugins/ui/apps/flow/src/features/flow/hooks/useNodeDraftPersistence.ts` — React hook that wires the cache to redux
- `plugins/ui/apps/mapping/vitest.config.ts` — Vitest config for the mapping app
- `plugins/ui/apps/mapping/src/test/setup.ts` — jsdom test setup
- `plugins/ui/apps/mapping/src/contexts/storage-key.ts` — pure key-derivation helper
- `plugins/ui/apps/mapping/src/contexts/storage-key.test.ts` — unit tests for the above

**Modified:**
- `plugins/ui/apps/flow/package.json` — add `test:unit` script + dev deps
- `plugins/ui/apps/flow/src/features/flow/utils/index.ts` — re-export the cache
- `plugins/ui/apps/flow/src/features/flow/hooks/index.ts` — re-export the hook
- `plugins/ui/apps/flow/src/components/Dialog/ScanDataDialog/ScanDataDialog.tsx` — widen `ScanMetadata`, emit new fields, rehydrate form from `initialMetadata`
- `plugins/ui/apps/flow/src/features/flow/containers/Node/NodeTypes/WhiteRabbitNode/WhiteRabbitDrawer.tsx` — pass `initialMetadata`, commit on close
- `plugins/ui/apps/flow/src/features/flow/containers/Flow/FlowPanel/FlowPanel.tsx` — restore drafts after load, mount the persistence hook
- `plugins/ui/apps/flow/src/features/flow/containers/Flow/SaveFlow/SaveFlowDialog.tsx` — clear drafts after a successful save
- `plugins/ui/apps/mapping/package.json` — add `test:unit` script + dev deps
- `plugins/ui/apps/mapping/src/main.tsx` — add `nodeId` to `MappingMetadataParams`
- `plugins/ui/apps/mapping/src/App.tsx` — pass `nodeId` to `AppProvider`
- `plugins/ui/apps/mapping/src/contexts/AppContext.tsx` — per-node storage key
- `plugins/ui/apps/mapping/src/MappingLayout.tsx` — widen the hydration guard

**Out of scope (explicitly):** the dormant `white_rabbit.scan_*` settings tables, server-side scan profiles, run history, and server-side draft autosave. Do not touch `plugins/functions/white-rabbit*` or `plugins/functions/jobplugins`.

---

### Task 1: Test harness for the flow app

The flow app builds with Vite but has no test runner. Add one, copying the pattern already used by `plugins/ui/apps/concept-mapping`.

**Files:**
- Create: `plugins/ui/apps/flow/vitest.config.ts`
- Create: `plugins/ui/apps/flow/src/test/setup.ts`
- Modify: `plugins/ui/apps/flow/package.json`

- [ ] **Step 1: Add the dev dependencies and test script**

In `plugins/ui/apps/flow/package.json`, add to `"scripts"` (after the existing `"clean"` entry):

```json
    "test:unit": "vitest"
```

And add to `"devDependencies"`:

```json
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
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

- [ ] **Step 4: Install dependencies**

Run from `plugins/ui`:

```bash
bun install
```

Expected: completes without error; `plugins/ui/node_modules/vitest` exists.

- [ ] **Step 5: Verify the runner starts**

Run from `plugins/ui/apps/flow`:

```bash
bun run test:unit --run
```

Expected: exits reporting `No test files found`. This confirms config resolution works. A config/parse error here means Step 3 is wrong — fix before continuing.

- [ ] **Step 6: Commit**

```bash
git add plugins/ui/apps/flow/vitest.config.ts plugins/ui/apps/flow/src/test/setup.ts plugins/ui/apps/flow/package.json plugins/ui/bun.lock
git commit -m "chore(flow): add vitest test harness"
```

---

### Task 2: Node draft cache module

A pure module over `sessionStorage`. No React, no redux — this is what makes it testable.

**Design notes for the implementer:**
- The key is scoped by `dataflowId` so two dataflows open in two tabs (or sequentially in one tab) never collide. Within one dataflow, drafts are a `Record<nodeId, data>`.
- When `dataflowId` is `undefined` (a brand-new, never-saved flow), **do nothing**. After a refresh an unsaved new flow cannot be reloaded from the server at all, so there is nothing to restore onto. Silently no-op rather than inventing a sentinel key.
- Only two node types are drafted. Drafting every node type would balloon the sessionStorage quota on large flows for no benefit, since #1162 is scoped to these two.
- All `sessionStorage` access is wrapped in `try/catch`. Safari private mode throws `QuotaExceededError` on write, and a corrupt JSON value must not crash the flow editor.

**Files:**
- Create: `plugins/ui/apps/flow/src/features/flow/utils/nodeDraftCache.ts`
- Test: `plugins/ui/apps/flow/src/features/flow/utils/nodeDraftCache.test.ts`
- Modify: `plugins/ui/apps/flow/src/features/flow/utils/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `plugins/ui/apps/flow/src/features/flow/utils/nodeDraftCache.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  DRAFTABLE_NODE_TYPES,
  clearNodeDrafts,
  draftStorageKey,
  readNodeDrafts,
  writeNodeDrafts,
} from "./nodeDraftCache";

describe("draftStorageKey", () => {
  it("scopes the key by dataflow id", () => {
    expect(draftStorageKey("df-1")).toBe("d2e_flow_node_draft:df-1");
  });

  it("returns undefined when there is no dataflow id", () => {
    expect(draftStorageKey(undefined)).toBeUndefined();
  });
});

describe("DRAFTABLE_NODE_TYPES", () => {
  it("covers exactly the two ETL nodes in scope", () => {
    expect([...DRAFTABLE_NODE_TYPES].sort()).toEqual([
      "rabbit_in_a_hat",
      "white_rabbit_node",
    ]);
  });
});

describe("writeNodeDrafts / readNodeDrafts", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("round-trips drafts for draftable nodes", () => {
    writeNodeDrafts("df-1", [
      { id: "n1", type: "white_rabbit_node", data: { name: "WR" } },
    ]);

    expect(readNodeDrafts("df-1")).toEqual({ n1: { name: "WR" } });
  });

  it("ignores node types that are not draftable", () => {
    writeNodeDrafts("df-1", [
      { id: "n1", type: "csv_node", data: { name: "CSV" } },
    ]);

    expect(readNodeDrafts("df-1")).toEqual({});
  });

  it("keeps drafts of different dataflows separate", () => {
    writeNodeDrafts("df-1", [
      { id: "n1", type: "white_rabbit_node", data: { name: "A" } },
    ]);
    writeNodeDrafts("df-2", [
      { id: "n1", type: "white_rabbit_node", data: { name: "B" } },
    ]);

    expect(readNodeDrafts("df-1")).toEqual({ n1: { name: "A" } });
    expect(readNodeDrafts("df-2")).toEqual({ n1: { name: "B" } });
  });

  it("keeps drafts of sibling nodes in one dataflow separate", () => {
    writeNodeDrafts("df-1", [
      { id: "n1", type: "rabbit_in_a_hat", data: { name: "First" } },
      { id: "n2", type: "rabbit_in_a_hat", data: { name: "Second" } },
    ]);

    expect(readNodeDrafts("df-1")).toEqual({
      n1: { name: "First" },
      n2: { name: "Second" },
    });
  });

  it("no-ops without a dataflow id", () => {
    writeNodeDrafts(undefined, [
      { id: "n1", type: "white_rabbit_node", data: { name: "WR" } },
    ]);

    expect(sessionStorage.length).toBe(0);
    expect(readNodeDrafts(undefined)).toEqual({});
  });

  it("returns an empty object when the stored value is corrupt", () => {
    sessionStorage.setItem("d2e_flow_node_draft:df-1", "{not json");

    expect(readNodeDrafts("df-1")).toEqual({});
  });
});

describe("clearNodeDrafts", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("removes only the drafts of the given dataflow", () => {
    writeNodeDrafts("df-1", [
      { id: "n1", type: "white_rabbit_node", data: { name: "A" } },
    ]);
    writeNodeDrafts("df-2", [
      { id: "n2", type: "white_rabbit_node", data: { name: "B" } },
    ]);

    clearNodeDrafts("df-1");

    expect(readNodeDrafts("df-1")).toEqual({});
    expect(readNodeDrafts("df-2")).toEqual({ n2: { name: "B" } });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run from `plugins/ui/apps/flow`:

```bash
bun run test:unit --run src/features/flow/utils/nodeDraftCache.test.ts
```

Expected: FAIL — `Failed to resolve import "./nodeDraftCache"`.

- [ ] **Step 3: Write the implementation**

Create `plugins/ui/apps/flow/src/features/flow/utils/nodeDraftCache.ts`:

```ts
const KEY_PREFIX = "d2e_flow_node_draft";

/**
 * Only the two ETL nodes from OHDSI/Data2Evidence#1162 are drafted. Drafting
 * every node type would grow the sessionStorage payload for no benefit.
 */
export const DRAFTABLE_NODE_TYPES = new Set([
  "white_rabbit_node",
  "rabbit_in_a_hat",
]);

export interface DraftableNode {
  id: string;
  type?: string;
  data?: unknown;
}

export type NodeDrafts = Record<string, unknown>;

/**
 * Returns undefined for an unsaved flow: after a refresh such a flow cannot be
 * reloaded from the server, so there is nothing to restore a draft onto.
 */
export function draftStorageKey(dataflowId: string | undefined) {
  return dataflowId ? `${KEY_PREFIX}:${dataflowId}` : undefined;
}

export function readNodeDrafts(dataflowId: string | undefined): NodeDrafts {
  const key = draftStorageKey(dataflowId);
  if (!key) return {};

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as NodeDrafts) : {};
  } catch {
    // Corrupt payload or storage unavailable — a stale draft must never break
    // the flow editor.
    return {};
  }
}

export function writeNodeDrafts(
  dataflowId: string | undefined,
  nodes: DraftableNode[]
) {
  const key = draftStorageKey(dataflowId);
  if (!key) return;

  const drafts: NodeDrafts = {};
  for (const node of nodes) {
    if (node.type && DRAFTABLE_NODE_TYPES.has(node.type)) {
      drafts[node.id] = node.data;
    }
  }

  try {
    sessionStorage.setItem(key, JSON.stringify(drafts));
  } catch {
    // Quota exceeded (e.g. Safari private mode). Losing a draft is acceptable;
    // crashing the editor is not.
  }
}

export function clearNodeDrafts(dataflowId: string | undefined) {
  const key = draftStorageKey(dataflowId);
  if (!key) return;

  try {
    sessionStorage.removeItem(key);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run from `plugins/ui/apps/flow`:

```bash
bun run test:unit --run src/features/flow/utils/nodeDraftCache.test.ts
```

Expected: PASS — 10 tests passed.

- [ ] **Step 5: Re-export from the utils barrel**

`plugins/ui/apps/flow/src/features/flow/utils/index.ts` currently re-exports `isDuplicateNodeName` and `sanitizeFlow`. Add:

```ts
export * from "./nodeDraftCache";
```

- [ ] **Step 6: Commit**

```bash
git add plugins/ui/apps/flow/src/features/flow/utils/nodeDraftCache.ts plugins/ui/apps/flow/src/features/flow/utils/nodeDraftCache.test.ts plugins/ui/apps/flow/src/features/flow/utils/index.ts
git commit -m "feat(flow): add per-node sessionStorage draft cache"
```

---

### Task 3: Merge helper for restoring drafts

Restoring is not a plain overwrite: a draft holds only the two ETL node types, and a node present in a draft may have been deleted from the saved flow. Keep the merge logic pure and tested, separate from the React wiring.

**Files:**
- Modify: `plugins/ui/apps/flow/src/features/flow/utils/nodeDraftCache.ts`
- Test: `plugins/ui/apps/flow/src/features/flow/utils/nodeDraftCache.test.ts`

- [ ] **Step 1: Write the failing tests**

Add `applyNodeDrafts` to the **existing** import at the top of `plugins/ui/apps/flow/src/features/flow/utils/nodeDraftCache.test.ts` (do not add a second import statement):

```ts
import {
  DRAFTABLE_NODE_TYPES,
  applyNodeDrafts,
  clearNodeDrafts,
  draftStorageKey,
  readNodeDrafts,
  writeNodeDrafts,
} from "./nodeDraftCache";
```

Then append this block to the end of the same file:

```ts
describe("applyNodeDrafts", () => {
  it("overlays a draft onto the matching saved node", () => {
    const saved = [
      { id: "n1", type: "white_rabbit_node", data: { name: "Saved" } },
    ];

    expect(applyNodeDrafts(saved, { n1: { name: "Drafted" } })).toEqual([
      { id: "n1", type: "white_rabbit_node", data: { name: "Drafted" } },
    ]);
  });

  it("leaves nodes without a draft untouched", () => {
    const saved = [
      { id: "n1", type: "white_rabbit_node", data: { name: "Saved" } },
      { id: "n2", type: "csv_node", data: { name: "Csv" } },
    ];

    expect(applyNodeDrafts(saved, { n1: { name: "Drafted" } })).toEqual([
      { id: "n1", type: "white_rabbit_node", data: { name: "Drafted" } },
      { id: "n2", type: "csv_node", data: { name: "Csv" } },
    ]);
  });

  it("drops drafts for nodes that no longer exist in the saved flow", () => {
    const saved = [
      { id: "n1", type: "white_rabbit_node", data: { name: "Saved" } },
    ];

    expect(
      applyNodeDrafts(saved, { n1: { name: "A" }, gone: { name: "B" } })
    ).toEqual([
      { id: "n1", type: "white_rabbit_node", data: { name: "A" } },
    ]);
  });

  it("returns the saved nodes unchanged when there are no drafts", () => {
    const saved = [
      { id: "n1", type: "white_rabbit_node", data: { name: "Saved" } },
    ];

    expect(applyNodeDrafts(saved, {})).toEqual(saved);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run from `plugins/ui/apps/flow`:

```bash
bun run test:unit --run src/features/flow/utils/nodeDraftCache.test.ts
```

Expected: FAIL — `applyNodeDrafts is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `plugins/ui/apps/flow/src/features/flow/utils/nodeDraftCache.ts`:

```ts
/**
 * Overlays drafted node data onto nodes loaded from the saved revision.
 * Drafts whose node no longer exists in the saved flow are discarded.
 */
export function applyNodeDrafts<TNode extends DraftableNode>(
  savedNodes: TNode[],
  drafts: NodeDrafts
): TNode[] {
  if (Object.keys(drafts).length === 0) return savedNodes;

  return savedNodes.map((node) =>
    Object.prototype.hasOwnProperty.call(drafts, node.id)
      ? { ...node, data: drafts[node.id] }
      : node
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run from `plugins/ui/apps/flow`:

```bash
bun run test:unit --run src/features/flow/utils/nodeDraftCache.test.ts
```

Expected: PASS — 14 tests passed.

- [ ] **Step 5: Commit**

```bash
git add plugins/ui/apps/flow/src/features/flow/utils/nodeDraftCache.ts plugins/ui/apps/flow/src/features/flow/utils/nodeDraftCache.test.ts
git commit -m "feat(flow): add applyNodeDrafts merge helper"
```

---

### Task 4: Draft persistence hook

Wire the cache to redux. The hook writes on every node change; there is no debounce because `sessionStorage.setItem` is synchronous and cheap at flow scale (tens of nodes), and adding one would risk losing the last edit before a refresh.

**Files:**
- Create: `plugins/ui/apps/flow/src/features/flow/hooks/useNodeDraftPersistence.ts`
- Modify: `plugins/ui/apps/flow/src/features/flow/hooks/index.ts`

- [ ] **Step 1: Inspect the existing hooks barrel**

Run:

```bash
cat plugins/ui/apps/flow/src/features/flow/hooks/index.ts
```

Note the existing export style (this file already exports `useFormData` and `useBooleanHelper`, used across the drawers). Match it in Step 3.

- [ ] **Step 2: Write the hook**

Create `plugins/ui/apps/flow/src/features/flow/hooks/useNodeDraftPersistence.ts`:

```ts
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "~/store";
import { selectAllNodes } from "../selectors";
import { writeNodeDrafts } from "../utils";

/**
 * Mirrors the draftable ETL nodes into sessionStorage on every change so a
 * same-tab refresh can restore them (OHDSI/Data2Evidence#1162).
 *
 * The saved revision remains the source of truth; this is a recovery buffer
 * only, and is cleared once the flow is saved.
 */
export function useNodeDraftPersistence() {
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const nodes = useSelector(selectAllNodes);

  useEffect(() => {
    writeNodeDrafts(dataflowId, nodes);
  }, [dataflowId, nodes]);
}
```

- [ ] **Step 3: Verify the selector name**

`selectAllNodes` must exist and return the node array. Run:

```bash
grep -n "selectAllNodes\|selectNodes" plugins/ui/apps/flow/src/features/flow/selectors/*.ts
```

Expected: a line defining `selectAllNodes` (generated by `nodesAdapter.getSelectors`). If the exported name differs, use the actual name in the hook and note it here.

- [ ] **Step 4: Re-export from the hooks barrel**

Add to `plugins/ui/apps/flow/src/features/flow/hooks/index.ts`:

```ts
export * from "./useNodeDraftPersistence";
```

- [ ] **Step 5: Typecheck**

Run from `plugins/ui/apps/flow`:

```bash
bunx tsc --noEmit -p tsconfig.json
```

Expected: no errors referencing `useNodeDraftPersistence.ts`. Pre-existing errors elsewhere in the app are out of scope — do not fix them here.

- [ ] **Step 6: Commit**

```bash
git add plugins/ui/apps/flow/src/features/flow/hooks/useNodeDraftPersistence.ts plugins/ui/apps/flow/src/features/flow/hooks/index.ts
git commit -m "feat(flow): persist ETL node drafts on change"
```

---

### Task 5: Restore drafts when the dataflow loads

`FlowPanel.tsx` has a `useEffect` that replaces redux nodes with the server-loaded ones whenever `dataflow` changes. This is the exact point where a refresh wipes unsaved work, so it is where drafts must be replayed.

**Files:**
- Modify: `plugins/ui/apps/flow/src/features/flow/containers/Flow/FlowPanel/FlowPanel.tsx`

- [ ] **Step 1: Locate the load effect**

Run:

```bash
grep -n "sanitizeFlowNodes\|replaceNodes\|centerViewport(savedNodes)" plugins/ui/apps/flow/src/features/flow/containers/Flow/FlowPanel/FlowPanel.tsx
```

Expected: the effect currently reads

```tsx
  useEffect(() => {
    const savedNodes = sanitizeFlowNodes(dataflow?.flow?.nodes);
    const savedEdges = sanitizeFlowEdges(dataflow?.flow?.edges, savedNodes);

    dispatch(replaceNodes(savedNodes));
    dispatch(replaceEdges(savedEdges));

    centerViewport(savedNodes);
  }, [dataflow, centerViewport]);
```

- [ ] **Step 2: Update the imports**

`FlowPanel.tsx` already imports `sanitizeFlowEdges, sanitizeFlowNodes` from `"../../../utils"`. Extend that import to:

```tsx
import {
  applyNodeDrafts,
  readNodeDrafts,
  sanitizeFlowEdges,
  sanitizeFlowNodes,
} from "../../../utils";
```

And add the hook import alongside the existing hook imports:

```tsx
import { useNodeDraftPersistence } from "../../../hooks";
```

- [ ] **Step 3: Replay drafts in the load effect**

Replace the effect body from Step 1 with:

```tsx
  useEffect(() => {
    const savedNodes = sanitizeFlowNodes(dataflow?.flow?.nodes);
    const savedEdges = sanitizeFlowEdges(dataflow?.flow?.edges, savedNodes);

    // Replay any same-tab draft over the freshly loaded revision so a page
    // refresh does not discard unsaved ETL node work (#1162).
    const restoredNodes = applyNodeDrafts(
      savedNodes,
      readNodeDrafts(dataflow?.id)
    );

    dispatch(replaceNodes(restoredNodes));
    dispatch(replaceEdges(savedEdges));

    centerViewport(restoredNodes);
  }, [dataflow, centerViewport]);
```

- [ ] **Step 4: Mount the persistence hook**

Inside the `FlowPanel` component body, next to the other hook calls (before the `useEffect` above), add:

```tsx
  useNodeDraftPersistence();
```

- [ ] **Step 5: Confirm the dataflow id field**

The effect keys drafts off `dataflow?.id`. Verify that field exists on the loaded dataflow object:

```bash
grep -n "dataflow" plugins/ui/apps/flow/src/features/flow/containers/Flow/FlowPanel/FlowPanel.tsx | head -20
```

Expected: `dataflow` comes from a `useGetLatestDataflowByIdQuery`-style hook and carries `id`. If it does not, use the redux `state.flow.dataflowId` value instead — it is the same identifier and is already selected by `useNodeDraftPersistence`.

- [ ] **Step 6: Typecheck**

Run from `plugins/ui/apps/flow`:

```bash
bunx tsc --noEmit -p tsconfig.json
```

Expected: no new errors in `FlowPanel.tsx`.

- [ ] **Step 7: Commit**

```bash
git add plugins/ui/apps/flow/src/features/flow/containers/Flow/FlowPanel/FlowPanel.tsx
git commit -m "feat(flow): restore ETL node drafts after dataflow load"
```

---

### Task 6: Clear drafts on a successful save

Once work is committed to a revision, the draft is stale. Leaving it would make a later "discard changes" silently resurrect the old edits.

**Files:**
- Modify: `plugins/ui/apps/flow/src/features/flow/containers/Flow/SaveFlow/SaveFlowDialog.tsx`

- [ ] **Step 1: Locate the save success paths**

Run:

```bash
grep -n "setDataflowId\|markStatusAsSaved\|response.data.id" plugins/ui/apps/flow/src/features/flow/containers/Flow/SaveFlow/SaveFlowDialog.tsx
```

Expected: two success branches around lines 138 and 169 — one for creating a new dataflow, one for saving a revision of an existing one.

- [ ] **Step 2: Import the clear helper**

Add to the imports in `SaveFlowDialog.tsx`:

```tsx
import { clearNodeDrafts } from "../../../utils";
```

- [ ] **Step 3: Clear drafts in both success branches**

In each of the two branches found in Step 1, immediately after the existing `dispatch(setDataflowId(response.data.id));` call, add:

```tsx
        // The revision is now authoritative; drop the recovery draft (#1162).
        clearNodeDrafts(response.data.id);
```

Match the surrounding indentation exactly — the two branches are nested at different depths.

- [ ] **Step 4: Typecheck**

Run from `plugins/ui/apps/flow`:

```bash
bunx tsc --noEmit -p tsconfig.json
```

Expected: no new errors in `SaveFlowDialog.tsx`.

- [ ] **Step 5: Commit**

```bash
git add plugins/ui/apps/flow/src/features/flow/containers/Flow/SaveFlow/SaveFlowDialog.tsx
git commit -m "feat(flow): clear ETL node drafts after a successful save"
```

---

### Task 7: Widen `ScanMetadata` to carry the full scan configuration

Today `ScanMetadata` drops `selectedTables` entirely, so even a restored draft cannot repopulate the table/file selection. It also stores CSV file names as one joined string, which cannot be re-selected. Fix both.

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
   * under the node id (POST/GET /jobplugins/dataflow/node/file), so only the
   * reference is persisted — never the file contents.
   */
  uploadedFileNames?: string[];
}
```

- [ ] **Step 2: Populate the new fields on apply**

In `handleApply`, the CSV branch currently calls:

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

And the DB branch currently calls:

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

Expected: no new errors. `ScanMetadata`'s new fields are optional, so `WhiteRabbitDrawer`'s `EMPTY_FORM_DATA` (which sets `scanMetadata: { dataType: "" }`) still typechecks.

- [ ] **Step 4: Commit**

```bash
git add plugins/ui/apps/flow/src/components/Dialog/ScanDataDialog/ScanDataDialog.tsx
git commit -m "feat(flow): carry selected tables and uploaded CSV names in ScanMetadata"
```

---

### Task 8: Repopulate the scan dialog from persisted metadata

Restoring node data is not enough — reopening the dialog must show the previous selections rather than an empty form. This is the visible half of "populated fields ... retained without having to re-scan".

**Files:**
- Modify: `plugins/ui/apps/flow/src/components/Dialog/ScanDataDialog/ScanDataDialog.tsx`
- Modify: `plugins/ui/apps/flow/src/features/flow/containers/Node/NodeTypes/WhiteRabbitNode/WhiteRabbitDrawer.tsx`

- [ ] **Step 1: Accept the persisted metadata as a prop**

In `ScanDataDialog.tsx`, the props interface currently reads:

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
  /** Previously committed scan configuration, replayed into the form on open. */
  initialMetadata?: ScanMetadata;
}
```

Add `initialMetadata` to the destructured parameter list alongside `setScanMetadata`.

- [ ] **Step 2: Seed the form state when the dialog opens**

Add this effect immediately after the existing cleanup effect (the one clearing `intervalRef`):

```tsx
  useEffect(() => {
    if (!open || !initialMetadata?.dataType) return;

    setInternalDataType(initialMetadata.dataType);
    setSelectedTables(initialMetadata.selectedTables ?? []);

    if (initialMetadata.dataType === "csv") {
      setDelimiter(initialMetadata.delimiter ?? DELIMITERS[0].value);
      setAvailableTables(initialMetadata.uploadedFileNames ?? []);
    } else {
      setDbConnectionForm({
        databaseCode: initialMetadata.databaseCode ?? "",
        schema: initialMetadata.schemaName ?? "",
      });
      setCanConnect(true);
    }
  }, [open, initialMetadata]);
```

Two notes for the implementer:
- `setAvailableTables` is seeded from `uploadedFileNames` so the previously uploaded CSVs appear in the selection list without re-uploading. The bytes are already server-side under `nodeId`.
- `setCanConnect(true)` is set for the DB branch because a previously applied configuration was, by definition, connectable. The user can still hit *Test connection* to re-verify.

- [ ] **Step 3: Pass the metadata from the drawer**

In `WhiteRabbitDrawer.tsx`, find the `<ScanDataDialog ... />` usage and add the prop:

```tsx
            initialMetadata={formData.scanMetadata}
```

- [ ] **Step 4: Seed the drawer's local `scanMetadata` from node data**

`WhiteRabbitDrawer` keeps a local `const [scanMetadata, setScanMetadata] = useState<ScanMetadata>({ dataType: "" })` that starts empty on every mount, so a restored node's metadata is lost the moment the dialog is closed without re-scanning. Add this effect after the existing `useEffect` that calls `setFormData`:

```tsx
  useEffect(() => {
    if (node.data?.scanMetadata) {
      setScanMetadata(node.data.scanMetadata);
    }
  }, [node.data?.scanMetadata]);
```

- [ ] **Step 5: Commit on drawer close, matching DataMappingDrawer**

`WhiteRabbitDrawer` renders `<NodeDrawer onOk={handleOk} onClose={onClose} {...props}>`, so closing via the X discards edits — whereas `DataMappingDrawer` uses `onClose={handleOk}` and saves. Make them consistent by changing the `NodeDrawer` props in `WhiteRabbitDrawer.tsx` to:

```tsx
      <NodeDrawer onOk={handleOk} onClose={handleOk} {...props}>
```

- [ ] **Step 6: Typecheck**

Run from `plugins/ui/apps/flow`:

```bash
bunx tsc --noEmit -p tsconfig.json
```

Expected: no new errors in `ScanDataDialog.tsx` or `WhiteRabbitDrawer.tsx`.

- [ ] **Step 7: Commit**

```bash
git add plugins/ui/apps/flow/src/components/Dialog/ScanDataDialog/ScanDataDialog.tsx plugins/ui/apps/flow/src/features/flow/containers/Node/NodeTypes/WhiteRabbitNode/WhiteRabbitDrawer.tsx
git commit -m "feat(flow): repopulate the scan dialog from persisted scan metadata"
```

---

### Task 9: Test harness for the mapping app

Same pattern as Task 1. Needed so the storage-key fix in Task 10 is test-driven.

**Files:**
- Create: `plugins/ui/apps/mapping/vitest.config.ts`
- Create: `plugins/ui/apps/mapping/src/test/setup.ts`
- Modify: `plugins/ui/apps/mapping/package.json`

- [ ] **Step 1: Add the dev dependencies and test script**

In `plugins/ui/apps/mapping/package.json`, add to `"scripts"`:

```json
    "test:unit": "vitest"
```

And add to `"devDependencies"`:

```json
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
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

### Task 10: Scope the Rabbit in a Hat cache by node id

This is the sibling-node clobbering bug. `AppContext.tsx` uses the constant `storageKey = "d2e_mapping_app"` for every node.

**Files:**
- Create: `plugins/ui/apps/mapping/src/contexts/storage-key.ts`
- Test: `plugins/ui/apps/mapping/src/contexts/storage-key.test.ts`
- Modify: `plugins/ui/apps/mapping/src/contexts/AppContext.tsx`
- Modify: `plugins/ui/apps/mapping/src/App.tsx`
- Modify: `plugins/ui/apps/mapping/src/main.tsx`

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

The mock metadata below it needs no change — `nodeId` is optional and its absence exercises the `standalone` fallback.

- [ ] **Step 6: Thread the node id into the provider**

In `plugins/ui/apps/mapping/src/App.tsx`, the provider is currently rendered as `<AppProvider>`. Change it to:

```tsx
        <AppProvider nodeId={pluginMetadata.data.nodeId}>
```

- [ ] **Step 7: Use the scoped key in the provider**

In `plugins/ui/apps/mapping/src/contexts/AppContext.tsx`, replace the constant and the provider signature. The file currently reads:

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

And add the import at the top of the file:

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

### Task 11: Widen the Rabbit in a Hat hydration guard

`MappingLayout` only loads the `data` prop when it already contains edges, so a node that has been scanned but not yet mapped falls through to the `sourceNode` branch and loses its restored state.

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
    // Hydrate from persisted node data whenever it carries any mapping work —
    // edges, a scanned schema, or table handles. Keying only on edges dropped
    // scanned-but-unmapped nodes on reload (#1162).
    const hasPersistedWork =
      !!data &&
      (data.field?.edges?.length > 0 ||
        data.table?.edges?.length > 0 ||
        !!data.scannedSchema ||
        data.table?.sourceHandles?.length > 0);

    if (hasPersistedWork) {
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
git commit -m "fix(mapping): hydrate scanned-but-unmapped nodes from persisted data"
```

---

### Task 12: Full verification against issue #1162

Unit tests cover the pure logic; this task exercises the actual reported flow. Do not skip it — the bug is a browser-lifecycle bug and cannot be proven fixed by unit tests alone.

- [ ] **Step 1: Run the full unit suites**

Run from `plugins/ui/apps/flow`:

```bash
bun run test:unit --run
```

Expected: PASS — 14 tests in `nodeDraftCache.test.ts`.

Run from `plugins/ui/apps/mapping`:

```bash
bun run test:unit --run
```

Expected: PASS — 3 tests in `storage-key.test.ts`.

- [ ] **Step 2: Build both apps**

Run from `plugins/ui`:

```bash
bunx nx build flow && bunx nx build mapping
```

Expected: both builds succeed. A build failure here usually means a barrel export was missed in Task 2 Step 5 or Task 4 Step 4.

- [ ] **Step 3: Launch the app**

REQUIRED SUB-SKILL: use the `devx:run` skill to launch and drive the app. Do not hand the user manual instructions — drive it yourself.

- [ ] **Step 4: Reproduce the CSV scenario from the issue**

1. Open the ETL / dataflow page and create or open a dataflow.
2. Add a **White Rabbit** node, open *Configure White Rabbit*, click *Scan data*.
3. Choose data type **csv**, upload a CSV (`plugins/ui/apps/mapping/sampleCSV/healthcare_dataset.csv` works), pick a delimiter, select the file, click Apply.
4. Wait for the scan to complete, then close the drawer.
5. **Refresh the page (F5).**

Expected: the White Rabbit node still shows its source tables; reopening *Scan data* shows data type `csv`, the previous delimiter, and the previously uploaded file already listed and selected. No re-upload and no re-scan is required.

Before the fix, all fields were blank — this is the exact regression in the issue screenshots.

- [ ] **Step 5: Reproduce the database scenario**

Repeat Step 4 choosing data type **postgresql** with a database and schema instead of a CSV.

Expected after refresh: the database code and schema are repopulated and the selected tables are still checked.

- [ ] **Step 6: Verify sibling Rabbit in a Hat nodes no longer clobber**

1. In one dataflow, add **two** Rabbit in a Hat nodes, each connected to its own White Rabbit node.
2. Open the first, create at least one table mapping, close it.
3. Open the second, create a *different* table mapping, close it.
4. Refresh the page.
5. Open each node in turn.

Expected: each node shows its own mapping. Before the fix both nodes shared the single `d2e_mapping_app` key and the second overwrote the first.

- [ ] **Step 7: Verify drafts are cleared on save**

1. With unsaved ETL node changes present, save the dataflow.
2. In devtools, inspect Session Storage.

Expected: no `d2e_flow_node_draft:<dataflowId>` entry remains after the save succeeds.

- [ ] **Step 8: Verify dataflow isolation**

1. Open dataflow A, make an unsaved White Rabbit change.
2. Switch to dataflow B without saving.

Expected: dataflow B shows no trace of A's draft. Switching back to A restores it.

- [ ] **Step 9: Commit the plan**

The plan ships with the change so reviewers see the intent alongside the implementation.

```bash
git add trex/plans/2026-08-14-etl-node-draft-cache.md
git commit -m "plan: ETL node draft cache"
```

---

## Notes for the reviewer

- **Why sessionStorage and not localStorage:** a draft is scoped to one editing session in one tab. `localStorage` would leak stale drafts across tabs editing the same dataflow, producing last-writer-wins corruption — the exact class of bug being fixed here.
- **Why the CSV bytes are not cached:** uploads already persist server-side keyed by `nodeId` via `POST /jobplugins/dataflow/node/file`, and are listable via `GET /jobplugins/dataflow/node/file/list`. Caching file contents in `sessionStorage` would blow the ~5 MB quota on realistic health datasets. Only the reference is drafted.
- **What is deliberately not solved:** work is still lost on tab close, in a new tab, or on another device. That is the server-side-autosave option the team rejected as out of scope for #1162, which asks specifically about *page refresh*.
- **Unrelated defect noticed during investigation, not fixed here:** `plugins/functions/white-rabbit/src/scan-data/scan-data.router.ts` ends its `result-as-resource` handler with `catch (error) {}`, swallowing errors so the request hangs instead of returning a status. It is a one-line `next(error)` fix and deserves its own issue.
