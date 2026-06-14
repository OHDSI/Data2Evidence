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
          >
            <span class="icon" style="font-family: app-icons"></span>
          </button>
        </template>
        <template v-for="item in list" :key="item.key">
          <bs-dropdown-item @click="handleMenuClick(item.key)">{{ item.value }}</bs-dropdown-item>
        </template>
      </bs-dropdown>
    </DisabledHoverPopover>
    <downloadCSVDialog v-if="csvShow" @closeEv="csvShow = false"></downloadCSVDialog>
    <imageExport v-if="imageShow" @closeEv="imageShow = false"></imageExport>
  </div>
</template>
<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import ImageExport from './ImageExport.vue'
import DownloadCSVDialog from './DownloadCSVDialog.vue'
import bsDropdown from '../lib/ui/bs-dropdown.vue'
import bsDropdownItem from '../lib/ui/bs-dropdown-item.vue'
import DisabledHoverPopover from './DisabledHoverPopover.vue'

export default {
  name: 'downloadMenu',
  data() {
    return {
      csvShow: false,
      imageShow: false,
    }
  },
  computed: {
    ...mapGetters(['getText', 'getAllChartConfigs', 'getActiveChart', 'getCurrentPatientCount']),
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
  methods: {
    ...mapActions(['setFireDownloadZIP']),
    handleMenuClick(arg) {
      if (arg) {
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
  },
  components: {
    ImageExport,
    DownloadCSVDialog,
    bsDropdown,
    bsDropdownItem,
    DisabledHoverPopover,
  },
}
</script>
