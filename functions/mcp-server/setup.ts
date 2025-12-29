// Setup file - must be imported first before any other modules
// Polyfill for 'global' in Deno environment
if (typeof (globalThis as any).global === "undefined") {
  (globalThis as any).global = globalThis;
}
