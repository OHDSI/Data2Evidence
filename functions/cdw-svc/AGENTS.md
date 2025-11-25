# AGENTS.md

## Overview

Clinical Data Warehouse service providing database access layer for OMOP CDM data. Handles multi-tenant database connections and SQL query execution.

## Tech Stack

- **Runtime**: Deno with Express
- **Database**: PostgreSQL, DuckDB, SAP HANA
- **Security**: JWT validation, database credentials encryption

## Project Structure

```
cdw-svc/
├── index.ts
├── deno.json
└── src/
    ├── main.ts
    ├── connection/
    ├── query/
    └── utils/
```

## Key Operations

- Database connection management
- Multi-tenant database routing
- SQL query execution
- Result streaming for large datasets

## Important Files

- `src/main.ts` - Express app setup
- `src/connection/` - Database connection pooling
