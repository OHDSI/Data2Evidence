# "Page not found" (Atlas3 sub-plugin)

The page shown at `/atlas/#/plugins/not-found/` when someone opens a portal URL
that doesn't exist (issue #2261). It lives in Atlas3, not the portal, so it gets
the Atlas3 header like every other page. The portal sends unknown routes here
(`plugins/ui/apps/portal/src/utils/notFound.ts`).

- Registered in `plugins/atlas/plugins.standalone.json` with `"menuItems": []`,
  so it has a route but no navigation entry.
- "Return to homepage" goes to the landing route `landing-redirect.js`
  publishes, which is the Data Sources list today.
- The text lives in `src/copy.ts`; the UX copy isn't final yet.

## Develop

No GitHub Packages token is needed; every dependency is on the public registry.

```sh
cd plugins/atlas/subplugins/not-found
npm install
npm test
npm run typecheck
npm run build   # dist/index.system.js + dist/style.css
```

## Testing in TREX

Atlas loads the built bundle from `/atlas/plugins/not-found/index.system.js`,
staged by `plugins/atlas/scripts/postinstall.js`. From the repository root,
`./scripts/build-atlas.sh` builds this package along with the rest of the
Atlas plugin.
