<script setup lang="ts">
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
    <span>Having</span>
    <select :value="allAnyOption" @change="handleAllAnyChange">
      <option value="ALL">ALL</option>
      <option value="ANY">ANY</option>
    </select>
    <span>of selected criteria</span>
    <select :value="passedFailedOption" @change="handlePassedFailedChange">
      <option value="PASSED">PASSED</option>
      <option value="FAILED">FAILED</option>
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
    padding: 0.5rem 0.75rem;
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
