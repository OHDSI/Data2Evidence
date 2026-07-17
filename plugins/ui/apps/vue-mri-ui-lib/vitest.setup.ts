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

// happy-dom does not implement visualViewport — Vuetify's VOverlay reads it
if (typeof window !== 'undefined' && !(window as { visualViewport?: unknown }).visualViewport) {
  ;(window as { visualViewport?: unknown }).visualViewport = {
    width: window.innerWidth ?? 1024,
    height: window.innerHeight ?? 768,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    scale: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }
}

// happy-dom does not implement matchMedia — Vuetify's display composable reads it
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  ;(window as unknown as { matchMedia: (q: string) => unknown }).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  })
}

