<template>
  <div></div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import MessageBox from './MessageBox.vue'
import Constants from '../utils/Constants'
import { createChartCanvas, buildXAxisTitle } from '../utils/ExportUtils'
import { generateDownloadFileName } from '../utils/generateDownloadFileName'
import { pickSaveTarget, writeBlobToSaveTarget } from '../utils/saveFile'

export default {
  name: 'exportImage',
  props: ['closeEv', 'compareChartType', 'overrideResponse'],
  data() {
    return {
      busy: true,
    }
  },
  computed: {
    ...mapGetters(['getActiveChart', 'getActiveBookmark', 'getText', 'getResponse', 'getKMSeries']),
    downloadFileName() {
      return generateDownloadFileName(this.getActiveBookmark?.bookmarkname, this.getActiveChart, 'png')
    },
    response() {
      if (this.overrideResponse) {
        return this.overrideResponse
      }
      const resp = this.getResponse().data
      return resp
    },
  },
  mounted() {
    // Setup Inital Value
    this.fileName = ''
    this.paperSize = 'a4'
    this.orientation = 'l'
    this.downloadImage().then(result => {
      this.busy = false
      this.setChartCover({ chartCover: false })
      this.$emit('closeEv', { success: result === 'success', cancelled: result === 'cancelled' })
    })
  },
  methods: {
    ...mapActions(['setChartCover']),
    /**
     * Renders the chart and saves it. Resolves once the PNG is saved (or handed to the browser
     * download where the save picker is unsupported).
     * @returns 'success', 'cancelled' when the user dismissed the save picker, or 'error'
     */
    async downloadImage(): Promise<'success' | 'cancelled' | 'error'> {
      this.busy = true
      this.setChartCover({ chartCover: true })
      this.prepareImageChart()
      const chartCanvas = this.generatePdfCharts()
      if (!chartCanvas) {
        return 'error'
      }
      try {
        // Opened from the menu click, so this still counts as a user gesture
        const target = await pickSaveTarget(this.downloadFileName, 'png')
        if (!target) {
          return 'cancelled'
        }
        const blob = await new Promise<Blob>((resolve, reject) =>
          chartCanvas.toBlob(b => (b ? resolve(b) : reject(new Error('Chart image could not be encoded'))), 'image/png')
        )
        await writeBlobToSaveTarget(target, blob)
        return 'success'
      } catch (e) {
        console.error('Image export failed:', e)
        return 'error'
      }
    },
    prepareImageChart() {
      /**
       * Resize chart to a4 size
       */
      const chartInfo = Constants.chartInfo
      const activeChart = this.getActiveChart

      let titleIcon = ''
      let titleIconSource = ''

      Object.keys(chartInfo).forEach(key => {
        if (chartInfo[key].name === activeChart) {
          titleIcon = chartInfo[key].icon
          titleIconSource = chartInfo[key].iconGroup
        }
      })

      const pdfParam = {
        fileName: this.fileName,
        paperSize: this.paperSize,
        orientation: this.orientation,
        chartType: activeChart,
        titleText: `${document.title}: ${this.getText('MRI_PA_DOWNLOAD_CHART_IMAGE')}`,
        titleIcon,
        titleIconSource,
      }
      this.pdfParam = pdfParam

      const pdfConst = Constants.PDFConsts
      const pageHeight = Constants.PDFPage[pdfParam.paperSize].height
      const pageWidth = Constants.PDFPage[pdfParam.paperSize].width

      const targetHeight = (pageHeight - pdfConst.pageTopMargin - pdfConst.pageBottomMargin) * pdfConst.mm
      const targetWidth = (pageWidth - pdfConst.pageLeftMargin - pdfConst.pageRightMargin) * pdfConst.mm

      this.calculatedConst = {
        ...pdfConst,
        pageHeight,
        pageWidth,
        targetHeight,
        targetWidth,
      }
    },
    /** @returns the rendered chart canvas, or null when there is no chart to export */
    generatePdfCharts(): HTMLCanvasElement | null {
      const pdfConst = this.calculatedConst
      let chartType = this.pdfParam.chartType
      const targetHeight = pdfConst.targetHeight
      const targetWidth = pdfConst.targetWidth
      const response = this.response

      let chartId = ''
      if (this.compareChartType) {
        chartId = '#' + this.compareChartType + '-chart'
        chartType = this.compareChartType
      } else {
        chartId = `#${chartType}-chart`
      }

      // The cohort-comparison endpoints return no totalPatientCount, so the patient-count
      // guard cannot be applied to them. What the guard actually protects against is
      // snapshotting a chart that is not there, which the rendered SVG answers directly.
      const hasChartToExport = this.compareChartType
        ? !!document.querySelector(`${chartId} svg`)
        : this.hasExportableData(response)

      if (hasChartToExport) {
        try {
          const kmLegendInput =
            chartType.indexOf('km') > -1
              ? {
                  logRank: this.getText('MRI_PA_KAPLAN_LOG_RANK'),
                  pValue: `${this.getText('MRI_PA_KAPLAN_LOG_RANK_P')} ${
                    response.kaplanMeierStatistics.overallResult.pValue
                  }`,
                  title: response.categories
                    .map(mCategory => {
                      if (mCategory.id === 'dummy_category') {
                        return this.getText('MRI_PA_DUMMY_CATEGORY')
                      }
                      return mCategory.name
                    })
                    .join(', '),
                  data: this.getKMSeries,
                }
              : null

          const xAxisTitle = buildXAxisTitle(response?.categories)

          const chartCanvas = createChartCanvas(
            chartId,
            chartType,
            targetHeight,
            targetWidth,
            pdfConst,
            kmLegendInput,
            xAxisTitle
          )

          return chartCanvas
        } catch (e) {
          console.error('Image export failed:', e)
        }
      }
      return null
    },
    // The main-chart response carries totalPatientCount, but the cohort-compare
    // response does not. Its shape is { categories, measures, data[], noDataReason }
    // and the per-cohort counts sit in data[]['patient.attributes.pcount'].
    //
    // Gating the export on totalPatientCount alone made the compare export skip
    // silently - no canvas, no anchor click, no download event and no error - so
    // page.waitForEvent('download') simply timed out with nothing to show for it.
    hasExportableData(response) {
      if (!response) {
        return false
      }
      if (typeof response.totalPatientCount === 'number') {
        return response.totalPatientCount > 0
      }
      return Array.isArray(response.data) && response.data.length > 0
    },
    cropCanvas(canvas, width, height, y = 0, x = 0) {
      const croppedCanvas = document.createElement('canvas')
      croppedCanvas.width = width
      croppedCanvas.height = height

      const context = croppedCanvas.getContext('2d')
      context.drawImage(canvas, y, x, canvas.width, canvas.height)
      return croppedCanvas
    },
    closeDialog() {
      setTimeout(() => {
        this.busy = false
        this.setChartCover({ chartCover: false })
        this.$emit('closeEv')
      })
    },
  },
  components: {
    MessageBox,
  },
}
</script>
