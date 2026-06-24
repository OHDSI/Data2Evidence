import { computed, ref, watch, type Ref } from 'vue'
import { loadConceptSets } from '@/query-filter/services/ConceptSetApiService'
import type {
  ConceptSetAction,
  ConceptSetDomainValues,
  ConceptSetItemDisplay,
} from '@/query-filter/types/ConceptSetTypes'

export interface Table1ConceptSetSelection {
  id: string
  name: string
}

interface TerminologyCloseValues {
  currentConceptSet?: {
    id: string | number
    name: string
  } | null
}

interface UseTable1ConceptSetPickerOptions {
  datasetId: Ref<string>
  isOpen: Ref<boolean>
  initialSelectedConceptSets?: Ref<Table1ConceptSetSelection[]>
  getLoadErrorMessage: () => string
  dispatchTerminologyEvent?: (event: CustomEvent) => void
}

export function formatTable1ConceptSet(item: ConceptSetItemDisplay): Table1ConceptSetSelection {
  return {
    id: String(item.value),
    name: item.display_value || item.text || String(item.value),
  }
}

export function filterTable1ConceptSets(items: ConceptSetItemDisplay[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return items
  }

  return items.filter(item => {
    const id = String(item.value).toLowerCase()
    const name = (item.display_value || item.text || '').toLowerCase()
    return id.includes(normalizedQuery) || name.includes(normalizedQuery)
  })
}

export function useTable1ConceptSetPicker({
  datasetId,
  isOpen,
  initialSelectedConceptSets,
  getLoadErrorMessage,
  dispatchTerminologyEvent = event => window.dispatchEvent(event),
}: UseTable1ConceptSetPickerOptions) {
  const loading = ref(false)
  const errorMessage = ref('')
  const conceptSets = ref<ConceptSetItemDisplay[]>([])
  const selectedConceptSetItems = ref<ConceptSetItemDisplay[]>([])
  const searchQuery = ref('')

  const showEmptyState = computed(() => !loading.value && !errorMessage.value && conceptSets.value.length === 0)
  const showPicker = computed(() => !errorMessage.value)

  const conceptSetDomainValues = computed<ConceptSetDomainValues>(() => ({
    values: filterTable1ConceptSets(conceptSets.value, searchQuery.value),
    isLoading: loading.value,
    loadedStatus: loading.value ? 'NO_RESULTS' : conceptSets.value.length === 0 ? 'NO_RESULTS' : 'HAS_RESULTS',
  }))

  function reconcileSelectedConceptSets(selectConceptSetId?: string) {
    const optionsById = new Map(conceptSets.value.map(item => [String(item.value), item]))
    const selectedById = new Map(selectedConceptSetItems.value.map(item => [String(item.value), item]))

    if (selectConceptSetId) {
      const newSelection = optionsById.get(String(selectConceptSetId))
      if (newSelection) {
        selectedById.set(String(newSelection.value), newSelection)
      }
    }

    selectedConceptSetItems.value = Array.from(selectedById.values())
      .map(item => optionsById.get(String(item.value)) || item)
      .filter(item => optionsById.has(String(item.value)) || String(item.value) === String(selectConceptSetId))
  }

  function applyInitialSelection() {
    selectedConceptSetItems.value = (initialSelectedConceptSets?.value || [])
      .map(conceptSet => {
        const id = String(conceptSet.id ?? '').trim()
        const name = String(conceptSet.name ?? '').trim() || id
        return {
          value: id,
          text: name,
          display_value: name,
        }
      })
      .filter(item => item.value !== '')
  }

  async function loadOptions(options: { resetSelection?: boolean; selectConceptSetId?: string } = {}) {
    if (options.resetSelection) {
      applyInitialSelection()
    }
    conceptSets.value = []
    errorMessage.value = ''
    searchQuery.value = ''

    if (!datasetId.value) {
      errorMessage.value = getLoadErrorMessage()
      return
    }

    loading.value = true
    try {
      const result = await loadConceptSets(datasetId.value, { throwOnError: true })
      conceptSets.value = result.values
      reconcileSelectedConceptSets(options.selectConceptSetId)
    } catch (error) {
      console.error('[Table1] Failed to load concept sets:', error)
      errorMessage.value = getLoadErrorMessage()
    } finally {
      loading.value = false
    }
  }

  function handleSelectedConceptSetsChange(values: ConceptSetItemDisplay[]) {
    selectedConceptSetItems.value = values
  }

  function handleSearchChange(query: string) {
    searchQuery.value = query
  }

  function handleRetry() {
    loadOptions()
  }

  function handleConceptSetAction({ values, config }: ConceptSetAction) {
    const conceptSetId = values?.value
    const defaultFilters = [
      { id: 'domainId', value: config?.domainFilter ? [config.domainFilter] : [] },
      { id: 'concept', value: config?.standardConceptCodeFilter ? [config.standardConceptCodeFilter] : [] },
    ]

    const event = new CustomEvent('alp-terminology-open', {
      detail: {
        props: {
          selectedDatasetId: datasetId.value,
          selectedConceptSetId: conceptSetId,
          mode: 'CONCEPT_SET',
          defaultFilters,
          onClose: async (onCloseValues?: TerminologyCloseValues) => {
            const currentConceptSet = onCloseValues?.currentConceptSet
            if (!currentConceptSet) {
              return
            }

            await loadOptions({ selectConceptSetId: String(currentConceptSet.id) })
          },
        },
      },
    })

    dispatchTerminologyEvent(event)
  }

  function getSelectedConceptSetsForConfirm() {
    return selectedConceptSetItems.value.map(formatTable1ConceptSet)
  }

  watch(
    isOpen,
    open => {
      if (open) {
        loadOptions({ resetSelection: true })
      } else {
        selectedConceptSetItems.value = []
        errorMessage.value = ''
        searchQuery.value = ''
      }
    },
    { immediate: true }
  )

  if (initialSelectedConceptSets) {
    watch(
      initialSelectedConceptSets,
      () => {
        if (isOpen.value) {
          applyInitialSelection()
          reconcileSelectedConceptSets()
        }
      },
      { deep: true }
    )
  }

  watch(datasetId, () => {
    if (isOpen.value) {
      loadOptions({ resetSelection: true })
    }
  })

  return {
    loading,
    errorMessage,
    conceptSets,
    selectedConceptSetItems,
    searchQuery,
    conceptSetDomainValues,
    showEmptyState,
    showPicker,
    loadOptions,
    handleSelectedConceptSetsChange,
    handleSearchChange,
    handleRetry,
    handleConceptSetAction,
    getSelectedConceptSetsForConfirm,
  }
}
