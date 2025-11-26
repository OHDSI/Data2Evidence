# Import Map Overrides for Micro-Frontends

This portal supports **import-map-overrides**, allowing you to override micro-frontend module URLs during development. This is particularly useful for:

- Testing local changes to notebook-ui or analysis-ui without rebuilding the portal
- Debugging single-spa applications in isolation
- Overriding shared dependencies like `@data2evidence/d2e-starboard-wrap`

## Quick Start

### 1. Enable the Dev Tools UI

Open your browser console and run:

```javascript
localStorage.setItem("devtools", "true");
window.location.reload();
```

This will display the import-map-overrides UI in the bottom-right corner of the portal.

**Note:** Navigate to the Researcher section (`/researcher`) to see the import map populated with single-spa applications. The import map is initialized when the Researcher component mounts.

### 2. Override a Micro-Frontend

1. Click the import-map-overrides UI button in the bottom-right
2. Add a new override:
   - **Module Name**: `/resources/notebook-ui-lite/lifecycles.js`
   - **Override URL**: `http://localhost:8084/lifecycles.js`
3. Click "Apply"
4. **IMPORTANT: Reload the page** (Cmd+R or Ctrl+R) for changes to take effect

## CORS Considerations

Your local dev servers must allow CORS requests from the portal origin. Most Vite/webpack dev servers do this automatically, but if you encounter issues:

**Vite (vite.config.ts):**

```typescript
export default defineConfig({
  server: {
    cors: true,
    // Or specify origin
    headers: {
      "Access-Control-Allow-Origin": "https://localhost:41100",
    },
  },
});
```

### SystemJS 0.21.6 Compatibility

Since SystemJS 0.21.6 doesn't support native import maps, we manually check `window.importMapOverrides` in two places:

- `src/plugins/core/pluginLoader.ts` - When loading plugin modules for type detection
- `src/singleSpa/singleSpaRegistry.ts` - When single-spa bootstraps applications

This approach works seamlessly with SystemJS 0.21.6 without requiring an upgrade to 6.x.
