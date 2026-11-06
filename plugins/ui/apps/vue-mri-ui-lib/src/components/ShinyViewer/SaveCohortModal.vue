<template>
  <D2eDialog
    :model-value="isOpen"
    :title="isSaving ? getText('MRI_PA_GENERATING_DASHBOARD') : modalTitle"
    :show-close="!isSaving"
    :close-on-escape="!isSaving"
    :close-label="getText('MRI_PA_CLOSE_BUTTON')"
    data-testid="pa-save-cohort-dialog"
    @close="handleClose"
  >
    <div class="save-cohort-content">
      <div v-if="isSaving" class="save-cohort-saving">
        <VProgressCircular indeterminate class="save-cohort-saving__spinner" color="primary" :size="96" :width="8" />
        <p class="save-cohort-saving__status">{{ savingStatusText }}</p>
      </div>

      <div v-else class="save-cohort-body">
        <appMessageStrip
          v-if="messageStrip.show"
          :messageType="messageStrip.messageType"
          :text="messageStrip.message"
          @closeEv="resetMessageStrip"
        />

        <div class="save-bookmark" v-if="isNewCohort">
          <div class="save-cohort-field">
            <v-text-field
              id="save-cohort-name"
              v-model="cohortName"
              class="save-cohort-text-field"
              :error="cohortNameValidationState !== 'valid' || hasExceededLength"
              :error-messages="cohortNameErrorMessages"
              :hide-details="cohortNameErrorMessages.length === 0"
              :label="cohortNameLabel"
              :maxlength="maxLength + 1"
              variant="outlined"
              density="comfortable"
              base-color="#acaba8"
              v-focus
              required
              tabindex="0"
            >
              <template #label>
                <span class="save-cohort-field-label-content">
                  {{ cohortNameLabel }}
                  <span class="save-cohort-field__required">*</span>
                </span>
              </template>
            </v-text-field>
          </div>
        </div>

        <!-- Show existing cohort name for updates -->
        <div v-else class="save-bookmark">
          <p class="cohort-label">
            <strong>{{ getText('MRI_PA_COLL_COHORT_NAME') }}</strong>
            {{ getActiveBookmark?.bookmarkname }}
          </p>
        </div>

        <!-- Info message for bookmark-only mode -->
        <div v-if="showInfoMessage && activeCohort" class="save-bookmark">
          <v-alert type="info" variant="tonal" density="compact" class="save-cohort-info">
            <p>
              <strong>{{ getText('MRI_PA_COHORT_ALREADY_MATERIALIZED') }}</strong>
            </p>
            <p>
              <strong>{{ getText('MRI_PA_COLL_COHORT_ID') }}</strong> {{ activeCohort.id }}<br />
              <strong>{{ getText('MRI_PA_COLL_CREATED_ON') }}</strong>
              {{ new Date(activeCohort.createdOn).toLocaleString() }}
            </p>
          </v-alert>
        </div>

        <div v-if="showDescriptionField" class="save-bookmark">
          <div class="save-cohort-field">
            <v-text-field
              id="save-cohort-description"
              v-model="cohortDescription"
              class="save-cohort-text-field"
              :label="cohortDescriptionLabel"
              variant="outlined"
              density="comfortable"
              base-color="#acaba8"
              hide-details
              @keydown.enter="handleSave"
              tabindex="1"
            />
          </div>
        </div>
      </div>
    </div>

    <template v-if="!isSaving" #actions>
      <D2eButton variant="secondary" data-testid="pa-save-cohort-cancel-btn" @click="handleCancel">
        {{ getText('MRI_PA_COLL_BUT_CANCEL') }}
      </D2eButton>
      <D2eButton :disabled="isSaveDisabled" data-testid="pa-save-cohort-save-btn" @click="handleSave">
        {{ saveButtonText }}
      </D2eButton>
    </template>
  </D2eDialog>
</template>

<script lang="ts">
import { mapGetters, mapActions, mapMutations } from 'vuex'
import { D2eButton, D2eDialog } from '@d2e/ui'
import VProgressCircular from '../vuetify/VProgressCircular.vue'
import appMessageStrip from '@/lib/ui/app-message-strip.vue'
import * as types from '../../store/mutation-types'
import { usePortalContext } from '../../composables/usePortalContext'
import { useNotificationStore } from '../../stores/notifications'
import { isBookmarkSaveSuccess } from '@/utils/BookmarkUtils'

export default {
  name: 'SaveCohortModal',
  components: {
    D2eDialog,
    D2eButton,
    VProgressCircular,
    appMessageStrip,
  },
  props: {
    isOpen: {
      type: Boolean,
      required: true,
    },
    wizardConfig: {
      type: Object,
      default: null,
    },
    mode: {
      type: String,
      default: 'full',
      validator: (value: string) => ['full', 'bookmark-only', 'materialize-only'].includes(value),
    },
  },
  data() {
    const portalContext = usePortalContext()
    return {
      portalContext,
      cohortName: this.generateDefaultName(),
      cohortDescription: '',
      cohortNameValidationState: 'valid' as 'valid' | 'empty' | 'invalid' | 'duplicate',
      maxLength: 255,
      isSaving: false,
      savingStep: 'idle',
      savedBookmarkId: null,
      savedCohortId: null,
      bookmarkSavedButMaterializationFailed: false,
      messageStrip: {
        show: false,
        message: '',
        messageType: '',
      },
    }
  },
  computed: {
    ...mapGetters([
      'getText',
      'getBookmarksData',
      'getActiveBookmark',
      'getSelectedDataset',
      'getPLRequest',
      'getBookmarkByNameAndUsername',
      'getBookmarks',
      'getMaterializedCohorts',
      'getCurrentBookmarkHasChanges',
    ]),
    hasChanges() {
      return this.getActiveBookmark?.isNew || this.getCurrentBookmarkHasChanges
    },
    isNewCohort() {
      return this.getActiveBookmark?.isNew || false
    },
    hasExceededLength() {
      return this.cohortName.length > this.maxLength
    },
    isSaveDisabled() {
      return this.isSaving || this.hasExceededLength || this.cohortNameValidationState !== 'valid'
    },
    cohortNameErrorMessages() {
      if (this.hasExceededLength) {
        return [this.getText('MRI_PA_COLL_TITLE_MAX_LENGTH', String(this.maxLength))]
      }
      if (this.cohortNameValidationState === 'invalid') {
        return [this.getText('MRI_PA_INVALID_NAME_ERROR')]
      }
      if (this.cohortNameValidationState === 'empty') {
        return [this.getText('MRI_PA_BMK_EMPTY_NAME_ERROR')]
      }
      if (this.cohortNameValidationState === 'duplicate') {
        return [this.getText('MRI_PA_INVALID_NAME_ERROR')]
      }
      return []
    },
    cohortNameLabel() {
      return this.formatFieldLabel(this.getText('MRI_PA_COLL_COHORT_NAME'))
    },
    cohortDescriptionLabel() {
      return this.formatFieldLabel(this.getText('MRI_PA_COLL_COHORT_MATERIALIZATION_DESCRIPTION'))
    },
    modalTitle() {
      if (this.mode === 'bookmark-only') {
        return this.getText('MRI_PA_TITLE_SAVE_BOOKMARK')
      }
      if (this.mode === 'materialize-only') {
        return this.getText('MRI_PA_TITLE_MATERIALIZE_COHORT')
      }
      return this.getText('MRI_PA_TITLE_SAVE_AND_MATERIALIZE')
    },
    showDescriptionField() {
      return this.mode !== 'bookmark-only'
    },
    showInfoMessage() {
      return this.mode === 'bookmark-only'
    },
    saveButtonText() {
      if (this.bookmarkSavedButMaterializationFailed) {
        return this.getText('MRI_PA_COLL_BUT_RETRY')
      }
      if (this.mode === 'materialize-only') {
        return this.getText('MRI_PA_BUTTON_CONFIRM')
      }
      return this.getText('MRI_PA_BUTTON_CONFIRM')
    },
    savingStatusText() {
      const labelKeys: Record<string, string> = {
        'saving-filter': 'MRI_PA_SAVE_COHORT_APPLYING_FILTER',
        'refreshing-filter': 'MRI_PA_SAVE_COHORT_SAVING_FILTER',
        'materializing-cohort': 'MRI_PA_SAVE_COHORT_GETTING_PATIENT_LIST',
        'refreshing-cohort': 'MRI_PA_SAVE_COHORT_PREPARING_DASHBOARD',
        complete: 'MRI_PA_SAVE_COHORT_PREPARING_DASHBOARD',
      }

      return this.getText(labelKeys[this.savingStep] ?? 'MRI_PA_SAVE_COHORT_PREPARING_DASHBOARD')
    },
    activeCohort() {
      if (!this.getActiveBookmark?.cohortDefinitionId) return null
      return this.getMaterializedCohorts.find(c => c.id === this.getActiveBookmark.cohortDefinitionId)
    },
  },
  watch: {
    isOpen(newVal) {
      if (newVal) {
        this.cohortName = this.isNewCohort ? this.generateDefaultName() : this.getActiveBookmark?.bookmarkname || ''
        this.cohortDescription = ''
        this.cohortNameValidationState = 'valid'
        this.savedBookmarkId = null
        this.savedCohortId = null
        this.savingStep = 'idle'
        this.bookmarkSavedButMaterializationFailed = false
        this.resetMessageStrip()
      }
    },
    cohortName() {
      if (this.isNewCohort) {
        this.validateCohortName()
      }
    },
  },
  methods: {
    ...mapActions(['fireBookmarkQuery', 'onAddCohortOkButtonPress']),
    ...mapMutations([types.SET_ACTIVE_BOOKMARK, types.SET_ACTIVE_BOOKMARK_BASELINE]),
    generateDefaultName(): string {
      const now = new Date()
      const timestamp = now.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })

      if (this.wizardConfig && this.wizardConfig.dashboardType) {
        const dashboardType = this.wizardConfig.dashboardType
        // Convert 'calculate-incidence' to 'Calculate Incidence'
        const formattedType = dashboardType
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')

        return `${formattedType} ${timestamp}`
      }

      return `Untitled Cohort ${timestamp}`
    },
    validateCohortName() {
      if (this.bookmarkSavedButMaterializationFailed) {
        this.cohortNameValidationState = 'valid'
        return true
      }

      const trimmedName = this.cohortName.trim()

      if (trimmedName.length === 0) {
        this.cohortNameValidationState = 'empty'
        return false
      }

      if (this.hasExceededLength) {
        this.cohortNameValidationState = 'valid'
        return false
      }

      if (!this.isNewCohort && trimmedName === this.getActiveBookmark?.bookmarkname) {
        this.cohortNameValidationState = 'valid'
        return true
      }

      const username = this.portalContext.username
      const isDuplicate = this.getBookmarks.some(
        bookmark =>
          bookmark.user_id === username &&
          bookmark.bmkId !== this.getActiveBookmark?.bmkId &&
          bookmark.id !== this.getActiveBookmark?.id &&
          bookmark.bookmarkname &&
          bookmark.bookmarkname.toLowerCase() === trimmedName.toLowerCase()
      )

      if (isDuplicate) {
        this.cohortNameValidationState = 'duplicate'
        return false
      }

      const isValid = trimmedName.length > 0 && trimmedName.length <= this.maxLength

      if (!isValid) {
        this.cohortNameValidationState = 'invalid'
        return false
      }

      this.cohortNameValidationState = 'valid'
      return true
    },

    async handleSave() {
      if (!this.validateCohortName() || this.hasExceededLength) {
        return
      }

      this.isSaving = true
      this.resetMessageStrip()

      try {
        // Save bookmark for full and bookmark-only modes
        if (this.mode !== 'materialize-only' && !this.bookmarkSavedButMaterializationFailed) {
          const savedBookmark = await this.saveBookmark()
          this.savedBookmarkId = savedBookmark
        }

        // Materialize cohort for full and materialize-only modes
        if (this.mode !== 'bookmark-only') {
          await this.materializeCohort()
        }

        this.bookmarkSavedButMaterializationFailed = false

        const successMessage =
          this.mode === 'bookmark-only' ? this.getText('MRI_PA_BOOKMARK_SAVED') : this.getText('MRI_PA_COHORT_SAVED')

        this.messageStrip = {
          show: true,
          message: successMessage,
          messageType: 'success',
        }
        this.$emit('success', {
          cohortId: this.savedCohortId,
          bookmarkId: this.savedBookmarkId,
        })
        // Fire the success toast after the modal closes (the parent closes it on success)
        // so the user always sees confirmation, even when materialization is slow.
        useNotificationStore().setToastMessage({ text: successMessage })
      } catch (error) {
        console.error('[SaveCohortModal] Error:', error)

        if (this.savedBookmarkId && !this.savedCohortId) {
          this.bookmarkSavedButMaterializationFailed = true
          const errorMessage = error?.message ?? this.getText('MRI_PA_ERROR_GENERIC')
          this.showError(
            this.getText('MRI_PA_COHORT_MATERIALIZATION_FAILED_AFTER_SAVE', [
              this.getText('MRI_PA_COHORT_SAVED'),
              errorMessage,
            ])
          )
        } else {
          const errorMessage = error?.message ?? this.getText('MRI_PA_ERROR_GENERIC')
          this.showError(errorMessage)
        }
      } finally {
        this.isSaving = false
        this.savingStep = 'idle'
      }
    },

    async refreshAndFindBookmark() {
      await this.fireBookmarkQuery({ method: 'get', params: { cmd: 'loadAll' } })
      const activeBookmark = this.getActiveBookmark

      const bookmarkName = this.isNewCohort ? this.cohortName.trim() : activeBookmark?.bookmarkname

      const username = this.portalContext.username
      const bookmark = this.getBookmarkByNameAndUsername(bookmarkName, username)

      if (!bookmark) {
        throw new Error(this.getText('MRI_PA_BOOKMARK_NOT_FOUND_AFTER_REFRESH'))
      }

      this[types.SET_ACTIVE_BOOKMARK](bookmark)
      this[types.SET_ACTIVE_BOOKMARK_BASELINE](this.getBookmarksData)

      return bookmark
    },

    async saveBookmark() {
      const activeBookmark = this.getActiveBookmark
      const username = this.portalContext.username
      const bookmarkData = this.getBookmarksData
      const selectedDataset = this.getSelectedDataset

      if (!selectedDataset || !selectedDataset.id) {
        throw new Error(this.getText('MRI_PA_NO_DATASET_SELECTED'))
      }

      let bookmarkName
      if (this.isNewCohort) {
        bookmarkName = this.cohortName.trim()
        if (!bookmarkName) {
          throw new Error(this.getText('MRI_PA_COHORT_NAME_REQUIRED'))
        }
      } else {
        bookmarkName = this.cohortName.trim() || activeBookmark.bookmarkname
      }

      if (this.cohortName.trim() && this.cohortName.trim() !== activeBookmark?.bookmarkname) {
        const duplicate = this.getBookmarks.find(
          b => b.user_id === username && b.bookmarkname === this.cohortName.trim()
        )
        if (duplicate) {
          throw new Error(this.getText('MRI_PA_INVALID_NAME_ERROR'))
        }
      }

      let result

      if (this.isNewCohort) {
        this.savingStep = 'saving-filter'
        const params = {
          cmd: 'insert',
          bookmarkname: bookmarkName,
          bookmark: JSON.stringify(bookmarkData),
          shareBookmark: false,
          paConfigId: selectedDataset?.paConfigId,
          cdmConfigId: selectedDataset?.cdmConfigId,
          cdmConfigVersion: selectedDataset?.cdmConfigVersion,
          datasetId: selectedDataset?.id,
        }

        result = await this.fireBookmarkQuery({ params, method: 'post', suppressToast: true })
      } else {
        this.savingStep = 'saving-filter'
        const params = {
          cmd: 'update',
          bookmark: JSON.stringify(bookmarkData),
          shareBookmark: false,
        }

        result = await this.fireBookmarkQuery({
          method: 'put',
          params,
          bookmarkId: activeBookmark.bmkId,
          suppressToast: true,
        })
      }

      // fireBookmarkQuery reports a failed write itself and then resolves, so a resolved
      // promise is not proof the cohort was saved. Stop before materializing something
      // that does not exist.
      if (!isBookmarkSaveSuccess(result)) {
        throw new Error(this.getText(this.isNewCohort ? 'MRI_PA_SAVE_BMK_ERROR' : 'MRI_PA_UPDATE_BMK_ERROR'))
      }

      // Baseline the payload that was written, before the cohort list refresh, so the
      // saved cohort stops reporting unsaved changes straight away (#3341).
      this[types.SET_ACTIVE_BOOKMARK_BASELINE](bookmarkData)

      this.savingStep = 'refreshing-filter'
      const savedBookmark = await this.refreshAndFindBookmark()
      this.savedBookmarkId = savedBookmark.bmkId
      return savedBookmark.bmkId
    },

    async materializeCohort() {
      const selectedDataset = this.getSelectedDataset

      if (!selectedDataset || !selectedDataset.id) {
        throw new Error(this.getText('MRI_PA_NO_DATASET_SELECTED'))
      }

      this.ensureSavedBookmarkIdForMaterialization()

      if (!this.savedBookmarkId) {
        throw new Error(this.getText('MRI_PA_NO_SAVED_BOOKMARK_FOR_MATERIALIZATION'))
      }

      const plRequest = this.getPLRequest({ bmkId: this.savedBookmarkId })

      const params = {
        datasetId: selectedDataset.id,
        mriquery: JSON.stringify(plRequest),
        name: this.getCohortNameForPayload(),
        description: this.cohortDescription.trim(),
        syntax: JSON.stringify({
          datasetId: selectedDataset.id,
          bookmarkId: this.savedBookmarkId,
        }),
      }

      const url = '/analytics-svc/api/services/cohort'

      this.savingStep = 'materializing-cohort'
      const materializeResponse = await this.onAddCohortOkButtonPress({ params, url, suppressToast: true })
      const cohortDefinitionId = Number(materializeResponse?.cohortDefinitionId)

      if (!Number.isInteger(cohortDefinitionId)) {
        throw new Error(this.getText('MRI_PA_BOOKMARK_MISSING_COHORT_DEFINITION'))
      }

      this.savedCohortId = cohortDefinitionId

      this.savingStep = 'refreshing-cohort'
      await this.refreshAndFindBookmark()

      this.savingStep = 'complete'
    },
    ensureSavedBookmarkIdForMaterialization() {
      if (this.savedBookmarkId) {
        return
      }

      const activeBookmarkId = this.getActiveBookmark?.bmkId || this.getActiveBookmark?.id
      if (!activeBookmarkId) {
        return
      }

      this.savedBookmarkId = activeBookmarkId
    },
    getCohortNameForPayload() {
      if (this.isNewCohort) {
        return this.cohortName.trim()
      }

      return this.getActiveBookmark?.bookmarkname || this.cohortName.trim()
    },
    handleCancel() {
      this.bookmarkSavedButMaterializationFailed = false
      this.$emit('cancel')
    },
    handleClose() {
      this.bookmarkSavedButMaterializationFailed = false
      this.$emit('close')
    },
    formatFieldLabel(label: string): string {
      return String(label || '').replace(/\s*[:：]\s*$/, '')
    },
    resetMessageStrip() {
      this.messageStrip = {
        show: false,
        message: '',
        messageType: '',
      }
    },
    showError(message: string) {
      this.messageStrip = {
        show: true,
        message,
        messageType: 'error',
      }
    },
  },
}
</script>

<style scoped>
.save-cohort-content {
  --save-cohort-brand: var(--color-mri-brand, #000080);
  --save-cohort-error: var(--color-feedback-error, #a3293d);
  --save-cohort-field-border: #acaba8;
  --save-cohort-font: var(--app-font-family);
}

.save-cohort-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cohort-label {
  color: var(--color-ui-darkest-text, #000);
  font-size: 16px;
  margin: 0;
}

.save-cohort-saving {
  align-items: center;
  color: var(--save-cohort-brand);
  display: flex;
  flex-direction: column;
  font-family: var(--save-cohort-font);
  justify-content: center;
  min-height: 200px;
  text-align: center;
}

.save-cohort-saving__spinner {
  margin-bottom: 22px;
}

.save-cohort-saving__status {
  font-size: 14px;
  line-height: 20px;
  margin: 0;
}

.save-cohort-info {
  font-family: var(--save-cohort-font);
  font-size: 14px;
}

.save-cohort-info p {
  margin: 0;
}

.save-cohort-info p + p {
  margin-top: 8px;
}

:deep(.save-cohort-text-field .v-field) {
  background: #fff;
  color: #000;
  font-family: var(--save-cohort-font);
  min-height: 48px;
}

:deep(.save-cohort-text-field .v-field--focused .v-field__outline) {
  --v-field-border-width: 1px;
  color: var(--save-cohort-field-border);
}

:deep(.save-cohort-text-field .v-field--focused .v-field__outline__start),
:deep(.save-cohort-text-field .v-field--focused .v-field__outline__end),
:deep(.save-cohort-text-field .v-field--focused .v-field__outline__notch::before),
:deep(.save-cohort-text-field .v-field--focused .v-field__outline__notch::after) {
  border-color: var(--save-cohort-field-border);
}

:deep(.save-cohort-text-field .v-field__input) {
  font-family: var(--save-cohort-font);
  font-size: 16px;
  line-height: 20px;
  min-height: 48px;
  padding-bottom: 14px;
  padding-top: 14px;
}

:deep(.save-cohort-text-field .v-label.v-field-label) {
  color: var(--save-cohort-field-border);
  font-family: var(--save-cohort-font);
  font-size: 16px;
  opacity: 1;
}

:deep(.save-cohort-text-field .v-field-label--floating) {
  background: #fff;
  padding: 0 6px;
  z-index: 2;
}

:deep(.save-cohort-text-field .v-label.v-field-label.v-field-label--floating) {
  color: #595757;
}

.save-cohort-field-label-content {
  align-items: baseline;
  display: inline-flex;
  gap: 4px;
}

.save-cohort-field__required {
  color: var(--save-cohort-error);
}

:deep(.save-cohort-text-field .v-messages__message) {
  color: var(--save-cohort-error);
  font-family: var(--save-cohort-font);
}
</style>
