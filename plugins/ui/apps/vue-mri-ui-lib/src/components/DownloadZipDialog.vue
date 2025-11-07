<template>
  <messageBox @close="cancel" :busy="busy">
    <template v-slot:header>{{ getText('MRI_PA_PATIENT_LIST_DOWNLOAD_AS_ZIP') }}</template>
    <template v-slot:body>
      <div>
        <div style="margin-left: 24px; display: flex">
          <input v-model="columnsToInclude" value="SELECTED" type="radio" name="config-selection-radio" />
          <div style="margin-left: 5px">{{ getText('MRI_PA_PATIENT_LIST_INCLUDE_SELECTED_COLUMNS') }}</div>
        </div>
        <div style="margin-left: 24px; margin-bottom: 10px; display: flex">
          <input v-model="columnsToInclude" value="ALL" type="radio" name="config-selection-radio" />
          <div style="margin-left: 5px">{{ getText('MRI_PA_PATIENT_LIST_INCLUDE_ALL_COLUMNS') }}</div>
        </div>
        <div class="dialog-warning-delay" v-if="getIsLargePatientData || columnsToInclude === 'ALL'">
          {{ getText('MRI_PA_PATIENT_LIST_DOWNLOAD_WARNING') }}
        </div>
        <div style="padding: 24px">{{ getText('MRI_PA_PATIENT_LIST_DOWNLOAD_AS_ZIP_FULL') }}</div>
      </div>
    </template>
    <template v-slot:footer>
      <div class="flex-spacer"></div>
      <appButton :click="download" :text="getText('MRI_PA_BUTTON_DOWNLOAD')" :disabled="busy" v-focus></appButton>
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
  name: 'download-zip-dialog',
  props: ['closeEv'],
  data() {
    return {
      busy: false,
      columnsToInclude: 'SELECTED',
    }
  },
  computed: {
    ...mapGetters(['getText', 'getZIPDownloadCompleted', 'getIsLargePatientData']),
  },
  watch: {
    getZIPDownloadCompleted(val) {
      if (val) {
        this.$emit('closeEv')
      }
    },
  },
  methods: {
    ...mapActions(['setFireDownloadZIP', 'cancelDownloadZIP']),
    download() {
      this.busy = true
      this.setFireDownloadZIP({ columnsToInclude: this.columnsToInclude })
    },
    cancel() {
      if (this.busy) {
        this.cancelDownloadZIP()
      }
      this.$emit('closeEv')
    },
  },
  components: {
    messageBox,
    LoadingAnimation,
    appButton,
  },
}
</script>
