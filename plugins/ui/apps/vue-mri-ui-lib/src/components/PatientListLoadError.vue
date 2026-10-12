<template>
  <div class="patientlist-load-error" data-testid="pa-patient-list-load-error" role="alert">
    <div class="patientlist-load-error__illustration-box">
      <LoadErrorIllustration class="patientlist-load-error__illustration" />
    </div>
    <div class="patientlist-load-error__text">
      <div class="patientlist-load-error__title">{{ getText('MRI_PA_PATIENT_LIST_LOAD_ERROR_TITLE') }}</div>
      <div class="patientlist-load-error__body">{{ getText('MRI_PA_PATIENT_LIST_LOAD_ERROR_TEXT') }}</div>
      <div v-if="logId" class="patientlist-load-error__log-id">
        {{ getText('MRI_PA_PATIENT_LIST_LOAD_ERROR_LOG_ID', logId) }}
      </div>
    </div>
    <button class="patientlist-load-error__reset" type="button" @click="$emit('reset')">
      {{ getText('MRI_PA_PATIENT_LIST_RESET_COLUMNS') }}
    </button>
  </div>
</template>

<script lang="ts">
import { mapGetters } from 'vuex'
import LoadErrorIllustration from './icons/LoadErrorIllustration.vue'

export default {
  name: 'PatientListLoadError',
  props: {
    logId: { type: String, default: null },
  },
  emits: ['reset'],
  computed: {
    ...mapGetters(['getText']),
  },
  components: {
    LoadErrorIllustration,
  },
}
</script>
