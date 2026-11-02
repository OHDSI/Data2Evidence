<template>
  <D2eDialog
    :model-value="true"
    :busy="isLoading"
    :title="getText('MRI_PA_FILTER_SUMMARY_CREATE_COHORT_DEFINITION')"
    data-testid="pa-create-cohort-definition-dialog"
    @close="cancel"
  >
    <p>{{ getText('MRI_PA_FILTER_SUMMARY_CREATE_COHORT_DEFINITION_WARNING') }}</p>
    <template #actions>
      <D2eButton variant="secondary" :disabled="isLoading" data-testid="pa-create-cohort-definition-cancel-btn" @click="cancel">
        {{ getText('MRI_PA_BUTTON_CANCEL') }}
      </D2eButton>
      <D2eButton
        v-focus
        :disabled="isLoading"
        data-testid="pa-create-cohort-definition-create-btn"
        @click="onClickCreateCohortDefinition"
      >
        {{ getText('MRI_PA_FILTER_SUMMARY_CREATE_COHORT_DEFINITION_DOWNLOAD') }}
      </D2eButton>
    </template>
  </D2eDialog>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import { D2eButton, D2eDialog } from '@d2e/ui'
import { usePortalContext } from '../composables/usePortalContext'
import { convertIFRToExtCohort } from '../utils/IfrToExtCohort'

export default {
  name: 'download-cohort-definition-dialog',
  /**
   * `cohortName` is the exploration the caller is showing. The exploration
   * page opens this dialog without setting the active bookmark — doing so
   * switches PatientAnalytics to the cohort builder — so the active bookmark
   * there is a stale leftover, or absent. Falling back to it named the new
   * Atlas cohort after whatever was last opened.
   */
  props: ['closeEv', 'cohortName'],
  data() {
    const portalContext = usePortalContext()
    return {
      portalContext,
      isLoading: false,
    }
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
      'getMriFrontendConfig',
    ]),
  },
  watch: {},
  methods: {
    ...mapActions([
      'setFireDownloadZIP',
      'cancelCohortDefinitionQuery',
      'fireD2EToAtlasCohortDefinitionQuery',
      'fireCreateAtlasCohortDefinitionQuery',
      'fireBookmarkQuery',
    ]),
    cancel() {
      if (this.busy) {
        this.cancelCohortDefinitionQuery()
      }
      this.$emit('closeEv')
    },
    async onClickCreateCohortDefinition() {
      this.isLoading = true
      const IFRDefinition = { filter: this.getIFR }
      const datasetId = this.getSelectedDataset?.id
      try {
        const expression = await convertIFRToExtCohort(
          IFRDefinition,
          datasetId,
          this.getMriFrontendConfig.getPaConfigId()
        )
        const now = +new Date()
        const content = {
          id: 0, // 0 is used by webapi for new cohort definitions
          name: this.cohortName || this.getActiveBookmark?.bookmarkname || 'Atlas Cohort Definition',
          tags: [],
          createdBy: this.portalContext.username,
          expression,
          modifiedBy: this.portalContext.username,
          createdDate: now,
          description: 'Generated from a D2E Cohort Definition',
          modifiedDate: now,
          expressionType: 'SIMPLE_EXPRESSION',
        }

        await this.fireCreateAtlasCohortDefinitionQuery({
          content,
        })
        await this.fireBookmarkQuery({ method: 'get', params: { cmd: 'loadAll' } })
        this.$emit('closeEv')
      } catch (error) {
        console.error('Error converting IFR to external cohort:', error)
      } finally {
        this.isLoading = false
      }
    },
  },
  components: {
    D2eDialog,
    D2eButton,
  },
}
</script>
