# Cohorts Plugin (Vue MRI PA Wrapper)

This is an Atlas3 plugin that wraps the vue-mri-pa-lib (Patient Analytics) application.

## Overview

This plugin acts as a thin wrapper that:
1. Loads the vue-mri-pa-lib Vue application dynamically
2. Exposes the Portal API interface that vue-mri expects
3. Handles authentication token passing
4. Manages the SAP UI5 dependencies required by vue-mri

## Architecture

```
Atlas3
  ↓ Loads plugin
Cohorts Plugin (this)
  ├─ Loads SAP UI5 Core
  ├─ Loads vue-mri CSS/JS assets
  ├─ Exposes portalAPI on DOM
  └─ Triggers vue-mri bootstrap
    ↓
Vue MRI PA Application
  (Patient Analytics / Cohorts)
```

## Features

- **Dynamic Loading**: vue-mri assets are loaded at runtime from `/mri/*` endpoints
- **Portal API Bridge**: Exposes authentication and context to vue-mri
- **SAP UI5 Integration**: Loads required SAP UI5 libraries
- **Event Communication**: Dispatches `alp-dataset-change` events

## Development

```bash
# Install dependencies
npm install

# Build plugin
npm run build

# Output: ../static/plugins/cohorts/index.js
```

## Integration Requirements

### 1. Portal Backend with Vue MRI

The vue-mri-pa-lib is served by the Portal backend at `/mri/*`:
- Portal backend serves vue-mri assets at `https://localhost:41100/mri/*`
- Auth-proxy proxies `/mri/*` to Portal backend
- Plugin loads assets from `/mri/assets.json`

**No additional deployment needed** - vue-mri assets are already served by Portal!

### 2. Assets Manifest

The plugin fetches `/mri/assets.json` (proxied through auth-proxy to Portal backend):
```json
{
  "js": ["/mri/js/chunk-vendors.xxx.js", "/mri/js/app.xxx.js"],
  "css": ["/mri/css/chunk-vendors.xxx.css", "/mri/css/app.xxx.css"]
}
```

### 3. SAP UI5

The plugin loads SAP UI5 from CDN:
```
https://openui5.hana.ondemand.com/1.102.2/resources/sap-ui-core.js
```

## Portal API Interface

The plugin exposes this API on the container DOM element for vue-mri (same as Portal):

```typescript
portalAPI = {
  getToken: async () => string,       // Authentication token from Atlas3
  qeSvcUrl: string,                    // API base URL: '/WebAPI' (proxied to Portal)
  studyId: string,                     // Current study/dataset ID
  releaseId: string,                   // Current release ID
  username: string,                    // Current username from authContext
  toggleAtlas: (value, path) => void,  // Navigation callback
  locale: string,                      // Locale (e.g., 'en')
}
```

**Asset & API Flow:**
- Vue MRI loads assets from `/mri/*` → Auth-proxy proxies to Portal `https://localhost:41100/mri/*`
- Vue MRI makes API calls to `/WebAPI/*` → Auth-proxy proxies to Portal with Bearer token

## File Structure

```
src/
├── main.ts                      # Plugin lifecycle exports
├── App.vue                      # Root component
├── components/
│   ├── VueMriLoader.vue         # Loads vue-mri assets
│   └── PluginContainer.vue      # Exposes portalAPI
├── utils/
│   └── scriptLoader.ts          # Dynamic script/CSS loading
└── types/
    └── index.ts                 # TypeScript types
```

## Deployment

### No Additional Configuration Needed!

The plugin uses vue-mri assets served by the Portal backend:
- Portal backend serves `/mri/*` at `https://localhost:41100/mri/*`
- Auth-proxy proxies `/mri/*` → Portal backend
- Plugin fetches assets from `/mri/assets.json`

This means **zero additional deployment configuration** - the plugin works automatically as long as:
1. Auth-proxy can reach the Portal backend (`PORTAL_BACKEND_URL` env var)
2. Portal backend serves vue-mri assets at `/mri/*` (default)

## Troubleshooting

**1. "Failed to load vue-mri assets manifest"**
- Check Portal backend is running: `curl -sk https://localhost:41100/mri/assets.json`
- Verify auth-proxy `PORTAL_BACKEND_URL` is set correctly (default: `https://localhost:4000`)
- Check auth-proxy can reach Portal: auth-proxy logs should show `[MRI] Proxying: /mri/assets.json`
- Try accessing `/mri/assets.json` through auth-proxy in browser

**2. "SAP UI5 not loading"**
- Check network connectivity to openui5.hana.ondemand.com
- Verify browser console for CORS issues
- Check if SAP UI5 CDN is accessible

**3. "Vue MRI not rendering"**
- Open browser console and check for JavaScript errors
- Verify `portalAPI` is exposed on the container element
- Check that all JS/CSS files from assets.json are loading

**4. "Authentication errors"**
- Verify authContext is being passed to the plugin
- Check that `getToken()` returns a valid JWT
- Verify token is being sent with API requests
