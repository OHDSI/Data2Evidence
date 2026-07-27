// Chrome flag #enable-webmcp-testing is ON → modelContext is available natively.
// Do NOT import '@mcp-b/global' polyfill when the flag is enabled.
//
// API location by Chrome version:
//   Chrome 146–149: navigator.modelContext   (now deprecated)
//   Chrome 150+:    document.modelContext    (current spec)
// We try document first, then fall back to navigator for older builds.
import type { Store } from 'vuex'
import { applyCohortPatch, type PatchOp } from './cohortPatch'

export interface PaToolResult {
  content: Array<{ type: 'text'; text: string }>
}

export interface PaTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (args?: any) => Promise<PaToolResult>
}

// Optional hooks the host component (PatientAnalytics.vue) hands in so a tool can
// drive component-local UI that is NOT in the Vuex store — e.g. switching the
// saved-cohort list ↔ builder view. Kept optional so createPaTools stays
// unit-testable with only a mocked store (no component, no browser).
export interface PaComponentHooks {
  // Show the cohort builder pane (vs. the saved-cohort list). Functionally
  // required for a programmatically built cohort to render and compute its
  // count/chart: the chart-query watcher (getFireRequest → fireQuery) only runs
  // while the builder — and its chart component — is mounted.
  showBuilder?: () => void
}

// Wrap a JSON payload in the MCP text-content envelope every tool returns.
const textResult = (payload: unknown): PaToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(payload) }],
})

// pa_search_attribute_values caps how many tokens it returns. A coded catalog
// search (a drug/condition on a non-OMOP dataset) routinely matches thousands of
// tokens across code systems (RxNorm/NDC/ATC/SNOMED) and every strength/form —
// e.g. "gemfibrozil" resolved to 1,602 tokens — which floods the model's context
// and makes it guess which one to pick. Return a bounded slice + a count + a
// routing note instead. Callers can raise `limit` (bounded by MAX) if they truly
// need the full list.
const DEFAULT_VALUE_LIMIT = 50
const MAX_VALUE_LIMIT = 200

// How the returned values were arrived at. Reported to the model because
// "these are matches" and "these are every value the column can take" call for
// completely different next moves.
type MatchedVia =
  /** The /values endpoint's own search returned these rows. */
  | 'search'
  /** No query: the attribute's complete (unfiltered) value list. */
  | 'domain'
  /** The search found nothing; these matched when we scanned the full list here. */
  | 'domain-scan'
  /** The search found nothing until it was retried with a different casing. */
  | 'case-variant'

// A zero-row search is NOT evidence that a value is absent, and treating it as
// such is exactly how "build a cohort of women…" ended with the assistant asking
// the user whether "female" might be spelled some other way. The /values search
// is executed by the backend (a HANA/SQL LIKE is case-sensitive) and matches the
// stored token, not the clinical word for it — so "female" misses "Female", and
// "women" misses "FEMALE" on every backend. When a search comes back empty we
// re-fetch the attribute's UNFILTERED domain and match it here, where the rules
// are ours and, for a low-cardinality column, the entire list is visible.
const normalizeToken = (raw: unknown): string =>
  String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s._\-/()]+/g, ' ')
    .trim()

// Interchangeable tokens for the low-cardinality demographic columns every
// cohort starts from. A dataset stores sex as "FEMALE", "Female", "F" or a
// concept id depending on the backend, and the user says "women".
// Deliberately narrow — demographics and booleans only. Clinical terms are NOT
// synonym-expanded: a near-miss concept is a silent clinical error, so those
// still route through concept sets / the vocabulary tools.
const SYNONYM_GROUPS: string[][] = [
  ['female', 'f', 'fem', 'woman', 'women', 'girl', 'girls'],
  ['male', 'm', 'man', 'men', 'boy', 'boys'],
  ['unknown', 'u', 'unk', 'not known', 'no matching concept'],
  ['other', 'o'],
  ['yes', 'y', 'true'],
  ['no', 'n', 'false'],
]

const synonymsFor = (query: string): string[] => {
  const q = normalizeToken(query)
  const group = SYNONYM_GROUPS.find(g => g.includes(q))
  return group ? group.filter(s => s !== q) : []
}

// Rank a candidate row against the query: 0 exact, 1 substring, 2 synonym.
// undefined = no match. Ranked so an exact "F" outranks a substring hit.
function matchRank(row: any, query: string, synonyms: string[]): number | undefined {
  const haystacks = [row?.text, row?.display_value, row?.value].map(normalizeToken).filter(Boolean)
  if (!haystacks.length) return undefined
  const q = normalizeToken(query)
  if (q && haystacks.includes(q)) return 0
  if (q && haystacks.some(h => h.includes(q))) return 1
  // Synonyms match on EQUALITY only. As a substring rule, "f" (for female) would
  // match every token containing the letter f.
  if (synonyms.some(s => haystacks.includes(s))) return 2
  return undefined
}

function matchDomainLocally(rows: any[], query: string): any[] {
  const synonyms = synonymsFor(query)
  return rows
    .map(row => ({ row, rank: matchRank(row, query, synonyms) }))
    .filter((m): m is { row: any; rank: number } => m.rank !== undefined)
    .sort((a, b) => a.rank - b.rank)
    .map(m => m.row)
}

// Casing variants to retry a failed search with, for attributes whose domain is
// too large to enumerate (so the domain scan above can't run).
const caseVariants = (query: string): string[] => {
  const lower = query.toLowerCase()
  const upper = query.toUpperCase()
  const title = lower.replace(/\b[a-z]/g, c => c.toUpperCase())
  return [...new Set([lower, upper, title])].filter(v => v !== query)
}

// Turn the /values result shape into an actionable hint so the model narrows the
// query or routes to a concept set, rather than picking one product token (which
// is clinically incomplete for "any form of X"), misreading TOO_MANY_RESULTS as
// "term absent", or — the failure this note set exists to close — asking the user
// to guess a synonym for a value whose complete list is sitting in the response.
// The store computes `loadedStatus` (a 204 → TOO_MANY_RESULTS) but its action
// only returns the value array, so we read it from getDomainValues.
function attributeValuesNote(opts: {
  matchedVia: MatchedVia
  total: number
  returned: number
  truncated: boolean
  loadedStatus?: string
  query: string
  matchedQuery: string
  domainTotal?: number
}): string | undefined {
  const { matchedVia, total, returned, truncated, loadedStatus, query, matchedQuery, domainTotal } = opts
  if (loadedStatus === 'TOO_MANY_RESULTS' && total === 0) {
    return (
      `The /values endpoint reported TOO_MANY_RESULTS and returned no rows for "${query}". ` +
      'Narrow the query (add strength/form/vocabulary words, or a more specific term) so it returns ' +
      'selectable tokens — do NOT conclude the term is absent from the dataset.'
    )
  }
  if (truncated) {
    return (
      `Showing the first ${returned} of ${total} ${matchedVia === 'domain' ? 'values' : 'matching tokens'}. ` +
      'A broad term can match many tokens across code systems (RxNorm/NDC/ATC/SNOMED) and every strength/form — ' +
      `picking one product token is clinically incomplete for "any form of ${query}". Prefer a concept set with ` +
      'descendants (backend d2e-mcp) when the dataset supports it, or pick the ingredient/standard-level token ' +
      '(e.g. an RxNorm ingredient), and narrow the query to disambiguate. Raise `limit` only if you genuinely ' +
      'need the full list.'
    )
  }
  if (matchedVia === 'domain-scan') {
    return (
      `The /values search for "${query}" returned no rows, but scanning this attribute's full value list ` +
      `(${domainTotal} values) matched ${total}. The endpoint's search is case- and token-sensitive, so an empty ` +
      'search result is never proof a value is absent. Use the `value` field of the row you want.'
    )
  }
  if (matchedVia === 'case-variant') {
    return (
      `"${query}" returned nothing but "${matchedQuery}" matched — the /values search is case-sensitive. ` +
      'Treat casing, not absence, as the default explanation for an empty search result.'
    )
  }
  if (matchedVia === 'domain' && query) {
    return (
      `No value matched "${query}". The rows below are this attribute's COMPLETE value list (${domainTotal} ` +
      'values), so no further search will find anything else here. Pick the row that expresses ' +
      `"${query}" — do NOT ask the user to suggest a synonym; the whole list is right here. If genuinely none ` +
      'fits, this is the wrong attribute (a card often exposes both a *source concept code* and a ' +
      '*concept-name* attribute) or the filter is not expressible on this dataset — say so explicitly.'
    )
  }
  if (total === 0) {
    return (
      `No tokens matched "${query}", and this attribute's unfiltered value list came back empty too, so its ` +
      'domain could not be enumerated. Try a different attributePath — a card often exposes both a *source ' +
      'concept code* and a *concept-name* attribute; the term may live on the other one.'
    )
  }
  return undefined
}

// Classify HOW an attribute's constraint value must be supplied, so the model
// picks the right add_constraint value shape without guessing — the crux for a
// non-OMOP (SAP HANA / LEAF) config. Such a config filters conditions/drugs/labs
// on coded *source concept code* CATALOG attributes (type "text" + useRefValue,
// resolved via pa_search_attribute_values) and on *concept set* attributes
// (type "conceptSet", taking a { conceptSetId }) — NOT on OMOP standard concept
// ids. A bare "text" type alone doesn't tell these apart, so surface the routing.
function describeAttributeValue(attr: any): string {
  const type = attr.getType?.()
  const isCatalog =
    (typeof attr.isCatalogAttribute === 'function' && attr.isCatalogAttribute()) ||
    // useRefText-only catalogs (coded columns shown by their ref text) also need /values.
    !!attr.oInternalConfigAttribute?.useRefText
  if (type === 'conceptSet') {
    return 'conceptSet'
  }
  if (type === 'num') {
    return 'numeric'
  }
  if (type === 'time' || type === 'datetime') {
    return 'date'
  }
  if (isCatalog) {
    return 'catalog'
  }
  return 'text'
}

// The valueKind → how-to-supply-the-value legend, sent ONCE per response instead
// of repeated on every attribute. A dataset can expose 170+ filter attributes, and
// inlining ~150 chars of identical prose per attribute more than doubled this
// tool's output (≈60KB → ≈27KB when hoisted). That output lands in the agent
// transcript, which /agent resends whole on every turn — so it was the single
// biggest driver of both context burn and the 413 the drawer used to hit.
const VALUE_KIND_GUIDE: Record<string, string> = {
  numeric: 'add_constraint value:<number> with operator ("<",">","=",…).',
  date: 'add_constraint value:{ from, to } (date range).',
  conceptSet: 'add_constraint value:{ conceptSetId } — build/find the concept set with the d2e-mcp concept tools.',
  catalog:
    'Coded catalog value — resolve the EXACT stored token with pa_search_attribute_values, then pass its ' +
    'returned `value`. Dataset-specific: never hardcode or invent the token. For a small enumerated column ' +
    '(gender, race, ethnicity, status flags) call pa_search_attribute_values with NO `query` to list every ' +
    'value it can take, and pick from that — do not guess a search term.',
  text: 'add_constraint value:<string> (free text).',
}

// The valid filter-card / attribute catalog from the frontend config (SAP-MRI or
// OMOP alike). Shared by pa_list_filter_options AND used to enrich patch failures,
// so a bad path is self-correcting from the error alone — no Vue/Pinia scraping.
// Each attribute carries a `valueKind`; `valueKindGuide` says how to supply each
// kind's value, so the model routes it correctly on a non-OMOP config.
function listFilterOptions(store: Store<any>): {
  filterCards: any[]
  valueKindGuide?: Record<string, string>
  note?: string
  error?: string
} {
  const config = store.getters.getMriFrontendConfig
  if (!config?.getFilterCards) {
    return { filterCards: [], error: 'Frontend config not loaded.' }
  }
  const filterCards = (config.getFilterCards() ?? []).map((card: any) => ({
    cardConfigPath: card.getConfigPath(),
    cardName: card.getName(),
    // getFilterAttributes(), not getAllAttributes(): the latter also includes
    // measure/category-only attributes that are NOT visible in the filter card, so
    // add_constraint cannot target them. Listing them padded the payload AND
    // invited the model to pick a path that always fails.
    attributes: ((card.getFilterAttributes?.() ?? card.getAllAttributes?.() ?? []) as any[]).map((attr: any) => ({
      attributePath: attr.getConfigPath(),
      name: attr.getName(),
      type: attr.getType(),
      valueKind: describeAttributeValue(attr),
    })),
  }))
  return {
    filterCards,
    // Per-attribute how-to lives here, keyed by valueKind — see VALUE_KIND_GUIDE.
    valueKindGuide: VALUE_KIND_GUIDE,
    note:
      'Route each add_constraint value by `valueKind`: numeric→number+operator, date→{from,to}, ' +
      'conceptSet→{conceptSetId} (build via d2e-mcp), catalog→resolve the exact token with ' +
      'pa_search_attribute_values first. This dataset may be non-OMOP (SAP HANA / LEAF): its coded ' +
      'condition/drug/measurement filters use source concept codes or concept sets, not OMOP standard ' +
      'concept ids — so d2e-mcp search_concepts may return nothing; fall back to catalog/conceptSet paths. ' +
      'If a measurement/lab card exposes no numeric value attribute here, a value threshold ' +
      '(e.g. BMI < 18.5) is NOT expressible — use a diagnosis/concept-set instead.',
  }
}

// The recovery catalog attached to a FAILED patch. Deliberately NOT the whole
// catalog: a patch failure is almost always one wrong path, and re-sending every
// card's attributes on every failure duplicated ~30KB into a transcript that
// /agent resends in full each turn (two of those and the request blew the body
// limit). So: every card by path+name — enough to fix a wrong cardConfigPath —
// plus the attributes of only the card(s) the failing ops actually named, which is
// what fixes a wrong attributePath.
function recoveryFilterOptions(store: Store<any>, patchOps: PatchOp[]): any[] {
  const { filterCards } = listFilterOptions(store)
  // `card` on a constraint op is a runtime filterCardId, not a config path, so the
  // usable signal is add_card's cardConfigPath and the card prefix of an
  // attributePath ("<cardConfigPath>.attributes.<key>").
  const named = new Set<string>()
  for (const op of patchOps ?? []) {
    const cardConfigPath = (op as any).cardConfigPath
    if (typeof cardConfigPath === 'string') named.add(cardConfigPath)
    const attributePath = (op as any).attributePath
    if (typeof attributePath === 'string') named.add(attributePath.split('.attributes.')[0])
  }
  return filterCards.map((card: any) =>
    named.has(card.cardConfigPath)
      ? card
      : {
          cardConfigPath: card.cardConfigPath,
          cardName: card.cardName,
          // Attributes omitted to keep the transcript small — ask for them by name.
          attributeCount: card.attributes.length,
        }
  )
}

// Build the Patient Analytics WebMCP tool definitions against a Vuex store.
//
// Exported separately from registerPaTools (which needs a live browser
// `modelContext`) so the handlers can be unit-tested with a mocked store — no
// Chrome flag, no bridge, no Claude required. This is verification "layer B":
// handler ↔ Vuex correctness, where most real bugs live. registerPaTools below
// is a thin adapter that registers whatever this returns.
export function createPaTools(store: Store<any>, hooks: PaComponentHooks = {}): PaTool[] {
  // Saved cohorts are fetched into the store when PA mounts; be defensive in case
  // a tool runs before that has happened (or after a store reset).
  const ensureBookmarksLoaded = async () => {
    if (!store.getters.getBookmarks?.length) {
      // Match every in-app caller: the loadAll fetch is a GET (fireBookmarkQuery
      // otherwise defaults method to 'post').
      await store.dispatch('fireBookmarkQuery', { method: 'get', params: { cmd: 'loadAll' } })
    }
  }

  return [
    {
      name: 'pa_new_cohort',
      description:
        'Start a fresh, empty cohort in the PA builder (the "Create D2E cohort" button) and switch to the ' +
        'builder view so subsequent edits render live. Call this before pa_apply_cohort_patch when building a ' +
        'cohort from scratch. PA must already be open — this resets the builder, it cannot navigate to PA if unmounted.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Working name for the new cohort (default "New cohort").' },
        },
      },
      async execute({ name }: { name?: string } = {}) {
        // Mirror Bookmarks.vue addNewCohort(): a brand-new unsaved active bookmark
        // (no bmkId, isNew) + a blank IFR/chart from config defaults.
        store.commit('SET_ACTIVE_BOOKMARK', { bookmarkname: name || 'New cohort', isNew: true })
        await store.dispatch('resetChart')
        // Switch list → builder so the chart mounts and the result computes.
        hooks.showBuilder?.()
        return textResult({ created: true, name: name || 'New cohort' })
      },
    },
    {
      name: 'pa_get_current_cohort',
      description: 'Return the active cohort / bookmark definition as JSON.',
      inputSchema: { type: 'object', properties: {} },
      async execute() {
        return textResult({
          bookmarkData: store.getters.getBookmarksData,
          ifr: store.getters.getBookmarkFromIFR,
        })
      },
    },
    {
      name: 'pa_list_cohorts',
      description:
        'List the saved cohorts (bookmarks) available in this dataset, as { bmkId, name }. ' +
        'Pass forceRefresh:true to reload from the server — do this right after pa_save_current_cohort so a ' +
        'just-saved cohort appears (the default path serves a cached list and can be stale).',
      inputSchema: {
        type: 'object',
        properties: {
          forceRefresh: {
            type: 'boolean',
            description: 'Reload the list from the server instead of using the cached one.',
          },
        },
      },
      async execute({ forceRefresh = false }: { forceRefresh?: boolean } = {}) {
        if (forceRefresh) {
          await store.dispatch('fireBookmarkQuery', { method: 'get', params: { cmd: 'loadAll' } })
        } else {
          await ensureBookmarksLoaded()
        }
        const cohorts = (store.getters.getBookmarks ?? []).map((b: any) => ({
          bmkId: b.bmkId,
          name: b.bookmarkname,
        }))
        return textResult({ cohorts })
      },
    },
    {
      name: 'pa_open_cohort',
      description:
        'Open a saved cohort in the PA builder by name (or exact bmkId) and render it live. ' +
        'Resolve names with pa_list_cohorts first.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Cohort/bookmark display name' },
          bmkId: { type: 'string', description: 'Exact bookmark id; takes precedence over name' },
          chartType: { type: 'string', description: 'Optional target chart type, e.g. "bar"' },
        },
      },
      async execute({ name, bmkId, chartType }: { name?: string; bmkId?: string; chartType?: string }) {
        if (!name && !bmkId) {
          return textResult({ opened: false, error: 'Provide a cohort name or bmkId.' })
        }
        await ensureBookmarksLoaded()
        const bookmarks: any[] = store.getters.getBookmarks ?? []

        if (bmkId) {
          if (!bookmarks.some(b => b.bmkId === bmkId)) {
            return textResult({ opened: false, error: `No cohort with bmkId "${bmkId}".` })
          }
        } else {
          const matches = bookmarks.filter(b => b.bookmarkname === name)
          if (matches.length === 0) {
            return textResult({ opened: false, error: `No cohort named "${name}".` })
          }
          if (matches.length > 1) {
            return textResult({
              opened: false,
              ambiguous: matches.map(b => ({ bmkId: b.bmkId, name: b.bookmarkname })),
            })
          }
          bmkId = matches[0].bmkId
        }

        await store.dispatch('loadbookmarkToState', { bmkId, chartType })
        // Ensure the builder is visible even when a cohort was already active (the
        // store's null→set view watcher only fires on the first bookmark).
        hooks.showBuilder?.()
        return textResult({ opened: true, bmkId })
      },
    },
    {
      name: 'pa_apply_cohort_patch',
      description:
        'Edit the live cohort. Preferred (and the ONLY way to add/remove a filter): pass `patchOps` — typed intent ' +
        'applied deterministically in-place (add_card / add_constraint / remove_card / remove_constraint). Discover ' +
        'valid paths with pa_list_filter_options. Legacy `bookmark`: a full tree, accepted ONLY from a trusted builder — ' +
        'a hand-authored tree is validated and rejected (it silently loads the wrong cohort). Never hand-author one.',
      inputSchema: {
        type: 'object',
        properties: {
          patchOps: {
            type: 'array',
            description:
              'Typed patch operations. Each: ' +
              '{ op:"add_card", cardConfigPath, exclude?, ref? } | ' +
              '{ op:"add_constraint", card, attributePath, value, operator? } | ' +
              '{ op:"remove_card", card } | { op:"remove_constraint", card, attributePath }. ' +
              'The Basic Data card ("patient") always exists — constrain it directly, never add_card it.',
            items: {
              type: 'object',
              properties: {
                op: {
                  type: 'string',
                  enum: ['add_card', 'add_constraint', 'remove_card', 'remove_constraint'],
                },
                cardConfigPath: {
                  type: 'string',
                  description: 'add_card: the card to add, from pa_list_filter_options.',
                },
                exclude: { type: 'boolean', description: 'add_card: make it an exclusion card.' },
                ref: { type: 'string', description: 'add_card: local handle later ops can use as `card`.' },
                card: {
                  type: 'string',
                  description:
                    'add_constraint / remove_*: a filterCardId ("patient", "…conditionoccurrence.1") or an ' +
                    'add_card `ref` from earlier in this same patch.',
                },
                attributePath: {
                  type: 'string',
                  description: 'add_constraint / remove_constraint: exact path from pa_list_filter_options.',
                },
                value: {
                  description:
                    'add_constraint: REQUIRED, and the concept-set id goes HERE, not beside it. ' +
                    'numeric -> a number (with `operator`); catalog/text -> the exact stored string; ' +
                    'date -> { from, to }; conceptSet -> { conceptSetId, includeDescendants? } where ' +
                    'conceptSetId came from create_concept_set / list_concept_sets. An empty or missing ' +
                    'value is rejected — use remove_constraint to clear a filter.',
                },
                operator: { type: 'string', description: 'add_constraint: "=", "<", ">", "<=", ">=". Default "=".' },
              },
              required: ['op'],
            },
          },
          bookmark: { type: 'object', description: 'Legacy: parsed bookmark object (back-compat)' },
          chartType: { type: 'string', description: 'Target chart type, e.g. "bar"' },
        },
      },
      async execute({
        patchOps,
        bookmark,
        chartType,
      }: {
        patchOps?: PatchOp[]
        bookmark?: object
        chartType?: string
      }) {
        if (Array.isArray(patchOps)) {
          try {
            const result = await applyCohortPatch(store, patchOps)
            // Make sure the builder (and its chart) is on screen so the edit renders
            // and the count/chart query actually runs.
            hooks.showBuilder?.()
            return textResult(result)
          } catch (err) {
            // Attach the valid paths so a wrong card/attribute path is recoverable
            // straight from the error — no need to call pa_list_filter_options separately
            // or scrape the app's internals. Scoped to the cards this patch named
            // (see recoveryFilterOptions); call pa_list_filter_options({ card }) for
            // the attributes of any other card.
            return textResult({
              applied: false,
              error: err instanceof Error ? err.message : String(err),
              validFilterOptions: recoveryFilterOptions(store, patchOps),
            })
          }
        }
        if (bookmark) {
          // A hand-authored bookmark tree is the #1 footgun here: loadBookmarkDataToState
          // clobbers the active bookmark with a "Linked Cohort" stub BEFORE it parses, so
          // a malformed tree (e.g. a filter card missing `attributes`) throws in
          // convertBM2IFR and leaves the builder pointing at a broken cohort that then
          // crashes the chart — while the caller may still think it succeeded.
          // The parse throws before any IFR mutation, so on failure only the active
          // bookmark is dirty: snapshot it and restore, leaving state untouched, and
          // surface the error so the caller uses patchOps instead.
          const prevActiveBookmark = store.getters.getActiveBookmark
          try {
            await store.dispatch('loadBookmarkDataToState', { bookmark, chartType })
            return textResult({ applied: true })
          } catch (err) {
            store.commit('SET_ACTIVE_BOOKMARK', prevActiveBookmark)
            const detail = err instanceof Error ? err.message || err.name : String(err)
            return textResult({
              applied: false,
              error:
                `Rejected malformed bookmark (${detail}). Do not hand-author bookmark trees — ` +
                'edit the live cohort with patchOps (add_card / add_constraint) instead.',
            })
          }
        }
        return textResult({ applied: false, error: 'Provide patchOps (preferred) or a bookmark object.' })
      },
    },
    {
      name: 'pa_list_filter_options',
      description:
        'List the valid filter cards and attributes for the current dataset as ' +
        '{ cardConfigPath, cardName, attributes: [{ attributePath, name, type, valueKind }] }, plus a ' +
        '`valueKindGuide` map and a routing `note`. `valueKind` (numeric | date | conceptSet | catalog | text) ' +
        'keys into valueKindGuide, which says how to supply that add_constraint value — essential on non-OMOP ' +
        '(SAP HANA / LEAF) datasets whose coded filters use source concept codes/concept sets, not OMOP standard ' +
        'concept ids. Pass `card` (a cardConfigPath) to get just that card\'s attributes; the full catalog is ' +
        'large, so prefer the scoped call once you know the card. ' +
        'Use these exact paths in pa_apply_cohort_patch patchOps — never invent paths.',
      inputSchema: {
        type: 'object',
        properties: {
          card: {
            type: 'string',
            description:
              'Optional cardConfigPath (e.g. "patient.interactions.priDiag") — return only this card, with its ' +
              'attributes. Omit for the whole catalog.',
          },
        },
      },
      async execute({ card }: { card?: string } = {}) {
        const options = listFilterOptions(store)
        if (!card || options.error) {
          return textResult(options)
        }
        const match = options.filterCards.find((c: any) => c.cardConfigPath === card)
        if (!match) {
          // A wrong path is the common case here, so answer it with the thing that
          // fixes it (the valid paths) rather than an error the model must chase.
          return textResult({
            filterCards: [],
            error: `Unknown card "${card}".`,
            validCardConfigPaths: options.filterCards.map((c: any) => c.cardConfigPath),
          })
        }
        return textResult({ ...options, filterCards: [match] })
      },
    },
    {
      name: 'pa_search_attribute_values',
      description:
        "Resolve the EXACT stored value token for any categorical/text attribute via the app's /values " +
        'endpoint — no auth/token handling needed. Use it for demographics too: gender/race/etc. tokens are ' +
        'dataset-specific (e.g. "FEMALE" vs "Female" vs "F"), so NEVER hardcode them — look them up here. ' +
        'Also resolves a term like "sinusitis" to selectable diagnosis values. OMIT `query` to list the ' +
        "attribute's COMPLETE value list — the fastest and most reliable route for a low-cardinality column " +
        '(gender, race, ethnicity, status flags). Returns { matchedVia, total, returned, truncated, loadedStatus, ' +
        'domainTotal?, values:[{ value, text, display_value }], note }; pass a returned `value` as an ' +
        'add_constraint value in pa_apply_cohort_patch. `matchedVia` says what you are looking at: "search"/' +
        '"domain-scan"/"case-variant" = matches for your query; "domain" = the attribute\'s whole value list ' +
        '(returned when nothing matched, so you can pick from it). A zero-result search is NEVER proof the value ' +
        'is absent — this tool already rechecked the full domain for you, so read `note` and decide from the ' +
        'rows returned instead of asking the user for a synonym. The list is CAPPED (default 50, `limit` to ' +
        'change) — when `truncated` or loadedStatus is "TOO_MANY_RESULTS", NARROW the query rather than paging: ' +
        'a broad drug/condition term matches thousands of tokens across code systems and strengths, and one ' +
        'product token is clinically incomplete. For "any form of X", prefer a concept set with descendants ' +
        '(backend d2e-mcp). attributePath comes from pa_list_filter_options. This returns raw attribute values, ' +
        'not a concept-set id.',
      inputSchema: {
        type: 'object',
        properties: {
          attributePath: {
            type: 'string',
            description:
              'Attribute config path from pa_list_filter_options, e.g. "patient.interactions.priDiag.attributes.icd10".',
          },
          query: {
            type: 'string',
            description:
              'Search text, e.g. "sinusitis". OMIT it to list every value the attribute can take — do that for ' +
              'demographics and other small enumerated columns instead of guessing a search term.',
          },
          attributeType: {
            type: 'string',
            description: 'Optional value-type hint: "text" (default) or "conceptSet".',
          },
          limit: {
            type: 'number',
            description:
              `Max values to return (default ${DEFAULT_VALUE_LIMIT}, max ${MAX_VALUE_LIMIT}). Narrow the query ` +
              'instead of raising this when results span many code systems/strengths.',
          },
        },
        required: ['attributePath'],
      },
      async execute({
        attributePath,
        query,
        attributeType,
        limit,
      }: {
        attributePath: string
        query?: string
        attributeType?: string
        limit?: number
      }) {
        if (!attributePath) {
          return textResult({ values: [], error: 'Provide an attributePath (from pa_list_filter_options).' })
        }
        const trimmedQuery = typeof query === 'string' ? query.trim() : ''
        const cap = Math.max(1, Math.min(limit ?? DEFAULT_VALUE_LIMIT, MAX_VALUE_LIMIT))

        const fetchValues = async (searchQuery: string): Promise<{ rows?: any[]; loadedStatus?: string }> => {
          if (!searchQuery) {
            // Bust the store's "already loaded" short-circuit before every
            // unfiltered read. Any earlier search on this attributePath left it
            // cached as loaded — with that search's (possibly empty) rows — and the
            // action would serve exactly those back instead of fetching the domain,
            // turning the fallback below into a no-op that confirms its own miss.
            store.commit('DOMAIN_SET_VALUES', {
              attributePath,
              data: { values: [], isLoaded: false, isLoading: false },
            })
          }
          const rows = await store.dispatch('loadValuesForAttributePath', {
            attributePathUid: attributePath,
            searchQuery,
            attributeType: attributeType ?? 'text',
          })
          // The store's action returns only the value array, but it records WHY a
          // list is empty/short as `loadedStatus` (a 204 → "TOO_MANY_RESULTS").
          // Read it from the getter so the model can tell "no such token" from
          // "narrow the query".
          const loadedStatus: string | undefined = store.getters.getDomainValues?.(attributePath)?.loadedStatus
          return { rows: Array.isArray(rows) ? rows : undefined, loadedStatus }
        }

        // The store resolves `undefined` when a newer request for the same
        // attributePath superseded this one (it cancels the in-flight call and
        // drops the late response). That is a race, not an empty domain, and
        // reporting it as "no values" is another way the assistant ends up telling
        // the user a value doesn't exist. Retry once — the retry is uncontended.
        const fetchValuesRetrying = async (searchQuery: string) => {
          const first = await fetchValues(searchQuery)
          return first.rows ? first : fetchValues(searchQuery)
        }

        let matchedVia: MatchedVia = trimmedQuery ? 'search' : 'domain'
        let matchedQuery = trimmedQuery
        const searched = await fetchValuesRetrying(trimmedQuery)
        let all: any[] = searched.rows ?? []
        let loadedStatus = searched.loadedStatus
        let domainTotal: number | undefined = trimmedQuery ? undefined : all.length

        if (trimmedQuery && all.length === 0 && loadedStatus !== 'TOO_MANY_RESULTS') {
          const domain = await fetchValuesRetrying('')
          const domainRows = domain.rows ?? []
          domainTotal = domainRows.length
          const localMatches = matchDomainLocally(domainRows, trimmedQuery)
          if (localMatches.length > 0) {
            all = localMatches
            loadedStatus = domain.loadedStatus
            matchedVia = 'domain-scan'
          } else if (domainRows.length > 0) {
            // Hand back the COMPLETE list rather than "not found", so the model can
            // pick a value (or rule the attribute out) in this same step instead of
            // asking the user to guess a spelling.
            all = domainRows
            loadedStatus = domain.loadedStatus
            matchedVia = 'domain'
          } else {
            // The domain isn't enumerable (too large, or the endpoint only answers
            // searches), so the scan above can't decide it. Retry the search with
            // other casings — a backend LIKE is case-sensitive, so "female" can
            // miss a stored "Female".
            for (const variant of caseVariants(trimmedQuery)) {
              const alt = await fetchValuesRetrying(variant)
              if ((alt.rows?.length ?? 0) > 0) {
                all = alt.rows as any[]
                loadedStatus = alt.loadedStatus
                matchedVia = 'case-variant'
                matchedQuery = variant
                break
              }
            }
            if (matchedVia === 'search') loadedStatus = domain.loadedStatus ?? loadedStatus
          }
        }

        const total = all.length
        const values = all.slice(0, cap)
        const truncated = total > values.length
        const note = attributeValuesNote({
          matchedVia,
          total,
          returned: values.length,
          truncated,
          loadedStatus,
          query: trimmedQuery,
          matchedQuery,
          domainTotal,
        })
        return textResult({
          attributePath,
          ...(trimmedQuery ? { query: trimmedQuery } : {}),
          matchedVia,
          total,
          returned: values.length,
          truncated,
          loadedStatus,
          ...(domainTotal !== undefined ? { domainTotal } : {}),
          values,
          ...(note ? { note } : {}),
        })
      },
    },
    {
      name: 'pa_get_cohort_result',
      description:
        'Return the LIVE computed RESULT of the current cohort: matched patient count, total, active chart type, ' +
        'and the binned chart data (categories, measures, per-bin patient counts). Use this to verify what actually ' +
        'rendered after building/editing — pa_get_current_cohort returns only the definition, not the result. ' +
        'Requires the builder to be open (pa_new_cohort / pa_open_cohort switch to it) so the chart query has run.',
      inputSchema: { type: 'object', properties: {} },
      async execute() {
        const g = store.getters
        // getResponse is a getter that returns a function; call it for the raw response.
        const resp = typeof g.getResponse === 'function' ? g.getResponse() : g.getResponse
        const chartData = resp?.data
        const chart = chartData
          ? {
              totalPatientCount: chartData.totalPatientCount,
              categories: chartData.categories,
              measures: chartData.measures,
              data: chartData.data,
              noDataReason: chartData.noDataReason,
              // Set when the last chart query errored (see fireQuery). Without it a
              // failed query reads as an empty cohort and the count "--" has no cause.
              ...(chartData.error ? { error: chartData.error } : {}),
            }
          : null
        return textResult({
          currentPatientCount: g.getCurrentPatientCount,
          totalPatientCount: g.getDisplayTotalGuardedPatientCount ? g.getTotalPatientListCount : g.getTotalPatientCount,
          chartType: g.getActiveChart,
          chart,
          ...(chartData?.error
            ? {
                error: `The last chart query failed, so the count is not a real result: ${chartData.error}`,
              }
            : {}),
        })
      },
    },
    {
      name: 'pa_save_current_cohort',
      description:
        'Persist the current cohort to bookmark-svc and refresh the saved-cohort list. ' +
        'New cohort → pass { name } (inserts). Overwrite an existing one → pass { bookmarkId } or method:"put" (updates). ' +
        'The save payload (cmd / bookmark body / shareBookmark) is built from live store state — you do not construct it. ' +
        'Advanced/back-compat: a raw `params` object, if provided, is forwarded to fireBookmarkQuery verbatim.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name for a NEW cohort (insert). Required to insert unless updating or passing raw params.',
          },
          share: { type: 'boolean', description: 'Share the cohort with other users (default false).' },
          bookmarkId: { type: 'string', description: 'Existing cohort id to overwrite (update). Omit to insert.' },
          method: { type: 'string', enum: ['post', 'put'], description: 'post = insert (default), put = update.' },
          params: { type: 'object', description: 'Advanced/back-compat: raw fireBookmarkQuery params, forwarded verbatim.' },
        },
      },
      async execute({
        name,
        share = false,
        bookmarkId,
        method,
        params,
      }: {
        name?: string
        share?: boolean
        bookmarkId?: string
        method?: string
        params?: any
      } = {}) {
        // Reload the list after a write so pa_list_cohorts (and the UI) reflect it —
        // fireBookmarkQuery does NOT refetch after insert/update on its own.
        const refreshList = () => store.dispatch('fireBookmarkQuery', { method: 'get', params: { cmd: 'loadAll' } })

        // Back-compat: forward a hand-built params object verbatim.
        if (params) {
          const res = await store.dispatch('fireBookmarkQuery', { method: method ?? 'post', params, bookmarkId })
          await refreshList()
          return textResult({ saved: true, bookmarkId: res?.bmkId ?? bookmarkId })
        }

        const bookmarkData = store.getters.getBookmarksData
        if (!bookmarkData || Object.keys(bookmarkData).length === 0) {
          return textResult({ saved: false, error: 'Current cohort is empty — build filters before saving.' })
        }

        const active = store.getters.getActiveBookmark
        const targetId = bookmarkId ?? (method === 'put' ? active?.bmkId : undefined)
        const isUpdate = method === 'put' || !!targetId

        let builtParams: Record<string, unknown>
        let httpMethod: string
        if (isUpdate) {
          if (!targetId) {
            return textResult({
              saved: false,
              error: 'Update requested but no bookmarkId (and no active saved cohort) to update.',
            })
          }
          builtParams = { cmd: 'update', bookmark: JSON.stringify(bookmarkData), shareBookmark: share }
          httpMethod = 'put'
        } else {
          const cohortName = name ?? (active && !active.isNew ? active.bookmarkname : undefined)
          if (!cohortName) {
            return textResult({ saved: false, error: 'Provide a name to save a new cohort.' })
          }
          builtParams = {
            cmd: 'insert',
            bookmarkname: cohortName,
            bookmark: JSON.stringify(bookmarkData),
            shareBookmark: share,
          }
          httpMethod = 'post'
        }

        const res = await store.dispatch('fireBookmarkQuery', { method: httpMethod, params: builtParams, bookmarkId: targetId })
        const savedId = res?.bmkId ?? targetId

        // Mirror the in-app dialogs: reload the list so the row is visible, then
        // adopt the saved record as the active bookmark so a follow-up save updates
        // it instead of inserting a duplicate.
        await refreshList()
        if (savedId) {
          const saved = (store.getters.getBookmarks ?? []).find((b: any) => b.bmkId === savedId)
          if (saved) store.commit('SET_ACTIVE_BOOKMARK', saved)
        }

        return textResult({ saved: true, bookmarkId: savedId })
      },
    },
  ]
}

export function registerPaTools(store: Store<any>, hooks: PaComponentHooks = {}): () => void {
  const mc = (document as any).modelContext ?? (navigator as any).modelContext
  if (!mc) {
    console.warn('[WebMCP] modelContext API not available. Enable chrome://flags/#enable-webmcp-testing (Chrome 146+)')
    return () => {}
  }

  const regs: Array<{ unregister?: () => void }> = createPaTools(store, hooks).map(tool => mc.registerTool(tool))

  // Return a cleanup function for beforeUnmount
  return () => regs.forEach(r => r?.unregister?.())
}
