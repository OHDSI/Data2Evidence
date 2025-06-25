# Query Filter Workflow Documentation

## Overview

The Query Filter module provides a visual interface for building OHDSI Atlas-compatible cohort definitions. It enables users to import Atlas JSON, make visual edits using a hierarchical interface, and save changes back to Atlas format. The system handles complex medical criteria with nested conditions and concept set resolution.

## Component Architecture

The Query Filter system follows a hierarchical component structure that mirrors the complexity of medical cohort definitions:

```mermaid
graph TD
    A[QueryFilterModern] -->|Main Container| B[QueryFilterCriteria]
    A -->|Entry/Exit Events| C[QueryFilterEntryExit]
    A -->|Concept Management| D[ConceptSetApiService]

    B -->|Criteria Groups| E[QueryFilterCriteriaGroup]
    E -->|Individual Events| F[QueryFilterEvent]
    F -->|Event Cards| G[QueryFilterEventCard]
    F -->|Nested Logic| H[QueryFilterNestedCriteria]
    H -->|Recursive Events| I[QueryFilterNestedEvent]

    A -->|Data Conversion| J[AtlasConverter]
    A -->|State Management| K[QueryFilterCriteriaManager]

    style A fill:#e1f5fe
    style J fill:#fff3e0
    style K fill:#f3e5f5
```

### Component Responsibilities

- **QueryFilterModern**: Main orchestrator, handles Atlas import/export, concept set loading
- **QueryFilterCriteria**: Manages inclusion criteria groups and their interactions
- **QueryFilterCriteriaGroup**: Handles individual criteria groups with AND/OR logic
- **QueryFilterEventContainer**: Manages collections of events within criteria groups
- **QueryFilterEventCard**: Modern event component with full functionality and visual design
- **QueryFilterEvent**: Legacy event component maintained for backward compatibility
- **QueryFilterNestedCriteria**: Handles recursive nested criteria within events
- **QueryFilterNestedEvent**: Event component designed for nested contexts with level indicators
- **QueryFilterCard**: Main container component for filter groups with multiple conditions and AND/OR operators
- **QueryFilterChip**: Individual filter chips representing selected concepts (removable with multiple variants)
- **AttributesDropdown**: Dropdown for adding criteria-specific attributes with multi-select interface
- **CriteriaSelectorDropdown**: Dropdown for selecting criteria types with medical domain icons and searchable options
- **AtlasConverter**: Core conversion engine between Atlas JSON and UI models
- **QueryFilterCriteriaManager**: State management for hierarchical criteria data

## Import Atlas JSON Process

The Atlas import process involves several steps to convert OHDSI Atlas cohort definitions into the visual interface:

```mermaid
sequenceDiagram
    participant User
    participant QFM as QueryFilterModern
    participant AC as AtlasConverter
    participant CSA as ConceptSetAPI
    participant QCM as QueryFilterCriteriaManager
    participant UI as UI Components

    User->>QFM: loadAtlasCohortDefinition(atlasJson)
    QFM->>QFM: Extract concept set IDs from criteria
    QFM->>CSA: Resolve/create concept sets
    CSA-->>QFM: Updated concept sets
    QFM->>AC: convertAtlasToFilters(atlasJson, conceptSets)
    AC->>AC: Process PrimaryCriteria → entryEvents
    AC->>AC: Process InclusionRules → inclusionCriteria
    AC->>AC: Process CensoringCriteria → exitEvents
    AC->>QCM: Create QueryFilterCriteriaManager
    QCM-->>QFM: Hierarchical criteria data
    QFM->>UI: Render visual interface
    QFM->>QFM: loadConceptSetDetailsForAllEvents()
    loop Batch Processing
        QFM->>CSA: Load concept details (batches of 10)
        CSA-->>QFM: Full medical concept data
        QFM->>UI: Update events with concept details
    end
    Note over QFM,UI: UI now displays complete medical terminology
```

### Key Conversion Functions

#### `convertAtlasToFilters()` - AtlasConverter.ts:18-337

The main conversion function that transforms Atlas JSON into UI models:

1. **Concept Set Resolution**: Maps Atlas concept set IDs to local concept sets
2. **Criteria Processing**: Converts different criteria types (conditions, drugs, procedures)
3. **Nested Handling**: Processes `CorrelatedCriteria` recursively
4. **Attribute Mapping**: Converts Atlas operators to internal format

#### `convertCriteriaListToEvents()` - AtlasConverter.ts:114-223

Recursive function that processes Atlas criteria lists:

```mermaid
graph TD
    A[Atlas CriteriaList] --> B[convertCriteriaListToEvents]
    B --> C{For each criteriaItem}
    C --> D[Determine criteria type]
    D --> E[Extract concept set info]
    E --> F{Has CorrelatedCriteria?}
    F -->|Yes| G[Recursively process nested criteria]
    G --> H[Create nested attribute]
    F -->|No| I[Create QueryFilterEvent]
    H --> I
    I --> J[Add to events array]
    J --> C
    C --> K[Return events array]

    style G fill:#ffcdd2
    style B fill:#e8f5e8
```

## Load from Bookmarks Integration

The Query Filter integrates with the application's bookmark system through the Vuex store:

1. **Bookmark Selection**: User selects an Atlas cohort bookmark
2. **Expression Extraction**: Atlas JSON expression is extracted from bookmark
3. **Import Process**: Standard Atlas import workflow is triggered
4. **UI Population**: Visual interface is populated with bookmark data

The main integration point is in `QueryFilterModern.vue:393-544` where `loadAtlasCohortDefinition()` processes bookmark data.

## Making Changes - Visual Editing

The visual interface allows users to modify cohort definitions through several interaction patterns:

### Event Management

- **Add Events**: Users can add new medical events to criteria groups
- **Configure Events**: Select concept sets, set cardinality, add attributes
- **Nested Criteria**: Create complex nested conditions within events

### Concept Set Handling

- **Selection**: Choose from existing concept sets or create new ones
- **Details Loading**: Concept details are loaded asynchronously for visualization
- **Terminology Integration**: Interface with external terminology services

### Recursive Component Structure

The UI handles nested medical criteria through recursive component rendering:

```mermaid
graph TD
    A[QueryFilterEvent] --> B{Has nested criteria?}
    B -->|Yes| C[QueryFilterNestedCriteria]
    C --> D[QueryFilterNestedEvent]
    D --> A
    B -->|No| E[Simple Event Display]

    F[User adds nested condition] --> C
    C --> G[Renders nested events recursively]
    G --> H[Each nested event can have more nesting]

    style C fill:#fff3e0
    style D fill:#fff3e0
```

## Save Process

The save workflow converts the visual interface back to Atlas format and persists the changes:

```mermaid
sequenceDiagram
    participant User
    participant QFM as QueryFilterModern
    participant QCM as QueryFilterCriteriaManager
    participant Store as Vuex Store
    participant API as Backend API

    User->>QFM: Click Save
    QFM->>QFM: openSaveDialog()
    User->>QFM: Enter cohort name
    QFM->>QCM: convertToAtlasFormat()
    QCM->>QCM: Transform hierarchical data to Atlas JSON
    QCM-->>QFM: Atlas expression
    QFM->>QFM: Create cohort definition object
    QFM->>Store: dispatch('fireUpdateAtlasCohortDefinitionQuery')
    Store->>API: Save Atlas cohort
    API-->>Store: Success confirmation
    Store-->>QFM: Save complete
```

### Key Save Functions

#### `saveAtlasCohort()` - QueryFilterModern.vue:977-1032

Orchestrates the save process:

1. **Validation**: Ensures cohort name is provided
2. **Conversion**: Calls `convertToAtlasFormat()` to get Atlas JSON
3. **Metadata**: Adds creation/modification timestamps and user info
4. **Persistence**: Dispatches Vuex action to save via API

#### `convertToAtlasFormat()` - QueryFilterModel.ts:571

Transforms UI model back to Atlas JSON structure (method of QueryFilterCriteriaManager class):

1. **Concept Set Management**: Builds unified concept sets array and creates ID mappings
2. **Primary Criteria Conversion**: Converts entryEvents to Atlas PrimaryCriteria format
3. **Inclusion Rules Processing**: Transforms query filter groups into Atlas InclusionRules
4. **Exit Strategy Mapping**: Converts exit events to Atlas CensoringCriteria
5. **Data Type Mapping**: Maps internal event types to Atlas criteria types
6. **Nested Structure Processing**: Recursively processes nested criteria from attributes

## Recursive Data Handling

The system handles two main types of recursion:

### 1. Data Model Recursion (Atlas Import)

Atlas `CorrelatedCriteria` structures can be nested arbitrarily deep. The conversion handles this through recursive processing:

```javascript
// AtlasConverter.ts - convertCriteriaListToEvents()
if (criteriaObj.CorrelatedCriteria) {
  const nestedCriteriaEvents = convertCriteriaListToEvents(criteriaObj.CorrelatedCriteria.CriteriaList || []) // Recursive call

  const nestedAttribute = {
    id: 'nested',
    type: 'nested',
    nestedCriteria: {
      events: nestedCriteriaEvents,
    },
  }
}
```

### 2. UI Component Recursion

The visual interface renders nested criteria through recursive Vue components:

```vue
<!-- QueryFilterNestedCriteria.vue -->
<template>
  <div v-for="event in nestedEvents" :key="event.id">
    <QueryFilterNestedEvent :event="event" />
    <!-- Recursive: NestedEvent can contain more NestedCriteria -->
  </div>
</template>
```

## Data Flow Architecture

The complete data flow through the system follows this pattern:

```mermaid
graph TB
    subgraph "Import Flow"
        A1[Atlas JSON] --> A2[AtlasConverter]
        A2 --> A3[QueryFilterCriteriaManager]
        A3 --> A4[UI Components]
    end

    subgraph "Edit Flow"
        B1[User Interaction] --> B2[Component Events]
        B2 --> B3[State Updates]
        B3 --> B4[UI Re-render]
    end

    subgraph "Export Flow"
        C1[Save Action] --> C2[convertToAtlasFormat]
        C2 --> C3[Atlas JSON]
        C3 --> C4[API Persistence]
    end

    A4 --> B1
    B4 --> C1

    style A2 fill:#e8f5e8
    style C2 fill:#e8f5e8
```

## Key Technical Concepts

### Concept Set Resolution

- Atlas cohort definitions reference concept sets by ID
- During import, the system resolves these IDs to local concept sets
- Missing concept sets are created automatically from Atlas definitions
- Concept details are loaded asynchronously for UI display

### Bidirectional Conversion

- **Import**: Atlas JSON → Internal UI Model → Vue Components
- **Export**: Vue Components → Internal UI Model → Atlas JSON
- Conversion maintains semantic fidelity while adapting to UI requirements

### State Management

- `QueryFilterCriteriaManager` maintains the canonical state
- Components receive data via props and emit changes via events
- Reactive updates ensure UI consistency during edits

## Configuration

The module is configured through `config/cohort-criteria-config.json`. This file defines:

- Available criteria types
- Attribute options
- UI labels and descriptions
- Icon mappings
