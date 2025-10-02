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

**End of Documentation**

For questions or issues, refer to:

- Query-Filter README: `apps/vue-mri-ui-lib/src/query-filter/README.md`
- Mock Server README: `apps/vue-mri-ui-lib/src/query-filter/mock-server/README.md`
- Main CLAUDE.md: `/CLAUDE.md` (project root)

IMPORTANT: if any task will affect the accuracy of this document, update this document to reflect the changes
