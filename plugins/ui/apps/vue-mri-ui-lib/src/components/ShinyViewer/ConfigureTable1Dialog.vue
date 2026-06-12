<template>
  <MessageBox
    v-if="isOpen"
    class="table1-config-messagebox"
    messageType="custom"
    dialogWidth="520px"
    :busy="loading"
    @close="handleCancel"
  >
    <template #header>
      <div class="table1-dialog-header">
        <span>{{ getText('MRI_PA_TABLE1_CONFIG_TITLE') }}</span>
        <button type="button" class="table1-dialog-close" :aria-label="getText('MRI_PA_CLOSE_BUTTON')" @click="handleCancel">
          &#215;
        </button>
      </div>
    </template>

    <template #body>
      <div class="table1-config-dialog">
        <p class="description">{{ getText('MRI_PA_TABLE1_CONFIG_DESC') }}</p>

        <div class="covariate-card">
          <div class="covariate-card__header">{{ getText('MRI_PA_TABLE1_COVARIATE_HEADER') }}</div>
          <div class="covariate-card__body">
            <div v-if="errorMessage" class="error-state">
              <p class="error-text">{{ errorMessage }}</p>
              <appButton class="table1-action-button table1-action-button--primary" :click="handleRetry" :text="getText('MRI_PA_TABLE1_RETRY_BUTTON')" :disabled="loading" />
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
    </template>

    <template #footer>
      <appButton
        class="table1-action-button table1-action-button--secondary"
        :click="handleCancel"
        :text="getText('MRI_PA_TOOLTIP_BOOKMARK_BACK')"
        :disabled="loading"
      />
      <appButton
        class="table1-action-button table1-action-button--primary"
        :click="handleConfirm"
        :text="getText('MRI_PA_TABLE1_GENERATE_BUTTON')"
        :disabled="loading || !!errorMessage || selectedConceptSetItems.length === 0"
      />
    </template>
  </MessageBox>
</template>

<script lang="ts" setup>
import { computed, toRef } from 'vue'
import { useStore } from 'vuex'
import MessageBox from '../MessageBox.vue'
import appButton from '@/lib/ui/app-button.vue'
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

function handleConfirm() {
  if (loading.value || errorMessage.value || selectedConceptSetItems.value.length === 0) {
    return
  }
  emit('confirm', getSelectedConceptSetsForConfirm())
}
</script>

<style scoped>
.table1-config-dialog {
  min-height: 264px;
  padding: 24px;
}

.description {
  color: #595757;
  font-size: 16px;
  line-height: 1.45;
  margin: 0 0 20px;
}

.table1-dialog-header {
  align-items: center;
  color: var(--color-mri-brand, #000080);
  display: flex;
  font-size: 24px;
  font-weight: 700;
  justify-content: space-between;
  line-height: 1.2;
  width: 100%;
}

.table1-dialog-close {
  align-items: center;
  background: transparent;
  border: 0;
  color: var(--color-mri-brand, #000080);
  cursor: pointer;
  display: inline-flex;
  font-size: 30px;
  font-weight: 400;
  height: 32px;
  justify-content: center;
  line-height: 1;
  padding: 0;
  width: 32px;
}

.covariate-card {
  border: 1px solid var(--color-ui-light-border, #d9d9d9);
  border-radius: 4px;
  overflow: visible;
}

.covariate-card__header {
  background: #edf4fb;
  color: var(--color-mri-brand, #000080);
  font-size: 16px;
  font-weight: 700;
  padding: 14px 16px;
}

.covariate-card__body {
  padding: 24px 16px;
}

.covariate-picker__label {
  color: var(--color-ui-dark-text, #595757);
  display: block;
  font-size: 12px;
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

.table1-action-button {
  flex: 1 1 0;
}

:global(.table1-config-messagebox.message-box .modal-container) {
  border-radius: 12px;
  box-shadow: 0 18px 32px rgba(0, 0, 0, 0.24);
  max-width: calc(100vw - 32px);
}

:global(.table1-config-messagebox.message-box .modal-header) {
  background: var(--color-ui-lightest-bg, #fff);
  box-shadow: none;
  padding: 24px 24px 0;
}

:global(.table1-config-messagebox.message-box div.message-box-custom header.modal-header) {
  box-shadow: none;
}

:global(.table1-config-messagebox.message-box .modal-header-container) {
  height: auto;
  justify-content: stretch;
  line-height: normal;
  padding: 0;
}

:global(.table1-config-messagebox.message-box .modal-header-container > span) {
  width: 100%;
}

:global(.table1-config-messagebox.message-box .modal-body) {
  max-height: calc(100vh - 180px);
}

:global(.table1-config-messagebox.message-box .modal-footer) {
  background: var(--color-ui-lightest-bg, #fff);
  border-top: 1px solid var(--color-ui-light-border, #e5e5e5);
  gap: 16px;
  padding: 16px 24px;
}

:global(.table1-config-messagebox.message-box .modal-footer button.table1-action-button) {
  margin: 0;
  padding: 0;
}

:global(.table1-config-messagebox.message-box button.table1-action-button .buttonInner) {
  align-items: center;
  border-radius: 6px;
  display: flex;
  height: 40px;
  justify-content: center;
  padding: 0 16px;
  width: 100%;
}

:global(.table1-config-messagebox.message-box button.table1-action-button .buttonContent) {
  font-size: 16px;
  font-weight: 700;
  height: auto;
  line-height: 1;
}

:global(.table1-config-messagebox.message-box button.table1-action-button--primary .buttonInner) {
  background: var(--color-mri-brand, #000080);
  border-color: var(--color-mri-brand, #000080);
  color: var(--color-mri-lightest-text, #fff);
  text-shadow: none;
}

:global(.table1-config-messagebox.message-box button.table1-action-button--secondary .buttonInner) {
  background: var(--color-ui-lightest-bg, #fff);
  border-color: var(--color-mri-button-border, #c9d0ea);
  color: var(--color-mri-brand, #000080);
  text-shadow: none;
}

:global(.table1-config-messagebox.message-box button.table1-action-button.disabled .buttonInner) {
  background: #dedbd9;
  border-color: #dedbd9;
  color: #9a9a9a;
  opacity: 1;
}

:global(.table1-config-messagebox.message-box div.message-box-custom footer button.table1-action-button.disabled .buttonInner) {
  background: #dedbd9;
  border-color: #dedbd9;
  color: #9a9a9a;
  opacity: 1;
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

:deep(.covariate-picker .multiselect__placeholder),
:deep(.covariate-picker .multiselect__input),
:deep(.covariate-picker .multiselect__single) {
  color: var(--color-ui-darkest-text, #000);
  font-size: 16px;
}

:deep(.covariate-picker .multiselect__tag) {
  background: #d7e8ff;
  border: 0;
  border-radius: 999px;
  color: var(--color-mri-brand, #000080);
  font-size: 14px;
  margin-bottom: 6px;
  padding: 4px 26px 4px 10px;
}

:deep(.covariate-picker .multiselect__tag-icon::after) {
  color: var(--color-mri-brand, #000080);
}

:deep(.covariate-picker .multiselect__tag span > i:not(.multiselect__tag-icon)) {
  display: none;
}

:deep(.covariate-picker .unicode-icon button) {
  background: var(--color-mri-brand, #000080);
  border-color: var(--color-mri-brand, #000080);
  border-radius: 999px;
  color: var(--color-mri-lightest-text, #fff);
  height: 48px;
  width: 48px;
}

:deep(.covariate-picker .unicode-icon span) {
  color: var(--color-mri-lightest-text, #fff);
  font-size: 30px;
  line-height: 1;
}
</style>
