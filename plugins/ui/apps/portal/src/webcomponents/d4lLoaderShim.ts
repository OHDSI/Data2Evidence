// Aliased in place of @d4l/web-components-library/dist/loader so nothing bundles
// a second Stencil runtime. Delegates to the copied esm loader in /assets/, the
// one runtime its lazy .entry.js chunks also import.
const loaderUrl = "/d2e/portal/assets/loader.js";

export const applyPolyfills = () => Promise.resolve();

export const defineCustomElements = (win: unknown, opts?: unknown) =>
  import(/* @vite-ignore */ loaderUrl).then((mod: any) =>
    mod.defineCustomElements(win, opts ?? { resourcesUrl: "/d2e/portal/assets/" })
  );
