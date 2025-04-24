<template>
  <div class="cohortCompareContainer">
    <div class="axisContainer">
      <div name="upperAxisContainer" class="upperAxisContainer">
        <div class="sort-label" v-if="activeChart === 'stacked'">{{ getText('MRI_PA_CHART_SORT_LABEL') }}</div>
        <cohortCompareSortButton
          v-if="activeChart === 'stacked'"
          @selectEv="onSelectAttribute"
        ></cohortCompareSortButton>
        <template v-if="activeChart === 'stacked' || activeChart === 'boxplot'">
          <template v-for="item in upperAxisMenu" :key="item.order">
            <cohortCompareAxisButton v-bind:axisProps="item" @selectEv="onSelectAttribute"></cohortCompareAxisButton>
          </template>
        </template>
        <div class="kmInfo" v-if="activeChart === 'km'">
          <div class="flexItem">
            <appLabel
              :cssClass="'km-label'"
              :title="getText('MRI_PA_KAPLAN_START_EVENT_TLTIP_LABEL')"
              :text="getText('MRI_PA_KAPLAN_START_EVENT')"
            />
            <cohortCompareKMMenuButton
              type="startEvent"
              class="kmButton"
              @kmEventChangeEv="onSelectKMAttribute"
            ></cohortCompareKMMenuButton>
          </div>
          <div class="flexItem">
            <appLabel
              :cssClass="'km-label'"
              :title="getText('MRI_PA_KAPLAN_END_EVENT_TLTIP_LABEL')"
              :text="getText('MRI_PA_KAPLAN_END_EVENT')"
            />
            <cohortCompareKMMenuButton
              type="endEvent"
              class="kmButton"
              @kmEventChangeEv="onSelectKMAttribute"
            ></cohortCompareKMMenuButton>
          </div>
          <div class="flexItem checkboxflex">
            <appCheckbox v-model="errorLines" :text="getText('MRI_PA_KAPLAN_ERROR_LINES')"></appCheckbox>
            <appCheckbox v-model="censoring" :text="getText('MRI_PA_KAPLAN_CENSORING_EVENTS')"></appCheckbox>
          </div>
          <div class="flexItem">
            <label class="km-label">{{ getText('MRI_PA_KAPLAN_INTERACTIONS_LABEL') }}</label>
            <kMInteractionList class="kmButton" :censoringInteractions="kmSeries"></kMInteractionList>
          </div>
        </div>
      </div>
      <div name="lowerAxisContainer" class="lowerAxisContainer">
        <div class="kaplanAxis-label" v-if="activeChart === 'km'" style="position: absolute; bottom: 105px; left: 35px">
          {{ getText('MRI_PA_KAPLAN_AXIS_TITLE') }}
        </div>
        <template v-for="item in lowerAxisMenu" :key="item.order">
          <cohortCompareAxisButton v-bind:axisProps="item" @selectEv="onSelectAttribute"></cohortCompareAxisButton>
        </template>
      </div>
    </div>
    <div name="mainChartContainer">
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
        <loadingAnimation v-if="chartBusy"></loadingAnimation>
        <StackBarCohortCompare
          v-if="activeChart === 'stacked'"
          @busyEv="setChartBusy"
          :bookmarkList="bookmarkIds"
          :xAxes="axis"
          :yAxis="yaxis"
          :sortOrder="sortType"
          @setUpperAxisEv="setUpperAxisMenu"
          @setLowerAxisEv="setLowerAxisMenu"
        ></StackBarCohortCompare>
        <BoxplotCohortCompare
          v-if="activeChart === 'boxplot'"
          @busyEv="setChartBusy"
          :bookmarkList="bookmarkIds"
          :xAxes="axis"
          :yAxis="yaxis"
        ></BoxplotCohortCompare>
        <KMCohortCompare
          v-if="activeChart === 'km'"
          @response="setResponse"
          @busyEv="setChartBusy"
          :bookmarkList="bookmarkIds"
          :xAxes="axis"
          :yAxis="yaxis"
          :kmStartEvent="kmStartEvent"
          :kmStartEventOccurence="kmStartEventOcc"
          :kmEndEvent="kmEndEvent"
          :kmEndEventOccurence="kmEndEventOcc"
          :censoring="censoring"
          :errorLines="errorLines"
        ></KMCohortCompare>
      </div>
    </div>
    <div name="legendContainer"></div>
    <dropDownMenu
      :target="downloadButton"
      boundariesElement="modal-body"
      :subMenu="downloadMenuData"
      :opened="downloadMenuOpened"
      @clickEv="handleDownloadClick"
    ></dropDownMenu>
    <imageExport
      v-if="showDownloadPNGDialog"
      :overrideResponse="response"
      @closeEv="showDownloadPNGDialog = false"
      :compareChartType="compareChartType"
    ></imageExport>
  </div>
</template>

<script lang="ts">
import { mapGetters } from 'vuex'
import BoxplotCohortCompare from './BoxplotCohortCompare.vue'
import CohortCompareAxisButton from './CohortCompareAxisButton.vue'
import CohortCompareSortButton from './CohortCompareSortButton.vue'
import DropDownMenu from './DropDownMenu.vue'
import ImageExport from './ImageExport.vue'
import KMCohortCompare from './KMCohortCompare.vue'
import LoadingAnimation from './LoadingAnimation.vue'
import StackBarCohortCompare from './StackBarCohortCompare.vue'
import KMInteractionList from './KMInteractionList.vue'
import CohortCompareKMMenuButton from './CohortCompareKMMenuButton.vue'
import appCheckbox from '../lib/ui/app-checkbox.vue'
import appLabel from '../lib/ui/app-label.vue'

export default {
  name: 'cohortComparisonContainer',
  props: ['bookmarkIds', 'activeChart'],
  data() {
    return {
      showCohortCompareDialog: false,
      bookmarkName: '',
      chartConfig: [],
      chartData: {},
      axis: '',
      yaxis: 'patient.attributes.pcount', // default values for bar chart
      sortType: '',
      downloadButton: null,
      downloadMenuData: [],
      downloadMenuOpened: false,
      showDownloadPNGDialog: false,
      compareChartType: '',
      chartBusy: false,
      upperAxisMenu: [],
      lowerAxisMenu: [],
      kmStartEvent: '',
      kmStartEventOcc: '',
      kmEndEvent: '',
      kmEndEventOcc: '',
      kmSeries: [],
      censoring: false,
      errorLines: false,
      response: null, // this data will be emitted from the charts
    }
  },
  mounted() {
    if (!this.activeChart) {
      this.activeChart = 'stacked'
    }
    this.$nextTick(() => {
      window.addEventListener('click', this.closeSubMenu)
    })
    this.$on('series', list => {
      this.kmSeries = list
    })

    this.downloadButton = this.$refs.downloadButton
  },
  beforeDestroy() {
    window.removeEventListener('click', this.closeSubMenu)
  },
  computed: {
    ...mapGetters(['getText']),
  },
  methods: {
    setUpperAxisMenu(menu) {
      this.upperAxisMenu = menu
    },
    setLowerAxisMenu(menu) {
      this.lowerAxisMenu = menu
    },
    setResponse(response) {
      this.response = response
    },
    setChartBusy(status) {
      this.chartBusy = status
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
    handleDownloadClick() {
      this.showDownloadPNGDialog = true
      if (this.activeChart === 'stacked') {
        this.compareChartType = 'columnbar'
      }
      if (this.activeChart === 'boxplot') {
        this.compareChartType = 'boxplotCompare'
      }
      if (this.activeChart === 'km') {
        this.compareChartType = 'kmCompare'
      }
      this.downloadMenuOpened = false
    },
    onSelectAttribute(val) {
      // get selected axis
      if (val) {
        if (val.type === 'x') {
          this.axis = val.configname
        } else if (val.type === 'y') {
          this.yaxis = val.configname
        } else if (val.type === 'sort') {
          this.sortType = val.value
        }
      }
    },
    onSelectKMAttribute(val) {
      if (val) {
        if (val.kmStartEventIdentifier) {
          this.kmStartEvent = val.kmStartEventIdentifier
        }
        if (val.kmStartEventOccurence) {
          this.kmStartEventOcc = val.kmStartEventOccurence
        }
        if (val.kmEndEventIdentifier) {
          this.kmEndEvent = val.kmEndEventIdentifier
        }
        if (val.kmEndEventOccurence) {
          this.kmEndEventOcc = val.kmEndEventOccurence
        }
      }
    },
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
      this.downloadMenuOpened = !this.downloadMenuOpened
    },
  },
  components: {
    BoxplotCohortCompare,
    CohortCompareAxisButton,
    CohortCompareSortButton,
    StackBarCohortCompare,
    DropDownMenu,
    ImageExport,
    KMCohortCompare,
    CohortCompareKMMenuButton,
    KMInteractionList,
    LoadingAnimation,
    appLabel,
    appCheckbox,
  },
}
</script>
