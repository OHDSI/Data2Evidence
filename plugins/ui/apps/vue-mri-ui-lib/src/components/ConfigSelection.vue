<template>
  <messageBox dim="true" :busy="busy" @close="cancelClick" messageType="custom">
    <template v-slot:header>{{ getText('MRI_PA_CONFIG_SELECTION_DIALOG_TITLE') }}</template>
    <template v-slot:body>
      <div>
        <ul v-if="doneSetup" class="config-selection-list">
          <select v-if="getUserStudies.length > 1" v-model="selectedStudy">
            <option v-bind:value="study.id" v-for="study in getUserStudies" :key="study.id">
              {{ study.name }}
            </option>
          </select>
          <template v-for="item in getConfigs" :key="item.meta.assignmentId">
            <li
              @click="selectItem(item)"
              v-bind:class="{ 'config-selection-item-selected': item.meta.configId === selectedPAConfig.meta.configId }"
              tabindex="0"
              v-focus
            >
              <div class="config-selection-item-select">
                <input
                  type="radio"
                  name="config-selection-radio"
                  :checked="item.meta.configId === selectedPAConfig.meta.configId ? 'checked' : ''"
                />
              </div>
              <div class="config-selection-item-wrapper">
                <div class="config-selection-item-content">
                  <div class="config-selection-item-title">
                    <span>{{ item.meta.assignmentName }}</span>
                  </div>
                  <div class="config-selection-item-description">
                    <span>{{ item.meta.configName }}</span>
                  </div>
                  <div v-if="item.meta.default" class="config-selection-item-subdescription">
                    <span>{{ getText('MRI_PAT_CONTENT_SAVED_AS_DEFAULT') }}</span>
                  </div>
                </div>
              </div>
            </li>
          </template>
        </ul>
      </div>
    </template>
    <template v-slot:footer>
      <appButton :click="clearDefaultClick" :text="getText('MRI_PAT_CONTENT_BUTTON_CLEAR')"></appButton>
      <div class="flex-spacer"></div>
      <appButton :click="okClick" :text="getText('MRI_PAT_CONTENT_BUTTON_OK')"></appButton>
      <appButton :click="okDefaultClick" :text="getText('MRI_PAT_CONTENT_BUTTON_OK_AND_SAVE')"></appButton>
      <appButton :click="cancelClick" :text="getText('MRI_PA_BUTTON_CANCEL')"></appButton>
    </template>
  </messageBox>
</template>

<script lang="ts">
declare var sap
import { mapActions, mapGetters, mapMutations } from 'vuex'
import appButton from '../lib/ui/app-button.vue'
import * as types from '../store/mutation-types'
import messageBox from './MessageBox.vue'

const eventbus = sap.ui.getCore().getEventBus()

export default {
  name: 'configSelection',
  data() {
    return {
      busy: false,
      selectedPAConfig: {
        meta: {
          configId: '',
        },
      },
      selectedStudy: '',
    }
  },
  mounted() {
    this.initList()
  },
  computed: {
    ...mapGetters([
      'getText',
      'getConfigs',
      'getSelectedPAConfigId',
      'getHasAssignedConfig',
      'getUserStudies',
      'getSelectedDataset',
    ]),
    doneSetup() {
      return this.selectedPAConfig.meta
    },
  },
  methods: {
    ...mapActions([
      'toggleConfigSelectionDialog',
      'requestFrontendConfig',
      'clearDefault',
      'setDefault',
      'requestConfigList',
    ]),
    ...mapMutations([types.CONFIG_SET, types.SET_SELECTED_STUDY]),
    initList() {
      this.busy = true
      return this.requestConfigList(this.getSelectedDataset.id).then(() => {
        if (this.getConfigs.length) {
          if (this.getSelectedPAConfigId) {
            this.selectedPAConfig = this.getConfigs.find(config => config.meta.configId === this.getSelectedPAConfigId)
          } else {
            this.selectedPAConfig = this.getConfigs[0]
          }
        }
        this.busy = false
      })
    },
    clearDefaultClick() {
      this.busy = true
      this.clearDefault().then(() => this.initList())
    },
    okClick() {
      this.requestFrontendConfig(this.selectedPAConfig.meta).then(() => {
        this.toggleConfigSelectionDialog()
      })
      this.setSelectedStudyOrDefault()
      this.busy = true
    },
    okDefaultClick() {
      this.requestFrontendConfig(this.selectedPAConfig.meta)
        .then(() => this.setDefault(this.selectedPAConfig.meta))
        .then(() => this.toggleConfigSelectionDialog())
      this.setSelectedStudyOrDefault()
      this.busy = true
    },
    cancelClick() {
      if (!this.getHasAssignedConfig) {
        eventbus.publish('VUE_NAVIGATE_FLP')
      }
      this.toggleConfigSelectionDialog()
    },
    selectItem(item) {
      this.selectedPAConfig = item
    },
    mockList() {
      return [
        {
          meta: {
            assignmentId: '1',
            assignmentName: 'assignment1',
            configName: 'config1',
          },
        },
        {
          meta: {
            assignmentId: '2',
            assignmentName: 'assignment2',
            configName: 'config2',
          },
        },
      ]
    },
    setSelectedStudyOrDefault() {
      let studyId = this.getUserStudies.length ? this.getUserStudies[0] : ''

      if (this.selectedStudy) {
        studyId = this.selectedStudy
      }

      this[types.SET_SELECTED_STUDY](studyId)
    },
  },
  components: {
    messageBox,
    appButton,
  },
}
</script>
