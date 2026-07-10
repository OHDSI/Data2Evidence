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

// Wrap a JSON payload in the MCP text-content envelope every tool returns.
const textResult = (payload: unknown): PaToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(payload) }],
})

// Build the Patient Analytics WebMCP tool definitions against a Vuex store.
//
// Exported separately from registerPaTools (which needs a live browser
// `modelContext`) so the handlers can be unit-tested with a mocked store — no
// Chrome flag, no bridge, no Claude required. This is verification "layer B":
// handler ↔ Vuex correctness, where most real bugs live. registerPaTools below
// is a thin adapter that registers whatever this returns.
export function createPaTools(store: Store<any>): PaTool[] {
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
      description: 'List the saved cohorts (bookmarks) available in this dataset, as { bmkId, name }.',
      inputSchema: { type: 'object', properties: {} },
      async execute() {
        await ensureBookmarksLoaded()
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
        return textResult({ opened: true, bmkId })
      },
    },
    {
      name: 'pa_apply_cohort_patch',
      description:
        'Edit the live cohort. Preferred: pass `patchOps` — typed intent applied deterministically in-place ' +
        '(add_card / add_constraint / remove_card / remove_constraint). Discover valid paths with ' +
        'pa_list_filter_options. Legacy: a full `bookmark` object may be passed instead, but never hand-author one.',
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
              'value is a number/string, { from, to } date range, or { conceptSetId, includeDescendants? }.',
            items: { type: 'object' },
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
            return textResult(result)
          } catch (err) {
            return textResult({ applied: false, error: err instanceof Error ? err.message : String(err) })
          }
        }
        if (bookmark) {
          await store.dispatch('loadBookmarkDataToState', { bookmark, chartType })
          return textResult({ applied: true })
        }
        return textResult({ applied: false, error: 'Provide patchOps (preferred) or a bookmark object.' })
      },
    },
    {
      name: 'pa_list_filter_options',
      description:
        'List the valid filter cards and attributes for the current dataset as ' +
        '{ cardConfigPath, cardName, attributes: [{ attributePath, name, type }] }. ' +
        'Use these exact paths in pa_apply_cohort_patch patchOps — never invent paths.',
      inputSchema: { type: 'object', properties: {} },
      async execute() {
        const config = store.getters.getMriFrontendConfig
        if (!config?.getFilterCards) {
          return textResult({ filterCards: [], error: 'Frontend config not loaded.' })
        }
        const filterCards = (config.getFilterCards() ?? []).map((card: any) => ({
          cardConfigPath: card.getConfigPath(),
          cardName: card.getName(),
          attributes: (card.getAllAttributes() ?? []).map((attr: any) => ({
            attributePath: attr.getConfigPath(),
            name: attr.getName(),
            type: attr.getType(),
          })),
        }))
        return textResult({ filterCards })
      },
    },
    {
      name: 'pa_save_current_cohort',
      description: 'Persist the current cohort to bookmark-svc.',
      inputSchema: {
        type: 'object',
        properties: {
          params: { type: 'object' },
          bookmarkId: { type: 'string' },
          method: { type: 'string', enum: ['post', 'put'], default: 'post' },
        },
        required: ['params'],
      },
      async execute({
        params,
        bookmarkId,
        method = 'post',
      }: {
        params: object
        bookmarkId?: string
        method?: string
      }) {
        const res = await store.dispatch('fireBookmarkQuery', { method, params, bookmarkId })
        return textResult({ saved: true, bookmarkId: res?.bmkId ?? bookmarkId })
      },
    },
  ]
}

export function registerPaTools(store: Store<any>): () => void {
  const mc = (document as any).modelContext ?? (navigator as any).modelContext
  if (!mc) {
    console.warn('[WebMCP] modelContext API not available. Enable chrome://flags/#enable-webmcp-testing (Chrome 146+)')
    return () => {}
  }

  const regs: Array<{ unregister?: () => void }> = createPaTools(store).map(tool => mc.registerTool(tool))

  // Return a cleanup function for beforeUnmount
  return () => regs.forEach(r => r?.unregister?.())
}
