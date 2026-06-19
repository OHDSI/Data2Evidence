# Concept-Set Compound ID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the offset-encoded concept-set identifier (`webApiId + 1_000_000_000`) introduced by PR #2560 with an explicit compound string identifier of the form `"legacy:<n>"` / `"webapi:<n>"`, exposed in the d2e-webapi facade DTO and consumed by every downstream artifact that holds a concept-set reference.

**Architecture:** Introduce a single canonical reference type — `ConceptSetRef = { source: 'legacy' | 'webapi', externalId: number }` — and a pair of utility functions (`parseConceptSetRef`, `formatConceptSetRef`) that own the wire format. The facade emits the compound string in every response (`id: "webapi:7"`) and accepts any of three forms on input: compound (new), bare numeric < 1e9 (legacy back-compat), and offset-encoded ≥ 1e9 (webapi back-compat for any persisted offset IDs from PR #2560 in flight). Downstream artifacts (frontend concept-sets app, Vue MRI query filter, analytics IFR converter, cohort-definition warnings) accept compound strings end-to-end. Existing artifacts (bookmarks, cohort `CodesetId` integers inside Circe expressions) continue to work via the back-compat parser; an opportunistic rewrite of those artifacts is **out of scope** for this plan.

**Tech Stack:** TypeScript (Deno-flavoured edge functions in `plugins/functions/*`), Vite + React (concept-sets app), Vue 2 + TS (vue-mri-ui-lib), Zod for DTO schemas, Vitest for unit tests.

**Precondition:** This plan assumes PR #2560 (`khairul-syazwan/analyze-2440`) has been merged into the base of this branch. If not, rebase that PR's commits onto `khairul-syazwan/analyze-2560` first. Do **not** start work until the offset-encoding code (`WEBAPI_CONCEPT_SET_ID_OFFSET`, `encodeWebApiConceptSetId`, `decodeWebApiConceptSetId`, `isWebApiConceptSetId`, `WebApiConceptSetAPI`, dual-store `getConceptSets`/`getConceptSet` in `conceptset.service.ts`) is visible in your worktree.

**Out of scope (do NOT touch):**
- Bookmark JSON rewrites (separate plan).
- Cohort definition Circe-internal `CodesetId` integers (these are local-to-expression, not global refs).
- One-click "Duplicate to WebAPI" affordance (separate plan — solution b/c from the analysis).
- Removal of the `shared` flag mapping (separate decision).

---

## File Structure

**New files:**
- `plugins/functions/d2e-webapi/src/utils/conceptSetRef.ts` — parser/formatter, single source of truth on backend
- `plugins/functions/d2e-webapi/src/utils/__tests__/conceptSetRef.test.ts` — unit tests
- `plugins/ui/apps/concept-sets/src/utils/conceptSetRef.ts` — frontend mirror (identical semantics)
- `plugins/ui/apps/concept-sets/src/utils/__tests__/conceptSetRef.test.ts`
- `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/utils/conceptSetRef.ts` — Vue MRI mirror
- `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/utils/__tests__/conceptSetRef.test.ts`

**Modified files:**
- `plugins/functions/d2e-webapi/src/dto/conceptset.ts` — DTO id becomes `string`, add `externalId: number`, keep `source`
- `plugins/functions/d2e-webapi/src/services/conceptset.service.ts` — drop offset helpers, route via parser
- `plugins/functions/d2e-webapi/src/services/__tests__/conceptset.service.test.ts` — assertions on compound id
- `plugins/functions/d2e-webapi/src/routes/conceptset.ts` — parse `:id` route param via parser
- `plugins/functions/d2e-webapi/src/dto/cohortdefinition.ts:87` — `conceptSetId: string` in warnings
- `plugins/ui/apps/concept-sets/src/types/terminology.ts` — `ConceptSet.id: string`, add `externalId?: number`
- `plugins/ui/apps/concept-sets/src/axios/d2e-webapi.ts` — accept compound id in URL paths
- `plugins/ui/apps/concept-sets/src/ConceptSets/ConceptSetsTable.tsx` — keep displayed id as compound string
- `plugins/ui/apps/concept-sets/src/Terminology/Terminology.tsx` — same
- `plugins/ui/apps/concept-sets/src/d2eWebapiMappers.ts` — forward `externalId` and `source` through
- `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/types/AtlasTypes.ts:5-8` — `conceptSetId?: string` (drop number)
- `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/types/QueryFilterTypes.ts` — drop `number` from union
- `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/services/ConceptSetApiService.ts` — pass compound id
- `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/models/QueryFilterModel.ts` — parse legacy stored state on load
- `plugins/functions/analytics-svc/src/ifr-to-extcohort/cdmConfigUtils.ts:187` — emit compound id (was already string)
- `plugins/functions/analytics-svc/src/ifr-to-extcohort/conceptGetters.ts:76-87` — parse before HTTP call
- `plugins/functions/query-gen-svc/src/api/TerminologySvcAPI.ts:37-54` — accept compound list, parse before forwarding

---

### Task 1: Build the backend `conceptSetRef` utility

**Files:**
- Create: `plugins/functions/d2e-webapi/src/utils/conceptSetRef.ts`
- Test: `plugins/functions/d2e-webapi/src/utils/__tests__/conceptSetRef.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `plugins/functions/d2e-webapi/src/utils/__tests__/conceptSetRef.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  parseConceptSetRef,
  formatConceptSetRef,
  isConceptSetRefString,
  CONCEPT_SET_LEGACY_OFFSET_BOUNDARY,
} from "../conceptSetRef.ts";

describe("parseConceptSetRef", () => {
  it("parses compound legacy form", () => {
    expect(parseConceptSetRef("legacy:869")).toEqual({
      source: "legacy",
      externalId: 869,
    });
  });

  it("parses compound webapi form", () => {
    expect(parseConceptSetRef("webapi:7")).toEqual({
      source: "webapi",
      externalId: 7,
    });
  });

  it("accepts bare numeric string < boundary as legacy (back-compat)", () => {
    expect(parseConceptSetRef("869")).toEqual({
      source: "legacy",
      externalId: 869,
    });
  });

  it("accepts bare numeric < boundary as legacy (back-compat)", () => {
    expect(parseConceptSetRef(869)).toEqual({
      source: "legacy",
      externalId: 869,
    });
  });

  it("accepts offset-encoded numeric >= boundary as webapi (back-compat for PR #2560 data in flight)", () => {
    expect(parseConceptSetRef(1_000_000_007)).toEqual({
      source: "webapi",
      externalId: 7,
    });
  });

  it("accepts offset-encoded numeric string >= boundary as webapi", () => {
    expect(parseConceptSetRef("1000000007")).toEqual({
      source: "webapi",
      externalId: 7,
    });
  });

  it("rejects unknown source prefix", () => {
    expect(() => parseConceptSetRef("foo:1")).toThrow(/unknown source/i);
  });

  it("rejects negative external id", () => {
    expect(() => parseConceptSetRef("legacy:-1")).toThrow(/positive/);
  });

  it("rejects non-integer external id", () => {
    expect(() => parseConceptSetRef("webapi:1.5")).toThrow(/integer/);
  });

  it("rejects empty input", () => {
    expect(() => parseConceptSetRef("")).toThrow();
  });
});

describe("formatConceptSetRef", () => {
  it("formats legacy", () => {
    expect(formatConceptSetRef({ source: "legacy", externalId: 869 })).toBe(
      "legacy:869"
    );
  });

  it("formats webapi", () => {
    expect(formatConceptSetRef({ source: "webapi", externalId: 7 })).toBe(
      "webapi:7"
    );
  });

  it("round-trips compound forms", () => {
    const cases = ["legacy:1", "legacy:99999", "webapi:1", "webapi:42"];
    for (const c of cases) {
      expect(formatConceptSetRef(parseConceptSetRef(c))).toBe(c);
    }
  });
});

describe("isConceptSetRefString", () => {
  it("true for compound", () => {
    expect(isConceptSetRefString("legacy:1")).toBe(true);
    expect(isConceptSetRefString("webapi:1")).toBe(true);
  });

  it("false for bare numeric (still parseable, but not canonical)", () => {
    expect(isConceptSetRefString("869")).toBe(false);
  });

  it("false for nonsense", () => {
    expect(isConceptSetRefString("foo")).toBe(false);
    expect(isConceptSetRefString("")).toBe(false);
  });
});

describe("CONCEPT_SET_LEGACY_OFFSET_BOUNDARY", () => {
  it("matches PR #2560 offset for back-compat math", () => {
    expect(CONCEPT_SET_LEGACY_OFFSET_BOUNDARY).toBe(1_000_000_000);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd plugins/functions/d2e-webapi && deno task test src/utils/__tests__/conceptSetRef.test.ts`
Expected: FAIL with "Cannot find module ../conceptSetRef.ts".

If the package does not use a `test` task, fall back to the project root: `npx vitest run plugins/functions/d2e-webapi/src/utils/__tests__/conceptSetRef.test.ts`.

- [ ] **Step 3: Implement the utility**

Create `plugins/functions/d2e-webapi/src/utils/conceptSetRef.ts`:

```typescript
export type ConceptSetSource = "legacy" | "webapi";

export interface ConceptSetRef {
  source: ConceptSetSource;
  externalId: number;
}

/**
 * Boundary kept identical to PR #2560's WEBAPI_CONCEPT_SET_ID_OFFSET so that
 * any offset-encoded IDs that escaped into bookmarks/cohorts while that PR
 * was in flight still parse correctly.
 */
export const CONCEPT_SET_LEGACY_OFFSET_BOUNDARY = 1_000_000_000;

const COMPOUND_PATTERN = /^(legacy|webapi):(\d+)$/;

export const parseConceptSetRef = (
  input: string | number
): ConceptSetRef => {
  if (input === "" || input === null || input === undefined) {
    throw new Error("conceptSetRef: empty input");
  }

  if (typeof input === "number") {
    if (!Number.isInteger(input) || input < 0) {
      throw new Error(`conceptSetRef: ${input} must be a non-negative integer`);
    }
    return input >= CONCEPT_SET_LEGACY_OFFSET_BOUNDARY
      ? {
          source: "webapi",
          externalId: input - CONCEPT_SET_LEGACY_OFFSET_BOUNDARY,
        }
      : { source: "legacy", externalId: input };
  }

  const compoundMatch = input.match(COMPOUND_PATTERN);
  if (compoundMatch) {
    const [, source, raw] = compoundMatch;
    const externalId = Number.parseInt(raw, 10);
    if (!Number.isInteger(externalId) || externalId < 0) {
      throw new Error(
        `conceptSetRef: external id "${raw}" must be a positive integer`
      );
    }
    return { source: source as ConceptSetSource, externalId };
  }

  if (/^\d+$/.test(input)) {
    return parseConceptSetRef(Number.parseInt(input, 10));
  }

  if (input.includes(":")) {
    throw new Error(`conceptSetRef: unknown source prefix in "${input}"`);
  }

  throw new Error(`conceptSetRef: cannot parse "${input}"`);
};

export const formatConceptSetRef = (ref: ConceptSetRef): string =>
  `${ref.source}:${ref.externalId}`;

export const isConceptSetRefString = (input: unknown): boolean =>
  typeof input === "string" && COMPOUND_PATTERN.test(input);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: same command as Step 2.
Expected: 12 tests PASS, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add plugins/functions/d2e-webapi/src/utils/conceptSetRef.ts \
        plugins/functions/d2e-webapi/src/utils/__tests__/conceptSetRef.test.ts
git commit -m "feat: add conceptSetRef parser for compound concept-set identifiers"
```

---

### Task 2: Refactor d2e-webapi facade DTO and service to emit compound IDs

**Files:**
- Modify: `plugins/functions/d2e-webapi/src/dto/conceptset.ts:103-124`
- Modify: `plugins/functions/d2e-webapi/src/services/conceptset.service.ts` (full file — replace offset helpers)
- Test: `plugins/functions/d2e-webapi/src/services/__tests__/conceptset.service.test.ts`

- [ ] **Step 1: Update the failing service test to assert compound IDs**

Edit `plugins/functions/d2e-webapi/src/services/__tests__/conceptset.service.test.ts` — change every assertion that expects `id: 1000000007` (offset form) to expect `id: "webapi:7"`, every assertion that expects `id: 869` (legacy form) to expect `id: "legacy:869"`, and add an `externalId` assertion alongside each.

Add a new test for the dual-store list merge:

```typescript
it("merges legacy and webapi concept sets and emits compound ids for both", async () => {
  // Arrange: mock terminology svc returns [{id: 869, name: "Old"}], webapi returns [{id: 7, name: "New"}]
  // Act: const result = await getConceptSets(token, datasetId);
  // Assert:
  expect(result).toEqual([
    expect.objectContaining({ id: "legacy:869", source: "legacy", externalId: 869 }),
    expect.objectContaining({ id: "webapi:7", source: "webapi", externalId: 7 }),
  ]);
});
```

Add a test that the service rejects writes to legacy refs:

```typescript
it("throws LegacyConceptSetReadOnlyError when updating a legacy ref", async () => {
  await expect(
    updateConceptSet(token, datasetId, "legacy:869", { name: "x" })
  ).rejects.toBeInstanceOf(LegacyConceptSetReadOnlyError);
});
```

Add a back-compat test:

```typescript
it("still routes offset-encoded numeric ids to webapi (back-compat)", async () => {
  // Caller passes the raw 1000000007 — mock should observe webapi.getConceptSet(7).
  await getConceptSet(token, datasetId, 1_000_000_007);
  expect(webApiSpy).toHaveBeenCalledWith(7);
});

it("still routes bare numeric ids to terminology-svc (legacy back-compat)", async () => {
  await getConceptSet(token, datasetId, 869);
  expect(terminologySpy).toHaveBeenCalledWith(869, datasetId);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd plugins/functions/d2e-webapi && deno task test src/services/__tests__/conceptset.service.test.ts`
Expected: FAIL on the assertions changed above (still returns numeric id).

- [ ] **Step 3: Update the DTO**

In `plugins/functions/d2e-webapi/src/dto/conceptset.ts`, change `ConceptSetResponseDto` (lines 103-124):

```typescript
export const ConceptSetResponseDto = z.object({
  createdDate: z.number(),
  createdBy: z.object({
    name: z.string(),
    id: z.number().optional(),
    login: z.string().optional(),
  }),
  modifiedDate: z.number(),
  modifiedBy: z.object({
    name: z.string(),
    id: z.number().optional(),
    login: z.string().optional(),
  }),
  hasWriteAccess: z.boolean(),
  hasReadAccess: z.boolean(),
  tags: z.array(ConceptSetTag).optional(),
  description: z.string().optional(),
  id: z.string().regex(/^(legacy|webapi):\d+$/),
  externalId: z.number().int().nonnegative(),
  source: z.enum(["legacy", "webapi"]),
  name: z.string(),
  shared: z.boolean(),
});
```

Update `ConceptSetInUseErrorDto.cohortDefinitions[].id` (line 136) to `z.string()` — this field also surfaces concept-set IDs in error responses.

- [ ] **Step 4: Refactor the service**

In `plugins/functions/d2e-webapi/src/services/conceptset.service.ts`:

1. Remove these symbols entirely (introduced by PR #2560):
   - `WEBAPI_CONCEPT_SET_ID_OFFSET`
   - `encodeWebApiConceptSetId`
   - `decodeWebApiConceptSetId`
   - `isWebApiConceptSetId`
   - any `assertConceptSetWritable` that relies on the offset

2. Add at the top:

```typescript
import {
  parseConceptSetRef,
  formatConceptSetRef,
  ConceptSetRef,
} from "../utils/conceptSetRef.ts";
import { LegacyConceptSetReadOnlyError } from "../errors/ConceptSetErrors.ts";
```

3. Replace every `conceptSetId: number` parameter on exported functions with `conceptSetId: string | number` (back-compat for in-flight callers) and parse it at the top:

```typescript
export const getConceptSet = async (
  token: string,
  datasetId: string,
  conceptSetId: string | number
): Promise<IConceptSetResponseDto> => {
  const ref = parseConceptSetRef(conceptSetId);
  if (ref.source === "webapi") {
    const webapi = new WebApiConceptSetAPI(token);
    const cs = await webapi.getConceptSet(ref.externalId);
    return _mapWebApiConceptSetToFacade(cs);
  }
  const terminologySvcApi = new TerminologySvcAPI(token);
  const cs = await terminologySvcApi.getConceptSet(ref.externalId, datasetId);
  return _mapTerminologyConceptSetToFacade(cs);
};
```

4. Update both mappers to emit compound id + `externalId` + `source`:

```typescript
const _mapTerminologyConceptSetToFacade = (
  cs: ITerminologyConceptSet
): IConceptSetResponseDto => ({
  createdDate: Date.parse(cs.createdDate),
  createdBy: { name: cs.userName },
  modifiedDate: Date.parse(cs.modifiedDate),
  modifiedBy: { name: cs.userName },
  tags: [],
  hasWriteAccess: false, // legacy is read-only
  hasReadAccess: true,
  id: formatConceptSetRef({ source: "legacy", externalId: cs.id }),
  externalId: cs.id,
  source: "legacy",
  name: cs.name,
  shared: cs.shared,
});

const _mapWebApiConceptSetToFacade = (
  cs: IWebApiConceptSetHeader
): IConceptSetResponseDto => ({
  createdDate: cs.createdDate,
  createdBy: cs.createdBy,
  modifiedDate: cs.modifiedDate,
  modifiedBy: cs.modifiedBy,
  tags: cs.tags ?? [],
  hasWriteAccess: cs.hasWriteAccess,
  hasReadAccess: cs.hasReadAccess,
  id: formatConceptSetRef({ source: "webapi", externalId: cs.id }),
  externalId: cs.id,
  source: "webapi",
  name: cs.name,
  shared: false,
});
```

5. Update `assertConceptSetWritable` to use the parser:

```typescript
const _assertWritable = (ref: ConceptSetRef): void => {
  if (ref.source === "legacy") {
    throw new LegacyConceptSetReadOnlyError();
  }
};
```

6. Update `getConceptSetUsage` to accept `string | number`, parse to `ref`, and continue to use `ref.externalId` in the JSON pattern matching (the JSON in cohorts/bookmarks still contains bare numeric IDs).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd plugins/functions/d2e-webapi && deno task test src/services/__tests__/conceptset.service.test.ts`
Expected: All tests PASS including the new compound-id and back-compat tests.

- [ ] **Step 6: Commit**

```bash
git add plugins/functions/d2e-webapi/src/dto/conceptset.ts \
        plugins/functions/d2e-webapi/src/services/conceptset.service.ts \
        plugins/functions/d2e-webapi/src/services/__tests__/conceptset.service.test.ts
git commit -m "refactor(d2e-webapi): emit compound concept-set ids; drop offset encoding"
```

---

### Task 3: Update d2e-webapi route handlers and route schemas

**Files:**
- Modify: `plugins/functions/d2e-webapi/src/routes/conceptset.ts`

- [ ] **Step 1: Locate the route definitions**

Run: `grep -n "conceptset" plugins/functions/d2e-webapi/src/routes/conceptset.ts | head -40`

Identify every handler with a `:id` path parameter (typically `GET /:id`, `PUT /:id`, `PUT /:id/items`, `DELETE /:id`, `GET /:id/expression`, `GET /:id/exists`, plus `getConceptSetUsage`).

- [ ] **Step 2: Replace the id Zod schema**

Find the id schema (likely `z.coerce.number()` or `z.string().regex(/^\d+$/)`). Replace it with:

```typescript
import { isConceptSetRefString } from "../utils/conceptSetRef.ts";

const ConceptSetIdParam = z.string().refine(
  (v) => isConceptSetRefString(v) || /^\d+$/.test(v),
  { message: "id must be compound (legacy:N / webapi:N) or numeric (back-compat)" }
);
```

- [ ] **Step 3: Pass the raw string to the service**

The service now accepts `string | number`, so the handler no longer needs to coerce. Replace any `Number(params.id)` with `params.id` directly.

- [ ] **Step 4: Add a single integration-level test**

Add to `plugins/functions/d2e-webapi/src/routes/__tests__/conceptset.routes.test.ts` (or extend the existing file):

```typescript
it("GET /:id accepts compound legacy id", async () => {
  const res = await app.request("/concept-set/legacy:869", {
    headers: authHeaders,
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.id).toBe("legacy:869");
  expect(body.source).toBe("legacy");
});

it("GET /:id accepts compound webapi id", async () => {
  const res = await app.request("/concept-set/webapi:7", {
    headers: authHeaders,
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.id).toBe("webapi:7");
});

it("PUT /:id returns 403 for legacy ref", async () => {
  const res = await app.request("/concept-set/legacy:869", {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ name: "x" }),
  });
  expect(res.status).toBe(403);
  const body = await res.json();
  expect(body.error).toBe("LEGACY_CONCEPT_SET_READ_ONLY");
});
```

- [ ] **Step 5: Run the tests**

Run: `cd plugins/functions/d2e-webapi && deno task test src/routes/__tests__/conceptset.routes.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/functions/d2e-webapi/src/routes/conceptset.ts \
        plugins/functions/d2e-webapi/src/routes/__tests__/conceptset.routes.test.ts
git commit -m "feat(d2e-webapi): accept compound concept-set ids on routes"
```

---

### Task 4: Mirror the parser to the frontend concept-sets app

**Files:**
- Create: `plugins/ui/apps/concept-sets/src/utils/conceptSetRef.ts`
- Test: `plugins/ui/apps/concept-sets/src/utils/__tests__/conceptSetRef.test.ts`

- [ ] **Step 1: Copy tests verbatim from Task 1**

Copy the test file from Task 1 into the new path. Adjust the import path (`from "../conceptSetRef"` without the `.ts` extension since the frontend uses Vite/TS).

- [ ] **Step 2: Run to verify failure**

Run: `cd plugins/ui/apps/concept-sets && npx vitest run src/utils/__tests__/conceptSetRef.test.ts`
Expected: FAIL.

- [ ] **Step 3: Copy the implementation from Task 1**

Copy `conceptSetRef.ts` verbatim into the new path. Remove the `.ts` extension from any internal imports if Vite config requires it.

- [ ] **Step 4: Verify pass**

Run: same as Step 2.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/ui/apps/concept-sets/src/utils/conceptSetRef.ts \
        plugins/ui/apps/concept-sets/src/utils/__tests__/conceptSetRef.test.ts
git commit -m "feat(concept-sets-ui): mirror conceptSetRef parser"
```

---

### Task 5: Update concept-sets frontend types, axios clients, mappers

**Files:**
- Modify: `plugins/ui/apps/concept-sets/src/types/terminology.ts`
- Modify: `plugins/ui/apps/concept-sets/src/axios/d2e-webapi.ts`
- Modify: `plugins/ui/apps/concept-sets/src/d2eWebapiMappers.ts`

- [ ] **Step 1: Update the `ConceptSet` type**

In `plugins/ui/apps/concept-sets/src/types/terminology.ts`, change the `ConceptSet` type:

```typescript
export interface ConceptSet {
  id: string;              // compound: "legacy:N" or "webapi:N"
  externalId: number;      // raw id within the source store
  source: "legacy" | "webapi";
  name: string;
  shared: boolean;
  // ... existing fields preserved
  hasWriteAccess: boolean;
  hasReadAccess: boolean;
}
```

- [ ] **Step 2: Update the d2e-webapi axios client**

In `plugins/ui/apps/concept-sets/src/axios/d2e-webapi.ts`, change every method that takes `conceptSetId: number` to `conceptSetId: string`. Backend already URL-decodes path params, but ensure no double-encoding:

```typescript
export const getConceptSetById = (conceptSetId: string) =>
  axios.get<ConceptSet>(`/concept-set/${encodeURIComponent(conceptSetId)}`);

export const updateConceptSet = (conceptSetId: string, body: UpdateConceptSetBody) =>
  axios.put(`/concept-set/${encodeURIComponent(conceptSetId)}`, body);

// ... same for delete, items, expression, exists
```

- [ ] **Step 3: Update the mapper**

In `plugins/ui/apps/concept-sets/src/d2eWebapiMappers.ts`, the function `mapd2eWebapiConceptSet`: forward `id`, `externalId`, `source`, `hasWriteAccess`, `hasReadAccess` from the DTO unchanged. Remove any local code that re-encodes ids.

- [ ] **Step 4: Run the existing tests, fix breakage**

Run: `cd plugins/ui/apps/concept-sets && npx vitest run`
Expected: any test that previously expected numeric ids now fails. Update those assertions to expect the compound string form.

- [ ] **Step 5: Commit**

```bash
git add plugins/ui/apps/concept-sets/src/types/terminology.ts \
        plugins/ui/apps/concept-sets/src/axios/d2e-webapi.ts \
        plugins/ui/apps/concept-sets/src/d2eWebapiMappers.ts \
        plugins/ui/apps/concept-sets/src/**/__tests__/*
git commit -m "feat(concept-sets-ui): switch ConceptSet.id to compound string"
```

---

### Task 6: Update ConceptSetsTable and Terminology editor

**Files:**
- Modify: `plugins/ui/apps/concept-sets/src/ConceptSets/ConceptSetsTable.tsx`
- Modify: `plugins/ui/apps/concept-sets/src/Terminology/Terminology.tsx`
- Modify: `plugins/ui/apps/concept-sets/src/ConceptSets/ConceptSetDeleteDialog.tsx`

- [ ] **Step 1: Replace numeric id usages**

In `ConceptSetsTable.tsx`, find every place that displays or routes by id. The Column for "ID" should now render `row.externalId` (more readable) but the row key and any URL/route should use `row.id` (compound). Selection state (`selectedConceptSetIds: Set<string>`) becomes string-keyed.

- [ ] **Step 2: Update Terminology editor**

In `Terminology.tsx`, the loaded concept set is now `{ id: string, externalId: number, source: "legacy" | "webapi", ... }`. Update local state, prop types, and any `Number(id)` calls. The read-only banner check (`!conceptSet.hasWriteAccess`) still holds — no logic change needed there.

- [ ] **Step 3: Update delete dialog**

In `ConceptSetDeleteDialog.tsx`, the `conceptSetId` prop becomes string. The "in use" error response (`ConceptSetInUseErrorDto`) now carries string ids in `cohortDefinitions[].id`; update any rendering.

- [ ] **Step 4: Run UI test suite**

Run: `cd plugins/ui/apps/concept-sets && npx vitest run`
Expected: PASS.

- [ ] **Step 5: Run dev server and manually smoke a webapi set + legacy set**

Run: `cd plugins/ui/apps/concept-sets && npm run dev`
Open the app, confirm: (i) list shows both sources with chip; (ii) clicking a webapi set opens editable; (iii) clicking a legacy set shows the read-only banner; (iv) ID column displays bare integer; (v) deleting a webapi set succeeds; (vi) attempting to delete a legacy set is not available (no button).

- [ ] **Step 6: Commit**

```bash
git add plugins/ui/apps/concept-sets/src/ConceptSets/ConceptSetsTable.tsx \
        plugins/ui/apps/concept-sets/src/Terminology/Terminology.tsx \
        plugins/ui/apps/concept-sets/src/ConceptSets/ConceptSetDeleteDialog.tsx \
        plugins/ui/apps/concept-sets/src/ConceptSets/__tests__/*
git commit -m "feat(concept-sets-ui): wire compound ids through table, editor, delete dialog"
```

---

### Task 7: Mirror parser into vue-mri-ui-lib and update query-filter types

**Files:**
- Create: `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/utils/conceptSetRef.ts`
- Test: `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/utils/__tests__/conceptSetRef.test.ts`
- Modify: `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/types/AtlasTypes.ts:5-8`
- Modify: `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/types/QueryFilterTypes.ts`
- Modify: `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/types/ConceptSetTypes.ts:148-150`
- Modify: `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/services/ConceptSetApiService.ts`
- Modify: `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/models/QueryFilterModel.ts`

- [ ] **Step 1: Copy parser + tests verbatim**

Copy the parser and test file from Task 1 into the new path (adjust import paths and extensions as Vite expects).

- [ ] **Step 2: Update AtlasTypes**

In `AtlasTypes.ts:5-8`:

```typescript
export interface AtlasConceptSetReference {
  conceptSetId?: string; // compound: "legacy:N" | "webapi:N"
  // ... existing fields
}
```

- [ ] **Step 3: Narrow QueryFilterTypes union**

In `QueryFilterTypes.ts`, find every field of type `string | number` named `conceptSetId` (or nested inside `contDrugSettings`). Narrow to `string`. The `ConceptSetDetails` map keyed by `[conceptSetId: string]` in `ConceptSetTypes.ts:148-150` is already correct.

- [ ] **Step 4: Add back-compat parsing in QueryFilterModel load path**

In `QueryFilterModel.ts`, find the deserialization point (constructor or `fromJson` method) where the saved state is loaded. Wrap each `conceptSetId` field load with:

```typescript
import { parseConceptSetRef, formatConceptSetRef } from "../utils/conceptSetRef";

const normalizeConceptSetId = (raw: string | number | undefined): string | undefined => {
  if (raw === undefined || raw === null || raw === "") return undefined;
  try {
    return formatConceptSetRef(parseConceptSetRef(raw));
  } catch {
    return undefined;
  }
};
```

Apply at every load site that reads `conceptSetId` from persisted JSON.

- [ ] **Step 5: Update ConceptSetApiService**

`ConceptSetApiService.ts` should accept `conceptSetId: string` and pass through to the d2e-webapi endpoint (which already accepts compound).

- [ ] **Step 6: Run mri-ui tests**

Run: `cd plugins/ui/apps/vue-mri-ui-lib && npm test`
Expected: PASS (fix any assertions referencing numeric `conceptSetId`).

- [ ] **Step 7: Commit**

```bash
git add plugins/ui/apps/vue-mri-ui-lib/src/query-filter/utils/conceptSetRef.ts \
        plugins/ui/apps/vue-mri-ui-lib/src/query-filter/utils/__tests__/conceptSetRef.test.ts \
        plugins/ui/apps/vue-mri-ui-lib/src/query-filter/types/AtlasTypes.ts \
        plugins/ui/apps/vue-mri-ui-lib/src/query-filter/types/QueryFilterTypes.ts \
        plugins/ui/apps/vue-mri-ui-lib/src/query-filter/types/ConceptSetTypes.ts \
        plugins/ui/apps/vue-mri-ui-lib/src/query-filter/services/ConceptSetApiService.ts \
        plugins/ui/apps/vue-mri-ui-lib/src/query-filter/models/QueryFilterModel.ts
git commit -m "feat(mri-ui): accept compound concept-set ids in query filter"
```

---

### Task 8: Update analytics IFR converter and query-gen-svc passthroughs

**Files:**
- Modify: `plugins/functions/analytics-svc/src/ifr-to-extcohort/cdmConfigUtils.ts:187`
- Modify: `plugins/functions/analytics-svc/src/ifr-to-extcohort/conceptGetters.ts:76-87`
- Modify: `plugins/functions/query-gen-svc/src/api/TerminologySvcAPI.ts:37-54`

These services already carry `conceptSetId` as `string[]`. The only change needed is: when a compound id arrives, parse it locally so the HTTP call to the downstream service uses the correct numeric externalId AND so a `source` header can route legacy vs webapi.

- [ ] **Step 1: Add a thin parser to each service**

For each of the three services, add a local utility (do NOT cross-import across functions packages):

`plugins/functions/analytics-svc/src/utils/conceptSetRef.ts` — copy from Task 1.
`plugins/functions/query-gen-svc/src/utils/conceptSetRef.ts` — copy from Task 1.

Add minimal tests (4 cases: parse legacy, parse webapi, back-compat bare numeric, format round-trip).

- [ ] **Step 2: Update IFR converter**

In `cdmConfigUtils.ts:187`, when building `conceptSetId` for the output constraint, emit the compound form:

```typescript
import { formatConceptSetRef } from "../utils/conceptSetRef";

// where previously: conceptSetId: String(conceptValue)
conceptSetId: formatConceptSetRef({ source: "legacy", externalId: Number(conceptValue) }),
```

(Reason: IFR config is legacy-origin until that whole flow is also migrated; emit `legacy:N` to keep the contract honest.)

In `conceptGetters.ts:76-87`, when calling the downstream `concept-set/${conceptSetId}` HTTP endpoint, the d2e-webapi side now accepts compound directly. No code change required, but **add an assertion test** that the URL contains a colon.

- [ ] **Step 3: Update query-gen-svc**

In `TerminologySvcAPI.ts:37-54`, `getConceptIds(conceptSetIds: string[])` currently POSTs to `/concept-set/included-concepts`. The terminology-svc downstream still expects bare numeric. Parse and split before sending:

```typescript
import { parseConceptSetRef } from "../utils/conceptSetRef";

async getConceptIds(conceptSetIds: string[]) {
  const refs = conceptSetIds.map(parseConceptSetRef);
  const legacyIds = refs.filter(r => r.source === "legacy").map(r => r.externalId);
  const webapiIds = refs.filter(r => r.source === "webapi").map(r => r.externalId);
  const [legacyConcepts, webapiConcepts] = await Promise.all([
    legacyIds.length > 0
      ? this.http.post("/concept-set/included-concepts", { conceptSetIds: legacyIds })
      : Promise.resolve({ data: [] }),
    webapiIds.length > 0
      ? this.http.post("/webapi/concept-set/included-concepts", { conceptSetIds: webapiIds })
      : Promise.resolve({ data: [] }),
  ]);
  return [...legacyConcepts.data, ...webapiConcepts.data];
}
```

(If the `/webapi/concept-set/included-concepts` endpoint does not yet exist on the d2e-webapi side, add it as a thin facade in `plugins/functions/d2e-webapi/src/routes/conceptset.ts` that fans out per-id to `WebApiConceptSetAPI.getConceptSetItems`.)

- [ ] **Step 4: Run analytics-svc and query-gen-svc tests**

Run: `cd plugins/functions/analytics-svc && deno task test` and `cd plugins/functions/query-gen-svc && deno task test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/functions/analytics-svc/src/utils/conceptSetRef.ts \
        plugins/functions/analytics-svc/src/utils/__tests__/conceptSetRef.test.ts \
        plugins/functions/analytics-svc/src/ifr-to-extcohort/cdmConfigUtils.ts \
        plugins/functions/analytics-svc/src/ifr-to-extcohort/conceptGetters.ts \
        plugins/functions/query-gen-svc/src/utils/conceptSetRef.ts \
        plugins/functions/query-gen-svc/src/utils/__tests__/conceptSetRef.test.ts \
        plugins/functions/query-gen-svc/src/api/TerminologySvcAPI.ts
git commit -m "feat(analytics,query-gen): emit/parse compound concept-set ids"
```

---

### Task 9: Update cohort-definition warning DTO

**Files:**
- Modify: `plugins/functions/d2e-webapi/src/dto/cohortdefinition.ts:87`

- [ ] **Step 1: Update field type**

In `cohortdefinition.ts` find the `conceptSetId: number` field (around line 87) inside the check warnings DTO:

```typescript
// before
conceptSetId: z.number(),
// after
conceptSetId: z.string().regex(/^(legacy|webapi):\d+$/),
```

- [ ] **Step 2: Find every emitter and convert**

Run: `grep -rn "conceptSetId:" plugins/functions/d2e-webapi/src --include="*.ts"`

For every place that builds this warning payload from a raw cohort definition, wrap with:

```typescript
import { formatConceptSetRef } from "../utils/conceptSetRef.ts";
// ...
conceptSetId: formatConceptSetRef({ source: "legacy", externalId: rawCodesetId }),
```

(Reason: Circe `CodesetId` is local-to-expression integer; for warning *display*, we surface it via the legacy namespace by default. If the warning system later needs to distinguish, the Circe expression's `conceptSets[]` block carries the original source — out of scope here.)

- [ ] **Step 3: Run cohort-definition tests**

Run: `cd plugins/functions/d2e-webapi && deno task test src/services/__tests__/cohortdefinition.service.test.ts`
Expected: PASS (update any assertion expecting numeric `conceptSetId`).

- [ ] **Step 4: Commit**

```bash
git add plugins/functions/d2e-webapi/src/dto/cohortdefinition.ts \
        plugins/functions/d2e-webapi/src/services/cohortdefinition.service.ts \
        plugins/functions/d2e-webapi/src/services/__tests__/cohortdefinition.service.test.ts
git commit -m "refactor(cohort-def): surface compound concept-set id in warnings"
```

---

### Task 10: End-to-end smoke and final commit

- [ ] **Step 1: Start the local stack**

Run whatever the project README specifies for the local dev stack (typically `docker compose up` in the repo root for portal+terminology+webapi, then `npm run dev` in the relevant UI app).

- [ ] **Step 2: Manual smoke checklist**

In a browser:
- [ ] Concept Sets list page shows both legacy and webapi sets with correct chips and the ID column shows bare integer.
- [ ] Open a webapi set — edit, save name change — refresh — change persisted.
- [ ] Open a legacy set — banner says read-only; edit and delete buttons hidden.
- [ ] Create a new concept set — confirm it appears with `webapi:` chip.
- [ ] Open the Network tab; confirm `PUT /concept-set/webapi:N` request URLs contain the compound id.
- [ ] Load an existing bookmark that references a legacy concept set (bare numeric `"value":"869"`) — confirm it still resolves and the concept set loads read-only.
- [ ] If you have a bookmark saved during PR #2560's offset window (`"value":"1000000007"`), confirm it still resolves to the webapi set (back-compat).

- [ ] **Step 3: Run the full test pipeline**

Run from repo root: `npm test` or the equivalent monorepo command.
Expected: all packages green.

- [ ] **Step 4: Final cleanup commit**

If anything was changed during the smoke (test fixtures, snapshots), commit it:

```bash
git add -A
git status
git commit -m "chore: smoke fixes for concept-set compound id rollout"
```

- [ ] **Step 5: Push and open PR**

```bash
git push -u origin khairul-syazwan/analyze-2560
gh pr create --title "Replace concept-set offset id with compound source:id format" --body "$(cat <<'EOF'
## Summary
- Replaces the `webApiId + 1_000_000_000` offset encoding from PR #2560 with an explicit compound identifier (`legacy:N` / `webapi:N`) exposed in the d2e-webapi facade DTO and consumed end-to-end.
- Adds a single canonical parser (`parseConceptSetRef` / `formatConceptSetRef`) mirrored across d2e-webapi, concept-sets UI, vue-mri-ui-lib, analytics-svc, and query-gen-svc.
- Back-compat: the parser still accepts bare-numeric ids (`869` → `legacy:869`) and offset-encoded ids (`1000000007` → `webapi:7`), so any bookmarks/cohorts persisted during the offset window keep working.

## Test plan
- [ ] Unit: `conceptSetRef` parser tests pass in all packages.
- [ ] Unit: d2e-webapi service tests assert compound id on legacy and webapi results.
- [ ] Integration: route tests accept `legacy:N` and `webapi:N` path params.
- [ ] Manual: list/create/edit/delete on both sources via UI.
- [ ] Manual: load a bookmark with bare-numeric and offset-numeric `value` — both resolve.
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage**: every dependent surface listed in the research phase (d2e-webapi facade, concept-sets UI, vue-mri-ui-lib query filter, analytics IFR converter, query-gen-svc, cohort-definition warning DTO) has a task. Bookmark JSON rewrite is intentionally out of scope (back-compat parser handles read).
- **Back-compat is load-bearing**: the parser must accept bare numeric AND offset numeric forever, because both can exist in already-persisted bookmark/cohort JSON. Don't remove that branch in a follow-up "cleanup" without a separate data migration.
- **Cohort Circe `CodesetId` is local to a cohort expression** — it is NOT a global concept-set id. Do not migrate it. The `conceptSets[]` array inside a Circe expression embeds the full inlined expression, so migration of the source store doesn't change cohort-expression internals.
- **`shared` flag** is hardcoded `false` on the webapi mapper (carried over from PR #2560). That data-loss decision is a separate plan; not addressed here.
- **WebAPI dataset scoping** is also a separate concern (WebAPI is globally scoped per instance; legacy is per-dataset). Out of scope.
