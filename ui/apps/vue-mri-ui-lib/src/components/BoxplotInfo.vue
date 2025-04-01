<template>
  <div class="appMriPaChartPopoverBoxplot">
    <div class="appMriPaChartPopoverContentDimensions">
      <template v-for="category in tooltipCategories" :key="category.value">
        <div class="appMriPaChartPopoverContentDimension">
          <span class="appMriPaChartPopoverContentDimensionAxis" v-html="category.icon"></span>
          <span class="appMriPaChartPopoverContentDimensionValue">{{ category.value }}</span>
        </div>
      </template>
    </div>
    <div class="appMriPaChartPopoverContentMeasures">
      <template v-for="measures in tooltipMeasures" :key="measures.name">
        <label class="appMriPaChartPopoverContentMeasureName">
          <span class="appMriPaChartPopoverContentDimensionAxis" v-html="measures.icon"></span>
          {{ measures.name }}
        </label>
        <span class="appMriPaChartPopoverContentMeasureValue">{{ measures.value }}</span>
      </template>
    </div>
    <div class="appMriPaChartPopoverContentPatients">
      <label class="appMriPaChartPopoverContentPatientsLabel">{{ getText('MRI_PA_PATIENTS') }}</label>
      <span class="appMriPaChartPopoverContentPatientsValue">{{ tooltipPatientCount }}</span>
    </div>
    <div v-if="selection.length > 1" class="appMriPaChartPopoverContentFurtherSelections">
      {{
        selection.length === 2
          ? getText('MRI_PA_FURTHER_SELECTIONS_ONE')
          : getText('MRI_PA_FURTHER_SELECTIONS', selection.length - 1)
      }}
    </div>
  </div>
</template>
<script lang="ts">
import { mapGetters } from 'vuex'

export default {
  name: 'boxplot-info',
  props: {
    tooltipCategories: {
      type: Array,
      default: [],
    },
    tooltipMeasures: {
      type: Array,
      default: [],
    },
    tooltipPatientCount: {
      type: Number,
      default: 0,
    },
    selection: {
      type: Array,
      default: [],
    },
  },
  computed: {
    ...mapGetters(['getText']),
  },
  methods: {},
}
</script>
