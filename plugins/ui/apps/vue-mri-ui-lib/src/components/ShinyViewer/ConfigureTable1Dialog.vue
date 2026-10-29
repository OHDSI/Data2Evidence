<template>
  <D2eDialog
    :model-value="isOpen"
    :busy="loading"
    :title="getText('MRI_PA_TABLE1_CONFIG_TITLE')"
    :subtitle="getText('MRI_PA_TABLE1_CONFIG_DESC')"
    :close-label="getText('MRI_PA_CLOSE_BUTTON')"
    data-testid="pa-table1-config-dialog"
    @close="handleClose"
  >
    <div v-if="isOpen" class="table1-config-dialog">
      <div class="covariate-card">
        <div class="covariate-card__header">{{ getText('MRI_PA_TABLE1_COVARIATE_HEADER') }}</div>
        <div class="covariate-card__body">
          <div v-if="errorMessage" class="error-state">
            <p class="error-text">{{ errorMessage }}</p>
            <D2eButton :disabled="loading" data-testid="pa-table1-retry-btn" @click="handleRetry">
              {{ getText('MRI_PA_TABLE1_RETRY_BUTTON') }}
            </D2eButton>
          </div>
          <p v-else-if="showEmptyState" class="status-text">
            {{ getText('MRI_PA_TABLE1_NO_CONCEPT_SETS') }}
          </p>

          <div v-if="showPicker" class="covariate-picker">
            <label class="covariate-picker__label">{{ getText('MRI_PA_TABLE1_CONCEPT_SET_LABEL') }}</label>
            <QueryFilterTagInputAdapter
              :model="conceptSetPickerModel"
              :external-value="selectedConceptSetItems"
              :external-domain-values="conceptSetDomainValues"
              :external-texts="tagInputTexts"
              @update:value="handleSelectedConceptSetsChange"
              @search-change="handleSearchChange"
              @concept-set-action="handleConceptSetAction"
            />
          </div>
        </div>
      </div>
    </div>
    <template #actions>
      <D2eButton variant="secondary" :disabled="loading" data-testid="pa-table1-back-btn" @click="handleCancel">
        {{ getText('MRI_PA_TOOLTIP_BOOKMARK_BACK') }}
      </D2eButton>
      <D2eButton
        :disabled="loading || !!errorMessage || selectedConceptSetItems.length === 0"
        data-testid="pa-table1-generate-btn"
        @click="handleConfirm"
      >
        {{ getText('MRI_PA_TABLE1_GENERATE_BUTTON') }}
      </D2eButton>
    </template>
  </D2eDialog>
</template>

<script lang="ts" setup>
import { computed, toRef } from 'vue'
import { useStore } from 'vuex'
import { D2eButton, D2eDialog } from '@d2e/ui'
import QueryFilterTagInputAdapter from '@/lib/ui/QueryFilterTagInputAdapter.vue'
import { useTable1ConceptSetPicker, type Table1ConceptSetSelection } from '@/composables/useTable1ConceptSetPicker'
import type { TagInputModel } from '@/query-filter/types/ConceptSetTypes'

const props = withDefaults(defineProps<{
  isOpen: boolean
  datasetId: string
  initialConceptSets?: Table1ConceptSetSelection[]
}>(), {
  initialConceptSets: () => [],
})

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'close'): void
  (e: 'confirm', conceptSets: Table1ConceptSetSelection[]): void
}>()

const store = useStore()
const getText = (key: string, param?: string | string[]) => store.getters.getText(key, param)

const {
  loading,
  errorMessage,
  selectedConceptSetItems,
  conceptSetDomainValues,
  showEmptyState,
  showPicker,
  handleSelectedConceptSetsChange,
  handleSearchChange,
  handleRetry,
  handleConceptSetAction,
  getSelectedConceptSetsForConfirm,
} = useTable1ConceptSetPicker({
  datasetId: toRef(props, 'datasetId'),
  isOpen: toRef(props, 'isOpen'),
  initialSelectedConceptSets: toRef(props, 'initialConceptSets'),
  getLoadErrorMessage: () => getText('MRI_PA_TABLE1_CONCEPT_SETS_ERROR'),
})

const conceptSetPickerModel = computed<TagInputModel>(() => ({
  id: 'table1-concept-sets',
  props: {
    type: 'conceptSet',
    value: selectedConceptSetItems.value,
    attributePath: 'table1.conceptSets',
    domainFilter: '',
    standardConceptCodeFilter: '',
  },
}))

const tagInputTexts = computed(() => ({
  placeholder: getText('MRI_PA_TABLE1_CONCEPT_SET_PLACEHOLDER'),
  enterSearchTerm: getText('MRI_PA_ENTER_SEARCH_TERM'),
  clearAll: getText('MRI_PA_FILTERCARD_CLEAR_ALL_BTN'),
  createConceptSet: getText('MRI_PA_TOOLTIP_CREATE_CONCEPT_SET'),
  loadingSuggestions: getText('MRI_PA_LOADING_SUGGESTIONS'),
  tooManyValues: getText('MRI_PA_TOO_MANY_VALUES'),
  noSuggestions: getText('MRI_PA_NO_SUGGESTIONS'),
}))

function handleCancel() {
  emit('cancel')
}

function handleClose() {
  emit('close')
}

function handleConfirm() {
  if (loading.value || errorMessage.value || selectedConceptSetItems.value.length === 0) {
    return
  }
  emit('confirm', getSelectedConceptSetsForConfirm())
}
</script>

<style scoped>
.covariate-card {
  border: 1px solid var(--color-ui-light-border, #dedcda);
  border-radius: 4px;
  overflow: visible;
}

.covariate-card__header {
  background: #ebf2fa;
  color: var(--color-mri-brand, #000080);
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
  padding: 10px 14px;
}

.covariate-card__body {
  padding: 12px 16px;
}

.covariate-picker__label {
  color: var(--color-ui-light-text, #595757);
  display: block;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
  margin-bottom: 4px;
}

.error-state {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
}

.status-text {
  color: var(--color-neutral, #595757);
}

.error-text {
  color: var(--color-feedback-error, #a3293d);
}

:deep(.covariate-picker .app-tag-input) {
  align-items: flex-start;
  gap: 16px;
}

:deep(.covariate-picker .multiselect) {
  flex: 1 1 auto;
}

:deep(.covariate-picker .multiselect__tags) {
  border-bottom-color: var(--color-ui-medium-border, #b8b8b8);
  min-height: 34px;
  padding-right: 0;
}
</style>
