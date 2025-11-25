# AGENTS.md

## Overview

Main researcher and admin portal. React 18 application providing dataset management, user administration, study configuration, and plugin hosting.

## Tech Stack

- **Framework**: React 18.2
- **Build**: Create React App (react-scripts 5.0)
- **UI**: Material-UI 5.x, Bootstrap 5
- **Auth**: @axa-fr/react-oidc (OpenID Connect)
- **Charts**: ECharts 5.4
- **Editor**: Monaco Editor

## Commands

```bash
npm start              # Development server
npm run build          # Production build
npm run build-mri      # Build MRI component
npm run lint           # Type check + prettier + eslint
npm test               # Run tests
```

## Project Structure

```
portal/
├── src/
│   ├── components/    # React components
│   ├── contexts/      # React contexts
│   ├── hooks/         # Custom hooks
│   ├── plugins/       # Plugin definitions
│   │   ├── researcher/
│   │   ├── setup/
│   │   └── admin/
│   ├── services/      # API services
│   └── types/         # TypeScript types
├── public/
└── package.json
```

## Plugin Categories

- **Researcher**: Concepts, Cohorts, Notebooks, Analysis
- **Setup**: Databases, Git Config, Feature Flags
- **Admin**: Users, Datasets, Studies, Jobs, ETL

## Key Dependencies

- `@mui/material` - Material Design components
- `@axa-fr/react-oidc` - OIDC authentication
- `echarts-for-react` - Charts
- `@monaco-editor/react` - Code editor
- `material-react-table` - Data tables

## Important Files

- `src/plugins/` - Plugin definitions and routes
- `src/contexts/` - Auth and app state contexts
- `src/services/` - API communication layer
