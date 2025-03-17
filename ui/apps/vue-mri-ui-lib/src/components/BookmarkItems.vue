<script lang="ts">
export default {
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { onMounted, defineProps, computed } from 'vue'
import { useStore } from 'vuex'
import CohortDefinitionIcon from './icons/CohortDefinitionIcon.vue'
import PatientsActiveIcon from './icons/PatientsActiveIcon.vue'
import EditIcon from './icons/EditIcon.vue'
import GenerateCohortActiveIcon from './icons/GenerateCohortActiveIcon.vue'
import ShareIcon from './icons/ShareIcon.vue'
import PlusInBoxIcon from './icons/PlusInBoxIcon.vue'
import RunAnalyticsActiveIcon from './icons/RunAnalyticsActiveIcon.vue'
import TrashCanIcon from './icons/TrashCanIcon.vue'
import GlobeIcon from './icons/GlobeIcon.vue'
import Constants from '../utils/Constants'
import { getCardsFormatted, getAxisFormatted } from './helpers/bookmarkItems'
import { onErrorCaptured } from 'vue'
import MriFrontendConfig from '../lib/MriFrontEndConfig'
import AxisModel from '../lib/models/AxisModel'
import { getBookmarkType } from '../utils/BookmarkUtils'
import { getPortalAPI } from '../utils/PortalUtils'

const store = useStore()

const {
  getText,
  getMriFrontendConfig: mriFrontEndConfig,
  getAxis,
  getDomainValues,
  getSelectedDataset,
}: {
  getText: (key: string, param?: string | string[]) => string
  getMriFrontendConfig: MriFrontendConfig
  getAxis: (id: number) => AxisModel
  getDomainValues: () => {
    isLoading: false
    isLoaded: false
    values: []
  }
  getSelectedDataset: { id: string }
} = store.getters

const props = defineProps<{
  bookmarksDisplay: BookmarkDisplay[]
  compareCohortsSelectionList: Bookmark[]
}>()

const bookmarksDisplaySorted = computed(() => {
  return [...props.bookmarksDisplay].sort((a, b) => {
    const dateToUseA = a.bookmark?.dateModified || a.atlasCohortDefinition?.updatedOn || a.cohortDefinition.createdOn
    const dateToUseB = b.bookmark?.dateModified || b.atlasCohortDefinition?.updatedOn || b.cohortDefinition.createdOn
    return new Date(dateToUseB).getTime() - new Date(dateToUseA).getTime()
  })
})

// Emits - Declare emitted events using defineEmits
const emit = defineEmits([
  'onSelectBookmark',
  'renameBookmark',
  'deleteBookmark',
  'addCohort',
  'openDataQualityDialog',
  'loadBookmarkCheck',
])

const onSelectBookmark = bookmarkDisplay => {
  emit('onSelectBookmark', bookmarkDisplay)
}

const renameBookmark = bookmarkDisplay => {
  emit('renameBookmark', bookmarkDisplay)
}

const deleteBookmark = bookmarkDisplay => {
  emit('deleteBookmark', bookmarkDisplay)
}

const addCohort = bookmarkDisplay => {
  emit('addCohort', bookmarkDisplay)
}

const openDataQualityDialog = cohortDefinition => {
  emit('openDataQualityDialog', cohortDefinition)
}

const loadBookmarkCheck = (bookmarkId, chartType) => {
  const selection = window.getSelection()
  // Allows highlighting without clicking
  if (selection.toString().length > 0) {
    return
  }
  emit('loadBookmarkCheck', bookmarkId, chartType)
}

const getChartInfo = (chart: string, type: string) => {
  if (Constants.chartInfo[chart]) {
    return Constants.chartInfo[chart][type]
  }
  return ''
}

const getConstraint = (constraint: any): string => {
  try {
    constraint = typeof JSON.parse(constraint) === 'object' ? JSON.parse(constraint).text : constraint
  } catch (e) {
    // cannot parse the constraint
  }
  return constraint
}

const getConcatenatedConstraints = visibleConstraints => {
  return visibleConstraints.map(constraint => getConstraint(constraint)).join('; ')
}

const openAtlasLink = (id: number) => {
  const selection = window.getSelection()
  // Allows highlighting without clicking
  if (selection.toString().length > 0) {
    return
  }
  getPortalAPI()?.toggleAtlas(true, `/#/cohortdefinition/${id}`)
}

// Lifecycle hooks
onMounted(() => {
  console.log('Component mounted!')
})

onErrorCaptured((err, instance, info) => {
  console.error('Captured error:', err, instance, info)
  // Stop propagation to prevent the error from reaching parent handlers
  return false // Or true to propagate the error further
})
</script>

<template>
  <div
    style="
      margin-left: 1rem;
      margin-right: 1rem;
      margin-top: 10px;
      margin-bottom: 10px;
      width: calc(100% - 30px);
      display: grid;
      grid-template-rows: 0fr;
      grid-auto-rows: 0fr;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      height: 100%;
      overflow-y: auto;
      scrollbar-width: thin;
      gap: 10px;
      padding: 10px;
    "
  >
    <div
      v-for="bookmarkDisplay in bookmarksDisplaySorted"
      :key="bookmarkDisplay.displayName"
      class="item-card"
      style="
        min-width: 300px;
        display: flex;
        flex-direction: column;
        border-radius: 10px;
        background-color: white;
        font-size: 12px;
      "
    >
      <div
        style="flex: 1"
        :class="`item-card-body ${getBookmarkType(bookmarkDisplay) === 'M' ? 'item-card-body-disabled' : ''}`"
        @click="
          ;['D', 'D+M'].includes(getBookmarkType(bookmarkDisplay))
            ? loadBookmarkCheck(bookmarkDisplay.bookmark.id, bookmarkDisplay.bookmark.chartType)
            : openAtlasLink(bookmarkDisplay.atlasCohortDefinition.id)
        "
      >
        <div style="display: flex; justify-content: space-between; padding: 20px 20px 0px 20px">
          <div style="color: #ff5e59">
            {{
              getBookmarkType(bookmarkDisplay) === 'M'
                ? bookmarkDisplay.cohortDefinition.cohortDefinitionName
                : bookmarkDisplay.displayName
            }}
          </div>
          <div v-if="bookmarkDisplay?.bookmark?.shared">
            <ShareIcon />
          </div>
        </div>
        <div style="display: flex; flex-direction: column; padding: 10px 10px 10px 10px; max-height: 500px">
          <!-- D2E Cohort Definition -->
          <div
            v-if="bookmarkDisplay.bookmark"
            style="
              flex: 1;
              overflow: auto;
              margin-bottom: 15px;
              scrollbar-width: thin;
              scrollbar-color: #ff5e5977 white;
              padding: 0px 10px 5px 10px;
            "
          >
            <div style="display: flex; align-items: center; margin-bottom: 10px">
              <div style="margin-right: 5px"><CohortDefinitionIcon /></div>
              <div class="ui-darkest-text" style="font-weight: bold">D2E Cohort Definition</div>
            </div>
            <div style="display: flex">
              <div class="ui-darkest-text" style="font-weight: bold; margin-right: 10px">ID:</div>
              <div>{{ bookmarkDisplay.bookmark.id }}</div>
            </div>
            <div style="display: flex">
              <div class="ui-darkest-text" style="font-weight: bold; margin-right: 10px">By:</div>
              <div>{{ bookmarkDisplay.bookmark.username }}</div>
            </div>
            <div style="display: flex">
              <div class="ui-darkest-text" style="font-weight: bold; margin-right: 10px">Version:</div>
              <div>{{ bookmarkDisplay.bookmark.version }}</div>
            </div>
            <div style="display: flex">
              <div class="ui-darkest-text" style="font-weight: bold; margin-right: 10px">Updated On:</div>
              <div>{{ bookmarkDisplay.bookmark.dateModifiedFormatted }}</div>
            </div>
            <div style="display: flex; margin-top: 15px">
              <div class="bookmark-item-content">
                <template
                  v-for="container in getCardsFormatted({
                        mriFrontEndConfig,
                        boolContainers: bookmarkDisplay.bookmark.filterCardData,
                        getText,
                        getAttributeType:
                          (attributeId:string) => mriFrontEndConfig.getAttributeByPath(attributeId)?.oInternalConfigAttribute?.type,
                        getDomainValues,
                      })"
                  :key="container.content"
                >
                  <div>
                    <template v-for="filterCard in container.content" :key="filterCard.name">
                      <div class="bookmark-filtercard">
                        <span class="ui-dark-text" style="font-weight: bold; margin-right: 5px">
                          {{ filterCard.name }}
                        </span>
                        <template v-for="(attribute, index) in filterCard.visibleAttributes" :key="attribute.name">
                          <span class="ui-light-text">{{ attribute.name }}: </span>
                          <span class="ui-light-text">
                            {{ getConcatenatedConstraints(attribute.visibleConstraints)
                            }}{{ index < filterCard.visibleAttributes.length - 1 ? ' | ' : '' }}</span
                          >
                        </template>
                      </div>
                    </template>
                  </div>
                </template>
                <div style="display: flex; margin-top: 15px">
                  <span
                    class="icon"
                    :style="'font-family:' + getChartInfo(bookmarkDisplay.bookmark.chartType, 'iconGroup')"
                    >{{ getChartInfo(bookmarkDisplay.bookmark.chartType, 'icon') }}</span
                  >
                  <div>{{ getText(getChartInfo(bookmarkDisplay.bookmark.chartType, 'tooltip')) }}</div>
                </div>
                <div style="display: flex">
                  <div>
                    <span class="icon" style="font-family: app-icons"></span>
                  </div>
                  <div class="bookmark-item-axes">
                    <template
                      v-for="axis in getAxisFormatted(
                        bookmarkDisplay.bookmark.axisInfo,
                        bookmarkDisplay.bookmark.chartType,
                        mriFrontEndConfig,
                        getAxis
                      )"
                      :key="axis.name"
                    >
                      <div>
                        <label style="display: flex; align-items: top">
                          <span
                            v-if="bookmarkDisplay.bookmark.chartType !== 'list'"
                            class="icon"
                            :style="`font-family: ${axis.iconGroup}; margin-top: 0px`"
                            >{{ axis.icon }}</span
                          >
                          <span>{{ axis.name }}</span>
                        </label>
                      </div>
                    </template>
                  </div>
                </div>
                <div style="display: flex">
                  <div>
                    <span class="icon"></span>
                  </div>
                  <div>{{ getText('MRI_PA_EXTENSION_EXPORT_HEADER') }}</div>
                </div>
              </div>
            </div>
          </div>
          <!-- Atlas Cohort Definition -->
          <div
            v-if="bookmarkDisplay.atlasCohortDefinition"
            style="
              flex: 1;
              overflow: auto;
              margin-bottom: 10px;
              scrollbar-width: thin;
              scrollbar-color: #ff5e5977 white;
              padding: 0px 10px 5px 10px;
            "
          >
            <div style="display: flex; align-items: center; margin-bottom: 10px">
              <div style="margin-right: 5px"><GlobeIcon /></div>
              <div class="ui-darkest-text" style="font-weight: bold">Atlas Cohort Definition</div>
            </div>
            <div style="display: flex">
              <div class="ui-darkest-text" style="font-weight: bold; margin-right: 10px">ID:</div>
              <div>{{ bookmarkDisplay.atlasCohortDefinition.id }}</div>
            </div>
            <div style="display: flex">
              <div class="ui-darkest-text" style="font-weight: bold; margin-right: 10px">By:</div>
              <div>{{ bookmarkDisplay.atlasCohortDefinition.username }}</div>
            </div>
            <div style="display: flex">
              <div class="ui-darkest-text" style="font-weight: bold; margin-right: 10px">Updated On:</div>
              <div>{{ bookmarkDisplay.atlasCohortDefinition.updatedOnFormatted }}</div>
            </div>
          </div>
          <!-- MATERIALIZED COHORTS -->
          <div
            v-if="bookmarkDisplay.cohortDefinition"
            style="
              min-height: 120px;
              overflow: auto;
              scrollbar-width: thin;
              scrollbar-color: #ff5e5977 white;
              padding: 0px 10px 0px 10px;
            "
          >
            <div style="display: flex; align-items: center; margin-bottom: 10px">
              <div style="margin-right: 5px"><PatientsActiveIcon /></div>
              <div class="ui-darkest-text" style="font-weight: bold">Materialized Cohort</div>
            </div>
            <div style="display: flex">
              <div class="ui-darkest-text" style="font-weight: bold; margin-right: 10px">Cohort ID:</div>
              <div class="ui-light-text">{{ bookmarkDisplay.cohortDefinition.id }}</div>
            </div>
            <div style="display: flex">
              <div class="ui-darkest-text" style="font-weight: bold; margin-right: 10px">Cohort Name:</div>
              <div class="ui-light-text">{{ bookmarkDisplay.cohortDefinition.cohortDefinitionName }}</div>
            </div>
            <div style="display: flex">
              <div class="ui-darkest-text" style="font-weight: bold; margin-right: 10px">Patient Count:</div>
              <div class="ui-light-text">{{ bookmarkDisplay.cohortDefinition.patientCount }}</div>
            </div>
            <div style="display: flex">
              <div class="ui-darkest-text" style="font-weight: bold; margin-right: 10px">Created On:</div>
              <div class="ui-light-text">{{ bookmarkDisplay.cohortDefinition.createdOnFormatted }}</div>
            </div>
          </div>
        </div>
      </div>
      <div
        class="footer"
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: solid 1px #acaba8;
          height: 50px;
          padding: 0px 20px 0px 20px;
        "
      >
        <div
          :class="`icon-button ${
            ['D', 'D+M'].includes(getBookmarkType(bookmarkDisplay)) ? '' : 'icon-button-disabled'
          }`"
          style="width: 32px; height: 32px; display: flex; justify-content: center; align-items: center"
          @click="onSelectBookmark(bookmarkDisplay)"
        >
          <PlusInBoxIcon
            :type="
              !!compareCohortsSelectionList.find(item => item.id === bookmarkDisplay.bookmark?.id) ? 'dark' : 'light'
            "
            :size="24"
          />
        </div>
        <div
          :class="`icon-button ${
            ['D', 'M', 'D+M'].includes(getBookmarkType(bookmarkDisplay)) ? '' : 'icon-button-disabled'
          }`"
          style="width: 32px; height: 32px; display: flex; justify-content: center; align-items: center"
          @click.stop="renameBookmark(bookmarkDisplay)"
          :title="getText('MRI_PA_TOOLTIP_RENAME_BOOKMARK')"
        >
          <EditIcon />
        </div>

        <div
          :class="`icon-button ${
            ['D', 'D+M', 'A', 'A+M'].includes(getBookmarkType(bookmarkDisplay)) ? '' : 'icon-button-disabled'
          }`"
          style="width: 32px; height: 32px; display: flex; justify-content: center; align-items: center"
          @click.stop="addCohort(bookmarkDisplay)"
          :title="getText('MRI_PA_BUTTON_ADD_TO_COLLECTION')"
        >
          <GenerateCohortActiveIcon />
        </div>

        <div
          :class="`icon-button ${
            ['M', 'A+M', 'D+M'].includes(getBookmarkType(bookmarkDisplay)) ? '' : 'icon-button-disabled'
          }`"
          style="width: 32px; height: 32px; display: flex; justify-content: center; align-items: center"
          :title="getText('MRI_PA_BUTTON_DISPLAY_OR_GENERATE_DATA_QUALITY')"
          @click.stop="openDataQualityDialog(bookmarkDisplay.cohortDefinition)"
        >
          <RunAnalyticsActiveIcon />
        </div>

        <div
          class="icon-button"
          style="width: 32px; height: 32px; display: flex; justify-content: center; align-items: center"
          @click.stop="deleteBookmark(bookmarkDisplay)"
          :title="getText('MRI_PA_TOOLTIP_DELETE_BOOKMARK')"
        >
          <TrashCanIcon />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.icon-button:hover {
  cursor: pointer;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}
.icon-button-disabled {
  pointer-events: none;
  cursor: none;
  opacity: 0.1;
}
.item-card {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}
.item-card:hover {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
}
.item-card-body:hover {
  cursor: pointer;
}
.item-card-body-disabled {
  pointer-events: none;
  cursor: none;
}
.item-card-body-disabled:hover {
  cursor: default;
}
.footer:hover {
  cursor: default;
}
</style>
