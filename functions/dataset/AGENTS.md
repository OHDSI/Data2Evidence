# AGENTS.md

## Overview

Dataset management service handling OMOP CDM dataset operations, schema management, and dataset metadata.

## Tech Stack

- **Framework**: Danet 2.4.3
- **ORM**: TypeORM
- **Validation**: class-validator

## Project Structure

```
dataset/
├── index.ts
├── deno.json
└── src/
    ├── bootstrap.ts
    ├── module.ts
    ├── dataset/
    │   ├── controller.ts
    │   ├── service.ts
    │   ├── entity/
    │   └── dto/
    └── schema/
```

## Key Operations

- Dataset CRUD operations
- OMOP CDM schema management
- Dataset metadata storage
- Access control integration

## Important Files

- `src/dataset/service.ts` - Core dataset operations
- `src/dataset/entity/` - Dataset entities
