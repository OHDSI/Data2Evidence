<template>
  <div class="km-statistics-table-container">
    <div class="flexItem">
      <label class="km-label km-label-bold">{{ getText('MRI_PA_KAPLAN_CURVE_ANA_TIT_LOG_RANK') }}</label>
    </div>
    <table class="km-curveAnalysis-table">
      <tr>
        <th class="km-curveAnalysis-th">{{ getText('MRI_PA_KAPLAN_CURVE_ANA_FLD_DOF') }}</th>
        <td class="km-curveAnalysis-td">{{ dof }}</td>
      </tr>
      <tr>
        <th class="km-curveAnalysis-th">{{ getText('MRI_PA_KAPLAN_CURVE_ANA_FLD_LOG_RANK') }}</th>
        <td class="km-curveAnalysis-td">{{ pvalue }}</td>
      </tr>
    </table>
    <div />

    <!-- Hazard Ratios table -->
    <div class="flexItem line-seperator"></div>
    <div class="flexItem">
      <label class="km-label km-label-bold">{{ getText('MRI_PA_KAPLAN_CURVE_ANA_TIT_HR_CI_P') }}</label>
    </div>
    <table class="km-curveAnalysis-table">
      <tr>
        <th class="km-curveAnalysis-th">{{ getText('MRI_PA_KAPLAN_CURVE_ANA_FLD_HR_CI_P') }}</th>
        <template v-for="(item, key) in getCurves" :key="key">
          <th class="km-curveAnalysis-th">{{ item.title }}</th>
        </template>
      </tr>
      <template v-for="(item, key) in getCurves" :key="key">
        <tr>
          <th class="km-curveAnalysis-th">{{ item.title }}</th>
          <template v-for="(item2, key2) in getCurves" :key="key2">
            <td class="km-curveAnalysis-td">
              <label class="km-curveAnalysis-td-label"
                >{{ getHazardRatio(key, key2) }}{{ getConfidenceInterval(key, key2) }}</label
              >
              <label class="km-curveAnalysis-td-label">{{ getPValue(key, key2) }}</label>
            </td>
          </template>
        </tr>
      </template>
    </table>

    <!-- Survival Rate % table -->
    <div class="flexItem line-seperator"></div>
    <div class="flexItem">
      <label class="km-label km-label-bold">{{ getText('MRI_PA_DOWNLOAD_PDF_KM_VALUES') }}</label>
    </div>
    <table class="km-curveAnalysis-table">
      <tr>
        <template v-for="item in getSRTable" :key="item.id">
          <th class="km-curveAnalysis-th">{{ item.text }}</th>
        </template>
      </tr>
      <template v-for="(item, index) in chartData.data" :key="index">
        <tr>
          <template v-for="category in chartData.categories" :key="category.id">
            <td class="km-curveAnalysis-td">
              <label class="km-curveAnalysis-td-label">{{ item[category.id] }}</label>
            </td>
          </template>
          <td class="km-curveAnalysis-td">
            <label class="km-curveAnalysis-td-label">{{ item.pcount }}</label>
          </td>
          <template v-for="tick in getTicksData[index]" :key="tick">
            <td class="km-curveAnalysis-td">
              <label class="km-curveAnalysis-td-label">{{ tick }}</label>
            </td>
          </template>
        </tr>
      </template>
    </table>
  </div>
</template>

<script lang="ts">
import { mapGetters } from 'vuex'

export default {
  name: 'km-statistics-table',
  data() {
    return {
      allCurves: {},
    }
  },
  props: {
    dof: {
      type: String,
      default: '',
    },
    pvalue: {
      type: String,
      default: '',
    },
    chartData: {
      type: Object,
      default: {},
    },
  },
  methods: {
    getCellValueByCurvePair(r, c) {
      const data = this.chartData
      return data.kaplanMeierStatistics.curvePairResults[`${r}${c}`]
    },
    getPValue(r, c) {
      const obj = this.getCellValueByCurvePair(r, c)
      return obj ? this.formatPValue(obj.pValue) : ''
    },
    getHazardRatio(r, c) {
      const obj = this.getCellValueByCurvePair(r, c)
      return obj ? obj.hr : '-'
    },
    getConfidenceInterval(r, c) {
      const obj = this.getCellValueByCurvePair(r, c)
      return obj ? ` (${obj.ciLow} - ${obj.ciHigh})` : ''
    },
    formatPValue(val) {
      return `${this.getText('MRI_PA_KAPLAN_LOG_RANK_P')}${val}`
    },
  },
  computed: {
    ...mapGetters(['getText', 'getTicks', 'getTicksData', 'getTickType']),
    getSRTable() {
      const units = this.getText(this.getTickType.label)
      const table = this.chartData.categories.map(category => ({
        id: category.id,
        text: category.name,
      }))

      const table2 = this.getTicks.map(tick => ({
        id: tick,
        text: `${tick} ${units}`,
      }))

      return [
        ...table,
        {
          id: 'pcount',
          text: this.getText('MRI_PA_DOWNLOAD_PDF_TEXT_PATIENT_COUNT'),
        },
        ...table2,
      ]
    },
    getCurves() {
      const data = this.chartData
      const pairResults = data.kaplanMeierStatistics.curvePairResults

      Object.keys(pairResults).forEach(key => {
        const { outerEl, outerElTitle, innerEl, innerElTitle } = pairResults[key]
        if (!this.allCurves[outerEl]) {
          this.allCurves[outerEl] = {
            title: outerElTitle,
          }
        }
        if (!this.allCurves[innerEl]) {
          this.allCurves[innerEl] = {
            title: innerElTitle,
          }
        }
      })
      return this.allCurves
    },
  },
}
</script>
