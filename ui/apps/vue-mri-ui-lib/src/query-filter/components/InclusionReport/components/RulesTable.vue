<script setup lang="ts">
import { ref } from 'vue'
import { useStore } from 'vuex'
import { VueDraggable } from 'vue-draggable-plus'
import ChevronButton from '@/components/ChevronButton.vue'
import RuleNameContent from './RuleNameContent.vue'
import type { InclusionRuleStat, RuleFilterCardDetails } from '@/query-filter/types/InclusionReportTypes'
import type { AttritionStat } from '../computeAttritionStats'

const props = defineProps<{
  selectedVisualization: 'ATTRITION' | 'INTERSECT'
  selectedPersonEventView: 'PERSON' | 'EVENT'
  draggableAttritionStats: AttritionStat[]
  inclusionRuleStats: InclusionRuleStat[]
  areAllRulesChecked: boolean
  isRuleChecked: (ruleId: number) => boolean
  getRowIndex: (statId: number) => number
  filterCardDetails?: RuleFilterCardDetails[]
}>()

const emit = defineEmits<{
  'toggle-all-rules': []
  'toggle-rule-selection': [ruleId: number]
  'drag-end': []
  'move-row-up': [statId: number]
  'move-row-down': [statId: number]
  'update:draggableAttritionStats': [stats: AttritionStat[]]
}>()

function handleToggleAllRules() {
  emit('toggle-all-rules')
}

function handleToggleRuleSelection(ruleId: number) {
  emit('toggle-rule-selection', ruleId)
}

const isDragging = ref(false)

function handleDragStart() {
  isDragging.value = true
}

function handleDragEnd() {
  isDragging.value = false
  emit('drag-end')
}

function handleMoveRowUp(statId: number) {
  emit('move-row-up', statId)
}

function handleMoveRowDown(statId: number) {
  emit('move-row-down', statId)
}

const store = useStore()
const getText = (key: string, param?: string | string[]) => store.getters.getText(key, param)
</script>

<template>
  <VueDraggable
    :key="`${selectedPersonEventView}-${selectedVisualization}`"
    :model-value="draggableAttritionStats"
    @update:model-value="emit('update:draggableAttritionStats', $event)"
    target=".rules-table tbody"
    :disabled="selectedVisualization === 'INTERSECT'"
    :animation="150"
    @start="handleDragStart"
    @end="handleDragEnd"
  >
    <table class="rules-table" :class="{ dragging: isDragging }">
      <thead>
        <tr>
          <th class="checkbox-col" v-if="selectedVisualization === 'INTERSECT'">
            <input
              type="checkbox"
              :checked="areAllRulesChecked"
              @change="handleToggleAllRules"
              :title="getText('MRI_PA_INCLUSION_REPORT_SELECT_ALL_RULES')"
            />
          </th>
          <th class="drag-icon-header" v-if="selectedVisualization === 'ATTRITION'"></th>
          <th v-if="selectedVisualization === 'ATTRITION'"></th>
          <!-- <th class="rule-id">ID</th> -->
          <th class="rule-name">{{ getText('MRI_PA_INCLUSION_REPORT_FILTER_COLUMN') }}<sup>1</sup></th>
          <!-- count satisfying -->
          <th>{{ getText('MRI_PA_INCLUSION_REPORT_NO_OF_PERSONS') }}</th>
          <!-- percent satisfying -->
          <th v-if="selectedVisualization === 'ATTRITION'">
            {{ getText('MRI_PA_INCLUSION_REPORT_PERCENTAGE_OF_TOTAL') }}
          </th>
          <th v-else>{{ getText('MRI_PA_INCLUSION_REPORT_PERCENTAGE_SATISFIED') }}</th>
          <!-- percent excluded -->
          <!-- <th v-if="selectedVisualization === 'ATTRITION'">% diff</th>
          <th v-else>% to-gain</th> -->
        </tr>
      </thead>
      <tbody v-if="selectedVisualization === 'ATTRITION'">
        <tr v-for="stat in draggableAttritionStats" :key="stat.id">
          <td class="drag-icon">⋮</td>
          <td class="reorder-buttons">
            <ChevronButton
              direction="up"
              :disabled="getRowIndex(stat.id) === 0"
              :title="getText('MRI_PA_INCLUSION_REPORT_MOVE_UP')"
              @click="handleMoveRowUp(stat.id)"
            />
            <ChevronButton
              direction="down"
              :disabled="getRowIndex(stat.id) === draggableAttritionStats.length - 1"
              :title="getText('MRI_PA_INCLUSION_REPORT_MOVE_DOWN')"
              @click="handleMoveRowDown(stat.id)"
            />
          </td>
          <!-- <td class="rule-id">{{ stat.id + 1 }}</td> -->
          <td class="rule-name">
            <RuleNameContent :stat="stat" :filter-card-details="filterCardDetails" />
          </td>
          <td>{{ stat.countSatisfying.toLocaleString() }}</td>
          <td v-if="selectedVisualization === 'ATTRITION'">{{ stat.percentSatisfying }}</td>
          <td v-else>{{ stat.percentSatisfying }}</td>
          <!-- <td>{{ stat.pctDiff }}</td> -->
        </tr>
      </tbody>
      <tbody v-else>
        <tr v-for="stat in inclusionRuleStats" :key="stat.id" :class="{ 'grayed-out': !isRuleChecked(stat.id) }">
          <td class="checkbox-col">
            <input type="checkbox" :checked="isRuleChecked(stat.id)" @change="handleToggleRuleSelection(stat.id)" />
          </td>
          <!-- <td class="rule-id">{{ stat.id + 1 }}</td> -->
          <td class="rule-name">
            <RuleNameContent :stat="stat" :filter-card-details="filterCardDetails" />
          </td>
          <td>{{ stat.countSatisfying.toLocaleString() }}</td>
          <td>{{ stat.percentSatisfying }}</td>
          <!-- <td>{{ stat.percentExcluded }}</td> -->
        </tr>
      </tbody>
    </table>
  </VueDraggable>
</template>
<style scoped lang="scss">
.rules-table {
  width: 100%;
  font-size: 16px;
  border-collapse: collapse;
  border: 1px solid var(--color-ui-light-border, #ddd);
  text-align: right;
  color: var(--color-ui-medium-text);

  .rule-name {
    text-align: left;
    max-width: 70ch;
  }

  thead {
    background-color: var(--color-ui-extra-light-bg, #ddd);
  }

  th {
    padding: 0.5rem;
    font-weight: 500;
    border-bottom: 2px solid var(--color-ui-light-border, #ddd);
    color: #333;
    border-right: 1px solid var(--color-ui-light-border, #ddd);
  }

  td {
    padding: 0.5rem;
    cursor: inherit;
    border-right: 1px solid var(--color-ui-light-border, #ddd);

    &.drag-icon {
      cursor: move;
      padding: 0.1rem;
      font-size: 24px;
      text-align: center;
      border-right: none;
    }

    &.reorder-buttons {
      padding: 0.1rem;
    }
  }

  .checkbox-col {
    text-align: center;
    vertical-align: middle;
  }

  tr.grayed-out {
    color: var(--color-mri-disabled-text);
  }

  tr {
    border-bottom: 1px solid var(--color-ui-light-border, #ddd);
  }

  tbody tr:hover {
    background-color: var(--color-ui-extra-light-bg, #ddd);
  }

  &.dragging tbody tr {
    user-select: none;
  }

  .drag-icon-header {
    border-right: none;
  }

  :deep(.filter-card-details) {
    padding-left: 2em;
  }
}
</style>
