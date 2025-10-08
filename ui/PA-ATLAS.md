# PA-Atlas Documentation

**Last Updated:** 2025-10-01
**Version:** 1.0
**Target Audience:** Developers working with PA-Atlas cohort builder functionality

---

## Table of Contents

1. [Overview & Terminology](#1-overview--terminology)
2. [Architecture Overview](#2-architecture-overview)
3. [Single-SPA Integration](#3-single-spa-integration)
4. [Component Architecture](#4-component-architecture)
5. [Technical Implementation](#5-technical-implementation)
6. [User Workflows](#6-user-workflows)
7. [Development Guide](#7-development-guide)
8. [Integration Points & Data Flow](#8-integration-points--data-flow)

---

## 1. Overview & Terminology

### What is PA-Atlas?

**PA-Atlas** is the cohort builder functionality within the Data2Evidence (D2E) platform. It provides researchers with a visual interface to create, edit, and manage patient cohorts based on medical criteria. PA-Atlas combines two key capabilities:

1. **Cohort Generation** (Query-Filter) - Visual cohort definition builder
2. **Concept Sets Management** (Terminology Browser) - Medical concept search and management

### Naming Clarification

- **PA-Atlas** = Product/feature name used in user-facing contexts
- **query-filter** = Code/implementation name in the codebase (`apps/vue-mri-ui-lib/src/query-filter/`)
- Both terms refer to the same cohort building functionality

### Scope & Components

**What PA-Atlas Includes:**

- **Bookmarks Page** - Lists all cohorts (D2E and Atlas-based)
- **Query-Filter** - Visual cohort definition builder with:
  - Entry events (primary criteria)
  - Inclusion criteria groups (additional filters)
  - Exit criteria (censoring events)
  - Nested medical criteria support
- **Concept Sets App** - Standalone React microfrontend (built with single-spa) for:
  - Creating and managing reusable concept sets
  - Searching OMOP vocabulary concepts across all domains
  - Selecting individual concepts with multi-select interface
  - Viewing concept hierarchies, relationships, and descendants
  - Location: `apps/concept-sets/`

**What PA-Atlas Does NOT Include (Hidden/Unused):**

While the following components exist in the codebase, they are NOT part of the PA-Atlas functionality:

- **Barchart** - Data visualization component (hidden in PA-Atlas mode)
- **Patient List** - Patient-level data browser (hidden in PA-Atlas mode)
- **Legacy Filters** - Old D2E filter interface (replaced by query-filter for Atlas cohorts)

When PA-Atlas is active (controlled by the `usePaAtlas` configuration flag), it runs in **cohort-focused mode**, dedicating the interface to cohort definition. Other patient analytics features (bar charts, patient lists) remain available but are not the primary focus.

### Key Characteristics

- **OHDSI Atlas Compatible** - Imports and exports standard Atlas cohort definition JSON (supports full Atlas specification including nested criteria)
- **Bidirectional Conversion** - Lossless translation between Atlas JSON and visual UI representation
- **Medical Standards-Based** - Built on OMOP Common Data Model v5.4 with access to standard vocabularies (SNOMED, ICD-10, RxNorm, LOINC)
- **Dual Technology Stack** - Vue 3 Composition API (query-filter cohort builder) + React 18 (concept-sets manager)
- **Microfrontend Architecture** - Concept sets deployed as independent single-spa application with runtime loading and event-based communication
- **WebAPI Integration** - Connects to OHDSI WebAPI endpoints (d2e-webapi) for vocabulary services and cohort persistence

### Supported Medical Criteria Types

PA-Atlas supports the full range of OHDSI Atlas criteria types:

**Clinical Events:**

- Condition Occurrence (diagnoses)
- Drug Exposure (medications)
- Procedure Occurrence (procedures)
- Observation (lab results, vitals)
- Measurement (quantitative observations)

**Time-based Events:**

- Condition Era (diagnosis periods)
- Drug Era (medication periods)
- Dose Era (dosage periods)

**Other Events:**

- Device Exposure
- Visit Occurrence
- Death
- Specimen
- Payer Plan Period

Each criteria type supports domain-specific attributes (dates, quantities, types, etc.) and can include nested correlated criteria for complex medical logic.

---

## 2. Architecture Overview

### High-Level Architecture

PA-Atlas consists of two independently deployed applications that work together:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        D2E Portal Application                        │
│                    (apps/vue-mri-ui-lib - Vue 3)                    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    PatientAnalytics.vue                         │ │
│  │                  (Main Orchestrator)                            │ │
│  │                                                                 │ │
│  │  ┌──────────────────┐         ┌─────────────────────────────┐ │ │
│  │  │   Bookmarks.vue  │         │  QueryFilterModern.vue       │ │ │
│  │  │  (Cohort List)   │────────▶│  (Cohort Builder - Vue 3)   │ │ │
│  │  └──────────────────┘         │                              │ │ │
│  │                               │  - Entry/Exit Events         │ │ │
│  │                               │  - Criteria Groups           │ │ │
│  │                               │  - Nested Criteria           │ │ │
│  │                               │  - Atlas JSON Import/Export  │ │ │
│  │                               └──────────────┬───────────────┘ │ │
│  │                                              │                 │ │
│  │                                              │ Custom Events   │ │
│  │                                              │ (alp-terminology)│ │
│  └──────────────────────────────────────────────┼─────────────────┘ │
│                                                 │                   │
│  ┌──────────────────────────────────────────────┼─────────────────┐ │
│  │           Single-SPA Microfrontend Loader    │                 │ │
│  │                (AppRegistry.ts)              │                 │ │
│  └──────────────────────────────────────────────┼─────────────────┘ │
└────────────────────────────────────────────────┼───────────────────┘
                                                  │
                                                  │ Dynamically Loads
                                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Concept Sets Microfrontend                        │
│                     (apps/concept-sets - React 18)                   │
│                                                                       │
│  ┌─────────────────┐          ┌──────────────────────────────────┐ │
│  │  ConceptSets    │          │   Terminology Browser            │ │
│  │  Management     │          │   (TerminologyWithEventListener) │ │
│  │                 │          │                                  │ │
│  │  - List Sets    │          │   - Concept Search               │ │
│  │  - Create/Edit  │          │   - Multi-Select                 │ │
│  │  - View Details │          │   - Hierarchy View               │ │
│  └─────────────────┘          └──────────────────────────────────┘ │
│                                                                       │
│  Bootstrap/Mount/Unmount Lifecycle (single-spa-react)               │
└────────────────────────────────┬──────────────────────────────────┘
                                 │
                                 │ API Calls
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Backend Services                              │
│                                                                       │
│  d2e-webapi endpoints (all prefixed with /d2e-webapi/):             │
│                                                                       │
│  Concept Sets:                                                       │
│  - POST /conceptset                       (Create concept set)       │
│  - GET /conceptset                        (List all concept sets)    │
│  - GET /conceptset/{id}/expression        (Get CS expression)        │
│  - PUT /conceptset/{id}/items             (Update CS items)          │
│                                                                       │
│  Cohort Definitions:                                                 │
│  - POST /cohortdefinition                 (Create cohort)            │
│  - GET /cohortdefinition/{id}             (Read cohort)              │
│  - PUT /cohortdefinition/{id}             (Update cohort)            │
│  - DELETE /cohortdefinition/{id}          (Delete cohort)            │
│  - POST /cohortdefinition/{id}/generate/{datasetId} (Generate)      │
│                                                                       │
│  Vocabulary:                                                         │
│  - GET /vocabulary/{datasetId}/search     (Concept search)           │
│  - POST /vocabulary/{datasetId}/search    (Advanced search)          │
└─────────────────────────────────────────────────────────────────────┘
```

### Two-App Integration Model

#### 1. Vue 3 Portal App (vue-mri-ui-lib)

**Primary Role:** Hosts the cohort builder interface and manages application state

**Key Responsibilities:**

- Renders the cohort list (Bookmarks page)
- Provides the visual cohort definition builder (QueryFilter)
- Manages Atlas JSON import/export
- Handles cohort save/update operations
- Orchestrates single-spa microfrontend loading

**Technology Stack:**

- Vue 3 with Composition API
- Vuex for state management
- TypeScript
- SCSS for styling

**Location:** `apps/vue-mri-ui-lib/src/`

#### 2. React Concept Sets App (concept-sets)

**Primary Role:** Independent terminology management application

**Key Responsibilities:**

- Concept set CRUD operations
- OMOP vocabulary search across all domains
- Individual concept selection (multi-select mode)
- Concept hierarchy visualization

**Technology Stack:**

- React 18 with Hooks
- React Context API for state
- Material-UI components
- TypeScript
- single-spa-react for lifecycle

**Location:** `apps/concept-sets/`

**Deployment:** Built separately and loaded dynamically via single-spa

### Communication Patterns

The two applications communicate through several mechanisms:

#### 1. Custom Events (Primary Pattern)

**Event:** `alp-terminology-open`

- **Source:** QueryFilterModern.vue (Vue app)
- **Target:** TerminologyWithEventListener.tsx (React app)
- **Purpose:** Opens terminology modal for concept selection
- **Event Structure:**
  ```typescript
  // Full CustomEvent structure
  new CustomEvent('alp-terminology-open', {
    detail: {
      props: {
        selectedConceptSetId?: number | string,
        selectedDatasetId: string,
        mode: 'CONCEPT_SET' | 'CONCEPT_MULTI_SELECT',
        defaultFilters: Array<{id: string, value: string[]}>,
        initialSelectedConcepts?: SelectedConcept[],
        onClose?: (values?: TerminologyCloseValues) => void
      }
    }
  })
  ```
- **Note:** The listener accesses the payload via `event.detail.props`

**Event:** `route-change`

- **Purpose:** Notifies concept-sets when route changes
- **Payload:** `{ activeRoute: string }`

#### 2. Portal API Props

Shared context passed to both applications:

```typescript
interface PortalProps {
  getToken: () => Promise<string>;
  username: string;
  datasetId: string; // Mapped from portalAPI.studyId in AppRegistry
  locale: string;
  isActiveRoute: boolean;
  isAtlas: boolean; // Mapped from portalAPI.isLocal in AppRegistry
  REACT_APP_USE_PUBLIC_WEBAPI_PROXY?: string; // Controls WebAPI proxy routing
}
```

Accessed via:

- Vue app: `getPortalAPI()` utility
- React app: Passed as props to App component via AppRegistry.ts

**Property Transformations:**
AppRegistry.ts performs these mappings when loading microfrontends:

- `portalAPI.studyId` → `datasetId`
- `portalAPI.isLocal` → `isAtlas`

#### 3. Shared WebAPI Service

Both apps call the same backend endpoints:

- `D2eWebapiService.ts` (Vue app)
- `api.d2eWebapi.*` (React app)

Endpoints are accessed at `/d2e-webapi/*`

### Data Flow Architecture

```
User Action (Select Cohort)
    │
    ▼
Bookmarks.vue
    │
    ├──(D2E Cohort)──▶ Load into legacy Filters component
    │
    └──(Atlas Cohort)──▶ Load Atlas JSON
                           │
                           ▼
                    QueryFilterModern.vue
                           │
                           ├─── Convert Atlas → UI Model
                           │    (AtlasConverter.ts)
                           │
                           ├─── Extract Concept Set IDs
                           │
                           ├─── Fetch Concept Sets from WebAPI
                           │    (d2eWebapiService.getConceptSets)
                           │
                           ├─── Populate QueryFilterCriteriaManager
                           │
                           └─── Render Visual Interface
                                    │
                                    ▼
                            User Edits Criteria
                                    │
                                    ├─── Add/Edit Concept Set
                                    │    ├─ Emit 'alp-terminology-open'
                                    │    └─▶ Concept Sets Modal Opens
                                    │         (React microfrontend)
                                    │         │
                                    │         └─── User Selects Concepts
                                    │              │
                                    │              └─▶ onClose callback
                                    │                   │
                                    │                   └─▶ Update criteria
                                    │
                                    └─── Save Cohort
                                         │
                                         ├─ Convert UI Model → Atlas JSON
                                         │  (QueryFilterCriteriaManager.convertToAtlasFormat)
                                         │
                                         └─ POST /d2e-webapi/cohortdefinition
                                            (Vuex action: fireCreateAtlasCohortDefinitionQuery)
```

### State Management Strategy

#### Vue App State (Vuex Store)

**Modules:**

- `bookmark` - Cohort list and active cohort
- `cohortDefinition` - Atlas cohort CRUD operations
- `config` - Application configuration
- `chart` - Chart-related state (hidden in PA-Atlas mode)
- `patientList` - Patient list state (hidden in PA-Atlas mode)

**Key Getters:**

- `getActiveBookmark` - Currently selected cohort
- `getBookmarks` - All available cohorts
- `getSelectedDataset` - Active dataset ID
- `getCurrentBookmarkHasChanges` - Dirty state tracking

#### React App State (Context API)

**ConceptSetsContext:**

- User info (username, userId)
- Dataset ID
- Selected locale
- Token retrieval function

**Local Component State:**

- Concept sets list
- Search filters
- Selected concepts
- Tab state (Search vs Concept Sets)

#### Query Filter Internal State

**QueryFilterCriteriaManager:**

- Entry events (PrimaryCriteria)
- Inclusion criteria groups
- Exit events (CensoringCriteria)
- Concept set mappings

This manager serves as the canonical source of truth for cohort definition and handles bidirectional Atlas JSON conversion.

---

## 3. Single-SPA Integration

### Overview

The concept-sets application is deployed as a **single-spa microfrontend**, allowing it to be:

- Built and deployed independently
- Loaded dynamically at runtime
- Integrated with the Vue portal app without tight coupling

### Single-SPA Lifecycle

**File:** `apps/concept-sets/src/lifecycles.tsx`

```typescript
import singleSpaReact from "single-spa-react";

const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: (props: PortalProps) => <App {...props} />,
  errorBoundary: (_err, _info, _props) => {
    return <div>This renders when a catastrophic error occurs</div>;
  },
});

export const { bootstrap, mount, unmount } = lifecycles;
```

**Lifecycle Phases:**

1. **Bootstrap** - One-time initialization when app is first loaded
2. **Mount** - Renders the React app when route becomes active
3. **Unmount** - Cleans up when route becomes inactive

### Registration Process

**File:** `apps/vue-mri-ui-lib/src/utils/AppRegistry.ts`

The Vue portal app registers the concept-sets microfrontend:

```typescript
// 1. Setup SystemJS Import Map
setupImportMaps() {
  const importMapData = {
    imports: {
      'concept-sets': 'http://localhost:8080/concept-sets/main.js'
      // Other microfrontends...
    }
  }
}

// 2. Register Application
registerApplication({
  name: 'concept-sets',
  app: () => window.System.import('concept-sets'),
  activeWhen: location => location.pathname === '/concepts',
  customProps: () => ({
    getToken: portalAPI?.getToken,
    username: portalAPI?.username,
    datasetId: portalAPI?.studyId,
    locale: portalAPI?.locale,
    isActiveRoute: location.pathname === '/concepts',
    isAtlas: portalAPI?.isLocal || false,
  })
})

// 3. Start Single-SPA
start({ urlRerouteOnly: true })
```

### SystemJS Module Loading

**Technology:** SystemJS (Universal module loader)

**Import Map:** Defines module locations dynamically

- Can be overridden for development (via import-map-overrides)
- Supports CDN or local URLs
- Enables version management without redeploying portal app

**Example Import Map:**

```json
{
  "imports": {
    "concept-sets": "https://cdn.example.com/concept-sets@1.2.3/main.js",
    "react": "https://cdn.example.com/react@18.2.0/react.production.min.js"
  }
}
```

### Event-Driven Communication

Since single-spa applications run in isolation, they communicate via:

**1. Custom Window Events**

Terminology modal trigger (Vue → React):

```typescript
// QueryFilterModern.vue
window.dispatchEvent(new CustomEvent('alp-terminology-open', {
  detail: { props: {...} }
}))

// TerminologyWithEventListener.tsx
useEffect(() => {
  const handler = (event: CustomEvent) => {
    const props = event.detail.props
    // Open modal with props
  }
  window.addEventListener('alp-terminology-open', handler)
  return () => window.removeEventListener('alp-terminology-open', handler)
}, [])
```

**2. Route Change Notifications**

```typescript
// AppRegistry.ts
navigateToRoute(route: string) {
  navigateToUrl(route)  // single-spa navigation

  window.dispatchEvent(new CustomEvent('route-change', {
    detail: { activeRoute: route }
  }))
}
```

### Props Passing

Props are passed to microfrontends via the `customProps` function:

```typescript
// These props are available to the React app on mount
interface PortalProps {
  getToken: () => Promise<string>; // Authentication
  username: string; // Current user
  datasetId: string; // Active dataset
  locale: string; // Language preference
  isActiveRoute: boolean; // Route activation state
  isAtlas: boolean; // Atlas mode flag
}
```

The React app accesses these via:

- Initial props in `App.tsx`
- Context providers (`ConceptSetsProvider`)

### Development Configuration

**Local Development (index.html):**

```javascript
// For local dev, set isLocal: true to disable single-spa wrapper
document.querySelector(".plugin-container").portalAPI = {
  isLocal: true, // Disables single-spa, renders directly
  studyId: "...",
  getToken: () => localStorage.getItem("msaltoken"),
  // ...
};
```

**Production:** `isLocal: false` - Uses full single-spa loading

---

## 4. Component Architecture

### Query-Filter Components (Vue 3)

**Location:** `apps/vue-mri-ui-lib/src/query-filter/components/`

#### Component Hierarchy

```
QueryFilterModern.vue (Root)
│
├── QueryFilterEntryExit.vue (Entry Events)
│   └── QueryFilterEventContainer.vue
│       └── QueryFilterEventCard.vue
│           ├── CriteriaSelectorDropdown.vue
│           ├── AttributesDropdown.vue
│           └── QueryFilterNestedCriteria.vue (Recursive)
│
├── QueryFilterCriteria.vue (Inclusion Criteria)
│   └── QueryFilterCriteriaGroup.vue
│       └── QueryFilterEventContainer.vue
│           └── QueryFilterEventCard.vue (same as above)
│
└── QueryFilterEntryExit.vue (Exit Criteria)
    └── (same structure as Entry)
```

#### Key Components

**QueryFilterModern.vue** - Main orchestrator

- Loads Atlas JSON into UI model
- Manages concept set resolution
- Handles save operations
- Coordinates terminology modal
- File: `query-filter/components/QueryFilterModern.vue:1-1065`

**QueryFilterCriteria.vue** - Inclusion criteria manager

- Manages multiple criteria groups
- Handles AND/OR/ALL logic
- Add/remove groups
- File: `query-filter/components/QueryFilterCriteria.vue`

**QueryFilterEventCard.vue** - Individual event editor

- Medical event selection (Condition, Drug, etc.)
- Concept set assignment
- Cardinality settings (First, At Least, etc.)
- Attribute configuration
- File: `query-filter/components/QueryFilterEventCard.vue`

**QueryFilterNestedCriteria.vue** - Recursive nested logic

- Handles CorrelatedCriteria from Atlas
- Renders nested events recursively
- Supports arbitrary nesting depth
- File: `query-filter/components/QueryFilterNestedCriteria.vue`

**CriteriaSelectorDropdown.vue** - Event type picker

- Dropdown with search
- Medical domain icons
- Groups events by type
- File: `query-filter/components/CriteriaSelectorDropdown.vue`

**AttributesDropdown.vue** - Attribute selector

- Domain-specific attributes (Age, Gender, etc.)
- Multi-select interface
- Conditional visibility based on event type
- File: `query-filter/components/AttributesDropdown.vue`

### Concept Sets Components (React 18)

**Location:** `apps/concept-sets/src/`

#### Component Structure

```
App.tsx
└── ConceptSetsProvider (Context)
    ├── ConceptSets.tsx (Main Interface)
    │   ├── Tabs (Search | Concept Sets)
    │   ├── Terminology.tsx (Search Tab)
    │   │   ├── SearchBar
    │   │   ├── FiltersPanel
    │   │   └── ConceptTable
    │   └── ConceptSets Management Tab
    │       ├── SearchBar
    │       ├── ConceptSetTable
    │       └── Add/Edit Buttons
    │
    └── TerminologyWithEventListener.tsx
        └── Terminology.tsx (Modal Mode)
            ├── CONCEPT_SET mode
            │   └── Edit/create concept set
            └── CONCEPT_MULTI_SELECT mode
                └── Select individual concepts
```

#### Key Components

**App.tsx** - Entry point

- Sets up theme (D2E vs Atlas)
- Initializes context providers
- Handles authentication
- File: `concept-sets/src/App.tsx:1-117`

**ConceptSets.tsx** - Main interface

- Tabbed interface (Search | Concept Sets)
- Lists user and shared concept sets
- Triggers terminology modal
- File: `concept-sets/src/ConceptSets/ConceptSets.tsx:1-298`

**Terminology.tsx** - Search and selection

- OMOP vocabulary search
- Multi-domain filtering
- Concept selection (single/multi)
- Hierarchy visualization
- File: `concept-sets/src/Terminology/Terminology.tsx`

**TerminologyWithEventListener.tsx** - Modal coordinator

- Listens for `alp-terminology-open` events
- Opens terminology in modal
- Handles concept set creation/editing
- Returns selections via callback
- File: `concept-sets/src/Terminology/TerminologyWithEventListener.tsx`

### Shared Components

Both apps use common UI elements:

**Vue App:**

- `appButton`, `appCheckbox` - Form controls
- `messageBox` - Modal dialogs
- `SplashScreen` - Loading indicator

**React App:**

- Material-UI components (Table, Tabs, Button, etc.)
- Custom SearchBar
- Portal components (`@portal/components`)

---

## 5. Technical Implementation

### Atlas JSON Conversion

#### Import Flow (Atlas → UI)

**File:** `query-filter/utils/AtlasConverter.ts`

**Main Function:** `convertAtlasToFilters(atlasJson, availableConceptSets)`

Process:

1. **Extract Concept Sets** - Map concept set IDs to local concept sets
2. **Convert PrimaryCriteria** → Entry Events
3. **Convert InclusionRules** → Criteria Groups
4. **Convert CensoringCriteria** → Exit Events
5. **Process Nested Criteria** - Recursively handle CorrelatedCriteria

**Example:**

```typescript
// Atlas JSON structure
{
  PrimaryCriteria: {
    CriteriaList: [{
      ConditionOccurrence: {
        CodesetId: 1,
        Age: { Value: 18, Op: "gte" },
        CorrelatedCriteria: {...}  // Nested
      }
    }]
  },
  InclusionRules: [...],
  CensoringCriteria: [...]
}

// Converted to UI model
{
  entryEvents: {
    events: [{
      id: "event_xyz",
      criteriaType: "ConditionOccurrence",
      conceptSet: {...},
      attributes: [
        { id: "age", type: "numericRange", value: 18, operator: "gte" },
        { id: "nested", type: "nested", nestedCriteria: {...} }
      ]
    }]
  },
  inclusionCriteria: {...},
  exitEvents: {...}
}
```

#### Export Flow (UI → Atlas)

**File:** `query-filter/models/QueryFilterModel.ts`

**Method:** `QueryFilterCriteriaManager.convertToAtlasFormat()`

Process:

1. **Collect Concept Sets** - Build unified concept sets array with ID mapping
2. **Convert Entry Events** → PrimaryCriteria
3. **Convert Criteria Groups** → InclusionRules with ExpressionLimit
4. **Convert Exit Events** → Censoring Criteria or EndStrategy
5. **Reconstruct Nested Criteria** - Build CorrelatedCriteria from nested attributes

### State Management

#### QueryFilterCriteriaManager

**File:** `query-filter/models/QueryFilterModel.ts:42-480`

**Responsibilities:**

- Canonical source of truth for cohort definition
- Manages entry events, criteria groups, exit events
- Handles concept set mappings
- Bidirectional Atlas conversion

**Key Methods:**

```typescript
class QueryFilterCriteriaManager {
  // Criteria management
  getCriteria(): QueryFilterCriteria;
  addCriteria(group?: Partial<QueryFilterGroup>): QueryFilterGroup;
  removeCriteria(groupId: string): boolean;

  // Entry/Exit events
  getPrimaryEvents(): EntryEvent;
  updatePrimaryEvents(events: QueryFilterEvent[]): void;
  getCensoringCriteria(): ExitEvent;

  // Atlas conversion
  convertToAtlasFormat(): AtlasCohortExpression;

  // Helpers
  findEventById(eventId: string): QueryFilterEvent | null;
  collectConceptSets(): ConceptSetMapping[];
}
```

#### Vuex Store Modules

**bookmark module** (`store/modules/bookmark.ts`)

- Cohort list state
- Active cohort selection
- Change tracking

**cohortDefinition module** (`store/modules/cohortDefinition.ts`)

- Atlas cohort CRUD actions
- D2E cohort generation
- API integration

### API Integration

#### D2eWebapiService (Vue)

**File:** `query-filter/services/D2eWebapiService.ts`

```typescript
class D2eWebapiService {
  // Concept Sets
  getConceptSets(datasetId: string): Promise<IWebapiConceptSet[]>;
  getConceptSetExpression(conceptSetId: number, datasetId: string);
  createConceptSet(conceptSetData, datasetId);
  updateConceptSetItems(conceptSetId, conceptItems, datasetId);

  // Individual Concepts
  getConceptById(conceptId: number, datasetId);
}
```

#### Concept Sets API (React)

**File:** `concept-sets/src/axios/api.ts`

```typescript
export const api = {
  terminology: new Terminology(), // Concept search
  d2eWebapi: new D2eWebapi(), // Concept sets CRUD
  translation: new Translation(), // i18n
  publicWebapiProxyAPI: new PublicWebapiProxyAPI(), // Proxy to external Atlas
};
```

### Nested Criteria Handling

**Recursive Processing:**

Atlas `CorrelatedCriteria` represents medical logic like:

- "Condition occurred AND (Drug within 30 days OR Procedure)"
- Arbitrary nesting depth supported

**Import (Atlas → UI):**

```typescript
// AtlasConverter.ts:convertCriteriaListToEvents
function convertCriteriaListToEvents(criteriaList) {
  return criteriaList.map((item) => {
    const event = createBasicEvent(item);

    if (hasCorrelatedCriteria(item)) {
      // Recursive call
      const nestedEvents = convertCriteriaListToEvents(
        item.CorrelatedCriteria.CriteriaList
      );

      event.attributes.push({
        id: "nested",
        type: "nested",
        nestedCriteria: {
          events: nestedEvents,
          criteriaType: item.CorrelatedCriteria.Type, // ALL, ANY, AT_LEAST
        },
      });
    }

    return event;
  });
}
```

**UI Rendering:**

```vue
<!-- QueryFilterNestedCriteria.vue -->
<template>
  <div class="nested-criteria">
    <div v-for="event in nestedEvents" :key="event.id">
      <QueryFilterNestedEvent :event="event" />

      <!-- Recursive: This event may have more nested criteria -->
      <QueryFilterNestedCriteria
        v-if="hasNestedCriteria(event)"
        :nested-criteria="event.nestedCriteria"
      />
    </div>
  </div>
</template>
```

**Export (UI → Atlas):**
Reverse process rebuilds CorrelatedCriteria from nested attribute structures.

---

## 6. User Workflows

### Creating a New Cohort

#### Option 1: Create D2E Cohort

1. Click "Create D2E Cohort" on Bookmarks page
2. Enter cohort name
3. Use legacy Filters interface (not PA-Atlas)

#### Option 2: Create Atlas Cohort

1. Click "Create Atlas Cohort" (or "Create Cohort" if `isLocal`)
2. System creates empty bookmark with `isAtlas: true, isNew: true`
3. QueryFilterModern loads with empty state
4. User builds cohort visually:
   - Add Entry Events
   - Add Inclusion Criteria groups
   - Add Exit Criteria (optional)
   - Configure attributes and concept sets
5. Click "Save" → Enter name → Creates cohort via WebAPI
6. Bookmark updated with cohort ID

### Importing Atlas Cohort

1. Click "Import Cohort" on Bookmarks page
2. Paste Atlas JSON or select from external Atlas
3. System:
   - Validates JSON format
   - Creates cohort definition via POST `/d2e-webapi/cohortdefinition`
   - Stores in database
   - Displays in bookmark list

### Editing a Cohort

1. Click cohort name in bookmarks
2. **If D2E cohort:** Opens legacy Filters
3. **If Atlas cohort:**
   - Loads Atlas JSON from database
   - Converts to UI model via `convertAtlasToFilters`
   - Resolves concept sets
   - Loads concept details
   - Renders visual interface
4. User makes changes
5. Click "Save" → Updates cohort definition

### Concept Set Management

#### Creating a Concept Set

**From Query-Filter:**

1. Click concept set dropdown on an event
2. Click "Create New" or pencil icon
3. System emits `alp-terminology-open` event
4. Concept Sets modal opens (React app)
5. Enter name, search and select concepts
6. Click Save → POST `/d2e-webapi/conceptset`
7. Modal closes, returns new concept set via `onClose` callback
8. Event updated with new concept set

**From Concept Sets App:**

1. Navigate to `/concepts` route
2. Click "Add Concept Set"
3. Follow same creation flow
4. Concept set appears in list

#### Selecting Individual Concepts (Multi-Select Mode)

1. On a "Concept" attribute (not concept set)
2. Click to open
3. System emits event with `mode: 'CONCEPT_MULTI_SELECT'`
4. Modal shows multi-select interface
5. User checks individual concepts
6. Click Done → Returns `SelectedConcept[]` via callback
7. Concepts stored directly on attribute as `conceptItems`

### Generating a Cohort

1. Open Atlas cohort in QueryFilter
2. Select target dataset from dropdown
3. Click "Generate Cohort"
4. System:
   - Gets active bookmark ID
   - Calls POST `/d2e-webapi/cohortdefinition/{id}/generate/{datasetId}`
   - Displays patient count when complete
5. Cohort patients now available for analysis

---

## 7. Development Guide

### Local Development Setup

#### Running Query-Filter in Isolation

**Option A: With Mock Server**

```bash
# 1. Build and start mock server (serves built app + mock APIs)
cd apps/vue-mri-ui-lib
npm run build:mock
npm run start:mock

# Access at http://localhost:3131
```

**Option B: Dev Server (Hot Reload)**

```bash
# Terminal 1: Start mock server for APIs
cd apps/vue-mri-ui-lib/src/query-filter/mock-server
npm install
npm start  # Runs on port 3001

# Terminal 2: Start Vue CLI dev server
cd apps/vue-mri-ui-lib
# Edit vue.config.js proxy target to 'http://localhost:3001'
nx serve vue-mri  # Runs on port 8081 with hot reload

# Configure public/index.html: isLocal: true
```

#### Running Concept Sets

```bash
cd apps/concept-sets
npm install
npm run dev  # Vite dev server on port configured in vite.config.ts
```

#### Running Both Together

Portal app loads concept-sets via single-spa if configured in navigation config.

### Environment Variables

#### Mock Server

**File:** `query-filter/mock-server/server.js`

| Variable     | Description                    | Default                                                       |
| ------------ | ------------------------------ | ------------------------------------------------------------- |
| `SERVER_URL` | Mock server URL and port       | `http://localhost:3131`                                       |
| `WEBAPI_URL` | External Atlas WebAPI to proxy | `http://alp-dev-sg-3.southeastasia.cloudapp.azure.com/WebAPI` |
| `SOURCE`     | Vocabulary source key          | `vocab`                                                       |
| `USE_CACHE`  | Enable response caching        | `true`                                                        |
| `DEBUG`      | Show debug info in UI          | `false`                                                       |

**Usage:**

```bash
SERVER_URL=http://localhost:3001 USE_CACHE=false npm start
```

#### Public/index.html (Development)

```javascript
document.querySelector(".plugin-container").portalAPI = {
  isLocal: true, // Disable single-spa for faster dev
  studyId: "963820c6-94b0-42d8-8359-115b2695faf5", // Your dataset ID
  username: "admin",
  getToken: () => localStorage.getItem("msaltoken"),
  debug: false, // Show debug panels in QueryFilter

  // For demo/testing
  REACT_APP_USE_PUBLIC_WEBAPI_PROXY: "true",
  REACT_APP_PUBLIC_WEBAPI_DATASOURCE: "SYNPUF1K",
};
```

### Key Configuration Files

#### Atlas Criteria Config

**File:** `query-filter/config/atlas-config.json`

Defines available criteria types and their attributes. Example:

```json
{
  "ConditionOccurrence": {
    "displayName": "Condition",
    "icon": "condition",
    "attributes": [
      {
        "id": "Age",
        "type": "numericRange",
        "label": "Age",
        "category": "Demographics"
      },
      {
        "id": "Gender",
        "type": "conceptSet",
        "label": "Gender",
        "domain": "Gender"
      }
    ]
  }
}
```

Add new criteria types or attributes by editing this file.

#### Navigation Config

**File:** `apps/vue-mri-ui-lib/src/utils/config.ts` (or equivalent)

Registers single-spa applications:

```typescript
{
  apps: [
    {
      appName: "concept-sets",
      importUrl: "http://localhost:8080/concept-sets/main.js",
      route: "/concepts",
      alwaysActive: false, // Only mount when route matches
    },
  ];
}
```

### File Structure Reference

```
apps/
├── vue-mri-ui-lib/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Bookmarks.vue         # Cohort list
│   │   │   ├── PatientAnalytics.vue  # Main orchestrator
│   │   │   └── ...
│   │   ├── query-filter/
│   │   │   ├── components/
│   │   │   │   ├── QueryFilterModern.vue  # Main cohort builder
│   │   │   │   ├── QueryFilterCriteria.vue
│   │   │   │   ├── QueryFilterEventCard.vue
│   │   │   │   └── ...
│   │   │   ├── models/
│   │   │   │   └── QueryFilterModel.ts  # State manager
│   │   │   ├── services/
│   │   │   │   └── D2eWebapiService.ts  # API client
│   │   │   ├── utils/
│   │   │   │   ├── AtlasConverter.ts  # Atlas ↔ UI conversion
│   │   │   │   └── ...
│   │   │   ├── types/
│   │   │   │   ├── AtlasTypes.ts
│   │   │   │   ├── QueryFilterTypes.ts
│   │   │   │   └── ConceptSetTypes.ts
│   │   │   ├── config/
│   │   │   │   └── atlas-config.json  # Criteria definitions
│   │   │   ├── mock-server/
│   │   │   │   ├── server.js          # Mock server
│   │   │   │   ├── mock-routes.js     # Mock API routes
│   │   │   │   └── README.md          # Mock server docs
│   │   │   └── README.md              # Query-filter docs
│   │   ├── store/
│   │   │   └── modules/
│   │   │       ├── bookmark.ts
│   │   │       └── cohortDefinition.ts
│   │   └── utils/
│   │       └── AppRegistry.ts         # Single-SPA loader
│   └── public/
│       └── index.html                 # Dev config
│
└── concept-sets/
    ├── src/
    │   ├── App.tsx                    # Entry point
    │   ├── lifecycles.tsx             # Single-SPA lifecycle
    │   ├── ConceptSets/
    │   │   └── ConceptSets.tsx        # Main interface
    │   ├── Terminology/
    │   │   ├── Terminology.tsx        # Search/selection
    │   │   └── TerminologyWithEventListener.tsx
    │   ├── context/
    │   │   └── ConceptSetsContext.tsx # React context
    │   ├── axios/
    │   │   ├── api.ts                 # API aggregator
    │   │   └── d2e-webapi.ts          # WebAPI client
    │   └── types/
    │       └── portal.ts              # PortalProps interface
    └── vite.config.ts                 # Build config
```

### Testing

#### Unit Tests

**Query-Filter:**

```bash
cd apps/vue-mri-ui-lib
npm run test:unit
# Tests located in src/query-filter/__tests__/
```

**Concept Sets:**

```bash
cd apps/concept-sets
npm run test
```

#### Integration Testing

Use mock server to test full workflows:

1. Start mock server
2. Open in browser
3. Test cohort creation, editing, saving
4. Verify Atlas JSON output in debug panel (`debug: true`)

### Debugging

**Enable Debug Mode:**

In `public/index.html`:

```javascript
portalAPI.debug = true;
```

Shows in QueryFilterModern:

- Current criteria JSON
- Atlas JSON output
- Concept set details
- Copy to clipboard buttons

**Vue DevTools:**

- Inspect Vuex state
- View component hierarchy
- Monitor events

**React DevTools:**

- Inspect Context values
- View component props/state

---

## 8. Integration Points & Data Flow

### Bookmarks → QueryFilter Integration

**Trigger:** User clicks Atlas cohort in bookmark list

**Flow:**

```
Bookmarks.vue:loadAtlasBookmark(atlasDefinitionId)
│
├─ Dispatch: fireGetAtlasCohortDefinitionQuery(atlasDefinitionId)
│  └─ GET /d2e-webapi/cohortdefinition/{id}
│     └─ Returns: Atlas JSON
│
├─ Create bookmark object: { bookmarkname, bmkId, isAtlas: true, isNew: false }
│
├─ Commit: SET_ACTIVE_BOOKMARK(bookmark)
│
├─ Emit: @loadAtlasCohortDefinition(atlasJson)
│  └─ PatientAnalytics.vue receives event
│     └─ Sets: atlasDataForQueryFilter = atlasJson
│        └─ Passed to: <QueryFilter :atlas-data="atlasDataForQueryFilter" />
│
└─ Emit: @unloadBookmarkEv(false, true)
   └─ PatientAnalytics.vue:toggleCohorts(showCohorts=false, useQueryFilter=true)
      └─ Sets: showQueryFilter = true (displays QueryFilter instead of legacy Filters)
```

**File References:**

- Bookmarks.vue:344-373 - loadAtlasBookmark method
- PatientAnalytics.vue:39-42 - Event handler
- PatientAnalytics.vue:50 - QueryFilter component with atlas-data prop

### QueryFilter → Concept Sets Modal Integration

**Trigger:** User clicks concept set field or pencil icon

**Flow:**

```
QueryFilterModern.vue:handleConceptSetAction({...})
│
├─ Determine mode: CONCEPT_SET or CONCEPT_MULTI_SELECT
│
├─ Build event payload:
│  {
│    selectedConceptSetId: conceptSetId (if editing),
│    selectedDatasetId: currentDatasetId,
│    mode: 'CONCEPT_SET' | 'CONCEPT_MULTI_SELECT',
│    defaultFilters: [domain, standard concept filters],
│    initialSelectedConcepts: existingConcepts (for multi-select),
│    onClose: handleCloseCallback
│  }
│
├─ Dispatch CustomEvent:
│  window.dispatchEvent(new CustomEvent('alp-terminology-open', {
│    detail: { props: eventPayload }
│  }))
│
└─ React App Receives Event:
   TerminologyWithEventListener.tsx:useEffect
   │
   ├─ Opens Terminology modal with props
   │
   └─ On modal close:
      User clicks Save/Done
      │
      ├─ If CONCEPT_SET mode:
      │  - Creates/updates concept set via WebAPI
      │  - Calls onClose({ currentConceptSet: { id, name } })
      │
      └─ If CONCEPT_MULTI_SELECT mode:
         - Calls onClose({ selectedConcepts: [...] })

      Both trigger:
      handleCloseCallback in QueryFilterModern.vue
      │
      ├─ Reload concept sets from WebAPI
      ├─ Find complete concept set with all details
      ├─ Update selectedConceptSets state
      └─ Update specific event/attribute in criteria
```

**File References:**

- QueryFilterModern.vue:409-634 - handleConceptSetAction method
- TerminologyWithEventListener.tsx:50-80 - Event listener setup

### Full-Screen Mode

**Activation:**

Set `usePaAtlas: true` in configuration:

```javascript
getMriFrontendConfig._internalConfig.panelOptions.usePaAtlas = true;
```

**Effect:**

PatientAnalytics.vue:

- Shows QueryFilter instead of legacy Filters
- Hides chart toolbar and visualization
- Focuses on cohort definition only

**Implementation:**

```vue
<!-- PatientAnalytics.vue -->
<filters
  v-if="!showQueryFilter && !displayCohorts"
  :class="{ hidden: displayCohorts }"
></filters>

<QueryFilter
  v-else-if="showQueryFilter"
  :atlas-data="atlasDataForQueryFilter"
/>
```

### Cohort Generation Integration

**Trigger:** User clicks "Generate Cohort" button

**Flow:**

```
QueryFilterModern.vue:generateCohort()
│
├─ Get active bookmark ID
│
├─ Dispatch: fireCreateAtlasMaterializedCohortQuery({
│    url: `/d2e-webapi/cohortdefinition/${bmkId}/generate/${datasetId}`
│  })
│  └─ POST request triggers backend cohort generation
│     - Executes SQL based on cohort definition
│     - Creates cohort table with patient IDs
│     - Returns patient count
│
└─ Display patient count in UI
   patientCount.value = response.patientCount
```

**Backend Process:**

1. Retrieve cohort definition JSON
2. Translate to OMOP SQL queries
3. Execute against selected dataset
4. Store results in cohort table
5. Return statistics

### Save Flow Detail

**Trigger:** User clicks "Save" button

**Cohort Name Validation:**

- **PA-Atlas Mode (isAtlas: true):** No character limit for cohort names
- **D2E Portal Mode:** 40-character limit enforced for legacy compatibility

**Complete Flow:**

```
QueryFilterModern.vue:saveAtlasCohort()
│
├─ Validate cohort name
│  - Check for empty name
│  - Check character limit (only in D2E Portal mode)
│
├─ Call: criteriaManager.convertToAtlasFormat()
│  QueryFilterModel.ts:convertToAtlasFormat()
│  │
│  ├─ Collect all concept sets from criteria
│  ├─ Build concept set ID mappings
│  ├─ Convert entry events → PrimaryCriteria
│  ├─ Convert criteria groups → InclusionRules
│  ├─ Convert exit events → CensoringCriteria/EndStrategy
│  └─ Return complete Atlas JSON
│
├─ Build cohort definition object:
│  {
│    id: bmkId (0 for new cohorts),
│    name: cohortName,
│    description: '...',
│    expressionType: 'SIMPLE_EXPRESSION',
│    expression: atlasExpression,
│    createdBy: username,
│    createdDate: timestamp,
│    ...
│  }
│
├─ Determine create vs update:
│  IF isNew:
│    ├─ Dispatch: fireCreateAtlasCohortDefinitionQuery({ content })
│    │  POST /d2e-webapi/cohortdefinition
│    │  └─ Returns: { id: newCohortId, ... }
│    └─ Update bookmark with new ID
│       SET_ACTIVE_BOOKMARK({ ...bookmark, bmkId: newCohortId, isNew: false })
│  ELSE:
│    └─ Dispatch: fireUpdateAtlasCohortDefinitionQuery({ content })
│       PUT /d2e-webapi/cohortdefinition/{id}
│
└─ Close save dialog, show success message
```

**File References:**

- QueryFilterModern.vue:653-733 - saveAtlasCohort method
- QueryFilterModel.ts:184-480 - convertToAtlasFormat implementation
- cohortDefinition.ts:58-97 - fireCreateAtlasCohortDefinitionQuery action

---

## Appendix: Common Tasks & Troubleshooting

### Adding a New Criteria Type

1. Edit `query-filter/config/atlas-config.json`
2. Add criteria type definition with attributes
3. Update `AtlasConverter.ts` conversion logic if needed
4. Add TypeScript types in `AtlasTypes.ts`
5. Test round-trip conversion (UI → Atlas → UI)

### Adding a New Attribute

1. Add to criteria definition in `atlas-config.json`
2. Update attribute input component if custom UI needed
3. Add conversion logic in `AtlasConverter.ts`
4. Update TypeScript types

### Debugging Atlas Conversion Issues

1. Enable debug mode (`portalAPI.debug = true`)
2. Build cohort in UI
3. Click "Copy" button for Atlas JSON in debug panel
4. Validate against OHDSI Atlas JSON schema
5. Check browser console for conversion errors
6. Review `AtlasConverter.ts` for type-specific logic

### Mock Server Not Starting

```bash
# Ensure dependencies installed
cd apps/vue-mri-ui-lib/src/query-filter/mock-server
npm install

# Check port availability
lsof -i :3131  # or configured port

# Try different port
SERVER_URL=http://localhost:3001 npm start
```

### Concept Sets Not Loading

1. Check browser network tab for failed API calls
2. Verify datasetId is set correctly
3. Check WebAPI endpoint availability
4. Confirm authentication token is valid
5. Review console for CORS errors

### Single-SPA Loading Issues

1. Check import map in browser DevTools (Sources → systemjs-importmap)
2. Verify concept-sets URL is accessible
3. Check browser console for loading errors
4. Confirm single-spa is started (`start()` called)
5. Verify route matches `activeWhen` condition

---

## Recent Updates

### 2025-10-06: Clean Architecture - Normalized Internal Format (operator/value)

**Issue**: The system had mixed representations causing type confusion:

1. Incorrectly included `attributeType: 'numericRange'` and `attributeType: 'conceptSet'` as discriminated union variants
2. UI components used Atlas format `{ Op, Value }` while internal state used `{ operator, value }`
3. Data transformation happened inconsistently, mixing string and object forms

**Solution**: **Normalize at boundaries** - Convert Atlas ↔ Internal format only at import/export boundaries:

- **Import**: Atlas `{ Op: 'gt', Value: 18 }` → Internal `{ operator: 'GREATER_THAN', value: '18' }`
- **UI Layer**: Always uses Internal format `{ operator, value, extent? }`
- **Export**: Internal `{ operator: 'GREATER_THAN', value: '18' }` → Atlas `{ Op: 'gt', Value: 18 }`

**Changes Made**:

1. **Type Definition Redesign** ([QueryFilterTypes.ts:50-111](apps/vue-mri-ui-lib/src/query-filter/types/QueryFilterTypes.ts#L50-L111))

   - Removed `attributeType: 'numericRange'` and `attributeType: 'conceptSet'` variants
   - Removed `NumericRange` and `DateRange` imports (no longer needed)
   - **Proper Discriminated Union**: Now uses two-level discrimination:
     - First level: `attributeType: 'nested' | 'standard'`
     - Second level (for `'standard'`): `configType` discriminates between:
       - `'numericRange'` - Has `operator?: string, value?: string, extent?: string` (all strings)
       - `'conceptSet'` - Has `conceptSet?`, `conceptSetId?`, `conceptItems?`
       - `'concept'` - Has `domainFilter?`, `conceptItems?`
       - `'dateRange'` - Has `operator?: string, value?: string, extent?: string` (all strings)
       - Generic fallback - Has all optional fields for extensibility
   - **Type Safety**: Each `configType` variant has only the fields it needs, preventing field confusion
   - **No more union types**: `value` is always `string`, never an object

2. **AtlasConverter Fixes** ([AtlasConverter.ts](apps/vue-mri-ui-lib/src/query-filter/utils/AtlasConverter.ts))

   - Line 366: Changed Age attribute creation from `attributeType: 'numericRange'` → `attributeType: 'standard', configType: 'numericRange'`
   - Line 163: Changed concept set attributes from `attributeType: 'conceptSet'` → `attributeType: 'standard', configType: 'conceptSet'`
   - `convertConceptSetArrayToAttribute`: Now consistently uses `attributeType: 'standard'` with appropriate `configType`

3. **Component Fixes** ([QueryFilterEventCard.vue:277](apps/vue-mri-ui-lib/src/query-filter/components/QueryFilterEventCard.vue#L277))

   - Updated `handleAttributeConceptSetSelected` to check for `attributeType === 'standard' && configType === 'conceptSet'`

4. **Event Transformer Fixes** ([event-transformer.ts](apps/vue-mri-ui-lib/src/query-filter/models/modules/event-transformer.ts))

   - Line 52: Added `configType === 'numericRange'` to condition
   - Line 74: Updated age attribute check to use `attributeType === 'standard' && configType === 'numericRange'`

5. **Type Guards Enhancement** ([type-guards.ts](apps/vue-mri-ui-lib/src/query-filter/models/modules/type-guards.ts))

   - Updated type guards to use `Extract<QueryFilterAttribute, {...}>` for proper type narrowing
   - `isNumericRangeAttribute()`: Narrows to the exact `numericRange` discriminated union variant
   - `isConceptSetAttribute()`: Narrows to the exact `conceptSet` discriminated union variant
   - `isConceptAttribute()`: Narrows to the exact `concept` discriminated union variant
   - `isDateRangeAttribute()`: New guard for `dateRange` variant
   - **TypeScript IntelliSense**: Now properly shows only the available fields for each variant

6. **NumericRangeInput Component** ([NumericRangeInput.vue](apps/vue-mri-ui-lib/src/query-filter/components/attributes/NumericRangeInput.vue))

   - **Changed props**: Now accepts `operator?: string, value?: string` (internal format)
   - **Added converters**: `internalToAtlasOperator()` and `atlasToInternalOperator()` for dropdown compatibility
   - **Emits internal format**: `{ operator: 'GREATER_THAN', value: '18', extent?: '25' }`
   - **Dropdown still uses Atlas format** (`lt`, `gt`, etc.) for `numericRangeOptions` compatibility

7. **AttributeContainer** ([AttributeContainer.vue:62](apps/vue-mri-ui-lib/src/query-filter/components/attributes/AttributeContainer.vue#L62))

   - Now passes both `:value` and `:operator` props to child components

8. **QueryFilterEventCard** ([QueryFilterEventCard.vue:251-266](apps/vue-mri-ui-lib/src/query-filter/components/QueryFilterEventCard.vue#L251-L266))

   - `updateAttribute` now spreads payload: `{ ...attr, ...payload }`
   - Properly updates all fields (`operator`, `value`, `extent`) from UI components

9. **Nested Criteria Processor Simplification** ([nested-criteria-processor.ts](apps/vue-mri-ui-lib/src/query-filter/models/modules/nested-criteria-processor.ts))

   - Lines 279-290: Simplified - always converts internal → Atlas format
   - Lines 308-316: Same simplification for dateRange
   - Removed all `typeof attr.value === 'object'` checks (no longer needed)
   - Removed all `as any` workarounds
   - **Clean conversion**: `{ Op: mapOperatorToAtlas(attr.operator), Value: parseInt(attr.value) }`

10. **Test Data Updates** ([sample6-input.ts](apps/vue-mri-ui-lib/src/query-filter/__tests__/data/sample6-input.ts))
    - Updated test data to use `attributeType: 'standard', configType: 'numericRange'`

**Implementation Details**:

- **Clear Boundaries**: Conversion happens only at import (AtlasConverter) and export (nested-criteria-processor)
- **Single Representation**: UI layer always works with internal format `{ operator, value, extent? }`
- **No Mixed State**: Eliminated the dual string/object representation problem
- **Discriminated Union Pattern**: Uses TypeScript's discriminated unions at two levels for precise type narrowing
- **Type Safety**: Each `configType` variant has its own distinct shape, preventing field confusion
  - Can't accidentally access `conceptSet` on a `numericRange` attribute
  - Can't access `domainFilter` on a `conceptSet` attribute
- **IntelliSense Support**: TypeScript autocomplete shows only valid fields for each variant
- **Generic Fallback**: Last union variant handles any new `configType` values for extensibility
- **Type Guards**: Use `Extract<>` utility type to properly narrow to specific variants

**Impact**:

- ✅ **Clean architecture**: Clear separation between Atlas format and internal format
- ✅ **Eliminates type confusion**: No more union types (`string | NumericRange`)
- ✅ **Simpler code**: Export logic no longer needs runtime type checks
- ✅ **Prevents bugs**: TypeScript catches incorrect field access at compile time
- ✅ **Fixes runtime bugs**: DateRange values correctly handled throughout the flow
- ✅ **Removes unsafe casts**: No more `as any` workarounds needed
- ✅ **Better IDE support**: IntelliSense shows only valid fields after type narrowing
- ✅ **Maintainable**: Conversion logic centralized at boundaries
- ✅ **All tests pass**: 143/143 tests passing

---

### 2025-10-06: Demographic Criteria in Nested Attributes Fix (Fully Generic)

**Issue**: Demographic criteria in nested attributes within entry events were not being saved or loaded correctly. Only Age was handled, and other attribute types (Gender, Race, dateRange) were ignored.

**Changes Made**:

1. **Export Enhancement** ([nested-criteria-processor.ts](apps/vue-mri-ui-lib/src/query-filter/models/modules/nested-criteria-processor.ts))

   - Refactored to handle **all demographic attribute types generically**:
     - `configType: 'numericRange'` (Age)
     - `configType: 'concept'` (Gender, Race, Ethnicity, RaceConcept, etc.)
     - `configType: 'dateRange'` (StartDate, EndDate)
   - Uses `getAtlasAttributeKey()` from `AtlasAttributeLookup` for proper field name mapping
   - Applied to both `buildNestedCriteriaFromAttributes` (lines 352-394) and `processNestedGroupsRecursively` (lines 268-310)
   - **Zero hardcoding**: works for any attribute type and any new attributes added to config

2. **Import Enhancement** ([AtlasConverter.ts](apps/vue-mri-ui-lib/src/query-filter/utils/AtlasConverter.ts))
   - Enhanced CorrelatedCriteria processing (lines 417-462) to handle `DemographicCriteriaList`
   - Converts all demographic criteria types from Atlas JSON back to UI events
   - Uses `convertConceptSetArrayToAttribute` with config loader for generic concept mapping
   - Handles Age (NumericRange), Gender/Race (Concept[]), and dates (DateRange)

**Implementation Details**:

- **Type Guard** ([type-guards.ts:13-25](apps/vue-mri-ui-lib/src/query-filter/models/modules/type-guards.ts#L13-L25))
  - `isNumericRangeAttribute()` checks for `attributeType: 'standard'` with `configType: 'numericRange'`
  - Centralizes attribute type detection logic in one place
- **Attribute Lookup Table**: Uses `AtlasAttributeLookup.attributeMap.DemographicCriteria` for field name mapping
  - `age` → `Age` (NumericRange)
  - `gender` → `Gender` (Concept[])
  - `startDate` → `OccurrenceStartDate` (DateRange)
  - `endDate` → `OccurrenceEndDate` (DateRange)
- **Type-Based Handling**: Automatically detects attribute `configType` (numericRange, concept, dateRange) and applies appropriate conversion
- **Config-Driven**: Works with any attribute defined in `attributeMapping.demographic[]` in `atlas-config.json`
- **Type-Safe**: Uses `Record<string, unknown>` instead of `any` for dynamic property assignment

**Impact**:

- ✅ Full round-trip conversion for **all** demographic attribute types
- ✅ No special cases or hardcoded attribute handling
- ✅ Future-proof: new attributes work automatically when added to config and lookup table

---

### 2025-10-06: Extent vs extent Case Normalization

**Issue**: Mixed use of Atlas format (uppercase `Extent`) and internal format (lowercase `extent`) throughout the codebase, violating the "normalize at boundaries" pattern.

**Root Cause**: Legacy code from before the normalized architecture was established. Some code paths were storing Atlas format `{ Op, Value, Extent }` objects directly in the internal state, while other code expected internal format `{ operator, value, extent }`.

**Changes Made**:

1. **AtlasConverter.ts Import Fixes** - All numericRange and dateRange conversions now convert from Atlas → Internal format:

   - Lines 455-470: NumericRange import converts `{ Op, Value, Extent }` → `{ operator, value, extent }`
   - Lines 482-497: DateRange import converts `{ Op, Value, Extent }` → `{ operator, value, extent }`
   - Lines 624-639: Duplicate numericRange section (for InclusionRules) fixed
   - Lines 651-666: Duplicate dateRange section fixed

2. **QueryFilterModel.ts Export Fixes** - Conversion from internal → Atlas format:

   - Lines 494-505: NumericRange export converts `{ operator, value, extent }` → `{ Op, Value, Extent }`
   - Lines 522-530: DateRange export converts `{ operator, value, extent }` → `{ Op, Value, Extent }`

3. **nested-criteria-processor.ts Cleanup** - Removed old dead code:
   - Lines 385-386: Removed legacy check for Atlas format objects in `value` field
   - Now always uses internal format and converts to Atlas at export

**Implementation Details**:

- **Import Boundary** ([AtlasConverter.ts](apps/vue-mri-ui-lib/src/query-filter/utils/AtlasConverter.ts)): Reads `Extent` from Atlas JSON, stores as `extent` in internal state
- **Internal Format**: All code uses lowercase `extent` field
- **Export Boundary** ([nested-criteria-processor.ts](apps/vue-mri-ui-lib/src/query-filter/models/modules/nested-criteria-processor.ts), [QueryFilterModel.ts](apps/vue-mri-ui-lib/src/query-filter/models/QueryFilterModel.ts)): Converts `extent` → `Extent` when creating Atlas JSON

**Impact**:

- ✅ Consistent case usage: `Extent` only in Atlas format, `extent` only in internal format
- ✅ Removed mixed representations: no more objects stored in `value` field
- ✅ Simplified code: removed runtime type checks for `typeof value === 'object'`
- ✅ All 143/143 tests passing

---

### 2025-10-06: Known Inconsistencies - String and DateAdjustment Attributes

**Issue**: Not all attribute input components use normalized internal format. Some still use Atlas format (uppercase keys).

**Current State**:

**Normalized (Internal Format):**

- ✅ `NumericRangeInput.vue` - emits `{ operator: string, value: string, extent?: string }`
- ✅ `DateInput.vue` - emits `{ operator: string, value: string, extent?: string }`

**Not Normalized (Atlas Format):**

- ⚠️ `StringInput.vue` - emits `{ Op: string, Text: string }`
- ⚠️ `DateAdjustmentInput.vue` - emits `{ StartWith: string, StartOffset: number, EndWith: string, EndOffset: number }`

**Why Not Fixed**:

These attribute types (`text` and `dateAdjustment`) are **not currently handled in the Atlas import/export pipeline**. They are not converted in:

- [AtlasConverter.ts](apps/vue-mri-ui-lib/src/query-filter/utils/AtlasConverter.ts) - No import logic
- [nested-criteria-processor.ts](apps/vue-mri-ui-lib/src/query-filter/models/modules/nested-criteria-processor.ts) - No export logic

They are stored as-is in the internal state and not included in Atlas JSON output, suggesting they may be:

1. Legacy attributes not part of the OHDSI Atlas specification
2. D2E-specific extensions
3. Partially implemented features

**Type Documentation**:

The mixed format is documented in [QueryFilterEventCard.vue:30-34](apps/vue-mri-ui-lib/src/query-filter/components/QueryFilterEventCard.vue#L30-L34):

```typescript
type AttributeUpdatePayload =
  | { operator: string; value: string; extent?: string } // NumericRange, DateRange (internal format)
  | { Op: string; Text: string } // String (Atlas format - not yet normalized)
  | {
      StartWith: string;
      StartOffset: number;
      EndWith: string;
      EndOffset: number;
    }; // DateAdjustment (Atlas format - not yet normalized)
```

**Future Work**:

To normalize these attributes:

1. **Define Internal Format**:

   - String: `{ operator: string, text: string }` (e.g., `operator: 'startsWith'`)
   - DateAdjustment: `{ startWith: string, startOffset: number, endWith: string, endOffset: number }`

2. **Update Components**:

   - [StringInput.vue](apps/vue-mri-ui-lib/src/query-filter/components/attributes/StringInput.vue) - Change props/emit to internal format
   - [DateAdjustmentInput.vue](apps/vue-mri-ui-lib/src/query-filter/components/attributes/DateAdjustmentInput.vue) - Change props/emit to internal format

3. **Add Conversion Logic** (if needed for Atlas compatibility):
   - Add import logic in AtlasConverter.ts to convert from Atlas → internal
   - Add export logic in nested-criteria-processor.ts to convert from internal → Atlas

**Recommendation**: Leave as-is until these attributes need to be included in Atlas JSON import/export, then apply the same "normalize at boundaries" pattern used for NumericRange and DateRange.

---

### 2025-10-06: Groups Not Being Saved/Loaded Fix

**Issue**: Groups were disappearing during save/load cycles. When users created groups within InclusionRules, they would not persist after saving and reloading the cohort definition. The group container would appear but nested events inside were missing.

**Root Cause Investigation**: Added comprehensive logging to track groups through the save/load pipeline and discovered **THREE separate bugs**.

**Actual Root Causes**:

1. **LOAD BUG #1 (Critical)**: **`transformEvents()` was stripping out `nestedCriteria`**

   - In [event-transformer.ts:13-25](apps/vue-mri-ui-lib/src/query-filter/models/modules/event-transformer.ts#L13-L25), when creating the transformed event object, only specific fields were copied
   - **`nestedCriteria` was NOT in the list of copied fields**
   - This happened in the `QueryFilterCriteriaManager` constructor after Atlas JSON was converted to events
   - Result: Group events loaded but their `nestedCriteria` was undefined, causing the fallback to create empty groups

2. **LOAD BUG #2 (Major)**: **Groups were never being converted back to events during load!**

   - In [AtlasConverter.ts](apps/vue-mri-ui-lib/src/query-filter/utils/AtlasConverter.ts), the code processed `CriteriaList` and `DemographicCriteriaList` from InclusionRules
   - **BUT there was NO CODE to process `expression.Groups` at all**
   - Groups in the Atlas JSON were completely ignored during load

3. **SAVE BUG (Minor)**: Empty groups were being filtered out during save
   - Multiple filter operations removed groups with empty arrays
   - According to the Atlas JSON spec, all arrays in `GroupCriteria` are optional

**Changes Made**:

1. **AtlasConverter.ts - LOAD Fix** ([AtlasConverter.ts:700-733](apps/vue-mri-ui-lib/src/query-filter/utils/AtlasConverter.ts#L700-L733))

   **Added missing code** to process `expression.Groups` during InclusionRules load:

```typescript
// NEW CODE - Handle Groups during load
if (rule.expression?.Groups && rule.expression.Groups.length > 0) {
  rule.expression.Groups.forEach((groupCriteria) => {
    const groupEvent: QueryFilterEvent = {
      id: `event_${Math.random().toString(36).substring(2)}`,
      conceptSet: "Group",
      eventType: "group",
      isExpanded: true,
      nestedCriteria: {
        id: `nested_${Math.random().toString(36).substring(2)}`,
        criteriaType: groupCriteria.Type || "ALL",
        events: convertCriteriaListToEvents(
          groupCriteria.CriteriaList,
          groupCriteria.Type
        ),
      },
    };
    criteriaItem.events.push(groupEvent);
  });
}
```

2. **QueryFilterModel.ts - SAVE Fix** - Removed empty group filters at 4 locations:

   - Line 541: InclusionRules Groups array
   - Line 427: Entry event CorrelatedCriteria Groups
   - Line 580: Exit event CorrelatedCriteria Groups
   - Line 669: Entry event PrimaryCriteria CorrelatedCriteria Groups

3. **nested-criteria-processor.ts - SAVE Fix** - Removed empty group filters at 4 locations:
   - Line 119: `processNestedGroups` CorrelatedCriteria Groups
   - Line 247: `processNestedGroupsRecursively` CorrelatedCriteria Groups
   - Line 328: `processNestedGroupsRecursively` group creation
   - Line 526: `buildNestedCriteriaFromAttributes` CorrelatedCriteria Groups

All filter patterns like this were removed:

```typescript
// Before (filtered out empty groups)
Groups: groupsList.filter(
  (group) =>
    group.CriteriaList.length > 0 ||
    group.DemographicCriteriaList.length > 0 ||
    group.Groups.length > 0
);

// After (preserves all groups)
Groups: groupsList;
```

4. **Added Comprehensive Logging** for debugging:
   - `QueryFilterModel.ts`: Logs group structure during SAVE
   - `nested-criteria-processor.ts`: Logs `processNestedGroups` operations
   - `AtlasConverter.ts`: Logs Groups during LOAD

**Impact**:

- ✅ **Groups now load correctly from Atlas JSON** (PRIMARY FIX - this was the main issue)
- ✅ Empty groups preserved during save (SECONDARY FIX)
- ✅ Groups round-trip correctly through save/load cycles
- ✅ Logical group structure is preserved
- ✅ Aligns with Atlas JSON spec where all group arrays are optional
- ✅ All 143 existing tests pass
- ✅ Comprehensive logging added for future debugging

**Known Limitations**:

- Recursive nested groups within groups not yet implemented (TODO at line 728)
- DemographicCriteriaList within groups not yet implemented (TODO at line 727)

---

### 2025-10-07: CONT_DRUG Concept Set Not Saving/Loading Fix

**Issue**: When selecting a concept set for "Continuous drug exposure" in Cohort Exit, the concept set would not save or load correctly. Users could select a concept set, but after saving and reloading the cohort, the selection would be lost.

**Root Causes**:

1. **Component State Not Initialized** ([QueryFilterEntryExit.vue:172-175](apps/vue-mri-ui-lib/src/query-filter/components/QueryFilterEntryExit.vue#L172-L175))

   - Local refs (`selectedConceptSet`, `selectedGapDays`, etc.) were initialized with hardcoded defaults
   - Never synchronized with `exitCriteriaData.contDrugSettings` prop when loading data
   - Result: Loaded data was ignored, defaults always used

2. **Missing Concept Set Details** ([QueryFilterModel.ts:299-325](apps/vue-mri-ui-lib/src/query-filter/models/QueryFilterModel.ts#L299-L325))
   - Only stored concept set ID, not the full concept set details and name
   - During save, the concept set wasn't added to the `ConceptSets` array in Atlas JSON
   - Result: Concept set ID saved but referenced a non-existent concept set

**Changes Made**:

1. **QueryFilterEntryExit.vue - Component Initialization**

   - Added `onMounted` and `watch` hooks to initialize local refs from `exitCriteriaData.contDrugSettings`
   - Lines 177-221: Added `initializeContDrugSettings()` function
   - Watches for changes to `exitCriteriaData.contDrugSettings` and `conceptSets` props
   - Re-initializes when concept sets become available (they may load after component mounts)

2. **QueryFilterTypes.ts - Type Definition Update**

   - Lines 132-139: Added `conceptSet` and `conceptSetDetails` fields to `contDrugSettings`
   - Follows same pattern as `QueryFilterEvent` (conceptSet, conceptSetId, conceptSetDetails)
   - Stores complete concept set information, not just ID

3. **QueryFilterModel.ts - Concept Set Collection**

   - Lines 299-325: Added logic to collect CONT_DRUG concept set into `ConceptSets` array
   - Checks for `contDrugSettings.conceptSetId` and includes it with name and details
   - Adds to missing concept details warning if details not available

4. **useCriteriaManager.ts - Fetch Concept Set Details**

   - Lines 101-131: Updated `handleUpdateContDrugSettings` to be async
   - Fetches concept set details using `loadSingleConceptSetDetails`
   - Passes complete concept set data (ID, name, details) to model

5. **QueryFilterModel.ts - Update Method Signature**

   - Lines 890-906: Updated `updateContDrugSettings` to accept name and details
   - Stores all three fields in `contDrugSettings`

6. **QueryFilterEntryExit.vue - Emit Updates**
   - Lines 41-47, 71-78, 288-297: Updated emits to include concept set name
   - Ensures name is passed alongside ID when settings change

**Implementation Details**:

- **Load Flow**: Atlas JSON → `contDrugSettings` (with ID/name/details) → Component props → Local refs initialized → Tag input displays selection
- **Save Flow**: User selects concept set → Fetch details → Store in `contDrugSettings` → Include in `ConceptSets` array → Build `CustomEra` with `DrugCodesetId`
- **Synchronization**: Component watches props and re-initializes when data changes or concept sets load
- **Type Safety**: TypeScript types updated to reflect new fields

**Impact**:

- ✅ CONT_DRUG concept set selection now persists through save/load cycles
- ✅ Concept set properly included in Atlas JSON `ConceptSets` array
- ✅ Component initializes with loaded data instead of defaults
- ✅ Full round-trip conversion working (UI → Atlas → UI)
- ✅ Handles async concept set loading (when concept sets load after component mounts)

---

### 2025-10-07: Fixed Duration Settings Not Saving/Loading Fix

**Issue**: When selecting "Fixed duration to initial event" in Cohort Exit, the event date offset (StartDate/EndDate) and number of days offset would not persist through save/load cycles. Users could change these values, but after saving and reloading the cohort, the settings would revert to defaults (StartDate, 30 days).

**Root Cause**: Same issue as the CONT_DRUG fix - component state was not initialized from props.

1. **Component State Not Initialized** ([QueryFilterEntryExit.vue:149-150](apps/vue-mri-ui-lib/src/query-filter/components/QueryFilterEntryExit.vue#L149-L150))
   - Local refs (`selectedEventDateOffset`, `selectedDaysOffset`) were initialized with hardcoded defaults
   - Never synchronized with `exitCriteriaData.fixedDuration` prop when loading data
   - Result: Loaded data was ignored, defaults always used

**Changes Made**:

1. **QueryFilterEntryExit.vue - Component Initialization**

   - Added `initializeFixedDurationSettings()` function (lines 153-159)
   - Initializes local refs from `exitCriteriaData.fixedDuration` prop
   - Follows same pattern as CONT_DRUG settings initialization

2. **QueryFilterEntryExit.vue - Lifecycle Hooks**
   - Updated `onMounted` to call `initializeFixedDurationSettings()` (line 219)
   - Added watcher for `exitCriteriaData.fixedDuration` changes (lines 223-230)
   - Re-initializes when data changes or becomes available

**Implementation Details**:

- **Load Flow**: Atlas JSON → `fixedDuration` (with dateField/offset) → Component props → Local refs initialized → Dropdowns display selections
- **Save Flow**: User changes dropdown → `updateEventDateOffset` or `updateDaysOffset` → Emits `update-fixed-duration` → `handleUpdateFixedDuration` → Stored in model → Included in Atlas JSON `EndStrategy.DateOffset`
- **Synchronization**: Component watches props and re-initializes when data changes
- **Type Safety**: TypeScript types already defined in `QueryFilterTypes.ts`

**Impact**:

- ✅ Fixed duration settings now persist through save/load cycles
- ✅ Settings properly included in Atlas JSON `EndStrategy.DateOffset` structure
- ✅ Component initializes with loaded data instead of hardcoded defaults
- ✅ Full round-trip conversion working (UI → Atlas → UI)
- ✅ Follows same initialization pattern as CONT_DRUG settings

---

### 2025-10-08: Groups Being Split During Save/Load Fix

**Issue**: When users created a single group containing multiple criteria (e.g., Condition Occurrence + Condition Era), after saving and reloading the cohort, the single group would be split into multiple separate groups, each containing only one criterion.

**Example:**

```
User creates: Group { Condition Occurrence, Condition Era }
SAVE produced: Groups[0] = { CriteriaList: [Condition Occurrence] }
               Groups[1] = { CriteriaList: [Condition Era] }
LOAD showed:   Group 1 containing only Condition Occurrence
               Group 2 containing only Condition Era
```

**Root Cause**: In [nested-criteria-processor.ts:77-201](apps/vue-mri-ui-lib/src/query-filter/models/modules/nested-criteria-processor.ts#L77-L201), the `processNestedGroups()` function had a critical bug:

1. **Incorrect Loop Pattern** (lines 94-196):

   - Looped through EACH event in the group separately
   - Created a NEW `GroupCriteria` for EACH individual event (lines 138-144)
   - Each iteration pushed a separate group to results (line 194)

2. **Result**: 1 group with N events → N separate groups with 1 event each

**The Correct Pattern** (from `processNestedGroupsRecursively`):

- Collect ALL events into arrays FIRST
- Create ONE group containing ALL collected events

**Changes Made**:

1. **Rewrote `processNestedGroups()` function** ([nested-criteria-processor.ts:77-240](apps/vue-mri-ui-lib/src/query-filter/models/modules/nested-criteria-processor.ts#L77-L240))

   **Old approach (WRONG):**

   ```typescript
   groupEvent.nestedCriteria.events.forEach(nestedEvent => {
     const criteria = {...}  // Create criteria for THIS event
     const eventGroup = {
       Type: 'ALL',
       CriteriaList: [criteria],  // Only contains THIS event
     }
     results.push(eventGroup)  // Push separate group for each event
   })
   ```

   **New approach (CORRECT):**

   ```typescript
   const criteriaList: CriteriaGroup[] = []
   const demographicCriteriaList: DemographicCriteria[] = []
   const nestedGroups: GroupCriteria[] = []

   // Collect ALL events first
   groupEvent.nestedCriteria.events
     .filter(event => event.eventType !== 'group' && event.eventType !== 'demographic')
     .forEach(nestedEvent => {
       const criteria = {...}
       criteriaList.push(criteria)  // Collect into array
     })

   // Process demographic events
   groupEvent.nestedCriteria.events
     .filter(event => event.eventType === 'demographic')
     .forEach(event => {
       demographicCriteriaList.push(...)  // Collect into array
     })

   // Create ONE group containing ALL events
   groupsList.push({
     Type: 'ALL',
     CriteriaList: criteriaList,  // Contains ALL events
     DemographicCriteriaList: demographicCriteriaList,
     Groups: nestedGroups,
   })
   ```

2. **Reused Correct Logic** from `processNestedGroupsRecursively()`:
   - Proper handling of nested criteria in attributes (CorrelatedCriteria)
   - Support for demographic events
   - Recursive processing of deeper nested groups
   - Consistent with the rest of the codebase

**Implementation Details**:

- **Data Collection Pattern**: Uses filter + forEach to separate event types
- **Accumulation**: Builds arrays (`criteriaList`, `demographicCriteriaList`, `nestedGroups`) before creating group
- **Single Group Creation**: Only ONE `GroupCriteria` is created per group event, containing ALL its child events
- **Recursive Support**: Properly handles nested groups within groups via `processNestedGroupsRecursively()`

**Impact**:

- ✅ Groups now persist correctly through save/load cycles
- ✅ Multiple criteria in a single group stay together
- ✅ Correct Atlas JSON structure: one `GroupCriteria` with multiple items in `CriteriaList`
- ✅ Aligns with OHDSI Atlas specification
- ✅ No changes to load logic needed (already correct)
- ✅ Full round-trip conversion working (UI → Atlas → UI)

---

### 2025-10-08: Nested Groups (Groups Within Groups) Loading Fix

**Issue**: When users created nested groups (a group containing other groups), the nested groups would not load correctly after saving and reloading the cohort. Only the top-level group and its direct criteria would appear, while any nested groups inside would be missing.

**Example:**

```
User creates: Group A {
                Group B { Condition Occurrence, Drug Exposure },
                Condition Era
              }
SAVE produced: Correct Atlas JSON with Groups property containing nested GroupCriteria
LOAD showed:   Group A { Condition Era }  ← Missing Group B entirely!
```

**Root Cause**: In [AtlasConverter.ts:939](apps/vue-mri-ui-lib/src/query-filter/utils/AtlasConverter.ts#L939), there was a TODO comment `// TODO: Handle nested Groups recursively if needed` indicating the feature was never implemented.

The load logic only processed:

- `CriteriaList` (regular events like Condition Occurrence)
- `DemographicCriteriaList` (demographic criteria like Age, Gender)
- ❌ **Missing**: `Groups` property (nested groups within a group)

**Changes Made**:

1. **Created recursive helper function `convertGroupCriteriaToGroupEvents()`** ([AtlasConverter.ts:603-717](apps/vue-mri-ui-lib/src/query-filter/utils/AtlasConverter.ts#L603-L717))

   This function handles all three parts of a `GroupCriteria`:

   - `CriteriaList` → Convert to regular events
   - `DemographicCriteriaList` → Convert to demographic events
   - **`Groups`** → **Recursively** convert to nested group events

   **Key recursive section** (lines 708-714):

   ```typescript
   // RECURSIVE: Handle nested Groups within this group
   if (groupCriteria.Groups && groupCriteria.Groups.length > 0) {
     groupCriteria.Groups.forEach((nestedGroupCriteria) => {
       const nestedGroupEvent =
         convertGroupCriteriaToGroupEvents(nestedGroupCriteria);
       groupEvent.nestedCriteria!.events.push(nestedGroupEvent);
     });
   }
   ```

2. **Replaced inline group conversion with helper function call** ([AtlasConverter.ts:846-852](apps/vue-mri-ui-lib/src/query-filter/utils/AtlasConverter.ts#L846-L852))

   **Before** (95 lines of duplicated code):

   ```typescript
   // Handle Groups - convert them back to group events
   if (rule.expression?.Groups && rule.expression.Groups.length > 0) {
     rule.expression.Groups.forEach(groupCriteria => {
       const groupEvent = { ... }  // 90+ lines of manual conversion
       // ... handle CriteriaList
       // ... handle DemographicCriteriaList
       // TODO: Handle nested Groups recursively if needed  ← Never implemented
       criteriaItem.events.push(groupEvent)
     })
   }
   ```

   **After** (clean recursive call):

   ```typescript
   // Handle Groups - convert them back to group events (with recursive support)
   if (rule.expression?.Groups && rule.expression.Groups.length > 0) {
     rule.expression.Groups.forEach((groupCriteria) => {
       const groupEvent = convertGroupCriteriaToGroupEvents(groupCriteria);
       criteriaItem.events.push(groupEvent);
     });
   }
   ```

3. **Added missing imports** ([AtlasConverter.ts:24-25](apps/vue-mri-ui-lib/src/query-filter/utils/AtlasConverter.ts#L24-L25))
   - `GroupCriteria` - Type for Atlas JSON group structure
   - `DemographicCriteria` - Type for demographic criteria

**Implementation Details**:

- **Recursive Structure**: The function calls itself when it encounters `Groups` property, enabling unlimited nesting depth
- **Complete Coverage**: Handles all three components of a group (criteria, demographics, nested groups)
- **Code Reuse**: Leverages existing helper `convertCriteriaListToEvents()` for regular criteria
- **Consistent Pattern**: Follows same structure as save logic in `processNestedGroupsRecursively()`

**Data Flow**:

```
Atlas JSON GroupCriteria
├─ CriteriaList → convertCriteriaListToEvents() → QueryFilterEvent[]
├─ DemographicCriteriaList → forEach demoCriteria → QueryFilterEvent
└─ Groups → forEach groupCriteria → convertGroupCriteriaToGroupEvents() ← RECURSIVE
                                   └─ Creates QueryFilterEvent with eventType='group'
                                      └─ nestedCriteria.events contains all child events
```

**Atlas JSON Structure**:

```typescript
GroupCriteria {
  Type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST',
  CriteriaList?: CriteriaGroup[],           // Regular medical events
  DemographicCriteriaList?: DemographicCriteria[],  // Demographics
  Groups?: GroupCriteria[]                  // Nested groups (recursive!)
}
```

**Impact**:

- ✅ Nested groups now load correctly from Atlas JSON
- ✅ Supports unlimited nesting depth (group → group → group → ...)
- ✅ Full round-trip: UI → Save → Load → UI preserves nested group structure
- ✅ Removed 95 lines of duplicated code by using helper function
- ✅ Eliminated TODO comment - feature fully implemented
- ✅ Consistent with OHDSI Atlas specification for recursive groups
- ✅ Works together with previous fix (groups not splitting during save)

**Testing**:

1. Create nested structure: Group A containing Group B containing events
2. Save cohort → Reload cohort
3. Verify: Full nested structure preserved with all groups and events intact

---

**End of Documentation**

For questions or issues, refer to:

- Query-Filter README: `apps/vue-mri-ui-lib/src/query-filter/README.md`
- Mock Server README: `apps/vue-mri-ui-lib/src/query-filter/mock-server/README.md`
- Main CLAUDE.md: `/CLAUDE.md` (project root)

IMPORTANT: if any task will affect the accuracy of this document, update this document to reflect the changes
