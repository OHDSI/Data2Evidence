<template>
  <div class="chartToolbar-main-container">
    <div class="d-flex">
      <button
        v-if="!showUnHideFilters"
        class="actionButton"
        @click="toggleLeftPanel"
        :title="getText('MRI_PA_TOOLTIP_COLLAPSE_FILTER_BAR')"
      >
        <span class="icon" style="font-family: app-icons">{{ hideIcon }}</span>
      </button>
      <button
        v-if="showUnHideFilters"
        class="actionButton"
        @click="toggleLeftPanel"
        :title="getText('MRI_PA_TOOLTIP_EXPAND_FILTER_BAR')"
      >
        <span class="icon" style="font-family: app-icons">{{ unHideIcon }}</span>
      </button>
    </div>
    <div class="actionButtonGroup">
      <div class="dashboardButton" v-if="getActiveBookmark">
        <Button :text="getText('MRI_PA_OPEN_DASHBOARD_TEXT')" :onClick="openDashboardModal"> </Button>
      </div>
      <div class="d-flex">
        <template v-for="chart in chartConfig" :key="chart.name">
          <chartButton
            @clickEv="switchChart(chart)"
            :name="chart.name"
            :icon="chart.icon"
            :iconGroup="chart.iconGroup"
            :title="getText(chart.tooltip)"
            :activeChart="getActiveChart"
          ></chartButton>
          <span class="separator"></span>
        </template>

        <button
          class="toolbarButton"
          :title="getText('MRI_PA_BUTTON_DRILL_DOWN')"
          v-bind:class="{ toolbarButtonDisabled: !drilldownEnabled }"
          :disabled="!drilldownEnabled"
          @click="drillDownClicked"
        >
          <span class="icon" style="font-family: app-icons"></span>
        </button>

        <span class="separator" />

        <button
          class="actionButton"
          @click="showFilterCardSummary"
          :title="getText('MRI_PA_TITLE_FILTER_SUMMARY_TOOLTIP')"
        >
          <icon icon="summaryDoc" />
        </button>

        <span class="separator" />

        <downloadMenu></downloadMenu>

        <div class="vertical-spacer"></div>
        <patientCount :popOverPosition="patientCountPopoverPosition" />
        <span class="separator" />
      </div>
    </div>
  </div>

  <Teleport to="#app">
    <DashboardSelectionModal
      :is-open="showDashboardSelectionModal"
      :dashboards="dashboardCodes"
      :loading="dashboardMetadataLoading"
      :error="dashboardSelectionError"
      @close="closeDashboardSelectionModal"
      @select="handleDashboardSelected"
    />
  </Teleport>

  <Teleport to="#app">
    <CompleteRequiredFiltersModal
      :is-open="showRequiredFiltersModal"
      :fields="missingRequiredFields"
      :loading="applyingRequiredFilters"
      :error="requiredFiltersError"
      @cancel="handleRequiredFiltersCancel"
      @submit="handleRequiredFiltersSubmit"
    />
  </Teleport>

  <Teleport to="#app">
    <ShinyDashboardModal
      v-if="showDashboardModal"
      :is-open="showDashboardModal"
      :dataset-id="getSelectedDataset.id"
      :cohort-id="getActiveCohortMaterializedId?.toString() || ''"
      :wizard-config="dashboardContext.wizardConfig"
      :conditions="dashboardContext.conditions"
      :mriquery="dashboardContext.mriquery"
      @close="closeDashboardModal"
    />
  </Teleport>

  <Teleport to="#app">
    <SaveCohortModal
      :is-open="showSaveCohortModal"
      :wizard-config="dashboardContext.wizardConfig"
      @success="handleSaveCohortSuccess"
      @cancel="handleCancelSaveCohort"
    />
  </Teleport>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import ChartButton from './ChartButton.vue'
import DropDownMenu from './DropDownMenu.vue'
import patientCount from './PatientCount.vue'
import Constants from '../utils/Constants'
import icon from '../lib/ui/app-icon.vue'
import appIcon from '../lib/ui/app-icon.vue'
import DownloadMenu from './DownloadMenu.vue'
import ShinyDashboardModal from './ShinyViewer/ShinyDashboardModal.vue'
import SaveCohortModal from './ShinyViewer/SaveCohortModal.vue'
import DashboardSelectionModal from './ShinyViewer/DashboardSelectionModal.vue'
import CompleteRequiredFiltersModal from './ShinyViewer/CompleteRequiredFiltersModal.vue'
import Button from './Button.vue'
import {
  getFieldAttrKey,
  getFieldFilterCardPathForField,
  parseNumericInput,
  validateRequiredFields,
  type MissingRequiredField,
} from '../utils/dashboardFlowUtils'

function getBookmarkKey(bookmark) {
  if (!bookmark) {
    return null
  }

  return (
    bookmark.bmkId ||
    bookmark.id ||
    bookmark.cohortDefinitionId ||
    bookmark.atlasCohortDefinitionId ||
    bookmark.bookmarkname ||
    bookmark.name ||
    null
  )
}

function normalizeResponseArray(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  return []
}

export default {
  name: 'chartToolbar',
  props: ['hideEv', 'config', 'collectionEv', 'showUnHideFilters'],
  data() {
    return {
      chartConfig: [],
      disableCensoring: true,
      unHideIcon: '',
      hideIcon: '',
      hideIconToolTip: '',
      toggleFilterCardSummary: false,
      patientCountPopoverPosition: {},
      showDashboardModal: false,
      showSaveCohortModal: false,
      showDashboardSelectionModal: false,
      showRequiredFiltersModal: false,
      dashboardMetadataLoading: false,
      applyingRequiredFilters: false,
      dashboardSelectionError: '',
      requiredFiltersError: '',
      dashboardCodes: [],
      wizardDefinitions: [],
      selectedDashboard: null,
      selectedWizardDefinition: null,
      missingRequiredFields: [] as MissingRequiredField[],
      dashboardValidationBreakdown: [],
      activeDashboardWizardConfig: null,
    }
  },
  watch: {
    getHasAssignedConfig(val) {
      if (val) {
        this.chartConfig = this.visibleChartTypes(this.getAllChartConfigs)
        this.refreshPatientCount()
      }
    },
    getActiveChart() {
      this.refreshPatientCount()
    },
    getActiveBookmark(newBookmark, oldBookmark) {
      if (getBookmarkKey(newBookmark) !== getBookmarkKey(oldBookmark)) {
        this.resetDashboardFlowState()
      }
    },
  },
  mounted() {
    try {
      this.$nextTick(() => {
        window.addEventListener('click', this.closeSubMenu)
      })
      this.chartConfig = this.visibleChartTypes(this.getAllChartConfigs)
      this.refreshPatientCount()
      this.loadValuesForAttributePath({
        attributePathUid: 'conceptSets',
        searchQuery: '',
        attributeType: 'conceptSet',
      })
    } catch (e) {
      console.error(e)
    }
  },
  beforeUnmount() {
    window.removeEventListener('click', this.closeSubMenu)
  },
  computed: {
    ...mapGetters([
      'getActiveChart',
      'getChartSelection',
      'getHasAssignedConfig',
      'getAllChartConfigs',
      'getMriFrontendConfig',
      'getText',
      'getSelectedDataset',
      'getActiveCohortMaterializedId',
      'getActiveBookmark',
      'getBookmarksData',
      'getMaterializedCohorts',
      'getBookmarks',
      'getCurrentBookmarkHasChanges',
      'getPLRequest',
      'getWizardConfig',
      'getFilterCards',
      'getConstraintForAttribute',
      'getBookmarkFromIFR',
      'getConstraint',
    ]),
    chartSelection() {
      return this.getChartSelection()
    },
    drilldownEnabled() {
      return !!(this.chartSelection && this.chartSelection.length > 0)
    },
    hasChanges() {
      return this.getActiveBookmark?.isNew || this.getCurrentBookmarkHasChanges
    },
    dashboardContext() {
      const activeBookmark = this.$store.getters.getActiveBookmark

      if (!activeBookmark) {
        return {
          wizardConfig: null,
          conditions: null,
          mriquery: null,
        }
      }

      const wizardConfig = this.activeDashboardWizardConfig || this.getWizardConfig || null

      let mriquery = null
      try {
        const plRequest = this.$store.getters.getPLRequest({ bmkId: activeBookmark.id })
        mriquery = JSON.stringify(plRequest)
      } catch (e) {
        console.error('Failed to generate mriquery:', e)
      }

      return {
        wizardConfig,
        mriquery,
      }
    },
  },
  methods: {
    ...mapActions([
      'setActiveChart',
      'setFireRequest',
      'toggleConfigSelectionDialog',
      'setDatasetVersion',
      'setDataset',
      'requestDatasetVersions',
      'loadValuesForAttributePath',
      'refreshPatientCount',
      'fireBookmarkQuery',
      'onAddCohortOkButtonPress',
      'setToastMessage',
      'ajaxAuth',
      'addFilterCard',
      'addFilterCardConstraint',
      'updateConstraintValue',
      'updateDateConstraintValue',
      'setWizardConfig',
      'clearWizardConfig',
    ]),
    openSettingsConfig() {
      this.toggleConfigSelectionDialog()
    },
    closeSubMenu(event) {
      if (
        this.downloadMenuOpened &&
        event.target !== this.$refs.menuButton &&
        event.target.parentElement !== this.$refs.menuButton
      ) {
        this.downloadButtonClose()
      }
    },
    visibleChartTypes(chartOptions) {
      if (chartOptions) {
        let activeChartDownloads = false
        let activeChartCollections = false
        let activeChartPdfDownloads = false

        if (chartOptions && !chartOptions.custom) {
          chartOptions.custom = {
            visible: true,
            downloadEnabled: false,
            pdfDownloadEnabled: false,
            collectionEnabled: false,
          }
        }

        if (chartOptions && !chartOptions.sac) {
          chartOptions.sac = {
            visible: true,
            downloadEnabled: false,
            pdfDownloadEnabled: false,
            collectionEnabled: false,
          }
        }

        const chartTypeData = []
        Object.keys(Constants.chartInfo).forEach(key => {
          if (chartOptions[key] && chartOptions[key].visible) {
            const chartInfo = Constants.chartInfo[key]
            Object.keys(chartOptions[key]).forEach(key2 => {
              chartInfo[key2] = chartOptions[key][key2]
            })
            if (chartInfo.name === chartOptions.initialChart) {
              activeChartDownloads = chartInfo.downloadEnabled || false
              activeChartPdfDownloads = chartInfo.pdfDownloadEnabled || false
              activeChartCollections = chartInfo.collectionEnabled || false
            }
            chartTypeData.push(chartInfo)
          }
        })

        this.activeChartDownloads = activeChartDownloads
        this.activeChartCollections = activeChartCollections
        this.activeChartPdfDownloads = activeChartPdfDownloads
        return chartTypeData
      }
      return []
    },
    switchChart(button) {
      this.setActiveChart(button.name)
      let activeChartDownloads = false
      let activeChartCollections = false
      let activeChartPdfDownloads = false

      this.chartConfig.forEach(element => {
        if (element.name === button.name) {
          activeChartDownloads = element.downloadEnabled
          activeChartCollections = element.collectionEnabled
          activeChartPdfDownloads = element.pdfDownloadEnabled
        }
      })

      this.activeChartDownloads = activeChartDownloads
      this.activeChartCollections = activeChartCollections
      this.activeChartPdfDownloads = activeChartPdfDownloads

      this.setFireRequest()
    },
    showFilterCardSummary() {
      this.toggleFilterCardSummary = !this.toggleFilterCardSummary
      this.$emit('open-filtersummary', this.toggleFilterCardSummary)
    },
    getHideIconToolTip() {
      if (this.hideIconToolTip === '') {
        this.hideIconToolTip = this.getText('MRI_PA_TOOLTIP_COLLAPSE_FILTER_BAR')
      }
      return this.hideIconToolTip
    },
    toggleLeftPanel() {
      this.$emit('unhideEv')
    },
    drillDownClicked() {
      this.$emit('drilldown')
    },
    resetDashboardFlowState() {
      this.showDashboardSelectionModal = false
      this.showRequiredFiltersModal = false
      this.dashboardMetadataLoading = false
      this.applyingRequiredFilters = false
      this.dashboardSelectionError = ''
      this.requiredFiltersError = ''
      this.dashboardCodes = []
      this.wizardDefinitions = []
      this.selectedDashboard = null
      this.selectedWizardDefinition = null
      this.missingRequiredFields = []
      this.dashboardValidationBreakdown = []
      this.activeDashboardWizardConfig = null
    },
    async fetchDashboardCodes(datasetId) {
      const response = await this.ajaxAuth({
        method: 'get',
        url: `/system-portal/dataset/dashboard-codes?datasetId=${encodeURIComponent(datasetId)}&type=cohort`,
      })

      return normalizeResponseArray(response.data)
    },
    async fetchWizardDefinitions(datasetId) {
      const query = `datasetId=${encodeURIComponent(datasetId)}`
      const urls = [`/pa-config-svc/wizards/config?${query}`, `/d2e/pa-config-svc/wizards/config?${query}`]

      let lastError = null
      for (const url of urls) {
        try {
          const response = await this.ajaxAuth({ method: 'get', url })
          return Array.isArray(response.data?.wizards) ? response.data.wizards : []
        } catch (error) {
          lastError = error
        }
      }

      throw lastError || new Error('Failed to fetch wizard definitions')
    },
    resolveMissingFields(missingFields: MissingRequiredField[]) {
      return missingFields.map(field => ({
        ...field,
        label: field.label || field.id,
      }))
    },
    async loadDashboardMetadata() {
      this.dashboardMetadataLoading = true
      this.dashboardSelectionError = ''

      try {
        const datasetId = this.getSelectedDataset?.id
        if (!datasetId) {
          throw new Error('No dataset selected')
        }

        const [dashboardCodes, wizardDefinitions] = await Promise.all([
          this.fetchDashboardCodes(datasetId),
          this.fetchWizardDefinitions(datasetId),
        ])

        this.dashboardCodes = dashboardCodes
        this.wizardDefinitions = wizardDefinitions
      } catch (error) {
        this.dashboardSelectionError = error?.message || 'Failed to load dashboard configuration'
      } finally {
        this.dashboardMetadataLoading = false
      }
    },
    async openDashboardModal() {
      if (!this.getActiveBookmark) {
        this.setToastMessage({ text: 'Open or create a cohort before opening dashboards.' })
        return
      }

      this.dashboardSelectionError = ''
      this.requiredFiltersError = ''
      this.showDashboardSelectionModal = true
      this.showRequiredFiltersModal = false
      this.dashboardCodes = []
      this.wizardDefinitions = []
      this.selectedDashboard = null
      this.selectedWizardDefinition = null
      this.missingRequiredFields = []
      this.dashboardValidationBreakdown = []
      this.activeDashboardWizardConfig = null
      this.clearWizardConfig()

      await this.loadDashboardMetadata()
    },
    closeDashboardSelectionModal() {
      this.showDashboardSelectionModal = false
    },
    handleRequiredFiltersCancel() {
      this.requiredFiltersError = ''
      this.showRequiredFiltersModal = false
    },
    handleRequiredFiltersSubmit(formValues, displayValues) {
      this.requiredFiltersError = ''
      this.applyingRequiredFilters = true

      try {
        this.applyMissingRequiredFilters(formValues, displayValues)
        this.showRequiredFiltersModal = false
        this.prepareWizardConfigAndContinue(this.selectedWizardDefinition)
      } catch (error) {
        console.error(error)
        this.requiredFiltersError = error?.message || 'Failed to apply required filters'
      } finally {
        this.applyingRequiredFilters = false
      }
    },
    getCurrentFilterCards() {
      return this.getBookmarkFromIFR?.cards || null
    },
    async handleDashboardSelected(dashboard) {
      this.dashboardSelectionError = ''
      this.selectedDashboard = dashboard

      const selectedWizardDefinition = this.wizardDefinitions.find(wizard => wizard.id === dashboard.name)
      if (!selectedWizardDefinition) {
        this.dashboardSelectionError = `Dashboard '${dashboard.name}' is not mapped to a wizard definition.`
        return
      }

      const validation = validateRequiredFields(selectedWizardDefinition, this.getCurrentFilterCards())
      this.dashboardValidationBreakdown = validation.breakdown
      this.selectedWizardDefinition = selectedWizardDefinition
      this.missingRequiredFields = this.resolveMissingFields(validation.missingFields)

      if (!this.missingRequiredFields.length) {
        this.showDashboardSelectionModal = false
        await this.prepareWizardConfigAndContinue(selectedWizardDefinition)
        return
      }

      this.showDashboardSelectionModal = false
      this.requiredFiltersError = ''
      this.showRequiredFiltersModal = true
    },
    async prepareWizardConfigAndContinue(selectedWizardDefinition) {
      const wizardConfig = {
        dashboardType: selectedWizardDefinition.id,
      }

      this.activeDashboardWizardConfig = wizardConfig
      this.setWizardConfig(wizardConfig)

      await this.handleOpenDashboard()
    },
    getNonExcludedFilterCardIdsByPath(filterCardPath) {
      const filterCards = this.getFilterCards()
      return Object.keys(filterCards).filter(filterCardId => {
        const filterCard = filterCards[filterCardId]
        return filterCard?.props?.key === filterCardPath && !filterCard?.props?.excludeFilter
      })
    },
    getConstraintExpressions(constraint) {
      const constraintType = constraint?.props?.type
      if (!constraintType) {
        return []
      }

      if (constraintType === 'text' || constraintType === 'conceptSet') {
        const values = Array.isArray(constraint.props.value) ? constraint.props.value : []
        return values.map(item => ({
          operator: '=',
          value: typeof item === 'object' && item !== null ? item.value : item,
        }))
      }

      if (constraintType === 'num') {
        const values = Array.isArray(constraint.props.value) ? constraint.props.value : []
        const expressions = []
        values.forEach(item => {
          if (Array.isArray(item?.and)) {
            item.and.forEach(andExpression => {
              expressions.push({ operator: andExpression.op, value: andExpression.value })
            })
            return
          }

          expressions.push({ operator: item?.op, value: item?.value })
        })
        return expressions
      }

      if (constraintType === 'time' || constraintType === 'datetime') {
        const expressions = []
        if (constraint.props.fromDate?.value) {
          expressions.push({ operator: '>=', value: constraint.props.fromDate.value })
        }
        if (constraint.props.toDate?.value) {
          expressions.push({ operator: '<=', value: constraint.props.toDate.value })
        }
        return expressions
      }

      return []
    },
    constraintContainsExpression(constraint, operator, value) {
      const expectedOperator = String(operator || '=').trim()
      const expectedValue = String(value).trim()

      return this.getConstraintExpressions(constraint).some(expression => {
        const expressionOperator = String(expression.operator || '').trim()
        const expressionValue = String(expression.value ?? '').trim()
        return expressionOperator === expectedOperator && expressionValue === expectedValue
      })
    },
    cardMatchesFixedAttributes(filterCardId, fixedAttributes = []) {
      if (!fixedAttributes.length) {
        return true
      }

      return fixedAttributes.every(fixedAttribute => {
        const attrKey = getFieldAttrKey(fixedAttribute.configPath)
        const constraint = this.getConstraintForAttribute({
          filterCardId,
          key: attrKey,
        })

        if (!constraint) {
          return false
        }

        return this.constraintContainsExpression(constraint, fixedAttribute.operator, fixedAttribute.value)
      })
    },
    findFilterCardIdForField(field) {
      const filterCardPath = getFieldFilterCardPathForField(field)
      const candidateCardIds = this.getNonExcludedFilterCardIdsByPath(filterCardPath)
      const fixedAttributes = field.fixedAttributes || []

      return candidateCardIds.find(filterCardId => this.cardMatchesFixedAttributes(filterCardId, fixedAttributes)) || null
    },
    applyMissingRequiredFilters(formValues, displayValues) {
      const filterCardPromises = []
      const operations = []
      const wizardOnlyValues = {}

      for (const field of this.missingRequiredFields) {
        // Handle yearRange fields with _from and _to suffixes
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

        // Fields without configPath are wizard-only fields (like yearRange)
        // They don't create MRI filter cards but their values are passed to the dashboard
        if (!field.configPath) {
          wizardOnlyValues[field.id] = fieldInputValue
          continue
        }

        const filterCardId = this.findFilterCardIdForField(field)

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
            this.addFilterCard({ configPath: getFieldFilterCardPathForField(field) }).then((newCardId) => {
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

      return Promise.all(filterCardPromises).then(() => {
        const constraintPromises: Promise<any>[] = []

        for (const op of operations) {
          const { filterCardId, field } = op

          if (field.fixedAttributes?.length) {
            for (const fixedAttr of field.fixedAttributes) {
              const attrKey = getFieldAttrKey(fixedAttr.configPath)
              let constraint = this.getConstraintForAttribute({ filterCardId, key: attrKey })

              if (!constraint) {
                constraintPromises.push(
                  this.addFilterCardConstraint({
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
      }).then(() => {
        const valuePromises = []

        for (const op of operations) {
          const { filterCardId, field, fieldInputValue, displayValue, includeDescendants } = op

          if (field.fixedAttributes?.length) {
            for (const fixedAttr of field.fixedAttributes) {
              const attrKey = getFieldAttrKey(fixedAttr.configPath)
              const constraint = this.getConstraintForAttribute({ filterCardId, key: attrKey })

              if (constraint) {
                valuePromises.push(this.applyConstraintValue(constraint, fixedAttr.value, fixedAttr.operator))
              }
            }
          }

          const attrKey = getFieldAttrKey(field.configPath)
          const constraint = this.getConstraintForAttribute({ filterCardId, key: attrKey })

          // Prepare value with wildcard for condition fields
          let valueToApply = fieldInputValue
          if (field.type === 'text' && includeDescendants !== undefined) {
            // Pass includeDescendants as part of the value object
            valueToApply = {
              value: fieldInputValue,
              includeDescendants: !!includeDescendants,
            }
          }

          if (constraint) {
            valuePromises.push(this.applyConstraintValue(constraint, valueToApply, '=', displayValue))
          } else {
            valuePromises.push(
              this.addFilterCardConstraint({
                filterCardId,
                key: attrKey,
              }).then(() => {
                const newConstraint = this.getConstraintForAttribute({ filterCardId, key: attrKey })
                if (newConstraint) {
                  return this.applyConstraintValue(newConstraint, valueToApply, '=', displayValue)
                }
              })
            )
          }
        }

        return Promise.all(valuePromises)
      }).then(() => {
        // Small delay to allow all state updates to settle before triggering chart refresh
        // This prevents intermediate updates from causing cancelled requests
        setTimeout(() => {
          this.setFireRequest()
          this.refreshPatientCount()
        }, 100)
      })
    },
    applyConstraintValue(constraint, rawInput, operator = '=', displayValue) {
      const constraintType = constraint.props.type

      if (constraintType === 'num') {
        let parsedValues = []

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
          return Promise.reject(new Error(`Invalid numeric value for ${constraint.props.name || constraint.id}`))
        }

        return this.updateConstraintValue({
          constraintId: constraint.id,
          value: parsedValues,
        })
      }

      // Handle yearRange - convert years to dates (start of from year to end of to year)
      if (rawInput && typeof rawInput === 'object' && 'from' in rawInput && 'to' in rawInput) {
        const fromYear = rawInput.from
        const toYear = rawInput.to

        if (!fromYear && !toYear) {
          return Promise.reject(new Error(`Missing year value for ${constraint.props.name || constraint.id}`))
        }

        // Convert years to dates: Jan 1 of from year to Dec 31 of to year
        const fromDate = fromYear ? new Date(`${fromYear}-01-01`) : new Date(`${toYear}-01-01`)
        const toDate = toYear ? new Date(`${toYear}-12-31`) : new Date(`${fromYear}-12-31`)

        return this.updateDateConstraintValue({
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

        return this.updateDateConstraintValue({
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

      return this.updateConstraintValue({
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
    },
    async handleOpenDashboard() {
      if (this.hasChanges) {
        this.showSaveCohortModal = true
        return
      }
      if (!this.getActiveCohortMaterializedId) {
        this.showSaveCohortModal = true
        return
      }
      this.showDashboardModal = true
    },
    handleSaveCohortSuccess() {
      this.showSaveCohortModal = false
      this.showDashboardModal = true
    },
    handleCancelSaveCohort() {
      this.showSaveCohortModal = false
    },
    closeDashboardModal() {
      this.showDashboardModal = false
    },
  },
  components: {
    ChartButton,
    DropDownMenu,
    icon,
    patientCount,
    appIcon,
    DownloadMenu,
    ShinyDashboardModal,
    SaveCohortModal,
    DashboardSelectionModal,
    CompleteRequiredFiltersModal,
    Button,
  },
}
</script>
