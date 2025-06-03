<script lang="ts">
export default {
  name: 'VuetifyQueryFilterCard'
}
</script>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import { QueryFilterCardModel, QueryFilterChip as QueryFilterChipType } from '../lib/models/QueryFilterModel'
import VuetifyQueryFilterChip from './VuetifyQueryFilterChip.vue'

const props = defineProps<{
  filter: QueryFilterCardModel
}>()

const emit = defineEmits([
  'update:filter',
  'add-event',
  'add-condition',
  'edit-condition',
  'duplicate-condition',
  'remove-condition',
  'add-chip',
  'remove-chip',
  'show-menu',
  'remove-filter',
])

const sidebarLabel = computed(() => {
  return props.filter.type === 'inclusion' ? 'All Patients' : 'Exclusion'
})

const sidebarColor = computed(() => {
  return props.filter.type === 'inclusion' ? 'primary' : 'error'
})

const toggleExpanded = () => {
  props.filter.toggle()
  emit('update:filter', props.filter)
}

const addCondition = () => {
  const newCondition = props.filter.addCondition({
    conceptSet: 'New Concept Set',
    chips: [],
  })
  emit('update:filter', props.filter)
  emit('add-condition', props.filter.id, newCondition.id)
}

const editCondition = (conditionId: string) => {
  emit('edit-condition', props.filter.id, conditionId)
}

const duplicateCondition = (conditionId: string) => {
  const condition = props.filter.getCondition(conditionId)
  if (condition) {
    const duplicatedCondition = props.filter.addCondition({
      conceptSet: `${condition.conceptSet} (Copy)`,
      conceptSetId: condition.conceptSetId,
      chips: condition.chips.map(chip => ({
        ...chip,
        id: `chip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      })),
      operator: condition.operator,
    })
    emit('update:filter', props.filter)
    emit('duplicate-condition', props.filter.id, conditionId, duplicatedCondition.id)
  }
}

const removeCondition = (conditionId: string) => {
  const removed = props.filter.removeCondition(conditionId)
  if (removed) {
    emit('update:filter', props.filter)
    emit('remove-condition', props.filter.id, conditionId)
  }
}

const showConditionMenu = (conditionId: string) => {
  emit('show-menu', props.filter.id, conditionId)
}

const addChip = (conditionId: string) => {
  emit('add-chip', props.filter.id, conditionId)
}

const removeChip = (conditionId: string, chipId: string) => {
  const removed = props.filter.removeChipFromCondition(conditionId, chipId)
  if (removed) {
    emit('update:filter', props.filter)
    emit('remove-chip', props.filter.id, conditionId, chipId)
  }
}

const removeFilter = () => {
  emit('remove-filter', props.filter.id)
}

const addChipToCondition = (conditionId: string, chip: Partial<QueryFilterChipType>) => {
  const newChip: QueryFilterChipType = {
    id: chip.id || `chip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    label: chip.label || 'New Chip',
    value: chip.value || '',
    color: chip.color,
    conceptId: chip.conceptId,
    domainId: chip.domainId,
  }

  const added = props.filter.addChipToCondition(conditionId, newChip)
  if (added) {
    emit('update:filter', props.filter)
  }
  return added
}

defineExpose({
  addChipToCondition
})
</script>

<template>
  <v-card class="vuetify-query-filter-card" :class="{ 'is-exclusion': filter.type === 'exclusion' }">
    <!-- Sidebar -->
    <div class="filter-sidebar" :class="`bg-${sidebarColor}`">
      <span class="sidebar-label">{{ sidebarLabel }}</span>
    </div>

    <!-- Main Content -->
    <div class="filter-content">
      <!-- Header -->
      <div class="filter-header">
        <v-btn
          icon
          variant="text"
          size="small"
          @click="toggleExpanded"
          :aria-expanded="filter.isExpanded"
          :aria-label="filter.isExpanded ? 'Collapse filter' : 'Expand filter'"
        >
          <v-icon>{{ filter.isExpanded ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
        </v-btn>

        <v-btn color="primary" size="small" @click="$emit('add-event')">
          <v-icon start>mdi-plus-circle</v-icon>
          Add event
        </v-btn>
      </div>

      <!-- Expanded Content -->
      <v-expand-transition>
        <div v-show="filter.isExpanded" class="filter-body">
          <div v-for="condition in filter.conditions" :key="condition.id" class="condition-container">
            <div class="condition-header">
              <span class="condition-label">
                {{ condition.conceptSet || 'Condition concept set' }}
              </span>
              <div class="condition-actions">
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  @click="editCondition(condition.id)"
                  title="Edit condition"
                >
                  <v-icon size="small">mdi-pencil</v-icon>
                </v-btn>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  @click="duplicateCondition(condition.id)"
                  title="Duplicate condition"
                >
                  <v-icon size="small">mdi-content-copy</v-icon>
                </v-btn>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="removeCondition(condition.id)"
                  title="Remove condition"
                >
                  <v-icon size="small">mdi-delete</v-icon>
                </v-btn>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  @click="showConditionMenu(condition.id)"
                  title="More options"
                >
                  <v-icon size="small">mdi-dots-vertical</v-icon>
                </v-btn>
              </div>
            </div>

            <div class="condition-chips">
              <vuetify-query-filter-chip
                v-for="chip in condition.chips"
                :key="chip.id"
                :chip="chip"
                :removable="true"
                @remove="removeChip(condition.id, chip.id)"
              />
              <v-btn
                variant="outlined"
                size="small"
                class="add-chip-btn"
                @click="addChip(condition.id)"
              >
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </div>
          </div>

          <div v-if="filter.conditions.length === 0" class="empty-state">
            <p class="text-grey">No conditions added yet</p>
            <v-btn variant="text" color="primary" @click="addCondition">
              <v-icon start>mdi-plus</v-icon>
              Add condition
            </v-btn>
          </div>
        </div>
      </v-expand-transition>
    </div>
  </v-card>
</template>

<style lang="scss" scoped>
.vuetify-query-filter-card {
  position: relative;
  display: flex;
  overflow: hidden;
  margin-bottom: 16px;

  &.is-exclusion {
    .filter-sidebar {
      background-color: #ff6b6b !important;
    }
  }

  .filter-sidebar {
    width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: vertical-rl;
    text-orientation: mixed;

    .sidebar-label {
      color: white;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
  }

  .filter-content {
    flex: 1;
    padding: 0;
  }

  .filter-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  }

  .filter-body {
    padding: 16px;
  }

  .condition-container {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .condition-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .condition-label {
    font-size: 14px;
    color: #666;
  }

  .condition-actions {
    display: flex;
    gap: 2px;
  }

  .condition-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .add-chip-btn {
    border-style: dashed;
    min-width: 40px;
    height: 32px;
  }

  .empty-state {
    text-align: center;
    padding: 32px;

    p {
      margin-bottom: 16px;
    }
  }
}
</style>