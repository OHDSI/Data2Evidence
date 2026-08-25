# Data Source UI — Atlas3 Single-Spa Plugin Implementation Plan

## Purpose

Create `data-source-ui` as a direct-rendered Vue single-spa parcel in `plugins/ui/apps/data-source-ui/`. Atlas3 will load the SystemJS bundle from its plugin manifest and mount it at the canonical data-source route:

```text
/datasources/:id
```

The first release supplies the Data Source Description view. The parcel owns its contextual data-source navigation and local routing so future pages such as Cohorts and Studies can be introduced without reworking the Atlas integration.

This follows the direct Vue parcel model used by the `trex-notebook` notebook plugin and the Atlas-facing Vue conventions of `plugins/ui/apps/vue-mri-ui-lib`. It intentionally does not use the `vue-mri-ui-lib` iframe-wrapper pattern.

## Confirmed local conventions

- D2E Atlas registers runtime parcels in `plugins/atlas/plugins.standalone.json`.
- The current manifest schema uses `id`, `name`, `version`, `entryPoint`, `menuItems`, and optional `metadata`.
- Existing entry points use a plugin-relative SystemJS file, e.g. `notebook-plugin/index.system.js`.
- Existing D2E UI apps are under `plugins/ui/apps/`; `data-source-ui/` already exists and currently contains only its planning material.
- Current public menu entries use `/plugins/<plugin-id>/...`; therefore `/datasources/:id` requires an Atlas host router bridge in addition to manifest registration.

## 1. Directory structure

Create the application using the following tree:

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
│   ├── api/
│   │   ├── client.ts
│   │   ├── datasource.ts
│   │   └── types.ts
│   ├── router/
│   │   ├── index.ts
│   │   └── pages.ts
│   ├── stores/
│   │   ├── hostContext.ts
│   │   └── dataSource.ts
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

Keep the first release narrow. Add a component only when it maps to a Figma section or separates reusable presentation from data loading.

## 2. Package and workspace integration

Create `plugins/ui/apps/data-source-ui/package.json` as a workspace package. Copy the package-manager workspace conventions and exact compatible versions from the nearest Vue/Vuetify app and the trex-notebook plugin; do not introduce a parallel Vue, Vuetify, or Atlas UI dependency version.

Use this package identity and scripts:

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

Add this package to the same root workspace declaration that includes existing `plugins/ui/apps/*` applications, if that declaration does not already cover the new directory. Reuse the root package manager lockfile; do not create a separate lockfile in the app directory.

## 3. Vite and SystemJS build

Create `plugins/ui/apps/data-source-ui/vite.config.ts`, modeled on the direct trex-notebook parcel build rather than the Patient Analytics iframe build.

The build must:

- enable the Vue Vite plugin;
- use library mode with `src/main.ts` as its entry;
- write to `dist/`;
- output SystemJS format;
- emit the stable parcel entry `dist/index.system.js`;
- set `cssCodeSplit: false` so Atlas can load a predictable stylesheet asset;
- externalize Vue only if the Atlas SystemJS import map supplies it, matching the notebook template;
- bundle other dependencies unless the verified Atlas import map supplies them.

Target configuration:

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

Before implementation, verify trex-notebook’s current build configuration from the checked-out or published source and preserve any required aliases, CSS handling, or additional SystemJS externals. The raw GitHub paths were not available during this planning pass, so local D2E conventions must be the final compatibility authority.

## 4. Single-spa Vue lifecycle

`src/main.ts` is the library entry. It imports global styles, creates the Vue parcel through `single-spa-vue`, installs Pinia, Vuetify, and the local router, and exports `bootstrap`, `mount`, and `unmount`.

Define `src/types/plugin.ts`:

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
    request: <TRequest, TResponse>(type: string, payload: TRequest) => Promise<TResponse>
    subscribe: <T>(type: string, callback: (payload: T) => void) => () => void
  }
}
```

The exact host prop names and types must match the existing Atlas plugin contract. Do not invent a separate authentication flow.

Implement lifecycle behavior:

1. Import `src/styles/main.scss`.
2. Create the Vuetify instance and router once, following the notebook plugin pattern.
3. In `handleInstance(app)`, install the Pinia instance, Vuetify instance, and router.
4. During `bootstrap(props)`, populate the host-context store, configure the API client with `props.authContext.token`, and ensure emitted CSS is loaded from `props.uiFilesUrl` if that is required by the existing notebook parcel convention.
5. During `mount(props)`, update host context and `dataSourceId`; this supports reuse if Atlas changes only the selected ID.
6. During `unmount`, clean up message-bus subscriptions and request listeners created by this parcel.

The intended lifecycle arrangement is:

```ts
const lifecycles = singleSpaVue({
  createApp,
  appOptions: {
    render() {
      return h(App)
    },
  },
  handleInstance(app) {
    app.use(pinia)
    app.use(vuetify)
    app.use(router)
  },
})

export const bootstrap = async (props: PluginProps) => {
  setHostContext(props)
  configureApiClient({ token: props.authContext.token })
  return lifecycles.bootstrap(props)
}

export const mount = async (props: PluginProps) => {
  setHostContext(props)
  return lifecycles.mount(props)
}

export const unmount = lifecycles.unmount
```

## 5. Vuetify and Atlas UI setup

Use Vue 3, Vuetify 3, Pinia, and `@ohdsi/atlas-ui`, consistent with trex-notebook.

Configure Vuetify in `src/main.ts` or a narrowly scoped setup module:

- use MDI icons from `@mdi/font` and Vuetify’s MDI icon set;
- disable a plugin-owned theme so Atlas remains visually authoritative;
- apply shared/default component configuration from the existing Atlas/notebook utility if present;
- avoid global styles that can leak into the host.

Prefer Atlas UI components for product controls and status presentation:

- `AtlasButton` for Request Access and downloads;
- `AtlasAlert` for error and access-status messages;
- `AtlasChip` for tags and access states;
- `AtlasDataTable` for a resource/file list where it matches the Figma hierarchy.

Use Vuetify primitives for layout, spacing, cards, lists, and responsive behavior only where Atlas UI does not supply an equivalent component.

## 6. Vue Router and future pages

Atlas owns the browser URL `/datasources/:id`. The initial parcel router should use memory history so it does not take ownership of global browser navigation.

Create `src/router/index.ts`:

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

The router is mounted beneath the host-selected data source. `DataSourceLayout` contains the header, contextual navigation, and `router-view`.

Create `src/router/pages.ts` with a registry driving the contextual sidebar:

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

Future views add one component and one page-registry record. When a public nested route is first required, extend the Atlas bridge from `/datasources/:id` to `/datasources/:id/:pathMatch(.*)*` and synchronize that remaining path with local router navigation. Do not expose unimplemented pages as functional links.

## 7. Description view and existing D2E data

Create `src/views/DataSourceDescriptionView.vue`.

The view reads the current `dataSourceId` from the host-context store, watches it, and calls `useDataSourceStore().fetchDataSource(id)` when it is set or changes. It receives normalized data from the store and does not parse raw responses.

### Required existing data

Before implementing, locate the current D2E Portal Information feature and reuse its exact authenticated API client methods and response mappings. The likely detail route is only a placeholder:

```text
GET /api/datasources/:id
```

Use the verified existing endpoint, which may use D2E’s dataset naming rather than this route shape. Also reuse:

```text
dataset/resource/list?datasetId=:id
existing authenticated resource-download action
existing access-request status and access-request submission flow
```

No backend endpoint, database migration, or data model is created by this feature.

### Figma node 1709-215182 layout

Render these design sections using Atlas UI and Vuetify primitives:

1. **Header and identity**: data-source name, data-source type, display-safe source/platform context, access/status indicator, and primary Request Access action.
2. **Contextual navigation**: plugin-owned left navigation with Description selected and access-aware extension support.
3. **Description**: long-form description rendered with the existing safe D2E rich-text sanitizer/renderer if the server supplies HTML.
4. **Connection information**: source/platform/connection display fields that the current Portal already exposes. Never show credentials, secrets, or raw internal connection strings.
5. **Metadata**: labeled detail rows using existing attributes such as type, organization/owner, dates, tags/categories, classification, and access information. Omit unavailable data rather than showing misleading blanks.
6. **Resources/files**: resources loaded from the existing resource list service, with type/description metadata and an authenticated download action only when allowed.
7. **Access state**: Request Access when eligible; otherwise granted, pending, denied, or restricted state using existing workflow semantics.
8. **Page states**: loading, unavailable/not-found, request failure, and empty-resource states.

Component division:

- `DataSourceHeader.vue`: identity fields and access action.
- `DescriptionMetadata.vue`: normalized metadata key/value rendering.
- `DataSourceResources.vue`: resource table/list and download trigger.
- `RequestAccessAction.vue`: state-sensitive request action and result display.
- `PageState.vue`: loading, empty, and error presentation.

## 8. Pinia stores

Create `src/stores/hostContext.ts` to hold parcel props needed by app components: `authContext`, `messageBus`, `uiFilesUrl`, and `dataSourceId`. It is updated by lifecycle functions, not by a component parsing a global variable.

Create `src/stores/dataSource.ts` with `useDataSourceStore`.

State:

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

Behavior:

1. Mark loading and clear the prior error.
2. Load normalized data-source detail.
3. Load resources and access status only where those are not included in the detail response.
4. Store the combined view model.
5. Normalize request failures to an `Error`.
6. Clear loading in `finally`.
7. Prevent an earlier request from overwriting state after the selected ID changes, using a request ID or abort signal.

The store must not contain raw HTTP behavior or route parsing.

## 9. API modules

Create:

```text
src/api/client.ts
src/api/datasource.ts
src/api/types.ts
```

`client.ts` configures the authenticated request boundary from the host token:

```ts
export function configureApiClient(options: {
  token: string | null
  baseUrl?: string
}): void
```

Use the same D2E/Atlas API base URL discovery model as existing plugins. Do not derive the API base URL from the browser path or user-controlled inputs.

`datasource.ts` exposes:

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

Endpoint methods, paths, headers, and request bodies must be copied from existing Portal behavior after verifying it in code. The plan does not authorize creation of a new API contract.

`types.ts` provides component-friendly normalized view models:

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

Keep server-response normalization inside the API layer. Render only approved display-safe fields.

## 10. Atlas plugin manifest change

Add this object to the `plugins` array in `plugins/atlas/plugins.standalone.json`:

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

Do not add unsupported `routes` or `navItems` keys. The verified local schema uses `entryPoint` and `menuItems`; manifest registration alone does not register an arbitrary host route.

Keep `menuItems` empty. A global menu item cannot provide a concrete data-source ID and would create an invalid destination. The parcel is entered from selected data-source context and owns local navigation.

## 11. Atlas host route bridge

The current generic plugin routing convention is:

```text
/plugins/:pluginId/:pathMatch(.*)*
```

The required URL is outside that convention:

```text
/datasources/:id
```

The Atlas3/Sibyl runtime source that contains the router and `PluginContainer` must receive a host-side route before its fallback/not-found routes:

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

Extend `PluginContainer`, if necessary, so it passes the extracted ID as a custom property when mounting the parcel:

```ts
mountParcel(pluginConfig, {
  ...standardPluginProps,
  dataSourceId,
})
```

Required host behavior:

1. Match `/datasources/:id` and no unrelated paths.
2. Resolve registered plugin ID `data-source-ui`.
3. Load `data-source-ui/index.system.js`.
4. Pass normal auth/message-bus/UI-files props plus `dataSourceId`.
5. Unmount when the route is left.
6. Preserve generic `/plugins/:pluginId/...` behavior.
7. Do not add an invalid Atlas global menu route.

If D2E consumes only a prebuilt Atlas runtime, make the route change in the Atlas/Sibyl source package that creates that runtime, then update the D2E runtime dependency. It cannot be achieved solely inside the new parcel or the standalone manifest.

## 12. Build output and deployment staging

The Vite build emits:

```text
plugins/ui/apps/data-source-ui/dist/index.system.js
```

and any associated CSS/assets beneath `dist/`.

Atlas must stage the entire directory to:

```text
plugins/atlas/resources/atlas/plugins/data-source-ui/
```

The manifest therefore resolves to:

```text
plugins/atlas/resources/atlas/plugins/data-source-ui/index.system.js
```

Inspect `plugins/atlas/package.json` and `plugins/atlas/scripts/postinstall.js` before implementation. Existing installed Trex packages are copied from Atlas `node_modules`; local UI packages may be staged through a separate monorepo build/copy path. Add `data-source-ui` to the local UI build-and-copy pipeline rather than an unrelated installed-package list unless it is deliberately published and installed as a package.

Required build sequence:

```text
build plugins/ui/apps/data-source-ui
copy plugins/ui/apps/data-source-ui/dist/ to plugins/atlas/resources/atlas/plugins/data-source-ui/
run existing plugin verification
```

Reuse the existing copy helper or build script and add a single mapping/list entry. Copy the full directory so CSS and assets are present. Extend the existing verification expectation where needed so the new manifest `entryPoint` must be found in the staged resources directory.

## 13. Tests and verification

Add unit tests for the API module and store.

`tests/api/datasource.spec.ts` verifies:

1. The verified existing endpoint path and method are used.
2. IDs are safely encoded.
3. The host token is supplied through the authenticated client.
4. Detail data is normalized correctly.
5. Empty resource lists are handled.
6. API failures are normalized consistently.
7. Existing access-request and download request shapes are preserved.

`tests/stores/dataSource.spec.ts` verifies:

1. Initial store state.
2. Loading state during `fetchDataSource`.
3. Successful normalized data storage.
4. Failure state and loading reset.
5. An old request cannot overwrite the result after the active ID changes.

Add host runtime route tests in the Atlas/Sibyl source package for:

1. `/datasources/123` resolving to `data-source-ui`.
2. Parcel props containing `dataSourceId: '123'`.
3. Existing `/plugins/<plugin-id>/...` routes retaining their behavior.
4. Unrelated URLs not being captured.

Verify the full runtime flow:

```text
build data-source-ui
stage output under resources/atlas/plugins/data-source-ui
verify index.system.js is present
load Atlas at /datasources/<known-id>
confirm parcel mounting and API-backed Description content
```

Exercise loading, not-found/inaccessible, requestable, granted/pending access, resource-list, and allowed-download states through the real Atlas runtime.

## 14. Delivery sequence

1. Verify current Trex notebook Vite/lifecycle/Vuetify configuration against accessible source and local bundle conventions.
2. Scaffold the new workspace package and establish SystemJS build output.
3. Add staging integration and manifest registration.
4. Implement and consume the Atlas route bridge; verify mount at a known data-source ID.
5. Locate existing Portal API wrappers and reproduce only the required normalized client behavior.
6. Implement host context, data-source store, shell, navigation, and Description view.
7. Add access/resource interactions using existing backend flows.
8. Add unit and host-route tests.
9. Build, stage, and exercise the live Atlas route.

## Non-goals

- No new D2E API endpoints.
- No database migrations.
- No Docker Compose or environment-variable changes.
- No iframe wrapper.
- No global Atlas menu item for a route that requires a selected data-source ID.
- No Cohorts or Studies implementation in the initial Description-page release.
