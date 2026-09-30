<template>
  <D2eDialog
    :model-value="true"
    :busy="busy"
    :title="getText('MRI_PA_PATIENT_LIST_DOWNLOAD_AS_CSV')"
    data-testid="pa-modal-wrapper"
    @close="cancel"
  >
    <p>{{ getText('MRI_PA_PATIENT_LIST_DOWNLOAD_AS_CSV_FULL') }}</p>
    <template #actions>
      <D2eButton
        variant="secondary"
        data-testid="pa-download-csv-cancel-btn"
        @click="cancel"
      >
        {{ getText('MRI_PA_BUTTON_CANCEL') }}
      </D2eButton>
      <D2eButton
        v-focus
        :disabled="busy"
        data-testid="pa-download-csv-download-btn"
        @click="download"
      >
        {{ getText('MRI_PA_BUTTON_DOWNLOAD') }}
      </D2eButton>
    </template>
  </D2eDialog>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import { D2eButton, D2eDialog } from '@d2e/ui'
import { generateDownloadFileName } from '../utils/generateDownloadFileName'
import { clearPendingSaveTarget, pickSaveTarget, setPendingSaveTarget } from '../utils/saveFile'

export default {
  name: 'download-csv-dialog',
  props: ['closeEv'],
  data() {
    return {
      busy: false,
      cancelled: false,
    }
  },
  computed: {
    ...mapGetters([
      'getText',
      'getCSVDownloadCompleted',
      'getIsLargePatientData',
      'getActiveBookmark',
      'getActiveChart',
    ]),
  },
  watch: {
    getCSVDownloadCompleted(val) {
      if (val) {
        this.$emit('closeEv', { success: !this.cancelled })
      }
    },
  },
  methods: {
    ...mapActions(['setFireDownloadCSV', 'cancelDownloadCSV']),
    async download() {
      this.busy = true
      this.cancelled = false
      // Ask where to save now, while the click still counts as a user gesture; the CSV is
      // written there once the backend responds.
      const fileName = generateDownloadFileName(this.getActiveBookmark?.bookmarkname, this.getActiveChart, 'csv')
      const target = await pickSaveTarget(fileName, 'csv')
      if (!target) {
        // Save picker dismissed: nothing was exported, leave the dialog open
        this.busy = false
        return
      }
      setPendingSaveTarget('csv', target)
      this.setFireDownloadCSV()
    },
    cancel() {
      if (this.busy) {
        this.cancelled = true
        this.cancelDownloadCSV()
      }
      clearPendingSaveTarget('csv')
      this.$emit('closeEv', { success: false })
    },
  },
  components: {
    D2eButton,
    D2eDialog,
  },
}
</script>
