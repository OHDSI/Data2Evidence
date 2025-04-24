<template>
  <div class="cohortCompareContainer">
    <div class="axisContainer">
      <slot name="upperAxisContainer" class="upperAxisContainer"> </slot>
      <slot name="lowerAxisContainer" class="lowerAxisContainer">
        <template v-for="item in getxAxisProperties">
          <cohortCompareAxisButton v-bind:axisProps="item" @selectEv="onSelectAttribute"></cohortCompareAxisButton>
        </template>
      </slot>
    </div>
    <slot name="mainChartContainer">
      <div class="chartSize">
        <div class="mainChartToolbar">
          <button
            ref="downloadButton"
            class="toolbarButton"
            @click="downloadClicked"
            :title="getText('MRI_PA_BUTTON_DOWNLOAD_TOOLTIP')"
          >
            <span class="icon" style="font-family: app-icons"></span>
          </button>
        </div>
      </div>
    </slot>
    <slot name="chartLegendContainer"></slot>
    <dropDownMenu
      v-bind:style="downloadMenuStyle"
      :subMenu="downloadMenuData"
      :opened="downloadMenuOpened"
      @clickEv="handleDownloadClick"
    ></dropDownMenu>
    <imageExport @closeEv="showDownloadPNGDialog = false" :compareChart="getCompareChart"></imageExport>
  </div>
</template>

<script lang="ts">
import CohortCompareAxisButton from './CohortCompareAxisButton.vue'
import CohortCompareSortButton from './CohortCompareSortButton.vue'
import DropDownMenu from './DropDownMenu.vue'
import ImageExport from './ImageExport.vue'
import LoadingAnimation from './LoadingAnimation.vue'

const chartTypes = {
  stacked: {
    imageId: 'stackCompare',
  },
  bar: {
    imageId: 'boxplotCompare',
  },
  km: {
    imageId: 'kmCompare',
  },
}

export default {
  name: 'cohortCompareContainer',
  props: {
    close: Number,
    activeChart: {
      type: String,
      default: 'stacked', // stacked, boxplot, km
    },
    busy: {
      type: Boolean,
      default: false,
    },
  },
  mounted() {
    this.$nextTick(() => {
      window.addEventListener('click', this.closeSubMenu)
    })
  },
  beforeDestroy() {
    window.removeEventListener('click', this.closeSubMenu)
  },
  computed: {},
  methods: {
    downloadClicked() {
      const menuData = []
      const menuIdx = 0
      menuData.push({
        idx: menuIdx,
        subMenuStyle: {},
        text: this.getText('MRI_PA_BUTTON_DOWNLOAD_PNG'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
        data: 'PNG',
      })

      this.downloadMenuData = menuData
      const yLocation = this.$el.getBoundingClientRect().top - 5
      const menuStyle = {
        position: 'fixed',
        right: '169px',
        top: yLocation + 'px',
      }
      this.downloadMenuStyle = menuStyle
      this.downloadMenuOpened = !this.downloadMenuOpened
    },
    closeSubMenu(event) {
      if (
        this.downloadMenuOpened &&
        event.target !== this.$refs.downloadButton &&
        event.target.parentElement !== this.$refs.downloadButton
      ) {
        this.downloadButtonClose()
      }
    },
    downloadButtonClose() {
      if (this.downloadMenuOpened) {
        this.downloadMenuOpened = false
      }
    },
  },
  components: {
    CohortCompareAxisButton,
    CohortCompareSortButton,
    DropDownMenu,
    ImageExport,
    LoadingAnimation,
  },
}
</script>
