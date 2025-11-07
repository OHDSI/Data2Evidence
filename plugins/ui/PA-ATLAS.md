# PA-Atlas Documentation

**Version:** 2.0 | **Last Updated:** 2025-10-09
**Audience:** Developers working with PA-Atlas cohort builder

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Component Architecture](#3-component-architecture)
4. [Technical Implementation](#4-technical-implementation)
5. [Development Guide](#5-development-guide)
6. [Integration & Data Flow](#6-integration--data-flow)

---

## 1. Overview

**PA-Atlas** is the OHDSI Atlas-compatible cohort builder within Data2Evidence (D2E), providing a visual interface to create, edit, and manage patient cohorts based on medical criteria.

### Naming

- **PA-Atlas**: Product/feature name (user-facing)
- **query-filter**: Code implementation name (`apps/vue-mri-ui-lib/src/query-filter/`)

### Components

**Included:**

- **Bookmarks**: Cohort list (D2E and Atlas-based)
- **Query-Filter** (Vue 3): Visual cohort builder with entry/inclusion/exit criteria and nested logic
- **Concept Sets** (React 18): Standalone microfrontend (`apps/concept-sets/`) for OMOP vocabulary search, concept set management, and multi-select

**Excluded** (hidden when `usePaAtlas: true`):

- Barchart, Patient List, Legacy Filters

### Key Features

- **OHDSI Compatible**: Full Atlas JSON import/export with lossless bidirectional conversion
- **Standards-Based**: OMOP CDM v5.4, SNOMED, ICD-10, RxNorm, LOINC vocabularies
- **Dual Stack**: Vue 3 (cohort builder) + React 18 (concept sets) via single-spa microfrontend
- **WebAPI Integration**: `/d2e-webapi/*` endpoints for vocabulary and cohort persistence

### Supported Criteria Types

**Clinical**: Condition, Drug, Procedure, Observation, Measurement
**Temporal**: Condition/Drug/Dose Era
**Other**: Device, Visit, Death, Specimen, Payer Plan

All types support domain-specific attributes and unlimited nested criteria depth.

## 2. Architecture

### System Overview

PA-Atlas uses a **dual-app microfrontend architecture**:

**Vue 3 Portal** (`apps/vue-mri-ui-lib/`): Hosts cohort builder, manages state (Vuex), handles Atlas JSON import/export
**React Concept Sets** (`apps/concept-sets/`): Independent terminology search and concept set management, loaded via single-spa

### Communication

**1. Custom Events** (primary):

- `alp-terminology-open`: Vue → React to open modal (CONCEPT_SET or CONCEPT_MULTI_SELECT mode)
- `route-change`: Route notifications

```typescript
// Event structure
new CustomEvent("alp-terminology-open", {
  detail: {
    props: {
      selectedConceptSetId,
      selectedDatasetId,
      mode,
      defaultFilters,
      initialSelectedConcepts,
      onClose,
    },
  },
});
```

**2. Portal API Props** (shared context):

```typescript
interface PortalProps {
  getToken: () => Promise<string>;
  username: string;
  datasetId: string; // from portalAPI.studyId
  locale: string;
  isActiveRoute: boolean;
  isAtlas: boolean; // from portalAPI.isLocal
}
```

**3. WebAPI Service**: Both apps call `/d2e-webapi/*` endpoints (concept sets, cohorts, vocabulary)

### State Management

**Vue (Vuex)**: `bookmark`, `cohortDefinition`, `config` modules
**React (Context)**: User info, dataset ID, locale
**QueryFilterCriteriaManager**: Canonical source for cohort definition, handles Atlas JSON conversion

### Single-SPA Integration

Concept Sets app uses single-spa lifecycle (bootstrap/mount/unmount), registered via AppRegistry.ts with SystemJS import maps. Enables independent deployment and runtime loading.

## 3. Component Architecture

### Query-Filter (Vue 3)

Location: `apps/vue-mri-ui-lib/src/query-filter/components/`

**Hierarchy**: QueryFilterModern.vue → QueryFilterEntryExit/Criteria → EventCard → CriteriaSelectorDropdown, AttributesDropdown, NestedCriteria (recursive)

**Key Components**:

- **QueryFilterModern.vue**: Main orchestrator, loads Atlas JSON, manages concept sets, saves
- **QueryFilterCriteria.vue**: Manages inclusion groups (AND/OR/ALL logic)
- **QueryFilterEventCard.vue**: Individual event editor (criteria type, concept sets, cardinality, attributes)
- **QueryFilterNestedCriteria.vue**: Recursive nested logic (CorrelatedCriteria)
- **CriteriaSelectorDropdown.vue**: Event type picker with icons
- **AttributesDropdown.vue**: Domain-specific attributes selector

### Concept Sets (React 18)

Location: `apps/concept-sets/src/`

**Structure**: App.tsx → ConceptSetsProvider → ConceptSets.tsx (tabs) + TerminologyWithEventListener

**Key Components**:

- **App.tsx**: Entry point, theme setup, authentication
- **ConceptSets.tsx**: Tabbed interface (Search | Concept Sets)
- **Terminology.tsx**: OMOP vocabulary search, multi-domain filtering, hierarchy view
- **TerminologyWithEventListener.tsx**: Listens for `alp-terminology-open`, opens modal (CONCEPT_SET or CONCEPT_MULTI_SELECT), returns via callback

## 4. Technical Implementation

### Data Model

**Normalized Internal Format** (UI layer): `{ operator: string, value: string, extent?: string }`
**Atlas Format** (JSON): `{ Op: string, Value: number|string, Extent?: number|string }`

**Conversion**: AtlasConverter.ts (import) ⟷ QueryFilterModel.ts + nested-criteria-processor.ts (export)

### Type System

**Discriminated Unions** ([QueryFilterTypes.ts:78-121](apps/vue-mri-ui-lib/src/query-filter/types/QueryFilterTypes.ts#L78-L121)):

- Level 1: `attributeType: 'nested' | 'standard'`
- Level 2 (standard): `configType: 'numericRange' | 'conceptSet' | 'concept' | 'dateRange'`

Benefits: Compile-time type safety, IntelliSense, type guards ([type-guards.ts](apps/vue-mri-ui-lib/src/query-filter/models/modules/type-guards.ts))

### Atlas Conversion

**Import** (Atlas → UI) - [AtlasConverter.ts](apps/vue-mri-ui-lib/src/query-filter/utils/AtlasConverter.ts):

1. Extract concept sets, convert PrimaryCriteria → EntryEvents
2. Convert InclusionRules → Criteria Groups (recursive nested groups)
3. Convert CensoringCriteria → ExitEvents
4. Normalize: `{Op, Value, Extent}` → `{operator, value, extent}` (operators: `gt`→`GREATER_THAN`, `lt`→`LESS_THAN`, `eq`→`EQUAL`, `bt`→`BETWEEN`)

**Export** (UI → Atlas) - [QueryFilterModel.ts](apps/vue-mri-ui-lib/src/query-filter/models/QueryFilterModel.ts) + [nested-criteria-processor.ts](apps/vue-mri-ui-lib/src/query-filter/models/modules/nested-criteria-processor.ts):

1. Collect concept sets (+ CONT_DRUG), convert Entry/Criteria/Exit
2. Build CorrelatedCriteria with Type/Count, nested Groups
3. Denormalize: `{operator, value, extent}` → `{Op, Value, Extent}` (reverse operators, type conversions)

**Groups**: Recursive support (unlimited depth) via `convertGroupCriteriaToGroupEvents()`. Types: ALL, ANY, AT_LEAST, AT_MOST. Critical pattern: collect ALL events first, then create ONE GroupCriteria.

### State & API

**QueryFilterCriteriaManager** ([QueryFilterModel.ts:42-480](apps/vue-mri-ui-lib/src/query-filter/models/QueryFilterModel.ts#L42-L480)): Canonical source for cohort definition. Methods: `getCriteria()`, `addCriteria()`, `updatePrimaryEvents()`, `convertToAtlasFormat()`, `findEventById()`, `collectConceptSets()`

**Vuex**: `bookmark` (cohort list, active selection), `cohortDefinition` (CRUD, generation)

**APIs**:

- Vue: D2eWebapiService.ts (concept sets, concepts)
- React: api.ts (terminology, d2eWebapi, translation, publicWebapiProxyAPI)

### Exit Strategies

1. **Fixed Duration** (`EndStrategy.DateOffset`): `{dateField: 'StartDate'|'EndDate', offset: number}`
2. **Continuous Drug** (`EndStrategy.CustomEra`): `{conceptSetId, gapDays, offset, daysSupplyOverride}` - async loading via useCriteriaManager.ts
3. **End of Observation**: Standard Atlas exit

Component: [QueryFilterEntryExit.vue:147-230](apps/vue-mri-ui-lib/src/query-filter/components/QueryFilterEntryExit.vue#L147-L230) - local refs synced via `onMounted`/watchers

### Nested Criteria

**CorrelatedCriteria** (recursive, unlimited depth): Handles CriteriaList, DemographicCriteriaList, nested Groups. Types: ALL, ANY, AT_LEAST, AT_MOST. Demographic support: Age (NumericRange), Gender/Race/Ethnicity (Concept[]), dates (DateRange). Rendered recursively via QueryFilterNestedCriteria.vue.

## 5. Development Guide

### Setup

**Query-Filter**:

- Mock server: `cd apps/vue-mri-ui-lib && npm run build:mock && npm run start:mock` (port 3131)
- Dev server: Start mock-server (port 3001) + `nx serve vue-mri` (port 8081, hot reload)

**Concept Sets**: `cd apps/concept-sets && npm run dev`

### Configuration

**Mock Server** (`query-filter/mock-server/server.js`):
| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_URL` | `http://localhost:3131` | Mock server URL |
| `WEBAPI_URL` | `http://alp-dev-sg-3.../WebAPI` | External Atlas WebAPI |
| `USE_CACHE` | `true` | Response caching |
| `DEBUG` | `false` | Debug mode |

**Development** (`public/index.html`):

```javascript
portalAPI = {
  isLocal: true, // Disable single-spa
  studyId: "...", // Dataset ID
  debug: false, // Show debug panels
};
```

**Atlas Criteria Config** ([atlas-config.json](apps/vue-mri-ui-lib/src/query-filter/config/atlas-config.json)): Defines criteria types/attributes. **Must match OHDSI circe-be Java field names** (camelCase). Example: `visitLength`, `eraLength`, `age`, `gender`

### File Structure

```
apps/
├── vue-mri-ui-lib/src/
│   ├── components/ (Bookmarks, PatientAnalytics)
│   ├── query-filter/
│   │   ├── components/ (QueryFilterModern, Criteria, EventCard, NestedCriteria)
│   │   ├── models/ (QueryFilterModel)
│   │   ├── services/ (D2eWebapiService)
│   │   ├── utils/ (AtlasConverter, ConfigLoader, AtlasAttributeLookup)
│   │   ├── types/ (AtlasTypes, QueryFilterTypes, ConceptSetTypes)
│   │   ├── config/ (atlas-config.json)
│   │   └── mock-server/ (server.js, mock-routes.js)
│   ├── store/modules/ (bookmark, cohortDefinition)
│   └── utils/ (AppRegistry)
└── concept-sets/src/
    ├── ConceptSets/, Terminology/ (main components)
    ├── context/ (ConceptSetsContext)
    ├── axios/ (api.ts, d2e-webapi.ts)
    └── lifecycles.tsx (single-spa)
```

### Debugging

- Enable debug: `portalAPI.debug = true` (shows Atlas JSON, copy buttons)
- Vue DevTools: Vuex state, component hierarchy
- React DevTools: Context, props/state

## 6. Integration & Data Flow

### Key Workflows

**Load Cohort**: Bookmarks.vue → GET `/d2e-webapi/cohortdefinition/{id}` → SET_ACTIVE_BOOKMARK → @loadAtlasCohortDefinition → PatientAnalytics.vue → QueryFilterModern.vue (converts Atlas JSON via AtlasConverter.ts)

**Edit Concept Set**: QueryFilterModern.vue → emits `alp-terminology-open` → TerminologyWithEventListener.tsx → modal opens (CONCEPT_SET or CONCEPT_MULTI_SELECT) → onClose callback → reload concept sets → update criteria

**Save Cohort**: QueryFilterModern.vue:saveAtlasCohort() → criteriaManager.convertToAtlasFormat() → POST/PUT `/d2e-webapi/cohortdefinition` → update bookmark

- Name validation: No limit (PA-Atlas mode), 40 chars (D2E Portal mode)

**Generate**: POST `/d2e-webapi/cohortdefinition/{id}/generate/{datasetId}` → backend executes OMOP SQL → stores cohort table → returns patient count

**PA-Atlas Mode**: `usePaAtlas: true` → PatientAnalytics.vue shows QueryFilter instead of legacy Filters, hides charts

## 7. Critical Implementation Patterns

### Cardinality Count Handling

**⚠️ CRITICAL**: Use `??` not `||` for count values (JavaScript treats `0` as falsy)

```typescript
// ✅ CORRECT: Count: event.cardinality?.count ?? 1
// ❌ WRONG: Count: event.cardinality?.count || 1 (converts 0 → 1)
```

Locations: AtlasConverter.ts:338, nested-criteria-processor.ts:111/277/514, QueryFilterModel.ts:393

### Preserve nestedCriteria

Always preserve `nestedCriteria` when transforming events ([event-transformer.ts:30-36](apps/vue-mri-ui-lib/src/query-filter/models/modules/event-transformer.ts#L30-L36)):

```typescript
...(event.nestedCriteria && {
  nestedCriteria: { ...event.nestedCriteria, events: transformEvents(event.nestedCriteria.events || []) }
})
```

### Component State Init

Initialize local refs from props via `onMounted` + watchers ([QueryFilterEntryExit.vue:172-230](apps/vue-mri-ui-lib/src/query-filter/components/QueryFilterEntryExit.vue#L172-L230)) - props may load async

### Group Export

Collect ALL events FIRST, then create ONE GroupCriteria ([nested-criteria-processor.ts:77-240](apps/vue-mri-ui-lib/src/query-filter/models/modules/nested-criteria-processor.ts#L77-L240))

## 8. Troubleshooting

**Mock Server**: Check `npm install`, port availability (`lsof -i :3131`), try different port
**Concept Sets**: Network tab, datasetId, WebAPI endpoint, auth token, CORS
**Single-SPA**: Import map (DevTools → Sources), URL accessibility, `start()` called, route matching

---

**References**:

- [Query-Filter README](apps/vue-mri-ui-lib/src/query-filter/README.md)
- [Mock Server README](apps/vue-mri-ui-lib/src/query-filter/mock-server/README.md)
