<template>
  <div class="bookmark-container">
    <messageBox messageType="warning" dim="true" dialogWidth="400px" v-if="showDeleteDialog">
      <template v-slot:header>Delete Shared Bookmark</template>
      <template v-slot:body>
        <div>
          <div class="div-bookmark-dialog">
            Do you want to delete {{ selectedBookmark.name }} and all its saved data?
          </div>
        </div>
      </template>
      <template v-slot:footer>
        <div class="flex-spacer"></div>
        <appButton :click="confirmDeleteSharedBookmark" :text="getText('MRI_PA_BUTTON_DELETE')"></appButton>
        <appButton :click="closeDeleteSharedBookmark" :text="getText('MRI_PA_BUTTON_CANCEL')"></appButton>
      </template>
    </messageBox>
    <div class="bookmark-title">
      <button class="actionButton" @click="unloadBookmark">
        <span class="icon" style="font-family: app-icons"></span>
      </button>
      <label class="separator"></label>
      <div class="spacer"></div>
      <label>Shared Bookmarks</label>
      <div class="spacer"></div>
    </div>
    <div class="bookmark-content">
      <div v-if="!bookmarksDisplay || bookmarksDisplay.length === 0" class="bookmark-noContent">
        {{ getText('MRI_PA_NO_BOOKMARKS_TEXT') }}
      </div>
      <ul class="bookmark-list">
        <template v-for="bookmark in bookmarksDisplay" :key="bookmark.name">
          <li class="bookmark-item" v-on:click="loadBookmark(bookmark)">
            <div class="bookmark-item-container">
              <table class="bookmark-item-table">
                <tr>
                  <td>
                    <div class="bookmark-item-header">
                      <span>{{ bookmark.name }}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="bookmark-item-content">
                      <table class="bookmark-item-cards">
                        <template
                          v-for="container in getCardsFormatted(bookmark.filterCardData)"
                          :key="container.content"
                        >
                          <tr>
                            <td>
                              <span class="icon" v-bind:style="'font-family:' + container.iconGroup">{{
                                container.icon
                              }}</span>
                            </td>
                            <td>
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
                                        >{{ constraint }}</span
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
                          <td>
                            <span
                              class="icon"
                              v-bind:style="'font-family:' + getChartInfo(bookmark.chartType, 'iconGroup')"
                              >{{ getChartInfo(bookmark.chartType, 'icon') }}</span
                            >
                          </td>
                          <td>
                            <div>{{ getText(getChartInfo(bookmark.chartType, 'tooltip')) }}</div>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <span class="icon" style="font-family: app-icons"></span>
                          </td>
                          <td>
                            <div class="bookmark-item-axes">
                              <template
                                v-for="axis in getAxisFormatted(bookmark.axisInfo, bookmark.chartType)"
                                :key="axis.name"
                              >
                                <div>
                                  <label>
                                    <span
                                      v-if="bookmark.chartType !== 'list'"
                                      class="icon"
                                      v-bind:style="'font-family:' + axis.iconGroup"
                                      >{{ axis.icon }}</span
                                    >
                                    {{ axis.name }}
                                  </label>
                                </div>
                              </template>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="bookmark-item-footer">
                      <table class="bookmark-item-buttons">
                        <tr>
                          <td>
                            <button
                              v-on:click.stop="openDeleteSharedBookmark(bookmark)"
                              title="title"
                              class="bookmark-button"
                            >
                              <span class="icon"></span>
                            </button>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>
            </div>
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import appButton from '../lib/ui/app-button.vue'
import appLabel from '../lib/ui/app-label.vue'
import AnnotateBM from '../utils/AnnotateBM'
import Constants from '../utils/Constants'
import messageBox from './MessageBox.vue'

export default {
  name: 'sharedBookmark',
  props: ['unloadBookmarkEv'],
  data() {
    return {
      bookmarkRequest: {},
      selectedBookmark: {},
      showDeleteDialog: false,
    }
  },
  computed: {
    ...mapGetters(['getMriFrontendConfig', 'getSharedBookmark', 'getText', 'getAxis']),
    bookmarksDisplay() {
      const sharedBookmarks = this.getSharedBookmark
      const returnValue = []
      sharedBookmarks.forEach(element => {
        const bookmarkItemObj = JSON.parse(element.bookmark)
        const bookmarkObj = AnnotateBM.deannotate(
          bookmarkItemObj,
          bookmarkItemObj.axisSelection,
          this.getMriFrontendConfig
        )
        if (bookmarkObj.filter && bookmarkObj.filter.cards) {
          const filterCards = bookmarkObj.filter.cards
          const boolContainers = filterCards.content
          returnValue.push({
            id: element.id,
            name: `${element.bookmarkName} by ${element.userName}`,
            data: JSON.stringify(bookmarkObj),
            filterCardData: boolContainers,
            chartType: bookmarkObj.chartType, // Allways Shared Chart
            axisInfo:
              bookmarkObj.chartType === 'list' ? bookmarkObj.filter.selected_attributes : bookmarkObj.axisSelection,
          })
        }
      })
      return returnValue
    },
  },
  methods: {
    ...mapActions(['setSharedBookmarkRequest', 'setBookmarkIdRequest', 'deleteSharedBookmark']),
    openDeleteSharedBookmark(bookmark) {
      if (bookmark) {
        this.selectedBookmark = bookmark
        this.showDeleteDialog = true
      }
    },
    closeDeleteSharedBookmark() {
      this.showDeleteDialog = false
    },
    confirmDeleteSharedBookmark() {
      const bookmarkId = this.selectedBookmark.id
      this.deleteSharedBookmark({ bookmarkId })
      this.closeDeleteSharedBookmark()
    },
    getSharedBookmarkById(id) {
      const sharedBookmarks = this.getSharedBookmark
      let returnValue = {}
      sharedBookmarks.forEach(element => {
        if (element.id === id) {
          returnValue = element
        }
      })
      return returnValue
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
              let filterCardName = boolContainers[i].content[ii].name
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
                      visibleConstraints.push(constraints.content[iv].value)
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
              icon: boolContainers[i].op === 'AND' ? '' : '',
              iconGroup: 'app-MRI-icons',
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
    loadBookmark(bookmark) {
      this.setBookmarkIdRequest({ bookmarkIdRequest: bookmark.id })
      const sharedBookmarkObject = JSON.parse(bookmark.data)
      this.setSharedBookmarkRequest({ sharedBookmarkObject })
    },
  },
  components: {
    messageBox,
    appButton,
    appLabel,
  },
}
</script>
