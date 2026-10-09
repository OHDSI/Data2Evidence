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
    __pythiaClientTools?: ClientToolRegistry
  }
}

type ClientToolFrameWindow = Window & { __d2ePaTools?: ClientToolRegistry }

/** Expose the native PA registry to Pythia in the same window. */
export function publishPaClientToolProxy(): () => void {
  const paTools = () => (window as ClientToolFrameWindow).__d2ePaTools
  const proxy: ClientToolRegistry = {
    version: 1,
    list: () => paTools()?.list() ?? [],
    call: (name, args) => {
      const tools = paTools()
      if (!tools) throw new Error('PA client tools are unavailable.')
      return tools.call(name, args)
    },
  }

  window.__pythiaClientTools = proxy

  return () => {
    if (window.__pythiaClientTools === proxy) delete window.__pythiaClientTools
  }
}
