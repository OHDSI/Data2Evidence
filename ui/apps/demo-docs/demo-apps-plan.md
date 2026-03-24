# Plan: Single-SPA Demo Apps in D2E

## Context

The knowledge-sharing presentation needs a live demo. Instead of a standalone repo, we'll create demo micro-frontend apps **inside** the existing D2E `ui/apps/` directory on a new branch. This leverages the existing portal infrastructure (SystemJS, import-map-overrides, shared deps, plugin registry) — zero boilerplate needed.

## Branch & Location

- **Repo**: `repos/Data2Evidence/`
- **Branch**: `jerome-ng/single-spa-knowledge-sharing` (off `develop`)
- **Apps location**: `ui/apps/demo-team/`, `ui/apps/demo-projects/`, `ui/apps/demo-notifications/`
- **Plugin config**: Add entries to `ui/package.json` under `trex.ui.uiplugins.researcher`

## What We Create (3 apps, ~15 files each)

### App 1: `demo-team` — Route-based micro-frontend (`/demo-team`)
- Simplest possible app — shows a team member list
- Receives `datasetId` via props and displays it prominently
- Listens for `"custom-props-changed"` to update when user switches dataset
- **Demonstrates**: lifecycle exports, prop passing, runtime prop updates

### App 2: `demo-projects` — Route-based micro-frontend (`/demo-projects`)
- Shows a project list
- Has a **"Send Notification"** button that dispatches `"demo-notification-open"` CustomEvent
- Also receives and displays `datasetId`
- **Demonstrates**: cross-app communication (same as Wizards → Terminology drawer)

### App 3: `demo-notifications` — Always-mounted (`autoMount: true`, `/demo-notifications`)
- Main notifications page only visible at `/demo-notifications` route
- `NotificationDrawer` component is **always active** — listens for `"demo-notification-open"` event
- Drawer renders via `ReactDOM.createPortal(jsx, document.body)` to escape `display: none` container
- **Demonstrates**: autoMount pattern, route-change listener, cross-app drawer (= Concept Sets' TerminologyWithEventListener)

## Directory Structure Per App

Following concept-sets as the reference pattern:

```
ui/apps/demo-team/
├── package.json
├── tsconfig.json
├── vite.config.ts              # formats: ["system"], port 8201
├── index.html                  # Dev server entry
└── src/
    ├── index.tsx               # Dev server standalone entry
    ├── lifecycles.tsx           # single-spa-react lifecycle exports
    ├── App.tsx                  # custom-props-changed + route-change listeners
    ├── TeamPage.tsx             # UI content
    └── types.ts                # PortalProps interface

ui/apps/demo-projects/
├── package.json
├── tsconfig.json
├── vite.config.ts              # port 8202
├── index.html
└── src/
    ├── index.tsx
    ├── lifecycles.tsx
    ├── App.tsx
    ├── ProjectsPage.tsx        # Has "Send Notification" button
    └── types.ts

ui/apps/demo-notifications/
├── package.json
├── tsconfig.json
├── vite.config.ts              # port 8203
├── index.html
└── src/
    ├── index.tsx
    ├── lifecycles.tsx
    ├── App.tsx                 # autoMount-aware, route-conditional rendering
    ├── NotificationsPage.tsx   # Main content (route-only)
    ├── NotificationDrawer.tsx  # Always-active listener + createPortal
    └── types.ts
```

## Key Files & Patterns (with D2E source mapping)

### `lifecycles.tsx` (all 3 apps — identical pattern)
Copies the exact pattern from `concept-sets/src/lifecycles.tsx`:
```typescript
import singleSpaReact from "single-spa-react";
const lifecycles = singleSpaReact({
  React, ReactDOMClient,
  rootComponent: (props) => <App {...props} />,
  errorBoundary: (err) => <div>Error</div>,
  domElementGetter: (props) => document.getElementById(props.containerId),
});
export const { bootstrap, mount, unmount } = lifecycles;
```

### `App.tsx` (all 3 apps — same event listener pattern)
Copies the exact pattern from `concept-sets/src/App.tsx`:
- `useState` for `customProps`, listens for `"custom-props-changed"`, filters by `appId`
- `useMemo` to merge `props` + `customProps`
- For demo-notifications only: also listens for `"route-change"` to toggle `isActiveRoute`

### `vite.config.ts` (all 3 apps — identical pattern)
Copies from `concept-sets/vite.config.ts`:
- `cssInjectedByJsPlugin()` + `react()` + `basicSsl()`
- `lib.entry: "src/lifecycles.tsx"`, `formats: ["system"]`
- Production output: `../../resources/demo-team/lifecycles.js`
- Unique port per app (8201, 8202, 8203)

### `NotificationDrawer.tsx` (demo-notifications only)
Mirrors `concept-sets/src/Terminology/TerminologyWithEventListener.tsx`:
- Listens for `"demo-notification-open"` CustomEvent
- Opens a slide-in panel via `ReactDOM.createPortal(jsx, document.body)`
- Accepts callback in event payload: `onClose`, `onAction`

### Plugin config additions to `ui/package.json`
Under `trex.ui.uiplugins.researcher`, add 3 entries:
```json
{
  "visible": true,
  "type": "app",
  "autoMount": false,
  "featureFlag": "demoTeam",
  "defaultEnabled": true,
  "name": "Demo Team",
  "pluginPath": "/resources/demo-team/lifecycles.js",
  "requiredRoles": ["RESEARCHER"],
  "route": "demo-team"
},
{
  "visible": true,
  "type": "app",
  "autoMount": false,
  "featureFlag": "demoProjects",
  "defaultEnabled": true,
  "name": "Demo Projects",
  "pluginPath": "/resources/demo-projects/lifecycles.js",
  "requiredRoles": ["RESEARCHER"],
  "route": "demo-projects"
},
{
  "visible": true,
  "type": "app",
  "autoMount": true,
  "featureFlag": "demoNotifications",
  "defaultEnabled": true,
  "name": "Demo Notifications",
  "pluginPath": "/resources/demo-notifications/lifecycles.js",
  "requiredRoles": ["RESEARCHER"],
  "route": "demo-notifications"
}
```

Also add routes for static file serving:
```json
{ "source": "/resources/demo-team", "target": "/resources/demo-team" },
{ "source": "/resources/demo-projects", "target": "/resources/demo-projects" },
{ "source": "/resources/demo-notifications", "target": "/resources/demo-notifications" }
```

## Dependencies (minimal — wizards-style)

Each app gets only what's needed:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "single-spa": "^6.0.3",
    "single-spa-react": "^6.0.2"
  },
  "devDependencies": {
    "vite": "^5.3.1",
    "vite-plugin-css-injected-by-js": "^3.5.1",
    "@vitejs/plugin-react": "^4.3.1",
    "@vitejs/plugin-basic-ssl": "^1.1.0",
    "typescript": "^5.2.2"
  }
}
```

No MUI, no axios, no `@portal/components`. Pure React + inline styles for maximum simplicity and zero build dependencies on shared libs.

## Implementation Steps

1. **Create branch** `jerome-ng/single-spa-knowledge-sharing` from `develop` in `repos/Data2Evidence/`
2. **Create `demo-team`** — the simplest app first (team list + datasetId display)
3. **Create `demo-projects`** — adds cross-app event dispatch button
4. **Create `demo-notifications`** — autoMount + drawer with createPortal
5. **Update `ui/package.json`** — add plugin config entries + routes
6. **Build all 3 apps** — `cd ui/apps/demo-team && npx vite build` (repeat for each)
7. **Test** — start D2E, navigate to each demo app, verify all patterns work

## Live Demo Script (for presentation)

1. Open D2E portal → Researcher → select Demo dataset
2. Click **"Demo Team"** in nav → shows team list with "Alpha Hospital" dataset badge
3. Click **"Demo Projects"** → Team hides (display:none), Projects loads
4. **Switch dataset** to another → Projects updates immediately (CustomEvent prop update)
5. Click **"Demo Team"** again → still shows the new dataset (received update while hidden)
6. On Projects page, click **"Send Notification"** → drawer slides in from right (cross-app event)
7. Navigate to **"Demo Notifications"** → main page appears, drawer still works
8. Open DevTools → `localStorage.setItem("devtools", "true")` → reload → show import-map-overrides widget
9. Override `demo-team` URL to localhost:8201 → run local vite dev server → show local code changes in deployed app

## Verification

- All 3 apps build successfully with `npx vite build`
- Apps appear in portal nav under Researcher
- Route navigation mounts/unmounts correctly
- Dataset switch propagates to all apps
- "Send Notification" button opens drawer from demo-projects route
- demo-notifications drawer works on ALL routes (autoMount)
- import-map-overrides can override each app's URL
- No "multiple React instances" console errors
