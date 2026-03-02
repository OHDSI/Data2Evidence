<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import ChevronButton from '@/components/ChevronButton.vue'
import type { InclusionRuleStat } from '@/query-filter/types/InclusionReportTypes'

export interface AttritionStat {
  id: number
  name: string
  countSatisfying: number
  percentSatisfying: string
  pctDiff: string
}

const props = defineProps<{
  selectedVisualization: 'ATTRITION' | 'INTERSECT'
  selectedPersonEventView: 'PERSON' | 'EVENT'
  draggableAttritionStats: AttritionStat[]
  inclusionRuleStats: InclusionRuleStat[]
  areAllRulesChecked: boolean
  isRuleChecked: (ruleId: number) => boolean
  getRowIndex: (statId: number) => number
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

function handleDragEnd() {
  emit('drag-end')
}

function handleMoveRowUp(statId: number) {
  emit('move-row-up', statId)
}

function handleMoveRowDown(statId: number) {
  emit('move-row-down', statId)
}
</script>

<template>
  <VueDraggable
    :key="`${selectedPersonEventView}-${selectedVisualization}`"
    :model-value="draggableAttritionStats"
    @update:model-value="emit('update:draggableAttritionStats', $event)"
    target=".rules-table tbody"
    :disabled="selectedVisualization === 'INTERSECT'"
    :animation="150"
    @end="handleDragEnd"
  >
    <table class="rules-table">
      <thead>
        <tr>
          <th v-if="selectedVisualization === 'INTERSECT'">
            <input
              type="checkbox"
              :checked="areAllRulesChecked"
              @change="handleToggleAllRules"
              title="Select/unselect all rules"
            />
          </th>
          <th v-if="selectedVisualization === 'ATTRITION'"></th>
          <th v-if="selectedVisualization === 'ATTRITION'"></th>
          <!-- <th class="rule-id">ID</th> -->
          <th class="rule-name">Inclusion rule</th>
          <!-- count satisfying -->
          <th>No. of Persons</th>
          <!-- percent satisfying -->
          <th v-if="selectedVisualization === 'ATTRITION'">%</th>
          <th v-else>% satisfied</th>
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
              title="Move up"
              @click="handleMoveRowUp(stat.id)"
            />
            <ChevronButton
              direction="down"
              :disabled="getRowIndex(stat.id) === draggableAttritionStats.length - 1"
              title="Move down"
              @click="handleMoveRowDown(stat.id)"
            />
          </td>
          <!-- <td class="rule-id">{{ stat.id + 1 }}</td> -->
          <td class="rule-name">
            <!-- bold 'OR' -->
            <template v-for="(part, i) in stat.name.split(/\b(OR)\b/)" :key="i">
              <b v-if="part === 'OR'">OR</b>
              <template v-else>{{ part }}</template>
            </template>
          </td>
          <td>{{ stat.countSatisfying.toLocaleString() }}</td>
          <td v-if="selectedVisualization === 'ATTRITION'">
            {{ (100 - parseFloat(stat.percentSatisfying)).toFixed(2) }}%
          </td>
          <td v-else>{{ stat.percentSatisfying }}</td>
          <!-- <td>{{ stat.pctDiff }}</td> -->
        </tr>
      </tbody>
      <tbody v-else>
        <tr v-for="stat in inclusionRuleStats" :key="stat.id" :class="{ 'grayed-out': !isRuleChecked(stat.id) }">
          <td>
            <input type="checkbox" :checked="isRuleChecked(stat.id)" @change="handleToggleRuleSelection(stat.id)" />
          </td>
          <!-- <td class="rule-id">{{ stat.id + 1 }}</td> -->
          <td class="rule-name">
            {{ stat.name }}
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
table {
  font-size: 16px;

  .rule-name {
    max-width: 70ch;
  }
}

.rules-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--color-ui-light-border, #ddd);
  text-align: left;
  color: var(--color-ui-medium-text);

  .rule-name {
    text-align: left;
  }

  thead {
    background-color: var(--color-ui-extra-light-bg, #ddd);
  }

  th {
    padding: 0.5rem;
    font-weight: 500;
    border-bottom: 2px solid var(--color-ui-light-border, #ddd);
    color: #333;
  }

  td {
    padding: 0.5rem;
    cursor: inherit;

    &.drag-icon {
      cursor: move;
      padding: 0.1rem;
      font-size: 24px;
      text-align: center;
    }

    &.reorder-buttons {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.1rem;
    }
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
}
</style>
