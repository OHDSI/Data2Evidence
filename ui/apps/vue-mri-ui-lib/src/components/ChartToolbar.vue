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
        <Button :text="getText('MRI_PA_OPEN_DASHBOARD_TEXT')" :onClick="dashboardFlow.openDashboardModal"> </Button>
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
      :is-open="dashboardFlow.showDashboardSelectionModal"
      :dashboards="dashboardFlow.dashboardCodes"
      :loading="dashboardFlow.dashboardMetadataLoading"
      :error="dashboardFlow.dashboardSelectionError"
      @close="dashboardFlow.closeDashboardSelectionModal"
      @select="dashboardFlow.handleDashboardSelected"
    />
  </Teleport>

  <Teleport to="#app">
    <CompleteRequiredFiltersModal
      :is-open="dashboardFlow.showRequiredFiltersModal"
      :fields="dashboardFlow.missingRequiredFields"
      :loading="dashboardFlow.applyingRequiredFilters"
      :error="dashboardFlow.requiredFiltersError"
      @cancel="dashboardFlow.handleRequiredFiltersCancel"
      @submit="dashboardFlow.handleRequiredFiltersSubmit"
    />
  </Teleport>

  <Teleport to="#app">
    <ShinyDashboardModal
      v-if="dashboardFlow.showDashboardModal"
      :is-open="dashboardFlow.showDashboardModal"
      :dataset-id="getSelectedDataset.id"
      :cohort-id="getActiveCohortMaterializedId?.toString() || ''"
      :wizard-config="dashboardFlow.dashboardContext.wizardConfig"
      :conditions="dashboardFlow.dashboardContext.conditions"
      :mriquery="dashboardFlow.dashboardContext.mriquery"
      @close="dashboardFlow.closeDashboardModal"
    />
  </Teleport>

  <Teleport to="#app">
    <SaveCohortModal
      :is-open="dashboardFlow.showSaveCohortModal"
      :wizard-config="dashboardFlow.dashboardContext.wizardConfig"
      @success="dashboardFlow.handleSaveCohortSuccess"
      @cancel="dashboardFlow.handleCancelSaveCohort"
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
import { useDashboardFlow } from '../composables/useDashboardFlow'

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

export default {
  name: 'chartToolbar',
  props: ['hideEv', 'config', 'collectionEv', 'showUnHideFilters'],
  data() {
    // Initialize dashboard flow composable with dispatch and getters
    const store = (this as any).$store
    const dashboardFlow = useDashboardFlow(store.dispatch, store.getters)

    return {
      chartConfig: [],
      disableCensoring: true,
      unHideIcon: '',
      hideIcon: '',
      hideIconToolTip: '',
      toggleFilterCardSummary: false,
      patientCountPopoverPosition: {},
      dashboardFlow,
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
        this.dashboardFlow.resetDashboardFlowState()
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
      'holdFireRequest',
      'releaseFireRequest',
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
