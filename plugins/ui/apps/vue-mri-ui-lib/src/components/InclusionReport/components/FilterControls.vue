<script setup lang="ts">
import { useStore } from 'vuex'

const store = useStore()
const getText = (key: string, param?: string | string[]) => store.getters.getText(key, param)

const props = defineProps<{
  allAnyOption: 'ALL' | 'ANY'
  passedFailedOption: 'PASSED' | 'FAILED'
}>()

const emit = defineEmits<{
  'update:allAnyOption': [value: 'ALL' | 'ANY']
  'update:passedFailedOption': [value: 'PASSED' | 'FAILED']
}>()

function handleAllAnyChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as 'ALL' | 'ANY'
  emit('update:allAnyOption', value)
}

function handlePassedFailedChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as 'PASSED' | 'FAILED'
  emit('update:passedFailedOption', value)
}
</script>

<template>
  <div class="all-any-selector">
    <span>{{ getText('MRI_PA_INCLUSION_REPORT_HAVING') }}</span>
    <select :value="allAnyOption" @change="handleAllAnyChange">
      <option value="ALL">{{ getText('MRI_PA_INCLUSION_REPORT_ALL') }}</option>
      <option value="ANY">{{ getText('MRI_PA_INCLUSION_REPORT_ANY') }}</option>
    </select>
    <span>{{ getText('MRI_PA_INCLUSION_REPORT_OF_SELECTED_CRITERIA') }}</span>
    <select :value="passedFailedOption" @change="handlePassedFailedChange">
      <option value="PASSED">{{ getText('MRI_PA_INCLUSION_REPORT_PASSED') }}</option>
      <option value="FAILED">{{ getText('MRI_PA_INCLUSION_REPORT_FAILED') }}</option>
    </select>
  </div>
</template>

<style scoped lang="scss">
.all-any-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0;
  padding: 12px;
  padding-left: 0;

  span {
    color: var(--color-ui-medium-text);
  }

  select {
    appearance: auto;
    padding: 0.5rem 0.8rem;
    border: 1px solid var(--color-ui-light-border, #ddd);
    border-radius: 4px;
    cursor: pointer;
    color: var(--color-mri-dropdown-label-dark-text);

    &:hover {
      border-color: #999;
    }

    &:focus {
      outline: none;
      border-color: var(--color-focus, #005483);
      box-shadow: 0 0 0 2px var(--color-dialog-box-footer-shadow);
    }
  }
}
</style>
