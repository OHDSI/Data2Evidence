/**
 * Build-time alias target for '@d4l/web-components-library/dist/loader' in the
 * Atlas iframe app build (vite.config.atlas-app.ts).
 *
 * The Stencil lazy-load chunks are shipped un-bundled next to the emitted
 * chunks and resolve their runtime relative to themselves. Bundling the loader
 * would create a second Stencil runtime whose host-ref registry the lazily
 * loaded component classes never join ("$hostElement$ of undefined", blank
 * components). Loading the loader from the same un-bundled files keeps exactly
 * one runtime instance.
 */

const runtimeImport = (relative: string): Promise<any> =>
  import(/* @vite-ignore */ new URL(relative, import.meta.url).href)

export const applyPolyfills = async (): Promise<unknown> => {
  const mod = await runtimeImport('./polyfills/index.js')
  return mod.applyPolyfills()
}

export const defineCustomElements = async (win?: Window, options?: unknown): Promise<unknown> => {
  const mod = await runtimeImport('./loader.js')
  return mod.defineCustomElements(win, options)
}
