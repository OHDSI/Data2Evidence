# Wizards Single-SPA App

A micro-frontend application for guided, step-by-step workflows for creating cohorts and analyses in Data2Evidence (D2E).

## Overview

The Wizards app provides template-based cohort creation with a 4-step guided workflow:

1. Wizard Selection - Choose analysis type
2. Introduction - Review wizard details
3. Form Entry - Configure parameters
4. Results - View summary and deep links

## Tech Stack

- React 18
- TypeScript
- Single-SPA (micro-frontend framework)
- Vite (build tool)
- React Hook Form (form management)

## Development

### Prerequisites

- Node.js 18+
- bun

### Local Development

```bash
# Install dependencies
bun install

# Start development server (port 8084)
bun start

# Build for production
bun run build

# Build for development
bun run build:dev

# Lint code
bun run lint

# Format code
bun run format

# Test
bun run test
```

### Local Testing with Portal

1. Start the wizards dev server: `bun start`
2. Use import-map-overrides browser extension to point to localhost:8084
3. Access via portal at `/researcher/wizards`

## Build Output

- **Development**: `dist/lifecycles.js`
- **Production**: `../../resources/wizards/lifecycles.js`

## Portal Integration

The app is registered in the portal via `REACT_APP_PLUGINS` configuration:

```json
{
  "enabled": true,
  "type": "app",
  "featureFlag": "wizards",
  "name": "Wizards",
  "pluginPath": "/resources/wizards/lifecycles.js",
  "requiredRoles": ["RESEARCHER"],
  "route": "wizards"
}
```

## Directory Structure

```
wizards/
├── src/
│   ├── lifecycles.tsx      # Single-SPA entry point
│   ├── App.tsx             # Root component
│   ├── context/            # React Context for state
│   ├── components/         # UI components
│   ├── config/             # Wizard definitions
│   ├── types/              # TypeScript types
│   └── utils/              # Helper functions
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies
```

## Architecture

- **Single-SPA Integration**: Exports bootstrap, mount, unmount lifecycle functions
- **State Management**: React Context API
- **Form Handling**: React Hook Form
- **Authentication**: Handled by portal (OIDC)
- **Authorization**: RESEARCHER role required

## Related Documentation

- [PRD: Wizards Single-SPA App](docs/projects/2026-01-19_1633_cohort-explorer-scenarios/1633-prd.md)
- [Implementation Plan](docs/projects/2026-01-19_1633_cohort-explorer-scenarios/plan-implementation.md)
