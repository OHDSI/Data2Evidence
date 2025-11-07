<template>
  <div class="cohorts-app-container">
    <div ref="contextPS" style="display: none"></div>
  </div>
</template>
<script lang="ts">
declare var sap
import { mapGetters } from 'vuex'
import appButton from '../lib/ui/app-button.vue'

export default {
  name: 'cohorts-app',
  props: {
    load: Boolean,
  },
  computed: {
    ...mapGetters(['getText']),
  },
  watch: {
    load() {
      this.loadCohortsApp()
    },
  },
  methods: {
    loadCohortsApp() {
      const psControl = this.setupUI5Control()

      this.$nextTick(() => {
        psControl.getController().open()
      })
    },
    setupUI5Control() {
      if (this.psui5element) {
        try {
          this.psui5element.destroy()
        } catch (err) {
          // do nothing
        }
      }
      this.psui5element = new sap.ui.xmlview({
        viewName: 'hc.mri.pa.ui.views.CohortsApp',
        width: '100%',
        height: '100%',
      })
      this.psui5element.placeAt(this.$refs.contextPS, 'only')
      return this.psui5element
    },
  },
  components: {
    appButton,
  },
}
</script>
