# PA-Atlas Round-Trip Test Coverage Checklist

## Purpose

This checklist tracks test coverage for Atlas JSON round-trip conversion: **Import → Load → Export → Compare**

The goal is to verify that importing an Atlas cohort definition, loading it into the QueryFilterCriteriaManager, and exporting it back to Atlas format produces JSON that matches the original (excluding concept set details which require mocking).

---

## Test Coverage Progress

### A. CRITERIA TYPES (Medical Events)

Test that each criteria type can round-trip successfully:

- [x] **Empty Cohort** - No criteria, minimal structure
- [x] **ConditionOccurrence** - Diagnoses (✓ atlas-complex-nested-correlated.json)
- [ ] **ConditionEra** - Diagnosis periods (⏭️ atlas-comprehensive-attributes.json SKIPPED - DateAdjustment, date/numeric attributes not implemented)
- [x] **DrugExposure** - Medications (✓ atlas-groups-inclusion-rule.json)
- [x] **DrugEra** - Medication periods (✓ atlas-complex-nested-correlated.json in nested group)
- [ ] **DoseEra** - Dosage periods
- [x] **ProcedureOccurrence** - Procedures (✓ atlas-groups-inclusion-rule.json)
- [x] **Observation** - Lab results, vitals (✓ atlas-complex-nested-correlated.json in nested group)
- [x] **Measurement** - Quantitative observations (✓ atlas-complex-nested-correlated.json, deep nested)
- [x] **DeviceExposure** - Medical devices (✓ atlas-complex-nested-correlated.json)
- [ ] **VisitOccurrence** - Healthcare visits (⏭️ atlas-comprehensive-attributes.json SKIPPED - date/numeric attributes not implemented)
- [ ] **VisitDetail** - Visit details (⏭️ atlas-comprehensive-attributes.json SKIPPED - date/numeric attributes not implemented)
- [x] **Death** - Death events (✓ atlas-complex-nested-correlated.json)
- [x] **ObservationPeriod** - Observation windows (✓ atlas-complex-nested-correlated.json, ⏭️ atlas-comprehensive-attributes.json SKIPPED)
- [ ] **PayerPlanPeriod** - Insurance periods (⏭️ atlas-comprehensive-attributes.json SKIPPED - not implemented)
- [ ] **Specimen** - Specimen collection (⏭️ atlas-comprehensive-attributes.json SKIPPED - numeric attributes not implemented)
- [ ] **LocationRegion** - Geographic filters (group only) (⏭️ atlas-comprehensive-attributes.json SKIPPED - IgnoreObservationPeriod not implemented)
- [x] **DemographicCriteria** - Age, gender, race, ethnicity (✓ atlas-demographics-simple.json, atlas-complex-nested-correlated.json)

### B. ATTRIBUTE TYPES

Test that each attribute type preserves values correctly:

#### B.1 Primitive Types

- [ ] **boolean** - `First`, `Abnormal` (true/false values) (⏭️ atlas-comprehensive-attributes.json SKIPPED - boolean attributes not implemented)
- [ ] **text** - `ValueAsString`, `LotNumber`, `UniqueDeviceId` (⏭️ atlas-comprehensive-attributes.json SKIPPED - text attributes not implemented)

#### B.2 Numeric Range Attributes

- [x] **numericRange** - Basic structure (✓ tested with Age)
  - [ ] Operator: `lt` (less than) (⏭️ atlas-comprehensive-attributes.json SKIPPED - EraLength, VisitDetailLength, Refills, DaysSupply, ValueAsNumber)
  - [ ] Operator: `lte` (less than or equal) (⏭️ atlas-comprehensive-attributes.json SKIPPED - VisitLength, DaysSupply)
  - [ ] Operator: `eq` (equal) (⏭️ atlas-comprehensive-attributes.json SKIPPED - VisitDetailLength)
  - [ ] Operator: `gte` (greater than or equal) (⏭️ atlas-comprehensive-attributes.json SKIPPED - Age on Specimen)
  - [ ] Operator: `gt` (greater than) (⏭️ atlas-comprehensive-attributes.json SKIPPED - Quantity on Specimen)
  - [x] Operator: `bt` (between - requires Value + Extent) (✓ atlas-complex-nested-correlated.json: Age bt 5-11, ⏭️ atlas-comprehensive-attributes.json SKIPPED - Age in ConditionOccurrence)
  - [ ] Operator: `!bt` (not between) (⏭️ atlas-comprehensive-attributes.json SKIPPED - Age demographic with !bt operator)
  - [ ] With `Value` only (single threshold)
  - [x] With `Value` and `Extent` (range) (✓ atlas-complex-nested-correlated.json: Age bt 5-11)

**Common Numeric Fields:**

- [x] `Age` - Age in years (✓ atlas-demographics-simple.json, atlas-complex-nested-correlated.json)
- [ ] `VisitLength` - Visit duration (⏭️ atlas-comprehensive-attributes.json SKIPPED)
- [ ] `EraLength` - Era duration (⏭️ atlas-comprehensive-attributes.json SKIPPED)
- [ ] `PeriodLength` - Period duration
- [ ] `Quantity` - Quantity value (⏭️ atlas-comprehensive-attributes.json SKIPPED - on Specimen)
- [ ] `ValueAsNumber` - Numeric measurement (⏭️ atlas-comprehensive-attributes.json SKIPPED - on Observation)
- [ ] `RefillsRange` - Drug refills (⏭️ atlas-comprehensive-attributes.json SKIPPED - Refills on DrugExposure)
- [ ] `DaysSupplyRange` - Days supply (⏭️ atlas-comprehensive-attributes.json SKIPPED - DaysSupply on DrugExposure)
- [ ] `AgeAtStart` - Age at start of era/period
- [ ] `AgeAtEnd` - Age at end of era/period

#### B.3 Date Range Attributes

- [ ] **dateRange** - Basic structure (⏭️ atlas-comprehensive-attributes.json SKIPPED - multiple date fields)
  - [ ] Operator: `lt` (before date) (⏭️ atlas-comprehensive-attributes.json SKIPPED - VisitDetailStartDate, OccurrenceStartDate, OccurrenceEndDate, PeriodEndDate)
  - [ ] Operator: `lte` (on or before) (⏭️ atlas-comprehensive-attributes.json SKIPPED - VisitDetailEndDate)
  - [ ] Operator: `eq` (on exact date) (⏭️ atlas-comprehensive-attributes.json SKIPPED - OccurrenceStartDate on VisitOccurrence, PeriodStartDate)
  - [ ] Operator: `gte` (on or after) (⏭️ atlas-comprehensive-attributes.json SKIPPED - EraStartDate)
  - [ ] Operator: `gt` (after date) (⏭️ atlas-comprehensive-attributes.json SKIPPED - OccurrenceEndDate on VisitOccurrence)
  - [ ] Operator: `bt` (between dates - requires Value + Extent) (⏭️ atlas-comprehensive-attributes.json SKIPPED - EraEndDate)
  - [ ] Operator: `!bt` (not between dates) (⏭️ atlas-comprehensive-attributes.json SKIPPED - OccurrenceStartDate on Observation)
  - [ ] With `Value` only (single date)
  - [ ] With `Value` and `Extent` (date range)

**Common Date Fields:**

- [ ] `OccurrenceStartDate` - Event start date (⏭️ atlas-comprehensive-attributes.json SKIPPED - VisitOccurrence eq, Observation !bt)
- [ ] `OccurrenceEndDate` - Event end date (⏭️ atlas-comprehensive-attributes.json SKIPPED - VisitOccurrence gt, DrugExposure lt)
- [ ] `EraStartDate` - Era start date (⏭️ atlas-comprehensive-attributes.json SKIPPED - ConditionEra gte)
- [ ] `EraEndDate` - Era end date (⏭️ atlas-comprehensive-attributes.json SKIPPED - ConditionEra bt)
- [ ] `PeriodStartDate` - Period start date (⏭️ atlas-comprehensive-attributes.json SKIPPED - ObservationPeriod eq)
- [ ] `PeriodEndDate` - Period end date (⏭️ atlas-comprehensive-attributes.json SKIPPED - ObservationPeriod lt)

#### B.4 Complex Types

- [x] **concept** - Single concept or concept array (✓ Gender in atlas-demographics-simple.json)
- [x] **conceptSet** - CodesetId reference to concept set (✓ Multiple tests use concept sets)
- [x] **temporalRelationship** - StartWindow/EndWindow with coefficients (✓ Multiple tests)
- [ ] **dateAdjustment** - Adjust event dates with offsets (⏭️ atlas-comprehensive-attributes.json SKIPPED - StartWith/EndWith/StartOffset/EndOffset on ConditionEra, VisitOccurrence)
- [ ] **userDefinedPeriod** - Custom time periods
- [x] **nested** - CorrelatedCriteria (✓ atlas-complex-nested-correlated.json)

### C. STRUCTURAL ELEMENTS

#### C.1 Top-Level Structure

- [x] **ConceptSets[]** - Array of concept set definitions (empty array tested)
- [x] **PrimaryCriteria** - Entry events structure
  - [x] CriteriaList (✓ tested with ConditionOccurrence in atlas-complex-nested-correlated.json)
  - [x] ObservationWindow with PriorDays/PostDays
  - [x] PrimaryCriteriaLimit with Type
- [x] **InclusionRules[]** - Inclusion criteria groups (✓ Multiple tests)
- [x] **CensoringCriteria[]** - Exit criteria events (✓ atlas-exit-strategy.json)
- [x] **EndStrategy** - Exit strategy configuration (✓ atlas-exit-strategy.json)
  - [x] DateOffset (fixed duration from StartDate) (✓ atlas-exit-strategy.json)
  - [ ] DateOffset (fixed duration from EndDate)
  - [ ] CustomEra (continuous drug exposure with gaps)
- [x] **QualifiedLimit** - Qualifying events limit (✓ atlas-exit-strategy.json)
- [x] **ExpressionLimit** - Expression limit (✓ atlas-complex-nested-correlated.json: Type "Last")
- [x] **CollapseSettings** - Era collapse settings
- [x] **CensorWindow** - Censoring window (empty object tested)

#### C.2 InclusionRule Structure

- [x] **Single InclusionRule** - One inclusion rule (✓ Multiple tests)
- [ ] **Multiple InclusionRules** - 2+ inclusion rules
- [x] **InclusionRule fields**:
  - [x] name (string) (✓ Tested in multiple fixtures)
  - [ ] description (optional string)
  - [x] expression.Type (`ALL`, `ANY`, `AT_LEAST`, `AT_MOST`) (✓ ALL, AT_MOST tested)
  - [x] expression.Count (for `AT_LEAST`/`AT_MOST`) (✓ atlas-complex-nested-correlated.json: AT_MOST Count 0)
  - [x] expression.CriteriaList[] (medical events) (✓ Multiple tests)
  - [x] expression.DemographicCriteriaList[] (demographics) (✓ atlas-demographics-simple.json)
  - [x] expression.Groups[] (nested groups) (✓ atlas-groups-inclusion-rule.json)

#### C.3 CriteriaGroup Structure

- [x] **Criteria** - The medical event (CriteriaListItem) (✓ Multiple tests)
- [x] **StartWindow** - Temporal window (✓ Multiple tests)
  - [x] Start.Days and Start.Coeff (✓ Tested)
  - [x] End.Days and End.Coeff (✓ Tested)
  - [ ] UseIndexEnd flag
  - [x] UseEventEnd flag (✓ atlas-complex-nested-correlated.json)
- [ ] **EndWindow** - End window (optional)
- [x] **Occurrence** - Cardinality settings (✓ Multiple tests)
  - [ ] Type: 0 (exactly N times) (⏭️ atlas-comprehensive-attributes.json SKIPPED - VisitDetail Count 1)
  - [ ] Type: 1 (at most N times)
  - [x] Type: 2 (at least N times) (✓ atlas-groups-inclusion-rule.json, atlas-complex-nested-correlated.json)
  - [x] Count field (various values) (✓ Count 1, Count 2 tested)
  - [ ] IsDistinct flag (⏭️ atlas-comprehensive-attributes.json SKIPPED - VisitOccurrence with IsDistinct + CountColumn)
- [ ] **RestrictVisit** - Visit restriction flag
- [ ] **IgnoreObservationPeriod** - Ignore observation period flag (⏭️ atlas-comprehensive-attributes.json SKIPPED - LocationRegion with IgnoreObservationPeriod true)

#### C.4 CorrelatedCriteria (Nested Events)

- [x] **Basic nested structure** - Event with CorrelatedCriteria (✓ atlas-complex-nested-correlated.json)
- [x] **CorrelatedCriteria.Type** - `ALL`, `ANY`, `AT_LEAST`, `AT_MOST` (✓ ANY, ALL tested)
- [ ] **CorrelatedCriteria.Count** - For `AT_LEAST`/`AT_MOST`
- [x] **CorrelatedCriteria.CriteriaList[]** - Nested medical events (✓ atlas-complex-nested-correlated.json)
- [x] **CorrelatedCriteria.DemographicCriteriaList[]** - Nested demographics (✓ atlas-complex-nested-correlated.json: Age in CorrelatedCriteria)
- [x] **CorrelatedCriteria.Groups[]** - Nested groups (✓ FIXED! atlas-complex-nested-correlated.json: DrugEra, Observation in Groups)

#### C.5 GroupCriteria (Nested Groups)

- [x] **Basic group structure** - Group with events (✓ TESTED - atlas-groups-inclusion-rule.json)
- [x] **GroupCriteria.Type** - `ALL`, `ANY`, `AT_LEAST`, `AT_MOST` (✓ Type: ALL tested)
- [ ] **GroupCriteria.Count** - For `AT_LEAST`/`AT_MOST` (not tested - basic test uses Type: ALL)
- [x] **GroupCriteria.CriteriaList[]** - Events in group (✓ TESTED - 2 events in test)
- [x] **GroupCriteria.DemographicCriteriaList[]** - Demographics in group (✓ Empty array tested)
- [ ] **GroupCriteria.Groups[]** - Recursively nested groups (implementation exists, needs deep nesting test)

### D. NESTING SCENARIOS

#### D.1 Nesting Depth Levels

- [x] **Level 0** - No nesting (flat structure with single events) (✓ atlas-groups-inclusion-rule.json)
- [x] **Level 1** - Single nested criteria (event → CorrelatedCriteria → events) (✓ atlas-complex-nested-correlated.json)
- [x] **Level 2** - Two levels deep (event → CorrelatedCriteria → Groups → events) (✓ atlas-complex-nested-correlated.json)
- [x] **Level 3** - Three levels deep (✓ atlas-complex-nested-correlated.json: Death → CorrelatedCriteria → ObservationPeriod → CorrelatedCriteria → Measurement)
- [ ] **Level 4+** - Deep nesting (arbitrary depth)

#### D.2 Nesting Locations

- [x] **In PrimaryCriteria** - Entry events with nested criteria (✓ atlas-complex-nested-correlated.json: ConditionOccurrence with CorrelatedCriteria)
- [x] **In InclusionRules** - Inclusion criteria with nested groups (✓ atlas-groups-inclusion-rule.json, atlas-complex-nested-correlated.json)
- [x] **In CensoringCriteria** - Exit criteria with nested events (✓ atlas-exit-strategy.json)
- [x] **In Groups** - Groups containing nested groups (✓ atlas-complex-nested-correlated.json: Groups in CorrelatedCriteria)

#### D.3 Nesting Combinations

- [x] **Events + Demographics** - Both in same nested level (✓ atlas-complex-nested-correlated.json: Age + empty CriteriaList in CorrelatedCriteria)
- [x] **Events + Groups** - Both in same nested level (✓ atlas-complex-nested-correlated.json: DeviceExposure + Groups in InclusionRule)
- [x] **Demographics + Groups** - Both in same nested level (✓ atlas-complex-nested-correlated.json: Age + Groups in CorrelatedCriteria)
- [ ] **Events + Demographics + Groups** - All three in same level (empty CriteriaList doesn't count)

### E. CARDINALITY & LOGIC TYPES

#### E.1 Group/Nested Criteria Logic Types

- [x] **ALL** - All criteria must match (✓ Multiple tests)
- [x] **ANY** - Any criteria can match (✓ atlas-complex-nested-correlated.json: CorrelatedCriteria Type ANY)
- [ ] **AT_LEAST** - At least N criteria must match (with Count)
- [x] **AT_MOST** - At most N criteria can match (with Count) (✓ atlas-complex-nested-correlated.json: InclusionRule AT_MOST Count 0)

#### E.2 Occurrence Types (Cardinality)

**Type 0: Exactly N times**

- [ ] Count = 0 (exclusion - event must NOT occur)
- [ ] Count = 1 (exactly once) (⏭️ atlas-comprehensive-attributes.json SKIPPED - VisitDetail)
- [ ] Count = 2 (exactly twice)
- [ ] Count > 2 (exactly N times)

**Type 1: At Most N times**

- [ ] Count = 0 (exclusion - event must NOT occur)
- [ ] Count = 1 (at most once)
- [ ] Count > 1 (at most N times)

**Type 2: At Least N times**

- [ ] Count = 0 (optional - matches all patients)
- [x] Count = 1 (at least once) (✓ atlas-groups-inclusion-rule.json, atlas-complex-nested-correlated.json - multiple occurrences)
- [x] Count = 2 (at least twice) (✓ atlas-complex-nested-correlated.json - Observation event in nested group)
- [ ] Count = 5+ with IsDistinct (⏭️ atlas-comprehensive-attributes.json SKIPPED - VisitOccurrence Count 5 IsDistinct + CountColumn)

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

- [ ] `lt` - Less than (⏭️ atlas-comprehensive-attributes.json SKIPPED - multiple uses)
- [ ] `lte` - Less than or equal (⏭️ atlas-comprehensive-attributes.json SKIPPED - multiple uses)
- [ ] `eq` - Equal (⏭️ atlas-comprehensive-attributes.json SKIPPED - VisitDetailLength)
- [ ] `gte` - Greater than or equal (⏭️ atlas-comprehensive-attributes.json SKIPPED - Age on Specimen)
- [ ] `gt` - Greater than (⏭️ atlas-comprehensive-attributes.json SKIPPED - Quantity)
- [ ] `bt` - Between (Value + Extent) (⏭️ atlas-comprehensive-attributes.json SKIPPED - Age in ConditionOccurrence)
- [ ] `!bt` - Not between (⏭️ atlas-comprehensive-attributes.json SKIPPED - Age demographic)

**Date Operators:**

- [ ] `lt` - Before date (⏭️ atlas-comprehensive-attributes.json SKIPPED - multiple uses)
- [ ] `lte` - On or before date (⏭️ atlas-comprehensive-attributes.json SKIPPED - VisitDetailEndDate)
- [ ] `eq` - On exact date (⏭️ atlas-comprehensive-attributes.json SKIPPED - OccurrenceStartDate, PeriodStartDate)
- [ ] `gte` - On or after date (⏭️ atlas-comprehensive-attributes.json SKIPPED - EraStartDate)
- [ ] `gt` - After date (⏭️ atlas-comprehensive-attributes.json SKIPPED - OccurrenceEndDate)
- [ ] `bt` - Between dates (Value + Extent) (⏭️ atlas-comprehensive-attributes.json SKIPPED - EraEndDate)
- [ ] `!bt` - Not between dates (⏭️ atlas-comprehensive-attributes.json SKIPPED - OccurrenceStartDate on Observation)

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
**Completed:** 68+ (marked with [x])
**Percentage:** ~45%

**Recent Additions:**

- ✅ EndStrategy (DateOffset) - atlas-exit-strategy.json
- ✅ DemographicCriteriaList (Age, Gender) - atlas-demographics-simple.json
- ✅ Groups in InclusionRules - atlas-groups-inclusion-rule.json
- ✅ **Complex Nested CorrelatedCriteria** - atlas-complex-nested-correlated.json
  - Deep nesting (3 levels)
  - Groups in CorrelatedCriteria (FIXED!)
  - Demographics in CorrelatedCriteria
  - AT_MOST cardinality
  - ExpressionLimit LATEST
  - Multiple criteria types: ConditionOccurrence, DrugEra, DrugExposure, DeviceExposure, Death, ObservationPeriod, Observation, Measurement
  - BETWEEN operator for Age with Extent
- ⏭️ **Comprehensive Attributes Coverage** - atlas-comprehensive-attributes.json (SKIPPED - not implemented)
  - New criteria: ConditionEra, VisitOccurrence, VisitDetail, PayerPlanPeriod, Specimen, LocationRegion, ObservationPeriod
  - DateAdjustment: StartWith/EndWith + StartOffset/EndOffset
  - All 7 date operators: lt, lte, eq, gte, gt, bt, !bt (NOT BETWEEN)
  - All 7 numeric operators: lt, lte, eq, gte, gt, bt, !bt (NOT BETWEEN)
  - Text attribute: ValueAsString with "contains" operator
  - Boolean attribute: First (true value)
  - Occurrence Type 0: Exactly N times (Count 1)
  - Occurrence Type 2 with IsDistinct + CountColumn (Count 5)
  - IgnoreObservationPeriod flag

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
