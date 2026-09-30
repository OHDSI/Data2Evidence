# datasource

Vue3 + Vuetify + single-spa plugin that runs inside **Atlas3** (not d2e's own
portal shell). It replaces d2e portal's React "researcher" dataset screens
(`plugins/ui/apps/portal/src/containers/researcher/Overview/Overview.tsx` —
the dataset catalog grid — and `.../Information/Information.tsx` — the
per-dataset description view) with a native Atlas3 plugin.

## What's implemented

Both screens are fully built against the real `system-portal`/`usermgmt`
REST APIs (see `src/api/`), not placeholders:

- **Catalog** (`src/views/DatasourceCatalog.vue`) — search, sort, and a card
  grid backed by `getDatasetList`/`getPublicDatasetList`. Clicking a card
  navigates to Atlas3's native Data Sources report view for that source,
  landing directly on this plugin's Description mount.
- **Description** (`src/views/DatasourceDescription.vue`) — dataset
  name/description, an access-state badge and request-access flow
  (`useDatasourceAccess`), a Metadata table, and a Files/resources table with
  download (`useDatasourceResources`).

`src/App.vue` picks which screen to render based on `hostContext?.sourceKey`
(present only for the sidebar parcel mount — see below).

## Mount points

The same built bundle (`bootstrap`/`mount`/`unmount`/`update` exports) mounts
two different ways in Atlas3, registered in
`plugins/atlas/plugins.standalone.json`:

- **Main nav (header) position** — `menuItems`, mounted as a single-spa
  **application** at `/plugins/datasources/`. Renders the catalog.
- **`datasource-sidebar` position** — `mountPoints`, mounted as a single-spa
  **parcel** inside Atlas3's `DataSourcesView.vue` sidebar (a "Description"
  entry). Renders the description screen for the selected source.

## API base URL

This plugin is served under `/atlas` (Atlas3), never under `/d2e` itself, so
`src/api/client.ts` prefixes every request with `/d2e` by default (see
`plugins/atlas/token-keeper/login-guard.js`'s own `/d2e/system-portal/...`
calls for the same deployment convention). Override via `VITE_API_BASE_URL`
if a deployment mounts d2e somewhere else.

## Build

```bash
bun install   # requires GITHUB_TOKEN with read:packages scope — see plugins/ui/.npmrc
bun run build # SystemJS bundle -> dist-atlas/index.system.js
```

CSS is inlined into the JS bundle (`vite-plugin-css-injected-by-js`), not
emitted as a separate file — Atlas3's `parcelLoader.ts` unconditionally
requests `<entry-dir>/style.css` for parcel mounts and 404s harmlessly if
absent, but a real separate CSS file would need its own delivery mechanism
for the application (`menuItems`) mount, which gets no such auto-injection.

Dev build (outputs to local `dist/` instead of `dist-atlas`; still minified —
this config doesn't tie minification to mode):

```bash
bun run dev   # vite dev server, or:
bun run build -- --mode development
```

## Wiring into the real build

This plugin is built and staged by `scripts/build-atlas.sh` and the `ATLAS`
matrix job in `.github/workflows/docker-build-push.yaml` — not by
`plugins/atlas`'s own `postinstall.js` (that mechanism is for npm `file:`
dependencies under `plugins/atlas/subplugins/`, a different pattern this app
doesn't use). Both build a standalone `npm install --workspaces=false` +
`npm run build`, then copy `dist-atlas/` into
`plugins/atlas/resources/atlas/plugins/datasource/`. Keep the two staging
steps in sync if either changes.

For local dev without a full image rebuild, `docker-compose-local.yml`
bind-mounts this app's build output straight into the running `alp-trex`
container.

## Tests

```bash
bun run test:unit   # vitest, 60+ tests across api/composables/views
```

## Reference

- Atlas3's plugin contract, mount surfaces, and manifest schema:
  `Atlas3/docs/plugin-development-with-atlas-ui.md` and the
  `atlas3-single-spa-plugins` skill in the `d2e-skills` repo
- Build/lifecycle pattern this app is modeled on:
  `Atlas3/plugins-dev/hello-world-plugin/`
