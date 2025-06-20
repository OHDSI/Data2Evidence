# Query Filter Migration Guide

## Overview

This guide provides comprehensive instructions for migrating from the legacy flat query filter structure to the new hierarchical component architecture. The migration enables support for complex nested medical criteria while maintaining backward compatibility.

## Quick Start

### For New Projects
```vue
<script setup>
import QueryFilterModern from '@/components/QueryFilterModern.vue'
import { QueryFilterCriteriaManager } from '@/models/QueryFilterModel'

const criteriaManager = new QueryFilterCriteriaManager()
</script>

<template>
  <QueryFilterModern 
    :criteria-manager="criteriaManager"
    :use-new-hierarchy="true"
  />
</template>
```

### For Existing Projects
```vue
<script setup>
import QueryFilterModern from '@/components/QueryFilterModern.vue'
import { QueryFilterCriteriaManager } from '@/models/QueryFilterModel'

// Existing data
const legacyFilters = [/* existing filter data */]

// Convert to new format
const criteriaManager = new QueryFilterCriteriaManager({
  inclusionCriteria: {
    qualifyingEventsLimit: 'ALL',
    criteria: convertLegacyFilters(legacyFilters)
  }
})
</script>

<template>
  <QueryFilterModern 
    :criteria-manager="criteriaManager"
    :use-new-hierarchy="true"
    :debug="false"
  />
</template>
```

## Architecture Changes

### Legacy Structure (Before)
```typescript
interface LegacyStructure {
  filters: QueryFilterCardModel[]
  filterManager: QueryFilterManager
}

// Flat array of filters
const filters = [
  {
    id: 'filter1',
    title: 'Filter 1',
    type: 'inclusion',
    events: [
      { id: 'event1', conceptSet: 'Diabetes' },
      { id: 'event2', conceptSet: 'Hypertension' }
    ]
  }
]
```

### New Structure (After)
```typescript
interface HierarchicalStructure {
  inclusionCriteria: {
    qualifyingEventsLimit: 'ALL' | 'EARLIEST' | 'LATEST'
    criteria: QueryFilterGroup[]
  }
  criteriaManager: QueryFilterCriteriaManager
}

// Hierarchical criteria structure
const criteria = {
  inclusionCriteria: {
    qualifyingEventsLimit: 'ALL',
    criteria: [
      {
        id: 'criteria1',
        title: 'Diabetes Criteria',
        description: 'Patients with diabetes',
        criteriaType: 'ALL',
        events: [
          {
            id: 'event1',
            eventType: 'conditionOccurrence',
            cardinality: { type: 'AT_LEAST', count: 1, using: 'ALL' },
            attributes: [
              {
                id: 'attr1',
                attributeType: 'nested',
                nestedCriteria: {
                  id: 'nested1',
                  criteriaType: 'ANY',
                  events: [...]
                }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Component Migration

### 1. Replace QueryFilter with QueryFilterModern

**Before:**
```vue
<script setup>
import QueryFilter from '@/components/QueryFilter.vue'
import { QueryFilterManager } from '@/models/QueryFilterModel'

const filterManager = new QueryFilterManager()
const filters = ref([])
</script>

<template>
  <QueryFilter 
    :filter-manager="filterManager"
    :filters="filters"
    @filters-updated="handleFiltersUpdated"
  />
</template>
```

**After:**
```vue
<script setup>
import QueryFilterModern from '@/components/QueryFilterModern.vue'
import { QueryFilterCriteriaManager } from '@/models/QueryFilterModel'

const criteriaManager = new QueryFilterCriteriaManager()
</script>

<template>
  <QueryFilterModern 
    :criteria-manager="criteriaManager"
    :use-new-hierarchy="true"
    @criteria-updated="handleCriteriaUpdated"
  />
</template>
```

### 2. Update Data Management

**Before:**
```typescript
// Legacy filter management
const addFilter = () => {
  const newFilter = new QueryFilterCardModel({
    title: 'New Filter',
    type: 'inclusion',
    events: []
  })
  filters.value.push(newFilter)
  filterManager.addFilter(newFilter)
}

const removeFilter = (filterId: string) => {
  const index = filters.value.findIndex(f => f.id === filterId)
  if (index > -1) {
    filters.value.splice(index, 1)
    filterManager.removeFilter(filterId)
  }
}
```

**After:**
```typescript
// New hierarchical criteria management
const addCriteriaGroup = () => {
  criteriaManager.addCriteriaGroup({
    title: 'New Criteria',
    description: '',
    criteriaType: 'ALL',
    groups: []
  })
}

const removeCriteriaGroup = (index: number) => {
  criteriaManager.removeCriteriaGroup(index)
}

const updateQualifyingLimit = (limit: 'ALL' | 'EARLIEST' | 'LATEST') => {
  criteriaManager.updateQualifyingEventsLimit(limit)
}
```

### 3. Update Event Handling

**Before:**
```typescript
// Legacy event handling
const handleFilterUpdated = (filter: QueryFilterCardModel) => {
  // Manual state management
  const index = filters.value.findIndex(f => f.id === filter.id)
  if (index > -1) {
    filters.value[index] = filter
  }
}

const handleAtlasConversion = () => {
  return filterManager.convertToAtlasFormat()
}
```

**After:**
```typescript
// New reactive event handling
const handleCriteriaUpdated = (manager: QueryFilterCriteriaManager) => {
  // Automatic reactivity - no manual state management needed
  console.log('Criteria updated:', manager.toJSON())
}

const handleAtlasConversion = () => {
  return criteriaManager.convertToAtlasFormat()
}
```

## Data Migration

### Converting Legacy Filters

```typescript
/**
 * Convert legacy flat filters to hierarchical criteria
 */
function convertLegacyToHierarchical(legacyFilters: QueryFilterCardModel[]) {
  return {
    inclusionCriteria: {
      qualifyingEventsLimit: 'ALL',
      criteria: legacyFilters.map((filter, index) => ({
        id: filter.id,
        title: filter.title || `Criteria ${index + 1}`,
        description: '',
        criteriaType: 'ALL',
        events: filter.events.map(event => ({
          id: event.id,
          eventType: event.criteriaType || 'conditionOccurrence',
          isExpanded: true,
          attributes: event.attributes || [],
          cardinality: event.cardinality || {
            type: 'AT_LEAST',
            count: 1,
            using: 'ALL'
          },
          conceptSetId: event.conceptSetId,
          selectedConceptSet: event.selectedConceptSet,
          conceptSet: event.conceptSet
        }))
      }))
    }
  }
}

// Usage
const legacyData = [/* existing filters */]
const hierarchicalData = convertLegacyToHierarchical(legacyData)
const criteriaManager = new QueryFilterCriteriaManager(hierarchicalData)
```

### Handling Nested Structures

```typescript
/**
 * Create nested criteria structure
 */
function createNestedCriteria(parentEvent: any, nestedEvents: any[]) {
  parentEvent.attributes = [
    {
      id: `attr_${Date.now()}`,
      attributeType: 'nested',
      nestedCriteria: {
        id: `nested_${Date.now()}`,
        criteriaType: 'ALL',
        events: nestedEvents.map(event => ({
          ...event,
          id: event.id || `nested_event_${Date.now()}`
        }))
      }
    }
  ]
}

// Usage
const parentEvent = { /* event data */ }
const nestedEvents = [/* nested event data */]
createNestedCriteria(parentEvent, nestedEvents)
```

## API Changes

### Props Changes

**QueryFilter (Legacy):**
```typescript
interface LegacyProps {
  filterManager: QueryFilterManager
  filters: QueryFilterCardModel[]
  conceptSets?: ConceptSetItem[]
  debug?: boolean
}
```

**QueryFilterModern (New):**
```typescript
interface ModernProps {
  criteriaManager: QueryFilterCriteriaManager
  conceptSets?: ConceptSetItem[]
  useNewHierarchy?: boolean
  debug?: boolean
}
```

### Event Changes

**Legacy Events:**
```typescript
// Old event structure
@emit('filters-updated', filters: QueryFilterCardModel[])
@emit('filter-added', filter: QueryFilterCardModel)
@emit('filter-removed', filterId: string)
@emit('atlas-converted', atlasJson: any)
```

**New Events:**
```typescript
// New event structure
@emit('criteria-updated', manager: QueryFilterCriteriaManager)
@emit('update:criteria', criteria: QueryFilterCriteria)
```

### Method Changes

**Legacy Methods:**
```typescript
// Old API methods
filterManager.addFilter(filter: QueryFilterCardModel)
filterManager.removeFilter(filterId: string)
filterManager.convertToAtlasFormat()
filterManager.clearAllFilters()
```

**New Methods:**
```typescript
// New API methods
criteriaManager.addCriteriaGroup(group: Partial<QueryFilterGroup>)
criteriaManager.removeCriteriaGroup(index: number)
criteriaManager.updateCriteriaGroup(index: number, group: QueryFilterGroup)
criteriaManager.updateQualifyingEventsLimit(limit: string)
criteriaManager.convertToAtlasFormat()
criteriaManager.clearAllCriteria()
criteriaManager.setCriteria(criteria: QueryFilterCriteria)
```

## Atlas Integration

### Legacy Atlas Conversion

```typescript
// Old Atlas conversion
const atlasJson = filterManager.convertToAtlasFormat(activeTab.value)

// Old Atlas loading
const loadAtlasDefinition = async (atlasJson: any) => {
  const queryFilters = convertAtlasToFilters(atlasJson, conceptSets.value)
  filters.value = []
  queryFilters.forEach(filter => {
    filters.value.push(reactive(filter))
    filterManager.addFilter(filter)
  })
}
```

### New Atlas Conversion

```typescript
// New Atlas conversion
const atlasJson = criteriaManager.convertToAtlasFormat()

// New Atlas loading
const loadAtlasDefinition = async (atlasJson: any) => {
  await component.loadAtlasCohortDefinition(atlasJson)
  // Criteria manager is automatically updated
}
```

## Styling Migration

### CSS Class Changes

**Legacy Classes:**
```scss
.query-filter-demo
.query-filter-container
.query-filter-card
.query-filter-group
```

**New Classes:**
```scss
.query-filter-modern
.query-filter-criteria
.query-filter-criteria-group
.query-filter-event-card
.query-filter-nested-criteria
```

### Import New Styles

```scss
// Add to your main SCSS file
@import '@/query-filter/styles/QueryFilterModern.scss';
```

## Testing Updates

### Legacy Tests

```typescript
// Old test structure
import QueryFilter from '@/components/QueryFilter.vue'
import { QueryFilterManager } from '@/models/QueryFilterModel'

const wrapper = mount(QueryFilter, {
  props: {
    filterManager: new QueryFilterManager(),
    filters: [],
    debug: false
  }
})
```

### New Tests

```typescript
// New test structure
import QueryFilterModern from '@/components/QueryFilterModern.vue'
import { QueryFilterCriteriaManager } from '@/models/QueryFilterModel'

const wrapper = mount(QueryFilterModern, {
  props: {
    criteriaManager: new QueryFilterCriteriaManager(),
    useNewHierarchy: true,
    debug: false
  }
})
```

## Performance Considerations

### Before Migration
- Manual state management overhead
- Multiple re-renders for related changes
- Complex event handling chains
- Large bundle size with unused features

### After Migration
- Automatic Vue 3 reactivity
- Optimized component updates
- Simplified event handling
- Tree-shakable modular architecture

### Optimization Tips

1. **Use Lazy Loading:**
```typescript
const QueryFilterModern = defineAsyncComponent(() => 
  import('@/components/QueryFilterModern.vue')
)
```

2. **Enable Debug Mode Only in Development:**
```vue
<QueryFilterModern 
  :debug="process.env.NODE_ENV === 'development'"
  :criteria-manager="criteriaManager"
/>
```

3. **Optimize Large Datasets:**
```typescript
// Use readonly mode for display-only scenarios
<QueryFilterModern 
  :criteria-manager="criteriaManager"
  :readonly="true"
/>
```

## Troubleshooting

### Common Issues

#### 1. Data Structure Errors
**Problem:** `TypeError: Cannot read property 'criteria' of undefined`

**Solution:**
```typescript
// Ensure proper initialization
const criteriaManager = new QueryFilterCriteriaManager({
  inclusionCriteria: {
    qualifyingEventsLimit: 'ALL',
    criteria: []
  }
})
```

#### 2. Component Not Updating
**Problem:** Changes not reflected in UI

**Solution:**
```typescript
// Ensure reactivity
const criteriaManager = reactive(new QueryFilterCriteriaManager())

// Or use the built-in reactive methods
criteriaManager.updateCriteriaGroup(index, updatedGroup)
```

#### 3. Atlas Conversion Issues
**Problem:** Invalid Atlas JSON output

**Solution:**
```typescript
// Validate data before conversion
if (criteriaManager.getCriteria().criteria.length === 0) {
  console.warn('No criteria to convert')
  return null
}

const atlasJson = criteriaManager.convertToAtlasFormat()
```

#### 4. Styling Issues
**Problem:** Components not styled correctly

**Solution:**
```scss
// Ensure proper import order
@import 'bootstrap-vue/src/index.scss';
@import '@/query-filter/styles/QueryFilterModern.scss';
```

### Debug Tools

```typescript
// Enable debug mode
const debugMode = process.env.NODE_ENV === 'development'

// Log criteria changes
watch(() => criteriaManager.getCriteria(), (newCriteria) => {
  if (debugMode) {
    console.log('Criteria updated:', newCriteria)
  }
}, { deep: true })

// Validate data structure
const validateCriteria = (criteria: QueryFilterCriteria) => {
  const errors = []
  
  if (!criteria.criteriaType) {
    errors.push('Missing criteriaType')
  }
  
  if (!Array.isArray(criteria.criteria)) {
    errors.push('Criteria must be an array')
  }
  
  if (errors.length > 0) {
    console.error('Validation errors:', errors)
  }
  
  return errors.length === 0
}
```

## Migration Checklist

### Pre-Migration
- [ ] Review current QueryFilter usage
- [ ] Identify data dependencies
- [ ] Plan testing strategy
- [ ] Backup existing implementations

### During Migration
- [ ] Install new components
- [ ] Update imports and props
- [ ] Convert data structures
- [ ] Update event handlers
- [ ] Import new styles
- [ ] Update tests

### Post-Migration
- [ ] Verify all functionality works
- [ ] Test Atlas conversion
- [ ] Check performance metrics
- [ ] Update documentation
- [ ] Train team members

### Validation Tests
- [ ] Load sample2 data successfully
- [ ] Load sample3 nested data successfully
- [ ] Convert to Atlas format accurately
- [ ] Round-trip conversion maintains data
- [ ] All user interactions work
- [ ] Error handling functions properly
- [ ] Performance meets requirements

## Support

### Resources
- [Component Documentation](./COMPONENT_DOCUMENTATION.md)
- [API Reference](./API_REFERENCE.md)
- [Examples Repository](./examples/)
- [Type Definitions](../models/QueryFilterModel.ts)

### Getting Help
- Review the troubleshooting section above
- Check existing GitHub issues
- Create a new issue with minimal reproduction case
- Join the development team chat for real-time support

### Best Practices
1. **Always use TypeScript** for better type safety
2. **Enable strict mode** during development
3. **Use reactive patterns** instead of manual state management
4. **Test with real data** from your application
5. **Performance test** with large datasets
6. **Validate Atlas conversion** with actual Atlas instances

This migration guide provides a comprehensive path from the legacy flat structure to the new hierarchical architecture, ensuring a smooth transition while maintaining all existing functionality and adding powerful new capabilities.