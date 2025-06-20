<template>
  <div class="bookmark-container">
    <appMessageStrip
      :messageType="messageStrip.messageType"
      :text="messageStrip.message"
      v-if="messageStrip.show"
      @closeEv="resetMessageStrip"
    />
    <messageBox dim="true" dialogWidth="400px" v-if="showRenameDialog" @close="closeRenameBookmark">
      <template v-slot:header>{{ getText('MRI_PA_BOOKMARK_RENAME_DIALOG_TITLE') }}</template>
      <template v-slot:body>
        <div>
          <div class="div-bookmark-dialog">
            <span>{{ getText('MRI_PA_BOOKMARK_RENAME_DIALOG_TEXT') }}</span>
            <div class="input-container">
              <input class="form-control" v-focus required maxlength="40" v-model="renamedBookmark" />
            </div>

            <div class="invalid-feedback" v-bind:style="[hasExceededLength && 'display: block;']">
              Filter name must not exceed 40 characters
            </div>
          </div>
        </div>
      </template>
      <template v-slot:footer>
        <div class="flex-spacer"></div>
        <appButton
          :click="confirmRenameBookmark"
          :text="getText('MRI_PA_BUTTON_SAVE')"
          :disabled="this.hasExceededLength"
        ></appButton>
        <appButton :click="closeRenameBookmark" :text="getText('MRI_PA_BUTTON_CANCEL')"></appButton>
      </template>
    </messageBox>
    <messageBox
      messageType="warning"
      dim="true"
      dialogWidth="400px"
      v-if="showDeleteDialog"
      @close="closeDeleteBookmark"
    >
      <template v-slot:header>{{ getText('MRI_PA_BOOKMARK_DELETE_DIALOG_TITLE') }}</template>
      <template v-slot:body>
        <div>
          <div class="div-bookmark-dialog">
            <div>{{ getText('MRI_PA_BOOKMARK_DELETE_DIALOG_TEXT') }}</div>
            <div>{{ getText('MRI_PA_BOOKMARK_DELETE_DIALOG_QUESTION_TEXT') }}</div>
          </div>
        </div>
      </template>
      <template v-slot:footer>
        <div class="flex-spacer"></div>
        <appButton :click="confirmDeleteBookmark" :text="getText('MRI_PA_BUTTON_DELETE')" v-focus></appButton>
        <appButton :click="closeDeleteBookmark" :text="getText('MRI_PA_BUTTON_CANCEL')"></appButton>
      </template>
    </messageBox>

    <messageBox
      messageType="warning"
      dim="true"
      dialogWidth="400px"
      v-if="showSaveOrDiscardDialog"
      @close="closeSaveOrDiscardDialog"
    >
      <template v-slot:header>{{ getText('MRI_PA_BOOKMARK_UNSAVED_DIALOG_TITLE') }}</template>
      <template v-slot:body>
        <div>
          <div class="div-bookmark-dialog">
            <div>{{ getText('MRI_PA_BOOKMARK_UNSAVED_DIALOG_TEXT') }}</div>
            <div>{{ getText('MRI_PA_BOOKMARK_UNSAVED_DIALOG_QUESTION_TEXT') }}</div>
          </div>
        </div>
      </template>
      <template v-slot:footer>
        <div class="flex-spacer"></div>
        <appButton :click="discardCohortChanges" :text="getText('MRI_PA_BUTTON_DISCARD')" v-focus></appButton>
        <appButton :click="saveCohortChanges" :text="getText('MRI_PA_BUTTON_SAVE')"></appButton>
      </template>
    </messageBox>

    <ImportAtlasCohortDefinitionDialog
      v-if="showImportAtlasCohortDefinition"
      @closeEv="closeImportAtlasCohortDefinition"
      @createdEv="loadBookmarks"
    />

    <div class="bookmark-content">
      <div class="bookmark-content__header">
        <div class="bookmark-content__header-title">Create Cohort:</div>
        <div class="bookmark-content__header-button-group">
          <Button :text="getText('MRI_PA_CREATE_D2E_COHORT_TEXT')" :onClick="openAddNewCohort"> </Button>
          <Button
            v-if="enableAtlasCohortDefinition"
            :text="getText('MRI_PA_CREATE_ATLAS_COHORT_TEXT')"
            :onClick="openAtlasLink"
          >
          </Button>
          <Button
            :text="getText('MRI_PA_IMPORT_ATLAS_COHORT_DEFINITION_TEXT')"
            :onClick="openImportAtlasCohortDefinition"
          >
          </Button>
          <Button
            :text="getText('MRI_PA_COMPARE_D2E_COHORT_TEXT')"
            :onClick="openCompareDialog"
            :disabled="!showCohortCompareBtn"
          >
          </Button>
          <div class="shared-toggle-container">
            {{ getText('MRI_PA_BOOKMARK_SHOW_SHARED_COHORTS_TEXT') }}
            <SlideToggle v-model="showSharedBookmarks" />
          </div>
        </div>
      </div>

      <div class="bookmark-content__break" />

      <div v-if="isBookmarksLoading" class="bookmark-content__spinner">
        <d4l-spinner />
      </div>
      <div v-else>
        <div v-if="!bookmarksDisplay || bookmarksDisplay.length === 0" class="bookmark-noContent">
          {{ getText('MRI_PA_NO_BOOKMARKS_TEXT') }}
        </div>
        <div v-else class="bookmark-content__list">
          <BookmarkItems
            :bookmarksDisplay="bookmarksDisplay"
            :compareCohortsSelectionList="aSelBookmarkList"
            :useQueryFilterForAtlas="true"
            @onSelectBookmark="onSelectBookmark"
            @renameBookmark="renameBookmark"
            @deleteBookmark="deleteBookmark"
            @addCohort="addCohort"
            @openDataQualityDialog="openDataQualityDialog"
            @loadBookmarkCheck="loadBookmarkCheck"
            @loadAtlasBookmark="loadAtlasBookmark"
          />
        </div>
      </div>
    </div>

    <cohortComparisonDialog
      v-bind:bookmarkList="aSelBookmarkList"
      :openCompareDialog="showCohortCompareDialog"
      @closeEv="showCohortCompareDialog = false"
    >
    </cohortComparisonDialog>

    <cohortListDialog
      :openListDialog="showCohortListDialog"
      :bookmarkId="this.selectedBookmark?.id"
      :bookmarkName="this.selectedBookmark?.name"
      @closeEv="showCohortListDialog = false"
    >
    </cohortListDialog>

    <addCohort
      :openAddDialog="showAddCohortDialog"
      :bookmarkId="this.selectedBookmark?.id"
      :bookmarkName="this.selectedBookmark?.name"
      @closeEv="showAddCohortDialog = false"
      :cohortDefinitionType="cohortDefinitionType"
      :atlasCohortDefinitionId="atlasCohortDefinitionId"
    >
    </addCohort>

    <messageBox
      dim="true"
      messageType="error"
      dialogWidth="400px"
      v-if="showIncompatibleMessage"
      @close="closeIncompatibleMessage"
    >
      <template v-slot:header>{{ getText('MRI_PA_NOTIFICATION_ERROR') }}</template>
      <template v-slot:body>
        <div>
          <div class="div-reset-text">{{ getText('MRI_PA_BMK_COMPATIBLE_ERROR') }}</div>
        </div>
      </template>
      <template v-slot:footer>
        <div class="flex-spacer"></div>
        <appButton :click="closeIncompatibleMessage" :text="getText('MRI_PA_CLOSE_BUTTON')"></appButton>
      </template>
    </messageBox>
  </div>
</template>

<script lang="ts">
declare var sap: any
import { mapActions, mapGetters, mapMutations } from 'vuex'
import appButton from '../lib/ui/app-button.vue'
import appCheckbox from '../lib/ui/app-checkbox.vue'
import cohortComparisonDialog from './CohortComparisonDialog.vue'
import messageBox from './MessageBox.vue'
import addCohort from './AddCohort.vue'
import cohortListDialog from './CohortListDialog.vue'
import { getPortalAPI } from '../utils/PortalUtils'
import * as types from '../store/mutation-types'
import appMessageStrip from '../lib/ui/app-message-strip.vue'
import BookmarkItems from './BookmarkItems.vue'
import SlideToggle from './SlideToggle.vue'
import { getBookmarkType } from '../utils/BookmarkUtils'
import Button from './Button.vue'
import ImportAtlasCohortDefinitionDialog from './ImportAtlasCohortDefinitionDialog.vue'

export default {
  compatConfig: {
    MODE: 3,
  },
  name: 'bookmark',
  props: ['unloadBookmarkEv', 'initBookmarkId'],
  data() {
    return {
      maxLength: 40,
      selectedBookmark: {},
      renamedBookmark: '',
      schemaName: '',
      viewName: '',
      showRenameDialog: false,
      showDeleteDialog: false,
      showSharedBookmarks: false,
      showCopyExtensionDialog: false,
      aSelBookmarkList: [],
      initBookmarkId: this.initBookmarkId,
      showCohortCompareDialog: false,
      showCohortListDialog: false,
      showAddCohortDialog: false,
      showIncompatibleMessage: false,
      cohortName: 'New cohort',
      isInvalidName: false,
      showSaveOrDiscardDialog: false,
      isAddNewCohort: false,
      selectedBmkId: '',
      selectedChartType: '',
      messageStrip: {
        show: false,
        message: '',
        messageType: '',
      },
      cohortDefinitionType: '',
      atlasCohortDefinitionId: null,
      showImportAtlasCohortDefinition: false,
    }
  },
  watch: {
    initBookmarkId() {
      if (this.initBookmarkId !== '') {
        this.loadBookmark(this.initBookmarkId, null)
      }
    },
  },
  computed: {
    ...mapGetters([
      'getMriFrontendConfig',
      'getBookmarks',
      'getText',
      'getActiveBookmark',
      'getCurrentBookmarkHasChanges',
      'getDisplayBookmarks',
      'getSelectedDataset',
      'getBookmarksLoading',
    ]),
    enableAtlasCohortDefinition() {
      return !!this.getMriFrontendConfig?._internalConfig?.panelOptions?.atlasCohortDefinition
    },
    bookmarksDisplay() {
      return this.getDisplayBookmarks(this.showSharedBookmarks, getPortalAPI().username)
    },
    hasChanges() {
      return this.getActiveBookmark?.isNew || this.getCurrentBookmarkHasChanges
    },
    showCohortCompareBtn() {
      return this.aSelBookmarkList.length > 1
    },
    hasExceededLength() {
      return this.renamedBookmark.length == this.maxLength
    },
    isBookmarksLoading() {
      return this.bookmarksDisplay.length === 0 && this.getBookmarksLoading
    },
  },
  methods: {
    ...mapActions([
      'fireBookmarkQuery',
      'loadbookmarkToState',
      'resetChartProperties',
      'fireRenameMaterializedCohortQuery',
      'fireDeleteMaterializedCohortQuery',
      'fireDeleteAtlasCohortDefinitionQuery',
      'fetchDataQualityFlowRun',
      'generateDataQualityFlowRun',
    ]),
    ...mapMutations([types.SET_ACTIVE_BOOKMARK, types.CONFIG_SET_HAS_ASSIGNED]),
    openCompareDialog() {
      this.showCohortCompareDialog = true
    },
    onSelectBookmark(bookmarkDisplay) {
      const isSelected = !!this.aSelBookmarkList.find(item => item.id === bookmarkDisplay.bookmark.id)
      if (isSelected) {
        this.aSelBookmarkList.splice(this.aSelBookmarkList.indexOf(bookmarkDisplay.bookmark), 1)
      } else {
        this.aSelBookmarkList.push(bookmarkDisplay.bookmark)
      }
    },
    loadBookmarkCheck(bmkId, chartType) {
      if (this.getActiveBookmark && bmkId === this.getActiveBookmark.bmkId) {
        this.$emit('unloadBookmarkEv')
      } else {
        this.selectedBmkId = bmkId
        this.selectedChartType = chartType
        if (this.hasChanges) {
          this.openSaveOrDiscardDialog()
        } else {
          this.loadBookmark()
        }
      }
    },
    loadBookmark() {
      this.loadbookmarkToState({ bmkId: this.selectedBmkId, chartType: this.selectedChartType })
        .then(() => {
          this.$emit('unloadBookmarkEv')
          this.selectedBmkId = ''
          this.selectedChartType = ''
        })
        .catch(() => {
          this.showIncompatibleMessage = true
        })
    },
    async loadAtlasBookmark(atlasDefinitionId) {
      try {
        // Get Atlas JSON using our new store action
        const atlasJson = await this.$store.dispatch('fireGetAtlasCohortDefinitionQuery', atlasDefinitionId)

        // Create a fake bookmark object for the tab display
        const atlasBookmark = {
          bookmarkname: atlasJson.name || `Atlas Cohort ${atlasDefinitionId}`,
          bmkId: `${atlasDefinitionId}`,
          isAtlas: true,
          isNew: false, // Currently always false as we have to import one first
        }

        // Set as active bookmark to create the tab
        this[types.SET_ACTIVE_BOOKMARK](atlasBookmark)

        // Emit event to parent to load Atlas JSON into the correct QueryFilter (in Filters.vue)
        this.$emit('loadAtlasCohortDefinition', atlasJson)

        // Switch to Patient Analytics view after loading
        this.$emit('unloadBookmarkEv')
      } catch (error) {
        console.error('Failed to load Atlas bookmark:', error)
        this.messageStrip = {
          show: true,
          message: 'Failed to load Atlas cohort definition',
          messageType: 'error',
        }
      }
    },
    closeRenameBookmark() {
      this.showRenameDialog = false
    },
    renameBookmark(bookmarkDisplay) {
      if (bookmarkDisplay) {
        this.selectedBookmark = bookmarkDisplay
        this.renamedBookmark = bookmarkDisplay.displayName
        this.showRenameDialog = true
      }
    },
    confirmRenameBookmark() {
      const bookmarkDisplay = this.selectedBookmark

      if (this.isMScohort(bookmarkDisplay)) {
        this.fireRenameMaterializedCohortQuery({
          cohortDefinitionId: bookmarkDisplay.cohortDefinition.id,
          newName: this.renamedBookmark,
        }).then(() => {
          this.fireBookmarkQuery({ method: 'get', params: { cmd: 'loadAll' } })
          this.closeRenameBookmark()
          return
        })
      }
      const request = {
        cmd: 'rename',
        newName: this.renamedBookmark,
      }

      this.fireBookmarkQuery({
        method: 'put',
        params: request,
        bookmarkId: bookmarkDisplay.bookmark.id,
      }).then(() => {
        this.fireBookmarkQuery({ method: 'get', params: { cmd: 'loadAll' } })
        this.closeRenameBookmark()
      })
    },
    addCohort(bookmarkDisplay) {
      if (bookmarkDisplay?.bookmark) {
        this.selectedBookmark = bookmarkDisplay.bookmark
        this.cohortDefinitionType = 'D2E'
      } else if (bookmarkDisplay.atlasCohortDefinition) {
        this.cohortDefinitionType = 'Atlas'
        this.atlasCohortDefinitionId = bookmarkDisplay.atlasCohortDefinition.id
        this.selectedBookmark = bookmarkDisplay.atlasCohortDefinition
      }
      this.showAddCohortDialog = true
    },
    closeDeleteBookmark() {
      this.showDeleteDialog = false
    },
    deleteBookmark(bookmarkDisplay) {
      if (bookmarkDisplay) {
        this.selectedBookmark = bookmarkDisplay
        this.showDeleteDialog = true
      }
    },
    async confirmDeleteBookmark() {
      const activeBookmark = this.getActiveBookmark
      const bookmarkDisplay = this.selectedBookmark
      const isMaterializedCohort = getBookmarkType(bookmarkDisplay) === 'M'
      const isD2ECohortDefinition = ['D', 'D+M'].includes(getBookmarkType(bookmarkDisplay))
      const isAtlasCohortDefinition = ['A', 'A+M'].includes(getBookmarkType(bookmarkDisplay))

      try {
        if (isMaterializedCohort) {
          await this.fireDeleteMaterializedCohortQuery(bookmarkDisplay.cohortDefinition.id)
        } else if (isAtlasCohortDefinition) {
          await this.fireDeleteAtlasCohortDefinitionQuery(bookmarkDisplay.atlasCohortDefinition.id)
        } else if (isD2ECohortDefinition) {
          const params = {
            cmd: 'delete',
          }

          await this.fireBookmarkQuery({
            params,
            method: 'delete',
            bookmarkId: bookmarkDisplay.bookmark.id,
          })
        }

        await this.fireBookmarkQuery({ method: 'get', params: { cmd: 'loadAll' } })
        this.closeDeleteBookmark()
        if (!isMaterializedCohort && activeBookmark && activeBookmark.bookmarkname === bookmarkDisplay.bookmark.name) {
          this[types.SET_ACTIVE_BOOKMARK](null)
          this.reset()
        }
      } catch (error) {
        console.error('Error deleting bookmark:', error)
      }
    },
    onChangeShared({ target }: { target: HTMLInputElement }) {
      console.log(target.checked)
    },
    closeIncompatibleMessage() {
      this.showIncompatibleMessage = false
    },
    openSaveOrDiscardDialog(isAddNewCohort = false) {
      this.showSaveOrDiscardDialog = true
      if (isAddNewCohort) this.isAddNewCohort = true
    },
    closeSaveOrDiscardDialog() {
      this.showSaveOrDiscardDialog = false
      this.isAddNewCohort = false
    },
    discardCohortChanges() {
      this.showSaveOrDiscardDialog = false
      if (this.isAddNewCohort) {
        this.addNewCohort()
      } else {
        this.loadBookmark()
      }
    },
    saveCohortChanges() {
      this.showSaveOrDiscardDialog = false
      this.$emit('unloadBookmarkEv')
    },
    openAddNewCohort() {
      if (this.hasChanges) {
        this.openSaveOrDiscardDialog(true)
      } else {
        this.addNewCohort()
      }
    },
    closeAddNewCohort() {
      this.cohortName = ''
      this.isInvalidName = false
    },
    addNewCohort() {
      this.cohortName = this.checkCohortName(this.cohortName)
      this[types.SET_ACTIVE_BOOKMARK]({ bookmarkname: this.cohortName, isNew: true })
      this.closeAddNewCohort()
      this.$emit('unloadBookmarkEv')
      this.reset()
    },
    checkCohortName(bookmarkName, suffix = '') {
      const username = getPortalAPI().username
      let uniqueName = bookmarkName + (suffix ? ` ${suffix}` : '')
      for (const bookmark of this.getBookmarks) {
        if (username === bookmark.user_id && bookmark.bookmarkname === uniqueName) {
          return this.checkCohortName(bookmarkName, suffix ? parseInt(suffix) + 1 : 1)
        }
      }
      return uniqueName
    },
    reset() {
      this[types.CONFIG_SET_HAS_ASSIGNED](false)
      this.$nextTick(() => {
        this.resetChartProperties()
        this[types.CONFIG_SET_HAS_ASSIGNED](true)
      })
    },
    isMScohort(bookmarkDisplay) {
      // MS cohort only contains a cohort definition
      return bookmarkDisplay.cohortDefinition && !bookmarkDisplay.bookmark
    },
    resetMessageStrip() {
      this.messageStrip = {
        show: false,
        message: '',
        messageType: '',
      }
    },
    openDataQualityResultsDialog(flowRun) {
      const job = {
        flowRunId: flowRun.id,
        schemaName: flowRun.parameters.options.schemaName,
        dataCharacterizationSchema: '',
        cohortDefinitionId: flowRun.parameters.options.cohortDefinitionId,
        type: flowRun.tags[0],
        createdAt: flowRun.created,
        completedAt: flowRun.end_time,
        status: flowRun?.state_name,
        error: '',
        datasetId: flowRun.parameters.options.datasetId,
        comment: flowRun.parameters.options.comment,
        databaseCode: flowRun.parameters.options.databaseCode,
      }
      const event = new CustomEvent('alp-results-dialog-open', {
        detail: {
          props: {
            job: job,
          },
        },
      })
      window.dispatchEvent(event)
    },
    async openDataQualityDialog(cohortDefinition) {
      if (cohortDefinition?.id) {
        const flowRun = await this.fetchDataQualityFlowRun({ cohortDefinitionId: cohortDefinition.id })
        if (flowRun && flowRun?.state_name === 'Completed') {
          this.openDataQualityResultsDialog(flowRun)
        } else if (flowRun?.state_name === 'Pending' || flowRun?.state_name === 'RUNNING') {
          this.messageStrip = {
            show: true,
            message: `Data Quality Check is already running`,
            messageType: 'information',
          }
        } else {
          const GenerateDataQualityFlowRunParams = {
            datasetId: this.getSelectedDataset.id,
            comment: '',
            cohortDefinitionId: String(cohortDefinition.id),
            releaseId: '',
            vocabSchemaName: '',
          }
          await this.generateDataQualityFlowRun(GenerateDataQualityFlowRunParams)
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
        }
      }
    },
    openAtlasLink() {
      getPortalAPI()?.toggleAtlas(true, '/#/cohortdefinitions')
    },
    openImportAtlasCohortDefinition() {
      this.showImportAtlasCohortDefinition = true
    },
    closeImportAtlasCohortDefinition() {
      this.showImportAtlasCohortDefinition = false
    },
    loadBookmarks() {
      this.fireBookmarkQuery({ method: 'get', params: { cmd: 'loadAll' } })
    },
  },
  components: {
    messageBox,
    appButton,
    appCheckbox,
    cohortComparisonDialog,
    addCohort,
    cohortListDialog,
    appMessageStrip,
    BookmarkItems,
    SlideToggle,
    Button,
    ImportAtlasCohortDefinitionDialog,
  },
}
</script>
