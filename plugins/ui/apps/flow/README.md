# Dataflow UI

A single-spa micro-frontend for building and managing ETL dataflows in Data2Evidence.

## Local Development

The plugin runs as a standalone single-spa module that mounts into the host portal at runtime. The following steps swap the deployed module for your local build so changes are reflected without rebuilding the host.

### Prerequisites

- Node.js and `npm` installed
- The D2E portal running locally (see the root `README.md`)
- Google Chrome (Chromium-based browsers expose the single-spa devtools panel used below)

### Steps

1. **Start the local dev server**

   From `plugins/ui/apps/flow/`:

   ```bash
   npm run dev
   ```

   This serves the single-spa lifecycle bundle at:

   ```
   https://localhost:8083/lifecycles.js
   ```

2. **Enable the single-spa devtools**

   In the portal tab, open Chrome DevTools → **Application** → **Local Storage**, and add the following entry for the portal origin:

   | Key        | Value  |
   | ---------- | ------ |
   | `devtools` | `true` |

3. **Mount the local module**

   A floating `{...}` button appears in the bottom-right of the portal once devtools are enabled. Click it, locate the `flow` module, and override its URL with the local lifecycle bundle from step 1.

4. **Reload**

   Refresh the page. The portal will now load the Dataflow UI from your local dev server, with hot module replacement enabled.

## Troubleshooting

- **`{...}` button does not appear** — verify the `devtools` key is set on the portal's origin (not on `localhost:8083`) and reload the page.
- **Mixed-content or certificate errors** — the dev server uses HTTPS with a self-signed certificate; open `https://localhost:8083/lifecycles.js` directly and accept the certificate before mounting.
- **Stale bundle after override** — clear the override in the single-spa devtools panel and re-mount, or hard-reload the page (`Cmd+Shift+R` / `Ctrl+Shift+R`).
