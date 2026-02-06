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
      <div class="dashboardButton">
        <Button
          :text="getText('MRI_PA_OPEN_DASHBOARD_TEXT')"
          :onClick="openDashboardModal"
          :disabled="!isDashboardButtonEnabled"
        >
        </Button>
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
        <!-- <span class="separator" />
      <button
        id="idConfigSettings"
        class="actionButton"
        @click="openSettingsConfig"
        :title="getText('MRI_PA_SELECT_CONFIGURATION')"
      >
        <span class="icon" style="font-family: app-icons"></span>
      </button> -->
      </div>
    </div>
  </div>

  <!-- ShinyLive Dashboard Modal - Teleport to body for proper overlay -->
  <Teleport to="body">
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

  <!-- Save Cohort Modal - Teleport to body for proper overlay -->
  <Teleport to="body">
    <SaveCohortModal
      :is-open="showSaveCohortModal"
      :existing-bookmarks="getBookmarks"
      @save="handleSaveCohort"
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
import Button from './Button.vue'

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
      // Save & Materialize flow state
      showSaveCohortModal: false,
      isSavingBookmark: false,
      isMaterializingCohort: false,
      processingStep: null,
      saveError: null,
    }
  },
  watch: {
    getHasAssignedConfig(val) {
      if (val) {
        this.chartConfig = this.visibleChartTypes(this.getAllChartConfigs)
        this.refreshPatientCount()
      }
    },
    getActiveChart(val) {
      this.refreshPatientCount()
    },
  },
  mounted() {
    try {
      this.$nextTick(() => {
        window.addEventListener('click', this.closeSubMenu)
      })
      // The config is available when component mounts already to check if interactive mode is used
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
      'getMriFrontendConfig',
      'getActiveCohortMaterializedId',
      'getActiveBookmark',
      'getBookmarksData',
      'getMaterializedCohorts',
      'getBookmarks',
      'getCurrentBookmarkHasChanges',
      'getPLRequest',
      'getWizardConfig',
    ]),
    chartSelection() {
      return this.getChartSelection()
    },
    drilldownEnabled() {
      if (
        // this.getActiveChart !== "vb" &&
        this.chartSelection &&
        this.chartSelection.length > 0
      ) {
        return true
      }
      return false
    },
    isDashboardButtonEnabled() {
      // Button always enabled - we'll handle save/materialize flow in handleOpenDashboard
      return !this.isSavingBookmark && !this.isMaterializingCohort
    },
    isBookmarkSaved() {
      // Check if current bookmark is saved (not new)
      return this.getActiveBookmark && !this.getActiveBookmark.isNew
    },
    needsMaterialization() {
      // Check if bookmark needs to be materialized
      return !this.getActiveCohortMaterializedId
    },
    dashboardContext() {
      // Prepare context data for ShinyLive dashboard
      const activeBookmark = this.$store.getters.getActiveBookmark

      if (!activeBookmark) {
        return {
          wizardConfig: null,
          conditions: null,
          mriquery: null,
        }
      }

      // Parse bookmark data
      let bookmarkData = null
      try {
        bookmarkData = JSON.parse(activeBookmark.bookmark || '{}')
      } catch (e) {
        console.error('Failed to parse bookmark data:', e)
        return {
          wizardConfig: null,
          conditions: null,
          mriquery: null,
        }
      }

      const wizardConfig = this.getWizardConfig || null
      // Get mriquery using getPLRequest
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
    getSelectedDatasetText() {
      return this.getSelectedDataset.name == '' ? 'Untitled' : this.getSelectedDataset.name
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
    async handleOpenDashboard() {
      this.showDashboardModal = true
      // try {
      //   // Step 1: Check if bookmark is saved
      //   if (!this.isBookmarkSaved) {
      //     console.log('[Dashboard Flow] Step 1: Bookmark not saved, showing save modal')
      //     this.showSaveCohortModal = true
      //     return // Wait for user to save via modal
      //   }

      //   // Step 2: Check if cohort needs materialization
      //   if (this.needsMaterialization) {
      //     console.log('[Dashboard Flow] Step 2: Cohort needs materialization')
      //     await this.handleMaterializeCohort()
      //   }

      //   // Step 3: Open dashboard modal
      //   console.log('[Dashboard Flow] Step 3: Opening dashboard modal')
      //   this.showDashboardModal = true
      // } catch (error) {
      //   console.error('[Dashboard Flow] Error:', error)
      //   this.setToastMessage({
      //     text: error.message || this.getText('MRI_PA_ERROR_GENERIC'),
      //     type: 'error',
      //   })
      // }
    },
    
    async handleSaveCohort({ name, description }) {
      this.isSavingBookmark = true
      this.processingStep = 'saving'
      this.saveError = null

      try {
        console.log('[Dashboard Flow] Saving bookmark:', name)
        
        // Show progress toast
        this.setToastMessage({
          text: this.getText('MRI_PA_SAVING_COHORT'),
          type: 'information',
        })

        // Get required params for save
        const activeBookmark = this.getActiveBookmark
        const bookmarkData = this.getBookmarksData
        const selectedDataset = this.getSelectedDataset
        
        // Prepare save params
        const params = {
          cmd: 'insert',
          bookmarkname: name,
          bookmark: JSON.stringify(bookmarkData),
          shareBookmark: false,
          paConfigId: activeBookmark?.paConfigId || selectedDataset?.paConfigId,
          cdmConfigId: selectedDataset?.cdmConfigId,
          cdmConfigVersion: selectedDataset?.cdmConfigVersion,
          datasetId: selectedDataset?.id,
        }

        // Call save action
        await this.fireBookmarkQuery({ params })
        
        console.log('[Dashboard Flow] Bookmark saved successfully')
        
        // Close save modal
        this.showSaveCohortModal = false
        
        // Show success toast
        this.setToastMessage({
          text: this.getText('MRI_PA_COHORT_SAVED'),
          type: 'success',
        })

        // Step 2: Refresh bookmark list to get new bookmarkId
        console.log('[Dashboard Flow] Refreshing bookmark list')
        await this.fireBookmarkQuery({ params: { cmd: 'loadAll' } })
        
        // Step 3: Continue with materialization
        await this.handleMaterializeCohort()
        
        // Step 4: Open dashboard
        this.showDashboardModal = true

      } catch (error) {
        console.error('[Dashboard Flow] Save error:', error)
        this.saveError = error.message || this.getText('MRI_PA_ERROR_SAVE_BOOKMARK')
        this.setToastMessage({
          text: this.saveError,
          type: 'error',
        })
      } finally {
        this.isSavingBookmark = false
        this.processingStep = null
      }
    },
    
    async handleMaterializeCohort() {
      this.isMaterializingCohort = true
      this.processingStep = 'materializing'

      try {
        console.log('[Dashboard Flow] Materializing cohort')
        
        // Show progress toast
        this.setToastMessage({
          text: this.getText('MRI_PA_MATERIALIZING_COHORT'),
          type: 'information',
        })

        const activeBookmark = this.getActiveBookmark
        const selectedDataset = this.getSelectedDataset
        
        if (!activeBookmark || !activeBookmark.id) {
          throw new Error('No active bookmark found')
        }

        // Get mriquery using getPLRequest
        const plRequest = this.getPLRequest({ bmkId: activeBookmark.id })
        
        // Prepare materialize params
        const params = {
          datasetId: selectedDataset.id,
          mriquery: JSON.stringify(plRequest),
          name: activeBookmark.bookmarkname,
          description: '', // Can be enhanced later
          syntax: JSON.stringify({ 
            datasetId: selectedDataset.id, 
            bookmarkId: activeBookmark.id 
          }),
        }

        const url = `/analytics-svc/api/services/cohort`

        // Call materialize action
        await this.onAddCohortOkButtonPress({ params, url })
        
        console.log('[Dashboard Flow] Cohort materialized successfully')
        
        // Show success toast
        this.setToastMessage({
          text: this.getText('MRI_PA_COHORT_MATERIALIZED'),
          type: 'success',
        })

        // Refresh to get materialized cohortId
        console.log('[Dashboard Flow] Refreshing cohort list')
        await this.fireBookmarkQuery({ params: { cmd: 'loadAll' } })

      } catch (error) {
        console.error('[Dashboard Flow] Materialize error:', error)
        
        // Handle specific error codes from onAddCohortOkButtonPress
        let errorMessage = this.getText('MRI_PA_ERROR_MATERIALIZE_COHORT')
        if (error.code === 'EXISTING_COLLECTION') {
          errorMessage = error.message
        } else if (error.code === 'ADD_PATIENT_FAILED') {
          errorMessage = error.message
        } else if (error.message) {
          errorMessage = error.message
        }
        
        this.setToastMessage({
          text: errorMessage,
          type: 'error',
        })
        
        throw error // Re-throw to stop dashboard from opening
      } finally {
        this.isMaterializingCohort = false
        this.processingStep = null
      }
    },
    
    handleCancelSaveCohort() {
      console.log('[Dashboard Flow] User cancelled save')
      this.showSaveCohortModal = false
      this.saveError = null
    },
    
    openDashboardModal() {
      // Replaced by handleOpenDashboard - kept for backwards compatibility
      this.handleOpenDashboard()
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
    Button,
  },
}
</script>
