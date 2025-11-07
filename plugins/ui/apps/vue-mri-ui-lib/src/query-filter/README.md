# Query Filter - OHDSI Atlas Cohort Builder

Visual interface for building OHDSI Atlas-compatible cohort definitions with full bidirectional JSON conversion.

## Architecture

### Core Components

**QueryFilterModern.vue**: Main orchestrator

- Loads/saves Atlas JSON
- Manages concept set resolution (async loading in batches of 10)
- Coordinates terminology modal via `alp-terminology-open` event
- Location: `components/QueryFilterModern.vue`

**QueryFilterEntryExit.vue**: Entry/Exit criteria editor

- Handles primary (entry) and censoring (exit) events
- Supports 3 exit strategies: CONT_OBS, FIXED duration, CONT_DRUG
- Manages observation period (priorDays, postDays)
- Location: `components/QueryFilterEntryExit.vue`

**QueryFilterCriteria.vue**: Inclusion criteria container

- Manages multiple criteria groups
- Controls qualifying events limit (ALL | EARLIEST | LATEST)
- Location: `components/QueryFilterCriteria.vue`

**QueryFilterCriteriaGroup.vue**: Individual criteria group

- Supports group logic: ALL, ANY, AT_LEAST, AT_MOST (with count)
- Contains medical events and demographic criteria
- Supports nested groups (unlimited depth)
- Location: `components/QueryFilterCriteriaGroup.vue`

**QueryFilterEventCard.vue**: Modern event editor

- Full-featured: concept sets, cardinality, attributes, temporal windows
- Supports all OHDSI criteria types (Condition, Drug, Procedure, etc.)
- Location: `components/QueryFilterEventCard.vue`

**QueryFilterNestedCriteria.vue**: Recursive nested logic

- Renders `CorrelatedCriteria` and nested groups
- Supports arbitrary nesting depth
- Includes Type (ALL/ANY/AT_LEAST/AT_MOST) and optional Count
- Location: `components/QueryFilterNestedCriteria.vue`

**Supporting Components**:

- **CriteriaSelectorDropdown.vue**: Event type picker with icons
- **AttributesDropdown.vue**: Attribute selector (multi-select)
- **CardinalitySidebar.vue**: Cardinality editor (type, count, using)
- **GroupCriteriaSidebar.vue**: Group type/count editor
- **TemporalRelationshipSection.vue**: Start/end window editor
- **ObservationPeriodBlock.vue**: Prior/post days editor

### Core Models & Utilities

**QueryFilterModel.ts** (QueryFilterCriteriaManager class):

- State management for hierarchical criteria
- Methods: `getCriteria()`, `addCriteria()`, `updatePrimaryEvents()`, `convertToAtlasFormat()`
- Handles concept set collection (including CONT_DRUG)
- Bidirectional Atlas JSON conversion
- Location: `models/QueryFilterModel.ts`

**AtlasConverter.ts**:

- Import: Atlas JSON → Internal UI model
- Main function: `convertAtlasToFilters(atlasJson, availableConceptSets)`
- Recursive: `convertCriteriaListToEvents()` handles CorrelatedCriteria
- Supports groups via `convertGroupCriteriaToGroupEvents()` (unlimited depth)
- Location: `utils/AtlasConverter.ts`

**Nested Criteria Processor** (`models/modules/nested-criteria-processor.ts`):

- Export functions: `buildNestedCriteriaFromAttributes()`, `processNestedGroups()`
- Creates CorrelatedCriteria with Type/Count
- Handles recursive Groups with proper structure

**Type Guards** (`models/modules/type-guards.ts`):

- `isNestedAttribute()`, `isNumericRangeAttribute()`, `isDateRangeAttribute()`
- Type-safe attribute handling

**Atlas Mappers** (`models/modules/atlas-mappers.ts`):

- Operator conversion: `GREATER_THAN` ⟷ `gt`, `LESS_THAN` ⟷ `lt`, etc.
- Cardinality mapping: `AT_LEAST` ⟷ `0`, `EXACTLY` ⟷ `2`, etc.
- Criteria type mapping

## Data Flow

### Import (Atlas JSON → UI)

1. **Load Atlas JSON**: `loadAtlasCohortDefinition(atlasJson)` in QueryFilterModern
2. **Extract Concept Sets**: Parse `ConceptSets` array, extract IDs from criteria
3. **Resolve Concept Sets**: Fetch/create via WebAPI
4. **Convert**: `convertAtlasToFilters(atlasJson, conceptSets)` → AtlasConverter.ts
   - `PrimaryCriteria` → `entryEvents`
   - `InclusionRules` → `inclusionCriteria` (with Groups support)
   - `CensoringCriteria` + `EndStrategy` → `exitEvents`
   - Recursively process `CorrelatedCriteria` and nested Groups
5. **Normalize**: Convert `{Op, Value, Extent}` → `{operator, value, extent}`
6. **Load Details**: Async load concept details (batches of 10)
7. **Render**: Update UI components

**Key Files**:

- `utils/AtlasConverter.ts` - Main conversion
- `utils/QueryFilterModern/loadAtlasCohortDefinition.ts` - Orchestration
- `utils/QueryFilterModern/loadConceptSets.ts` - Concept set resolution

### Export (UI → Atlas JSON)

1. **User clicks Save**: `saveAtlasCohort()` in QueryFilterModern
2. **Convert**: `criteriaManager.convertToAtlasFormat()` → QueryFilterModel.ts
   - Collect concept sets (including nested, CONT_DRUG)
   - Build ID mappings (system ID → Atlas sequential ID)
   - Convert `entryEvents` → `PrimaryCriteria`
   - Convert `inclusionCriteria` → `InclusionRules` (with Groups)
   - Convert `exitEvents` → `CensoringCriteria` + `EndStrategy`
3. **Denormalize**: Convert `{operator, value, extent}` → `{Op, Value, Extent}`
4. **Add Metadata**: User, timestamps
5. **Persist**: Vuex action → WebAPI

**Key Files**:

- `models/QueryFilterModel.ts` - `convertToAtlasFormat()` method
- `models/modules/nested-criteria-processor.ts` - Nested criteria export
- `models/modules/event-transformer.ts` - Event transformations

## Type System

### Discriminated Union (QueryFilterAttribute)

**Two-level discrimination**:

1. `attributeType: 'nested' | 'standard'`
2. For `'standard'`: `configType: 'numericRange' | 'conceptSet' | 'concept' | 'dateRange' | 'dateAdjustment' | 'text' | 'boolean'`

**Examples**:

```typescript
// Numeric range (Age)
{
  attributeId: 'age',
  attributeType: 'standard',
  configType: 'numericRange',
  operator: 'BETWEEN',
  value: '18',
  extent: '65'
}

// Nested criteria
{
  attributeType: 'nested',
  nestedCriteria: {
    criteriaType: 'ALL',
    criteriaCount: 2,
    events: [ /* recursive events */ ]
  }
}
```

**Location**: `types/QueryFilterTypes.ts`

## Critical Implementation Patterns

### 1. Cardinality Count (⚠️ CRITICAL)

**Use `??` not `||`** - JavaScript treats `0` as falsy

```typescript
// ✅ CORRECT
Count: event.cardinality?.count ?? 1

// ❌ WRONG (converts 0 → 1)
Count: event.cardinality?.count || 1
```

**Locations**: AtlasConverter.ts:338, nested-criteria-processor.ts:111/277/514, QueryFilterModel.ts:408

**Why**: "Exactly 0" and "At most 0" are valid exclusion criteria

### 2. Preserve nestedCriteria

Always preserve `nestedCriteria` when transforming events

```typescript
...(event.nestedCriteria && {
  nestedCriteria: {
    ...event.nestedCriteria,
    events: transformEvents(event.nestedCriteria.events || [])
  }
})
```

**Location**: `models/modules/event-transformer.ts:30-36`

### 3. Group Export Pattern

Collect ALL events FIRST, then create ONE GroupCriteria

```typescript
// ✅ CORRECT
const criteriaList: CriteriaGroup[] = []
groupEvent.nestedCriteria.events.forEach(e => criteriaList.push(...))
groupsList.push({ Type: 'ALL', CriteriaList: criteriaList })

// ❌ WRONG (splits one group into N groups)
groupEvent.nestedCriteria.events.forEach(e =>
  groupsList.push({ CriteriaList: [e] })
)
```

**Location**: `models/modules/nested-criteria-processor.ts:77-240`

### 4. Component State Init

Initialize local refs from props via `onMounted` + watchers (props load async)

**Location**: `components/QueryFilterEntryExit.vue:172-230`

## Development

### Setup

```bash
# Mock server (built app + mock APIs)
npm run build:mock && npm run start:mock  # http://localhost:3131

# Dev server (hot reload)
cd src/query-filter/mock-server && npm start  # port 3001
nx serve vue-mri  # port 8081
```

### Mock Server Config

| Variable     | Default                         | Description           |
| ------------ | ------------------------------- | --------------------- |
| `WEBAPI_URL` | `http://alp-dev-sg-3.../WebAPI` | External OHDSI WebAPI |
| `SOURCE`     | `vocab`                         | Vocabulary source     |
| `USE_CACHE`  | `true`                          | Response caching      |
| `SERVER_URL` | `http://localhost:3131`         | Server URL            |

**Example**: `WEBAPI_URL='https://atlas-demo.ohdsi.org/WebAPI' SOURCE='SYNPUF1K' npm start`

### Debugging

Enable debug in `public/index.html`: `portalAPI.debug = true`

- Shows Atlas JSON, criteria JSON
- Copy to clipboard buttons
- Use Vue DevTools for Vuex state

## Configuration

**`config/atlas-config.json`**: Defines criteria types, attributes, UI labels, icons

**⚠️ CRITICAL**: Attribute IDs **must match OHDSI circe-be Java field names** (camelCase)

- Example: `visitLength`, `eraLength`, `occurrenceCount`, `age`, `gender`
- See: `utils/AtlasAttributeLookup.ts` for bidirectional mapping

## Key Concepts

**Concept Set Resolution**: Atlas JSON contains concept set IDs → resolve to local concept sets → auto-create if missing → async load details for UI

**Bidirectional Conversion**: Atlas JSON ⟷ Internal UI Model (normalized) ⟷ Vue Components

**State**: QueryFilterCriteriaManager is canonical source, components use props/emit pattern

**Recursive Processing**:

- **Data**: `CorrelatedCriteria` nested arbitrarily deep via recursive functions
- **UI**: QueryFilterNestedCriteria renders recursively
- **Groups**: Unlimited nesting depth in `InclusionRules` and `CorrelatedCriteria`
