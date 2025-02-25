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

    <div class="bookmark-content">
      <div class="m-3">
        <d4l-button
          :text="getText('MRI_PA_COHORT_ADD_TEXT')"
          :title="getText('MRI_PA_COHORT_ADD_TEXT')"
          classes="button--block button-radius"
          @click="openAddNewCohort"
        />
      </div>
      <div class="bookmark-content__break" />

      <div v-if="!bookmarksDisplay || bookmarksDisplay.length === 0" class="bookmark-noContent">
        {{ getText('MRI_PA_NO_BOOKMARKS_TEXT') }}
      </div>

      <div class="bookmark-list">
        <div class="bookmark-list-header">
          <appCheckbox
            v-model="showSharedBookmarks"
            :text="getText('MRI_PA_BOOKMARK_SHOW_SHARED_COHORTS_TEXT')"
            :title="getText('MRI_PA_BOOKMARK_SHOW_SHARED_COHORTS_TITLE')"
            :labelClass="'bookmark_list'"
          ></appCheckbox>
        </div>
        <div class="bookmark-list-content">
          <template v-for="bookmarkDisplay in bookmarksDisplay" :key="bookmarkDisplay.displayName">
            <div class="bookmark-item-container" ref="bookmarkItemContainer">
              <table class="bookmark-item-table">
                <tr>
                  <td>
                    <div class="bookmark-item-header">
                      <appCheckbox
                        :disabled="this.isMScohort(bookmarkDisplay)"
                        v-model="bookmarkDisplay.selected"
                        @checkEv="onSelectBookmark(bookmarkDisplay)"
                        :text="`${bookmarkDisplay.displayName} ${bookmarkDisplay?.bookmark?.shared ? '(Shared)' : ''}`"
                        :labelClass="'bookmark'"
                      ></appCheckbox>

                      <div class="bookmark-item-header__status-icons">
                        <CohortDefinitionActiveIcon v-if="bookmarkDisplay.bookmark" />
                        <CohortDefinitionGreyIcon v-else />
                        <PatientsActiveIcon v-if="bookmarkDisplay.cohortDefinition" />
                        <PatientsGreyIcon v-else />
                      </div>
                    </div>
                  </td>
                </tr>
                <template v-if="bookmarkDisplay.bookmark">
                  <tr>
                    <td>
                      <div class="bookmark-item-content">
                        <table>
                          <tr class="bookmark-item-info">
                            <td class="bookmark-filtercard">
                              <div style="display: block">
                                <span class="bookmark-headelement bookmark-element">By:</span>
                                {{ bookmarkDisplay.bookmark.username }}
                              </div>
                              <div style="display: block margin-right: 16px">
                                <span class="bookmark-headelement bookmark-element">Version:</span>
                                {{ bookmarkDisplay.bookmark.version }}
                              </div>
                              <div style="display: block">
                                <span class="bookmark-headelement bookmark-element">Date:</span>
                                {{ bookmarkDisplay.bookmark.dateModified }}
                              </div>
                              <div style="display: block margin-right: 16px">
                                <span class="bookmark-headelement bookmark-element">Time:</span>
                                {{ bookmarkDisplay.bookmark.timeModified }}
                              </div>
                            </td>
                          </tr>
                        </table>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div
                        class="bookmark-item-content"
                        v-on:click="loadBookmarkCheck(bookmarkDisplay.bookmark.id, bookmarkDisplay.bookmark.chartType)"
                      >
                        <table class="bookmark-item-cards">
                          <thead>
                            <th style="width: 25px"></th>
                            <th></th>
                          </thead>
                          <template
                            v-for="container in getCardsFormatted(bookmarkDisplay.bookmark.filterCardData)"
                            :key="container.content"
                          >
                            <tr>
                              <td class="bookmark-item-cards-items" colspan="2">
                                <div>
                                  <template v-for="filterCard in container.content" :key="filterCard.name">
                                    <div class="bookmark-filtercard">
                                      <span class="bookmark-headelement bookmark-element">{{ filterCard.name }}</span>
                                      <template v-for="attribute in filterCard.visibleAttributes" :key="attribute.name">
                                        <span class="bookmark-element">{{ attribute.name }}</span>
                                        <span
                                          class="bookmark-element bookmark-constraint"
                                          :key="constraint"
                                          v-for="constraint in attribute.visibleConstraints"
                                          >{{ getConstraint(constraint) }}</span
                                        >
                                        <span class="bookmark-element">;</span>
                                      </template>
                                    </div>
                                  </template>
                                </div>
                              </td>
                            </tr>
                          </template>
                          <tr>
                            <td colspan="2">
                              <div class="bookmark-row-separator"></div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <span
                                class="icon"
                                v-bind:style="
                                  'font-family:' + getChartInfo(bookmarkDisplay.bookmark.chartType, 'iconGroup')
                                "
                                >{{ getChartInfo(bookmarkDisplay.bookmark.chartType, 'icon') }}</span
                              >
                            </td>
                            <td>
                              <div>{{ getText(getChartInfo(bookmarkDisplay.bookmark.chartType, 'tooltip')) }}</div>
                            </td>
                          </tr>
                          <tr>
                            <td style="vertical-align: top">
                              <span class="icon" style="font-family: app-icons"></span>
                            </td>
                            <td>
                              <div class="bookmark-item-axes">
                                <template
                                  v-for="axis in getAxisFormatted(
                                    bookmarkDisplay.bookmark.axisInfo,
                                    bookmarkDisplay.bookmark.chartType
                                  )"
                                  :key="axis.name"
                                >
                                  <div>
                                    <label style="display: flex; align-items: top">
                                      <span
                                        v-if="bookmarkDisplay.bookmark.chartType !== 'list'"
                                        class="icon"
                                        :style="`font-family: ${axis.iconGroup}; margin-top: 0`"
                                        >{{ axis.icon }}</span
                                      >
                                      <span>{{ axis.name }}</span>
                                    </label>
                                  </div>
                                </template>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <icon icon="puzzle"></icon>
                            </td>
                            <td>
                              <div class="bookmark-extension-container">
                                <div>{{ getText('MRI_PA_EXTENSION_EXPORT_HEADER') }}</div>
                                <div></div>
                              </div>
                            </td>
                          </tr>
                        </table>
                      </div>
                    </td>
                  </tr>
                </template>
                <template v-else>
                  <div class="bookmark-item-no-content">{{ getText('MRI_PA_BOOKMARK_NO_COHORT_DEFINITION') }}</div>
                </template>

                <template v-if="bookmarkDisplay.cohortDefinition">
                  <tr>
                    <td>
                      <div class="bookmark-item-content">
                        <table>
                          <tr class="bookmark-item-info">
                            <td class="bookmark-filtercard">
                              <div style="display: block">
                                <span class="bookmark-headelement bookmark-element">Cohort ID:</span>
                                {{ bookmarkDisplay.cohortDefinition.id }}
                              </div>
                              <div style="display: block margin-right: 16px">
                                <span class="bookmark-headelement bookmark-element">Cohort Name:</span>
                                {{ bookmarkDisplay.cohortDefinition.cohortDefinitionName }}
                              </div>
                              <div style="display: block">
                                <span class="bookmark-headelement bookmark-element">Patient Count:</span>
                                {{ bookmarkDisplay.cohortDefinition.patientCount }}
                              </div>
                              <div style="display: block margin-right: 16px">
                                <span class="bookmark-headelement bookmark-element">Created On:</span>
                                {{ bookmarkDisplay.cohortDefinition.createdOn }}
                              </div>
                            </td>
                          </tr>
                        </table>
                      </div>
                    </td>
                  </tr>
                </template>
              </table>

              <div class="bookmark-item-footer">
                <div class="bookmark-item-footer__break" />
                <table class="bookmark-item-buttons">
                  <tr>
                    <td v-if="!bookmarkDisplay.bookmark?.disableUpdate">
                      <button
                        v-on:click.stop="renameBookmark(bookmarkDisplay)"
                        :title="getText('MRI_PA_TOOLTIP_RENAME_BOOKMARK')"
                        class="bookmark-button"
                      >
                        <EditIcon />
                      </button>
                    </td>
                    <td>
                      <button
                        v-on:click.stop="addCohort(bookmarkDisplay.bookmark)"
                        :title="getText('MRI_PA_BUTTON_ADD_TO_COLLECTION')"
                        class="bookmark-button"
                        :disabled="!bookmarkDisplay.bookmark"
                      >
                        <GenerateCohortActiveIcon v-if="bookmarkDisplay.bookmark" />
                        <GenerateCohortGreyIcon v-else />
                      </button>
                    </td>
                    <td>
                      <button
                        :title="getText('MRI_PA_BUTTON_DISPLAY_OR_GENERATE_DATA_QUALITY')"
                        class="bookmark-button"
                        v-on:click.stop="this.openDataQualityDialog(bookmarkDisplay.cohortDefinition)"
                        :disabled="!bookmarkDisplay.cohortDefinition"
                      >
                        <RunAnalyticsGreyIcon v-if="!bookmarkDisplay.cohortDefinition" />
                        <RunAnalyticsActiveIcon v-else />
                      </button>
                    </td>

                    <td v-if="!bookmarkDisplay.bookmark?.disableUpdate">
                      <button
                        v-on:click.stop="deleteBookmark(bookmarkDisplay)"
                        :title="getText('MRI_PA_TOOLTIP_DELETE_BOOKMARK')"
                        class="bookmark-button"
                      >
                        <TrashCanIcon />
                      </button>
                    </td>
                  </tr>
                </table>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
    <!-- Bookmark Footer -->
    <div class="bookmark-footer">
      <!-- Footer Button  -->
      <d4l-button
        :text="getText('MRI_COMP_COHORT_BUTTON')"
        :title="getText('MRI_COMP_COHORT_TOOLTIP_BTN')"
        classes="button--block button-radius"
        @click="openCompareDialog"
        :disabled="!showCohortCompareBtn"
      />
    </div>

    <cohortComparisonDialog
      v-bind:bookmarkList="aSelBookmarkList"
      :openCompareDialog="showCohortCompareDialog"
      @closeEv="showCohortCompareDialog = false"
    >
    </cohortComparisonDialog>

    <cohortListDialog
      :openListDialog="showCohortListDialog"
      :bookmarkId="this.selectedBookmark.id"
      :bookmarkName="this.selectedBookmark.name"
      @closeEv="showCohortListDialog = false"
    >
    </cohortListDialog>

    <addCohort
      :openAddDialog="showAddCohortDialog"
      :bookmarkId="this.selectedBookmark.id"
      :bookmarkName="this.selectedBookmark.name"
      @closeEv="showAddCohortDialog = false"
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
declare var sap
import { mapActions, mapGetters, mapMutations } from 'vuex'
import appButton from '../lib/ui/app-button.vue'
import appCheckbox from '../lib/ui/app-checkbox.vue'
import icon from '../lib/ui/app-icon.vue'
import appLabel from '../lib/ui/app-label.vue'
import appLink from '../lib/ui/app-link.vue'
import Constants from '../utils/Constants'
import cohortComparisonDialog from './CohortComparisonDialog.vue'
import messageBox from './MessageBox.vue'
import addCohort from './AddCohort.vue'
import cohortListDialog from './CohortListDialog.vue'
import { getPortalAPI } from '../utils/PortalUtils'
import * as types from '../store/mutation-types'
import CohortIcon from './icons/CohortIcon.vue'
import EditIcon from './icons/EditIcon.vue'
import TrashCanIcon from './icons/TrashCanIcon.vue'
import AddPatientsIcon from './icons/AddPatientsIcon.vue'
import GenerateCohortActiveIcon from './icons/GenerateCohortActiveIcon.vue'
import GenerateCohortGreyIcon from './icons/GenerateCohortGreyIcon.vue'
import RunAnalyticsActiveIcon from './icons/RunAnalyticsActiveIcon.vue'
import RunAnalyticsGreyIcon from './icons/RunAnalyticsGreyIcon.vue'
import PatientsActiveIcon from './icons/PatientsActiveIcon.vue'
import PatientsGreyIcon from './icons/PatientsGreyIcon.vue'
import CohortDefinitionActiveIcon from './icons/CohortDefinitionActiveIcon.vue'
import CohortDefinitionGreyIcon from './icons/CohortDefinitionGreyIcon.vue'
import appMessageStrip from '../lib/ui/app-message-strip.vue'

export default {
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
      enableAddToCohort: false,
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
    }
  },
  created() {
    this.enableAddToCohort = this.getMriFrontendConfig._internalConfig.panelOptions.addToCohorts
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
      'getSchemaName',
      'getText',
      'getAxis',
      'getDomainValues',
      'getActiveBookmark',
      'getCurrentBookmarkHasChanges',
      'getAddNewCohort',
      'getDisplayBookmarks',
      'getSelectedDataset',
    ]),
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
  },
  methods: {
    ...mapActions([
      'fireBookmarkQuery',
      'setToastMessage',
      'loadbookmarkToState',
      'toggleAddCohortDialog',
      'toggleCohortListDialog',
      'resetChartProperties',
      'setAddNewCohort',
      'fireRenameCohortDefinitionQuery',
      'fireDeleteCohortDefinitionQuery',
      'fetchDataQualityFlowRun',
      'generateDataQualityFlowRun',
    ]),
    ...mapMutations([types.SET_ACTIVE_BOOKMARK, types.CONFIG_SET_HAS_ASSIGNED]),
    openCompareDialog() {
      this.showCohortCompareDialog = true
    },
    openCohortListDialog(bookmark) {
      if (bookmark) {
        this.selectedBookmark = bookmark
        this.showCohortListDialog = true
      }
    },
    getConstraint(constraint) {
      try {
        constraint = typeof JSON.parse(constraint) === 'object' ? JSON.parse(constraint).text : constraint
      } catch (e) {
        // cannot parse the constraint
      }
      return constraint
    },
    onSelectBookmark(bookmarkDisplay) {
      if (bookmarkDisplay.selected) {
        this.aSelBookmarkList.push(bookmarkDisplay.bookmark)
      } else {
        this.aSelBookmarkList.splice(this.aSelBookmarkList.indexOf(bookmarkDisplay.bookmark), 1)
      }
    },
    unloadBookmark() {
      this.$emit('unloadBookmarkEv')
    },
    getChartInfo(chart, type) {
      if (Constants.chartInfo[chart]) {
        return Constants.chartInfo[chart][type]
      }
      return ''
    },
    getCardsFormatted(boolContainers) {
      const returnObj = []
      for (let i = 0; i < boolContainers.length; i += 1) {
        try {
          if (boolContainers[i].content.length > 0) {
            const content = []
            for (let ii = 0; ii < boolContainers[i].content.length; ii += 1) {
              const visibleAttributes = []
              let attributes = boolContainers[i].content[ii].attributes
              let filterCardName =
                !boolContainers[i].content[ii].name && boolContainers[i].content[ii].instanceID === 'patient'
                  ? this.getText('MRI_PA_FILTERCARD_TITLE_BASIC_DATA')
                  : boolContainers[i].content[ii].name
              if (boolContainers[i].content[ii].op && boolContainers[i].content[ii].op === 'NOT') {
                // Excluded filtercard
                attributes = boolContainers[i].content[ii].content[0].attributes
                filterCardName = `${boolContainers[i].content[ii].content[0].name} (${this.getText(
                  'MRI_PA_LABEL_EXCLUDED'
                )})`
              }
              for (let iii = 0; iii < attributes.content.length; iii += 1) {
                if (
                  attributes.content[iii].constraints.content &&
                  attributes.content[iii].constraints.content.length > 0
                ) {
                  const name = this.getAttributeName(attributes.content[iii].configPath, 'list')
                  const isConceptSet = this.getAttributeType(attributes.content[iii].configPath) === 'conceptSet'
                  const visibleConstraints = []
                  const constraints = attributes.content[iii].constraints
                  for (let iv = 0; iv < constraints.content.length; iv += 1) {
                    if (constraints.content[iv].content) {
                      for (let v = 0; v < constraints.content[iv].content.length; v += 1) {
                        visibleConstraints.push(
                          `${constraints.content[iv].content[v].operator}${constraints.content[iv].content[v].value}`
                        )
                      }
                    } else if (constraints.content[iv].operator === '=') {
                      if (isConceptSet) {
                        const conceptSets = this.getDomainValues('conceptSets')
                        const conceptSetName = conceptSets?.values?.find(
                          set => set.value === constraints.content[iv].value
                        )?.text
                        visibleConstraints.push(conceptSetName || constraints.content[iv].value)
                      } else {
                        visibleConstraints.push(constraints.content[iv].value)
                      }
                    } else {
                      visibleConstraints.push(`${constraints.content[iv].operator}${constraints.content[iv].value}`)
                    }
                  }
                  const attributeObj = {
                    name,
                    visibleConstraints,
                  }
                  visibleAttributes.push(attributeObj)
                }
              }
              const filterCardObj = {
                visibleAttributes,
                name: `${filterCardName}`,
              }
              content.push(filterCardObj)
            }
            const boolContainerObj = {
              content,
            }
            returnObj.push(boolContainerObj)
          }
        } finally {
          // Handle Incorrect Bookmark Formatting
        }
      }
      return returnObj
    },
    getAxisFormatted(axis, type) {
      const returnObj = []
      if (type === 'list') {
        const tempObject = {}
        let count = 0
        Object.keys(axis).forEach(key => {
          tempObject[axis[key]] = key
          count += 1
        })
        for (let i = 0; i < count; i += 1) {
          returnObj.push({
            name: this.getAttributeName(tempObject[i], type),
          })
        }
      } else {
        for (let i = 0; i < axis.length; i += 1) {
          if (axis[i].attributeId !== 'n/a') {
            const axisModel = this.getAxis(i)
            returnObj.push({
              name: `= ${this.getAttributeName(axis[i].attributeId, type)}`,
              icon: axisModel.props.icon,
              iconGroup: axisModel.props.iconFamily,
            })
          }
        }
      }
      return returnObj
    },
    getAttributeName(attributeId, type) {
      /* Note: This is the current Implementation of Bookmark Rendering. */
      if (attributeId) {
        const attributePath = attributeId.split('.')
        if (attributePath.length > 3 && type !== 'list') {
          const attributePathEnd1 = attributePath.pop()
          const attributePathEnd2 = attributePath.pop()
          attributePath.pop()
          attributePath.push(attributePathEnd2)
          attributePath.push(attributePathEnd1)
        }
        const attributeConfigPath = attributePath.join('.')
        const mriFrontEndConfig = this.getMriFrontendConfig
        const attribute = mriFrontEndConfig.getAttributeByPath(attributeConfigPath)
        if (attribute && attribute.oInternalConfigAttribute && attribute.oInternalConfigAttribute.name) {
          return attribute.oInternalConfigAttribute.name
        }
      }
      return attributeId
    },
    getAttributeType(attributeId: string) {
      return this.getMriFrontendConfig.getAttributeByPath(attributeId)?.oInternalConfigAttribute?.type
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
    exportExtension(bookmark) {
      if (bookmark) {
        this.selectedBookmark = bookmark
        this.renamedBookmark = bookmark.name
        this.schemaName = this.getSchemaName
        this.viewName = bookmark.viewName
        this.showCopyExtensionDialog = true
      }
    },
    closeCopyExtensionDialog() {
      this.showCopyExtensionDialog = false
    },
    confirmRenameBookmark() {
      const bookmarkDisplay = this.selectedBookmark

      if (this.isMScohort(bookmarkDisplay)) {
        this.fireRenameCohortDefinitionQuery({
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
    addCohort(bookmark) {
      if (bookmark) {
        this.selectedBookmark = bookmark
        this.showAddCohortDialog = true
      }
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
      const isCohort = this.isMScohort(bookmarkDisplay)

      try {
        if (isCohort) {
          await this.fireDeleteCohortDefinitionQuery(bookmarkDisplay.cohortDefinition.id)
        } else {
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
        if (!isCohort && activeBookmark && activeBookmark.bookmarkname === bookmarkDisplay.bookmark.name) {
          this[types.SET_ACTIVE_BOOKMARK](null)
          this.reset()
        }
      } catch (error) {
        console.error('Error deleting bookmark:', error)
      }
    },
    closeIncompatibleMessage() {
      this.showIncompatibleMessage = false
    },
    async refreshBookmarks() {
      await this.fireBookmarkQuery({
        method: 'get',
        params: { cmd: 'loadAll' },
      })
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
      if (cohortDefinition.id) {
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
  },
  components: {
    messageBox,
    appButton,
    appCheckbox,
    appLabel,
    icon,
    appLink,
    cohortComparisonDialog,
    addCohort,
    cohortListDialog,
    CohortIcon,
    AddPatientsIcon,
    EditIcon,
    TrashCanIcon,
    GenerateCohortActiveIcon,
    GenerateCohortGreyIcon,
    RunAnalyticsActiveIcon,
    RunAnalyticsGreyIcon,
    PatientsActiveIcon,
    PatientsGreyIcon,
    CohortDefinitionActiveIcon,
    CohortDefinitionGreyIcon,
    appMessageStrip,
  },
}
</script>