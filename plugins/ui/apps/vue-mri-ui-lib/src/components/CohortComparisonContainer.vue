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
          <div ref="downloadWrapper" class="download-wrapper">
            <button
              ref="downloadButton"
              class="toolbarButton"
              @click="downloadClicked"
              :title="getText('MRI_PA_BUTTON_DOWNLOAD_TOOLTIP')"
            >
              <span class="icon" style="font-family: app-icons"></span>
            </button>
            <dropDownMenu
              :target="downloadButton"
              boundariesElement="modal-body"
              :subMenu="downloadMenuData"
              :opened="downloadMenuOpened"
              @clickEv="handleDownloadClick"
            ></dropDownMenu>
          </div>
        </div>
        <loadingAnimation v-if="chartBusy"></loadingAnimation>
        <StackBarCohortCompare
          v-if="activeChart === 'stacked'"
          @busyEv="setChartBusy"
          @response="setResponse"
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
          @upperAxisMenu="setUpperAxisMenu"
          @lowerAxisMenu="setLowerAxisMenu"
          :bookmarkList="bookmarkIds"
          :xAxes="axis"
          :yAxis="yaxis"
        ></BoxplotCohortCompare>
        <KMCohortCompare
          v-if="activeChart === 'km'"
          @response="setResponse"
          @busyEv="setChartBusy"
          @lowerAxisMenu="setLowerAxisMenu"
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
    <imageExport
      v-if="showDownloadPNGDialog"
      :overrideResponse="response"
      @closeEv="onImageExported"
      :compareChartType="compareChartType"
    ></imageExport>
    <VSnackbar
      v-model="snackbar.visible"
      location="top right"
      :color="snackbarColor"
      :timeout="snackbarTimeout"
      rounded="16px"
    >
      <span class="snackbar-content">
        <appIcon :icon="snackbarIcon" :class="snackbarIconClass" />
        {{ snackbar.text }}
      </span>
    </VSnackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useStore } from 'vuex'
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
import appIcon from '../lib/ui/app-icon.vue'
import appLabel from '../lib/ui/app-label.vue'
import VSnackbar from './vuetify/VSnackbar.vue'
import Constants from '../utils/Constants'

// Props
interface Props {
  bookmarkIds?: any[]
  activeChart?: string
}

const props = withDefaults(defineProps<Props>(), {
  bookmarkIds: () => [],
  activeChart: 'stacked',
})

watch(
  () => props.activeChart,
  () => {
    chartBusy.value = false
  }
)

const store = useStore()

const getText = (key: string, param?: string | string[]) => store?.getters?.getText?.(key, param) || key

// Reactive state
const showCohortCompareDialog = ref(false)
const bookmarkName = ref('')
const chartConfig = ref<any[]>([])
const chartData = ref<any>({})
const axis = ref('')
const yaxis = ref('patient.attributes.pcount') // default values for bar chart
const sortType = ref('')
const downloadButton = ref<any>(null)
const downloadWrapper = ref<HTMLElement | null>(null)
const downloadMenuData = ref<any[]>([])
const downloadMenuOpened = ref(false)
const showDownloadPNGDialog = ref(false)
const compareChartType = ref('')
const chartBusy = ref(false)
const upperAxisMenu = ref<any[]>([])
const lowerAxisMenu = ref<any[]>([])
const kmStartEvent = ref('')
const kmStartEventOcc = ref('')
const kmEndEvent = ref('')
const kmEndEventOcc = ref('')
const kmSeries = ref<any[]>([])
const censoring = ref(false)
const errorLines = ref(false)
const response = ref<any>(null) // this data will be emitted from the charts
const snackbar = ref({ visible: false, type: 'success', text: '' })

const snackbarColor = computed(() => (snackbar.value.type === 'success' ? 'var(--color-mri-success-bg)' : '#FDEDED'))
const snackbarIcon = computed(() => (snackbar.value.type === 'success' ? 'successCheck' : 'alertCircle'))
const snackbarIconClass = computed(() =>
  snackbar.value.type === 'success' ? 'snackbar-success-icon' : 'snackbar-error-icon'
)
const snackbarTimeout = computed(() => Constants.SnackbarTimeout)

// Methods
const setUpperAxisMenu = (menu: any) => {
  upperAxisMenu.value = menu
}

const setLowerAxisMenu = (menu: any) => {
  lowerAxisMenu.value = menu
}

const setResponse = (res: any) => {
  response.value = res
}

const setChartBusy = (status: boolean) => {
  chartBusy.value = status
}

const downloadButtonClose = () => {
  if (downloadMenuOpened.value) {
    downloadMenuOpened.value = false
  }
}

const closeSubMenu = (event: any) => {
  if (downloadMenuOpened.value && downloadWrapper.value && !downloadWrapper.value.contains(event.target as Node)) {
    downloadButtonClose()
  }
}

const handleDownloadClick = () => {
  showDownloadPNGDialog.value = true
  if (props.activeChart === 'stacked') {
    compareChartType.value = 'columnbar'
  }
  if (props.activeChart === 'boxplot') {
    compareChartType.value = 'boxplotCompare'
  }
  if (props.activeChart === 'km') {
    compareChartType.value = 'kmCompare'
  }
  downloadMenuOpened.value = false
}

const showExportToast = (type: 'success' | 'error') => {
  const textKey = type === 'success' ? 'MRI_PA_EXPORT_SUCCESS' : 'MRI_PA_EXPORT_FAILED'
  snackbar.value = { visible: true, type, text: getText(textKey, getText('MRI_PA_EXPORT_FILE_PNG')) }
}

const onImageExported = (payload: any) => {
  showDownloadPNGDialog.value = false
  showExportToast(payload && payload.success ? 'success' : 'error')
}

const onSelectAttribute = (val: any) => {
  // get selected axis
  if (val) {
    if (val.type === 'x') {
      axis.value = val.configname
    } else if (val.type === 'y') {
      yaxis.value = val.configname
    } else if (val.type === 'sort') {
      sortType.value = val.value
    }
  }
}

const onSelectKMAttribute = (val: any) => {
  if (val) {
    if (val.kmStartEventIdentifier) {
      kmStartEvent.value = val.kmStartEventIdentifier
    }
    if (val.kmStartEventOccurence) {
      kmStartEventOcc.value = val.kmStartEventOccurence
    }
    if (val.kmEndEventIdentifier) {
      kmEndEvent.value = val.kmEndEventIdentifier
    }
    if (val.kmEndEventOccurence) {
      kmEndEventOcc.value = val.kmEndEventOccurence
    }
  }
}

const downloadClicked = () => {
  const menuData: any[] = []
  const menuIdx = 0
  menuData.push({
    idx: menuIdx,
    subMenuStyle: {},
    text: getText('MRI_PA_BUTTON_DOWNLOAD_PNG'),
    hasSubMenu: false,
    isSeperator: false,
    subMenu: [],
    disabled: false,
    data: 'PNG',
  })

  downloadMenuData.value = menuData
  downloadMenuOpened.value = !downloadMenuOpened.value
}

// Lifecycle hooks
onMounted(() => {
  nextTick(() => {
    window.addEventListener('click', closeSubMenu)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeSubMenu)
})
</script>

<style scoped>
.snackbar-content {
  color: rgba(0, 0, 0, 0.87);
  display: inline-flex;
  align-items: center;
}

.snackbar-success-icon {
  margin-right: 12px;
  color: #00855f;
}

.snackbar-error-icon {
  margin-right: 12px;
  color: var(--color-feedback-alarm, #d53939);
}
</style>
