# AGENTS.md

## Overview

Main researcher portal backend service. Handles datasets, studies, users, notebooks, configurations, and git integration. Uses Danet framework with TypeORM.

## Tech Stack

- **Framework**: Danet 2.4.3
- **ORM**: TypeORM with TypeORM-extension
- **Auth**: JWT (jsonwebtoken 9.x)
- **Git**: isomorphic-git for repository operations
- **Validation**: class-validator, Zod

## Commands

```bash
# Run service (from d2e root)
npm run start

# Type check
deno check index.ts

# Run tests
deno test --allow-all src/**/*.test.ts
```

## Project Structure

```
portal/
├── index.ts                    # Entry point
├── deno.json                   # Dependencies
└── src/
    ├── bootstrap.ts            # App initialization
    ├── module.ts               # Root module
    ├── init/                   # Initialization service
    ├── dataset/                # Dataset management
    │   ├── controller.ts
    │   ├── service.ts
    │   ├── entity/
    │   └── dto/
    ├── study/                  # Study management
    ├── user/                   # User management
    ├── notebook/               # Notebook CRUD
    ├── config/                 # Configuration
    ├── feature/                # Feature flags
    ├── user-artifact/          # User artifacts (bookmarks, etc.)
    └── common/
        └── data-source/        # Database connections
```

## Key Domains

- **Dataset**: OMOP CDM dataset management
- **Study**: Research study configuration
- **Notebook**: Jupyter notebook storage
- **Config**: System configuration
- **Feature**: Feature flag management
- **User-Artifact**: User bookmarks, saved queries

## Code Patterns

### Module Registration

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([DatasetEntity])],
  controllers: [DatasetController],
  injectables: [DatasetService],
})
export class DatasetModule {}
```

### Repository Injection

```typescript
@Injectable()
export class DatasetService {
  constructor(
    @InjectRepository(DatasetEntity)
    private readonly repository: Repository<DatasetEntity>
  ) {}
}
```

## Important Files

- `src/bootstrap.ts` - Application bootstrap and middleware setup
- `src/module.ts` - Root module with all domain imports
- `src/common/data-source/` - Database connection configuration
- `src/init/` - Service initialization on startup
