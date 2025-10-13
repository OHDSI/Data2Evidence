# PA-Atlas Round-Trip Test Coverage Checklist

## Purpose

This checklist tracks test coverage for Atlas JSON round-trip conversion: **Import → Load → Export → Compare**

The goal is to verify that importing an Atlas cohort definition, loading it into the QueryFilterCriteriaManager, and exporting it back to Atlas format produces JSON that matches the original (excluding concept set details which require mocking).

---

## Test Coverage Progress

### A. CRITERIA TYPES (Medical Events)

Test that each criteria type can round-trip successfully:

- [x] **Empty Cohort** - No criteria, minimal structure
- [ ] **ConditionOccurrence** - Diagnoses
- [ ] **ConditionEra** - Diagnosis periods
- [ ] **DrugExposure** - Medications
- [ ] **DrugEra** - Medication periods
- [ ] **DoseEra** - Dosage periods
- [ ] **ProcedureOccurrence** - Procedures
- [ ] **Observation** - Lab results, vitals
- [ ] **Measurement** - Quantitative observations
- [ ] **DeviceExposure** - Medical devices
- [ ] **VisitOccurrence** - Healthcare visits
- [ ] **VisitDetail** - Visit details
- [ ] **Death** - Death events
- [ ] **ObservationPeriod** - Observation windows
- [ ] **PayerPlanPeriod** - Insurance periods
- [ ] **Specimen** - Specimen collection
- [ ] **LocationRegion** - Geographic filters (group only)
- [ ] **DemographicCriteria** - Age, gender, race, ethnicity

### B. ATTRIBUTE TYPES

Test that each attribute type preserves values correctly:

#### B.1 Primitive Types

- [ ] **boolean** - `First`, `Abnormal` (true/false values)
- [ ] **text** - `ValueAsString`, `LotNumber`, `UniqueDeviceId`

#### B.2 Numeric Range Attributes

- [ ] **numericRange** - Basic structure
  - [ ] Operator: `lt` (less than)
  - [ ] Operator: `lte` (less than or equal)
  - [ ] Operator: `eq` (equal)
  - [ ] Operator: `gte` (greater than or equal)
  - [ ] Operator: `gt` (greater than)
  - [ ] Operator: `bt` (between - requires Value + Extent)
  - [ ] Operator: `nbt` (not between)
  - [ ] With `Value` only (single threshold)
  - [ ] With `Value` and `Extent` (range)

**Common Numeric Fields:**

- [ ] `Age` - Age in years
- [ ] `VisitLength` - Visit duration
- [ ] `EraLength` - Era duration
- [ ] `PeriodLength` - Period duration
- [ ] `Quantity` - Quantity value
- [ ] `ValueAsNumber` - Numeric measurement
- [ ] `RefillsRange` - Drug refills
- [ ] `DaysSupplyRange` - Days supply
- [ ] `AgeAtStart` - Age at start of era/period
- [ ] `AgeAtEnd` - Age at end of era/period

#### B.3 Date Range Attributes

- [ ] **dateRange** - Basic structure
  - [ ] Operator: `lt` (before date)
  - [ ] Operator: `lte` (on or before)
  - [ ] Operator: `eq` (on exact date)
  - [ ] Operator: `gte` (on or after)
  - [ ] Operator: `gt` (after date)
  - [ ] Operator: `bt` (between dates - requires Value + Extent)
  - [ ] Operator: `nbt` (not between dates)
  - [ ] With `Value` only (single date)
  - [ ] With `Value` and `Extent` (date range)

**Common Date Fields:**

- [ ] `OccurrenceStartDate` - Event start date
- [ ] `OccurrenceEndDate` - Event end date
- [ ] `EraStartDate` - Era start date
- [ ] `EraEndDate` - Era end date
- [ ] `PeriodStartDate` - Period start date
- [ ] `PeriodEndDate` - Period end date

#### B.4 Complex Types

- [ ] **concept** - Single concept or concept array (Gender, Race, Ethnicity, etc.)
- [ ] **conceptSet** - CodesetId reference to concept set
- [ ] **temporalRelationship** - StartWindow/EndWindow with coefficients
- [ ] **dateAdjustment** - Adjust event dates with offsets
- [ ] **userDefinedPeriod** - Custom time periods
- [ ] **nested** - CorrelatedCriteria (nested events with logic)

### C. STRUCTURAL ELEMENTS

#### C.1 Top-Level Structure

- [x] **ConceptSets[]** - Array of concept set definitions (empty array tested)
- [x] **PrimaryCriteria** - Entry events structure
  - [x] CriteriaList (empty array tested)
  - [x] ObservationWindow with PriorDays/PostDays
  - [x] PrimaryCriteriaLimit with Type
- [x] **InclusionRules[]** - Inclusion criteria groups (empty array tested)
- [x] **CensoringCriteria[]** - Exit criteria events (empty array tested)
- [ ] **EndStrategy** - Exit strategy configuration
  - [ ] DateOffset (fixed duration from StartDate)
  - [ ] DateOffset (fixed duration from EndDate)
  - [ ] CustomEra (continuous drug exposure with gaps)
- [x] **QualifiedLimit** - Qualifying events limit
- [x] **ExpressionLimit** - Expression limit
- [x] **CollapseSettings** - Era collapse settings
- [x] **CensorWindow** - Censoring window (empty object tested)

#### C.2 InclusionRule Structure

- [ ] **Single InclusionRule** - One inclusion rule
- [ ] **Multiple InclusionRules** - 2+ inclusion rules
- [ ] **InclusionRule fields**:
  - [ ] name (string)
  - [ ] description (optional string)
  - [ ] expression.Type (`ALL`, `ANY`, `AT_LEAST`, `AT_MOST`)
  - [ ] expression.Count (for `AT_LEAST`/`AT_MOST`)
  - [ ] expression.CriteriaList[] (medical events)
  - [ ] expression.DemographicCriteriaList[] (demographics)
  - [ ] expression.Groups[] (nested groups)

#### C.3 CriteriaGroup Structure

- [ ] **Criteria** - The medical event (CriteriaListItem)
- [ ] **StartWindow** - Temporal window
  - [ ] Start.Days and Start.Coeff
  - [ ] End.Days and End.Coeff
  - [ ] UseIndexEnd flag
  - [ ] UseEventEnd flag
- [ ] **EndWindow** - End window (optional)
- [ ] **Occurrence** - Cardinality settings
  - [ ] Type: 0 (exactly N times)
  - [ ] Type: 1 (at most N times)
  - [ ] Type: 2 (at least N times)
  - [ ] Count field (various values)
  - [ ] IsDistinct flag
- [ ] **RestrictVisit** - Visit restriction flag
- [ ] **IgnoreObservationPeriod** - Ignore observation period flag

#### C.4 CorrelatedCriteria (Nested Events)

- [ ] **Basic nested structure** - Event with CorrelatedCriteria
- [ ] **CorrelatedCriteria.Type** - `ALL`, `ANY`, `AT_LEAST`, `AT_MOST`
- [ ] **CorrelatedCriteria.Count** - For `AT_LEAST`/`AT_MOST`
- [ ] **CorrelatedCriteria.CriteriaList[]** - Nested medical events
- [ ] **CorrelatedCriteria.DemographicCriteriaList[]** - Nested demographics
- [ ] **CorrelatedCriteria.Groups[]** - Nested groups (recursive)

#### C.5 GroupCriteria (Nested Groups)

- [ ] **Basic group structure** - Group with events
- [ ] **GroupCriteria.Type** - `ALL`, `ANY`, `AT_LEAST`, `AT_MOST`
- [ ] **GroupCriteria.Count** - For `AT_LEAST`/`AT_MOST`
- [ ] **GroupCriteria.CriteriaList[]** - Events in group
- [ ] **GroupCriteria.DemographicCriteriaList[]** - Demographics in group
- [ ] **GroupCriteria.Groups[]** - Recursively nested groups

### D. NESTING SCENARIOS

#### D.1 Nesting Depth Levels

- [ ] **Level 0** - No nesting (flat structure with single events)
- [ ] **Level 1** - Single nested criteria (event → CorrelatedCriteria → events)
- [ ] **Level 2** - Two levels deep (event → nested → nested)
- [ ] **Level 3** - Three levels deep
- [ ] **Level 4+** - Deep nesting (arbitrary depth)

#### D.2 Nesting Locations

- [ ] **In PrimaryCriteria** - Entry events with nested criteria
- [ ] **In InclusionRules** - Inclusion criteria with nested events
- [ ] **In CensoringCriteria** - Exit criteria with nested events
- [ ] **In Groups** - Groups containing nested groups (recursive)

#### D.3 Nesting Combinations

- [ ] **Events + Demographics** - Both in same nested level
- [ ] **Events + Groups** - Both in same nested level
- [ ] **Demographics + Groups** - Both in same nested level
- [ ] **Events + Demographics + Groups** - All three in same level

### E. CARDINALITY & LOGIC TYPES

#### E.1 Group/Nested Criteria Logic Types

- [ ] **ALL** - All criteria must match
- [ ] **ANY** - Any criteria can match
- [ ] **AT_LEAST** - At least N criteria must match (with Count)
- [ ] **AT_MOST** - At most N criteria can match (with Count)

#### E.2 Occurrence Types (Cardinality)

**Type 0: Exactly N times**

- [ ] Count = 0 (exclusion - event must NOT occur)
- [ ] Count = 1 (exactly once)
- [ ] Count = 2 (exactly twice)
- [ ] Count > 2 (exactly N times)

**Type 1: At Most N times**

- [ ] Count = 0 (exclusion - event must NOT occur)
- [ ] Count = 1 (at most once)
- [ ] Count > 1 (at most N times)

**Type 2: At Least N times**

- [ ] Count = 0 (optional - matches all patients)
- [ ] Count = 1 (at least once)
- [ ] Count = 2 (at least twice)
- [ ] Count > 2 (at least N times)

#### E.3 Qualifying Events Limits

- [x] **First** - Use first qualifying event (tested in empty cohort)
- [ ] **All** - Use all qualifying events
- [ ] **Last** - Use last qualifying event

### F. EXIT CRITERIA VARIATIONS

#### F.1 Exit Strategy Types

- [x] **No exit criteria** - Continuous observation (tested in empty cohort)
- [ ] **CensoringCriteria with events** - Event-based exit (array of events)
- [ ] **EndStrategy.DateOffset** - Fixed duration exit
  - [ ] DateField: `StartDate` with positive offset
  - [ ] DateField: `StartDate` with negative offset
  - [ ] DateField: `EndDate` with positive offset
  - [ ] DateField: `EndDate` with negative offset
  - [ ] Offset: 0 (same day)
  - [ ] Offset: Large value (365+ days)
- [ ] **EndStrategy.CustomEra** - Drug exposure exit
  - [ ] With DrugCodesetId (requires concept set mock)
  - [ ] Various GapDays values (0, 30, 90+)
  - [ ] Various Offset values
  - [ ] With DaysSupplyOverride

### G. EDGE CASES & SPECIAL SCENARIOS

#### G.1 Empty/Minimal Cases

- [x] **Empty cohort** - No criteria at all (✓ TESTED)
- [ ] **Empty PrimaryCriteria.CriteriaList** - No entry events (partially tested)
- [ ] **No InclusionRules** - Empty inclusion rules (partially tested)
- [ ] **No ConceptSets** - Empty concept sets array (partially tested)
- [ ] **Minimal event** - Event with only required fields

#### G.2 Complex Combinations

- [ ] **Multiple InclusionRules** - 2-5 rules
- [ ] **Multiple events per rule** - 5+ events in single rule
- [ ] **Mixed event types** - Different criteria types in same rule
- [ ] **Multiple nested levels** - Different logic types at each level
- [ ] **Large Count values** - Count: 100+ (edge case testing)
- [ ] **Very deep nesting** - 5+ levels deep

#### G.3 Field Preservation

- [ ] **Optional fields undefined** - Ensure undefined fields stay undefined (not null)
- [ ] **Boolean true** - Preserve true values
- [ ] **Boolean false** - Preserve false values
- [ ] **Zero values** - Count: 0, Offset: 0 preserved (CRITICAL for exclusion)
- [ ] **Empty strings** - Preserved correctly (vs null/undefined)
- [ ] **Array ordering** - ConceptSets, InclusionRules, CriteriaList order preserved
- [ ] **Null vs undefined** - Consistent handling throughout

#### G.4 Operator Coverage

**Numeric Operators:**

- [ ] `lt` - Less than
- [ ] `lte` - Less than or equal
- [ ] `eq` - Equal
- [ ] `gte` - Greater than or equal
- [ ] `gt` - Greater than
- [ ] `bt` - Between (Value + Extent)
- [ ] `nbt` - Not between

**Date Operators:**

- [ ] `lt` - Before date
- [ ] `lte` - On or before date
- [ ] `eq` - On exact date
- [ ] `gte` - On or after date
- [ ] `gt` - After date
- [ ] `bt` - Between dates (Value + Extent)
- [ ] `nbt` - Not between dates

---

## Testing Strategy

### Fixture Naming Convention

- `atlas-empty.json` - ✓ Empty cohort (DONE)
- `atlas-{type}-basic.json` - Basic single event type (e.g., `atlas-condition-basic.json`)
- `atlas-{type}-{attribute}.json` - Specific attribute (e.g., `atlas-condition-age-gender.json`)
- `atlas-nested-{depth}.json` - Nesting depth (e.g., `atlas-nested-level2.json`)
- `atlas-groups-recursive.json` - Recursive groups
- `atlas-complex-{scenario}.json` - Complex combinations

### Test Pattern

```typescript
test('Round-trip: {scenario}', () => {
  // 1. Load Atlas JSON fixture
  const originalAtlas = require('./data/atlas-fixtures/atlas-{scenario}.json')

  // 2. Generate mock concept sets from CodesetIds
  const mocks = mockConceptSetsForAtlas(originalAtlas)

  // 3. Import to UI (Atlas → QueryFilterCriteriaManager)
  const manager = convertAtlasToFilters(originalAtlas, mocks)

  // 4. Export to Atlas (QueryFilterCriteriaManager → Atlas)
  const exportedAtlas = manager.convertToAtlasFormat()

  // 5. STRICT comparison - exported should exactly match original
  expect(exportedAtlas).toEqual(originalAtlas)
})
```

### Mocking Strategy

- Scan Atlas JSON for all `CodesetId` values
- Auto-generate minimal mock concept sets with id and name
- Keep mocks simple: focus on structure, not concept resolution
- Format: `ConceptSetItemDisplay[]` expected by `convertAtlasToFilters`

---

## Progress Tracking

**Total Items:** 150+
**Completed:** 1 (Empty cohort)
**Percentage:** <1%

Update this checklist as tests are added. Mark items with `[x]` when test coverage is added and passing.

---

## Notes

### Critical Test Cases

These are high-priority cases that frequently cause bugs:

1. **Count: 0** - Must preserve zero for exclusion criteria (not convert to 1)
2. **Deep nesting** - Ensure recursive structures don't lose data
3. **Optional fields** - Undefined vs null handling
4. **Operator preservation** - Internal format ↔ Atlas format conversion
5. **Array ordering** - Ensure deterministic ordering for comparison

### Known Limitations

- Concept set details require mocking (not testing concept resolution logic)
- Tests use strict equality - exported JSON must exactly match original JSON

### Related Files

- Implementation: [/apps/vue-mri-ui-lib/src/query-filter/utils/AtlasConverter.ts](../utils/AtlasConverter.ts)
- Export: [/apps/vue-mri-ui-lib/src/query-filter/models/QueryFilterModel.ts](../models/QueryFilterModel.ts)
- Types: [/apps/vue-mri-ui-lib/src/query-filter/types/AtlasTypes.ts](../types/AtlasTypes.ts)
- Config: [/apps/vue-mri-ui-lib/src/query-filter/config/atlas-config.json](../config/atlas-config.json)
