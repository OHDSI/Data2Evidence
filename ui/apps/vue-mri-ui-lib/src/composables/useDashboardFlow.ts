import { ref, computed, type Ref, type ComputedRef } from 'vue'
import {
  getFieldAttrKey,
  getFieldFilterCardPathForField,
  parseNumericInput,
  validateRequiredFields,
  type MissingRequiredField,
  type WizardDefinition,
} from '../utils/dashboardFlowUtils'

export interface DashboardCode {
  name: string
  [key: string]: any
}

export interface DashboardContext {
  wizardConfig: Record<string, any> | null
  conditions: any[] | null
  mriquery: string | null
}

export interface UseDashboardFlowReturn {
  // State
  showDashboardModal: Ref<boolean>
  showSaveCohortModal: Ref<boolean>
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
  activeDashboardWizardConfig: Ref<Record<string, any> | null>

  // Computed
  dashboardContext: ComputedRef<DashboardContext>

  // Methods
  resetDashboardFlowState: () => void
  openDashboardModal: () => Promise<void>
  closeDashboardSelectionModal: () => void
  handleDashboardSelected: (dashboard: DashboardCode) => Promise<void>
  handleRequiredFiltersCancel: () => void
  handleRequiredFiltersSubmit: (formValues: Record<string, any>, displayValues: Record<string, string>) => Promise<void>
  handleSaveCohortSuccess: () => void
  handleCancelSaveCohort: () => void
  closeDashboardModal: () => void
}

export function useDashboardFlow(dispatch: any, getters: any): UseDashboardFlowReturn {
  // State
  const showDashboardModal = ref(false)
  const showSaveCohortModal = ref(false)
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

  // Computed
  const dashboardContext = computed(() => {
    const activeBookmark = getters.getActiveBookmark?.value || getters.getActiveBookmark
    if (!activeBookmark) {
      return { wizardConfig: null, conditions: null, mriquery: null }
    }
    const wizardConfig = activeDashboardWizardConfig.value || getters.getWizardConfig?.value || null
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
    return fields.map((field) => ({
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
    showDashboardSelectionModal.value = true
    dispatch('clearWizardConfig')
    await loadDashboardMetadata()
  }

  function closeDashboardSelectionModal() {
    showDashboardSelectionModal.value = false
  }

  function handleRequiredFiltersCancel() {
    requiredFiltersError.value = ''
    showRequiredFiltersModal.value = false
  }

  function getCurrentFilterCards() {
    const bookmarkFromIFR = getters.getBookmarkFromIFR?.value || getters.getBookmarkFromIFR
    return bookmarkFromIFR?.cards || null
  }

  function getNonExcludedFilterCardIdsByPath(filterCardPath: string): string[] {
    const getFilterCards = getters.getFilterCards
    const filterCards = typeof getFilterCards === 'function' ? getFilterCards() : getFilterCards?.value
    return Object.keys(filterCards || {}).filter((filterCardId) => {
      const filterCard = filterCards[filterCardId]
      return filterCard?.props?.key === filterCardPath && !filterCard?.props?.excludeFilter
    })
  }

  function getConstraintExpressions(constraint: any): Array<{ operator: string; value: string }> {
    const constraintType = constraint?.props?.type
    if (!constraintType) {
      return []
    }
    if (constraintType === 'text' || constraintType === 'conceptSet') {
      const values = Array.isArray(constraint.props.value) ? constraint.props.value : []
      return values.map((item: any) => ({
        operator: '=',
        value: typeof item === 'object' && item !== null ? item.value : item,
      }))
    }
    if (constraintType === 'num') {
      const values = Array.isArray(constraint.props.value) ? constraint.props.value : []
      const expressions: Array<{ operator: string; value: string }> = []
      values.forEach((item: any) => {
        if (Array.isArray(item?.and)) {
          item.and.forEach((andExpression: any) => {
            expressions.push({ operator: andExpression.op, value: String(andExpression.value) })
          })
          return
        }
        expressions.push({ operator: item?.op, value: String(item?.value) })
      })
      return expressions
    }
    if (constraintType === 'time' || constraintType === 'datetime') {
      const expressions: Array<{ operator: string; value: string }> = []
      if (constraint.props.fromDate?.value) {
        expressions.push({ operator: '>=', value: constraint.props.fromDate.value })
      }
      if (constraint.props.toDate?.value) {
        expressions.push({ operator: '<=', value: constraint.props.toDate.value })
      }
      return expressions
    }
    return []
  }

  function constraintContainsExpression(constraint: any, operator: string, value: string): boolean {
    const expectedOperator = String(operator || '=').trim()
    const expectedValue = String(value).trim()
    return getConstraintExpressions(constraint).some((expression) => {
      const expressionOperator = String(expression.operator || '').trim()
      const expressionValue = String(expression.value ?? '').trim()
      return expressionOperator === expectedOperator && expressionValue === expectedValue
    })
  }

  function cardMatchesFixedAttributes(filterCardId: string, fixedAttributes: any[] = []): boolean {
    if (!fixedAttributes.length) {
      return true
    }
    return fixedAttributes.every((fixedAttribute) => {
      const attrKey = getFieldAttrKey(fixedAttribute.configPath)
      const getConstraintForAttribute = getters.getConstraintForAttribute
      const constraint = getConstraintForAttribute?.({ filterCardId, key: attrKey })
      if (!constraint) {
        return false
      }
      return constraintContainsExpression(constraint, fixedAttribute.operator, fixedAttribute.value)
    })
  }

  function findFilterCardIdForField(field: MissingRequiredField): string | null {
    const filterCardPath = getFieldFilterCardPathForField(field)
    const candidateCardIds = getNonExcludedFilterCardIdsByPath(filterCardPath)
    const fixedAttributes = field.fixedAttributes || []
    return (
      candidateCardIds.find((filterCardId) =>
        cardMatchesFixedAttributes(filterCardId, fixedAttributes)
      ) || null
    )
  }

  function extractFieldValueFromFilterCards(field: any): {
    value: any
    displayValue?: string
    useDescendants?: boolean
  } | null {
    if (!field.configPath) {
      return null
    }
    const filterCardPath = getFieldFilterCardPathForField(field)
    const matchingCardIds = getNonExcludedFilterCardIdsByPath(filterCardPath)
    for (const filterCardId of matchingCardIds) {
      const attrKey = getFieldAttrKey(field.configPath)
      const getConstraintForAttribute = getters.getConstraintForAttribute
      const constraint = getConstraintForAttribute?.({ filterCardId, key: attrKey })
      if (!constraint) {
        continue
      }
      const constraintType = constraint.props?.type
      const constraintValue = constraint.props?.value
      if (constraintType === 'text' || constraintType === 'conceptSet') {
        const values = Array.isArray(constraintValue) ? constraintValue : []
        if (values.length > 0) {
          const firstValue = values[0]
          const value = typeof firstValue === 'object' ? firstValue.value : firstValue
          const displayValue =
            typeof firstValue === 'object'
              ? firstValue.display_value || firstValue.text || firstValue.value
              : firstValue
          const useDescendants = values[0]?.includeDescendants
          return { value, displayValue, useDescendants }
        }
      } else if (constraintType === 'num') {
        const values = Array.isArray(constraintValue) ? constraintValue : []
        if (values.length > 0) {
          return { value: values[0].value }
        }
      }
      break
    }
    return null
  }

  function extractFormValuesFromFilterCards(selectedWizardDefinition: WizardDefinition): {
    formValues: Record<string, any>
    displayValues: Record<string, string>
  } {
    const formValues: Record<string, any> = {}
    const displayValues: Record<string, string> = {}
    for (const field of selectedWizardDefinition.fields || []) {
      if (field.configPath) {
        const extracted = extractFieldValueFromFilterCards(field)
        if (extracted) {
          formValues[field.id] = extracted.value
          if (extracted.displayValue) {
            displayValues[field.id] = extracted.displayValue
          }
          if (extracted.useDescendants !== undefined) {
            formValues[`${field.id}_wildcard`] = extracted.useDescendants
          }
        }
      }
    }
    return { formValues, displayValues }
  }

  async function handleDashboardSelected(dashboard: DashboardCode) {
    dashboardSelectionError.value = ''
    selectedDashboard.value = dashboard
    const wizardDef = wizardDefinitions.value.find((wizard) => wizard.id === dashboard.name)
    if (!wizardDef) {
      dashboardSelectionError.value = `Dashboard '${dashboard.name}' is not mapped to a wizard definition.`
      return
    }
    const validation = validateRequiredFields(wizardDef, getCurrentFilterCards())
    selectedWizardDefinition.value = wizardDef
    missingRequiredFields.value = resolveMissingFields(validation.missingFields)
    if (!missingRequiredFields.value.length) {
      showDashboardSelectionModal.value = false
      const { formValues, displayValues } = extractFormValuesFromFilterCards(wizardDef)
      await prepareWizardConfigAndContinue(wizardDef, {}, formValues, displayValues)
      return
    }
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
            useDescendants: formValues[`${field.id}_wildcard`] === true,
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
      if (fullWizardConfig.conditions) {
        wizardConfig.conditions = fullWizardConfig.conditions
      }
      if (fullWizardConfig.year) {
        wizardConfig.year = fullWizardConfig.year
      }
      Object.keys(fullWizardConfig).forEach((key) => {
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
      let parsedValues: Array<{ op: string; value: number }> = []
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
        return Promise.reject(
          new Error(`Invalid numeric value for ${constraint.props.name || constraint.id}`)
        )
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
        return Promise.reject(
          new Error(`Missing year value for ${constraint.props.name || constraint.id}`)
        )
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
        return Promise.reject(
          new Error(`Missing date value for ${constraint.props.name || constraint.id}`)
        )
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
      return Promise.reject(
        new Error(`Missing value for ${constraint.props.name || constraint.id}`)
      )
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

  async function applyMissingRequiredFilters(
    formValues: Record<string, any>,
    displayValues: Record<string, string>
  ): Promise<Record<string, any>> {
    dispatch('holdFireRequest')
    const filterCardPromises: Promise<any>[] = []
    const operations: any[] = []
    const wizardOnlyValues: Record<string, any> = {}
    const conditions: Array<{ value: string; displayName: string; useDescendants: boolean }> = []
    for (const field of missingRequiredFields.value) {
      let fieldInputValue
      if (field.type === 'yearRange') {
        fieldInputValue = {
          from: formValues[`${field.id}_from`],
          to: formValues[`${field.id}_to`],
        }
      } else {
        fieldInputValue = formValues[field.id]
      }
      const displayValue = displayValues?.[field.id]
      const includeDescendants = formValues[`${field.id}_wildcard`]
      if (field.id.toLowerCase().startsWith('condition')) {
        const value = formValues[field.id]
        if (value !== undefined && value !== null && value !== '') {
          conditions.push({
            value,
            displayName: displayValue || value,
            useDescendants: formValues[`${field.id}_wildcard`] === true,
          })
        }
      }
      if (!field.configPath) {
        if (field.type === 'yearRange') {
          wizardOnlyValues.year = fieldInputValue
        } else if (!field.id.toLowerCase().startsWith('condition')) {
          wizardOnlyValues[field.id] = fieldInputValue
        }
        continue
      }
      const filterCardId = findFilterCardIdForField(field)
      if (filterCardId) {
        operations.push({
          type: 'existingCard',
          filterCardId,
          field,
          fieldInputValue,
          displayValue,
          includeDescendants,
        })
      } else {
        filterCardPromises.push(
          dispatch('addFilterCard', {
            configPath: getFieldFilterCardPathForField(field),
          }).then((newCardId: string) => {
            operations.push({
              type: 'newCard',
              filterCardId: newCardId,
              field,
              fieldInputValue,
              displayValue,
              includeDescendants,
            })
          })
        )
      }
    }
    return Promise.all(filterCardPromises)
      .then(() => {
        const constraintPromises: Promise<any>[] = []
        for (const op of operations) {
          const { filterCardId, field } = op
          if (field.fixedAttributes?.length) {
            for (const fixedAttr of field.fixedAttributes) {
              const attrKey = getFieldAttrKey(fixedAttr.configPath)
              const getConstraintForAttribute = getters.getConstraintForAttribute
              let constraint = getConstraintForAttribute?.({ filterCardId, key: attrKey })
              if (!constraint) {
                constraintPromises.push(
                  dispatch('addFilterCardConstraint', {
                    filterCardId,
                    key: attrKey,
                  }).then(() => {
                    return { filterCardId, fixedAttr }
                  })
                )
              }
            }
          }
        }
        return Promise.all(constraintPromises)
      })
      .then(() => {
        const valuePromises: Promise<any>[] = []
        for (const op of operations) {
          const { filterCardId, field, fieldInputValue, displayValue, includeDescendants } = op
          if (field.fixedAttributes?.length) {
            for (const fixedAttr of field.fixedAttributes) {
              const attrKey = getFieldAttrKey(fixedAttr.configPath)
              const getConstraintForAttribute = getters.getConstraintForAttribute
              const constraint = getConstraintForAttribute?.({ filterCardId, key: attrKey })
              if (constraint) {
                valuePromises.push(
                  applyConstraintValue(constraint, fixedAttr.value, fixedAttr.operator)
                )
              }
            }
          }
          const attrKey = getFieldAttrKey(field.configPath!)
          const getConstraintForAttribute = getters.getConstraintForAttribute
          const constraint = getConstraintForAttribute?.({ filterCardId, key: attrKey })
          let valueToApply = fieldInputValue
          if (field.type === 'text' && includeDescendants !== undefined) {
            valueToApply = {
              value: fieldInputValue,
              includeDescendants: !!includeDescendants,
            }
          }
          if (constraint) {
            valuePromises.push(applyConstraintValue(constraint, valueToApply, '=', displayValue))
          } else {
            valuePromises.push(
              dispatch('addFilterCardConstraint', {
                filterCardId,
                key: attrKey,
              }).then(() => {
                const newConstraint = getConstraintForAttribute?.({ filterCardId, key: attrKey })
                if (newConstraint) {
                  return applyConstraintValue(newConstraint, valueToApply, '=', displayValue)
                }
              })
            )
          }
        }
        return Promise.all(valuePromises)
      })
      .then(() => {
        dispatch('releaseFireRequest')
        dispatch('setFireRequest')
        dispatch('refreshPatientCount')
        if (conditions.length > 0) {
          wizardOnlyValues.conditions = conditions
        }
        return wizardOnlyValues
      })
      .catch((error) => {
        dispatch('releaseFireRequest')
        throw error
      })
  }

  async function handleRequiredFiltersSubmit(
    formValues: Record<string, any>,
    displayValues: Record<string, string>
  ) {
    requiredFiltersError.value = ''
    applyingRequiredFilters.value = true
    try {
      const wizardOnlyValues = await applyMissingRequiredFilters(formValues, displayValues)
      showRequiredFiltersModal.value = false
      if (selectedWizardDefinition.value) {
        await prepareWizardConfigAndContinue(
          selectedWizardDefinition.value,
          wizardOnlyValues,
          formValues,
          displayValues
        )
      }
    } catch (error) {
      console.error(error)
      requiredFiltersError.value = (error as Error)?.message || 'Failed to apply required filters'
    } finally {
      applyingRequiredFilters.value = false
    }
  }

  async function handleOpenDashboard() {
    const activeBookmark = getters.getActiveBookmark?.value || getters.getActiveBookmark
    const isNew = activeBookmark?.isNew || false
    const hasLocalChanges = false // Note: getCurrentBookmarkHasChanges would need to be passed in
    if (isNew || hasLocalChanges) {
      showSaveCohortModal.value = true
      return
    }
    const materializedId = getters.getActiveCohortMaterializedId?.value || getters.getActiveCohortMaterializedId
    if (!materializedId) {
      showSaveCohortModal.value = true
      return
    }
    if (!activeDashboardWizardConfig.value) {
      console.warn('[Dashboard] wizardConfig not ready')
      dispatch('setToastMessage', { text: 'Dashboard configuration not ready. Please try again.' })
      return
    }
    console.log('[Dashboard] Opening dashboard with config:', activeDashboardWizardConfig.value)
    showDashboardModal.value = true
  }

  function handleSaveCohortSuccess() {
    showSaveCohortModal.value = false
    showDashboardModal.value = true
  }

  function handleCancelSaveCohort() {
    showSaveCohortModal.value = false
  }

  function closeDashboardModal() {
    showDashboardModal.value = false
  }

  return {
    showDashboardModal,
    showSaveCohortModal,
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
  }
}
