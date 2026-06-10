<template>
  <MessageBox v-if="isOpen" messageType="custom" dialogWidth="700px" :busy="loading" @close="handleCancel">
    <template #header>{{ getText('MRI_PA_TABLE1_CONFIG_TITLE') }}</template>

    <template #body>
      <div class="table1-config-dialog">
        <p class="description">{{ getText('MRI_PA_TABLE1_CONFIG_DESC') }}</p>

        <div v-if="errorMessage" class="error-state">
          <p class="error-text">{{ errorMessage }}</p>
          <appButton :click="handleRetry" :text="getText('MRI_PA_TABLE1_RETRY_BUTTON')" :disabled="loading" />
        </div>
        <p v-else-if="showEmptyState" class="status-text">
          {{ getText('MRI_PA_TABLE1_NO_CONCEPT_SETS') }}
        </p>

        <QueryFilterTagInputAdapter
          v-if="showPicker"
          :model="conceptSetPickerModel"
          :external-value="selectedConceptSetItems"
          :external-domain-values="conceptSetDomainValues"
          :external-texts="tagInputTexts"
          @update:value="handleSelectedConceptSetsChange"
          @search-change="handleSearchChange"
          @concept-set-action="handleConceptSetAction"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex-spacer"></div>
      <appButton
        :click="handleConfirm"
        :text="getText('MRI_PA_TABLE1_GENERATE_BUTTON')"
        :disabled="loading || !!errorMessage || selectedConceptSetItems.length === 0"
      />
      <appButton :click="handleCancel" :text="getText('MRI_PA_BUTTON_CANCEL')" :disabled="loading" />
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
  min-height: 280px;
}

.description {
  margin-bottom: 12px;
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

.flex-spacer {
  flex: 1;
}
</style>
