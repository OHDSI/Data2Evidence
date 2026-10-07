# Inclusion Report / Attrition Plot

This folder holds the **Inclusion Report** that Patient Analytics users know as the
**Attrition Plot**. It takes the filter cards of the current cohort, turns each one into a
*rule*, and shows how many patients remain as the rules are applied one after another:

- a **summary** (total persons, matches),
- a **rules table** whose rows can be reordered by drag-and-drop or by the up/down chevrons,
- a **funnel chart** (plotly) with CSV and PNG export,
- optionally an **Intersect view**: a treemap (echarts) of every pass/fail combination, which can
  be filtered by ANY/ALL and PASSED/FAILED.

"Inclusion report" is the code name and "attrition plot" is the name in the UI. They are the same
feature.

---

## Where it is mounted

The component in `index.vue` has two hosts, and they wire it up differently:

| Host | Where the user sees it | Data source | Props of note |
|---|---|---|---|
| [ChartToolbar.vue](../../../components/ChartToolbar.vue) | PA chart toolbar → **Attrition Plot** button → `VDialog` | analytics-svc (see [Backend](#backend)) | `fetch-attrition-report`, `filter-card-details`, `show-person-event-switch=false`, `show-intersect-view` from config |
| [ExecuteSidePanel.vue](../ExecuteSidePanel.vue) (retired) | D2E cohort builder → execute side panel → *Inclusion report* tab | d2e-webapi `getInclusionReport` (Atlas-style, needs a generated cohort) | `show-intersect-view=true`, PERSON/EVENT switch shown, no `filter-card-details` |

**The PA dialog (ChartToolbar) is the main path.** Most of the recent work targets it.

The PA button only shows when `getActiveBookmark && enableInclusionReport` (see
[Configuration](#configuration)).

---

## Configuration

Two booleans in the PA config's `panelOptions` control the feature:

| Key | Default | Effect |
|---|---|---|
| `panelOptions.inclusionReport` | `false` | Shows the **Attrition Plot** button in the PA chart toolbar. If it is off, the feature is unreachable from PA. |
| `panelOptions.intersectViewInclusionReport` | `false` | Adds the **Intersect** tab (treemap and filter controls) and **switches the backend endpoint**. See below. |

### How a flag gets to the component

```
PA config (mri-pg-config DB)
  └─ mri-pa-config  Formatter.formatFrontendConfig()      copies both keys into config.panelOptions
       └─ vue-mri  MriFrontEndConfig._internalConfig       (store getter getMriFrontendConfig)
            └─ ChartToolbar.vue
                 enableInclusionReport               → v-if on the button
                 enableIntersectViewInclusionReport  → :show-intersect-view
```

| Concern | File |
|---|---|
| Schema (both `boolean`, `strict: false`) | `plugins/functions/mri-pa-config/src/config/configDefinition.ts` |
| Defaults (`false` / `false`) | `plugins/functions/mri-pa-config/cfg/pa/configDefaultValues.ts` |
| Passed through to the frontend config | `plugins/functions/mri-pa-config/src/config/formatter.ts` |
| Admin UI switches: *"Enable Attrition Plot"* and *"Enable Intersect View in Attrition Plot"* (the second appears only while the first is on) | `plugins/ui/apps/portal/src/plugins/mri/PatientAnalyticsConfig/ui5/views/AppSettingsTab.view.xml` (labels in `ui5/i18n/text_en_GB.properties`, `MRI_PA_CFG_*INCLUSION_REPORT*`) |
| Kept when a PA config is regenerated from its CDM config | `.../PatientAnalyticsConfig/ui5/views/DetailsTab.controller.js` |
| Seeded values | `plugins/functions/mri-pg-config/src/db/seeds/03_Config.ts`. Only the `paConfigDuckdb` seed ships `inclusionReport: true`. Every other seed, and `configs/fhirConfigDuckdb.ts`, ships both flags as `false`. |

**To turn it on locally:** open the PA config in the portal admin, go to the App Settings tab,
switch on *Enable Attrition Plot*, then save and activate the config. Then reload PA and load a
bookmark.

### ⚠️ `intersectViewInclusionReport` changes more than the UI

| Flag | Endpoint | Queries per load | Reorder |
|---|---|---|---|
| off (default) | `selectiveinclusionreport` | **n + 1**: one cumulative count per rule, plus the total | Calls the API again with `?ruleOrder=[…]` |
| on | `inclusionreport` | **2ⁿ**: one per pass/fail bitmask, which also feeds the treemap | Recomputed locally from the treemap (`computeAttritionStats`). No request. |

2ⁿ grows quickly: 10 rules means 1,024 queries. Keep this in mind before you turn the flag on
for a real dataset.

---

## Data flow

```
                 ChartToolbar.vue                                   index.vue
 getBookmarksData ──┬─► fetchSelectiveInclusionReport(ruleOrder?) ──► useInclusionReportData
 (the IFR/mriquery) │     GET …/population/json/selectiveinclusionreport     │  fetch on mount; maps the API
                    │                                                       │  response → InclusionReportResponse
                    ├─► fetchInclusionReport() (cached per mriquery)        ▼
                    │     GET …/population/json/inclusionreport      useRuleManagement
                    │                                                  draggableAttritionStats (row order)
                    └─► getInclusionReportFilterCardDetails()          reorder → re-fetch or recompute
                          (utils/filterCardUtils.ts)                       │
                          = filter-card-details, indexed by rule id        ▼
                                                                 useFunnelChart   useTreemapChart
                                                                 (plotly)         (echarts, intersect only)
```

### Backend

- Route: `plugins/functions/analytics-svc/src/api/controllers/population.ts`, `case "inclusionreport"`
  and `case "selectiveinclusionreport"`.
- Logic: `plugins/functions/analytics-svc/src/mri/endpoint/InclusionReportEndpoint.ts`
  - `getInclusionReportFiltercards` turns the mriquery's filter cards into rules (see the
    invariant below).
  - `processRequestForSelectiveInclusionReport` builds cumulative masks (`'1'`, `'11'`, `'110'`, …),
    with one `irtotalpcount` query each, plus a total patient count.
  - `processRequest` runs the full 2ⁿ bitmask set for the treemap.
- `query-gen-svc` handles Basic Data specially for these queries
  (`plugins/functions/query-gen-svc/src/utils/inclusionReport.ts`).

---

## File map

| File | Role |
|---|---|
| `index.vue` | Shell component: props, view state (PERSON/EVENT, ATTRITION/INTERSECT), wires the composables, loaders, export menus |
| `composables/useInclusionReportData.ts` | Fetching. Chooses the attrition API or the inclusion-report API, keeps PERSON/EVENT responses separately, builds `treemapData` |
| `composables/useRuleManagement.ts` | Row order, reorder handlers, aborting stale reorder requests, restoring rule ids, checkbox selection for the intersect view, error message |
| `composables/useFunnelChart.ts` | Plotly funnel: label wrapping and truncation, hover, clickable y-axis labels, colour thresholds, PNG/CSV export |
| `composables/useTreemapChart.ts` | Echarts treemap: ANY/ALL and PASSED/FAILED greying, custom legend, PNG/CSV export |
| `computeAttritionStats.ts` | Local attrition from the treemap (adapted from OHDSI Atlas), and API-response → `AttritionStat` mapping |
| `computeTreemapStats.ts` | Treemap → echarts nodes, tooltip HTML, colour by number of failures |
| `ruleSelectionFilter.ts` | Pure ANY/ALL × PASSED/FAILED predicates over bitmask strings |
| `estimatedProgressSpinnerDuration.ts` + `components/EstimatedProgressSpinner.vue` | **Simulated** progress. Its duration is estimated from rule and patient counts, not from real progress. |
| `constants.ts` | Colours, funnel thresholds and legend labels, funnel font, label and hover width budgets |
| `components/RulesTable.vue` | Draggable table (`vue-draggable-plus`). Dragging is disabled on the Intersect tab. |
| `components/RuleNameContent.vue` | Renders one rule name with its constraints underneath |
| `components/SummaryTable.vue`, `components/FilterControls.vue` | Summary block, and the ANY/ALL and PASSED/FAILED selects |
| Outside this folder | [`../../types/InclusionReportTypes.ts`](../../types/InclusionReportTypes.ts), [`../../../utils/filterCardUtils.ts`](../../../utils/filterCardUtils.ts) (`getInclusionReportFilterCardDetails`, `getRuleNameParts`, `getRuleDisplayName`), [`../../../utils/ExportUtils.ts`](../../../utils/ExportUtils.ts) (`wrapTextByWidth`, `wrapTextToLineLimit`, `truncateTextToWidth`) |

---

## Invariants: read these before changing anything

1. **The frontend rule order must match the backend rule order exactly.**
   `getInclusionReportFilterCardDetails` (frontend) repeats the logic of
   `getInclusionReportFiltercards` (backend):
   - Basic Data comes first, split into **one rule per constrained attribute**.
   - Next come the inclusion cards of every non-Basic container.
   - The excluded (`op: "NOT"`) cards come last.

   `filterCardDetails[stat.id]` relies on this order. If you change one side, change the other
   too, or the rule names and constraints will attach to the wrong rows.

2. **`stat.id` is the original rule index, even after a reorder.** When the backend receives a
   `ruleOrder`, it renumbers ids to their new positions. `useRuleManagement.fetchAndUpdateAttritionStats`
   puts the original ids back (`stat.id = ruleOrder[idx]`). Without that step, the detail lookup in
   invariant 1 breaks after the first drag. The e2e spec checks the names again after a reorder
   for this reason.

3. **There is one source of truth for display names.** The table, the funnel labels and the CSV all
   go through `getRuleNameParts` / `getRuleDisplayName`. Basic Data rules are labelled with
   their attribute name (`+ Gender`, not `+ Basic Data`). That label comes from the
   `isBasicData` flag, which is set **only** in the extractor and never inferred from the name.
   Call `extract` with exactly one argument (`.map(e => extract(e))`). Passing it directly to `.map`
   would hand over the array index as `isBasicData`.

4. **Funnel y labels must be unique.** Plotly's categorical axis merges equal labels into one
   tick. Duplicates are made unique by appending zero-width spaces (`​`). The same pass builds
   `labelPoints` (label → point index), which the label-hover handlers use.

5. **The funnel is plotted as trace 0 (`FUNNEL_TRACE_INDEX`).** The legend placeholder traces come
   after it and have `hoverinfo: 'skip'`. Label hovers call
   `plotly.Fx.hover(graphDiv, [{ curveNumber: 0, pointNumber }])`.

### Funnel-chart plotly workarounds (all in `useFunnelChart.ts`)

- Labels are measured with a canvas, using the same font plotly is given (`FUNNEL_FONT_*`).
  Under jsdom the module falls back to a rough 0.55 × font-size glyph width, so tests must not
  assert exact wrap positions.
- Each label wraps to 220 px and is cut at 3 lines with an ellipsis. Hover text wraps to 165 px
  with no line limit, so the full name is always available on hover.
- `hovermode: 'y'` makes the whole row hoverable, not just the bar.
- Y-tick `<text>` elements get `pointerEvents: 'all'` and `onmouseover`/`onmouseout` handlers,
  looked up via `data-unformatted`. The handlers are **assigned** rather than added with
  `addEventListener`, because plotly reuses those elements. They are re-attached on every
  `plotly_afterplot`. `showAxisDragHandles: false` removes a 20 px strip at the end of each label
  that would otherwise not respond to hover.
- The width budgets in `constants.ts` were tuned by hand, not derived. If the chart height
  (fixed at `800`) or the layout changes, revisit them.

---

## Known issues and loose ends

These are worth knowing before you pick up tickets. None of them is fixed on `develop`.

- **The watchers in `useInclusionReportData` never fire (`cacheKey`, `sourceKey`, `generationStatus`).**
  `index.vue` passes `{ cacheKey: props.cacheKey, sourceKey: props.sourceKey, … }`, which is a plain
  object snapshot, so `watch(() => options.cacheKey)` and the others never trigger. The unit tests
  build `options` with `reactive()`, so they don't catch this.
  - **In PA this does no harm. It is dead code.** The `VDialog` in ChartToolbar has no `eager`, so
    Vuetify unmounts its content after it closes. Every open remounts the report and fetches again
    in `onMounted`. The dialog is modal and `persistent`, so the bookmark and dataset can't change
    while it is open. `generationStatus` is hard-coded to `"complete"`. ChartToolbar's
    `cache-key` prop therefore has no effect. ChartToolbar's own per-mriquery cache in
    `fetchInclusionReport` is what avoids repeat requests. If you ever add `eager` to that dialog,
    or keep the report mounted some other way, this turns into a stale-data bug.
  - **In the retired `ExecuteSidePanel` this could be an issue.** When generation is
    pending or failed, the `v-if` chain unmounts the report, so `generationStatus` changes are
    fine. But if the user switches between two datasets that are both generated, Vue keeps the
    same instance and only `sourceKey` changes. Nothing fetches again, so the previous dataset's
    report probably stays on screen.
- **The backend caps selective masks at 20 rules** (`MAX_FILTERCARDS` in `getSelectiveBitmapMasks`)
  and silently drops anything beyond that. A `ruleOrder` whose length does not match the rule
  count is also ignored without an error.
- **Rule names are split on `/\b(OR)\b/`.** A card name that contains the standalone word `OR`
  would put every following part out of step with its filter-card detail.
- **Basic Data is detected by the literal name `"Basic Data"`** on both sides.
- **Some strings are hard-coded in English and not i18n'd:** funnel `Total`, `Count:` and
  `Percent:`; `FUNNEL_LEGEND_LABELS`; `TREEMAP_LEGEND_ITEMS`; the treemap tooltip text; the
  `"Attrition Plot"` dialog title in ChartToolbar.
- **The PA path has no event mode.** ChartToolbar hides the PERSON/EVENT switch, and the
  selective endpoint only counts persons.
- `summary.lostCount` is always `0` from the selective endpoint. `pctDiff` and `percentExcluded`
  are computed, but their table columns are commented out. It was a product decision to hide these columns.
- `AttritionStat` is declared twice, in `computeAttritionStats.ts` and in `useFunnelChart.ts`.
- There is no Histoire story for this component yet.

---

## Testing

Unit tests are in `__tests__/`, with related specs under `src/utils/__tests__/`. Run from
`plugins/ui/apps/vue-mri-ui-lib`:

```bash
npx vitest run src/query-filter/components/InclusionReport src/utils/__tests__/filterCardUtils.test.ts src/utils/__tests__/ExportUtils.test.ts
```

At handover, all 155 tests in 8 files pass.

`__tests__/useFunnelChart.test.ts` mocks `@/lib/CustomPlotly` and uses a `drawTicks` helper that
imitates plotly's tick DOM, **including its merging of duplicate labels**. Keep that behaviour
if you change the helper, or the uniqueness tests stop proving anything.

E2E: `tests/e2e/tests/09-patient-analytics/inclusion-report.spec.ts`. It builds a cohort with Basic
Data, a condition and a visit exclusion. It then opens the dialog, checks the funnel tick labels
(through `data-unformatted`) and the table text, reorders the rows, and checks again. The
anchored `toHaveText(/^\+\s+Gender\b/)` assertions are deliberate, because `toContainText`
would also pass against the old `Gender:` markup. Don't add `toHaveScreenshot()` to this spec:
new visual baselines are linux-only, and they halt the CI suite.

---

## History

| PR | Change |
|---|---|
| #2279 | First unit tests |
| #2490 | Attrition plot UI update |
| #2748 | Moved to a Vuetify dialog |
| #3252 | Basic Data display names, label wrapping and truncation, label hover, unique labels (squash of branch `43-attrition-plot-improvements`) |
| #3375 | Funnel font colour and size constants |

Use `git log -- plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/InclusionReport` for the full history.
