<template>
  <MessageBox v-if="isOpen" messageType="custom" dialogWidth="700px" :busy="loading" @close="handleCancel">
    <template #header>{{ getText('MRI_PA_TABLE1_CONFIG_TITLE') }}</template>

    <template #body>
      <div class="table1-config-dialog">
        <p class="description">{{ getText('MRI_PA_TABLE1_CONFIG_DESC') }}</p>

        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
        <p v-else-if="showEmptyState" class="status-text">
          {{ getText('MRI_PA_TABLE1_NO_CONCEPT_SETS') }}
        </p>

        <ul v-else-if="showConceptSetList" class="concept-set-list">
          <li v-for="conceptSet in conceptSets" :key="conceptSet.id" class="concept-set-item">
            <label class="concept-set-option">
              <input
                type="checkbox"
                :value="conceptSet.id"
                :checked="isSelected(conceptSet.id)"
                @change="toggleConceptSet(conceptSet)"
              />
              <span class="concept-set-name">{{ conceptSet.name }}</span>
            </label>
          </li>
        </ul>
      </div>
    </template>

    <template #footer>
      <div class="flex-spacer"></div>
      <appButton
        :click="handleConfirm"
        :text="getText('MRI_PA_TABLE1_GENERATE_BUTTON')"
        :disabled="loading || !!errorMessage || selectedConceptSets.length === 0"
      />
      <appButton :click="handleCancel" :text="getText('MRI_PA_BUTTON_CANCEL')" :disabled="loading" />
    </template>
  </MessageBox>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useStore } from 'vuex'
import MessageBox from '../MessageBox.vue'
import appButton from '@/lib/ui/app-button.vue'
import { loadConceptSets } from '@/query-filter/services/ConceptSetApiService'
import type { ConceptSetItemDisplay } from '@/query-filter/types/ConceptSetTypes'

export interface Table1ConceptSetSelection {
  id: string
  name: string
}

const props = defineProps<{
  isOpen: boolean
  datasetId: string
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'confirm', conceptSets: Table1ConceptSetSelection[]): void
}>()

const store = useStore()
const getText = (key: string, param?: string | string[]) => store.getters.getText(key, param)

const loading = ref(false)
const errorMessage = ref('')
const conceptSets = ref<Table1ConceptSetSelection[]>([])
const selectedConceptSets = ref<Table1ConceptSetSelection[]>([])
const showEmptyState = computed(() => !loading.value && !errorMessage.value && conceptSets.value.length === 0)
const showConceptSetList = computed(() => !loading.value && !errorMessage.value && conceptSets.value.length > 0)

function formatConceptSet(item: ConceptSetItemDisplay): Table1ConceptSetSelection {
  return {
    id: String(item.value),
    name: item.display_value || item.text || String(item.value),
  }
}

async function loadOptions() {
  selectedConceptSets.value = []
  conceptSets.value = []
  errorMessage.value = ''

  if (!props.datasetId) {
    errorMessage.value = getText('MRI_PA_TABLE1_CONCEPT_SETS_ERROR')
    return
  }

  loading.value = true
  try {
    const result = await loadConceptSets(props.datasetId)
    conceptSets.value = result.values.map(formatConceptSet)
  } catch (error) {
    console.error('[Table1] Failed to load concept sets:', error)
    errorMessage.value = getText('MRI_PA_TABLE1_CONCEPT_SETS_ERROR')
  } finally {
    loading.value = false
  }
}

function isSelected(id: string) {
  return selectedConceptSets.value.some(conceptSet => conceptSet.id === id)
}

function toggleConceptSet(conceptSet: Table1ConceptSetSelection) {
  if (isSelected(conceptSet.id)) {
    selectedConceptSets.value = selectedConceptSets.value.filter(selected => selected.id !== conceptSet.id)
    return
  }

  selectedConceptSets.value = [...selectedConceptSets.value, conceptSet]
}

function handleCancel() {
  emit('cancel')
}

function handleConfirm() {
  if (loading.value || errorMessage.value || selectedConceptSets.value.length === 0) {
    return
  }
  emit('confirm', selectedConceptSets.value)
}

watch(
  () => props.isOpen,
  isOpen => {
    if (isOpen) {
      loadOptions()
    } else {
      selectedConceptSets.value = []
      errorMessage.value = ''
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.table1-config-dialog {
  min-height: 280px;
}

.description {
  margin-bottom: 12px;
}

.concept-set-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 360px;
  overflow: auto;
  border: 1px solid var(--color-ui-light-border, #d9d9d9);
  border-radius: 8px;
}

.concept-set-item {
  border-bottom: 1px solid var(--color-ui-light-border, #ededed);
}

.concept-set-item:last-child {
  border-bottom: none;
}

.concept-set-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
}

.concept-set-name {
  font-weight: 500;
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
