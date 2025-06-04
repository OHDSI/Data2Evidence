<script lang="ts">
export default {
  name: 'QueryFilterDemo'
}
</script>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import QueryFilterCard from './QueryFilterCard.vue';
import { QueryFilterCardModel, QueryFilterCondition, QueryFilterChip, QueryFilterManager } from './QueryFilterModel';

const activeTab = ref('all');
const showDebug = ref(false);
const filterManager = reactive(new QueryFilterManager());

// Initialize with sample data
const initializeSampleData = () => {
  // Sample inclusion filters matching the screenshot
  const diabetesFilter = new QueryFilterCardModel({
    title: 'Diabetes Type 2',
    type: 'inclusion',
    conditions: [
      {
        id: 'cond1',
        conceptSet: 'Condition concept set',
        chips: [
          { id: 'chip1', label: 'Diabetes Type 2', value: 'E11' }
        ]
      }
    ]
  });

  const cardiovascularFilter = new QueryFilterCardModel({
    title: 'Cardiovascular disease',
    type: 'inclusion',
    operator: 'OR', // Set to OR so we can see the ANY sidebar
    conditions: [
      {
        id: 'cond2',
        conceptSet: 'Condition concept set',
        chips: [
          { id: 'chip2', label: 'Atrial Fib A', value: 'I48.0' }
        ]
      },
      {
        id: 'cond3',
        conceptSet: 'Condition concept set',
        chips: [
          { id: 'chip3', label: 'Atrial Fib B', value: 'I48.1' }
        ]
      }
    ]
  });

  // Expand both filters by default
  diabetesFilter.isExpanded = true;
  cardiovascularFilter.isExpanded = true;
  
  filterManager.addFilter(diabetesFilter);
  filterManager.addFilter(cardiovascularFilter);
};

// Initialize sample data on mount
onMounted(() => {
  initializeSampleData();
});

const inclusionFilters = computed(() => filterManager.getInclusionFilters());
const exclusionFilters = computed(() => filterManager.getExclusionFilters());

const updateFilter = (filter: QueryFilterCardModel) => {
  // In a real app, this would update the store
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
  // Would open edit dialog
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
  // Would open chip selection dialog
  // For demo, add a sample chip
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
  // Would show context menu
};

const applyFilters = () => {
  console.log('Applying filters:', getAllFilters());
  alert('Filters applied! Check console for configuration.');
};

const clearFilters = () => {
  if (confirm('Are you sure you want to clear all filters?')) {
    filterManager.clearAllFilters();
  }
};

const exportFilters = () => {
  const config = JSON.stringify(getAllFilters(), null, 2);
  console.log('Exported configuration:', config);
  // In real app, would download as file
  showDebug.value = !showDebug.value;
};

const getAllFilters = () => {
  return filterManager.getAllFilters().map(f => f.toJSON());
};

const convertToAtlasFormat = () => {
  // Convert UI state to Atlas cohort definition format
  const filters = filterManager.getAllFilters();
  
  // Separate inclusion and exclusion filters
  const inclusionFilters = filters.filter(f => f.type === 'inclusion');
  const exclusionFilters = filters.filter(f => f.type === 'exclusion');
  
  // Map tab selection to Atlas occurrence type
  const getOccurrenceType = () => {
    switch (activeTab.value) {
      case 'earliest': return 'First';
      case 'all': return 'All';
      case 'latest': return 'Last';
      default: return 'First';
    }
  };
  
  const occurrenceType = getOccurrenceType();
  
  // Build concept sets from all filters
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
                CONCEPT_CLASS_ID: "Clinical Finding",
                CONCEPT_CODE: chip.value,
                CONCEPT_ID: parseInt(chip.value) || 0,
                CONCEPT_NAME: chip.label,
                DOMAIN_ID: "Condition",
                INVALID_REASON: "V",
                INVALID_REASON_CAPTION: "Valid",
                STANDARD_CONCEPT: "S",
                STANDARD_CONCEPT_CAPTION: "Standard",
                VOCABULARY_ID: "ICD10CM",
                VALID_START_DATE: "1970-01-01",
                VALID_END_DATE: "2099-12-31"
              },
              includeDescendants: false,
              includeMapped: false
            }))
          }
        });
      }
    });
  });
  
  // Build Atlas cohort definition
  const atlasDef = {
    ConceptSets: conceptSets,
    PrimaryCriteria: {
      CriteriaList: [
        {
          ObservationPeriod: {
            PeriodStartDate: {
              Value: "1800-01-01",
              Op: "gt"
            },
            PeriodEndDate: {
              Value: "2999-01-01", 
              Op: "lt"
            }
          }
        }
      ],
      ObservationWindow: {
        PriorDays: 0,
        PostDays: 0
      },
      PrimaryCriteriaLimit: {
        Type: occurrenceType
      }
    },
    QualifiedLimit: {
      Type: occurrenceType
    },
    ExpressionLimit: {
      Type: occurrenceType
    },
    InclusionRules: inclusionFilters.map((filter, filterIndex) => ({
      name: filter.title,
      expression: {
        Type: filter.operator === 'OR' ? 'ANY' : 'ALL',
        CriteriaList: filter.conditions.map((condition, condIndex) => ({
          Criteria: {
            ConditionOccurrence: {
              CodesetId: conceptSets.findIndex(cs => cs.name === condition.conceptSet)
            }
          },
          StartWindow: {
            Start: {
              Coeff: -1
            },
            End: {
              Coeff: 1
            },
            UseEventEnd: false
          },
          Occurrence: {
            Type: 2,
            Count: 1
          }
        })),
        DemographicCriteriaList: [],
        Groups: []
      }
    })),
    ExclusionRules: exclusionFilters.map((filter, filterIndex) => ({
      name: filter.title,
      expression: {
        Type: filter.operator === 'OR' ? 'ANY' : 'ALL',
        CriteriaList: [{
          CriteriaList: filter.conditions.map((condition, condIndex) => ({
            ConditionOccurrence: {
              CodesetId: conceptSets.findIndex(cs => cs.name === condition.conceptSet)
            }
          }))
        }],
        DemographicCriteriaList: [],
        Groups: []
      }
    })),
    CensoringCriteria: [],
    CollapseSettings: {
      CollapseType: "ERA",
      EraPad: 0
    },
    CensorWindow: {},
    cdmVersionRange: ">=5.0.0"
  };
  
  return atlasDef;
};

const handleRemoveFilter = (filterId: string) => {
  const removed = filterManager.removeFilter(filterId);
  if (removed) {
    console.log('Filter removed:', filterId);
  }
};
</script>

<template>
  <div class="query-filter-demo">
    <!-- Filter Container -->
    <div class="query-filter-container">
      <!-- Inclusion Criteria Section -->
      <div class="query-filter-container__section">
        <div class="query-filter-container__header">
          <h3 class="query-filter-container__section-title">Inclusion Criterias</h3>
          
          <!-- Tab Navigation -->
          <div class="query-filter-tabs">
            <button 
              class="query-filter-tabs__tab query-filter-tabs__tab--earliest"
              :class="{ active: activeTab === 'earliest' }"
              @click="activeTab = 'earliest'"
            >
              Earliest
            </button>
            <button 
              class="query-filter-tabs__tab query-filter-tabs__tab--all"
              :class="{ active: activeTab === 'all' }"
              @click="activeTab = 'all'"
            >
              All
            </button>
            <button 
              class="query-filter-tabs__tab query-filter-tabs__tab--latest"
              :class="{ active: activeTab === 'latest' }"
              @click="activeTab = 'latest'"
            >
              Latest
            </button>
          </div>
        </div>
        
        <!-- ALL 9 Container -->
        <div class="query-filter-group">
          <div class="query-filter-group__sidebar">
            <span class="sidebar-label">ALL 9</span>
          </div>
          
          <div class="query-filter-group__content">
            <!-- Add event button for adding new sections -->
            <div class="add-section-container">
              <button class="btn-add-section" @click="addInclusionFilter">
                <span>Add event</span>
              </button>
            </div>

            <query-filter-card
              v-for="filter in inclusionFilters"
              :key="filter.id"
              :filter="filter"
              :hide-group-label="true"
              :show-add-event-in-any="true"
              @update:filter="updateFilter"
              @add-event="handleAddCondition(filter.id)"
              @add-condition="handleAddCondition"
              @edit-condition="handleEditCondition"
              @duplicate-condition="handleDuplicateCondition"
              @remove-condition="handleRemoveCondition"
              @add-chip="handleAddChip"
              @remove-chip="handleRemoveChip"
              @show-menu="handleShowMenu"
              @remove-filter="handleRemoveFilter"
              @add-any-event="handleAddCondition(filter.id)"
            />
          </div>
        </div>

      </div>

      <!-- Removed exclusion criteria section as requested -->
    </div>

    <!-- Action Buttons -->
    <div class="query-filter-demo__actions">
      <button class="btn btn-primary" @click="applyFilters">
        Apply Filters
      </button>
      <button class="btn btn-secondary" @click="clearFilters">
        Clear All
      </button>
      <button class="btn btn-link" @click="exportFilters">
        Export Configuration
      </button>
    </div>

    <!-- Debug Output -->
    <div class="query-filter-demo__debug" v-if="showDebug">
      <h3>Debug Information</h3>
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
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../styles/queryFilterCard';

.query-filter-demo {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;

  &__actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #e0e0e0;
  }

  &__debug {
    margin-top: 32px;
    padding: 16px;
    background: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 8px;

    h3 {
      margin-bottom: 16px;
      color: #333;
      font-size: 18px;
    }

    .debug-columns {
      display: flex;
      gap: 16px;
      
      .debug-column {
        flex: 1;
        min-width: 0; // Prevent flex items from growing beyond container
        
        h4 {
          margin-bottom: 12px;
          color: #666;
          font-size: 14px;
        }

        pre {
          background: white;
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

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &-primary {
    background: #3b82f6;
    color: white;

    &:hover {
      background: #2563eb;
    }
  }

  &-secondary {
    background: #e5e7eb;
    color: #374151;

    &:hover {
      background: #d1d5db;
    }
  }

  &-link {
    background: none;
    color: #3b82f6;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &-add-filter {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    font-size: 14px;

    .icon {
      font-size: 12px;
    }
  }
}

.add-section-container {
  margin-bottom: 12px;
  margin-left: 2px; // Align with the cards below
}

.btn-add-section {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
  text-align: center;

  &:hover {
    background: #2563eb;
  }
}

.icon {
  font-family: 'Font Awesome 5 Free', 'app-icons';
  font-style: normal;
  font-weight: 900;
  
  &-plus::before { content: '\f067'; }
}

.query-filter-group {
  position: relative;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 0 0 8px 8px;
  margin-bottom: 20px;
  padding-left: 40px;
  min-height: 100px;

  &__sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 40px;
    background: #1e40af;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: sideways-lr;
    text-orientation: mixed;
    border-radius: 0 0 0 8px;

    .sidebar-label {
      color: white;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
  }

  &__content {
    padding: 12px 8px;
    
    .query-filter-card {
      margin-bottom: 8px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}
</style>