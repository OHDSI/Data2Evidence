# datasource

Vue3 + Vuetify + single-spa scaffold for a plugin that runs inside **Atlas3**
(not d2e's own portal shell). It is the first step toward replacing d2e
portal's React "researcher" dataset screens
(`plugins/ui/apps/portal/src/containers/researcher/Overview/Overview.tsx` —
the dataset catalog grid — and `.../Information/Information.tsx` — the
per-dataset description view) with a native Atlas3 plugin.

**This scaffold is intentionally blank.** It proves the single-spa/mounting
wiring works end-to-end at both places the real screens need to render; it
does not yet contain the actual dataset catalog or description content or
data layer. That's a follow-up.

## What it proves

The same built bundle (`bootstrap`/`mount`/`unmount`/`update` exports) mounts
correctly two different ways in Atlas3:

- **Main nav (header) position** — registered via `menuItems` in Atlas3's
  plugin manifest, mounted as a single-spa **application** at the full-page
  route `/plugins/datasource/`.
- **`datasource-sidebar` position** — registered via `mountPoints` in the
  manifest, mounted as a single-spa **parcel** inside Atlas3's
  `DataSourcesView.vue` sidebar (as a "Description" entry).

`src/App.vue` shows which mount surface it's currently running in
(`hostContext?.surface`) so this is visually checkable.

## Build

```bash
bun install   # requires GITHUB_TOKEN with read:packages scope — see plugins/ui/.npmrc
bun run build # SystemJS bundle -> plugins/ui/resources/datasource/{index.system.js,style.css}
```

Dev build (unminified, outputs to local `dist/` instead of `../../resources/datasource`):

```bash
bun run dev   # vite dev server, or:
NODE_ENV=development bun run build
```

## Wiring into Atlas3 for local testing

Atlas3 is a separate repo/deployment. For local dev, copy the build output
into Atlas3's plugin folder and register it in Atlas3's manifest:

```bash
cp plugins/ui/resources/datasource/{index.system.js,style.css} \
  /path/to/Atlas3/public/plugins/datasource/
```

Add an entry to `Atlas3/public/config/plugins.json` (see that file for the
exact shape currently used for local testing — not meant to be committed to
Atlas3's repo as-is):

```json
{
  "id": "datasource",
  "name": "Datasource",
  "version": "0.0.1",
  "entryPoint": "datasource/index.system.js",
  "menuItems": [
    { "id": "datasource-home", "name": "Datasource", "route": "/plugins/datasource/", "icon": "mdi-database" }
  ],
  "mountPoints": [
    { "id": "datasource-sidebar-info", "surface": "datasource-sidebar", "name": "Description",
      "icon": "mdi-information-outline", "group": "Overview", "order": 5 }
  ]
}
```

Then run Atlas3's own dev server (`npm run dev` in the Atlas3 repo) and check
the main nav and the Data Sources sidebar.

## Important build detail

Atlas3's `parcelLoader.ts` derives the plugin's CSS URL by replacing the JS
entry's `.js` suffix with `style.css` — the CSS asset **must** be named
`style.css`, not Vite's default (`index.css` given `fileName: 'index'`).
`vite.config.ts` sets `rollupOptions.output.assetFileNames: 'style[extname]'`
to produce the right name; don't remove that without checking
`Atlas3/src/plugins/host/parcelLoader.ts::injectPluginStylesheet`.

## Reference

- Atlas3's plugin contract, mount surfaces, and manifest schema:
  `Atlas3/docs/plugin-development-with-atlas-ui.md` and the
  `atlas3-single-spa-plugins` skill in the `d2e-skills` repo
- Build/lifecycle pattern this app is modeled on:
  `Atlas3/plugins-dev/hello-world-plugin/`

## Follow-up (out of scope here)

Port the real screens and their REST data layer
(`api.systemPortal.getDatasets`/`getDataset`, `useDataset`/`useDatasets`
hooks in the portal app) into this app's `src/App.vue`, replacing the
placeholder content.
