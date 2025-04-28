<template>
  <messageBox @close="cancel">
    <template v-slot:header>{{ getText('MRI_PA_FILTER_SUMMARY_CREATE_COHORT_DEFINITION') }}</template>
    <template v-slot:body>
      <div>
        <div style="padding: 24px">{{ getText('MRI_PA_FILTER_SUMMARY_CREATE_COHORT_DEFINITION_WARNING') }}</div>
      </div>
    </template>
    <template v-slot:footer>
      <div class="flex-spacer"></div>
      <appButton
        :click="onClickCreateCohortDefinition"
        :text="getText('MRI_PA_FILTER_SUMMARY_CREATE_COHORT_DEFINITION_DOWNLOAD')"
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
import { getPortalAPI } from '../utils/PortalUtils'
import { convertIFRToExtCohort } from '@/utils/IfrToExtCohort'

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
    ...mapGetters([
      'getText',
      'getCohortDefinitionResponse',
      'getActiveBookmark',
      'getSelectedDataset',
      'getActiveBookmark',
      'getBookmarksData',
      'getIFR',
      'getBookmarkFromIFR',
    ]),
  },
  watch: {},
  methods: {
    ...mapActions([
      'setFireDownloadZIP',
      'cancelCohortDefinitionQuery',
      'fireD2EToAtlasCohortDefinitionQuery',
      'fireCreateAtlasCohortDefinitionQuery',
    ]),
    cancel() {
      if (this.busy) {
        this.cancelCohortDefinitionQuery()
      }
      this.$emit('closeEv')
    },
    async onClickCreateCohortDefinition() {
      const IFRDefinition = { filter: this.getIFR }
      const datasetId = this.getSelectedDataset?.id
      try {
        const expression = await convertIFRToExtCohort(IFRDefinition, datasetId)
        const now = +new Date()
        const content = {
          id: 0, // 0 is used by webapi for new cohort definitions
          name: this.getActiveBookmark?.bookmarkname || 'Atlas Cohort Definition',
          tags: [],
          createdBy: getPortalAPI().username,
          expression,
          modifiedBy: getPortalAPI().username,
          createdDate: now,
          description: 'Generated from a D2E Cohort Definition',
          modifiedDate: now,
          expressionType: 'SIMPLE_EXPRESSION',
        }

        this.fireCreateAtlasCohortDefinitionQuery({
          content,
        }).then(() => {
          this.$emit('closeEv')
        })
      } catch (error) {
        console.error('Error converting IFR to external cohort:', error)
      }
    },
  },
  components: {
    messageBox,
    LoadingAnimation,
    appButton,
  },
}
</script>
