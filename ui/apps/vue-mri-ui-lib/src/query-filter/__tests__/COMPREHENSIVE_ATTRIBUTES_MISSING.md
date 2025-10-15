# Missing Implementation for atlas-comprehensive-attributes.json

## Overview

The `atlas-comprehensive-attributes.json` test fixture is currently **SKIPPED** because it requires implementation of several attribute types and operators that are not yet supported in the Atlas round-trip conversion.

**Test Status**: The test shows **132 lines of attributes being lost** during round-trip conversion (Import → Export).

---

## Missing Implementation Summary

These fall into 7 major categories:

---

### 1. **DateAdjustment Attribute** (Not Implemented)

**Impact**: Used on ConditionEra and VisitOccurrence criteria

**Missing Structure**:

```json
"DateAdjustment": {
  "StartWith": "START_DATE",    // or "END_DATE"
  "StartOffset": 1,              // integer offset in days
  "EndWith": "END_DATE",         // or "START_DATE"
  "EndOffset": 2                 // integer offset in days
}
```

**What it does**: Adjusts the start and end dates of an event by specified offsets. For example, "StartWith: START_DATE, StartOffset: 1" means the event starts 1 day after the original start date.

**Example from test**:

```json
"ConditionEra": {
  "DateAdjustment": {
    "StartWith": "START_DATE",
    "StartOffset": 1,
    "EndWith": "END_DATE",
    "EndOffset": 2
  },
  ...
}
```

---

### 2. **Date Range Attributes** (Not Implemented)

**Impact**: Era dates, occurrence dates, period dates, visit detail dates

**Missing Attributes**:

- `EraStartDate` (ConditionEra)
- `EraEndDate` (ConditionEra)
- `OccurrenceStartDate` (VisitOccurrence, Observation)
- `OccurrenceEndDate` (VisitOccurrence, DrugExposure)
- `PeriodStartDate` (ObservationPeriod)
- `PeriodEndDate` (ObservationPeriod)
- `VisitDetailStartDate` (VisitDetail)
- `VisitDetailEndDate` (VisitDetail)

**Structure**:

```json
"EraStartDate": {
  "Op": "gte",                   // Operator
  "Value": "2025-10-15"          // Date string (YYYY-MM-DD)
}

// For BETWEEN operator
"EraEndDate": {
  "Op": "bt",                    // Between operator
  "Value": "2025-10-14",         // Start of range
  "Extent": "2025-10-25"         // End of range
}
```

**Operators needed**: `lt`, `lte`, `eq`, `gte`, `gt`, `bt`, `!bt`

**Examples from test**:

```json
"ConditionEra": {
  "EraStartDate": {
    "Op": "gte",
    "Value": "2025-10-15"
  },
  "EraEndDate": {
    "Op": "bt",
    "Value": "2025-10-14",
    "Extent": "2025-10-25"
  }
}
```

---

### 3. **Numeric Range Attributes** (Not Implemented)

**Impact**: Length, quantity, age, refills, days supply fields

**Missing Attributes**:

- `EraLength` (ConditionEra) - Duration of condition era in days
- `VisitLength` (VisitOccurrence) - Duration of visit in days
- `VisitDetailLength` (VisitDetail) - Duration of visit detail in days
- `Quantity` (Specimen) - Specimen quantity
- `Age` (on Specimen) - Patient age at specimen collection (different from demographic Age)
- `Refills` (DrugExposure) - Number of refills
- `DaysSupply` (DrugExposure) - Days supply of medication
- `ValueAsNumber` (Observation) - Numeric observation value

**Structure**:

```json
"EraLength": {
  "Op": "lt",                    // Operator
  "Value": 5                     // Numeric value
}

// For BETWEEN operator
"Age": {
  "Op": "bt",                    // Between operator
  "Value": 1,                    // Start of range
  "Extent": 4                    // End of range
}
```

**Operators needed**: `lt`, `lte`, `eq`, `gte`, `gt`, `bt`, `!bt`

**Examples from test**:

```json
"ConditionEra": {
  "EraLength": {
    "Op": "lt",
    "Value": 5
  }
}

"VisitOccurrence": {
  "VisitLength": {
    "Op": "lte",
    "Value": 4
  }
}

"Specimen": {
  "Quantity": {
    "Op": "gt",
    "Value": 5
  },
  "Age": {
    "Op": "gte",
    "Value": 6
  }
}
```

---

### 4. **Text Attributes** (Not Implemented)

**Impact**: String-based filtering on criteria

**Missing Attributes**:

- `ValueAsString` (Observation) - Text observation value
- Potentially: `LotNumber`, `UniqueDeviceId`, `ProviderSpecialty`, etc.

**Structure**:

```json
"ValueAsString": {
  "Op": "contains",              // Text operator
  "Text": "test"                 // Search string
}
```

**Operators needed**:

- `contains` - String contains the text
- `startsWith` - String starts with the text
- `endsWith` - String ends with the text
- `eq` - String equals the text exactly

**Example from test**:

```json
"Observation": {
  "ValueAsString": {
    "Op": "contains",
    "Text": "test"
  }
}
```

---

### 5. **Boolean Attributes** (Not Implemented)

**Impact**: True/false flags on criteria

**Missing Attributes**:

- `First` (ConditionEra, and other criteria types) - Only first occurrence
- `Abnormal` (Measurement, Observation) - Only abnormal values
- Other boolean flags per criteria type

**Structure**:

```json
"First": true                    // Boolean value (true or false)
```

**Usage**: When `true`, only the first occurrence of the event is considered. When `false` or omitted, all occurrences are considered.

**Example from test**:

```json
"ConditionEra": {
  "First": true,
  ...
}
```

---

### 6. **NOT BETWEEN Operator (`!bt`)** (Not Implemented)

**Impact**: Exclusion ranges for dates and numerics

**What it does**: The `!bt` operator means "NOT BETWEEN" - it excludes values within the specified range. For example, `!bt` with Value=1 and Extent=4 means "not between 1 and 4" (i.e., <1 or >4).

**Structure**:

```json
// Date NOT BETWEEN
"OccurrenceStartDate": {
  "Op": "!bt",
  "Value": "2025-10-14",         // Start of excluded range
  "Extent": "2025-10-16"         // End of excluded range
}

// Numeric NOT BETWEEN
"Age": {
  "Op": "!bt",
  "Value": 1,                    // Start of excluded range
  "Extent": 4                    // End of excluded range
}
```

**Examples from test**:

```json
"Observation": {
  "OccurrenceStartDate": {
    "Op": "!bt",
    "Value": "2025-10-14",
    "Extent": "2025-10-16"
  }
}

// In Demographics
"Age": {
  "Op": "!bt",
  "Value": 1,
  "Extent": 4
}
```

**Implementation Note**: The current code only handles `bt` (between). Need to add logic for the negation operator `!bt`.

---

### 7. **IgnoreObservationPeriod Flag** (Not Implemented)

**Impact**: Used on LocationRegion and potentially other criteria

**What it does**: When `true`, the criterion is evaluated without requiring the patient to be in an observation period at that time. This is useful for geographic or demographic filters that should apply regardless of observation period.

**Missing Structure**:

```json
{
  "Criteria": {
    "LocationRegion": {}
  },
  "IgnoreObservationPeriod": true, // <-- This flag is lost during export
  "Occurrence": {
    "Type": 2,
    "Count": 1
  }
}
```

**Location**: This flag exists at the `CriteriaGroup` level (same level as `Criteria`, `Occurrence`, `StartWindow`), not inside the criteria object itself.

**Example from test**:

```json
{
  "Criteria": {
    "LocationRegion": {}
  },
  "IgnoreObservationPeriod": true,
  "Occurrence": {
    "Type": 2,
    "Count": 1
  }
}
```

---

### 8. **IsDistinct + CountColumn** (Already Working?)

**Impact**: Occurrence cardinality with distinct counting

**Structure**:

```json
"Occurrence": {
  "Type": 2,                     // At least N times
  "Count": 5,
  "IsDistinct": true,            // Count distinct values only
  "CountColumn": "VISIT_ID"      // Column to use for distinct counting
}
```

**Status**: ✅ The test output shows these fields ARE being preserved in the exported JSON, so they might already work! However, they need integration testing to confirm the CIRCE backend correctly interprets them.

**Example from test**:

```json
"VisitOccurrence": {
  ...
  "Occurrence": {
    "Type": 2,
    "Count": 5,
    "IsDistinct": true,
    "CountColumn": "VISIT_ID"
  }
}
```

---

## Implementation Checklist

To make `atlas-comprehensive-attributes.json` pass, you need to implement the following:

### Phase 1: Import Logic (AtlasConverter.ts)

**File**: [apps/vue-mri-ui-lib/src/query-filter/utils/AtlasConverter.ts](../../utils/AtlasConverter.ts)

- [ ] Add DateAdjustment attribute import for all criteria types
- [ ] Add date range attribute import (8 different date fields):
  - [ ] EraStartDate, EraEndDate
  - [ ] OccurrenceStartDate, OccurrenceEndDate
  - [ ] PeriodStartDate, PeriodEndDate
  - [ ] VisitDetailStartDate, VisitDetailEndDate
- [ ] Add numeric range attribute import (8 different numeric fields):
  - [ ] EraLength, VisitLength, VisitDetailLength
  - [ ] Quantity, Age (on criteria)
  - [ ] Refills, DaysSupply
  - [ ] ValueAsNumber
- [ ] Add text attribute import:
  - [ ] ValueAsString with text operators
- [ ] Add boolean attribute import:
  - [ ] First, Abnormal, and other boolean flags
- [ ] Add support for `!bt` operator in range parsing:
  - [ ] Update operator mapping to include `!bt`
  - [ ] Add logic to handle negation
- [ ] Add IgnoreObservationPeriod flag import at CriteriaGroup level:
  - [ ] Read flag from Atlas JSON at CriteriaGroup level
  - [ ] Store in internal event model

### Phase 2: Export Logic (QueryFilterModel.ts)

**File**: [apps/vue-mri-ui-lib/src/query-filter/models/QueryFilterModel.ts](../../models/QueryFilterModel.ts)

- [ ] Add DateAdjustment attribute export for all criteria types
- [ ] Add date range attribute export (8 different date fields)
- [ ] Add numeric range attribute export (8 different numeric fields)
- [ ] Add text attribute export (ValueAsString, etc.)
- [ ] Add boolean attribute export (First, Abnormal, etc.)
- [ ] Add `!bt` operator export in range formatting:
  - [ ] Update operator mapping to include `!bt`
  - [ ] Format correctly in Atlas JSON
- [ ] Add IgnoreObservationPeriod flag export at CriteriaGroup level:
  - [ ] Read flag from internal event model
  - [ ] Write to Atlas JSON at correct level

### Phase 3: Internal Model

**Files**:

- [apps/vue-mri-ui-lib/src/query-filter/types/AtlasTypes.ts](../../types/AtlasTypes.ts)
- [apps/vue-mri-ui-lib/src/query-filter/config/atlas-config.json](../../config/atlas-config.json)

- [ ] Extend internal event model to store these attributes:
  - [ ] Add fields to FilterEvent interface
  - [ ] Add fields to nested criteria structures
- [ ] Add attribute types to TypeScript interfaces:
  - [ ] DateAdjustment type definition
  - [ ] Update range types to include `!bt` operator
  - [ ] Update text filter types
  - [ ] Update boolean attribute types
- [ ] Update attribute configuration in atlas-config.json:
  - [ ] Add date attribute configs for each criteria type
  - [ ] Add numeric attribute configs for each criteria type
  - [ ] Add text attribute configs
  - [ ] Add boolean attribute configs
  - [ ] Add DateAdjustment configs

### Phase 4: Testing

- [ ] Verify IsDistinct + CountColumn work correctly with CIRCE backend
- [ ] Test each operator individually:
  - [ ] lt, lte, eq, gte, gt (already working)
  - [ ] bt (already working)
  - [ ] !bt (NEW - needs implementation)
- [ ] Test each attribute type individually
- [ ] Enable the comprehensive attributes test
- [ ] Ensure test passes

---

## Quick Stats

- **Total missing attributes**: ~20 different attribute types
- **New criteria types tested**: 6 (ConditionEra, VisitOccurrence, VisitDetail, PayerPlanPeriod, Specimen, LocationRegion)
- **New operators needed**: 1 (`!bt` NOT BETWEEN)
- **New structural flags**: 1 (IgnoreObservationPeriod)
- **Lines of code lost in round-trip**: 132 lines (out of ~250 total in fixture)
- **Estimated implementation effort**: Medium-Large (affects import, export, and model layers)

---

## Related Files

- **Test File**: [AtlasRoundTripComprehensive.test.ts:339](../AtlasRoundTripComprehensive.test.ts#L339)
- **Test Fixture**: [data/atlas-fixtures/atlas-comprehensive-attributes.json](../data/atlas-fixtures/atlas-comprehensive-attributes.json)
- **Round-Trip Checklist**: [ROUND_TRIP_TEST_CHECKLIST.md](../ROUND_TRIP_TEST_CHECKLIST.md)
- **Test Summary**: [CIRCE_BE_TEST_SUMMARY.md](../CIRCE_BE_TEST_SUMMARY.md)

---

## Implementation Priority

Based on frequency of use in real-world Atlas cohort definitions:

### High Priority (Common in production cohorts)

1. Date range attributes (OccurrenceStartDate, OccurrenceEndDate) - Very common
2. Numeric range attributes (Age on criteria, length fields) - Common
3. Boolean attributes (First) - Common for "first diagnosis" logic
4. `!bt` operator - Used for exclusion logic

### Medium Priority (Moderately common)

5. DateAdjustment - Used in complex temporal logic
6. Text attributes (ValueAsString) - Used for lab results
7. IgnoreObservationPeriod - Used in specific scenarios

### Low Priority (Less common but needed for completeness)

8. Specialized numeric attributes (Quantity, Refills, DaysSupply)
9. Additional text attributes (LotNumber, UniqueDeviceId)

---

## Notes

- The good news: **IsDistinct and CountColumn appear to already be working** (they're preserved in the round-trip output)
- The main work is adding support for the various attribute types and the `!bt` operator
- This is a comprehensive test that will significantly improve Atlas compatibility
- Once implemented, this test will validate ~132 additional lines of Atlas JSON structure
- IMPORTANT!!! use `nx test:unit vue-mri -- query-filter` from the ui folder to run tests
