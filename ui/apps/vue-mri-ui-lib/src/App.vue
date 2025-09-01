<template>
  <div id="app" class="UiTheme_d4l mri-app-vue-container">
    <NotificationStack />
    <!-- <ui5adaptor /> -->
    <splashScreen v-if="getInitialLoad" />
    <patientanalytics v-show="!getInitialLoad" />
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import configSelection from './components/ConfigSelection.vue'
import patientanalytics from './components/PatientAnalytics.vue'
import ui5adaptor from './components/UI5Adaptor.vue'
import SplashScreen from './components/SplashScreen.vue'
import store from './store'
import NotificationStack from './components/NotificationStack.vue'

export default {
  store,
  name: 'app',
  props: {},
  data() {
    return {
      showDialog: false,
    }
  },
  created() {
    this.setDataset()
    this.setDatasetReleaseId()
    this.requestMriConfig()
  },
  mounted() {
    this.setLocale()

    const datasetChangeHandler = () => {
      this.setDataset()
      this.setDatasetReleaseId()
      // Update the config in state before doing further queries
      this.requestMriConfig().then(() => {
        this.setFireRequest()
        this.refreshPatientCount()
      })
    }
    const listenerInfo = { type: 'alp-dataset-change', app: 'patient-analytics', listener: datasetChangeHandler }
    if (!window.d2eListeners) {
      window.d2eListeners = {
        'alp-dataset-change': [listenerInfo],
      }
    } else if (!window.d2eListeners['alp-dataset-change']) {
      window.d2eListeners['alp-dataset-change'] = [listenerInfo]
    } else {
      window.d2eListeners['alp-dataset-change'].push(listenerInfo)
    }
    window.addEventListener('alp-dataset-change', datasetChangeHandler)
  },
  computed: {
    ...mapGetters(['getConfigSelectionDialogState', 'getInitialLoad']),
  },
  methods: {
    ...mapActions([
      'requestMriConfig',
      'setDataset',
      'setDatasetReleaseId',
      'toggleConfigSelectionDialog',
      'setFireRequest',
      'refreshPatientCount',
      'setLocale',
    ]),
  },
  components: {
    patientanalytics,
    ui5adaptor,
    configSelection,
    SplashScreen,
    NotificationStack,
  },
}
</script>
<style lang="scss" src="./styles/style.scss"></style>

