# Data Source UI Atlas3 plugin implementation plan

## Scope and fixed decisions

Create a new Vue 3 single-spa micro-frontend at `plugins/ui/apps/data-source-ui/`.

- **single-spa/plugin ID:** `data-source-ui`
- **Atlas-facing bundle:** `index.system.js`
- **Public route:** `/datasources/:id`
- **Registration source:** `plugins/atlas/plugins.standalone.json`
- **UI stack:** Vue 3, Vuetify, and the Atlas component library/design conventions
- **API source:** existing D2E dataset, resource download, and access-request endpoints
- **Initial page:** Description; it owns the contextual data-source navigation
- **Closest implementation template:** `plugins/ui/apps/vue-mri-ui-lib/`, specifically `src/lifecycles.ts` and `vite.config.atlas.ts`

No D2E API, database, environment-variable, or Docker Compose change is in scope.

## Repository findings informing this plan

`vue-mri-ui-lib` already provides the closest D2E Vue/Atlas pattern:

- Its lifecycle entry uses `single-spa-vue`, Vue `createApp`, Vuetify, and reactive host/portal custom props.
- Its Atlas build writes a SystemJS library bundle to `dist-atlas/index.system.js` via `vite.config.atlas.ts`.
- Its lifecycle exports `bootstrap`, `mount`, `update`, and `unmount`.

The Atlas standalone manifest currently has this runtime shape:

```json
{
  "id": "patient-analytics",
  "name": "Data Exploration",
  "version": "2.0.0",
  "entryPoint": "patient-analytics/index.system.js",
  "menuItems": []
}
```

The D2E Atlas staging script is `plugins/atlas/scripts/postinstall.js`. It currently copies a table of published package distributions to `plugins/atlas/resources/atlas/plugins/<id>/`. This new in-repository application needs one additional table entry/source-path branch so its locally built `dist-atlas` directory is copied to `resources/atlas/plugins/data-source-ui/`.

Existing Portal behavior to reuse is in `plugins/ui/apps/portal/src/containers/researcher/Information/Information.tsx` and `plugins/ui/apps/portal/src/axios/system-portal.ts`:

- resources: `GET dataset/resource/list?datasetId=<id>`
- resource download: `GET dataset/resource/<filename>/download?datasetId=<id>` as a blob
- access request state: `api.userMgmt.getMyStudyAccessRequests()` plus `user.isDatasetResearcher[datasetId]`
- request access: `api.userMgmt.addStudyAccessRequest(userId, datasetId, Roles.STUDY_RESEARCHER)`
- dataset detail is already provided by the Portal dataset hook/client; implementation must identify the existing read endpoint used by that hook before extracting the equivalent request into this new app. The inspected `system-portal.ts` exposes `POST`/`PUT dataset/detail` for administration, not the detail read call itself.

## 1. New application scaffold

### New directory and files

Create:

```text
plugins/ui/apps/data-source-ui/
├── package.json
├── tsconfig.json
├── index.html
├── vite.config.ts
├── vite.config.atlas.ts
├── src/
│   ├── main.ts
│   ├── lifecycles.ts
│   ├── App.vue
│   ├── plugins/
│   │   └── vuetify.ts
│   ├── router/
│   │   ├── index.ts
│   │   └── pages.ts
│   ├── types/
│   │   ├── atlas-props.ts
│   │   └── data-source.ts
│   ├── services/
│   │   └── dataSourceApi.ts
│   ├── composables/
│   │   ├── useAtlasContext.ts
│   │   └── useDataSource.ts
│   ├── components/
│   │   ├── DataSourceLayout.vue
│   │   ├── DataSourceNav.vue
│   │   ├── DataSourceHeader.vue
│   │   ├── MetadataTable.vue
│   │   ├── FileList.vue
│   │   ├── RequestAccessAction.vue
│   │   └── PageState.vue
│   ├── views/
│   │   └── DataSourceDescription.vue
│   └── styles/
│       └── main.scss
└── tests/
    ├── dataSourceApi.spec.ts
    ├── router.spec.ts
    └── DataSourceDescription.spec.ts
```

Keep styles scoped to the plugin root/class where possible. Do not add global reset styles that could alter Atlas host pages.

### `package.json`

Use the versions and package conventions from `plugins/ui/apps/vue-mri-ui-lib/package.json`, narrowing dependencies to those required by this app. Required runtime dependencies include:

```json
{
  "name": "data-source-ui",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:atlas": "vite build --config vite.config.atlas.ts",
    "typecheck": "vue-tsc --noEmit",
    "test:unit": "vitest run"
  },
  "dependencies": {
    "vue": "3.5.17",
    "vue-router": "^4.2.0",
    "vuetify": "3.12.0",
    "single-spa": "^6.0.0",
    "single-spa-vue": "^3.0.1"
  }
}
```

Add the exact existing Vuetify support packages used by `vue-mri-ui-lib` (`@mdi/font`, Sass/Vite Vuetify plugin where needed) rather than introducing a second component-library version. Use the app/workspace package manager and lockfile conventions already used by `plugins/ui/apps`.

### `vite.config.atlas.ts`

Follow `plugins/ui/apps/vue-mri-ui-lib/vite.config.atlas.ts` with these exact build semantics:

```ts
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, 'dist-atlas'),
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    lib: {
      entry: path.resolve(__dirname, 'src/lifecycles.ts'),
      fileName: () => 'index.system.js',
      formats: ['system'],
    },
    rollupOptions: {
      output: { entryFileNames: 'index.system.js' },
    },
  },
})
```

Adapt only the shared-dependency externalization/import-map settings that are already required by another direct-rendering Atlas plugin. The existing `vue-mri-ui-lib` SystemJS wrapper is intentionally dependency-free because it embeds an iframe; `data-source-ui` renders Vue directly and therefore must either bundle Vue/Vuetify or externalize them only when the Atlas import map supplies compatible modules. Confirm this with the actual Atlas runtime import map before deciding; do not assume `vue` and `vuetify` are globally resolvable.

### `src/lifecycles.ts`

This is the single-spa lifecycle entry, modeled on `vue-mri-ui-lib/src/lifecycles.ts`.

Define custom props:

```ts
export interface AtlasPluginProps {
  getToken?: () => Promise<string>
  datasetId?: string
  username?: string
  locale?: string
  qeSvcUrl?: string
  REACT_APP_PUBLIC_WEBAPI_PROXY_URL?: string
  REACT_APP_USE_PUBLIC_WEBAPI_PROXY?: string
  REACT_APP_PUBLIC_WEBAPI_DATASOURCE?: string
  dataSourceId?: string
}
```

Implement:

```ts
const lifecycles = singleSpaVue({
  createApp,
  replaceMode: true,
  appOptions: {
    render: () => h(App),
  },
  handleInstance(app, props: AtlasPluginProps) {
    // install Pinia if selected, Vue Router, Vuetify, Atlas context provider
  },
})

export const { bootstrap, mount } = lifecycles
export const update = async (props: Partial<AtlasPluginProps>) => { /* update reactive host props */ }
export const unmount = async (props: unknown) => { /* delegate to lifecycle cleanup */ }
```

`useAtlasContext.ts` must expose a reactive copy of host props. It must prefer `getToken()` for authenticated calls and must not write tokens to local storage.

### `src/main.ts`

Provide a development-only direct mount that shares the same app factory/router/Vuetify setup as the lifecycle entry:

```ts
createDataSourceApp(resolveLocalDevelopmentProps()).mount('.vue-main')
```

The page should be independently viewable during development, but `main.ts` must not be included by the Atlas SystemJS build.

### `src/App.vue` and Vue Router

`App.vue` is the plugin root and contains the contextual frame plus `RouterView`:

```vue
<DataSourceLayout>
  <RouterView />
</DataSourceLayout>
```

`src/router/index.ts` uses Vue Router history against the actual host path. Its initial route is:

```ts
{
  path: '/datasources/:id',
  component: DataSourceLayout,
  children: [
    {
      path: '',
      name: 'data-source-description',
      component: () => import('../views/DataSourceDescription.vue'),
    },
  ],
}
```

Use `createWebHistory()` only after confirming it does not conflict with Atlas’s host navigation. If Atlas supplies history behavior that cannot coexist with a nested router, use `createMemoryHistory()` plus a small URL-to-route adapter; the browser pathname remains `/datasources/:id` in both cases.

## 2. Description page

### `src/views/DataSourceDescription.vue`

The component receives the ID through Vue Router:

```ts
const route = useRoute()
const dataSourceId = computed(() => String(route.params.id))
const { dataSource, resources, access, loading, error, requestAccess, downloadResource } = useDataSource(dataSourceId)
```

The composable reloads when `route.params.id` changes, so direct navigation between data sources does not retain stale content.

### Existing API integration

`src/services/dataSourceApi.ts` centralizes authenticated requests and maps backend responses to view models. It must call the existing endpoint contract and auth mechanism rather than inventing D2E APIs:

```ts
getDataSource(id: string): Promise<DataSource>
getResources(id: string): Promise<DatasetResource[]>
downloadResource(id: string, filename: string): Promise<Blob>
getMyStudyAccessRequests(): Promise<StudyAccessRequest[]>
requestResearcherAccess(userId: string, id: string): Promise<void>
```

Known endpoint contracts:

```text
GET  dataset/resource/list?datasetId=<id>
GET  dataset/resource/<filename>/download?datasetId=<id>
```

For the remaining calls, copy the request shape from the existing Portal hooks/API client after locating the exact detail-read and user-management endpoint definitions. The new client uses the Atlas-provided authenticated request/base-URL configuration, not Portal React context.

Sanitize or render the server-provided rich description through the repository’s established rich-text/Markdown renderer. Do not bind unsanitized server HTML with `v-html`.

### Rendered sections

The requested Figma export could not be retrieved by the connected Figma account during planning. The implementation must re-check node `1709-215182` once access is available and tune visual spacing, typography, icons, and responsive behavior against it. The confirmed issue acceptance criteria define these required sections:

1. **Left-side navigation menu**
   - grouped/section-labelled navigation
   - access-specific menu composition
   - default, hover, and selected states
   - selected item uses the required blue treatment for background, icon, and text
2. **Data source name** as the page title.
3. **Description** showing the complete rich text configured in the admin portal.
4. **Metadata table** based on the data source attributes and the data-source ID.
5. **Files section** showing filename, size, and a download action for each associated resource.
6. **Access request action/state**, reusing the Portal’s existing request/pending/approved behavior when the dataset configuration permits requests.

Implement these components:

- `DataSourceHeader.vue`: title and access action/status.
- `DataSourceNav.vue`: page definitions from `router/pages.ts`, with active/hover/access behavior.
- `MetadataTable.vue`: normalized attribute rows; omit empty optional fields.
- `FileList.vue`: filename, size, progress/loading state per resource, and blob download.
- `RequestAccessAction.vue`: request, pending, and access-granted states.
- `PageState.vue`: loading, not-found/inaccessible, and generic request-failure states.

## 3. Atlas route bridge

### Constraint

The shipped standalone manifest and Atlas host convention currently route menu items through `/plugins/<plugin-id>/`. The `data-source-ui` route must instead mount directly at `/datasources/:id`, and the current `plugins.standalone.json` schema has no `routes` field.

This cannot be implemented only by adding a `menuItems` record. It requires a targeted extension to the Atlas3 host plugin-runtime router that reads `resources/atlas/config/plugins.json`, matches a declared route pattern, SystemJS-imports the plugin entry point, and mounts it as the same parcel type used for normal plugin navigation.

### Required host behavior

Extend the Atlas3 plugin runtime/source used to produce `plugins/atlas/node_modules/@ohdsi/atlas3/dist` with support for an optional manifest field:

```ts
interface RuntimePlugin {
  id: string
  entryPoint: string
  routes?: Array<{ path: string; exact?: boolean }>
  menuItems?: MenuItem[]
}
```

The routing function must:

```ts
matchPluginRoute(pathname: string, plugins: RuntimePlugin[]): PluginRouteMatch | undefined
```

- match `/datasources/:id` against the browser pathname;
- return `{ pluginId: 'data-source-ui', params: { id } }`;
- mount the plugin through the existing SystemJS/single-spa parcel mounting pathway;
- pass ordinary host props plus `dataSourceId: params.id`;
- unmount the parcel when the path no longer matches;
- preserve existing `/plugins/<id>/...` behavior unchanged;
- execute custom-route matching before generic not-found handling.

Use a routing matcher already used by Atlas3 if one exists; otherwise add the smallest dependency-free segment matcher needed for named colon parameters. Match the exact two-segment route for this release. Add `/datasources/:id/*` only when the first child page actually needs it.

### Where the source change belongs

The repository’s `plugins/atlas` package stages a prebuilt `@ohdsi/atlas3` distribution; it does not contain the host plugin router source. Therefore the implementation requires one of these repository-supported paths, selected after confirming how Atlas3 is consumed:

1. **Preferred:** make the route-pattern enhancement in the Atlas3 source package/release used by `@ohdsi/atlas3`, publish/consume the updated package, then update `plugins/atlas/package.json` to that version.
2. **Only if the repository already has a maintained patch pipeline:** apply a narrow, tested patch to the staged Atlas distribution in `plugins/atlas/scripts/postinstall.js`. Do not add a brittle search-and-replace against unknown/minified code unless the existing project explicitly uses that mechanism.

The plan does not assume a nonexistent D2E-local Atlas router file. The implementation must identify the accepted Atlas3 source/patch delivery method before editing host routing.

## 4. Manifest registration

### File

`plugins/atlas/plugins.standalone.json`

### Add this plugin entry

Add it to the `plugins` array:

```json
{
  "id": "data-source-ui",
  "name": "Data Source",
  "version": "1.0.0",
  "entryPoint": "data-source-ui/index.system.js",
  "routes": [
    {
      "path": "/datasources/:id",
      "exact": true
    }
  ],
  "menuItems": [],
  "metadata": {
    "author": "D2E",
    "description": "Data source description and contextual navigation"
  }
}
```

No global `menuItems` entry is added: a menu link cannot supply a meaningful required data-source ID, and the plugin owns its data-source-local navigation. The host route bridge consumes `routes`; existing Atlas versions will ignore no unknown fields only if their config parser permits it, which must be verified when implementing the host enhancement.

The post-install script already copies this source file to:

```text
plugins/atlas/resources/atlas/config/plugins.json
```

## 5. Build and resource staging

### `plugins/atlas/scripts/postinstall.js`

Extend the plugin staging table so it supports a local application build source. Add an entry conceptually equivalent to:

```js
{
  id: 'data-source-ui',
  source: join(rootDir, '..', 'ui', 'apps', 'data-source-ui', 'dist-atlas'),
  repoints: [],
}
```

Then make the loop resolve `source` for local entries and retain the existing `node_modules/<package>/dist` resolution for package entries. The common copy behavior remains:

```text
source dist-atlas/
  -> plugins/atlas/resources/atlas/plugins/data-source-ui/
```

The staged directory must contain:

```text
resources/atlas/plugins/data-source-ui/index.system.js
```

and every emitted JS/CSS/static asset required by the SystemJS entry.

### Build orchestration

Add an explicit Atlas build integration step in `plugins/atlas/package.json` or the root workspace build script, depending on existing workspace orchestration:

```text
build data-source-ui with npm run build:atlas
→ run plugins/atlas postinstall staging
→ run plugins/atlas prepack verification
```

Do not rely on `postinstall` to compile the child app implicitly unless the repository’s install lifecycle already builds all `plugins/ui/apps` apps. The local distribution must exist before staging. Update `plugins/atlas/scripts/verify-plugins.js` only if its existing generic `entryPoint` check cannot already validate the new manifest record.

## 6. Extensibility

`src/router/pages.ts` is the single registry for data-source pages:

```ts
export interface DataSourcePageDefinition {
  id: string
  label: string
  icon: string
  path: string
  component: Component
  visible: (context: DataSourceAccessContext) => boolean
}

export const dataSourcePages: DataSourcePageDefinition[] = [
  {
    id: 'description',
    label: 'Description',
    icon: 'mdi-information-outline',
    path: '',
    component: DataSourceDescription,
    visible: () => true,
  },
]
```

`DataSourceNav.vue` renders this registry; `router/index.ts` derives child routes from it. To add a future Cohorts or Studies page:

1. add the page view, such as `src/views/DataSourceCohorts.vue`;
2. add its registry definition with a stable child path, such as `cohorts` or `studies`;
3. give it an access predicate based on the normalized data-source/user context;
4. add only that page’s APIs/components.

The public URL structure becomes:

```text
/datasources/:id
/datasources/:id/cohorts
/datasources/:id/studies
```

At that time, widen the host manifest matcher from exact `/datasources/:id` to the deliberate route family required by the child pages. The Atlas bridge remains one plugin mount; no new Atlas host route or manifest plugin entry is needed per child page.

## File-by-file change list

### New

```text
plugins/ui/apps/data-source-ui/package.json
plugins/ui/apps/data-source-ui/tsconfig.json
plugins/ui/apps/data-source-ui/index.html
plugins/ui/apps/data-source-ui/vite.config.ts
plugins/ui/apps/data-source-ui/vite.config.atlas.ts
plugins/ui/apps/data-source-ui/src/main.ts
plugins/ui/apps/data-source-ui/src/lifecycles.ts
plugins/ui/apps/data-source-ui/src/App.vue
plugins/ui/apps/data-source-ui/src/plugins/vuetify.ts
plugins/ui/apps/data-source-ui/src/router/index.ts
plugins/ui/apps/data-source-ui/src/router/pages.ts
plugins/ui/apps/data-source-ui/src/types/atlas-props.ts
plugins/ui/apps/data-source-ui/src/types/data-source.ts
plugins/ui/apps/data-source-ui/src/services/dataSourceApi.ts
plugins/ui/apps/data-source-ui/src/composables/useAtlasContext.ts
plugins/ui/apps/data-source-ui/src/composables/useDataSource.ts
plugins/ui/apps/data-source-ui/src/components/DataSourceLayout.vue
plugins/ui/apps/data-source-ui/src/components/DataSourceNav.vue
plugins/ui/apps/data-source-ui/src/components/DataSourceHeader.vue
plugins/ui/apps/data-source-ui/src/components/MetadataTable.vue
plugins/ui/apps/data-source-ui/src/components/FileList.vue
plugins/ui/apps/data-source-ui/src/components/RequestAccessAction.vue
plugins/ui/apps/data-source-ui/src/components/PageState.vue
plugins/ui/apps/data-source-ui/src/views/DataSourceDescription.vue
plugins/ui/apps/data-source-ui/src/styles/main.scss
plugins/ui/apps/data-source-ui/tests/dataSourceApi.spec.ts
plugins/ui/apps/data-source-ui/tests/router.spec.ts
plugins/ui/apps/data-source-ui/tests/DataSourceDescription.spec.ts
```

### Changed

```text
plugins/atlas/plugins.standalone.json
plugins/atlas/scripts/postinstall.js
plugins/atlas/package.json
plugins/atlas/scripts/verify-plugins.js (only if needed for local staged bundle validation)
<Atlas3 plugin runtime source/package/version or approved D2E patch location>
```

## Verification

1. Run `data-source-ui` type checking and unit/component tests.
2. Run `npm run build:atlas` in `plugins/ui/apps/data-source-ui` and confirm `dist-atlas/index.system.js` exists.
3. Run the Atlas staging lifecycle and confirm:

   ```text
   plugins/atlas/resources/atlas/config/plugins.json
   plugins/atlas/resources/atlas/plugins/data-source-ui/index.system.js
   ```

4. Run the Atlas manifest verification script.
5. Exercise the real hosted Atlas runtime at `/datasources/<known-id>` using an authenticated session.
6. Verify direct navigation and refresh mount the parcel; navigation away unmounts it.
7. Verify the route bridge passes/derives the correct data-source ID.
8. Verify title, rich description, metadata, resource filename/size/download behavior, and left-nav selected/hover/access states.
9. Verify no-access, pending-request, approved-access, missing/inaccessible ID, empty-files, and API-failure states.
10. Verify existing `/plugins/<plugin-id>/` routes still work.

## Deployment/configuration conclusion

No Docker Compose changes, new services, backend endpoint changes, database migrations, or new environment variables are required. The plugin uses the existing Atlas-provided authentication/API context and is served from the existing `resources/atlas/plugins/` static resource path.