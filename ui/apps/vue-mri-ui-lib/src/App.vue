<template>
  <div id="app" class="UiTheme_d4l mri-app-vue-container">
    <fatal
      v-if="getFatalNotification.show"
      :message="getFatalNotification.message"
      :header="getText('MRI_PA_CONFIG_ADMIN_ERROR')"
      @ok="okFatal"
    />
    <alert
      v-if="getAlertNotification.show"
      :message="getAlertNotification.message"
      :header="getAlertNotification.title"
      :messageType="getAlertNotification.messageType"
      @ok="okAlert"
    />
    <!-- <ui5adaptor /> -->
    <splashScreen v-if="getInitialLoad" />
    <patientanalytics v-show="!getInitialLoad" />
  </div>
</template>

<script lang="ts">
declare var sap
import { mapActions, mapGetters, mapMutations } from 'vuex'
import configSelection from './components/ConfigSelection.vue'
import notification from './components/Notification.vue'
import patientanalytics from './components/PatientAnalytics.vue'
import ui5adaptor from './components/UI5Adaptor.vue'
import SplashScreen from './components/SplashScreen.vue'
import store from './store'
import { MESSAGE_ALERT_SHOW_TOGGLE, MESSAGE_FATAL_SHOW_TOGGLE } from './store/mutation-types'

const eventbus = sap.ui.getCore().getEventBus()

export default {
  store,
  name: 'app',
  props: {},
  data() {
    return {
      showDialog: false,
      listener: null,
    }
  },
  created() {
    this.setDataset()
    this.setDatasetReleaseId()
    this.requestMriConfig()
  },
  mounted() {
    this.listener = window.addEventListener('alp-dataset-change', () => {
      this.setDataset()
      this.setDatasetReleaseId()
      // Update the config in state before doing further queries
      this.requestMriConfig().then(() => {
        this.setFireRequest()
        this.requestTotalPatientCount()
        this.refreshPatientCount()
      })
    })
  },
  unmounted() {
    window.removeEventListener('alp-dataset-change', this.listener)
  },
  computed: {
    ...mapGetters([
      'getConfigSelectionDialogState',
      'getFatalNotification',
      'getAlertNotification',
      'getText',
      'getInitialLoad',
    ]),
  },
  methods: {
    ...mapActions([
      'requestMriConfig',
      'setDataset',
      'setDatasetReleaseId',
      'toggleConfigSelectionDialog',
      'setFireRequest',
      'refreshPatientCount',
      'requestTotalPatientCount',
    ]),
    ...mapMutations([MESSAGE_FATAL_SHOW_TOGGLE, MESSAGE_ALERT_SHOW_TOGGLE]),
    okFatal() {
      this[MESSAGE_FATAL_SHOW_TOGGLE]()
      eventbus.publish('VUE_NAVIGATE_FLP')
    },
    okAlert() {
      this[MESSAGE_ALERT_SHOW_TOGGLE]()
    },
  },
  components: {
    patientanalytics,
    ui5adaptor,
    configSelection,
    fatal: notification,
    alert: notification,
    SplashScreen,
  },
}
</script>
<style lang="scss" src="./styles/style.scss"></style>
