/**
 * D3 v3 wrapper module
 *
 * D3 v3.5.17 is loaded from CDN as a global script in index.html
 * This wrapper provides a typed export for use in Vue components
 */

// Extend Window interface for d3
declare global {
  interface Window {
    d3: any
  }
}

// Lazy getter that waits for d3 to be available
const getD3 = (): any => {
  if (typeof window !== 'undefined' && window.d3) {
    return window.d3
  }
  throw new Error('D3 is not loaded. Make sure the D3 script is included in index.html')
}

// Export a proxy that lazily accesses window.d3
const d3: any = new Proxy(
  {},
  {
    get(_target, prop) {
      return getD3()[prop]
    },
    has(_target, prop) {
      return prop in getD3()
    },
  }
)

export default d3

