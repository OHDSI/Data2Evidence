<template>
  <div>
    <a v-bind:href="imageURL" ref="imgDownloadBtn" download="MRI Chart.png"></a>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import MessageBox from './MessageBox.vue'
import Constants from '../utils/Constants'
import { createChartCanvas } from '../utils/ExportUtils'

export default {
  name: 'exportImage',
  props: ['closeEv', 'compareChartType', 'overrideResponse'],
  data() {
    return {
      imageURL: '',
      busy: true,
    }
  },
  computed: {
    ...mapGetters(['getActiveChart', 'getText', 'getResponse', 'getKMSeries']),
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
    this.downloadImage()
    setTimeout(() => {
      this.busy = false
      this.setChartCover({ chartCover: false })
      this.$emit('closeEv')
    }, 400)
  },
  methods: {
    ...mapActions(['setChartCover']),
    downloadImage() {
      this.busy = true
      this.setChartCover({ chartCover: true })
      this.prepareImageChart()
      this.generatePdfCharts()
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
    generatePdfCharts() {
      const pdfConst = this.calculatedConst
      let chartType = this.pdfParam.chartType
      const targetHeight = pdfConst.targetHeight
      const targetWidth = pdfConst.targetWidth
      const response = this.response

      const patientCount = response ? response.totalPatientCount : 0

      if (patientCount && patientCount > 0) {
        let chartId = ''
        if (this.compareChartType) {
          chartId = '#' + this.compareChartType + '-chart'
          chartType = this.compareChartType
        } else {
          chartId = `#${chartType}-chart`
        }

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

        const chartCanvas = createChartCanvas(chartId, chartType, targetHeight, targetWidth, pdfConst, kmLegendInput)

        this.imageURL = chartCanvas.toDataURL('image/png')
        this.$refs.imgDownloadBtn.href = this.imageURL
        this.$refs.imgDownloadBtn.click()
      }
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
