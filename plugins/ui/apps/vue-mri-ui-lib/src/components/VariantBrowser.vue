<template>
  <div class="vb-container" id="vb-chart" style="width: 100%; height: 100%"></div>
</template>
<script lang="ts">
declare var sap
import { mapActions, mapGetters } from 'vuex'
import Constants from '../utils/Constants'

let vb

export default {
  name: 'variantBrowser',
  data() {
    return {
      selection: [],
      showTooltip: false,
      showTooltipButton: false,
      tooltipPosition: {},
      tooltipCategories: [],
      tooltipMeasures: [],
      tooltipPatientCount: 0,
    }
  },
  watch: {
    getBookmarksData(val) {
      if (Object.keys(val).length !== 0 && val) {
        const genomicsCountRequest = { ...val }
        genomicsCountRequest.genomics = true
        this.firePatientCountQuery({
          type: 'genomics',
          params: JSON.stringify(genomicsCountRequest),
        })
      }
    },
    getSplitterWidth() {
      this.reRenderChart()
    },
    getSelectedGenomicsTab() {
      this.setupAxes()
    },
    bookmarkData() {
      this.renderChart()
    },
  },
  mounted() {
    this.$nextTick(() => {
      window.addEventListener('resize', this.reRenderChart)
    })

    vb = new sap.ui.xmlview({
      viewName: 'hc.mri.pa.ui.views.VueVariantBrowserContainer',
      width: '100%',
      height: '100%',
    })
    vb.placeAt(this.$el)
    this.setupAxes()
    this.renderChart()

    const eventBus = sap.ui.getCore().getEventBus()
    eventBus.publish('SET_VARIANT_FILTER_CARD', {
      variantFilterCards: this.getBookmarkFromIFR.cards.content.reduce((variantCardsList, c) => {
        if (c.content.length === 1 && this.getVariantFilterCards.indexOf(c.content[0].instanceID) >= 0) {
          variantCardsList.push(c.content[0])
        }
        return variantCardsList
      }, []),
    })
  },
  beforeDestroy() {
    vb.destroy()
    window.removeEventListener('resize', this.reRenderChart)
  },
  computed: {
    ...mapGetters([
      'getAxis',
      'getSplitterWidth',
      'getBookmarksData',
      'getBookmarkFromIFR',
      'getVariantFilterCards',
      'getGeneSummaryXAxis',
      'getGeneAlterationXAxis',
      'getGeneAlterationCategory',
      'getGenomicsAxisVisible',
      'getSelectedGenomicsTab',
    ]),
    bookmarkData() {
      return this.getBookmarksData
    },
  },
  methods: {
    ...mapActions(['disableAllAxesandProperties', 'setAxisValue', 'firePatientCountQuery']),
    reRenderChart() {
      const eventBus = sap.ui.getCore().getEventBus()
      eventBus.publish('VUE_VB_CHART_RERENDER', {})
    },
    renderChart() {
      const currentBookmark = JSON.parse(JSON.stringify(this.bookmarkData))

      for (let i = 0; i < Constants.MRIChartDimensions.Count; i += 1) {
        const axisModel = this.getAxis(i)
        if (!axisModel.props.active && currentBookmark.axisSelection[i].categoryId !== 'y1') {
          currentBookmark.axisSelection[i].attributeId = 'n/a'
          currentBookmark.axisSelection[i].binsize = 'n/a'
        }
      }

      const eventBus = sap.ui.getCore().getEventBus()
      eventBus.publish('VUE_VB_CHART_UPDATE', {
        data: currentBookmark,
        variantFilterCards: this.getVariantFilterCards,
        geneSummaryXAxis: this.getGeneSummaryXAxis,
        geneAlterationXAxis: this.getGeneAlterationXAxis,
        geneAlterationCategory: this.getGeneAlterationCategory,
      })
      eventBus.publish('SET_VARIANT_FILTER_CARD', {
        variantFilterCards: this.getBookmarkFromIFR.cards.content.reduce((variantCardsList, c) => {
          if (c.content.length === 1 && this.getVariantFilterCards.indexOf(c.content[0].instanceID) >= 0) {
            variantCardsList.push(c.content[0])
          }
          return variantCardsList
        }, []),
      })
    },
    setupAxes() {
      this.disableAllAxesandProperties()

      const xAxisVisible = this.getGenomicsAxisVisible

      if (xAxisVisible) {
        const iLevelHeight = 41
        for (let i = 0; i <= Constants.MRIChartDimensions.X3; i += 1) {
          this.setAxisValue({
            id: i,
            props: {
              layoutLeft: '0px',
              layoutTop: '',
              layoutBottom: `${20 + i * iLevelHeight}px`,
              icon: { 0: '', 1: '', 2: '' }[i],
              iconFamily: 'app-MRI-icons',
              isCategory: true,
              isMeasure: false,
              active: true,
            },
          })
        }
      }
      this.axisSetupCompleted = true
    },
  },
}
</script>
