<template>
  <div class="patientcount-wrapper">
    <div class="patientCount" ref="patientCount" @mouseenter="openPatientPopover">
      <span class="patientIcon" style="font-family: app-icons"></span>
      <span class="patientCountTotalText">{{ patientCount }} / {{ totalPatientCount }}</span>
      <span class="icon" style="font-family: app-icons"></span>
      <span class="separator" v-if="getActiveChart === 'vb'" />
    </div>
    <dialogBox
      v-if="showPatientCount"
      @close="showPatientCount = false"
      :position="popOverPosition"
      :dialogWidth="dialogWidth"
      :arrow="'arrowUp'"
      :onMouseLeaveClose="true"
    >
      <template v-slot:body>
        <div class="patientCountContent-container">
          <div class="patientCountHeader">
            <label>{{ getText('MRI_PA_DOWNLOAD_PDF_TEXT_PATIENT_COUNT') }}</label>
          </div>
          <div class="patientCountContent-data">{{ getPatientCountText }}</div>
          <div class="patientCountContent-data">{{ getTotalPatientCountText }}</div>
        </div>
        <div>
          <div v-if="disableCensoring" class="disclaimerMessage" style="display: flex">
            <div class="icon" style="font-family: app-icons; margin-top: 8px"></div>
            <div>
              <label>{{ getText('MRI_PA_MESSAGE_CENSORING_DISCLAIMER') }}</label>
            </div>
          </div>
        </div>
      </template>
    </dialogBox>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import dialogBox from './DialogBox.vue'

export default {
  name: 'PatientCount',
  props: {
    popOverPosition: {
      type: Object,
      default() {
        return {
          right: '10px',
        }
      },
    },
  },
  data() {
    return {
      showPatientCount: false,
      disableCensoring: true,
      dialogWidth: '302px',
    }
  },
  computed: {
    ...mapGetters([
      'getActiveChart',
      'getCurrentPatientCount',
      'getTotalPatientCount',
      'getTotalPatientListCount',
      'getDisplayTotalGuardedPatientCount',
      'getText',
      'getMriFrontendConfig',
    ]),
    patientCount() {
      return this.getCurrentPatientCount
    },
    totalPatientCount() {
      return this.getDisplayTotalGuardedPatientCount ? this.getTotalPatientListCount : this.getTotalPatientCount
    },
    getPatientCountText() {
      return `${this.getText('MRI_PA_PATIENT_COUNT_TOOLTIP_MATCH')}: ${this.patientCount}`
    },
    getTotalPatientCountText() {
      return `${this.getText('MRI_PA_PATIENT_COUNT_TOOLTIP_TOTAL')}: ${this.totalPatientCount}`
    },
  },
  methods: {
    openPatientPopover() {
      const boundingBox = this.$refs.patientCount.getBoundingClientRect()
      this.showPatientCount = true
      this.popOverPosition.top = `${boundingBox.bottom + 12}px`
    },
  },
  components: {
    dialogBox,
  },
}
</script>
