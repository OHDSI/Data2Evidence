<template>
  <div class="query-filter-demo">
    <h2>Query Filter UI Demo</h2>
    
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

    <!-- Filter Container -->
    <div class="query-filter-container">
      <!-- Inclusion Criteria Section -->
      <div class="query-filter-container__section">
        <h3 class="query-filter-container__section-title">Inclusion Criterias</h3>
        
        <query-filter-card
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
        />

        <button class="btn btn-link btn-add-filter" @click="addInclusionFilter">
          <i class="icon icon-plus"></i>
          Add Inclusion Filter
        </button>
      </div>

      <!-- Exclusion Criteria Section -->
      <div class="query-filter-container__section" v-if="exclusionFilters.length > 0 || showExclusionSection">
        <h3 class="query-filter-container__section-title">Exclusion Criterias</h3>
        
        <query-filter-card
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
        />

        <button class="btn btn-link btn-add-filter" @click="addExclusionFilter">
          <i class="icon icon-plus"></i>
          Add Exclusion Filter
        </button>
      </div>

      <button 
        v-if="!showExclusionSection && exclusionFilters.length === 0"
        class="btn btn-secondary"
        @click="showExclusionSection = true"
      >
        Add Exclusion Criteria
      </button>
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
      <h4>Filter Configuration:</h4>
      <pre>{{ JSON.stringify(getAllFilters(), null, 2) }}</pre>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import QueryFilterCard from './QueryFilterCard.vue';
import { QueryFilterCardModel, QueryFilterCondition, QueryFilterChip, QueryFilterManager } from '../lib/models/QueryFilterModel';

export default defineComponent({
  name: 'QueryFilterDemo',
  components: {
    QueryFilterCard
  },
  setup() {
    const activeTab = ref('all');
    const showExclusionSection = ref(false);
    const showDebug = ref(false);
    const filterManager = new QueryFilterManager();

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
    initializeSampleData();

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
      // Would open a dialog to add new event/condition
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
        filterManager.filters = [];
        showExclusionSection.value = false;
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

    return {
      activeTab,
      showExclusionSection,
      showDebug,
      inclusionFilters,
      exclusionFilters,
      updateFilter,
      addInclusionFilter,
      addExclusionFilter,
      handleAddEvent,
      handleAddCondition,
      handleEditCondition,
      handleDuplicateCondition,
      handleRemoveCondition,
      handleAddChip,
      handleRemoveChip,
      handleShowMenu,
      applyFilters,
      clearFilters,
      exportFilters,
      getAllFilters
    };
  }
});
</script>

<style lang="scss" scoped>
@import '../styles/queryFilterCard';

.query-filter-demo {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;

  h2 {
    margin-bottom: 24px;
    color: #333;
  }

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

    h4 {
      margin-bottom: 12px;
      color: #666;
    }

    pre {
      background: white;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.5;
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

.icon {
  font-family: 'Font Awesome 5 Free', 'app-icons';
  font-style: normal;
  font-weight: 900;
  
  &-plus::before { content: '\f067'; }
}
</style>