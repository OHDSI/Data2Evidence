export type ClientToolDescriptor = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export type ClientToolResult = {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>
  isError?: boolean
}

export type ClientToolRegistry = {
  version: 1
  list: () => ClientToolDescriptor[]
  call: (name: string, args?: Record<string, unknown>) => Promise<ClientToolResult>
}

declare global {
  interface Window {
    __d2eClientTools?: ClientToolRegistry
  }
}

export const D2E_CLIENT_TOOLS_CHANGED_EVENT = 'd2e-client-tools-changed'

function announce(): void {
  window.dispatchEvent(
    new CustomEvent(D2E_CLIENT_TOOLS_CHANGED_EVENT, {
      detail: { available: !!window.__d2eClientTools },
    }),
  )
}

/**
 * Exposes tools owned by an iframe on the Atlas parent window. The child
 * registry is deliberately resolved for every list/call: PA publishes it
 * after boot and replaces/removes it as its Vue application mounts/unmounts.
 */
export function publishClientToolProxy(
  getChildRegistry: () => ClientToolRegistry | undefined,
): () => void {
  const proxy: ClientToolRegistry = {
    version: 1,
    list: () => getChildRegistry()?.list() ?? [],
    call: async (name, args) => {
      const child = getChildRegistry()
      if (!child) {
        throw new Error('D2E client tools are unavailable.')
      }
      return child.call(name, args)
    },
  }

  window.__d2eClientTools = proxy
  announce()

  return () => {
    if (window.__d2eClientTools === proxy) {
      delete window.__d2eClientTools
      announce()
    }
  }
}
