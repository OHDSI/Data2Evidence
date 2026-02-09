<template>
  <MessageBox v-if="isOpen" dim="true" :busy="isSaving" messageType="custom" @close="handleCancel">
    <template v-slot:header>{{ getText('MRI_PA_TITLE_SAVE_BOOKMARK') }}</template>
    <template v-slot:body>
      <div class="input-container">
        <appMessageStrip
          v-if="messageStrip.show"
          :messageType="messageStrip.messageType"
          :text="messageStrip.message"
          @closeEv="resetMessageStrip"
        />

        <div class="save-bookmark" v-if="isNewCohort">
          <div class="form-group">
            <div class="row">
              <div class="form-check col-form-label">
                <label class="form-check-label">{{ getText('MRI_PA_COLL_COHORT_NAME') }}</label>
              </div>
              <div class="col-sm-8">
                <input
                  class="form-control"
                  :class="{ 'is-invalid': cohortNameValidationState !== 'valid' }"
                  :placeholder="getText('MRI_PA_COLL_ENTER_NAME')"
                  v-model="cohortName"
                  tabindex="0"
                  v-focus
                  required
                  :maxlength="maxLength + 1"
                />
                <div
                  class="invalid-feedback"
                  v-bind:style="[cohortNameValidationState === 'invalid' && 'display: block;']"
                >
                  {{ getText('MRI_PA_INVALID_NAME_ERROR') }}
                </div>
                <div class="invalid-feedback" v-bind:style="[hasExceededLength && 'display: block;']">
                  {{ getText('MRI_PA_COHORT_NAME_TOO_LONG') || 'Filter name must not exceed 255 characters' }}
                </div>
                <div
                  class="invalid-feedback"
                  v-bind:style="[cohortNameValidationState === 'empty' && 'display: block;']"
                >
                  {{ getText('MRI_PA_BMK_EMPTY_NAME_ERROR') }}
                </div>
                <div
                  class="invalid-feedback"
                  v-bind:style="[cohortNameValidationState === 'duplicate' && 'display: block;']"
                >
                  {{ getText('MRI_PA_COHORT_NAME_DUPLICATE') || 'A cohort with this name already exists' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Show existing cohort name for updates -->
        <div v-else class="save-bookmark">
          <div class="form-group">
            <div class="row">
              <div class="form-check col-form-label">
                  <p class="cohort-label">
                    <strong>{{ getText('MRI_PA_COLL_COHORT_NAME') }}</strong>
                    {{ getActiveBookmark?.bookmarkname }}
                  </p>
              </div>
            </div>
          </div>
        </div>

        <div class="save-bookmark">
          <div class="form-group">
            <div class="row">
              <div class="form-check col-form-label">
                <label class="form-check-label">{{ getText('MRI_PA_COLL_COHORT_DESCRIPTION') }}</label>
              </div>
              <div class="col-sm-8">
                <input
                  class="form-control"
                  :placeholder="getText('MRI_PA_COLL_ENTER_DESCRIPTION')"
                  v-model="cohortDescription"
                  tabindex="1"
                  @keydown.enter="handleSave"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-slot:footer>
      <div class="flex-spacer"></div>
      <appButton
        :click="handleSave"
        :text="getText('MRI_PA_COLL_BUT_OK')"
        :tooltip="getText('MRI_PA_COLL_BUT_OK')"
        :disabled="isSaving || hasExceededLength || cohortNameValidationState !== 'valid'"
      />
      <appButton
        :click="handleCancel"
        :text="getText('MRI_PA_COLL_BUT_CANCEL')"
        :tooltip="getText('MRI_PA_COLL_BUT_CANCEL')"
        :disabled="isSaving"
      />
    </template>
  </MessageBox>
</template>

<script lang="ts">
import { mapGetters, mapActions, mapMutations } from 'vuex'
import MessageBox from '../MessageBox.vue'
import appButton from '@/lib/ui/app-button.vue'
import appMessageStrip from '@/lib/ui/app-message-strip.vue'
import * as types from '../../store/mutation-types'
import { getPortalAPI } from '../../utils/PortalUtils'

export default {
  name: 'SaveCohortModal',
  components: {
    MessageBox,
    appButton,
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
  },
  data() {
    return {
      cohortName: this.generateDefaultName(),
      cohortDescription: '',
      cohortNameValidationState: 'valid' as 'valid' | 'empty' | 'invalid' | 'duplicate',
      maxLength: 255,
      isSaving: false,
      savedBookmarkId: null,
      savedCohortId: null,
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
  },
  watch: {
    isOpen(newVal) {
      if (newVal) {
        this.cohortName = this.generateDefaultName()
        this.cohortDescription = ''
        this.cohortNameValidationState = 'valid'
        this.savedBookmarkId = null
        this.savedCohortId = null
        this.resetMessageStrip()
      }
    },
  },
  methods: {
    ...mapActions(['fireBookmarkQuery', 'onAddCohortOkButtonPress']),
    ...mapMutations([types.SET_ACTIVE_BOOKMARK]),
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

      // If wizardConfig exists, use dashboardType for name
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
      const trimmedName = this.cohortName.trim()

      // Check if empty
      if (trimmedName.length === 0) {
        this.cohortNameValidationState = 'empty'
        return false
      }

      // Check if too long (handled by hasExceededLength computed)
      if (this.hasExceededLength) {
        this.cohortNameValidationState = 'valid' // Let hasExceededLength handle this
        return false
      }

      // Check for duplicates (case-insensitive) using getBookmarks from Vuex
      const username = getPortalAPI().username
      const isDuplicate = this.getBookmarks.some(
        bookmark =>
          bookmark.user_id === username &&
          bookmark.bookmarkname &&
          bookmark.bookmarkname.toLowerCase() === trimmedName.toLowerCase()
      )

      if (isDuplicate) {
        this.cohortNameValidationState = 'duplicate'
        return false
      }

      // Check for invalid characters or patterns
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
        // Step 1: Save bookmark
        const savedBookmark = await this.saveBookmark()
        // Step 2: Materialize cohort
        await this.materializeCohort(savedBookmark)
        // Step 3: Show success message
        this.messageStrip = {
          show: true,
          message: this.getText('MRI_PA_COHORT_SAVED'),
          messageType: 'success',
        }
        // Step 4: Emit success event with cohort details
        this.$emit('success', {
          cohortId: this.savedCohortId,
          bookmarkId: this.savedBookmarkId,
        })
        // Step 5: Close modal after delay
        setTimeout(() => {
          this.handleCancel()
        }, 1500)
      } catch (error) {
        console.error('[SaveCohortModal] Error:', error)
        const errorMessage = error?.message || this.getText('MRI_PA_ERROR_GENERIC')
        this.showError(errorMessage)
      } finally {
        this.isSaving = false
      }
    },

    async refreshAndFindBookmark() {
      await this.fireBookmarkQuery({ method: 'get', params: { cmd: 'loadAll' } })
      const activeBookmark = this.getActiveBookmark

      const bookmarkName = this.isNewCohort ? this.cohortName.trim() : activeBookmark?.bookmarkname

      const username = getPortalAPI().username
      const bookmark = this.getBookmarkByNameAndUsername(bookmarkName, username)

      if (!bookmark) {
        throw new Error('Bookmark not found after refresh')
      }

      this[types.SET_ACTIVE_BOOKMARK](bookmark)

      return bookmark
    },

    async saveBookmark() {
      const activeBookmark = this.getActiveBookmark
      const username = getPortalAPI().username
      const bookmarkData = this.getBookmarksData
      const selectedDataset = this.getSelectedDataset

      if (!selectedDataset || !selectedDataset.id) {
        throw new Error('No dataset selected')
      }

      let bookmarkName
      if (this.isNewCohort) {
        bookmarkName = this.cohortName.trim()
        if (!bookmarkName) {
          throw new Error('Cohort name is required for new cohorts')
        }
      } else {
        // Existing cohort with changes: use provided name or keep existing name
        bookmarkName = this.cohortName.trim() || activeBookmark.bookmarkname
      }

      // Check for duplicate names (only if a new name is provided)
      if (this.cohortName.trim() && this.cohortName.trim() !== activeBookmark?.bookmarkname) {
        const duplicate = this.getBookmarks.find(
          b => b.user_id === username && b.bookmarkname === this.cohortName.trim()
        )
        if (duplicate) {
          throw new Error('A cohort with this name already exists')
        }
      }

      // Decide between insert (new) or update (existing with changes)
      if (this.isNewCohort) {
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

        await this.fireBookmarkQuery({ params, method: 'post' })
      } else {
        // Update existing bookmark
        const params = {
          cmd: 'update',
          bookmark: JSON.stringify(bookmarkData),
          shareBookmark: false,
        }

        await this.fireBookmarkQuery({
          method: 'put',
          params,
          bookmarkId: activeBookmark.bmkId,
        })
      }

      const savedBookmark = await this.refreshAndFindBookmark()
      this.savedBookmarkId = savedBookmark.bmkId
      return savedBookmark.bmkId
    },

    async materializeCohort() {
      const selectedDataset = this.getSelectedDataset

      if (!this.savedBookmarkId) {
        throw new Error('No saved bookmark provided for materialization')
      }

      // Get mriquery using getPLRequest with primitive bookmark ID
      const plRequest = this.getPLRequest({ bmkId: this.savedBookmarkId })

      // Prepare materialize params
      const params = {
        datasetId: selectedDataset.id,
        mriquery: JSON.stringify(plRequest),
        name: this.cohortName.trim(),
        description: this.cohortDescription.trim(),
        syntax: JSON.stringify({
          datasetId: selectedDataset.id,
          bookmarkId: this.savedBookmarkId,
        }),
      }

      const url = '/analytics-svc/api/services/cohort'

      // API call to materialize cohort
      await this.onAddCohortOkButtonPress({ params, url })

      // Refresh and find materialized bookmark (now has cohortDefinitionId)
      const materializedBookmark = await this.refreshAndFindBookmark()

      if (!materializedBookmark.cohortDefinitionId) {
        throw new Error('Bookmark does not have cohortDefinitionId after materialization')
      }

      // Find the actual materialized cohort using BOTH constraints (same pattern as bookmark.ts)
      const materializedCohorts = this.getMaterializedCohorts
      const materializedCohort = materializedCohorts.find(
        cohort =>
          materializedBookmark.bookmarkname === cohort?.cohortDefinitionName &&
          cohort.id === materializedBookmark.cohortDefinitionId
      )

      if (!materializedCohort) {
        console.error('[SaveCohort] Bookmark name:', materializedBookmark.bookmarkname)
        console.error('[SaveCohort] Bookmark cohortDefinitionId:', materializedBookmark.cohortDefinitionId)
        console.error('[SaveCohort] Available materialized cohorts:', materializedCohorts)
        throw new Error('Materialized cohort not found in materializedCohorts array')
      }

      this.savedCohortId = materializedCohort.id
    },
    handleCancel() {
      this.$emit('cancel')
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
:deep(.modal-body) {
  min-width: 40rem;
}

.input-container {
  display: flex;
  flex-direction: column;
}

.save-bookmark .form-group {
  margin-bottom: 1rem;
}

.form-group .row {
  display: flex;
  justify-content: space-between;
}

.form-group .cohort-label {
  margin-bottom: 1rem;
}

.form-group .cohort-name {
  margin-left: 1rem;
}

.save-bookmark .name {
  margin-bottom: 0.5rem;
}

.form-control {
  width: 100%;
}

.flex-spacer {
  flex-grow: 1;
}

.spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
  font-size: 1.5rem;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.check {
  font-size: 1.5rem;
  font-weight: bold;
}

.number {
  font-size: 1.25rem;
}

/* Invalid feedback styling */
.invalid-feedback {
  display: none;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #dc3545;
}

.form-control.is-invalid {
  border-color: #dc3545;
}

.form-control.is-invalid:focus {
  border-color: #dc3545;
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
}
</style>
