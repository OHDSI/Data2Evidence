import { vi } from 'vitest'

// Mock canvas context for tests that use canvas
HTMLCanvasElement.prototype.getContext = (() => {
  return {} as any
}) as any

// Mock SAP UI5 utils and UI5Adaptor
;(globalThis as any).sap = {
  ui: {
    require: () => ({}),
    getCore: () => ({
      getEventBus: () => ({}),
      byId: () => ({}),
    }),
  },
}

