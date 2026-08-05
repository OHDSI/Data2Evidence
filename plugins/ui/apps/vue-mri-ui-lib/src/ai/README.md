# `src/ai` — Patient Analytics agent tool surface

The `pa_*` tools that let an AI agent drive the **Patient Analytics (PA)** cohort
builder: read the live cohort, edit it with typed patch ops, resolve filter values,
read the computed result, and save.

> This README is for *developers* — what the tools are, how they are wired, how to test and extend them.
> Behavioural rules for the model belong there (and in each tool's `description`),
> not here.

---

## Files

| File | Role |
|---|---|
| [`webmcpServer.ts`](./webmcpServer.ts) | The tool definitions. `createPaTools(store, hooks)` builds the array; `registerPaTools` adapts it to the browser's `modelContext`. |
| [`paToolBridge.ts`](./paToolBridge.ts) | `publishPaTools(store, hooks)` — publishes the same tools on `window.__d2ePaTools` for the portal's in-app assistant drawer. |
| [`cohortPatch.ts`](./cohortPatch.ts) | `applyCohortPatch` (the typed-patch applier) and `describeCardGroups` (the AND/OR grouping readout). |
| [`valueResolution.ts`](./valueResolution.ts) | Query → stored-token matching for `pa_search_attribute_values`: `rankValues`, `alternateQueries`, `expandQuery`. Browser-side twin of the backend's `cohortValueResolver.ts`. |
| [`__tests__/`](./__tests__/) | Vitest suites, one per module. |

## Wiring

Both surfaces are created on `PatientAnalytics.vue` mount and torn down on
unmount — the tools exist **only while PA is on screen**, and no tool can mount PA:

```ts
// PatientAnalytics.vue, mounted()
const paToolHooks = { showBuilder: () => this.toggleCohorts(false) }
this._unregisterPaTools = registerPaTools(this.$store, paToolHooks)  // browser agent
this._unpublishPaTools  = publishPaTools(this.$store, paToolHooks)   // portal drawer
```

**One tool array, two consumers** — a tool can never exist for one and not the other:

1. **External browser agent** (Chrome DevTools MCP / Claude) via WebMCP.
   `registerPaTools` looks for `document.modelContext`, falling back to
   `navigator.modelContext` (Chrome 146–149, deprecated). Requires
   `chrome://flags/#enable-webmcp-testing`; without it the register call warns and
   no-ops. Do **not** import the `@mcp-b/global` polyfill when the flag is on.
2. **Portal AI assistant drawer** via the `window.__d2ePaTools` registry
   (`{ version, datasetId, list(), call() }`). The drawer runs in a different
   single-spa bundle with no shared module graph, hence a `window` registry rather
   than an import. Consumers must **re-read the registry at call time** — PA deletes
   it on unmount, and that re-read is what turns "PA went away mid-conversation"
   into a clean error instead of a dead store. `PA_TOOLS_CHANGED_EVENT` fires on
   appear/disappear. Bump `version` on any incompatible shape change; the portal
   side refuses a version it doesn't understand.

`PaComponentHooks` carries anything that lives in the component rather than Vuex.
Today that is only `showBuilder()` — functionally required, because the chart-query
watcher only runs while the builder (and its chart) is mounted, so without it a
programmatically built cohort never computes a count.

## The tools

All return the MCP envelope `{ content: [{ type: 'text', text: '<json>' }] }`.

| Tool | Args | Returns |
|---|---|---|
| `pa_new_cohort` | `name?` | Resets the builder to a blank cohort and switches to the builder view. |
| `pa_get_current_cohort` | — | `{ bookmarkData, ifr, cardGroups, cardGroupsNote }` — the definition, plus the real `filterCardId`s and the AND/OR grouping. |
| `pa_list_cohorts` | `forceRefresh?` | `{ cohorts: [{ bmkId, name }] }`. The default path can serve a stale cache — force after a save. |
| `pa_open_cohort` | `name` \| `bmkId`, `chartType?` | Loads a saved cohort and renders it. Reports `ambiguous` when a name matches several. |
| `pa_apply_cohort_patch` | `patchOps[]`, `bookmark?` (legacy), `chartType?` | Applies typed ops in place; result carries `appliedConstraints` + `cardGroups`. On failure: `{ applied:false, error, validFilterOptions }`. |
| `pa_list_filter_options` | `card?` | `{ filterCards:[{ cardConfigPath, cardName, attributes:[{ attributePath, name, type, valueKind, conceptDomain? }] }], valueKindGuide, note }`. |
| `pa_search_attribute_values` | `attributePath`, `query?`, `attributeType?`, `limit?` | `{ matchedVia, total, returned, truncated, loadedStatus, domainTotal?, values, note? }`. |
| `pa_get_cohort_result` | — | `{ currentPatientCount, totalPatientCount, chartType, chart }` — the **live computed** result, not the definition. |
| `pa_save_current_cohort` | `name?`, `share?`, `bookmarkId?`, `method?`, `params?` | Inserts or updates via `fireBookmarkQuery`, refreshes the list, adopts the saved record as active. |

### Patch ops

`pa_apply_cohort_patch` is the only way to add or remove a filter. Ops are typed
*intent* applied by the app's own store actions — the applier **is** the builder:

```
{ op:"add_card", cardConfigPath, exclude?, ref?, orWith? }
{ op:"add_constraint", card, attributePath, value, operator? }
{ op:"remove_card", card }
{ op:"remove_constraint", card, attributePath }
{ op:"set_card_join", card, join:"AND"|"OR" }
```

Cards in the same group are OR-ed; groups are AND-ed. `orWith` puts a new card in
an existing card's group; `set_card_join` regroups the **later** card of a pair.
The Basic Data card (`patient`) always exists — constrain it, never `add_card` it.

The legacy `{ bookmark }` argument takes a full tree and is kept for back-compat
with backend builders only. A hand-authored tree is rejected and the previous
active bookmark restored, because `loadBookmarkDataToState` clobbers the active
bookmark with a stub *before* it parses — a malformed tree used to leave the
builder pointing at a broken cohort that then crashed the chart.

### `valueKind` routing

`pa_list_filter_options` tags every attribute with a `valueKind` and ships a single
`valueKindGuide` legend per response. This matters most on non-OMOP (SAP HANA /
LEAF) datasets, which filter on **source concept codes** and **concept sets**, not
OMOP standard concept ids — a bare `type:"text"` doesn't distinguish those.

| `valueKind` | How the value is supplied |
|---|---|
| `numeric` | `value:<number>` + `operator` |
| `date` | `value:{ from, to }` |
| `conceptSet` | `value:{ conceptSetId }`, built via backend `d2e-mcp`; must match the attribute's `conceptDomain` |
| `catalog` | exact stored token resolved with `pa_search_attribute_values` |
| `text` | `value:<string>` |

### Value resolution

The `/values` endpoint search runs in the database: it is case-sensitive and
matches the stored token, not the word for it. So a zero-hit search is never proof
a value is absent, and `pa_search_attribute_values` compensates in layers before it
gives up — reported back as `matchedVia`:

| `matchedVia` | Meaning |
|---|---|
| `search` | the endpoint's own search matched |
| `domain-scan` | search was empty; the unfiltered domain was re-read and matched locally (`rankValues`) |
| `alternate-query` | matched via a rewritten query (`alternateQueries`: casings, expansions, distinctive words) |
| `domain` | nothing matched — the rows are the attribute's **complete** value list, to pick from |
| `none` | the column could not be read at all; try a different `attributePath` |

Two subtleties worth knowing before you touch this path:

- Before every unfiltered read the handler commits `DOMAIN_SET_VALUES … isLoaded:false`.
  An earlier search leaves the attribute cached as loaded with *that search's*
  (possibly empty) rows, and the store would serve them back — turning the domain
  fallback into a no-op that confirms its own miss.
- The store resolves `undefined` when a newer request for the same `attributePath`
  supersedes an in-flight one. That's a race, not an empty domain, so
  `fetchValuesRetrying` retries once (the retry is uncontended).

`limit` defaults to `DEFAULT_VALUE_LIMIT` (50), capped at `MAX_VALUE_LIMIT` (200),
and is re-validated at run time by `resolveValueLimit` — it crosses an unvalidated
tool boundary, so the declared schema is not what makes it a number.

## Payload budget

Tool output lands in the agent transcript, which is resent **in full on every
turn** — so payload size is a correctness concern, not just a cost one. Two
deliberate designs:

- The `valueKindGuide` legend is sent once per response instead of inlined per
  attribute. A dataset can expose 170+ filter attributes; hoisting the ~150 chars
  took `pa_list_filter_options` from ≈60 KB to ≈27 KB.
- A failed patch attaches `recoveryFilterOptions`, not the whole catalog: every card
  by path + name, plus the attributes of only the card(s) the failing ops named.
  Re-sending everything duplicated ~30 KB per failure, and two of those blew the
  drawer's request body limit.

Only `getFilterAttributes()` is listed, never `getAllAttributes()` — the latter
includes measure/category-only attributes that `add_constraint` cannot target.

## Testing

```bash
cd plugins/ui/apps/vue-mri-ui-lib
yarn test:unit                    # or: npx vitest run src/ai
```

`createPaTools` is exported separately from `registerPaTools` precisely so the
handlers can be tested against a **mocked Vuex store** — no Chrome flag, no
`modelContext`, no browser. That handler ↔ Vuex layer is where the real bugs live;
`registerPaTools` is a thin adapter over whatever the array contains.

## Adding or changing a tool

1. Add it to the array returned by `createPaTools` — both consumers pick it up.
2. Write the `description` for the model, not for a developer: state when to call
   it, what the fields mean, and the failure it should avoid. These descriptions are
   the primary behavioural contract and are long on purpose.
3. Make failures self-correcting — return the thing that fixes the error (valid
   paths, the complete value list) rather than a message the model must chase.
4. Add a case to [`__tests__/webmcpServer.test.ts`](./__tests__/webmcpServer.test.ts).
5. Changing the registry shape or the change event in `paToolBridge.ts` requires the
   portal-side consumer to land together with it; bump `PaToolRegistry.version`.
