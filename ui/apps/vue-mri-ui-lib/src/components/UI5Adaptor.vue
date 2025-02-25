<template>
  <messageBox messageType="warning" @close="cancel" :busy="busy" v-if="showLeaveDialog">
    <template v-slot:header>{{ getText('MRI_PA_LEAVE_DIALOG_TITLE') }}</template>
    <template v-slot:body>
      <div>
        <div>{{ getText('MRI_PA_LEAVE_DIALOG_MESSAGE1') }}</div>
        <div>{{ getText('MRI_PA_LEAVE_DIALOG_MESSAGE2') }}</div>
      </div>
    </template>
    <template v-slot:footer>
      <div class="flex-spacer"></div>
      <appButton :click="stay" :text="getText('MRI_PA_LEAVE_DIALOG_STAY')" :disabled="busy" v-focus></appButton>
      <appButton :click="navToHome" :text="getText('MRI_PA_LEAVE_DIALOG_LEAVE')"></appButton>
    </template>
  </messageBox>
</template>

<script lang="ts">
declare var sap

import { debounce } from 'underscore'
import { mapActions, mapGetters, mapMutations } from 'vuex'
import appButton from '../lib/ui/app-button.vue'
import * as types from '../store/mutation-types'
import Constants from '../utils/Constants'
import LoadingAnimation from './LoadingAnimation.vue'
import messageBox from './MessageBox.vue'

const eventbus = sap.ui.getCore().getEventBus()
const homeBtn = sap.ui.getCore().byId('homeBtn')
const backBtn = sap.ui.getCore().byId('backBtn')

export default {
  name: 'ui5-adaptor',
  data() {
    return {
      showLeaveDialog: false,
      origBackEv: {},
      origHomeEv: {},
    }
  },
  destroyed() {
    eventbus.unsubscribe('GENOMICS_TAB_CHANGE', this.genomicsTabChanged)
    eventbus.unsubscribe('VUE_SET_IFR', this.debouncedSetIFR)
    eventbus.unsubscribe('VUE_SB_SELECTION', this.handleSBSelection)
    eventbus.unsubscribe('SET_VARIANT_FILTER_CARD', this.handleSetVariantFilterCard)
    eventbus.unsubscribe('VUE_GENOMICS_COUNT', this.handleGenomicsCount)
    eventbus.unsubscribe('VUE_CLEAR_SELECTED_AXIS', this.handleClearSelectedAxis)
    eventbus.unsubscribe('VUE_ADD_COHORT_OLD_COLLECTION', this.handleAddCohortOldSelection)
    eventbus.unsubscribe('VUE_NEW_FILTER_CARD', this.handleNewFilterCard)
    eventbus.unsubscribe('VUE_ADD_GENETIC_FILTERCARD_WITH_GENE', this.handleAddGeneticFilterCard)
  },
  created() {
    this.debouncedSetIFR = debounce((channel, event, { ifr, backendIFR, topics }) => {
      this.setBookmarkFromIFR(ifr)
      this.setCurrentBackendIFR(backendIFR)
      this.syncAxesAndCurrentBM()

      const runner = {
        FILTERCARDS_LOAD_DEFAULT_FILTERS: () => {
          this.setupChartDefaults()
        },
        VUE_CLEAR_SELECTED_AXIS: ({ dimensionIndex }) => {
          this.clearAxisValue(dimensionIndex)
        },
        VUE_SET_SELECTED_AXIS: ({ filterCardId, key, dimensionIndex, attributeId }) => {
          this.setNewAxisValue({
            id: dimensionIndex,
            props: {
              attributeId,
              filterCardId,
              key,
            },
          })
        },
        VUE_SET_BOOKMARK: ({ bookmark }) => {
          if (bookmark) {
            const parsedBookmark = JSON.parse(bookmark)
            if (parsedBookmark.axisSelection) {
              for (let i = 0; i < 5; i += 1) {
                if (parsedBookmark.axisSelection[i].attributeId !== 'n/a') {
                  const path = parsedBookmark.axisSelection[i].attributeId.split('.')
                  const key = path.pop()
                  path.pop()
                  this.setNewAxisValue({
                    id: i,
                    props: {
                      key,
                      attributeId: parsedBookmark.axisSelection[i].attributeId,
                      filterCardId: path.join('.'),
                    },
                  })
                } else {
                  this.clearAxisValue(i)
                }
              }
              // Chart Properties
              if (parsedBookmark.filter.sort) {
                this.setChartPropertyValue({
                  id: Constants.MRIChartProperties.Sort,
                  props: { value: parsedBookmark.filter.sort },
                })
              }
              if (parsedBookmark.filter.selected_event || parsedBookmark.filter.selected_start_event_occ) {
                const value = {
                  kmEventIdentifier: parsedBookmark.filter.selected_event.key,
                  kmStartEventOccurence: parsedBookmark.filter.selected_start_event_occ.key,
                }
                this.setChartPropertyValue({
                  id: Constants.MRIChartProperties.KMStartEvent,
                  props: { value },
                })
              }
              if (parsedBookmark.filter.selected_end_event || parsedBookmark.filter.selected_end_event_occ) {
                const value = {
                  kmEndEventIdentifier: parsedBookmark.filter.selected_end_event.key,
                  kmEndEventOccurence: parsedBookmark.filter.selected_end_event_occ.key,
                }
                this.setChartPropertyValue({
                  id: Constants.MRIChartProperties.KMEndEvent,
                  props: { value },
                })
              }
              this.setKMFirstLoad({
                firstLoad: {
                  errorlines: parsedBookmark.filter.errorlines,
                  censoring: parsedBookmark.filter.censoring,
                },
              })
            }
            if (parsedBookmark.filter.selected_attributes) {
              this.initPLModelBookmark({
                selected_attributes: parsedBookmark.filter.selected_attributes,
                sorting_directions: parsedBookmark.filter.selected_attributes,
                sorted_attributes: parsedBookmark.filter.sorted_attributes,
              })
            }
          }
        },
      }

      if (topics) {
        Object.keys(topics).forEach(topic => {
          runner[topic](topics[topic])
        })
      }

      this.setFireRequest()
    }, 300)
    eventbus.subscribe('GENOMICS_TAB_CHANGE', this.genomicsTabChanged)
    eventbus.subscribe('VUE_SET_IFR', this.debouncedSetIFR)
    eventbus.subscribe('VUE_SB_SELECTION', this.handleSBSelection)
    eventbus.subscribe('SET_VARIANT_FILTER_CARD', this.handleSetVariantFilterCard)
    eventbus.subscribe('VUE_GENOMICS_COUNT', this.handleGenomicsCount)
    eventbus.subscribe('VUE_CLEAR_SELECTED_AXIS', this.handleClearSelectedAxis)
    eventbus.subscribe('VUE_ADD_COHORT_OLD_COLLECTION', this.handleAddCohortOldSelection)
    eventbus.subscribe('VUE_NEW_FILTER_CARD', this.handleNewFilterCard)
    eventbus.subscribe(
      'VUE_TOGGLE_DISPLAY_TOTAL_GUARDED_PATIENT_COUNT',
      this.handleToggleDisplayTotalGuardedPatientCount
    )
    eventbus.subscribe('VUE_ADD_GENETIC_FILTERCARD_WITH_GENE', this.handleAddGeneticFilterCard)

    this.loadlanguage('hc/mri/pa/ui/collection/i18n/text.properties')
    this.loadlanguage('hc/mri/pa/config/i18n/text.properties')
    this.loadlanguage('hc/mri/pa/ui/i18n/text.properties')
    if (homeBtn) {
      this.origHomeEv = homeBtn.onclick
      homeBtn.onclick = this.handleHomePress
    }
    if (backBtn) {
      this.origBackEv = backBtn.onclick
      backBtn.onclick = this.handleHomePress
    }
  },
  computed: {
    ...mapGetters(['getMriConfig', 'getHasAssignedConfig', 'getSplitterWidth', 'getText']),
  },
  watch: {
    getHasAssignedConfig(hasAssignedConfig) {
      if (hasAssignedConfig) {
        sap.ui.require(['hc/mri/pa/ui/lib/MriFrontendConfig'], MriFrontendConfig => {
          MriFrontendConfig.createFrontendConfig(this.getMriConfig)
        })
        this[types.UI5_SET_LOADED](true)
        eventbus.publish('VUE_CONFIG_CHANGED', this.getMriConfig)
      }
    },
    getSplitterWidth(width) {
      eventbus.publish('VUE_SPLITTER_RESIZE', { width })
    },
  },
  methods: {
    ...mapActions([
      'setBookmarkFromIFR',
      'syncAxesAndCurrentBM',
      'clearAxisValue',
      'setNewAxisValue',
      'addLocale',
      'initPLModelBookmark',
      'setupChartDefaults',
      'setFireRequest',
      'setCurrentBackendIFR',
      'setSelectedGenomicsTab',
      'setChartPropertyValue',
      'setKMFirstLoad',
      'addGeneticFilterCard',
    ]),
    ...mapMutations([
      types.IFR_SET,
      types.SET_CHART_SELECTION,
      types.I18N_ADD_LOCALE,
      types.I18N_SET_CURRENT_LOCALE,
      types.UI5_SET_LOADED,
      types.SET_VARIANT_FILTER_CARD,
      types.COLLECTIONS_SET_OLDCOLLECTION,
      types.MESSAGE_SET,
      types.SET_CURRENT_PATIENT_COUNT,
      types.PCOUNT_SET_DISPLAYTOTALGUARDEDPATIENTCOUNT,
    ]),
    genomicsTabChanged(channel, event, data) {
      this.setSelectedGenomicsTab(data.newTab)
    },
    handleSBSelection(channel, event, selection) {
      this[types.SET_CHART_SELECTION]({ selection })
    },
    handleAddGeneticFilterCard(channelId, eventId, eventData) {
      this.addGeneticFilterCard(eventData)
    },
    handleSetVariantFilterCard(channel, event, data) {
      // Do nothing, this method is deprecated as the "query.ts" is managing to update variantFilterCards
      // whenever there is a change
    },
    handleGenomicsCount(channel, event, data) {
      this[types.SET_CURRENT_PATIENT_COUNT](data)
    },
    handleClearSelectedAxis(channel, event, dimensionIndex) {
      this.clearAxisValue(dimensionIndex)
    },
    handleAddCohortOldSelection(channel, event, oldCollection) {
      this[types.COLLECTIONS_SET_OLDCOLLECTION](oldCollection)
    },
    handleNewFilterCard(channel, event, { cardName }) {
      this[types.MESSAGE_SET]('')
      if (cardName !== '') {
        this[types.MESSAGE_SET](this.getText('MRI_PA_NEW_FILTERCARD_NOTIFICATION', [cardName]))
      }
      setTimeout(() => {
        const newCards = Array.from(document.getElementsByClassName('MriPaFilterCardNew'))
        if (newCards.length) {
          newCards.pop().scrollIntoView()
        }
      }, 200)
    },
    handleToggleDisplayTotalGuardedPatientCount(channel, event, { isDisplay }) {
      this[types.PCOUNT_SET_DISPLAYTOTALGUARDEDPATIENTCOUNT]({ isDisplay })
    },
    loadlanguage(bundleUrl) {
      const model = new sap.ui.model.resource.ResourceModel({
        bundleUrl,
        async: false,
      })

      // workaround: need to call something to load translation text.
      model.getResourceBundle().getText('MRI_PA_SETTINGS')
      this[types.I18N_SET_CURRENT_LOCALE](model._oResourceBundle.sLocale)

      const locale = {}

      for (let i = 0; i < model._oResourceBundle.aLocales.length; i += 1) {
        locale[model._oResourceBundle.aLocales[i] || 'DEFAULT'] = model._oResourceBundle.aPropertyFiles[i].mProperties
      }

      this.addLocale({ locale })
    },
    handleHomePress(event) {
      if (!this.showLeaveDialog) {
        event.preventDefault()
        this.showLeaveDialog = true
      }
    },
    stay(event) {
      this.showLeaveDialog = false
    },
    backHome() {
      const oCrossAppNavigator = sap.ushell.Container.getService('CrossApplicationNavigation')
      oCrossAppNavigator.toExternal({
        target: { semanticObject: '#' },
      })
    },
    navToHome(event) {
      homeBtn.attachEvent('onclick', null, this.origHomeEv)
      backBtn.attachEvent('onclick', null, this.origBackEv)

      this.backHome()
    },
  },
  components: {
    messageBox,
    LoadingAnimation,
    appButton,
  },
}
</script>
