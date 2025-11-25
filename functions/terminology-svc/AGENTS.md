# AGENTS.md

## Overview

Medical terminology and vocabulary service. Provides APIs for OMOP concept lookup, concept set management, and vocabulary search across SNOMED, ICD-10, RxNorm, LOINC, and other standard vocabularies.

## Tech Stack

- **Framework**: Danet 2.4.3
- **Database**: PostgreSQL for vocabulary tables
- **Search**: Full-text search on concept names

## Project Structure

```
terminology-svc/
├── index.ts
├── deno.json
└── src/
    ├── bootstrap.ts
    ├── concept/
    │   ├── controller.ts
    │   ├── service.ts
    │   └── entity/
    ├── vocabulary/
    └── concept-set/
```

## Key APIs

- Concept search by name, code, or domain
- Concept relationships and hierarchy
- Concept set CRUD operations
- Vocabulary metadata

## OMOP Vocabulary Tables

- `concept` - All medical concepts
- `concept_relationship` - Concept mappings
- `concept_ancestor` - Hierarchical relationships
- `vocabulary` - Vocabulary metadata
- `domain` - Concept domains

## Important Files

- `src/concept/service.ts` - Concept search logic
- `src/concept-set/service.ts` - Concept set management
