<script lang="ts">
export default {
  name: 'PrimeVueQueryFilterCard'
}
</script>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import { QueryFilterCardModel, QueryFilterChip as QueryFilterChipType } from '../lib/models/QueryFilterModel'
import PrimeVueQueryFilterChip from './PrimeVueQueryFilterChip.vue'

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
  <div class="primevue-query-filter-card" :class="{ 'is-exclusion': filter.type === 'exclusion' }">
    <div class="filter-sidebar" :class="{ 'sidebar-exclusion': filter.type === 'exclusion' }">
      <span class="sidebar-label">{{ sidebarLabel }}</span>
    </div>

    <Card class="filter-card">
      <template #header>
        <div class="filter-header">
          <Button
            :icon="filter.isExpanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
            class="p-button-text p-button-sm toggle-btn"
            @click="toggleExpanded"
            :aria-expanded="filter.isExpanded"
            :aria-label="filter.isExpanded ? 'Collapse filter' : 'Expand filter'"
          />

          <Button 
            label="Add event"
            icon="pi pi-plus-circle"
            class="p-button-sm"
            @click="$emit('add-event')"
          />
        </div>
      </template>
      
      <template #content>
        <div v-if="filter.isExpanded" class="filter-content">
          <div v-for="condition in filter.conditions" :key="condition.id" class="condition-container">
            <div class="condition-header">
              <span class="condition-label">
                {{ condition.conceptSet || 'Condition concept set' }}
              </span>
              <div class="condition-actions">
                <Button
                  icon="pi pi-pencil"
                  class="p-button-text p-button-sm p-button-rounded"
                  @click="editCondition(condition.id)"
                  v-tooltip="'Edit condition'"
                />
                <Button
                  icon="pi pi-copy"
                  class="p-button-text p-button-sm p-button-rounded"
                  @click="duplicateCondition(condition.id)"
                  v-tooltip="'Duplicate condition'"
                />
                <Button
                  icon="pi pi-trash"
                  class="p-button-text p-button-sm p-button-rounded p-button-danger"
                  @click="removeCondition(condition.id)"
                  v-tooltip="'Remove condition'"
                />
                <Button
                  icon="pi pi-ellipsis-v"
                  class="p-button-text p-button-sm p-button-rounded"
                  @click="showConditionMenu(condition.id)"
                  v-tooltip="'More options'"
                />
              </div>
            </div>

            <div class="condition-chips">
              <prime-vue-query-filter-chip
                v-for="chip in condition.chips"
                :key="chip.id"
                :chip="chip"
                :removable="true"
                @remove="removeChip(condition.id, chip.id)"
              />
              <Button
                icon="pi pi-plus"
                class="p-button-outlined p-button-sm add-chip-btn"
                @click="addChip(condition.id)"
                aria-label="Add filter"
              />
            </div>
          </div>

          <div v-if="filter.conditions.length === 0" class="empty-state">
            <p>No conditions added yet</p>
            <Button
              label="Add condition"
              icon="pi pi-plus"
              class="p-button-text"
              @click="addCondition"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<style lang="scss" scoped>
.primevue-query-filter-card {
  position: relative;
  display: flex;
  margin-bottom: 16px;

  &.is-exclusion {
    .filter-sidebar {
      background: #ff6b6b;
    }
  }

  .filter-sidebar {
    width: 40px;
    background: #3b82f6;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    border-radius: 6px 0 0 6px;

    &.sidebar-exclusion {
      background: #ff6b6b;
    }

    .sidebar-label {
      color: white;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
  }

  .filter-card {
    flex: 1;
    border-radius: 0 6px 6px 0;

    :deep(.p-card-header) {
      padding: 8px 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    :deep(.p-card-content) {
      padding: 16px;
    }
  }

  .filter-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toggle-btn {
    :deep(.p-button-icon) {
      font-size: 14px;
    }
  }

  .filter-content {
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
      gap: 4px;
    }

    .condition-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .add-chip-btn {
      border-style: dashed;
      width: 32px;
      height: 32px;
      padding: 0;
    }

    .empty-state {
      text-align: center;
      padding: 32px;
      color: #666;

      p {
        margin-bottom: 16px;
      }
    }
  }
}
</style>