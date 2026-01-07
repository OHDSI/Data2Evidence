<template>
  <div id="app" class="mri-app-vue-container">
    <NotificationStack />
    <splashScreen v-if="getInitialLoad" />
    <patientanalytics v-show="!getInitialLoad" />
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import configSelection from './components/ConfigSelection.vue'
import patientanalytics from './components/PatientAnalytics.vue'
import SplashScreen from './components/SplashScreen.vue'
import store from './store'
import NotificationStack from './components/NotificationStack.vue'
import { useDeepLink } from './composables/useDeepLink'

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

    // Bind shareCohortDefinition to window for manual testing
    this.bindShareCohortDefinition()

    // Process deep link if present in URL
    this.processDeepLinkIfPresent()
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
    bindShareCohortDefinition() {
      // Import CohortUrlCodec dynamically to avoid circular dependencies
      import('./utils/CohortUrlCodec').then(({ default: CohortUrlCodec }) => {
        // Bind to window for manual testing
        ;(window as any).shareCohortDefinition = () => {
          return CohortUrlCodec.shareCohortDefinition(this.$store)
        }
        if (process.env.NODE_ENV === 'development') {
          console.log(
            'Deep link utility loaded. Use window.shareCohortDefinition() to generate a shareable URL for the current cohort definition.'
          )
        }
      })
    },
    async processDeepLinkIfPresent() {
      // Wait for config to be loaded
      await this.requestMriConfig()

      // Process deep link (useDeepLink handles all checks internally)
      const { processDeepLink } = useDeepLink(this.$store.dispatch)
      await processDeepLink()
    },
  },
  components: {
    patientanalytics,
    configSelection,
    SplashScreen,
    NotificationStack,
  },
}
</script>
<style lang="scss" src="./styles/style.scss"></style>
