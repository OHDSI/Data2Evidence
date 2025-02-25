<template>
  <div :class="['pa-component-wrapper']">
    <div class="fullHeight pa-splitter">
      <splitpanes class="default-theme" @resize="this.paneSize = $event[0].size">
        <pane :size="paneSize" min-size="20">
          <div id="pane-left" class="split">
            <div class="panel-header filters-toolbar d-flex">
              <div>
                <button
                  type="button"
                  class="actionButton"
                  @click="togglePanel(PANEL.RIGHT)"
                  :title="getText('MRI_PA_TOOLTIP_ENTER_EXPANDED_FILTERS_VIEW')"
                >
                  <icon icon="fullScreen" />
                </button>
              </div>
              <div class="flex-grow-1 nav-container">
                <ul class="nav nav-justified">
                  <li class="nav-item" @click="toggleCohorts(true)">
                    <a class="nav-link" :class="{ active: displayCohorts }" href="javascript:void(0)">{{
                      getText('MRI_PA_VIEW_COHORT_TITLE')
                    }}</a>
                  </li>
                  <li class="nav-item" @click="toggleCohorts(false)" v-show="hasActiveBookmark">
                    <a class="nav-link" :class="{ active: !displayCohorts }" href="javascript:void(0)">{{
                      this.getActiveBookmarkName()
                    }}</a>
                  </li>
                </ul>
              </div>
            </div>
            <sharedBookmarks
              @unloadBookmarkEv="toggleSharedBookmark(false)"
              v-if="displaySharedBookmarks"
            ></sharedBookmarks>
            <bookmarks
              @unloadBookmarkEv="toggleCohorts(false)"
              :init-bookmark-id="this.querystring.bmkId"
              v-if="displayCohorts"
            ></bookmarks>

            <filters v-bind:class="{ hidden: displayCohorts || displaySharedBookmarks }"></filters>
          </div>
        </pane>

        <pane :size="PANE_SIZE.FULL - paneSize">
          <div id="pane-right" class="split">
            <chartToolbar
              :showUnHideFilters="hideLeftPane"
              @unhideEv="togglePanel(PANEL.LEFT)"
              @drilldown="onDrilldown"
              @open-filtersummary="toggleFilterCardSummary(...arguments)"
              v-if="getMriFrontendConfig"
            ></chartToolbar>
            <!-- "ref" used in solution from similar issue: https://github.com/antoniandre/splitpanes/issues/157 -->
            <div class="d-flex pane-right-content" ref="pane-right-content">
              <chartController
                @setChartBusy="setChartBusy"
                :chartBusy="chartBusy"
                :showLeftPane="!hideLeftPane"
                @drilldown="onDrilldown"
                :class="{ 'has-filtercard-summary': displayFilterCardSummary }"
                :shouldRerenderChart="shouldRerenderChart"
              ></chartController>
              <filterCardSummary
                :chartBusy="chartBusy"
                @unloadFilterCardSummaryEv="toggleFilterCardSummary(false)"
                v-if="displayFilterCardSummary"
              >
              </filterCardSummary>
            </div>
            <resizeObserver @notify="onSplitterResize" />
          </div>
        </pane>
      </splitpanes>
    </div>
    <div
      v-if="showChartAndListModal"
      style="
        height: 100vh;
        width: 100vw;
        position: fixed;
        left: 0px;
        top: 0px;
        background-color: rgba(0, 0, 0, 0.6);
        padding: 30px;
        z-index: 100;
      "
    >
      <div
        style="
          display: flex;
          flex-direction: column;
          height: calc(100vh - 60px);
          width: 100%;
          background-color: white;
          margin: 0px;
          border-radius: 20px;
          overflow: hidden;
        "
      >
        <chartToolbar
          :showUnHideFilters="hideLeftPane"
          @unhideEv="togglePanel(PANEL.LEFT)"
          @open-filtersummary="toggleFilterCardSummary(...arguments)"
          @toggleChartAndListModal="toggleChartAndListModal"
          v-if="getMriFrontendConfig"
        >
        </chartToolbar>
        <div style="flex: 1; height: calc(100% - 130px); display: flex">
          <chartController
            @setChartBusy="setChartBusy"
            :chartBusy="chartBusy"
            @drilldown="onDrilldown"
            :class="{ 'has-filtercard-summary': displayFilterCardSummary }"
            :shouldRerenderChart="shouldRerenderChart"
          ></chartController>
          <filterCardSummary
            @unloadFilterCardSummaryEv="toggleFilterCardSummary(false)"
            v-if="displayFilterCardSummary"
          >
          </filterCardSummary>
        </div>
      </div>
    </div>
    <!-- <messageBox v-if="!supportedBrowser && !clearBrowserMessage" messageType="warning" dim="true" dialogWidth="300px">
      <template v-slot:header>{{ getText('MRI_PA_NOTIFICATION_ERROR') }}</template>
      <template v-slot:body>
        <div>
          <div style="padding: 24px; max-width: 400px">
            {{ getText('MRI_PA_BROWSER_UNSUPPORTED') }}
            <appLink
              href=""
              :target="_blank"
              :text="getText('MRI_PA_ADMIN_GUIDE_LINK')"
              :title="getText('MRI_PA_ADMIN_GUIDE_LINK')"
            />
          </div>
        </div>
      </template>
      <template v-slot-footer>
        <div class="flex-spacer"></div>
        <appButton :click="dismissBrowserMessage" :text="getText('MRI_PA_BUTTON_OK')" v-focus></appButton>
      </template>
    </messageBox> -->
    <sharedChartDialog v-if="displaySharedBookmarks" />
    <messageToast />
  </div>
</template>

<script lang="ts">
declare var sap
const myWindow: any = window

import { mapActions, mapGetters } from 'vuex'
import icon from '../lib/ui/app-icon.vue'
import appButton from '../lib/ui/app-button.vue'
import appIcon from '../lib/ui/app-icon.vue'
import appLink from '../lib/ui/app-link.vue'
import Bookmarks from './Bookmarks.vue'
import ChartController from './ChartController.vue'
import ChartToolbar from './ChartToolbar.vue'
import FilterCardSummary from './FilterCardSummary.vue'
import filters from './Filters.vue'
import MessageBox from './MessageBox.vue'
import MessageToast from './MessageToast.vue'
import SharedBookmarks from './SharedBookmarks.vue'
import SharedChartDialog from './SharedChartDialog.vue'
import SplashScreen from './SplashScreen.vue'
import ResizeObserver from './ResizeObserver.vue'
import { getPortalAPI } from '../utils/PortalUtils'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

const PANE_SIZE = {
  FULL: 100,
  HIDDEN: 0,
  OPEN: 30,
}
const PANEL = {
  RIGHT: 'right',
  LEFT: 'left',
}

export default {
  name: 'patientanalytics',
  data() {
    return {
      displayCohorts: true,
      displaySharedBookmarks: false,
      displayFilterCardSummary: false,
      supportedBrowser: true,
      clearBrowserMessage: false,
      displayFilterCards: false,
      querystring: {
        bmkId: '',
      },
      isStudyMenuOpen: true,
      isLocal: false,
      portalSidebarWidth: document.querySelector('.information__studies')?.clientWidth || 0,
      shouldRerenderChart: false,
      showChartAndListModal: false,
      paneSize: PANE_SIZE.FULL,
      chartBusy: false,
      PANE_SIZE,
      PANEL,
    }
  },
  created() {
    // const userAgent = navigator.userAgent || navigator.vendor || myWindow.opera
    // if (sap && sap.ui && sap.ui.Device && sap.ui.Device.system && sap.ui.Device.system.phone) {
    //   this.supportedBrowser = false
    // }
    // if (/Webkit/i.test(userAgent) && /iPad|iPhone|iPod/i.test(userAgent)) {
    //   this.supportedBrowser = false
    // }
    // if (
    //   !(!!myWindow.MSInputMethodContext && !!(document as any).documentMode) && // IE11
    //   !/Firefox|Chrome|Safari/i.test(userAgent)
    // ) {
    //   // Firefox, Chrome, Safari
    //   this.supportedBrowser = false
    // }
  },
  watch: {
    getBookmarkFromIFR(bm) {
      // In patient list, changePage is watched and already calls setFireRequest once
      // It seems like if both are run, `setFireRequest` runs consecutively in the same tick,
      // and the `getFireRequest` watcher is unable to pick up a diff, hence no api call is made
      if (this.getPLModel.currentPage !== 1) {
        this.changePage(1)
      } else {
        this.setFireRequest()
      }
    },
    getHasAssignedConfig(val) {
      if (val) {
        // loading graphics
        this.completeInitialLoad()
        this.loadAllSharedBookmark()
        this.loadDefaultFilters()
        this.initializeBookmarks()
      }
    },
  },
  mounted() {
    this.isLocal = 'isLocal' in getPortalAPI()
  },
  computed: {
    ...mapGetters([
      'getMriFrontendConfig',
      'getHasAssignedConfig',
      'getInitialLoad',
      'getText',
      'getChartSelection',
      'getAllChartConfigs',
      'getBookmarkFromIFR',
      'getActiveChart',
      'getPLModel',
      'getActiveBookmark',
      'getBookmarkById',
    ]),
    initBookmarkId() {
      const url = window.location.href
      let bookmarkId = ''
      if (url.split('?').length > 1) {
        const queryString = url.split('?')[1]
        const queryParams = queryString.split('&')
        if (queryParams.length > 0) {
          for (let i = 0; i < queryParams.length; i++) {
            const param = queryParams[i].split('=')
            if (param[0] === 'bmkId') {
              bookmarkId = param[1]
              break
            }
          }
        }
      }
      return bookmarkId
    },
    hideLeftPane() {
      return this.paneSize === PANE_SIZE.HIDDEN
    },
    hasActiveBookmark() {
      return !!this.getActiveBookmark
    },
  },
  methods: {
    ...mapActions([
      'setSplitterSize',
      'completeInitialLoad',
      'fireBookmarkQuery',
      'loadSharedBookmarkList',
      'queryGenomicsSettings',
      'setFireRequest',
      'setupChartDefaults',
      'setIFRState',
      'drilldown',
      'changePage',
      'setActiveChart',
      'loadbookmarkToState',
      'setAddNewCohort',
    ]),
    loadDefaultFilters() {
      this.setIFRState({ ifr: this.getMriFrontendConfig.getInitialIFR() })
      this.setupChartDefaults()
    },
    loadAllBookmark() {
      const params = {
        cmd: 'loadAll',
      }
      return this.fireBookmarkQuery({ params, method: 'get' })
    },
    initializeBookmarks() {
      return this.loadAllBookmark().then(() => (this.querystring.bmkId = this.initBookmarkId))
    },
    loadAllSharedBookmark() {
      const chartConfig = this.getAllChartConfigs
      if (chartConfig && chartConfig.shared && chartConfig.shared.enabled) {
        this.loadSharedBookmarkList()
      }
    },
    dismissBrowserMessage() {
      this.clearBrowserMessage = true
    },
    toggleCohorts(isDisplayCohort) {
      if (isDisplayCohort) {
        this.initializeBookmarks()
      } else {
        if (this.paneSize === PANE_SIZE.FULL) this.togglePanel('right')
      }
      this.displayCohorts = isDisplayCohort
    },
    toggleSharedBookmark(sharedBookmarkDisplay) {
      if (sharedBookmarkDisplay) {
        this.loadAllSharedBookmark()
      }
      this.displaySharedBookmarks = sharedBookmarkDisplay
    },
    toggleFilterCardSummary(displayFilterCardSummary) {
      this.displayFilterCardSummary = displayFilterCardSummary
      // Need to wait for 'has-filtercard-summary' to happen in this tick so the rerender calculates correctly
      this.$nextTick(() => {
        this.rerenderStackBarChart()
      })
    },
    togglePanel(panel) {
      if (panel === PANEL.LEFT) {
        this.paneSize = this.paneSize > 0 ? PANE_SIZE.HIDDEN : PANE_SIZE.OPEN
      } else if (panel === PANEL.RIGHT) {
        this.paneSize = this.paneSize === PANE_SIZE.FULL ? PANE_SIZE.OPEN : PANE_SIZE.FULL
      }
    },
    toggleChartAndListModal(toggle) {
      this.showChartAndListModal = toggle
    },
    onSplitterResize() {
      this.rerenderStackBarChart()
    },
    onDrilldown() {
      const chartSelectionDuplicate = JSON.parse(JSON.stringify(this.getChartSelection()))
      const aSelectedData = this.reverseTranslate(chartSelectionDuplicate)
      this.drilldown({ aSelectedData })
    },
    setChartBusy(status: boolean) {
      this.chartBusy = status
    },
    getActiveBookmarkName() {
      if (this.getActiveBookmark) {
        return this.getActiveBookmark.bookmarkname
      } else {
        return ''
      }
    },
    getTranslationList() {
      return this.getMriFrontendConfig
        .getAttributeList()
        .map(attribute => this.getText('MRI_PA_NO_VALUE_CUSTOM', attribute.oInternalConfigAttribute.name))
    },
    reverseTranslate(obj, list) {
      if (!list) {
        // tslint:disable-next-line:no-parameter-reassignment
        list = this.getTranslationList()
      }
      Object.keys(obj).forEach(k => {
        switch (typeof obj[k]) {
          case 'object':
            this.reverseTranslate(obj[k], list)
            break
          case 'string':
            obj[k] = this.reverseTranslateText(obj[k], list)
            break
          default:
            break
        }
      })
      return obj
    },
    reverseTranslateText(str, list) {
      if (list.indexOf(str) > -1 || str === this.getText('MRI_PA_NO_VALUE')) {
        return 'NoValue'
      }
      return str
    },
    rerenderStackBarChart() {
      this.shouldRerenderChart = true
      setTimeout(() => {
        this.shouldRerenderChart = false
      }, 10)
    },
    onClickBackToFiltering() {
      this.showChartAndListModal = false
    },
    onClickShowList() {
      this.setActiveChart('list')
      this.showChartAndListModal = true
    },
    onClickShowChart() {
      this.shouldRerenderChart = true
      this.setActiveChart('stacked')
      this.showChartAndListModal = true
    },
    closeChartListModal() {
      this.toggleChartAndListModal(false)
    },
  },
  components: {
    icon,
    appButton,
    appLink,
    Bookmarks,
    ChartToolbar,
    ChartController,
    filters,
    FilterCardSummary,
    MessageBox,
    MessageToast,
    SharedBookmarks,
    SharedChartDialog,
    SplashScreen,
    ResizeObserver,
    appIcon,
    Splitpanes,
    Pane,
  },
}
</script>
