# AGENTS.md

## Overview

Data analytics service providing APIs for patient analytics, cohort analysis, data characterization, and OMOP CDM queries. Handles database credential management and query execution.

## Tech Stack

- **Runtime**: Deno with Express
- **Database**: PostgreSQL (pg), DuckDB (duckdb-async), SAP HANA (hdb)
- **Compression**: pako, JSZip
- **Data**: parquetjs, csv-write-stream
- **Validation**: Zod, express-validator

## Commands

```bash
# Type check
deno check index.ts

# Run tests
deno test --allow-all src/**/*.test.ts
```

## Project Structure

```
analytics-svc/
├── index.ts                    # Entry point
├── deno.json                   # Dependencies
└── src/
    ├── main.ts                 # Express app setup
    ├── env.ts                  # Environment config
    ├── types.ts                # Type definitions
    ├── api/
    │   └── controllers/        # API endpoints
    │       ├── patient.ts      # Patient queries
    │       ├── cohort.ts       # Cohort operations
    │       ├── population.ts   # Population analytics
    │       └── dataCharacterization.ts
    ├── mri/
    │   └── endpoint/           # MRI query endpoints
    ├── qe/                     # Query engine
    │   └── settings/
    ├── dao/                    # Data access objects
    │   └── DBDAO.ts
    ├── utils/
    │   ├── DuckdbConnection.ts
    │   ├── QueryGenSvcProxy.ts
    │   └── cachedb/
    ├── ifr-to-extcohort/       # IFR to cohort conversion
    └── terminology/            # Concept handling
```

## Key APIs

- `/api/patient/*` - Patient-level queries
- `/api/cohort/*` - Cohort definition and analysis
- `/api/population/*` - Population-level analytics
- `/api/dataCharacterization/*` - Data profiling
- `/api/values/*` - Domain value lookups

## Code Patterns

### Express Controller

```typescript
import express from "express";
import { Request, Response } from "express";

const router = express.Router();

router.get('/patients/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await patientService.findById(id);
  res.json(result);
});

export default router;
```

### Database Connection

```typescript
import { DuckdbConnection } from "./utils/DuckdbConnection.ts";

const conn = new DuckdbConnection(connectionString);
const result = await conn.query(sql, params);
```

## Shared Dependencies

Uses shared utilities from `_shared/`:
- `alp-base-utils` - Database connections, logging
- `alp-config-utils` - MRI configuration

## Important Files

- `src/main.ts` - Express app and route registration
- `src/dao/DBDAO.ts` - Main database access object
- `src/utils/DuckdbConnection.ts` - DuckDB connection wrapper
- `src/mri/endpoint/` - Patient analytics endpoints
