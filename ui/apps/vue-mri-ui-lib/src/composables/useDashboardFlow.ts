/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-unused-vars */
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import {
  getFieldAttrKey,
  getFieldFilterCardPathForField,
  parseNumericInput,
  validateRequiredFields,
  isConditionField,
  type MissingRequiredField,
  type NumericFilterValue,
  type WizardDefinition,
  type WizardFieldDefinition,
} from '../utils/dashboardFlowUtils'
import { constraintContainsExpression, type Constraint } from '../services/dashboardFlowService'
import BinaryToString from '../utils/BinaryToString'

export interface WizardFieldValue {
  value: string | number | boolean | object
  text?: string
  display_value?: string
  includeDescendants?: boolean
}

export interface ConditionValue {
  value: string | WizardFieldValue
  displayName?: string
  useDescendants?: boolean
}

export interface WizardConfig {
  year?: { from: number | string | null; to: number | string | null }
  conditions?: ConditionValue[]
  dashboardType?: string
  fromDeepLink?: boolean
  [key: string]: unknown
}

export interface DashboardCode {
  name: string
  [key: string]: string | number | boolean | null | object
}

export interface DashboardContext {
  wizardConfig: WizardConfig | null
  conditions: ConditionValue[] | null
  mriquery: string | null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Getters {
  getActiveBookmark: { value: unknown }
  getWizardConfig: { value: WizardConfig | null }
  getPLRequest: (_params: { bmkId: string }) => unknown
  getConstraintForAttribute: (_params: { filterCardId: string; key: string }) => LocalConstraint | undefined
  getSelectedDataset: { value: { id: string } | null }
  getBookmarkFromIFR: { value: { cards: unknown[] } | null }
  getFilterCards: { value: Record<string, unknown> }
  getCurrentBookmarkHasChanges: { value: boolean }
  getActiveCohortMaterializedId: { value: string | null }
  getMaterializedCohorts: IMaterializedCohort[]
}

export interface LocalConstraint {
  id: string
  props?: {
    type?: string
    value?: unknown
    name?: string
    fromDate?: { value: Date | string }
    toDate?: { value: Date | string }
  }
}

export interface UseDashboardFlowReturn {
  // State
  showDashboardModal: Ref<boolean>
  showSaveCohortModal: Ref<boolean>
  saveCohortModalMode: Ref<'full' | 'bookmark-only' | 'materialize-only'>
  showDashboardSelectionModal: Ref<boolean>
  showRequiredFiltersModal: Ref<boolean>
  dashboardMetadataLoading: Ref<boolean>
  applyingRequiredFilters: Ref<boolean>
  dashboardSelectionError: Ref<string>
  requiredFiltersError: Ref<string>
  dashboardCodes: Ref<DashboardCode[]>
  wizardDefinitions: Ref<WizardDefinition[]>
  selectedDashboard: Ref<DashboardCode | null>
  selectedWizardDefinition: Ref<WizardDefinition | null>
  missingRequiredFields: Ref<MissingRequiredField[]>
  activeDashboardWizardConfig: Ref<WizardConfig | null>
  // New state for mini wizards form
  allWizardFields: Ref<WizardFieldDefinition[]>
  initialFormValues: Ref<Record<string, string | number | object>>
  initialDisplayValues: Ref<Record<string, string>>

  // Computed
  dashboardContext: ComputedRef<DashboardContext>

  // Methods
  resetDashboardFlowState: () => void
  openDashboardModal: () => Promise<void>
  closeDashboardSelectionModal: () => void
  handleDashboardSelected: (_dashboard: DashboardCode) => Promise<void>
  handleRequiredFiltersCancel: () => void
  handleRequiredFiltersSubmit: (
    _formValues: Record<string, string | number | object>,
    _displayValues: Record<string, string>,
    _dirtyFieldIds: Set<string>
  ) => Promise<void>
  handleSaveCohortSuccess: () => void
  handleCancelSaveCohort: () => void
  closeDashboardModal: () => void
  isProcessingDashboardFlow: () => boolean
}

export function useDashboardFlow(
  dispatch: (action: string, _payload?: unknown) => Promise<unknown>,
  getters: Getters
): UseDashboardFlowReturn {
  // State
  const showDashboardModal = ref(false)
  const showSaveCohortModal = ref(false)
  const saveCohortModalMode = ref<'full' | 'bookmark-only' | 'materialize-only'>('full')
  const showDashboardSelectionModal = ref(false)
  const showRequiredFiltersModal = ref(false)
  const dashboardMetadataLoading = ref(false)
  const applyingRequiredFilters = ref(false)
  const dashboardSelectionError = ref('')
  const requiredFiltersError = ref('')
  const dashboardCodes = ref<DashboardCode[]>([])
  const wizardDefinitions = ref<WizardDefinition[]>([])
  const selectedDashboard = ref<DashboardCode | null>(null)
  const selectedWizardDefinition = ref<WizardDefinition | null>(null)
  const missingRequiredFields = ref<MissingRequiredField[]>([])
  const activeDashboardWizardConfig = ref<Record<string, any> | null>(null)
  // New state for mini wizards form
  const allWizardFields = ref<WizardFieldDefinition[]>([])
  const initialFormValues = ref<Record<string, any>>({})
  const initialDisplayValues = ref<Record<string, string>>({})
  const fieldToCardMap = ref<Record<string, string>>({})
  const createdCards = ref<string[]>([])
  const originalConstraintValues = ref<
    Array<{
      filterCardId: string
      constraintId: string
      oldValue: any
    }>
  >([])
  // Flag to prevent bookmark watcher from resetting state during flow
  let isProcessingDashboardFlow = false

  // Computed
  const dashboardContext = computed(() => {
    const activeBookmark = getters.getActiveBookmark?.value || getters.getActiveBookmark
    if (!activeBookmark) {
      return { wizardConfig: null, conditions: null, mriquery: null }
    }
    const localConfig = activeDashboardWizardConfig.value
    const storeConfig = getters.getWizardConfig?.value || getters.getWizardConfig || null
    const wizardConfig = localConfig || storeConfig || null
    let mriquery = null
    try {
      const plRequest = getters.getPLRequest?.({ bmkId: activeBookmark.id })
      mriquery = JSON.stringify(plRequest)
    } catch (e) {
      console.error('Failed to generate mriquery:', e)
    }
    return { wizardConfig, conditions: null, mriquery }
  })

  function normalizeResponseArray(payload: any): any[] {
    if (Array.isArray(payload)) {
      return payload
    }
    if (Array.isArray(payload?.data)) {
      return payload.data
    }
    return []
  }

  function resetDashboardFlowState() {
    showDashboardSelectionModal.value = false
    showRequiredFiltersModal.value = false
    dashboardMetadataLoading.value = false
    applyingRequiredFilters.value = false
    dashboardSelectionError.value = ''
    requiredFiltersError.value = ''
    dashboardCodes.value = []
    wizardDefinitions.value = []
    selectedDashboard.value = null
    selectedWizardDefinition.value = null
    missingRequiredFields.value = []
    activeDashboardWizardConfig.value = null
    allWizardFields.value = []
    initialFormValues.value = {}
    initialDisplayValues.value = {}
    fieldToCardMap.value = {}
    createdCards.value = []
    originalConstraintValues.value = []
  }

  function findFilterCardByFixedAttributes(field: WizardFieldDefinition): string | null {
    const filterCardPath = field.filterCardPath || getFieldFilterCardPathForField(field)
    const candidateCards = getNonExcludedFilterCardIdsByPath(filterCardPath)

    // If field has no fixedAttributes requirement, return first matching card by filterCardPath
    // This allows fields like age/gender to reuse empty cards
    if (!field.fixedAttributes?.length) {
      return candidateCards[0] || null
    }

    // For fields WITH fixedAttributes, filter by matching constraints
    const matchingCards = candidateCards.filter(cardId => {
      return field.fixedAttributes!.every(fixedAttr => {
        const attrKey = getFieldAttrKey(fixedAttr.configPath)
        const constraint = getters.getConstraintForAttribute?.({
          filterCardId: cardId,
          key: attrKey,
        })

        const matches = constraintContainsExpression(
          constraint as Constraint,
          fixedAttr.operator,
          String(fixedAttr.value)
        )

        return matches
      })
    })

    if (matchingCards.length === 0) {
      return null
    }

    if (matchingCards.length > 1) {
      console.warn('[DashboardFlow] Multiple cards match fixedAttributes:', {
        fieldId: field.id,
        matchingCardIds: matchingCards,
        usingFirst: matchingCards[0],
      })
    }

    return matchingCards[0]
  }

  function extractValueFromCard(
    filterCardId: string,
    configPath: string,
    fieldId: string
  ): {
    value: any
    displayValue?: string
    useDescendants?: boolean
  } | null {
    const attrKey = getFieldAttrKey(configPath)
    const getConstraintForAttribute = getters.getConstraintForAttribute
    const constraint = getConstraintForAttribute?.({ filterCardId, key: attrKey })

    if (!constraint) {
      return null
    }

    const constraintType = constraint.props?.type
    const constraintValue = constraint.props?.value
    const isAgeField = fieldId.toLowerCase() === 'age'

    if (constraintType === 'text' || constraintType === 'conceptSet') {
      const values = Array.isArray(constraintValue) ? constraintValue : []
      if (values.length > 0) {
        const firstValue = values[0]
        const value = typeof firstValue === 'object' ? firstValue.value : firstValue
        const displayValue =
          typeof firstValue === 'object' ? firstValue.display_value || firstValue.text || firstValue.value : firstValue
        const useDescendants = values[0]?.includeDescendants

        return { value, displayValue, useDescendants }
      }
    } else if (constraintType === 'num') {
      const values = Array.isArray(constraintValue) ? constraintValue : []
      if (values.length > 0) {
        const firstValue = values[0]
        // For Age field, format numeric value with operator for display (e.g., ">50", "[50-80]")
        // For other numeric fields, use the raw value
        let formattedValue: string

        if (isAgeField && firstValue.and) {
          // Range format like [50-80]
          formattedValue = buildNumericRangeExpression(firstValue.and)
        } else if (isAgeField) {
          formattedValue =
            firstValue.op && firstValue.op !== '=' ? firstValue.op + String(firstValue.value) : String(firstValue.value)
        } else {
          formattedValue = String(firstValue.value)
        }

        return { value: formattedValue }
      }
    } else if (constraintType === 'time' || constraintType === 'datetime') {
      const fromDate = constraint.props?.fromDate?.value
      const toDate = constraint.props?.toDate?.value
      if (fromDate || toDate) {
        return { value: { from: fromDate, to: toDate } }
      }
    }

    return null
  }

  function extractInitialValuesFromFilterCards(wizardDef: WizardDefinition): {
    formValues: Record<string, any>
    displayValues: Record<string, string>
    fieldToCardMap: Record<string, string>
  } {
    const formValues: Record<string, any> = {}
    const displayValues: Record<string, string> = {}
    const cardMap: Record<string, string> = {}

    for (const field of wizardDef.fields) {
      // Skip wizard-only fields (they store data in wizardConfig, not in filter cards)
      if (field.isWizardField) {
        continue
      }

      // Skip fields without configPath (yearRange, etc.)
      if (!field.configPath) {
        continue
      }

      // Find matching card using fixedAttributes
      const cardId = findFilterCardByFixedAttributes(field)

      if (cardId) {
        // Track card mapping even for empty cards so we UPDATE instead of CREATE
        cardMap[field.id] = cardId

        const extracted = extractValueFromCard(cardId, field.configPath!, field.id)
        if (extracted) {
          // Convert value to string for proper v-model binding
          let stringValue: string
          if (typeof extracted.value === 'object' && extracted.value !== null && 'value' in extracted.value) {
            stringValue = String(extracted.value.value)
          } else if (typeof extracted.value === 'object' && extracted.value !== null && 'text' in extracted.value) {
            stringValue = String(extracted.value.text)
          } else {
            stringValue = String(extracted.value)
          }

          formValues[field.id] = stringValue
          if (extracted.displayValue) {
            displayValues[field.id] = String(extracted.displayValue)
          }
          if (extracted.useDescendants !== undefined) {
            formValues[`${field.id}_includeDescendants`] = extracted.useDescendants
          }
        }
      }
    }

    // Extract condition field values from wizardConfig.conditions array
    // Condition fields are wizard-only (isWizardField: true) and stored in wizardConfig.conditions
    const localConfig = activeDashboardWizardConfig.value
    const storeConfig = getters.getWizardConfig?.value || getters.getWizardConfig || null
    const wizardConfig = localConfig || storeConfig || null
    const conditions: Array<{ value: string | object; displayName?: string; useDescendants?: boolean }> =
      wizardConfig?.conditions || []

    for (const field of wizardDef.fields) {
      if (!field.id.toLowerCase().startsWith('condition')) {
        continue
      }

      // Get condition index (condition1 -> 0, condition2 -> 1, etc.)
      const conditionIndex = parseInt(field.id.replace(/^condition/i, ''), 10) - 1
      if (conditionIndex >= 0 && conditionIndex < conditions.length) {
        const condition = conditions[conditionIndex]
        if (condition && condition.value) {
          // Extract numeric/non-numeric condition value
          let extractedValue: string
          let extractedDisplayValue: string

          if (typeof condition.value === 'object' && condition.value !== null) {
            const val = condition.value as any
            extractedValue = String(val.value || val.text || '')
            extractedDisplayValue = val.display_value || val.text || extractedValue
          } else {
            extractedValue = String(condition.value)
            extractedDisplayValue = condition.displayName || extractedValue
          }

          formValues[field.id] = extractedValue
          if (extractedDisplayValue) {
            displayValues[field.id] = extractedDisplayValue
          }
          if (condition.useDescendants !== undefined) {
            formValues[`${field.id}_includeDescendants`] = condition.useDescendants
          }
        }
      }
    }

    // Extract yearRange values from wizardConfig.year
    // YearRange fields are wizard-only (isWizardField: true) and stored in wizardConfig.year
    const yearRange = wizardConfig?.year
    for (const field of wizardDef.fields) {
      if (field.type !== 'yearRange') {
        continue
      }

      if (yearRange) {
        const fromValue = yearRange.from !== undefined ? String(yearRange.from) : ''
        const toValue = yearRange.to !== undefined ? String(yearRange.to) : ''

        formValues[`${field.id}_from`] = fromValue
        formValues[`${field.id}_to`] = toValue
      }
    }

    return { formValues, displayValues, fieldToCardMap: cardMap }
  }

  async function applyFieldChanges(
    changedFields: Array<{ field: WizardFieldDefinition; value: any; displayValue?: string }>
  ): Promise<void> {
    dispatch('holdFireRequest')

    // Track newly created cards by filterCardPath to avoid duplicates
    const newlyCreatedCardsByPath = new Map<string, string>()

    const operations: Array<{
      type: 'update' | 'create' | 'add-to-existing'
      filterCardId?: string
      filterCardPath?: string
      field: WizardFieldDefinition
      value: any
      displayValue?: string
    }> = []

    for (const { field, value, displayValue } of changedFields) {
      // Skip wizard-only fields (condition fields and fields without configPath)
      if (isConditionField(field.id) || !field.configPath) {
        continue
      }

      const existingCardId = fieldToCardMap.value[field.id]
      const filterCardPath = field.filterCardPath || getFieldFilterCardPathForField(field)

      if (existingCardId) {
        // UPDATE existing card
        operations.push({
          type: 'update',
          filterCardId: existingCardId,
          field,
          value,
          displayValue,
        })
      } else {
        // Check if we already created a card for this filterCardPath in this batch
        const reusableCardId = newlyCreatedCardsByPath.get(filterCardPath)

        if (reusableCardId) {
          // REUSE the card we just created for this same filterCardPath
          operations.push({
            type: 'add-to-existing',
            filterCardId: reusableCardId,
            field,
            value,
            displayValue,
          })
        } else {
          // CREATE new card (first field with this filterCardPath)
          operations.push({
            type: 'create',
            filterCardPath,
            field,
            value,
            displayValue,
          })
        }
      }
    }

    // Execute operations
    for (const op of operations) {
      if (op.type === 'update' && op.filterCardId) {
        const attrKey = getFieldAttrKey(op.field.configPath!)
        const constraint = getters.getConstraintForAttribute?.({
          filterCardId: op.filterCardId,
          key: attrKey,
        })

        if (constraint) {
          // Store original value for revert
          originalConstraintValues.value.push({
            filterCardId: op.filterCardId,
            constraintId: constraint.id,
            oldValue: constraint.props?.value,
          })

          await applyConstraintValue(constraint, op.value, '=', op.displayValue)
        }
      } else if (op.type === 'add-to-existing' && op.filterCardId) {
        // Add constraint to already-created card
        const attrKey = getFieldAttrKey(op.field.configPath!)
        await dispatch('addFilterCardConstraint', {
          filterCardId: op.filterCardId,
          key: attrKey,
        })

        const constraint = getters.getConstraintForAttribute?.({
          filterCardId: op.filterCardId,
          key: attrKey,
        })

        if (constraint) {
          await applyConstraintValue(constraint, op.value, '=', op.displayValue)
        }
      } else if (op.type === 'create') {
        // Create new card with fixedAttributes
        const newCardId = await dispatch('addFilterCard', {
          configPath: op.filterCardPath!,
        })

        createdCards.value.push(newCardId)
        // Track this new card by its filterCardPath
        newlyCreatedCardsByPath.set(op.filterCardPath!, newCardId)

        // Apply fixedAttributes first
        if (op.field.fixedAttributes?.length) {
          for (const fixedAttr of op.field.fixedAttributes) {
            const fixedAttrKey = getFieldAttrKey(fixedAttr.configPath)
            await dispatch('addFilterCardConstraint', {
              filterCardId: newCardId,
              key: fixedAttrKey,
            })

            const constraint = getters.getConstraintForAttribute?.({
              filterCardId: newCardId,
              key: fixedAttrKey,
            })

            if (constraint) {
              await applyConstraintValue(constraint, fixedAttr.value, fixedAttr.operator)
            }
          }
        }

        // Apply the main field value
        const attrKey = getFieldAttrKey(op.field.configPath!)
        await dispatch('addFilterCardConstraint', {
          filterCardId: newCardId,
          key: attrKey,
        })

        const constraint = getters.getConstraintForAttribute?.({
          filterCardId: newCardId,
          key: attrKey,
        })

        if (constraint) {
          await applyConstraintValue(constraint, op.value, '=', op.displayValue)
        }
      }
    }

    dispatch('releaseFireRequest')
    dispatch('setFireRequest')
    dispatch('refreshPatientCount')
  }

  async function revertFieldChanges(): Promise<void> {
    // Restore original constraint values
    for (const { constraintId, oldValue } of originalConstraintValues.value) {
      if (oldValue) {
        await dispatch('updateConstraintValue', {
          constraintId,
          value: oldValue,
        })
      }
    }

    // Delete created filter cards
    for (const cardId of createdCards.value) {
      await dispatch('removeFilterCard', { filterCardId: cardId })
    }

    // Clear tracking
    originalConstraintValues.value = []
    createdCards.value = []
    fieldToCardMap.value = {}
  }

  async function fetchDashboardCodes(datasetId: string): Promise<DashboardCode[]> {
    const response = await dispatch('ajaxAuth', {
      method: 'get',
      url: `/system-portal/dataset/dashboard-codes?datasetId=${encodeURIComponent(datasetId)}&type=cohort`,
    })
    return normalizeResponseArray(response.data)
  }

  async function fetchWizardDefinitions(datasetId: string): Promise<WizardDefinition[]> {
    const query = `datasetId=${encodeURIComponent(datasetId)}`
    const urls = [`/pa-config-svc/wizards/config?${query}`, `/d2e/pa-config-svc/wizards/config?${query}`]
    let lastError: Error | null = null
    for (const url of urls) {
      try {
        const response = await dispatch('ajaxAuth', { method: 'get', url })
        return Array.isArray(response.data?.wizards) ? response.data.wizards : []
      } catch (error) {
        lastError = error as Error
      }
    }
    throw lastError || new Error('Failed to fetch wizard definitions')
  }

  function resolveMissingFields(fields: MissingRequiredField[]): MissingRequiredField[] {
    return fields.map(field => ({
      ...field,
      label: field.label || field.id,
    }))
  }

  async function loadDashboardMetadata() {
    dashboardMetadataLoading.value = true
    dashboardSelectionError.value = ''
    try {
      const datasetId = getters.getSelectedDataset?.value?.id || getters.getSelectedDataset?.id
      if (!datasetId) {
        throw new Error('No dataset selected')
      }
      const [codes, definitions] = await Promise.all([
        fetchDashboardCodes(datasetId),
        fetchWizardDefinitions(datasetId),
      ])
      dashboardCodes.value = codes
      wizardDefinitions.value = definitions
    } catch (error) {
      dashboardSelectionError.value = (error as Error)?.message || 'Failed to load dashboard configuration'
    } finally {
      dashboardMetadataLoading.value = false
    }
  }

  async function openDashboardModal() {
    const activeBookmark = getters.getActiveBookmark?.value || getters.getActiveBookmark
    if (!activeBookmark) {
      dispatch('setToastMessage', { text: 'Open or create a cohort before opening dashboards.' })
      return
    }
    resetDashboardFlowState()

    // Check for existing wizardConfig from wizards/deep link
    const storeWizardConfig = getters.getWizardConfig?.value || getters.getWizardConfig || null
    const existingWizardConfig = storeWizardConfig as WizardConfig | null
    const existingDashboardType = existingWizardConfig?.dashboardType

    // Load metadata first (needed for both paths)
    await loadDashboardMetadata()

    // Only skip modals if explicitly from deep link
    if (existingDashboardType && existingWizardConfig?.fromDeepLink === true) {
      // Validate that the dashboard exists
      const matchingDashboard = dashboardCodes.value.find((d: DashboardCode) => d.name === existingDashboardType)

      if (matchingDashboard) {
        // Use existing wizardConfig directly and skip both modals
        // Go straight to save cohort check / dashboard opening
        activeDashboardWizardConfig.value = existingWizardConfig
        await handleOpenDashboard()
        return
      }

      // If no matching dashboard found, clear the config and fall through to show modal
      console.warn(`[Dashboard] No dashboard found for type: ${existingDashboardType}`)
      dispatch('clearWizardConfig')
    }

    // For manual flow or no flag, clear old config so user can select again
    if (existingWizardConfig) {
      dispatch('clearWizardConfig')
    }

    // Show selection modal
    showDashboardSelectionModal.value = true
  }

  function closeDashboardSelectionModal() {
    showDashboardSelectionModal.value = false
    isProcessingDashboardFlow = false
  }

  async function handleRequiredFiltersCancel() {
    await revertFieldChanges()
    requiredFiltersError.value = ''
    showRequiredFiltersModal.value = false
    isProcessingDashboardFlow = false
  }

  function getCurrentFilterCards() {
    const bookmarkFromIFR = getters.getBookmarkFromIFR?.value || getters.getBookmarkFromIFR
    return bookmarkFromIFR?.cards || null
  }

  function getNonExcludedFilterCardIdsByPath(filterCardPath: string): string[] {
    const getFilterCards = getters.getFilterCards
    const filterCards = typeof getFilterCards === 'function' ? getFilterCards() : getFilterCards?.value
    return Object.keys(filterCards || {}).filter(filterCardId => {
      const filterCard = filterCards[filterCardId]
      return filterCard?.props?.key === filterCardPath && !filterCard?.props?.excludeFilter
    })
  }

  async function handleDashboardSelected(dashboard: DashboardCode) {
    dashboardSelectionError.value = ''
    selectedDashboard.value = dashboard
    const wizardDef = wizardDefinitions.value.find(wizard => wizard.id === dashboard.name)
    if (!wizardDef) {
      dashboardSelectionError.value = `Dashboard '${dashboard.name}' is not mapped to a wizard definition.`
      return
    }

    // Always show modal - mini wizards form
    selectedWizardDefinition.value = wizardDef
    allWizardFields.value = wizardDef.fields

    // Extract initial values from filter cards using fixedAttributes
    const { formValues, displayValues, fieldToCardMap: cardMap } = extractInitialValuesFromFilterCards(wizardDef)
    initialFormValues.value = formValues
    initialDisplayValues.value = displayValues
    fieldToCardMap.value = cardMap

    // Also calculate missing fields for display purposes
    const validation = validateRequiredFields(wizardDef, getCurrentFilterCards())
    missingRequiredFields.value = resolveMissingFields(validation.missingFields)

    showDashboardSelectionModal.value = false
    requiredFiltersError.value = ''
    showRequiredFiltersModal.value = true
  }

  function collectWizardConfigData(
    wizardDefinition: WizardDefinition,
    formValues: Record<string, any>,
    displayValues?: Record<string, string>
  ) {
    const wizardConfig: Record<string, any> = {}
    const conditions: Array<{ value: string; displayName: string; useDescendants: boolean }> = []
    for (const field of wizardDefinition.fields || []) {
      if (field.type === 'yearRange') {
        const from = formValues[`${field.id}_from`]
        const to = formValues[`${field.id}_to`]
        if (from || to) {
          wizardConfig.year = { from: from || null, to: to || null }
        }
        continue
      }
      if (field.id.toLowerCase().startsWith('condition')) {
        const value = formValues[field.id]
        if (value !== undefined && value !== null && value !== '') {
          conditions.push({
            value,
            displayName: displayValues?.[field.id] || value,
            useDescendants: formValues[`${field.id}_includeDescendants`] === true,
          })
        }
        continue
      }
      if (!field.configPath) {
        const value = formValues[field.id]
        if (value !== undefined && value !== null && value !== '') {
          if (displayValues?.[field.id]) {
            wizardConfig[field.id] = { value, displayName: displayValues[field.id] }
          } else {
            wizardConfig[field.id] = value
          }
        }
      }
    }
    if (conditions.length > 0) {
      wizardConfig.conditions = conditions
    }
    return wizardConfig
  }

  async function prepareWizardConfigAndContinue(
    wizardDefinition: WizardDefinition,
    wizardOnlyValues?: Record<string, any>,
    formValues?: Record<string, any>,
    displayValues?: Record<string, string>
  ) {
    const wizardConfig: Record<string, any> = {
      dashboardType: wizardDefinition.id,
    }
    if (wizardOnlyValues && Object.keys(wizardOnlyValues).length > 0) {
      Object.assign(wizardConfig, wizardOnlyValues)
    }
    if (formValues) {
      const fullWizardConfig = collectWizardConfigData(wizardDefinition, formValues, displayValues)
      // Merge conditions: combine wizardOnlyValues.conditions with fullWizardConfig.conditions
      // Use a Map to deduplicate by value to avoid duplicates when condition was in missing fields
      const conditionMap = new Map<string, any>()
      const allConditions = [...(wizardConfig.conditions || []), ...(fullWizardConfig.conditions || [])]
      allConditions.forEach(cond => {
        if (cond.value && !conditionMap.has(cond.value)) {
          conditionMap.set(cond.value, cond)
        }
      })
      if (conditionMap.size > 0) {
        wizardConfig.conditions = Array.from(conditionMap.values())
      }
      if (fullWizardConfig.year) {
        wizardConfig.year = fullWizardConfig.year
      }
      Object.keys(fullWizardConfig).forEach(key => {
        if (key !== 'conditions' && key !== 'year' && !wizardConfig[key]) {
          wizardConfig[key] = fullWizardConfig[key]
        }
      })
    }
    activeDashboardWizardConfig.value = wizardConfig
    dispatch('setWizardConfig', wizardConfig)
    await handleOpenDashboard()
  }

  async function applyConstraintValue(
    constraint: any,
    rawInput: any,
    operator = '=',
    displayValue?: string
  ): Promise<any> {
    const constraintType = constraint.props.type
    if (constraintType === 'num') {
      let parsedValues: NumericFilterValue[] = []
      if (typeof rawInput === 'string') {
        parsedValues = parseNumericInput(rawInput)
        if (
          operator &&
          operator !== '=' &&
          /^-?\d+(?:\.\d+)?$/.test(rawInput.trim()) &&
          parsedValues.length === 1 &&
          parsedValues[0].op === '='
        ) {
          parsedValues[0].op = operator
        }
      } else if (typeof rawInput === 'number') {
        parsedValues = [{ op: operator || '=', value: rawInput }]
      } else if (rawInput !== null && typeof rawInput !== 'undefined') {
        const numericValue = Number(rawInput)
        if (!Number.isNaN(numericValue)) {
          parsedValues = [{ op: operator || '=', value: numericValue }]
        }
      }
      if (!parsedValues.length) {
        console.error('[DashboardFlow] Invalid numeric value:', { rawInput, constraint })
        return Promise.reject(new Error(`Invalid numeric value for ${constraint.props.name || constraint.id}`))
      }
      return dispatch('updateConstraintValue', {
        constraintId: constraint.id,
        value: parsedValues,
      })
    }
    if (rawInput && typeof rawInput === 'object' && 'from' in rawInput && 'to' in rawInput) {
      const fromYear = rawInput.from
      const toYear = rawInput.to
      if (!fromYear && !toYear) {
        return Promise.reject(new Error(`Missing year value for ${constraint.props.name || constraint.id}`))
      }
      const fromDate = fromYear ? new Date(`${fromYear}-01-01`) : new Date(`${toYear}-01-01`)
      const toDate = toYear ? new Date(`${toYear}-12-31`) : new Date(`${fromYear}-12-31`)
      return dispatch('updateDateConstraintValue', {
        constraintId: constraint.id,
        fromDateValue: fromDate,
        toDateValue: toDate,
        isUTC: false,
      })
    }
    if (constraintType === 'time' || constraintType === 'datetime') {
      const fromDateRaw = rawInput?.from || rawInput?.value || rawInput
      const toDateRaw = rawInput?.to || rawInput?.value || rawInput
      if (!fromDateRaw && !toDateRaw) {
        return Promise.reject(new Error(`Missing date value for ${constraint.props.name || constraint.id}`))
      }
      const fromDate = new Date(fromDateRaw || toDateRaw)
      const toDate = new Date(toDateRaw || fromDateRaw)
      return dispatch('updateDateConstraintValue', {
        constraintId: constraint.id,
        fromDateValue: fromDate,
        toDateValue: toDate,
        isUTC: false,
      })
    }
    const rawValue = rawInput?.value ?? rawInput
    if (rawValue === null || typeof rawValue === 'undefined' || String(rawValue).trim() === '') {
      return Promise.reject(new Error(`Missing value for ${constraint.props.name || constraint.id}`))
    }
    const finalDisplayValue = displayValue || rawInput?.displayName || String(rawValue)
    return dispatch('updateConstraintValue', {
      constraintId: constraint.id,
      value: [
        {
          value: String(rawValue),
          score: 1,
          display_value: finalDisplayValue,
          text: finalDisplayValue,
        },
      ],
    })
  }

  async function handleRequiredFiltersSubmit(
    formValues: Record<string, any>,
    displayValues: Record<string, string>,
    dirtyFieldIds: Set<string>
  ) {
    requiredFiltersError.value = ''
    applyingRequiredFilters.value = true
    isProcessingDashboardFlow = true

    try {
      // Get only changed fields
      const changedFields = allWizardFields.value
        .filter(f => dirtyFieldIds.has(f.id))
        .map(f => ({
          field: f,
          value: formValues[f.id],
          displayValue: displayValues[f.id],
        }))

      // Apply changes to filter cards (creates new or updates existing)
      await applyFieldChanges(changedFields)

      showRequiredFiltersModal.value = false

      if (selectedWizardDefinition.value) {
        // Collect wizard config data (includes condition fields and year)
        const wizardOnlyValues = collectWizardConfigData(selectedWizardDefinition.value, formValues, displayValues)

        await prepareWizardConfigAndContinue(
          selectedWizardDefinition.value,
          wizardOnlyValues,
          formValues,
          displayValues
        )
      }
    } catch (error) {
      console.error('[DashboardFlow] Error in handleRequiredFiltersSubmit:', error)
      requiredFiltersError.value = (error as Error)?.message || 'Failed to apply required filters'
      isProcessingDashboardFlow = false
    } finally {
      applyingRequiredFilters.value = false
    }
  }

  /**
   * Get the active materialized cohort for the current bookmark
   */
  function getActiveMaterializedCohort(): IMaterializedCohort | null {
    const activeBookmark = getters.getActiveBookmark?.value || getters.getActiveBookmark
    if (!activeBookmark) return null

    const cohortId = (activeBookmark as any).cohortDefinitionId
    if (!cohortId) return null

    const materializedCohorts = getters.getMaterializedCohorts || []
    return materializedCohorts.find(mc => mc.id === cohortId) || null
  }

  /**
   * Check if current filters match the stored materialized cohort's MRI query
   */
  function checkCohortMatchesCurrentFilters(): boolean {
    const cohort = getActiveMaterializedCohort()
    if (!cohort || !cohort.syntax) {
      return false
    }

    try {
      // Parse the stored syntax
      const syntaxObj = JSON.parse(cohort.syntax)
      const storedMriQuery = syntaxObj.mriquery
      if (!storedMriQuery) {
        return false
      }

      // Decode the stored MRI query
      const decodedStoredQuery = BinaryToString(storedMriQuery)
      const storedFilter = JSON.parse(decodedStoredQuery)
      const storedFilterCards = storedFilter.cohortDefinition?.cards || []

      // Get current filter state
      const activeBookmark = getters.getActiveBookmark?.value || getters.getActiveBookmark
      if (!activeBookmark) {
        return false
      }

      const plRequest = getters.getPLRequest?.({ bmkId: (activeBookmark as any).id })
      const currentFilterCards = (plRequest as any)?.cohortDefinition?.cards || []

      if (!storedFilterCards || !currentFilterCards) {
        return false
      }

      // Compare filter.cards arrays using deep equality
      const storedJson = JSON.stringify(storedFilterCards)
      const currentJson = JSON.stringify(currentFilterCards)
      return storedJson === currentJson
    } catch (error) {
      console.error('[DashboardFlow] Error comparing cohort filters:', error)
      return false
    }
  }

  async function handleOpenDashboard() {
    const activeBookmark = getters.getActiveBookmark?.value || getters.getActiveBookmark
    const isNew = activeBookmark?.isNew || false
    let hasLocalChanges = false
    try {
      hasLocalChanges = getters.getCurrentBookmarkHasChanges?.value || getters.getCurrentBookmarkHasChanges || false
    } catch (e) {
      hasLocalChanges = false
    }

    // Scenario 1: New bookmark - always show full modal
    if (isNew) {
      saveCohortModalMode.value = 'full'
      showSaveCohortModal.value = true
      return
    }

    const materializedId = getters.getActiveCohortMaterializedId?.value || getters.getActiveCohortMaterializedId
    const cohortExists = !!materializedId
    const cohortMatches = cohortExists && checkCohortMatchesCurrentFilters()

    // Scenario 5: Existing bookmark, no changes, cohort exists and matches - skip modal
    if (!hasLocalChanges && cohortExists && cohortMatches) {
      // Ensure wizardConfig is set before opening, wait for reactivity if needed
      if (!activeDashboardWizardConfig.value) {
        await new Promise(resolve => setTimeout(resolve, 50))
        if (!activeDashboardWizardConfig.value) {
          dispatch('setToastMessage', { text: 'Dashboard configuration not ready. Please try again.' })
          return
        }
      }
      showDashboardModal.value = true
      isProcessingDashboardFlow = false
      return
    }

    // Scenario 7: Existing bookmark, no changes, no cohort - materialize-only modal
    if (!hasLocalChanges && !cohortExists) {
      saveCohortModalMode.value = 'materialize-only'
      showSaveCohortModal.value = true
      return
    }

    // Scenario 2: Existing bookmark, has changes, cohort exists and matches - bookmark-only modal
    if (hasLocalChanges && cohortExists && cohortMatches) {
      saveCohortModalMode.value = 'bookmark-only'
      showSaveCohortModal.value = true
      return
    }

    // Scenario 3, 4, 6: All other cases - full modal (save + materialize)
    // - Scenario 3: Existing bookmark, has changes, cohort exists but doesn't match
    // - Scenario 4: Existing bookmark, has changes, no cohort
    // - Scenario 6: Existing bookmark, no changes, cohort exists but doesn't match
    saveCohortModalMode.value = 'full'
    showSaveCohortModal.value = true
  }

  function handleSaveCohortSuccess() {
    showSaveCohortModal.value = false
    showDashboardModal.value = true
    isProcessingDashboardFlow = false
  }

  function handleCancelSaveCohort() {
    showSaveCohortModal.value = false
    isProcessingDashboardFlow = false
  }

  function closeDashboardModal() {
    showDashboardModal.value = false
  }

  function isProcessingDashboardFlowFn() {
    return isProcessingDashboardFlow
  }

  function buildNumericRangeExpression(range: Array<{ op: string; value: number }>): string {
    if (range.length !== 2) return ''

    const lowerOp = range[0].op === '>' ? ']' : '['
    const upperOp = range[1].op === '<' ? '[' : ']'

    return `${lowerOp}${range[0].value}-${range[1].value}${upperOp}`
  }

  return {
    showDashboardModal,
    showSaveCohortModal,
    saveCohortModalMode,
    showDashboardSelectionModal,
    showRequiredFiltersModal,
    dashboardMetadataLoading,
    applyingRequiredFilters,
    dashboardSelectionError,
    requiredFiltersError,
    dashboardCodes,
    wizardDefinitions,
    selectedDashboard,
    selectedWizardDefinition,
    missingRequiredFields,
    activeDashboardWizardConfig,
    allWizardFields,
    initialFormValues,
    initialDisplayValues,
    dashboardContext,
    resetDashboardFlowState,
    openDashboardModal,
    closeDashboardSelectionModal,
    handleDashboardSelected,
    handleRequiredFiltersCancel,
    handleRequiredFiltersSubmit,
    handleSaveCohortSuccess,
    handleCancelSaveCohort,
    closeDashboardModal,
    isProcessingDashboardFlow: isProcessingDashboardFlowFn,
  }
}
