# AGENTS.md

## Overview

Data mapping interface for ETL field mapping. React application with Vite for defining source-to-target field transformations.

## Tech Stack

- **Framework**: React
- **Build**: Vite 5.x
- **UI**: Portal components

## Commands

```bash
npm start              # Vite dev server
npm run build          # Production build
npm run build:dev      # Development build
npm run build:watch    # Watch mode
npm run lint           # ESLint
```

## Project Structure

```
mapping/
├── src/
│   ├── components/    # React components
│   ├── services/      # API services
│   └── types/         # TypeScript types
├── vite.config.ts
└── package.json
```

## Key Features

- Source-to-target field mapping
- Transformation rules
- Mapping validation
- Export to dataflow

## Important Files

- `src/components/` - Mapping UI components
- `vite.config.ts` - Vite configuration
