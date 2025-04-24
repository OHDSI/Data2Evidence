<template>
  <div v-if="list.length > 0" class="download-menu-container" style="display: inline">
    <b-dropdown variant="link" size="sm" no-caret>
      <template v-slot:button-content>
        <button class="toolbarButton" :title="getText('MRI_PA_BUTTON_DOWNLOAD_TOOLTIP')">
          <span class="icon" style="font-family: app-icons"></span>
        </button>
      </template>
      <template v-for="item in list" :key="item.key">
        <b-dropdown-item @click="handleMenuClick(item.key)">{{ item.value }}</b-dropdown-item>
      </template>
    </b-dropdown>
    <downloadCSVDialog v-if="csvShow" @closeEv="csvShow = false"></downloadCSVDialog>
    <downloadZIPDialog v-if="zipShow" @closeEv="zipShow = false"></downloadZIPDialog>
    <imageExport v-if="imageShow" @closeEv="imageShow = false"></imageExport>
  </div>
</template>
<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import ImageExport from './ImageExport.vue'
import DownloadCSVDialog from './DownloadCSVDialog.vue'
import DownloadZIPDialog from './DownloadZipDialog.vue'

export default {
  name: 'downloadMenu',
  data() {
    return {
      csvShow: false,
      imageShow: false,
      zipShow: false,
    }
  },
  computed: {
    ...mapGetters(['getText', 'getAllChartConfigs', 'getActiveChart']),
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
            this.zipShow = true
            break
        }
      }
    },
  },
  components: {
    ImageExport,
    DownloadCSVDialog,
    DownloadZIPDialog,
  },
}
</script>
