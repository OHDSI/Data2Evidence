<template>
  <div id="app" class="mri-app-vue-container">
    <NotificationStack />
    <splashScreen v-if="getInitialLoad" />
    <AtlasView v-else-if="atlasStore.showAtlas" />
    <patientanalytics v-else />
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import configSelection from './components/ConfigSelection.vue'
import patientanalytics from './components/PatientAnalytics.vue'
import SplashScreen from './components/SplashScreen.vue'
import NotificationStack from './components/NotificationStack.vue'
import { useDeepLink } from './composables/useDeepLink'
import CohortUrlCodec from './utils/CohortUrlCodec'
import AtlasView from './views/AtlasView.vue'
import { useAtlasStore } from './stores/atlas'
import { usePortalContext } from './composables/usePortalContext'

export default {
  name: 'app',
  props: {},
  data() {
    return {
      showDialog: false,
      atlasStore: useAtlasStore(),
      portalContext: usePortalContext(),
    }
  },
  created() {
    this.setDataset()
    this.setDatasetReleaseId()
  },
  mounted() {
    this.setLocale()

    const datasetChangeHandler = () => {
      this.setDataset(this.portalContext.datasetId)
      this.setDatasetReleaseId(this.portalContext.releaseId)
      this.$store.commit('RESET_DATASET_CACHE')
      // Update the config in state before doing further queries
      this.requestMriConfig()
        .then(() => {
          this.setFireRequest()
        })
        .catch(e => {
          console.error('[App] Config reload on dataset change failed', e)
        })
    }
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
      // Bind to window for manual testing
      ;(window as any).shareCohortDefinition = () => {
        return CohortUrlCodec.shareCohortDefinition(this.$store)
      }
      if (process.env.NODE_ENV === 'development') {
        console.log(
          'Deep link utility loaded. Use window.shareCohortDefinition() to generate a shareable URL for the current cohort definition.'
        )
      }
    },
    async processDeepLinkIfPresent() {
      try {
        // Wait for config to be loaded
        await this.requestMriConfig()

        // Process deep link (useDeepLink handles all checks internally)
        const { processDeepLink } = useDeepLink(this.$store.dispatch)
        await processDeepLink()
      } catch (e) {
        // requestMriConfig dispatches setFatalMessage for app-level config errors;
        // this catch handles unexpected network/HTTP failures so the app doesn't hang silently.
        console.error('[App] Failed to load config or process deep link', e)
      }
    },
  },
  components: {
    patientanalytics,
    configSelection,
    SplashScreen,
    NotificationStack,
    AtlasView,
  },
}
</script>
<style lang="scss" src="./styles/style.scss"></style>
