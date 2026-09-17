// jsdom does not implement ResizeObserver — Vuetify's progress/overlay
// components read it (e.g. VProgressCircular inside AtlasButton's loading state).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub
