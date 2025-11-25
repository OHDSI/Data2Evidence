# AGENTS.md

## Overview

TypeScript/Deno microservices layer providing business logic APIs. Uses Danet framework (similar to NestJS) with dependency injection, decorators, and TypeORM for database access.

## Tech Stack

- **Runtime**: Deno (latest)
- **Framework**: Danet 2.4.3 (NestJS-like for Deno)
- **ORM**: TypeORM via @danet/typeorm
- **Validation**: class-validator, class-transformer, Zod
- **HTTP**: Express 4.18
- **Logging**: Winston 3.x
- **Auth**: jsonwebtoken 9.x

## Commands

```bash
# Build all functions (from d2e root)
npm run build

# Run tests (per service)
deno test --allow-all

# Type check
deno check index.ts
```

## Project Structure

```
functions/
├── _shared/                    # Shared utilities
│   ├── alp-base-utils/        # DB connections, logging, security
│   └── alp-config-utils/      # Configuration utilities
├── portal/                     # Main portal backend
├── analytics-svc/             # Data analytics APIs
├── cdw-svc/                   # Clinical data warehouse
├── dataset/                   # Dataset management
├── terminology-svc/           # Vocabulary/concept APIs
├── query-gen-svc/            # Query generation
└── [service]/
    ├── index.ts               # Entry point
    ├── deno.json              # Dependencies
    └── src/
        ├── bootstrap.ts       # App initialization
        ├── module.ts          # Root module
        └── [domain]/
            ├── controller.ts
            ├── service.ts
            ├── entity/
            └── dto/
```

## Code Style

### Service Entry Point

```typescript
// index.ts
import 'reflect-metadata';
import { bootstrap } from "./src/bootstrap.ts";

const application = await bootstrap();
await application.listen(Number(Deno.env.get("PORT") || 3000));
```

### Controller Pattern

```typescript
import { Controller, Get, Post, Body, Param } from "@danet/core";
import { MyService } from "./service.ts";
import { CreateDto } from "./dto/create.dto.ts";

@Controller('/api/resource')
export class MyController {
  constructor(private readonly service: MyService) {}

  @Get('/')
  async findAll() {
    return this.service.findAll();
  }

  @Get('/:id')
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post('/')
  async create(@Body() dto: CreateDto) {
    return this.service.create(dto);
  }
}
```

### Service Pattern

```typescript
import { Injectable } from "@danet/core";
import { Repository } from "typeorm";
import { InjectRepository } from "@danet/typeorm";
import { MyEntity } from "./entity/my-entity.ts";

@Injectable()
export class MyService {
  constructor(
    @InjectRepository(MyEntity)
    private readonly repository: Repository<MyEntity>
  ) {}

  async findAll() {
    return this.repository.find();
  }

  async findById(id: string) {
    return this.repository.findOne({ where: { id } });
  }
}
```

### Entity Pattern

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity('table_name')
export class MyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

### DTO with Validation

```typescript
import { IsString, IsOptional, IsUUID } from "class-validator";

export class CreateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
```

## Dependencies (deno.json)

```json
{
  "imports": {
    "@danet/core": "jsr:@danet/core@2.4.3",
    "@danet/typeorm": "jsr:@danet/typeorm@0.1.1",
    "class-validator": "npm:class-validator@0.14.1",
    "class-transformer": "npm:class-transformer@0.5.1",
    "express": "npm:express@^4.18",
    "winston": "npm:winston@^3.7.2",
    "zod": "npm:zod@3.25.76"
  }
}
```

## Shared Utilities

Import from `_shared/`:

```typescript
import { Logger } from "../_shared/alp-base-utils/src/Logger.ts";
import { PostgresConnection } from "../_shared/alp-base-utils/src/PostgresConnection.ts";
import { EnvVarUtils } from "../_shared/alp-base-utils/src/EnvVarUtils.ts";
```

## Service Registration

Services are registered in `functions/package.json` under `trex.functions`:

```json
{
  "trex": {
    "functions": {
      "api": [
        {
          "source": "/api/portal",
          "function": "/portal",
          "imports": "/portal/deno.json",
          "env": "portal"
        }
      ]
    }
  }
}
```

## Important Files

- `package.json` - Service registration (`trex.functions`)
- `_shared/alp-base-utils/` - Database connections, security, logging
- `_shared/alp-config-utils/` - Configuration utilities
- `[service]/deno.json` - Per-service dependencies
- `[service]/src/bootstrap.ts` - Application bootstrap
