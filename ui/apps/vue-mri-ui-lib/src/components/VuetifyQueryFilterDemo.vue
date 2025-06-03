<script lang="ts">
export default {
  name: 'VuetifyQueryFilterDemo'
}
</script>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import VuetifyQueryFilterCard from './VuetifyQueryFilterCard.vue';
import { QueryFilterCardModel, QueryFilterCondition, QueryFilterChip, QueryFilterManager } from '../lib/models/QueryFilterModel';

const activeTab = ref('all');
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
  <v-container class="vuetify-query-filter-demo">
    <v-row>
      <v-col cols="12">
        <h2 class="text-h4 mb-6">Query Filter UI Demo (Vuetify)</h2>
        
        <!-- Tab Navigation -->
        <v-tabs v-model="activeTab" class="mb-6">
          <v-tab value="earliest">Earliest</v-tab>
          <v-tab value="all">All</v-tab>
          <v-tab value="latest">Latest</v-tab>
        </v-tabs>

        <!-- Filter Container -->
        <v-card class="pa-4">
          <!-- Inclusion Criteria Section -->
          <div class="mb-6">
            <h3 class="text-h6 text-red mb-4">Inclusion Criterias</h3>
            
            <vuetify-query-filter-card
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
              class="mb-4"
            />

            <v-btn variant="text" color="primary" @click="addInclusionFilter">
              <v-icon start>mdi-plus</v-icon>
              Add Inclusion Filter
            </v-btn>
          </div>

          <!-- Exclusion Criteria Section -->
          <div v-if="exclusionFilters.length > 0 || showExclusionSection" class="mb-6">
            <h3 class="text-h6 text-red mb-4">Exclusion Criterias</h3>
            
            <vuetify-query-filter-card
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
              class="mb-4"
            />

            <v-btn variant="text" color="primary" @click="addExclusionFilter">
              <v-icon start>mdi-plus</v-icon>
              Add Exclusion Filter
            </v-btn>
          </div>

          <v-btn 
            v-if="!showExclusionSection && exclusionFilters.length === 0"
            variant="outlined"
            @click="showExclusionSection = true"
          >
            Add Exclusion Criteria
          </v-btn>
        </v-card>

        <!-- Action Buttons -->
        <v-row class="mt-6">
          <v-col cols="auto">
            <v-btn color="primary" @click="applyFilters">
              Apply Filters
            </v-btn>
          </v-col>
          <v-col cols="auto">
            <v-btn variant="outlined" @click="clearFilters">
              Clear All
            </v-btn>
          </v-col>
          <v-col cols="auto">
            <v-btn variant="text" @click="exportFilters">
              Export Configuration
            </v-btn>
          </v-col>
        </v-row>

        <!-- Debug Output -->
        <v-expand-transition>
          <v-card v-if="showDebug" class="mt-6 pa-4">
            <h3 class="text-h6 mb-4">Debug Information</h3>
            <v-row>
              <v-col cols="12" md="6">
                <h4 class="text-subtitle-1 mb-2">UI State JSON:</h4>
                <v-sheet color="grey-lighten-4" class="pa-3" rounded>
                  <pre style="overflow-x: auto;">{{ JSON.stringify(getAllFilters(), null, 2) }}</pre>
                </v-sheet>
              </v-col>
              <v-col cols="12" md="6">
                <h4 class="text-subtitle-1 mb-2">Atlas JSON:</h4>
                <v-sheet color="grey-lighten-4" class="pa-3" rounded>
                  <pre style="overflow-x: auto;">{{ JSON.stringify(convertToAtlasFormat(), null, 2) }}</pre>
                </v-sheet>
              </v-col>
            </v-row>
          </v-card>
        </v-expand-transition>
      </v-col>
    </v-row>
  </v-container>
</template>

<style lang="scss" scoped>
.vuetify-query-filter-demo {
  :deep(pre) {
    font-size: 12px;
    line-height: 1.5;
    max-height: 600px;
    overflow-y: auto;
  }
}
</style>