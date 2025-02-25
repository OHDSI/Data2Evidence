<template>
  <messageBox @close="cancel">
    <template v-slot:header>{{ getText('MRI_PA_FILTER_SUMMARY_DOWNLOAD_COHORT_DEFINITION') }}</template>
    <template v-slot:body>
      <div>
        <div style="padding: 24px">{{ getText('MRI_PA_FILTER_SUMMARY_DOWNLOAD_COHORT_DEFINITION_WARNING') }}</div>
      </div>
    </template>
    <template v-slot:footer>
      <div class="flex-spacer"></div>
      <appButton
        :click="onClickDownloadCohortDefinition"
        :text="getText('MRI_PA_FILTER_SUMMARY_DOWNLOAD_COHORT_DEFINITION_DOWNLOAD')"
        v-focus
      ></appButton>
      <appButton :click="cancel" :text="getText('MRI_PA_BUTTON_CANCEL')"></appButton>
    </template>
  </messageBox>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import appButton from '../lib/ui/app-button.vue'
import LoadingAnimation from './LoadingAnimation.vue'
import messageBox from './MessageBox.vue'

export default {
  compatConfig: {
    MODE: 3,
  },
  name: 'download-cohort-definition-dialog',
  props: ['closeEv'],
  data() {
    return {}
  },
  computed: {
    ...mapGetters(['getText', 'getCohortDefinitionResponse', 'getActiveBookmark']),
  },
  watch: {},
  methods: {
    ...mapActions(['setFireDownloadZIP', 'cancelCohortDefinitionQuery', 'fireCohortDefinitionQuery']),
    cancel() {
      if (this.busy) {
        this.cancelCohortDefinitionQuery()
      }
      this.$emit('closeEv')
    },
    onClickDownloadCohortDefinition() {
      const callback = () => {
        const content = this.getCohortDefinitionResponse()?.data || ''
        const blob = new Blob([JSON.stringify(content, null, 4)])
        const link = document.createElement('a')
        link.download = `${this.getActiveBookmark?.bookmarkname || 'Untitled'}.json`
        link.href = URL.createObjectURL(blob)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        this.$emit('closeEv')
      }
      this.fireCohortDefinitionQuery().then(callback)
    },
  },
  components: {
    messageBox,
    LoadingAnimation,
    appButton,
  },
}
</script>
