// In-page bridge that exposes the PA `pa_*` tools to the portal's AI assistant
// drawer (React, apps/portal).
//
// Why this exists alongside registerPaTools: `document.modelContext.registerTool`
// hands the tools to the *browser agent* (Chrome's WebMCP surface). It offers no
// way for other page script to enumerate or invoke them — `modelContextTesting`
// is a flag-gated test harness, not a production API. The portal drawer runs in
// the same window but a different single-spa bundle, with no shared module graph,
// so it needs its own channel. Both surfaces are fed by the SAME createPaTools()
// array, so a tool never exists on one and not the other.
//
// The contract is mirrored in
// apps/portal/src/components/AiAssistant/webmcp/paToolBridge.ts — keep the two in
// step (same pattern as aiAssistantPaneBridge.ts ↔ aiAssistantEvents.ts).
//
// Shape: a registry object on `window`, not an event round-trip. Consumers must
// read `window.__d2ePaTools` at call time and never cache it — PA deletes the
// registry on unmount, so a re-read is what makes "PA went away mid-conversation"
// return a clean error instead of driving a dead store.
import type { Store } from 'vuex'
import { createPaTools, type PaComponentHooks, type PaToolResult } from './webmcpServer'

// Fired whenever the registry appears or disappears (PA mount/unmount). The
// drawer uses it to enable/disable live cohort editing without polling.
export const PA_TOOLS_CHANGED_EVENT = 'd2e-pa-tools-changed'

export interface PaToolDescriptor {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface PaToolRegistry {
  // Bump when the shape below changes incompatibly; the portal side refuses a
  // version it does not understand rather than calling tools blind.
  version: 1
  // The dataset PA currently has loaded. The drawer compares it against the
  // portal's active dataset before letting the model edit — a cohort edited
  // against a different dataset than the user thinks is a silent clinical error,
  // not a UI glitch.
  datasetId: string | null
  list: () => PaToolDescriptor[]
  call: (name: string, args?: Record<string, unknown>) => Promise<PaToolResult>
}

declare global {
  interface Window {
    __d2ePaTools?: PaToolRegistry
  }
}

function announce(): void {
  window.dispatchEvent(new CustomEvent(PA_TOOLS_CHANGED_EVENT, { detail: { available: !!window.__d2ePaTools } }))
}

/**
 * Publish the PA tools for the portal drawer. Returns a teardown function to
 * call from beforeUnmount — pair it with registerPaTools' teardown.
 */
export function publishPaTools(store: Store<any>, hooks: PaComponentHooks = {}): () => void {
  const tools = createPaTools(store, hooks)

  const registry: PaToolRegistry = {
    version: 1,
    get datasetId() {
      // A getter, not a snapshot: the user can switch datasets while PA stays
      // mounted, and a stale id would defeat the mismatch guard it exists for.
      return store.getters.getSelectedDataset?.id ?? null
    },
    list: () =>
      tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    call: async (name, args) => {
      const tool = tools.find(t => t.name === name)
      if (!tool) {
        throw new Error(`Unknown PA tool "${name}". Available: ${tools.map(t => t.name).join(', ')}.`)
      }
      return tool.execute(args)
    },
  }

  window.__d2ePaTools = registry
  announce()

  return () => {
    // Only clear our own registry: a remount can publish a new one before the
    // old teardown runs, and deleting that would leave the drawer thinking PA
    // is gone while it is on screen.
    if (window.__d2ePaTools === registry) {
      delete window.__d2ePaTools
      announce()
    }
  }
}
