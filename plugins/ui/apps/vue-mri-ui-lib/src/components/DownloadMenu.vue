<template>
  <div v-if="list.length > 0" class="download-menu-container" style="display: inline">
    <DisabledHoverPopover
      :disabled="isDownloadDisabled"
      :header="getText('MRI_PA_EXPORT_UNAVAILABLE')"
      :message="popoverMessage"
    >
      <bs-dropdown variant="link" size="sm" no-caret :disabled="isDownloadDisabled">
        <template v-slot:button-content>
          <button
            class="toolbarButton"
            :title="getText('MRI_PA_BUTTON_DOWNLOAD_TOOLTIP')"
            :disabled="isDownloadDisabled"
            v-bind:class="{ toolbarButtonDisabled: isDownloadDisabled }"
            data-testid="pa-download-menu-btn"
          >
            <span class="icon" style="font-family: app-icons"></span>
          </button>
        </template>
        <template v-for="item in list" :key="item.key">
          <bs-dropdown-item @click="handleMenuClick(item.key)">{{ item.value }}</bs-dropdown-item>
        </template>
      </bs-dropdown>
    </DisabledHoverPopover>
    <downloadCSVDialog v-if="csvShow" @closeEv="onCsvClosed"></downloadCSVDialog>
    <imageExport v-if="imageShow" @closeEv="onImageExported"></imageExport>
    <VSnackbar
      v-model="snackbar"
      location="top right"
      color="var(--color-mri-success-bg)"
      :timeout="3000"
      rounded="16px"
    >
      <span style="color: rgba(0, 0, 0, 0.87); display: inline-flex; align-items: center">
        <appIcon icon="successCheck" style="margin-right: 8px; color: #00855f" />
        {{ snackbarText }}
      </span>
    </VSnackbar>
  </div>
</template>
<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import ImageExport from './ImageExport.vue'
import DownloadCSVDialog from './DownloadCSVDialog.vue'
import bsDropdown from '../lib/ui/bs-dropdown.vue'
import bsDropdownItem from '../lib/ui/bs-dropdown-item.vue'
import DisabledHoverPopover from './DisabledHoverPopover.vue'
import VSnackbar from './vuetify/VSnackbar.vue'
import appIcon from '../lib/ui/app-icon.vue'

export default {
  name: 'downloadMenu',
  data() {
    return {
      csvShow: false,
      imageShow: false,
      snackbar: false,
      snackbarText: '',
      pendingDownload: null,
    }
  },
  computed: {
    ...mapGetters([
      'getText',
      'getAllChartConfigs',
      'getActiveChart',
      'getCurrentPatientCount',
      'getZIPDownloadCompleted',
    ]),
    isDownloadDisabled() {
      const minCohortSize = this.getAllChartConfigs.minCohortSize
      // Non-numeric count (e.g. '--' when cohort is too small to display) is treated as below minimum.
      const count = Number(this.getCurrentPatientCount)
      // The minimum cohort size check applies to every chart, not just the patient list.
      if (minCohortSize !== undefined && (Number.isNaN(count) || count < minCohortSize)) return true
      // The maxPatientsExport limit only applies to the patient list view.
      if (this.exceedsExportLimit) return true
      return false
    },
    minCohortSize() {
      return this.getAllChartConfigs?.minCohortSize
    },
    maxPatientsExport() {
      const listConfig = this.getAllChartConfigs['list']
      return listConfig && listConfig.maxPatientsExport
    },
    exceedsExportLimit() {
      const count = Number(this.getCurrentPatientCount)
      return this.getActiveChart === 'list' && this.maxPatientsExport !== undefined && count > this.maxPatientsExport
    },
    popoverMessage() {
      if (this.exceedsExportLimit) {
        return this.getText('MRI_PA_EXPORT_LIMIT_MESSAGE', String(this.maxPatientsExport))
      }
      return this.getText('MRI_PA_MIN_COHORT_SIZE_MESSAGE', String(this.minCohortSize))
    },
    list() {
      const menuData = []
      const getConfig = (chartConfig, prop) => {
        if (!chartConfig) {
          return false
        }
        if (chartConfig.hasOwnProperty(prop)) {
          return chartConfig[prop]
        }
        return false
      }
      const activeChartConfig = this.getAllChartConfigs[this.getActiveChart]

      if (getConfig(activeChartConfig, 'downloadEnabled') && this.getActiveChart !== 'list') {
        menuData.push({
          key: 'csv',
          value: this.getText('MRI_PA_BUTTON_DOWNLOAD_CSV'),
        })
      }

      if (getConfig(activeChartConfig, 'imageDownloadEnabled')) {
        menuData.push({
          key: 'image',
          value: this.getText('MRI_PA_BUTTON_DOWNLOAD_PNG'),
        })
      }

      if (getConfig(activeChartConfig, 'zipDownloadEnabled')) {
        menuData.push({
          key: 'zip',
          value: this.getText('MRI_PA_BUTTON_DOWNLOAD_ZIP'),
        })
      }

      return menuData
    },
  },
  watch: {
    getZIPDownloadCompleted(val) {
      if (val && this.pendingDownload === 'zip') {
        this.showExportToast('MRI_PA_EXPORT_FILE_ZIP')
      }
    },
  },
  methods: {
    ...mapActions(['setFireDownloadZIP']),
    handleMenuClick(arg) {
      if (arg) {
        this.pendingDownload = arg
        switch (arg) {
          case 'csv':
            this.csvShow = true
            break
          case 'image':
            this.imageShow = true
            break
          case 'zip':
            this.setFireDownloadZIP({ columnsToInclude: 'SELECTED' })
            break
        }
      }
    },
    onCsvClosed(payload) {
      this.csvShow = false
      if (payload && payload.success && this.pendingDownload === 'csv') {
        this.showExportToast('MRI_PA_EXPORT_FILE_CSV')
      }
    },
    onImageExported() {
      this.imageShow = false
      if (this.pendingDownload === 'image') {
        this.showExportToast('MRI_PA_EXPORT_FILE_PNG')
      }
    },
    showExportToast(fileTypeKey) {
      this.snackbarText = this.getText('MRI_PA_EXPORT_SUCCESS', this.getText(fileTypeKey))
      this.snackbar = true
      this.pendingDownload = null
    },
  },
  components: {
    ImageExport,
    DownloadCSVDialog,
    bsDropdown,
    bsDropdownItem,
    DisabledHoverPopover,
    VSnackbar,
    appIcon,
  },
}
</script>
