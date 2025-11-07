<template>
  <messageBox messageType="custom" dim="true" @close="closeCopyExtensionDialog">
    <template v-slot:header>{{ getText('MRI_PA_EXTENSION_EXPORT_DIALOG_TITLE') }}</template>
    <template v-slot:body>
      <div>
        <div class="div-bookmark-dialog">
          <p v-if="tabList.length > 1">{{ getText('MRI_PA_EXTENSION_EXPORT_DIALOG_TEXT') }}</p>
          <div class="bookmark-ext-cont">
            <appTab :tabItems="tabList" :value="selectedView" @onSelectedChange="onSelectView"></appTab>
            <div v-if="selectedView === 'FHIR_API'">
              <div class="input-container">
                {{ getText('MRI_PA_EXTENSION_EXPORT_DIALOG_FORMAT_FHIR_URL') }}
                <div>
                  <input class="mri-bookmark-id" :value="copyUrl" ref="extensionUrl" />
                  <appButton
                    :click="copyExtensionId"
                    :text="getText('MRI_PA_EXTENSION_EXPORT_COPY')"
                    v-focus
                    class="bookmark-ext-button"
                  ></appButton>
                </div>
              </div>
            </div>
            <div v-if="selectedView === 'DB_VIEW' && showCalcView">
              <appMessageStrip :messageType="messageType" :text="displayMessage" v-if="showMessageStrip" />
              <appButton
                v-if="!isDBViewCreated"
                :click="generateDatabaseView"
                class="bookmark-ext-button"
                :text="getText('MRI_PA_EXTENSION_EXPORT_DIALOG_DB_VIEW_GENERATE_BUTTON')"
                :title="getText('MRI_PA_EXTENSION_EXPORT_DIALOG_DB_VIEW_GENERATE_BUTTON_TOOTLIP')"
                v-focus
              ></appButton>
              <div v-if="isDBViewCreated">
                <div class="input-container">
                  <appButton
                    v-if="!isDBViewCreated"
                    :click="generateDatabaseView"
                    class="bookmark-ext-button"
                    :text="getText('MRI_PA_EXTENSION_EXPORT_DIALOG_DB_VIEW_GENERATE_BUTTON')"
                    :title="getText('MRI_PA_EXTENSION_EXPORT_DIALOG_DB_VIEW_GENERATE_BUTTON_TOOTLIP')"
                    v-focus
                  ></appButton>
                  <table>
                    <tr>
                      <td>{{ getText('MRI_PA_EXTENSION_EXPORT_SCHEMA_NAME') }}</td>
                      <td class="bookmark">{{ displayedSchemaName }}</td>
                    </tr>
                    <tr>
                      <td>{{ getText('MRI_PA_EXTENSION_EXPORT_VIEW_NAME') }}</td>
                      <td>{{ displayedViewName }}</td>
                      <td>
                        <button
                          @click="deleteDBView"
                          class="appButton bookmark-ext-button"
                          :title="getText('MRI_PA_EXTENSION_EXPORT_DIALOG_DB_VIEW_DELETE_TOOLTIP')"
                        >
                          <span class="buttonIcon" v-bind:style="getTextStyle"></span>
                        </button>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <table class="extension-pcount-table">
            <thead>
              <th colspan="2">{{ getText('MRI_PA_DOWNLOAD_PDF_TEXT_PATIENT_COUNT') }}</th>
            </thead>
            <tr>
              <td>{{ getText('MRI_PA_EXTENSION_EXPORT_DIALOG_PATIENT_COUNT') }}</td>
              <td>{{ totalPatientCountMatchingFilters }}</td>
            </tr>
            <tr>
              <td style="width: 70%">{{ getText('MRI_PA_EXTENSION_EXPORT_DIALOG_GUARDED_PATIENT_COUNT') }}</td>
              <td>{{ totalGuardedPatientCountMatchingFilters }}</td>
            </tr>
          </table>
          <p>{{ getText('MRI_PA_EXTENSION_EXPORT_HINT') }}</p>
          <p class="moreInfoText">
            <app-link
              :href="moreInfoUrl"
              :text="getText('MRI_PA_EXTENSION_EXPORT_HELP')"
              target="_blank"
              :title="getText('MRI_PA_EXTENSION_EXPORT_HELP')"
            ></app-link>
          </p>
        </div>
      </div>
    </template>
    <template v-slot:footer>
      <div class="flex-spacer"></div>
      <appButton :click="closeCopyExtensionDialog" :text="getText('MRI_PA_CLOSE')"></appButton>
    </template>
  </messageBox>
</template>
<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import axios from 'axios'
import appButton from '../lib/ui/app-button.vue'
import appLink from '../lib/ui/app-link.vue'
import appTab from '../lib/ui/app-tab.vue'
import appMessageStrip from '../lib/ui/app-message-strip.vue'
import messageBox from './MessageBox.vue'

const CancelToken = axios.CancelToken
let cancel

export default {
  name: 'bookmark-extension-dialog',
  props: ['selectedBookmark', 'schemaName', 'viewName'],
  data() {
    return {
      totalPatientCountMatchingFilters: 0,
      totalGuardedPatientCountMatchingFilters: 0,
      tabList: [],
      selectedView: 'FHIR_API',
      messageType: '',
      showMessageStrip: false,
      isDBViewCreated: false,
      isDeleteSuccess: false,
      copyUrl: '',
      moreInfoUrl:
        'https://help.sap.com/viewer/40f0b71017734398949a57f0ba0ee839/3.0.0/en-US/e5aca59c3efd48998c53b141e0939542.html',
      displayedSchemaName: this.schemaName,
      displayedViewName: this.viewName,
    }
  },
  mounted() {
    const parsed = JSON.parse(this.selectedBookmark.data)

    this.copyUrl = window.location.origin + '/analytics-svc/api/services/data/' + this.selectedBookmark.id + '/Patient'

    this.getPatientCount({
      params: { ...parsed, guarded: parsed.chartType === 'list' },
    }).then(response => {
      this.totalPatientCountMatchingFilters = response.data.data[0]['patient.attributes.pcount']
    })

    this.getPatientCount({
      params: { ...parsed, guarded: true },
    }).then(response => {
      this.totalGuardedPatientCountMatchingFilters = response.data.data[0]['patient.attributes.pcount']
    })

    this.tabList = [
      {
        text: this.getText('MRI_PA_EXTENSION_EXPORT_DIALOG_FORMAT_FHIR_TITLE'),
        value: 'FHIR_API',
      },
    ]

    if (this.showCalcView) {
      this.tabList.push({
        text: this.getText('MRI_PA_EXTENSION_EXPORT_DIALOG_FORMAT_DB_VIEW_TITLE'),
        value: 'DB_VIEW',
        disabled: this.selectedBookmark.chartType !== 'list',
      })
    }

    this.selectedView = 'FHIR_API'
    if (this.selectedBookmark.viewName && this.displayedSchemaName) {
      this.isDBViewCreated = true
    }
  },
  computed: {
    ...mapGetters(['getText', 'getMriFrontendConfig']),
    showCalcView() {
      return this.getMriFrontendConfig._internalConfig.panelOptions.calcViewAccessPoint
    },
  },
  methods: {
    ...mapActions(['getPatientCount', 'ajaxAuth']),
    copyExtensionId() {
      this.$refs.extensionUrl.select()
      document.execCommand('copy')
    },
    closeCopyExtensionDialog() {
      this.$emit('close')
    },
    generateDatabaseView() {
      // call endpoint
      let isCreationSuccessful = false
      const cancelToken = new CancelToken(c => {
        cancel = c
      })

      const callback = res => {
        if (res.status === 200) {
          this.displayedSchemaName = res.data.schemaName
          this.displayedViewName = res.data.viewName
          this.messageType = 'success'
          this.displayMessage = this.getText('MRI_PA_EXTENSION_EXPORT_DIALOG_DB_VIEW_GENERATE_SUCCESS')
          this.showMessageStrip = true
          this.isDBViewCreated = true
          this.$emit('refreshBookmarkEv')
        } else {
          this.messageType = 'error'
          this.displayMessage = this.getText('MRI_PA_EXTENSION_EXPORT_DIALOG_DB_VIEW_GENERATE_FAIL')
          this.showMessageStrip = true
        }
      }
      const that = this
      this.ajaxAuth({
        method: 'post',
        url: '/analytics-svc/api/services/calcview',
        params: { bookmarkId: this.selectedBookmark.id },
        cancelToken,
      })
        .then(callback)
        .catch(err => {
          isCreationSuccessful = false
        })
    },
    deleteDBView() {
      const isDeletionSuccessful = false
      const cancelToken = new CancelToken(c => {
        cancel = c
      })
      const callback = res => {
        if (res.status === 200) {
          this.messageType = 'success'
          this.isDBViewCreated = false
          this.displayMessage = this.getText('MRI_PA_EXTENSION_EXPORT_DIALOG_DB_VIEW_DELETE_SUCCESS')
          this.showMessageStrip = true
          this.$emit('refreshBookmarkEv')
        } else {
          this.messageType = 'error'
          this.displayMessage = this.getText('MRI_PA_EXTENSION_EXPORT_DIALOG_DB_VIEW_DELETE_FAIL')
          this.showMessageStrip = true
        }
      }
      this.ajaxAuth({
        method: 'delete',
        url: '/analytics-svc/api/services/calcview/' + this.displayedViewName,
        cancelToken,
      })
        .then(callback)
        .catch(err => {
          this.messageType = 'error'
          this.displayMessage = this.getText('MRI_PA_EXTENSION_EXPORT_DIALOG_DB_VIEW_DELETE_FAIL')
          this.showMessageStrip = true
        })
    },
    onSelectView(val) {
      if (val) {
        this.selectedView = val
        this.showMessageStrip = false
      }
    },
  },
  components: {
    messageBox,
    appButton,
    appLink,
    appTab,
    appMessageStrip,
  },
}
</script>
