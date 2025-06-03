<script lang="ts">
export default {
  name: 'PrimeVueQueryFilterDemo'
}
</script>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import PrimeVueQueryFilterCard from './PrimeVueQueryFilterCard.vue';
import { QueryFilterCardModel, QueryFilterCondition, QueryFilterChip, QueryFilterManager } from '../lib/models/QueryFilterModel';

const activeTab = ref(1); // PrimeVue TabView uses index
const showExclusionSection = ref(false);
const showDebug = ref(false);
const filterManager = reactive(new QueryFilterManager());

// Initialize with sample data
const initializeSampleData = () => {
  // Sample inclusion filter
  const inclusionFilter = new QueryFilterCardModel({
    title: 'Diabetes Type 2',
    type: 'inclusion',
    conditions: [
      {
        id: 'cond1',
        conceptSet: 'Condition concept set',
        chips: [
          { id: 'chip1', label: 'Diabetes Type 2', value: 'E11' },
          { id: 'chip2', label: 'Atrial Fib A', value: 'I48.0' }
        ]
      },
      {
        id: 'cond2',
        conceptSet: 'Condition concept set',
        chips: [
          { id: 'chip3', label: 'Atrial Fib B', value: 'I48.1' }
        ]
      }
    ]
  });

  // Sample exclusion filter
  const exclusionFilter = new QueryFilterCardModel({
    title: 'Cardiovascular disease',
    type: 'exclusion',
    conditions: [
      {
        id: 'cond3',
        conceptSet: 'Condition concept set',
        chips: [
          { id: 'chip4', label: 'Atrial Fib A', value: 'I48.0' },
          { id: 'chip5', label: 'Atrial Fib B', value: 'I48.1' }
        ]
      }
    ]
  });

  filterManager.addFilter(inclusionFilter);
  filterManager.addFilter(exclusionFilter);
  
  if (exclusionFilter) {
    showExclusionSection.value = true;
  }
};

// Initialize sample data on mount
onMounted(() => {
  initializeSampleData();
});

const inclusionFilters = computed(() => filterManager.getInclusionFilters());
const exclusionFilters = computed(() => filterManager.getExclusionFilters());

const updateFilter = (filter: QueryFilterCardModel) => {
  console.log('Filter updated:', filter);
};

const addInclusionFilter = () => {
  const newFilter = new QueryFilterCardModel({
    title: 'New Inclusion Filter',
    type: 'inclusion',
    conditions: []
  });
  filterManager.addFilter(newFilter);
};

const addExclusionFilter = () => {
  const newFilter = new QueryFilterCardModel({
    title: 'New Exclusion Filter',
    type: 'exclusion',
    conditions: []
  });
  filterManager.addFilter(newFilter);
  showExclusionSection.value = true;
};

const handleAddEvent = (filterId: string) => {
  console.log('Add event to filter:', filterId);
};

const handleAddCondition = (filterId: string) => {
  const filter = filterManager.getFilter(filterId);
  if (filter) {
    const newCondition: QueryFilterCondition = {
      id: `cond_${Date.now()}`,
      conceptSet: 'Condition concept set',
      chips: []
    };
    filter.addCondition(newCondition);
  }
};

const handleEditCondition = (filterId: string, conditionId: string) => {
  console.log('Edit condition:', filterId, conditionId);
};

const handleDuplicateCondition = (filterId: string, conditionId: string) => {
  const filter = filterManager.getFilter(filterId);
  if (filter) {
    const condition = filter.conditions.find(c => c.id === conditionId);
    if (condition) {
      const duplicated: QueryFilterCondition = {
        id: `cond_${Date.now()}`,
        conceptSet: condition.conceptSet,
        chips: condition.chips.map(chip => ({
          ...chip,
          id: `chip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }))
      };
      filter.addCondition(duplicated);
    }
  }
};

const handleRemoveCondition = (filterId: string, conditionId: string) => {
  const filter = filterManager.getFilter(filterId);
  if (filter) {
    filter.removeCondition(conditionId);
  }
};

const handleAddChip = (filterId: string, conditionId: string) => {
  console.log('Add chip to condition:', filterId, conditionId);
  const filter = filterManager.getFilter(filterId);
  if (filter) {
    const sampleChip: QueryFilterChip = {
      id: `chip_${Date.now()}`,
      label: 'New Condition',
      value: 'NEW001'
    };
    filter.addChipToCondition(conditionId, sampleChip);
  }
};

const handleRemoveChip = (filterId: string, conditionId: string, chipId: string) => {
  console.log('Chip removed:', filterId, conditionId, chipId);
};

const handleShowMenu = (filterId: string, conditionId: string) => {
  console.log('Show menu for condition:', filterId, conditionId);
};

const applyFilters = () => {
  console.log('Applying filters:', getAllFilters());
  alert('Filters applied! Check console for configuration.');
};

const clearFilters = () => {
  if (confirm('Are you sure you want to clear all filters?')) {
    filterManager.clearAllFilters();
    showExclusionSection.value = false;
  }
};

const exportFilters = () => {
  const config = JSON.stringify(getAllFilters(), null, 2);
  console.log('Exported configuration:', config);
  showDebug.value = !showDebug.value;
};

const getAllFilters = () => {
  return filterManager.getAllFilters().map(f => f.toJSON());
};

const convertToAtlasFormat = () => {
  const filters = filterManager.getAllFilters();
  
  const inclusionFilters = filters.filter(f => f.type === 'inclusion');
  const exclusionFilters = filters.filter(f => f.type === 'exclusion');
  
  const conceptSets: any[] = [];
  let conceptSetId = 0;
  
  filters.forEach(filter => {
    filter.conditions.forEach(condition => {
      if (condition.chips.length > 0) {
        conceptSets.push({
          id: conceptSetId++,
          name: condition.conceptSet || `Concept Set ${conceptSetId}`,
          expression: {
            items: condition.chips.map(chip => ({
              concept: {
                CONCEPT_ID: parseInt(chip.value) || 0,
                CONCEPT_NAME: chip.label,
                CONCEPT_CODE: chip.value,
                VOCABULARY_ID: "ICD10CM",
                DOMAIN_ID: "Condition"
              },
              isExcluded: false,
              includeDescendants: true
            }))
          }
        });
      }
    });
  });
  
  const atlasDef = {
    name: "Demo Cohort",
    description: "Cohort created from Query Filter UI",
    expressionType: "SIMPLE_EXPRESSION",
    ConceptSets: conceptSets,
    PrimaryCriteria: {
      CriteriaList: inclusionFilters.length > 0 ? 
        inclusionFilters[0].conditions.map((condition, index) => ({
          ConditionOccurrence: {
            CodesetId: index,
            First: true
          }
        })) : [],
      ObservationWindow: {
        PriorDays: 0,
        PostDays: 0
      }
    },
    InclusionRules: inclusionFilters.slice(1).map((filter, filterIndex) => ({
      name: filter.title,
      expression: {
        Type: "ALL",
        CriteriaList: [{
          CriteriaList: filter.conditions.map((condition, condIndex) => ({
            ConditionOccurrence: {
              CodesetId: conceptSets.findIndex(cs => cs.name === condition.conceptSet)
            }
          }))
        }]
      }
    })),
    ExclusionRules: exclusionFilters.map((filter, filterIndex) => ({
      name: filter.title,
      expression: {
        Type: "ALL",
        CriteriaList: [{
          CriteriaList: filter.conditions.map((condition, condIndex) => ({
            ConditionOccurrence: {
              CodesetId: conceptSets.findIndex(cs => cs.name === condition.conceptSet)
            }
          }))
        }]
      }
    }))
  };
  
  return atlasDef;
};

const handleRemoveFilter = (filterId: string) => {
  const removed = filterManager.removeFilter(filterId);
  if (removed) {
    console.log('Filter removed:', filterId);
    if (filterManager.getExclusionFilters().length === 0) {
      showExclusionSection.value = false;
    }
  }
};
</script>

<template>
  <div class="primevue-query-filter-demo">
    <h2>Query Filter UI Demo (PrimeVue)</h2>
    
    <!-- Tab Navigation -->
    <TabView v-model:activeIndex="activeTab" class="filter-tabs">
      <TabPanel header="Earliest" />
      <TabPanel header="All" />
      <TabPanel header="Latest" />
    </TabView>

    <!-- Filter Container -->
    <Card class="filter-container">
      <template #content>
        <!-- Inclusion Criteria Section -->
        <div class="filter-section">
          <h3 class="section-title">Inclusion Criterias</h3>
          
          <prime-vue-query-filter-card
            v-for="filter in inclusionFilters"
            :key="filter.id"
            :filter="filter"
            @update:filter="updateFilter"
            @add-event="handleAddEvent(filter.id)"
            @add-condition="handleAddCondition"
            @edit-condition="handleEditCondition"
            @duplicate-condition="handleDuplicateCondition"
            @remove-condition="handleRemoveCondition"
            @add-chip="handleAddChip"
            @remove-chip="handleRemoveChip"
            @show-menu="handleShowMenu"
            @remove-filter="handleRemoveFilter"
          />

          <Button 
            label="Add Inclusion Filter" 
            icon="pi pi-plus" 
            class="p-button-text p-button-sm"
            @click="addInclusionFilter"
          />
        </div>

        <!-- Exclusion Criteria Section -->
        <div v-if="exclusionFilters.length > 0 || showExclusionSection" class="filter-section">
          <h3 class="section-title">Exclusion Criterias</h3>
          
          <prime-vue-query-filter-card
            v-for="filter in exclusionFilters"
            :key="filter.id"
            :filter="filter"
            @update:filter="updateFilter"
            @add-event="handleAddEvent(filter.id)"
            @add-condition="handleAddCondition"
            @edit-condition="handleEditCondition"
            @duplicate-condition="handleDuplicateCondition"
            @remove-condition="handleRemoveCondition"
            @add-chip="handleAddChip"
            @remove-chip="handleRemoveChip"
            @show-menu="handleShowMenu"
            @remove-filter="handleRemoveFilter"
          />

          <Button 
            label="Add Exclusion Filter" 
            icon="pi pi-plus" 
            class="p-button-text p-button-sm"
            @click="addExclusionFilter"
          />
        </div>

        <Button 
          v-if="!showExclusionSection && exclusionFilters.length === 0"
          label="Add Exclusion Criteria"
          class="p-button-outlined"
          @click="showExclusionSection = true"
        />
      </template>
    </Card>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <Button label="Apply Filters" @click="applyFilters" />
      <Button label="Clear All" class="p-button-outlined" @click="clearFilters" />
      <Button label="Export Configuration" class="p-button-text" @click="exportFilters" />
    </div>

    <!-- Debug Output -->
    <Panel v-if="showDebug" header="Debug Information" :toggleable="true" class="debug-panel">
      <div class="debug-columns">
        <div class="debug-column">
          <h4>UI State JSON:</h4>
          <pre>{{ JSON.stringify(getAllFilters(), null, 2) }}</pre>
        </div>
        
        <div class="debug-column">
          <h4>Atlas JSON:</h4>
          <pre>{{ JSON.stringify(convertToAtlasFormat(), null, 2) }}</pre>
        </div>
      </div>
    </Panel>
  </div>
</template>

<style lang="scss" scoped>
.primevue-query-filter-demo {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;

  h2 {
    margin-bottom: 24px;
    color: #333;
  }

  .filter-tabs {
    margin-bottom: 24px;

    :deep(.p-tabview-nav) {
      justify-content: center;
    }
  }

  .filter-container {
    margin-bottom: 24px;
  }

  .filter-section {
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .section-title {
    color: #dc3545;
    font-size: 18px;
    margin-bottom: 16px;
  }

  .action-buttons {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
  }

  .debug-panel {
    margin-top: 24px;

    .debug-columns {
      display: flex;
      gap: 16px;
      
      .debug-column {
        flex: 1;
        min-width: 0;
        
        h4 {
          margin-bottom: 12px;
          color: #666;
          font-size: 14px;
        }

        pre {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 12px;
          line-height: 1.5;
          border: 1px solid #e0e0e0;
          max-height: 600px;
          overflow-y: auto;
        }
      }
    }
  }
}
</style>