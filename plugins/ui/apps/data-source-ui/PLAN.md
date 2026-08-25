# Data Source UI — Atlas3 Single-Spa Plugin Implementation Plan

## Purpose

Create a new direct-rendered Vue single-spa parcel at `plugins/ui/apps/data-source-ui/`. Atlas3 will load it from its plugin manifest and mount it for the canonical data-source route:

```text
/datasources/:id
```

The first delivered view is the Data Source Description page. The plugin owns its data-source-local router and navigation so future views, such as cohorts and studies, can be added without changing the Atlas integration.

This plan follows the direct parcel pattern in `trex-notebook/plugins/notebook-plugin` and the Atlas-facing Vue conventions in `plugins/ui/apps/vue-mri-ui-lib`. It intentionally does not use the `vue-mri-ui-lib` iframe wrapper: `data-source-ui` will mount its Vue application directly as an Atlas parcel.

## Constraints and settled decisions

- Package/app name: `data-source-ui`.
- App location: `plugins/ui/apps/data-source-ui/`.
- UI stack: Vue 3, Vuetify 3, `@ohdsi/atlas-ui`, Pinia, and `single-spa-vue`.
- Build output: Vite library-mode SystemJS bundle named `dist/index.system.js`.
- Atlas manifest: `plugins/atlas/plugins.standalone.json`.
- Public route: `/datasources/:id`.
- Data source: existing D2E API endpoints; do not introduce new backend APIs or database changes.
- The Atlas host must add a route bridge because the existing generic plugin route is `/plugins/:pluginId/...`, not `/datasources/:id`.
- The initial page is Description. The data-source navigation belongs to this plugin rather than the Atlas global navigation.

## 1. New package directory structure

Create the following package tree:

```text
plugins/ui/apps/data-source-ui/
├── PLAN.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── styles/
│   │   └── main.scss
│   ├── router/
│   │   ├── index.ts
│   │   └── pages.ts
│   ├── stores/
│   │   └── dataSource.ts
│   ├── api/
│   │   ├── client.ts
│   │   ├── datasource.ts
│   │   └── types.ts
│   ├── types/
│   │   └── plugin.ts
│   ├── components/
│   │   ├── DataSourceLayout.vue
│   │   ├── DataSourceNavigation.vue
│   │   ├── DataSourceHeader.vue
│   │   ├── DescriptionMetadata.vue
│   │   ├── DataSourceResources.vue
│   │   ├── RequestAccessAction.vue
│   │   └── PageState.vue
│   └── views/
│       └── DataSourceDescriptionView.vue
└── tests/
    ├── api/
    │   └── datasource.spec.ts
    └── stores/
        └── dataSource.spec.ts
```

Keep the initial component set small. Add an additional component only when it maps to a real Figma section or separates reusable presentation from data loading.

## 2. `package.json`

Create `plugins/ui/apps/data-source-ui/package.json` using the dependency versions already resolved by the D2E UI monorepo and aligned with `trex-notebook/plugins/notebook-plugin`. Do not add a second incompatible Vue, Vuetify, or Atlas UI version.

The package must have these properties and scripts:

```json
{
  "name": "data-source-ui",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "vue-tsc --noEmit",
    "test": "vitest run"
  }
}
```

Runtime dependencies:

```text
vue
vue-router
vuetify
@ohdsi/atlas-ui
pinia
single-spa-vue
@mdi/font
```

Development dependencies:

```text
vite
@vitejs/plugin-vue
typescript
vue-tsc
sass
vitest
@vue/test-utils
jsdom
```

Use the exact versions and package-manager workspace syntax from the closest existing package rather than inventing versions. If the parent workspace centralizes these dependencies, declare them in the same way as `vue-mri-ui-lib` and notebook-plugin.

## 3. Vite SystemJS build

Create `plugins/ui/apps/data-source-ui/vite.config.ts` using Vite library mode, closely following `trex-notebook/plugins/notebook-plugin/vite.config.ts`.

Required configuration behavior:

- Vite Vue plugin enabled.
- Library entry is `src/main.ts`.
- Library name is `data-source-ui`.
- Output directory is `dist/`.
- Output format is `system`.
- Entry filename resolves to `index.system.js`.
- `cssCodeSplit: false` so the parcel has one deterministic stylesheet asset.
- Vue is externalized so it resolves to the host-provided SystemJS Vue module.
- Rollup output declares system format and Vue global/module mapping consistent with notebook-plugin.

The intended configuration shape is:

```ts
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'data-source-ui',
      formats: ['system'],
      fileName: () => 'index.system.js',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        format: 'system',
        globals: { vue: 'vue' },
      },
    },
  },
})
```

Confirm whether `single-spa-vue`, Vuetify, Pinia, or Atlas UI are externalized by the Trex template. Preserve that exact host compatibility behavior. Do not externalize packages that Atlas does not make available through its SystemJS import map.

## 4. `src/main.ts`: single-spa lifecycle and host context

`src/main.ts` is the Vite library entry and must export the parcel lifecycle functions:

```ts
export const bootstrap: (props: PluginProps) => Promise<unknown>
export const mount: (props: PluginProps) => Promise<unknown>
export const unmount: (props: PluginProps) => Promise<unknown>
```

Build them with `single-spa-vue`:

```ts
const vueLifecycles = singleSpaVue({
  createApp,
  appOptions: {
    render() {
      return h(App, { messageBus: (this as PluginProps).messageBus })
    },
  },
  handleInstance(app) {
    app.use(createPinia())
    app.use(vuetify)
    app.use(router)
  },
})
```

The actual implementation should provide host props via a Pinia store or Vue `provide`, not rely on `this` inside unrelated components. The lifecycle bootstrapping sequence must:

1. Import plugin-wide styles.
2. Create and configure Vuetify with the same Atlas-compatible defaults as notebook-plugin:
   - disable a plugin-owned theme so Atlas remains the visual authority;
   - configure MDI icons;
   - use Atlas/shared Vuetify defaults where notebook-plugin uses `getSharedDefaults()`.
3. Create and install Pinia.
4. Install the local Vue router.
5. On `bootstrap`, retain the supplied host context and configure the API client with the current authentication token.
6. Ensure the emitted CSS is loaded from `uiFilesUrl` if the host requires the notebook-plugin style-injection approach.
7. On `mount`, set or update `dataSourceId` from host props before rendering/fetching.
8. On `unmount`, release subscriptions/listeners created by this parcel.

Define `PluginProps` in `src/types/plugin.ts`:

```ts
export interface PluginProps {
  name: string
  mountParcel?: unknown
  singleSpa?: unknown
  uiFilesUrl?: string
  dataSourceId?: string
  authContext: {
    user: {
      id: string
      username: string
      email?: string
      permissions: string[]
    } | null
    token: string | null
    isAuthenticated: boolean
    hasPermission: (permission: string) => boolean
  }
  messageBus: {
    send: <T>(type: string, payload: T) => void
    request: <TRequest, TResponse>(
      type: string,
      payload: TRequest,
    ) => Promise<TResponse>
    subscribe: <T>(
      type: string,
      callback: (payload: T) => void,
    ) => () => void
  }
}
```

Match the actual host prop types in notebook-plugin exactly where they already exist. Do not fabricate a separate authentication mechanism: token access must come from `authContext` supplied by Atlas.

## 5. `App.vue` and Vue Router

### App root

`src/App.vue` should render a single data-source shell:

```text
DataSourceLayout
  ├── DataSourceHeader
  ├── DataSourceNavigation
  └── router-view
```

It should read the active `dataSourceId` from the host-context store, synchronize it with the URL parameter when supplied, and avoid data-fetching duplication between the root and Description view.

### Router

Create `src/router/index.ts` with a route tree intended for a parcel mounted at a selected data source. The root local route is `/`; it has a `description` child route that renders `DataSourceDescriptionView`.

```ts
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DataSourceLayout,
    children: [
      {
        path: '',
        name: 'data-source-description',
        component: DataSourceDescriptionView,
      },
      {
        path: 'description',
        redirect: { name: 'data-source-description' },
      },
    ],
  },
]
```

The host route `/datasources/:id` remains owned by Atlas, not by a nested router namespace. Use memory history or an explicitly configured router history only after confirming the parcel mount behavior in Atlas. The preferred initial model is Vue Router memory history because the Atlas route bridge owns browser navigation and passes `dataSourceId` as a parcel prop.

When future Atlas route support includes nested data-source paths, map the host’s remainder to the local router. Do not have this initial plugin overwrite Atlas’s browser history ownership.

### Page registry

Create `src/router/pages.ts` as a declarative page registry that drives the plugin sidebar and future child routes:

```ts
export interface DataSourcePage {
  id: string
  label: string
  routeName: string
  requiresAccess?: boolean
  isVisible?: (context: DataSourceContext) => boolean
}

export const dataSourcePages: DataSourcePage[] = [
  {
    id: 'description',
    label: 'Description',
    routeName: 'data-source-description',
  },
]
```

No unimplemented pages should be shown as live navigation items.

## 6. Description page and Figma mapping

Create `src/views/DataSourceDescriptionView.vue`.

### Data loading behavior

The view obtains the selected ID from the host context store, with optional route synchronization if Atlas provides it. It must:

1. Watch the current `dataSourceId`.
2. Call `useDataSourceStore().fetchDataSource(id)` when it becomes available or changes.
3. Render loading, error/not-found, and loaded states.
4. Leave response mapping in the store/API layer; the view receives normalized data.

### Existing D2E API use

The exact existing endpoint must be confirmed by locating the current Portal Information data-source client before implementation. The plan’s placeholder form is:

```text
GET /api/datasources/:id
```

Use the actual endpoint already called by D2E for data-source/dataset detail, not a new endpoint or renamed public contract. In addition, reuse existing endpoints/services for:

```text
dataset/resource/list?datasetId=:id
existing authenticated resource download action
existing access-request status and submission flow
```

The API layer must send the Bearer token received through `PluginProps.authContext.token` using the same D2E API base URL/configuration mechanism as existing Atlas plugins.

### Figma node `1709-215182` sections

The Description view must implement the information hierarchy identified for the Data Source Description design:

1. **Header and identity**
   - data-source name;
   - data-source type;
   - status/access indicator when returned by the API;
   - the primary Request Access action when applicable.
2. **Contextual data-source navigation**
   - plugin-owned left navigation;
   - Description selected by default;
   - access-aware page visibility prepared for later pages.
3. **Description**
   - long-form data-source description;
   - safe rich-text rendering using the existing D2E sanitization/rendering method when server data is HTML.
4. **Connection information**
   - source/connection or platform information supplied by the existing detail model;
   - never expose secrets, credentials, or internal connection strings.
5. **Metadata/details**
   - labeled key/value rows for the Figma-provided attributes, such as type, organization/owner, dates, tags/categories, access classification, and other existing API fields.
6. **Data resources/files**
   - list resources from the existing resource list endpoint;
   - show available file/resource metadata;
   - initiate downloads through the existing authenticated download service.
7. **Access state**
   - show Request Access only when it is available;
   - show current access request/granted state otherwise.
8. **Page states**
   - loading state;
   - empty resources state;
   - inaccessible/not-found/error state.

Use Atlas UI primitives instead of custom replacements: `AtlasButton` for the access action, `AtlasAlert` for errors/status, `AtlasChip` for tags/status, `AtlasDataTable` where the resource table design warrants it, and existing Atlas layout/type components where available. Use Vuetify layout primitives only where Atlas UI does not supply one.

### Component division

- `DataSourceHeader.vue`: title, type/context labels, and `RequestAccessAction`.
- `DescriptionMetadata.vue`: normalized metadata label/value rows.
- `DataSourceResources.vue`: resource listing and authenticated download action.
- `RequestAccessAction.vue`: request/granted/pending state presentation and request submission event.
- `PageState.vue`: reusable loading/empty/error state wrapper if the existing Atlas components do not already provide it.

## 7. Pinia store

Create `src/stores/dataSource.ts` with `useDataSourceStore`.

Minimum state:

```ts
interface DataSourceState {
  dataSource: DataSource | null
  loading: boolean
  error: Error | null
}
```

Required action:

```ts
async fetchDataSource(id: string): Promise<void>
```

Action behavior:

1. Set `loading = true` and clear the prior error.
2. Request normalized detail from `getDataSource(id)`.
3. Request visible resources and access state only if they are not included in the detail response, using the established Portal endpoint/service pattern.
4. Store the completed normalized record.
5. Set a normalized `Error` on failure.
6. Set `loading = false` in `finally`.

Guard against stale writes when an ID changes while a prior request is in flight: retain the requested ID or use an abort signal so the old response cannot replace newer page data.

The store must not embed route parsing or raw `fetch` calls. It consumes the API module only.

## 8. API module

Create `src/api/client.ts`, `src/api/datasource.ts`, and `src/api/types.ts`.

### `client.ts`

Expose a configured authenticated requester initialized from parcel props:

```ts
export function configureApiClient(options: {
  token: string | null
  baseUrl?: string
}): void
```

And a request function used internally by endpoint modules. Reuse the D2E/Atlas API base URL discovery method already used in notebook-plugin or sibling apps. Do not read a URL from the browser route or user-controlled data.

### `datasource.ts`

Expose functions with this shape:

```ts
export async function getDataSource(id: string): Promise<DataSource>
export async function listDataSourceResources(id: string): Promise<DataSourceResource[]>
export async function getDataSourceAccessState(id: string): Promise<AccessState>
export async function requestDataSourceAccess(id: string): Promise<AccessState>
export async function downloadDataSourceResource(
  dataSourceId: string,
  resourceId: string,
): Promise<void>
```

Endpoint paths and body shapes must be copied from the existing D2E Portal implementation. The initial `GET /api/datasources/:id` is only a route-shape placeholder in this plan; the implementation must use the verified existing endpoint or client wrapper.

### `types.ts`

Define plugin view-model types rather than leaking backend response details throughout components:

```ts
export interface DataSource {
  id: string
  name: string
  type?: string
  description?: string
  connectionInfo?: string
  metadata: Array<{ label: string; value: string }>
  tags: string[]
  access: AccessState
  resources: DataSourceResource[]
}

export interface DataSourceResource {
  id: string
  name: string
  type?: string
  description?: string
  downloadable: boolean
}

export type AccessState =
  | 'granted'
  | 'requestable'
  | 'requested'
  | 'denied'
  | 'restricted'
```

Normalize API response data inside `datasource.ts`. Do not assume a connection-information field is safe to render: render only server-approved display fields already exposed by the current Portal UI.

## 9. Atlas manifest registration

Change `plugins/atlas/plugins.standalone.json` by adding this object to the existing plugins array:

```json
{
  "id": "data-source-ui",
  "name": "Data Sources",
  "version": "0.1.0",
  "entryPoint": "data-source-ui/index.system.js",
  "menuItems": [],
  "metadata": {
    "author": "OHDSI",
    "description": "Data source description and contextual data-source pages"
  }
}
```

Do not add `routes` or `navItems` fields unless the actual manifest schema is extended deliberately. The verified existing manifest schema uses `entryPoint` and `menuItems`; adding unsupported keys does not create a route bridge.

`menuItems` remains empty because a global menu item has no valid concrete `:id`. Entry to this plugin comes from a selected data source, and the local navigation is inside the parcel.

## 10. Build and staging integration

### Build artifact

The package build produces:

```text
plugins/ui/apps/data-source-ui/dist/index.system.js
```

and emitted CSS/assets under that `dist/` directory.

### Atlas runtime location

Atlas must receive the complete output directory at:

```text
plugins/atlas/resources/atlas/plugins/data-source-ui/
```

The final entry file must therefore exist at:

```text
plugins/atlas/resources/atlas/plugins/data-source-ui/index.system.js
```

### Pipeline change

Inspect `plugins/atlas/package.json` and `plugins/atlas/scripts/postinstall.js` to identify the existing build/staging path. Existing installed Trex plugin packages are copied from `plugins/atlas/node_modules`, while UI-monorepo packages such as Patient Analytics may be staged by the caller/build pipeline.

Add `data-source-ui` to the UI monorepo build-and-copy path, not to an unrelated package copy list, unless the package is later published and installed into Atlas node_modules. The build pipeline must execute:

```text
build plugins/ui/apps/data-source-ui
copy plugins/ui/apps/data-source-ui/dist/ to plugins/atlas/resources/atlas/plugins/data-source-ui/
run the existing plugin verification step
```

Use the existing copy helper/script and add one mapping/list entry rather than creating a second staging mechanism. Copy the entire distribution directory so CSS and code-split assets remain available.

The existing verification script must see the manifest `entryPoint` at its final resource path. Extend any staged-plugin expectation test or verification input to include `data-source-ui`.

## 11. Atlas route bridge

### Why it is needed

The current Atlas plugin container supports paths in the form:

```text
/plugins/:pluginId/:pathMatch(.*)*
```

The desired product URL is:

```text
/datasources/:id
```

The plugin manifest makes the parcel loadable but cannot add this public route by itself because the verified manifest schema does not currently use a `routes` field.

### Required host-side change

In the Atlas3/Sibyl runtime source that defines the router and plugin container—identified in the Trex template as the router file containing the `/plugins/:pluginId/:pathMatch(.*)*` route—add a sibling route before generic fallback/not-found handling:

```ts
{
  path: '/datasources/:id',
  name: 'data-source-ui',
  component: PluginContainer,
  props: (route) => ({
    pluginId: 'data-source-ui',
    dataSourceId: route.params.id,
  }),
}
```

If `PluginContainer` currently accepts only `pluginId`, extend its prop/custom-prop construction to pass `dataSourceId` to `mountParcel`:

```ts
mountParcel(pluginConfig, {
  ...standardPluginProps,
  dataSourceId,
})
```

The precise host file must be selected by inspecting the Atlas runtime source used to build the D2E Atlas distribution. If D2E only copies a prebuilt upstream Atlas package, this change must be contributed to the Atlas runtime source/package and then consumed by D2E; it cannot be implemented solely inside `plugins/ui/apps/data-source-ui`.

Required behavior:

1. Match only `/datasources/:id` initially.
2. Resolve registered plugin `data-source-ui` from `plugins.standalone.json`.
3. Load `data-source-ui/index.system.js` with the normal plugin loader.
4. Pass standard authentication/message-bus props plus `dataSourceId`.
5. Unmount the parcel on route change.
6. Preserve existing `/plugins/:pluginId/...` behavior unchanged.
7. Do not create a global navigation item for individual data-source routes.

When the first future child page is implemented, extend the host route to:

```text
/datasources/:id/:pathMatch(.*)*
```

and synchronize the local Vue Router path from the host route remainder.

## 12. Future-page extensibility

The plugin must be structured so pages such as cohorts and studies are added by:

1. creating a view under `src/views/`;
2. adding a local route and a `dataSourcePages` registry entry;
3. adding an access/visibility predicate if that page requires it;
4. extending the host wildcard bridge when a public nested path is introduced.

Examples of future public URLs:

```text
/datasources/:id/cohorts
/datasources/:id/studies
```

Keep base data-source detail in `useDataSourceStore`; place page-specific requests in each page’s own store/composable only when needed. This avoids re-architecting the Description shell while avoiding a speculative global data layer.

## 13. Tests

Add Vitest tests without requiring a running Atlas host.

### Store tests: `tests/stores/dataSource.spec.ts`

Cover `useDataSourceStore`:

1. Initial state is `dataSource = null`, `loading = false`, `error = null`.
2. `fetchDataSource(id)` sets loading while the request is pending.
3. A successful response stores normalized data and clears the error.
4. A failed request stores a normalized error and clears loading.
5. Changing IDs while a prior request is unresolved does not allow the stale response to replace the newer data.

Mock only the functions exported by `src/api/datasource.ts`.

### API tests: `tests/api/datasource.spec.ts`

Cover the API module:

1. Detail request uses the verified existing endpoint and encodes the ID safely.
2. Authenticated requests include the configured Authorization header when a token exists.
3. Response mapping produces the normalized `DataSource` model.
4. Resource-list mapping handles empty resources.
5. Non-success responses become actionable errors.
6. Download/request-access functions call the existing endpoint/service with correct method and body.

Do not test implementation details of `fetch`; mock the configured API client boundary.

### Host integration tests

In the Atlas runtime repository/package, add route tests verifying:

1. `/datasources/123` selects plugin ID `data-source-ui`.
2. `dataSourceId` passed to the parcel is `123`.
3. Existing `/plugins/<plugin-id>/...` routes still work.
4. An unknown route is not captured by the data-source bridge.

### Build/staging verification

Run the existing plugin verification after staging and confirm:

```text
plugins/atlas/resources/atlas/plugins/data-source-ui/index.system.js
```

exists and is the exact path declared by the manifest.

## 14. Implementation and verification order

1. Inspect and align exact dependency versions and Vite/SystemJS externalization with `trex-notebook/plugins/notebook-plugin`.
2. Scaffold the package and achieve a successful `dist/index.system.js` build.
3. Add manifest entry and build/staging mapping; verify the entry bundle appears in Atlas resources.
4. Implement/consume the Atlas host route bridge and verify the parcel mounts at `/datasources/<known-id>`.
5. Locate existing Portal detail/resources/access/download API wrappers and implement the normalized API module.
6. Implement Pinia store, shell, Description view, and Figma-aligned sections.
7. Implement the local page registry/sidebar with Description as the only active item.
8. Add API/store tests and Atlas route integration tests.
9. Exercise the real Atlas route with authenticated data-source records covering normal, requestable, granted, unavailable, and error states.

## Non-goals

- No new D2E backend endpoint.
- No database migration.
- No Docker Compose or new environment variable.
- No global Atlas menu item for a data source without a concrete ID.
- No iframe wrapper.
- No future cohorts/studies page implementation in the Description-page change.
