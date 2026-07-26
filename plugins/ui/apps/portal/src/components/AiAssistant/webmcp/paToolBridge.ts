// Portal-side client for the Patient Analytics `pa_*` tool registry.
//
// PA (Vue) publishes its tools on `window.__d2ePaTools` while PatientAnalytics.vue
// is mounted; this module is the only thing in the portal that touches that
// global. The contract is mirrored in
// apps/vue-mri-ui-lib/src/ai/paToolBridge.ts — keep the two in step (same
// arrangement as aiAssistantEvents.ts ↔ aiAssistantPaneBridge.ts).
//
// The registry is read on every access and never cached: PA deletes it on
// unmount, and a cached reference would let the assistant drive a dead store.

export const PA_TOOLS_CHANGED_EVENT = "d2e-pa-tools-changed";

// Bump in step with PaToolRegistry.version on the PA side. A registry published
// by an older/newer PA bundle is ignored rather than called blind.
const SUPPORTED_VERSION = 1;

export interface PaToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface PaToolRegistry {
  version: number;
  datasetId: string | null;
  list: () => PaToolDescriptor[];
  call: (name: string, args?: Record<string, unknown>) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
}

declare global {
  interface Window {
    __d2ePaTools?: PaToolRegistry;
  }
}

function getRegistry(): PaToolRegistry | undefined {
  const registry = window.__d2ePaTools;
  if (!registry) return undefined;
  if (registry.version !== SUPPORTED_VERSION) {
    console.warn(
      `[AiAssistant] PA tool registry version ${registry.version} is not supported ` +
        `(expected ${SUPPORTED_VERSION}); live cohort editing is disabled.`
    );
    return undefined;
  }
  return registry;
}

/** True while Patient Analytics is mounted and its tools are callable. */
export function arePaToolsAvailable(): boolean {
  return !!getRegistry();
}

/** The dataset PA currently has loaded, or null when PA is not mounted. */
export function getPaDatasetId(): string | null {
  return getRegistry()?.datasetId ?? null;
}

/** Tool descriptors to hand the agent, or [] when PA is not mounted. */
export function listPaTools(): PaToolDescriptor[] {
  try {
    return getRegistry()?.list() ?? [];
  } catch (err) {
    console.error("[AiAssistant] Failed to list PA tools", err);
    return [];
  }
}

/**
 * Run a `pa_*` tool in the PA app and return its result as text.
 *
 * Never throws: the return value is fed straight back to the model as a tool
 * result, and an actionable error string ("PA is not open", "unknown tool") is
 * far more useful to it than a rejected promise that ends the turn.
 */
export async function callPaTool(name: string, args: Record<string, unknown> = {}): Promise<string> {
  const registry = getRegistry();
  if (!registry) {
    return JSON.stringify({
      error:
        "Patient Analytics is not open, so live cohort tools are unavailable. Ask the user to open " +
        "the cohort builder (Researcher → Cohorts → 'Create Cohort: D2E'), or build the cohort with " +
        "the server-side tools and hand back a deep link instead.",
    });
  }

  try {
    const result = await registry.call(name, args);
    // The PA tools return the MCP text envelope { content: [{ type, text }] };
    // the model only needs the payload text.
    const text = result?.content?.[0]?.text;
    return typeof text === "string" ? text : JSON.stringify(result ?? {});
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
  }
}

/**
 * Subscribe to PA mount/unmount. Fires immediately with the current state so a
 * subscriber that starts up after PA has already mounted is not left waiting for
 * an event that has been and gone.
 */
export function subscribePaTools(handler: (available: boolean) => void): () => void {
  const listener = () => handler(arePaToolsAvailable());
  window.addEventListener(PA_TOOLS_CHANGED_EVENT, listener);
  handler(arePaToolsAvailable());
  return () => window.removeEventListener(PA_TOOLS_CHANGED_EVENT, listener);
}
