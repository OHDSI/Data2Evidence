# D2E Plugin Loading Pipeline

How UI plugin configuration flows from `ui/package.json` to the browser.

## Architecture

```
ui/package.json (trex.ui.uiplugins)
    │
    │  Docker volume mount (docker-compose-local.yml)
    │  ./ui/package.json → /usr/src/plugins/d2e-ui/package.json
    ▼
Trex startup → Plugins.initPlugins()
    │
    │  For each name in PLUGINS_SEED:
    │    addPluginPackage(name, force=PLUGINS_SEED_UPDATE)
    ▼
┌─────────────────────────────────────────────────┐
│  Is plugin already in DB? (trex.plugins table)  │
│                                                 │
│  force=true  → Re-read package.json, update DB  │
│  force=false → Use cached DB payload, skip read │
│  not in DB   → Read package.json, insert to DB  │
└─────────────────────────────────────────────────┘
    │
    │  addPlugin() extracts pkg.trex.ui
    ▼
┌──────────────────────────────────────────┐
│  1. Process UI config (routes, plugins)  │
│  2. Merge into global.PLUGINS_JSON       │
│  3. Upsert to trex.plugins table         │
│     (name, url, version, payload JSONB)  │
└──────────────────────────────────────────┘
    │
    │  Served via HTTP endpoints
    ▼
GET /portal/env.js
    → window.ENV_DATA.REACT_APP_PLUGINS = global.PLUGINS_JSON

GET /portal/plugin.json
    → raw JSON of global.PLUGINS_JSON
    │
    ▼
Portal HTML: <script src="%PUBLIC_URL%/env.js">
    → loadPlugins() parses window.ENV_DATA.REACT_APP_PLUGINS
    → MenuNav checks featureFlags + requiredRoles + visible
    → Plugin appears in nav
    → ResearcherStudyPluginRenderer registers it with single-spa
```

## Key Environment Variables

| Variable | Default (local) | Purpose |
|----------|-----------------|---------|
| `PLUGINS_SEED` | `["d2e-flows", "d2e-ui", "d2e-atlas", ...]` | List of plugin package names to install on startup |
| `PLUGINS_SEED_UPDATE` | `true` | When `true`, re-reads package.json and updates DB on every restart. When `false`, uses cached DB entry. |
| `PLUGINS_DEV_PATH` | `"./plugins"` | Directory where plugin packages are volume-mounted |

Source: `docker-compose-local.yml` lines 21-28.

## Database Storage

### Table: `trex.plugins`

```sql
CREATE TABLE IF NOT EXISTS trex.plugins (
  name     VARCHAR(256) PRIMARY KEY,
  url      VARCHAR(1024),
  version  VARCHAR(256),
  payload  JSONB           -- stores the full pkg.trex object
)
```

Migration: `services/trex/core/server/plugin/db/migrations/20250110100000_create_trex_table.ts`

### Upsert on Install

```sql
INSERT INTO trex.plugins (name, url, version, payload)
VALUES ($1, $2, $3, $4)
ON CONFLICT(name) DO UPDATE
SET url = EXCLUDED.url, version = EXCLUDED.version, payload = EXCLUDED.payload
```

For `d2e-ui`, the `payload` column contains the entire `trex` object from `ui/package.json`:
```json
{
  "ui": {
    "routes": [...],
    "uiplugins": {
      "researcher": [...],
      "systemadmin": [...],
      "setup": [...],
      "etl": [...]
    }
  }
}
```

## Startup Flow (Detail)

### 1. Trex starts (`services/trex/core/server/index.ts`)

```
initTrex()
  → KnexMigration runs DB migrations (creates trex.plugins table if needed)
  → Sets up Hono app + routes
  → Plugins.initPlugins(app)
```

### 2. Plugin initialization (`services/trex/core/server/plugin/plugin.ts`)

```typescript
async initPlugins(app) {
  // Path A: Dev mode — scan PLUGINS_DEV_PATH for local plugins
  if (NODE_ENV === 'development') {
    await this.initPluginsDev(app);
  }

  // Path B: Seed — loop through PLUGINS_SEED array
  await this.initPluginsEnv(app);
}

async initPluginsEnv(app) {
  const force = env.PLUGINS_SEED_UPDATE || false;
  for (const name of env.PLUGINS_INIT) {
    await this.addPluginPackage(app, name, force);
  }
}
```

### 3. Per-plugin install (`addPluginPackage`)

```typescript
async addPluginPackage(app, name, force) {
  const _plugin = await this.isInstalled(name);
  // → SELECT name, version, payload::JSON FROM trex.plugins WHERE name = $1

  if (_plugin && !force) {
    // Use cached payload from DB — skip re-reading package.json
    pkg = { name: _plugin.name, version: _plugin.version, trex: _plugin.payload };
  } else {
    // Read package.json from filesystem (volume mount)
    pkg = JSON.parse(await Deno.readTextFile(`${dir}/package.json`));
  }

  await this.addPlugin(app, dir, pkg, name);
}
```

### 4. Plugin registration (`addPlugin`)

```typescript
async addPlugin(app, dir, pkg, name) {
  for (const [key, value] of Object.entries(pkg.trex)) {
    switch (key) {
      case "ui":
        addUIPlugin(app, value, dir);  // → updates global.PLUGINS_JSON
        break;
      case "knex":    // DB migrations
      case "functions": // Deno edge functions
      case "flow":    // Prefect flows
      case "core":    // Core services
        // ... handle other plugin types
    }
  }

  // Persist to database
  await knex('trex.plugins')
    .insert({ name, url, version, payload: JSON.stringify(pkg.trex) })
    .onConflict('name')
    .merge();
}
```

### 5. UI plugin processing (`services/trex/core/server/plugin/ui.ts`)

```typescript
function addUIPlugin(app, value, dir) {
  // Register static file routes
  if (value.routes) {
    for (const route of value.routes) {
      app.get(route.source + '/*', serveStatic({ root: dir + route.target }));
    }
  }

  // Merge UI plugin config into global JSON
  if (value.uiplugins) {
    global.PLUGINS_JSON = updatePluginJson(
      JSON.parse(global.PLUGINS_JSON),
      value.uiplugins
    );
  }
}
```

`updatePluginJson()` merges by role (`researcher`, `systemadmin`, etc.), deduplicates by `route`, and replaces `$$FQDN$$` placeholders with the actual domain.

## Feature Flags

Plugin entries have a `featureFlag` field (e.g., `"conceptSets"`, `"demoTeam"`).

```json
{
  "featureFlag": "demoTeam",
  "defaultEnabled": true
}
```

- `defaultEnabled: true` tells the backend to auto-enable the feature when the system initializes
- The actual flag state is stored in the system portal database and served via `GET /system-portal/feature/list`
- The portal's `useEnabledFeatures()` hook fetches enabled flags and filters plugins accordingly
- If a plugin's `featureFlag` is not in the enabled list, the plugin is hidden

## Plugin Management API

Trex exposes admin endpoints for runtime plugin management:

| Method | Path | Action |
|--------|------|--------|
| `POST` | `/trex/plugins/:name` | Install a new plugin |
| `PUT` | `/trex/plugins/:name` | Update existing plugin (force re-read) |
| `DELETE` | `/trex/plugins/:name` | Remove plugin and refresh |

These endpoints modify the `trex.plugins` table and rebuild `global.PLUGINS_JSON`.

## What Happens When You Add a New Plugin

After adding entries to `ui/package.json`:

1. **Restart Trex** (`npm run stop && npm run start`)
2. Since `PLUGINS_SEED_UPDATE=true` (default in local dev), trex re-reads `ui/package.json`
3. The new plugin entries get upserted into `trex.plugins` (payload JSONB)
4. `global.PLUGINS_JSON` gets rebuilt with the new entries
5. `/portal/env.js` now includes the new plugins
6. Portal picks them up on next page load — no portal rebuild needed
7. Feature flags with `defaultEnabled: true` should auto-register in the system portal

If the new plugins' `lifecycles.js` files aren't built yet, the portal will show them in the nav but single-spa will fail to load them with a module fetch error.

## Memory vs. Database

| Layer | What's Stored | Purpose |
|-------|--------------|---------|
| **DB** (`trex.plugins`) | Full `pkg.trex` payload per plugin | Persistence across restarts, admin API management |
| **Memory** (`global.PLUGINS_JSON`) | Derived UI-only plugin structure | Fast serving to frontend without DB queries |
| **Frontend** (`window.ENV_DATA`) | Same as memory, injected via `env.js` | Browser-side plugin config for the SPA |

The DB is the source of truth. Memory is rebuilt from DB (or fresh package.json if `PLUGINS_SEED_UPDATE=true`) on every startup.
