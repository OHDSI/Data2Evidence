<template>
  <div class="cohort-item-container">
    <appMessageStrip
      :messageType="messageStrip.messageType"
      :text="messageStrip.message"
      v-if="messageStrip.show"
      @closeEv="resetMessageStrip"
    />
    <div class="cohort-item-content"><b>Cohort Id:</b> {{ cohort.id }}</div>
    <div class="cohort-item-content"><b>Name:</b> {{ cohort.name }}</div>
    <div class="cohort-item-content"><b>Patient Count:</b> {{ cohort.count }}</div>
    <div class="cohort-item-content"><b>Description:</b> {{ cohort.description }}</div>
    <div class="cohort-item-content"><b>Dataset Id:</b> {{ cohort.datasetId }}</div>
    <div class="cohort-item-content"><b>Created on:</b> {{ cohort.created }}</div>

    <div class="cohort-item-footer">
      <d4l-button
        @click="generateCohort"
        :text="getText('MRI_PA_BUTTON_RUN_DQD')"
        :title="getText('MRI_PA_BUTTON_RUN_DQD')"
        classes="button--block"
      />
      <d4l-button v-if="jobStatus == 'Completed'" @click="handleResults" :text="getText('MRI_PA_BUTTON_VIEW_RESULT')"></d4l-button>
      <span v-else class="cohort-item-footer__job_status">Status: {{ jobStatus }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import appButton from '../lib/ui/app-button.vue'
import appMessageStrip from '../lib/ui/app-message-strip.vue'
import '../styles/cohortListItem.scss'

export default {
  components: { appButton, appMessageStrip },
  name: 'cohortItem',
  props: ['cohort'],
  data() {
    return {
      pollIntervalDuration: 10000,
      pollIntervalId: null,
      jobStatus: null,
      job: {},
      messageStrip: {
        show: false,
        message: '',
        messageType: '',
      },
    }
  },
  methods: {
    ...mapActions(['fetchDataQualityFlowRun', 'generateDataQualityFlowRun']),
    async generateCohort() {
      const GenerateDataQualityFlowRunParams = {
          datasetId: this.getSelectedDataset.id,
          comment: '',
          cohortDefinitionId: String(this.cohort.id),
          releaseId: '',
          vocabSchemaName: '',
      }

      await this.generateDataQualityFlowRun( GenerateDataQualityFlowRunParams )
        .then(data => {
          this.messageStrip = {
            show: true,
            message: `Data Quality Check created`,
            messageType: 'success',
          }
        })
        .catch(err => {
          this.messageStrip = {
            show: true,
            message: err,
            messageType: 'error',
          }
          return err
        })
    },
    async pollJobStatus() {
      this.fetchDataQualityFlowRun({ cohortDefinitionId: this.cohort.id }).then(response => {
        this.jobStatus = response?.state_name

        if (this.jobStatus == 'Completed') {
          this.job = {
            flowRunId: response.id,
            schemaName: response.parameters.options.schemaName,
            dataCharacterizationSchema: '',
            cohortDefinitionId: response.parameters.options.cohortDefinitionId,
            type: response.tags[0],
            createdAt: response.created,
            completedAt: response.end_time,
            status: response?.state_name,
            error: '',
            datasetId: response.parameters.options.datasetId,
            comment: response.parameters.options.comment,
            databaseCode: response.parameters.options.databaseCode,
          }
        }
      })
    },
    resetMessageStrip() {
      this.messageStrip = {
        show: false,
        message: '',
        messageType: '',
      }
    },
    handleResults(value) {
      const event = new CustomEvent('alp-results-dialog-open', {
        detail: {
          props: {
            job: this.job,
          },
        },
      })
      window.dispatchEvent(event)
    },
  },
  computed: {
    ...mapGetters(['getText', 'getSelectedDataset']),
  },
  mounted() {
    this.pollJobStatus()
    this.pollIntervalId = setInterval(this.pollJobStatus, this.pollIntervalDuration)
  },
  beforeUnmount() {
    clearInterval(this.pollIntervalId)
  },
}
</script>