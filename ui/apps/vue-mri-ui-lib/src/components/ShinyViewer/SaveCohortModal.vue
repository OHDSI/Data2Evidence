<template>
  <MessageBox v-if="isOpen" dim="true" :busy="isSaving" messageType="custom" @close="handleCancel">
    <template v-slot:header>{{ getText('MRI_PA_SAVE_COHORT_TITLE') }}</template>
    <template v-slot:body>
      <div>
        <!-- Save Bookmark Section -->
        <div class="save-bookmark">
          <!-- Error/Success Message Strip -->
          <appMessageStrip
            v-if="messageStrip.show"
            :messageType="messageStrip.messageType"
            :text="messageStrip.message"
            @closeEv="resetMessageStrip"
          />

          <!-- Cohort Name Input -->
          <div class="form-group">
            <div class="name">
              <div class="row">
                <div class="col-sm-12 form-check col-form-label">
                  <label>{{ getText('MRI_PA_COHORT_NAME_LABEL') }}</label>
                </div>
              </div>
              <div class="row">
                <div class="col">
                  <!-- maxLength for input is maxLength+1 to allow invalid-feedback to be shown -->
                  <input
                    class="form-control"
                    :class="{ 'is-invalid': cohortNameValidationState !== 'valid' }"
                    :placeholder="getText('MRI_PA_COLL_ENTER_NAME')"
                    v-model="cohortName"
                    tabindex="0"
                    v-focus
                    required
                    :maxlength="maxLength + 1"
                    @input="validateCohortName"
                    @keydown.enter="handleSave"
                  />
                  <div
                    class="invalid-feedback"
                    v-bind:style="[cohortNameValidationState === 'invalid' && 'display: block;']"
                  >
                    {{ getText('MRI_PA_INVALID_NAME_ERROR') }}
                  </div>
                  <div class="invalid-feedback" v-bind:style="[hasExceededLength && 'display: block;']">
                    {{ getText('MRI_PA_COHORT_NAME_TOO_LONG') }}
                  </div>
                  <div
                    class="invalid-feedback"
                    v-bind:style="[cohortNameValidationState === 'empty' && 'display: block;']"
                  >
                    {{ getText('MRI_PA_COHORT_NAME_REQUIRED') }}
                  </div>
                  <div
                    class="invalid-feedback"
                    v-bind:style="[cohortNameValidationState === 'duplicate' && 'display: block;']"
                  >
                    {{ getText('MRI_PA_COHORT_NAME_DUPLICATE') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Cohort Dialog Section -->
        <div class="cohort-dialog">
          <!-- Optional Description Input -->
          <div class="form-group">
            <div class="row">
              <div class="col-sm-4 form-check col-form-label">
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
        :text="getText('MRI_PA_BUTTON_SAVE')"
        :tooltip="getText('MRI_PA_BUTTON_SAVE')"
        :disabled="isSaving || hasExceededLength || cohortNameValidationState !== 'valid'"
      />
      <appButton
        :click="handleCancel"
        :text="getText('MRI_PA_BUTTON_CANCEL')"
        :tooltip="getText('MRI_PA_BUTTON_CANCEL')"
      />
    </template>
  </MessageBox>
</template>

<script lang="ts">
import { mapGetters } from 'vuex'
import MessageBox from '../MessageBox.vue'
import appButton from '@/lib/ui/app-button.vue'
import appMessageStrip from '@/lib/ui/app-message-strip.vue'

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
    existingBookmarks: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      cohortName: this.generateDefaultName(),
      cohortDescription: '',
      cohortNameValidationState: 'valid' as 'valid' | 'empty' | 'invalid' | 'duplicate',
      maxLength: 255,
      isSaving: false,
      messageStrip: {
        show: false,
        message: '',
        messageType: '', // 'error', 'success', 'warning', 'information'
      },
    }
  },
  computed: {
    ...mapGetters(['getText']),
    hasExceededLength() {
      return this.cohortName.length > this.maxLength
    },
  },
  watch: {
    isOpen(newVal) {
      if (newVal) {
        // Reset form when modal opens
        this.cohortName = this.generateDefaultName()
        this.cohortDescription = ''
        this.cohortNameValidationState = 'valid'
        this.resetMessageStrip()
      }
    },
  },
  methods: {
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

      // Check for duplicates (case-insensitive)
      const isDuplicate = this.existingBookmarks.some(
        bookmark => bookmark.bookmarkname && bookmark.bookmarkname.toLowerCase() === trimmedName.toLowerCase()
      )

      if (isDuplicate) {
        this.cohortNameValidationState = 'duplicate'
        return false
      }

      // Check for invalid characters or patterns
      // You can add more validation rules here if needed
      const isValid = trimmedName.length > 0 && trimmedName.length <= this.maxLength

      if (!isValid) {
        this.cohortNameValidationState = 'invalid'
        return false
      }

      this.cohortNameValidationState = 'valid'
      return true
    },
    handleSave() {
      // Validate before saving
      if (!this.validateCohortName() || this.hasExceededLength) {
        return
      }

      // Emit save event with cohort data
      this.$emit('save', {
        name: this.cohortName.trim(),
        description: this.cohortDescription.trim(),
      })
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
/* Styles from FiltersFooter save-bookmark class */
.save-bookmark .form-group {
  margin-bottom: 1rem;
}

.save-bookmark .name {
  margin-bottom: 0.5rem;
}

/* Styles from AddCohort cohort-dialog class */
.cohort-dialog .form-group {
  margin-bottom: 1rem;
}

.form-control {
  width: 100%;
}

.flex-spacer {
  flex-grow: 1;
}
</style>
