<template>
  <div class="patientlist-container" ref="patientlistContainer">
    <template v-if="errorMessage">
      <chartErrorMessage :errorMessage="errorMessage"></chartErrorMessage>
    </template>
    <template v-else>
      <menuButton
        :parentContainer="this.$refs.patientlistContainer"
        :placeholder="this.getText('MRI_PA_PATIENT_LIST_EDIT_COLUMNS')"
        :menuData="this.getColumnSelectionMenu"
        @clickItem="this.addColumn"
      ></menuButton>
      <div style="height: 14px"></div>
      <div class="patientlist-control-wrapper" style="height: 90%; overflow: auto">
        <patientListControl
          @openPatientSummary="openPatientSummary"
          :columns="this.getSelectedAttributes"
          :rows="this.chartData.data"
          :rowCount="this.chartData.totalPatientCount"
          :currentPage="currentPage"
          @addColumn="addColumn"
          @removeColumn="removeColumn"
          @sort="sort"
          @refreshColumnMenu="populateColumnMenu"
          @fireRequest="setFireRequest"
          @goPage="goPage"
          :pageSize="this.pageSize"
          :showLeftPane="showLeftPane"
        ></patientListControl>
      </div>
      <div>
        <pager
          :currentPage="currentPage"
          :rowCount="this.chartData.totalPatientCount"
          :pageSize="this.pageSize"
          @goPage="goPage"
        ></pager>
      </div>
      <div ref="contextPS"></div>
    </template>
  </div>
</template>
<script lang="ts">
declare var sap
import { mapActions, mapGetters } from 'vuex'
import processCSV from '../utils/ProcessCSV'
import processZIP from '../utils/ProcessZIP'
import menuButton from './MenuButton.vue'
import Pager from './Pager.vue'
import patientListControl from './PatientListControl.vue'
import chartErrorMessage from './ChartErrorMessage.vue'
import { postProcessPatientListData } from './helpers/postProcessPatientListData'
import { postProcessConvertPatientListToCsv } from './helpers/postProcessConvertPatientListToCsv'
import { AxiosResponse } from 'axios'
import { createZip } from './helpers/createZip'

export default {
  name: 'patientListChart',
  props: ['busyEv', 'showLeftPane'],
  data() {
    return {
      errorMessage: '',
      chartData: {
        data: [],
      },
    }
  },
  watch: {
    'getPLModel.currentPage': function changePage() {
      this.setFireRequest()
    },
    getFireRequest() {
      if (Object.keys(this.getSelectedAttributes).length === 0) {
        return (this.errorMessage = this.getText('MRI_PA_PATIENT_LIT_NO_COLUMNS_SELECTED_MESSAGE'))
      }
      this.$emit('busyEv', false)
      this.errorMessage = ''
      const callback = rawChartData => {
        const chartData = postProcessPatientListData(rawChartData)
        this.chartData = this.processResult(JSON.parse(JSON.stringify(chartData)))
        this.setCurrentPatientCount({
          currentPatientCount: chartData.totalPatientCount,
        })
        if (typeof chartData.noDataReason !== 'undefined') {
          this.errorMessage = chartData.noDataReason
          this.setCurrentPatientCount({
            currentPatientCount: '--',
          })
        }
        this.$emit('busyEv', false)
      }

      this.$emit('busyEv', true)
      this.fireQuery({
        url: '/analytics-svc/api/services/patient',
        params: {
          mriquery: JSON.stringify(this.getPLRequest({ useLimit: true })),
          datasetId: this.getSelectedDataset.id,
        },
      })
        .then(callback)
        .catch(({ message, response }) => {
          if (message !== 'cancel') {
            this.$emit('busyEv', false)
          }

          if (response) {
            let noDataReason = this.getText('MRI_PA_CHART_NO_DATA_DEFAULT_MESSAGE')

            // For all handled errors from backend
            if (response.status === 500) {
              noDataReason = response.data.errorMessage
              if (response.data.errorType === 'MRILoggedError') {
                noDataReason = this.getText('MRI_DB_LOGGED_MESSAGE', response.data.logId)
              }
            }

            this.errorMessage = noDataReason
          }

          this.setCurrentPatientCount({
            currentPatientCount: '--',
          })
        })
    },
    getZipFireDownload() {
      this.downloadZIP({
        ...this.getPLRequestZIP,
      })
        .then(responses => {
          createZip(
            {
              responses,
            },
            () => {
              this.completeDownloadZIP()
            }
          )
        })
        .catch(() => {
          // do nothing
        })
    },
  },
  computed: {
    ...mapGetters([
      'getZipFireDownload',
      'getText',
      'getFireRequest',
      'getPLRequest',
      'getPLRequestZIP',
      'getPLModel',
      'getColumnSelectionMenu',
      'getSelectedAttributes',
      'getSelectedDataset',
      'translate',
    ]),
    currentPage() {
      return this.getPLModel.currentPage
    },
    pageSize() {
      return this.getPLModel.pageSize
    },
  },
  mounted() {
    this.populateColumnMenu()
    this.initPLModel({ loadDefault: false })
    this.setPLRequest()
    this.setFireRequest()
  },
  methods: {
    ...mapActions([
      'removeSelectedAttribute',
      'sortAttribute',
      'fireQuery',
      'downloadCSV',
      'downloadZIP',
      'setCurrentPatientCount',
      'setFireRequest',
      'completeDownloadCSV',
      'completeDownloadZIP',
      'initPLModel',
      'setPLRequest',
      'changePage',
      'populateColumnMenu',
      'addSelectedAttribute',
    ]),
    openPatientSummary({ patientId }: { patientId: string }) {
      const psControl = this.setupUI5Control();
      this.$nextTick(() => {
        psControl.setModel(
          new sap.ui.model.json.JSONModel({
            dataLoaded: false,
            settings: {
              patientId
            }
          }),
          "patientSummary"
        );
        psControl.getController().open();
      });
    },
    // setupUI5Control() {
    //   if (this.psui5element) {
    //     try {
    //       this.psui5element.destroy();
    //     } catch (err) {
    //       // do nothing
    //     }
    //   }
    //   this.psui5element = new sap.ui.xmlview({
    //     viewName: "hc.mri.pa.ui.views.PatientSummary",
    //     width: "100%",
    //     height: "100%"
    //   });
    //   this.psui5element.placeAt(this.$refs.contextPS, "only");
    //   return this.psui5element;
    // },
    removeColumn({ configPath }) {
      this.removeSelectedAttribute({ configPath })
      this.setFireRequest()
    },
    sort({ sortOrder, configPath }) {
      this.sortAttribute({
        sortOrder,
        configPath,
      })
      this.setFireRequest()
    },
    goPage(page) {
      this.changePage(page)
    },
    processResult(data) {
      return this.translate(data)
    },
    addColumn(arg) {
      if (typeof arg === 'string' && arg === 'RESET') {
        this.initPLModel({ loadDefault: true })
      } else {
        this.addSelectedAttribute({ configPath: arg.path })
        this.populateColumnMenu()
      }
      this.setFireRequest()
    },
  },
  components: {
    chartErrorMessage,
    menuButton,
    patientListControl,
    Pager,
  },
}
</script>
