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
      v-model="snackbarVisible"
      location="top right"
      :color="snackbarColor"
      :timeout="snackbarTimeout"
      rounded="16px"
    >
      <span class="snackbar-content">
        <appIcon :icon="snackbarIcon" :class="snackbarIconClass" />
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
import Constants from '../utils/Constants'

export default {
  name: 'downloadMenu',
  data() {
    return {
      csvShow: false,
      imageShow: false,
      snackbar: { visible: false, type: 'success', text: '' },
      pendingDownload: null,
      fileTypeKeyMap: {
        csv: 'MRI_PA_EXPORT_FILE_CSV',
        image: 'MRI_PA_EXPORT_FILE_PNG',
        zip: 'MRI_PA_EXPORT_FILE_ZIP',
      },
    }
  },
  computed: {
    ...mapGetters([
      'getText',
      'getAllChartConfigs',
      'getActiveChart',
      'getCurrentPatientCount',
      'getCSVDownloadError',
      'getZIPDownloadCompleted',
      'getZIPDownloadError',
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
    snackbarVisible: {
      get() {
        return this.snackbar.visible
      },
      set(val) {
        this.snackbar.visible = val
      },
    },
    snackbarColor() {
      return this.snackbar.type === 'success' ? 'var(--color-mri-success-bg)' : '#FDEDED'
    },
    snackbarIcon() {
      return this.snackbar.type === 'success' ? 'successCheck' : 'alertCircle'
    },
    snackbarIconClass() {
      return this.snackbar.type === 'success' ? 'snackbar-success-icon' : 'snackbar-error-icon'
    },
    snackbarText() {
      return this.snackbar.text
    },
    snackbarTimeout() {
      return Constants.SnackbarTimeout
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
        this.showExportSuccessToast('MRI_PA_EXPORT_FILE_ZIP')
      }
    },
    getZIPDownloadError(val) {
      if (val && this.pendingDownload === 'zip') {
        this.showExportErrorToast()
      }
    },
    getCSVDownloadError(val) {
      if (val && this.pendingDownload === 'csv') {
        this.showExportErrorToast()
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
      if (payload && payload.success && this.pendingDownload === 'csv' && !this.getCSVDownloadError) {
        this.showExportSuccessToast('MRI_PA_EXPORT_FILE_CSV')
      }
    },
    onImageExported(payload) {
      this.imageShow = false
      if (this.pendingDownload === 'image') {
        if (payload && payload.success) {
          this.showExportSuccessToast('MRI_PA_EXPORT_FILE_PNG')
        } else {
          this.showExportErrorToast(this.fileTypeKeyMap['image'])
        }
      }
    },
    _showExportToast(type, fileTypeKey) {
      const textKey = type === 'success' ? 'MRI_PA_EXPORT_SUCCESS' : 'MRI_PA_EXPORT_FAILED'
      this.snackbar = { visible: true, type, text: this.getText(textKey, this.getText(fileTypeKey)) }
      this.pendingDownload = null
    },
    showExportSuccessToast(fileTypeKey) {
      this._showExportToast('success', fileTypeKey)
    },
    showExportErrorToast(fileTypeKey) {
      this._showExportToast('error', fileTypeKey ?? this.fileTypeKeyMap[this.pendingDownload])
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

<style scoped>
.snackbar-content {
  color: rgba(0, 0, 0, 0.87);
  display: inline-flex;
  align-items: center;
}

.snackbar-success-icon {
  margin-right: 12px;
  color: #00855f;
}

.snackbar-error-icon {
  margin-right: 12px;
  color: var(--color-feedback-alarm);
}
</style>
