// mcp sdk uses @hono/node-server, which use "global", however Deno use "globalThis", so we need to polyfill it here
if (typeof (globalThis as any).global === "undefined") {
  (globalThis as any).global = globalThis;
}
