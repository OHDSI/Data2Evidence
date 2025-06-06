# Query Filter Models

This folder contains TypeScript models, types, and data transformation utilities.

## Files

- **QueryFilterModel.ts** - Core data models and classes for query filters
  - `QueryFilterCardModel` - Main filter card model
  - `QueryFilterCondition` - Condition model
  - `QueryFilterChip` - Chip data model
  - `QueryFilterManager` - Manager class for filter operations

- **AtlasCohortDefinition.ts** - Type definitions for OHDSI Atlas cohort format
  - Interfaces for Atlas cohort JSON structure
  - Type definitions for various Atlas criteria

- **AtlasCohortAdapter.ts** - Adapter for converting between UI models and Atlas format
  - Conversion utilities
  - Mapping functions

## Usage

```typescript
import { QueryFilterCardModel, QueryFilterManager } from '../models/QueryFilterModel'
import { AtlasCohortDefinition } from '../models/AtlasCohortDefinition'
```