// Chrome flag #enable-webmcp-testing is ON → modelContext is available natively.
// Do NOT import '@mcp-b/global' polyfill when the flag is enabled.
//
// API location by Chrome version:
//   Chrome 146–149: navigator.modelContext   (now deprecated)
//   Chrome 150+:    document.modelContext    (current spec)
// We try document first, then fall back to navigator for older builds.
import type { Store } from 'vuex'

export function registerPaTools(store: Store<any>): () => void {
  const mc = (document as any).modelContext ?? (navigator as any).modelContext
  if (!mc) {
    console.warn('[WebMCP] modelContext API not available. Enable chrome://flags/#enable-webmcp-testing (Chrome 146+)')
    return () => {}
  }

  const regs: Array<{ unregister?: () => void }> = []

  regs.push(
    mc.registerTool({
      name: 'pa_get_current_cohort',
      description: 'Return the active cohort / bookmark definition as JSON.',
      inputSchema: { type: 'object', properties: {} },
      async execute() {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                bookmarkData: store.getters.getBookmarksData,
                ifr: store.getters.getBookmarkFromIFR,
              }),
            },
          ],
        }
      },
    })
  )

  regs.push(
    mc.registerTool({
      name: 'pa_apply_cohort_patch',
      description: 'Apply a bookmark patch and re-render the PA builder live.',
      inputSchema: {
        type: 'object',
        properties: {
          bookmark: { type: 'object', description: 'Parsed bookmark object' },
          chartType: { type: 'string', description: 'Target chart type, e.g. "bar"' },
        },
        required: ['bookmark'],
      },
      async execute({ bookmark, chartType }: { bookmark: object; chartType?: string }) {
        await store.dispatch('loadBookmarkDataToState', { bookmark, chartType })
        return { content: [{ type: 'text', text: JSON.stringify({ applied: true }) }] }
      },
    })
  )

  regs.push(
    mc.registerTool({
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
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ saved: true, bookmarkId: res?.bmkId ?? bookmarkId }),
            },
          ],
        }
      },
    })
  )

  // Return a cleanup function for beforeUnmount
  return () => regs.forEach(r => r?.unregister?.())
}
