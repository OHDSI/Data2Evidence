<template>
  <div class="filters-footer d-flex justify-content-center">
    <div class="d-flex align-items-center" style="justify-content: space-between; width: 100%">
      <div>
        <d4l-button
          class="unicode-icon"
          :text="getRefreshUnicodeCharacter()"
          :title="getText('MRI_PA_TOOLTIP_RESET_FILTERS')"
          @click="openResetDialog"
          style="--border-radius-button: 9999px; margin-left: 8px; margin-right: 8px"
        />
      </div>
      <div class="d-flex justify-content-center align-items-center">
        <b-dropdown variant="link" size="sm" no-caret style="margin-left: 8px">
          <template v-slot:button-content>
            <d4l-button 
              v-if="!splitAddButton"
              :text="getText('MRI_PA_VB_CREATE_FILTERS')"
              :title="this.hasExceededMaxFilterCount ? getText('MRI_PA_TOOLTIP_CREATE_FILTERS_DISABLED_DUE_TO_EXCEEDING_MAX_FILTERCARD_COUNT', this.maxFiltercardCount) : getText('MRI_PA_TOOLTIP_CREATE_FILTERS')"
              :disabled="this.hasExceededMaxFilterCount"
            />
            <d4l-button
              v-else
              :text="getText('MRI_PA_VB_CREATE_FILTERS_INCLUDED')"
              :title="getText('MRI_PA_TOOLTIP_CREATE_FILTERS_INCLUDED')"
            />
          </template>
          <div class="dropdown-scroll">
            <template v-for="item in getFilterCardMenu" :key="item">
              <b-dropdown-item-button :data-key="item.key" @click="onAddFilterCardMenuItemSelected(item.key)">{{
                item.text
              }}</b-dropdown-item-button>
            </template>
          </div>
        </b-dropdown>
        <b-dropdown v-if="splitAddButton" variant="link" size="sm" no-caret dropup>
          <template v-slot:button-content>
            <d4l-button
              :text="getText('MRI_PA_VB_CREATE_FILTERS_EXCLUDED')"
              :title="getText('MRI_PA_TOOLTIP_CREATE_FILTERS_INCLUDED')"
              style="margin-left: 8px"
            />
          </template>
          <div class="dropdown-scroll">
            <template v-for="item in getFilterCardMenu" :key="item">
              <b-dropdown-item-button :data-key="item.key" @click="onAddFilterCardMenuItemSelected(item.key, true)">{{
                item.text
              }}</b-dropdown-item-button>
            </template>
          </div>
        </b-dropdown>
      </div>
      <div>
        <d4l-button
          ref="saveBookmarkButton"
          :disabled="!hasChanges"
          :text="getText('MRI_PA_BUTTON_SAVE')"
          :title="getText('MRI_PA_BUTTON_SAVE')"
          @click="openSaveBookmark"
          style="margin-left: 8px; margin-right: 8px"
        />
      </div>
    </div>

    <messageBox v-if="showSaveBookmark" dim="true" @close="closeSaveBookmark">
      <template v-slot:header>{{ getText('MRI_PA_TITLE_SAVE_BOOKMARK') }}</template>
      <template v-slot:body>
        <div>
          <div class="save-bookmark">
            <div class="form-group">
              <div class="name" v-if="this.isNewCohort || this.isNotUserSharedBookmark">
                <div class="row">
                  <div class="col-sm-12 form-check col-form-label">
                    <label v-if="this.isNewCohort">
                      Enter a new name if you would like to overwrite the current name ({{
                        this.getActiveBookmark.bookmarkname
                      }}).
                    </label>
                    <label v-else> Enter a new name for the cohort. </label>
                  </div>
                </div>
                <div class="row">
                  <div class="col">
                    <input
                      class="form-control"
                      :class="{ 'is-invalid': isInvalidName }"
                      :placeholder="getText('MRI_PA_COLL_ENTER_NAME')"
                      v-model="cohortName"
                      tabindex="0"
                      v-focus
                      required
                      maxlength="40"
                    />
                    <div class="invalid-feedback" v-bind:style="[isInvalidName && 'display: block;']">
                      Please enter another name
                    </div>
                    <div class="invalid-feedback" v-bind:style="[hasExceededLength && 'display: block;']">
                      Filter name must not exceed 40 characters
                    </div>
                  </div>
                </div>
              </div>

              <div class="row row-checkbox">
                <appCheckbox
                  v-model="shareBookmark"
                  :text="getText('MRI_PA_BMK_SHARED_BOOKMARK_TEXT')"
                  :title="getText('MRI_PA_BMK_SHARED_BOOKMARK_TITLE')"
                ></appCheckbox>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template v-slot:footer>
        <div class="flex-spacer"></div>
        <appButton
          :click="saveBookmark"
          :text="getText('MRI_PA_BUTTON_SAVE')"
          :tooltip="getText('MRI_PA_BUTTON_SAVE')"
          :disabled="this.hasExceededLength"
        ></appButton>
        <appButton
          :click="closeSaveBookmark"
          :text="getText('MRI_PA_BUTTON_CANCEL')"
          :tooltip="getText('MRI_PA_BUTTON_CANCEL')"
        ></appButton>
      </template>
    </messageBox>

    <messageBox dim="true" dialogWidth="400px" v-if="showResetDialog" @close="closeResetDialog">
      <template v-slot:header>{{ getText('MRI_PA_RESET_FILTERS_TITLE') }}</template>
      <template v-slot:body>
        <div>
          <div class="div-reset-text">{{ getText('MRI_PA_TXT_RESET_FILTERS') }}</div>
        </div>
      </template>
      <template v-slot:footer>
        <div class="flex-spacer"></div>
        <appButton
          :click="reset"
          :text="getText('MRI_PA_RESET_FILTERS_OK')"
          :tooltip="getText('MRI_PA_RESET_FILTERS_OK')"
          v-focus
        ></appButton>
        <appButton
          :click="closeResetDialog"
          :text="getText('MRI_PA_BUTTON_CANCEL')"
          :tooltip="getText('MRI_PA_BUTTON_CANCEL')"
        ></appButton>
      </template>
    </messageBox>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters, mapMutations } from 'vuex'
import appButton from '../lib/ui/app-button.vue'
import appCheckbox from '../lib/ui/app-checkbox.vue'
import * as types from '../store/mutation-types'
import DialogBox from './DialogBox.vue'
import messageBox from './MessageBox.vue'
import { getPortalAPI } from '../utils/PortalUtils'

export default {
  name: 'filtersFooter',
  props: {
    splitAddButton: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  data() {
    return {
      showSaveBookmark: false,
      shareBookmark: false,
      showResetDialog: false,
      saveDialogWidth: 260,
      isInvalidName: false,
      cohortName: '',
      maxLength: 40,
      maxFiltercardCount: 10,
    }
  },
  mounted() {
    // Get maxFiltercardCount from config if available.
    this.maxFiltercardCount = this.getMriFrontendConfig._internalConfig.panelOptions.maxFiltercardCount || this.maxFiltercardCount
  },
  computed: {
    ...mapGetters([
      'getFilterCardMenu',
      'getFilterCardCount',
      'getText',
      'getBookmarksData',
      'getBookmarks',
      'getMriFrontendConfig',
      'getActiveBookmark',
      'getCurrentBookmarkHasChanges',
      'getBookmark',
      'getBookmarkByNameAndUsername',
    ]),
    hasChanges() {
      return this.getActiveBookmark.isNew || this.getCurrentBookmarkHasChanges
    },
    isNewCohort() {
      return this.getActiveBookmark.isNew
    },
    hasExceededLength() {
      return this.cohortName.length == this.maxLength
    },
    hasExceededMaxFilterCount() {
      const filtercardCount = this.getFilterCardCount({
        excludeBasicCard: true,
        excludedOnly: false,
        matchType: 'matchall',
      })
      return filtercardCount >= this.maxFiltercardCount
    },
    isNotUserSharedBookmark() {
      const username = getPortalAPI().username
      return this.getActiveBookmark.shared && username !== this.getActiveBookmark.user_id
    },
  },
  watch: {
    getActiveBookmark: {
      handler(newVal) {
        this.shareBookmark = !!newVal.shared
      },
      immediate: true,
    },
  },
  methods: {
    ...mapActions(['fireBookmarkQuery', 'resetChartProperties', 'loadbookmarkToState']),
    ...mapMutations([types.CONFIG_SET_HAS_ASSIGNED, types.SET_ACTIVE_BOOKMARK]),
    onAddFilterCardMenuItemSelected(configPath, isExclusion = false) {
      this.$emit('add', {
        configPath,
        isExclusion,
        boolFilterContainerId: null,
      })
    },
    openSaveBookmark() {
      this.showSaveBookmark = true
    },
    closeSaveBookmark() {
      this.showSaveBookmark = false
    },
    closeResetDialog() {
      this.showResetDialog = false
    },
    openResetDialog() {
      this.showResetDialog = true
    },
    async saveBookmark() {
      if (this.hasChanges) {
        await this.fireBookmarkQuery({
          params: { cmd: 'loadAll' },
          method: 'get',
        })
        const bookmark = this.getBookmarksData
        const activeBookmark = this.getActiveBookmark
        const isNewBookmark = activeBookmark.isNew || false
        const username = getPortalAPI().username

        for (const bookmark of this.getBookmarks) {
          if (username === bookmark.user_id && bookmark.bookmarkname === this.cohortName) {
            this.isInvalidName = true
            return
          }
        }

        const bookmarkName = this.cohortName ? this.cohortName : activeBookmark.bookmarkname

        if (isNewBookmark || this.isNotUserSharedBookmark) {
          const params = {
            cmd: 'insert',
            bookmarkname: bookmarkName,
            shareBookmark: this.shareBookmark,
            bookmark: JSON.stringify(bookmark),
          }
          await this.fireBookmarkQuery({ params, method: 'post' })
        } else {
          const request = {
            cmd: 'update',
            bookmark: JSON.stringify(bookmark),
            shareBookmark: this.shareBookmark,
          }
          await this.fireBookmarkQuery({
            method: 'put',
            params: request,
            bookmarkId: activeBookmark.bmkId,
          })
        }
        await this.fireBookmarkQuery({ method: 'get', params: { cmd: 'loadAll' } })
        const savedBookmark = this.getBookmarkByNameAndUsername(bookmarkName, username)
        this[types.SET_ACTIVE_BOOKMARK](savedBookmark)
        this.cohortName = ''
        this.closeSaveBookmark()
      }
    },
    reset() {
      this[types.CONFIG_SET_HAS_ASSIGNED](false)
      this.$nextTick(() => {
        this.resetChartProperties()
        this[types.CONFIG_SET_HAS_ASSIGNED](true)
        this.closeResetDialog()
      })
    },
    getRefreshUnicodeCharacter() {
      const charSpan = document.createElement('textarea')
      charSpan.innerHTML = '&#8634;'
      return charSpan.value
    },
    showChart() {
      this.$emit('showChart')
    },
    showPatientList() {
      this.$emit('showPatientList')
    },
  },
  components: {
    appButton,
    appCheckbox,
    DialogBox,
    messageBox,
  },
}
</script>
