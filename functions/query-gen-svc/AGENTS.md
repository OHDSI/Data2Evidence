# AGENTS.md

## Overview

Query generation service that builds SQL queries from cohort definitions and filter configurations. Supports multiple database dialects (PostgreSQL, DuckDB, HANA).

## Tech Stack

- **Runtime**: Deno with Express
- **SQL Generation**: Custom query builders
- **Dialects**: PostgreSQL, DuckDB, SAP HANA

## Project Structure

```
query-gen-svc/
├── index.ts
├── deno.json
└── src/
    ├── main.ts
    ├── generators/
    │   ├── cohort/
    │   └── filter/
    ├── dialects/
    └── utils/
```

## Key Operations

- Cohort SQL generation from JSON definitions
- Filter query building
- Dialect-specific SQL translation
- Query optimization

## Important Files

- `src/generators/` - SQL generation logic
- `src/dialects/` - Database-specific adaptations
