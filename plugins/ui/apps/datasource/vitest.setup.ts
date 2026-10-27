// jsdom does not implement ResizeObserver — Vuetify's progress/overlay
// components read it (e.g. VProgressCircular inside AtlasButton's loading state).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub

// jsdom does not implement visualViewport — Vuetify's overlay (VMenu/VOverlay)
// reads it and subscribes to its resize/scroll events when a menu opens.
if (!(globalThis as unknown as { visualViewport?: unknown }).visualViewport) {
  const visualViewportStub = {
    width: 1024,
    height: 768,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    scale: 1,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false
    },
  }
  ;(globalThis as unknown as { visualViewport: unknown }).visualViewport = visualViewportStub
  if (typeof window !== 'undefined') {
    ;(window as unknown as { visualViewport: unknown }).visualViewport = visualViewportStub
  }
}
