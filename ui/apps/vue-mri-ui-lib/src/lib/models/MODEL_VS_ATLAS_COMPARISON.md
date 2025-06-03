# QueryFilterModel vs OHDSI Atlas JSON Comparison

## Overview

The QueryFilterModel is a simplified UI-friendly structure, while the OHDSI Atlas JSON is a complex medical cohort definition format. The AtlasCohortAdapter bridges between them.

## Structure Comparison

### 1. QueryFilterModel (Simplified UI Model)

```typescript
QueryFilterCardModel {
  id: string                    // UI identifier
  title: string                 // Display name
  type: 'inclusion'|'exclusion' // Simple binary type
  isExpanded: boolean           // UI STATE: Controls card collapse/expand
  operator: 'AND'|'OR'          // How conditions combine
  conditions: [                 // List of conditions
    {
      conceptSet: string        // Display name
      conceptSetId: string      // Reference ID
      isEditing?: boolean       // UI STATE: Shows edit mode
      operator?: 'AND'|'OR'     // How chips combine
      chips: [                  // Visual concept chips
        {
          label: string         // Display text
          value: string         // Code value
          conceptId: number     // OMOP concept ID
        }
      ]
    }
  ]
}
```

### 2. OHDSI Atlas JSON (Complex Medical Format)

```json
{
  "cdmVersionRange": ">=5.0.0",
  "PrimaryCriteria": {
    "CriteriaList": [
      {
        "ConditionOccurrence": {
          "CodesetId": 0,
          "ConditionTypeExclude": false,
          "First": true,
          "OccurrenceStartDate": {...},
          "Age": {...},
          "Gender": {...}
        }
      }
    ],
    "ObservationWindow": {
      "PriorDays": 365,
      "PostDays": 0
    }
  },
  "ConceptSets": [
    {
      "id": 0,
      "name": "Diabetes Type 2",
      "expression": {
        "items": [
          {
            "concept": {
              "CONCEPT_ID": 201826,
              "CONCEPT_NAME": "Type 2 diabetes mellitus",
              "CONCEPT_CODE": "E11",
              "DOMAIN_ID": "Condition",
              "VOCABULARY_ID": "ICD10"
            },
            "isExcluded": false,
            "includeDescendants": true
          }
        ]
      }
    }
  ],
  "InclusionRules": [...],
  "ExpressionLimit": {...},
  "QualifiedLimit": {...},
  "CollapseSettings": {...}
}
```

## Key Mappings

### QueryFilterModel → Atlas JSON

1. **Filter Card → Cohort Definition Section**
   - `QueryFilterCardModel` → Primary Criteria OR Inclusion Rule
   - `type: 'inclusion'` → Goes into InclusionRules array
   - `type: 'exclusion'` → Goes into exclusion logic

2. **Conditions → Criteria List**
   - `QueryFilterCondition` → CriteriaListItem (ConditionOccurrence, DrugExposure, etc.)
   - `conceptSetId` → References ConceptSets array

3. **Chips → Concept Set Items**
   - `QueryFilterChip[]` → ConceptSet.expression.items[]
   - Each chip represents a medical concept (diagnosis, drug, procedure)

### Atlas JSON → QueryFilterModel

1. **Cohort Sections → Filter Cards**
   - PrimaryCriteria → Primary Events filter card
   - Each InclusionRule → Separate inclusion filter card
   - Exclusion criteria → Exclusion filter cards

2. **Medical Criteria → UI Conditions**
   - Each criteria type (Condition, Drug, etc.) → QueryFilterCondition
   - Linked ConceptSet → Provides chips for that condition

3. **Concepts → Visual Chips**
   - Each concept in ConceptSet → QueryFilterChip
   - Concept metadata → Chip display properties

## Example Transformation

### UI Model (What user sees)

```javascript
{
  title: "Diabetes Type 2",
  type: "inclusion",
  isExpanded: true,              // Card is currently expanded in UI
  operator: "ANY",               // Any condition can match
  conditions: [{
    conceptSet: "Diabetes Conditions",
    isEditing: false,            // Not in edit mode
    operator: "OR",              // Any chip matches
    chips: [
      { label: "Type 2 diabetes", value: "E11" },
      { label: "Type 2 diabetes with complications", value: "E11.9" }
    ]
  }]
}
```

### Becomes Atlas JSON

```json
{
  "ConceptSets": [{
    "id": 0,
    "name": "Diabetes Conditions",
    "expression": {
      "items": [
        {
          "concept": {
            "CONCEPT_ID": 201826,
            "CONCEPT_NAME": "Type 2 diabetes",
            "CONCEPT_CODE": "E11"
          }
        },
        {
          "concept": {
            "CONCEPT_ID": 443238,
            "CONCEPT_NAME": "Type 2 diabetes with complications",
            "CONCEPT_CODE": "E11.9"
          }
        }
      ]
    }
  }],
  "InclusionRules": [{
    "name": "Diabetes Type 2",
    "expression": {
      "Type": "ANY",
      "CriteriaList": [{
        "CriteriaList": [{
          "ConditionOccurrence": {
            "CodesetId": 0
          }
        }]
      }]
    }
  }]
}
```

## Why Two Models?

1. **UI Model (QueryFilterModel)**
   - Simple, flat structure
   - Easy to render in Vue components
   - Intuitive for add/remove operations
   - Focuses on visual representation

2. **Atlas JSON**
   - Complex, nested structure
   - Medical domain-specific
   - Supports advanced temporal logic
   - Compatible with OHDSI tools

The AtlasCohortAdapter handles the complexity of converting between these formats, allowing the UI to remain simple while producing valid OHDSI cohort definitions.

## UI State Properties Explained

### Properties That DON'T Go to Atlas JSON

These properties are purely for UI state management and are stripped during conversion:

1. **`isExpanded: boolean`** (QueryFilterCardModel)
   - Controls whether the filter card is collapsed or expanded
   - Persists in UI state but not in medical definition
   - Example: User collapses a card to save screen space

2. **`isEditing?: boolean`** (QueryFilterCondition)
   - Shows edit mode for a condition (inline editing, buttons visible)
   - Temporary UI state during user interaction
   - Example: User clicks edit on a condition to modify concept set

3. **`id: string`** (All levels)
   - Internal React/Vue key for component rendering
   - Generated IDs like `filter_1234567_abc123`
   - Atlas JSON uses numeric IDs for ConceptSets instead

4. **`color?: string`** (QueryFilterChip)
   - Visual differentiation of chips by domain
   - E.g., red for conditions, blue for drugs
   - Atlas JSON uses DOMAIN_ID field instead

### Properties That DO Convert to Atlas JSON

1. **`operator: 'AND'|'OR'`** (Both levels)
   - Filter level: Maps to InclusionRule expression Type
   - Condition level: Affects how multiple concepts combine
   - Becomes `"Type": "ANY"` (OR) or `"Type": "ALL"` (AND) in Atlas

2. **`type: 'inclusion'|'exclusion'`**
   - Determines which section of Atlas JSON
   - `inclusion` → InclusionRules array
   - `exclusion` → Special handling in criteria

3. **`conceptId?: number`** (QueryFilterChip)
   - Direct mapping to CONCEPT_ID in Atlas
   - Critical for medical accuracy

## Usage Example in Vue Component

```vue
<template>
  <div class="filter-card" :class="{ collapsed: !filter.isExpanded }">
    <button @click="filter.toggle()">
      <!-- Chevron rotates based on isExpanded -->
      <i :class="filter.isExpanded ? 'icon-down' : 'icon-right'" />
    </button>
    
    <div v-if="filter.isExpanded">
      <div v-for="condition in filter.conditions" :key="condition.id">
        <div v-if="!condition.isEditing">
          <!-- Normal view -->
          {{ condition.conceptSet }}
        </div>
        <div v-else>
          <!-- Edit mode -->
          <input v-model="condition.conceptSet" />
          <button @click="condition.isEditing = false">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>
```

## Summary

- **UI State Properties**: Help manage the interactive experience
- **Medical Properties**: Define the actual cohort logic
- **Separation of Concerns**: UI can be rich and interactive without polluting the medical definition
- **Clean Conversion**: AtlasCohortAdapter knows exactly what to keep and what to discard

## UI Elements Explained

### Visual Hierarchy

```
┌─ Filter Card ─────────────────────────────────────┐
│ ▼ [Add Event]  Title: "Diabetes Type 2"           │ ← Filter level
│ ┌─────────────────────────────────────────────┐   │
│ │ Condition: "Diabetes Conditions"        [⋮]  │   │ ← Condition level
│ │ ┌─────┐ ┌─────────────┐ ┌─────┐            │   │
│ │ │ E11 │ │ E11.9       │ │ [+] │            │   │ ← Chip level
│ │ └─────┘ └─────────────┘ └─────┘            │   │
│ └─────────────────────────────────────────────┘   │
│ [+ Add Condition]                                  │
└────────────────────────────────────────────────────┘
```

### 1. **Filter Card** (QueryFilterCardModel)

**What it represents**: A complete filtering rule or patient selection criteria

**Visual elements**:
- Colored sidebar (blue for inclusion, red for exclusion)
- Expandable/collapsible container
- Title showing the rule name
- "Add Event" button

**Medical meaning**:
- **Inclusion Card**: "Include patients who have..."
- **Exclusion Card**: "Exclude patients who have..."

**Examples**:
- "Diabetes Type 2" (inclusion) - Find patients with diabetes
- "Pregnancy" (exclusion) - Exclude pregnant patients

### 2. **Condition** (QueryFilterCondition)

**What it represents**: A specific type of medical event or criteria

**Visual elements**:
- Gray background container
- Concept set label (e.g., "Condition concept set")
- Action buttons (edit, duplicate, delete)
- Container for chips

**Medical meaning**:
- Groups related medical concepts
- Represents WHERE to look (conditions, drugs, procedures)
- Can combine multiple concepts with OR/AND logic

**Examples**:
- "Diabetes Conditions" - All diabetes-related diagnoses
- "Antidiabetic Drugs" - All medications for diabetes
- "A1C Measurements" - All hemoglobin A1C tests

### 3. **Chip** (QueryFilterChip)

**What it represents**: A specific medical concept or code

**Visual elements**:
- Rounded pill shape
- Label with concept name
- Optional color coding by domain
- Remove (×) button

**Medical meaning**:
- Individual medical codes (ICD-10, SNOMED, etc.)
- Specific diagnoses, drugs, or procedures
- The actual searchable items in patient records

**Examples**:
- `E11` - "Type 2 diabetes mellitus"
- `E11.9` - "Type 2 diabetes without complications"
- `metformin` - Specific diabetes medication

### Relationship Hierarchy

```
Filter Card (Rule)
  └── Condition 1 (Where to look)
        ├── Chip A (What to find)
        ├── Chip B (What to find)
        └── Chip C (What to find)
  └── Condition 2 (Where to look)
        ├── Chip D (What to find)
        └── Chip E (What to find)
```

### Real-World Example

**Scenario**: Find patients with diabetes who are on medication

```
Filter Card: "Diabetic Patients on Treatment"
├── Condition: "Diabetes Diagnoses"
│   ├── Chip: "E11 - Type 2 diabetes"
│   ├── Chip: "E10 - Type 1 diabetes"
│   └── Chip: "E13 - Other diabetes"
└── Condition: "Diabetes Medications"
    ├── Chip: "metformin"
    ├── Chip: "insulin glargine"
    └── Chip: "sitagliptin"
```

**Logic**: Patient must have (any diabetes diagnosis) AND (any diabetes medication)

### UI Interactions

1. **Card Level**:
   - Expand/collapse to save space
   - Remove entire rule
   - Change inclusion/exclusion type

2. **Condition Level**:
   - Edit concept set selection
   - Duplicate for similar criteria
   - Remove specific condition
   - Change OR/AND logic for chips

3. **Chip Level**:
   - Remove individual concepts
   - View concept details (hover)
   - Add new concepts via search

### Why This Design?

1. **Progressive Disclosure**: Cards can collapse to show overview
2. **Visual Grouping**: Related concepts stay together
3. **Flexible Logic**: Supports complex AND/OR combinations
4. **Domain Separation**: Different medical domains in different conditions
5. **User-Friendly**: Non-technical users can understand "cards contain conditions contain concepts"