<template>
  <messageBox dim="true" dialogWidth="500px" messageType="custom" @close="cancel" :busy="loading">
    <template v-slot:header>{{ getText('MRI_PA_BOOKMARK_IMPORT_ATLAS_COHORT_DEFINITION_TITLE') }}</template>
    <template v-slot:body>
      <div class="input-container">
        <input v-model="name" :placeholder="getText('MRI_PA_COLL_ENTER_NAME')" />
        <input v-model="description" :placeholder="getText('MRI_PA_COLL_ENTER_DESCRIPTION')" />
        <textarea
          class="import-json-textarea"
          :class="['import-json-textarea', error && 'import-json-textarea__error']"
          v-model="input"
          rows="20"
          :placeholder="getText('MRI_PA_IMPORT_ATLAS_COHORT_DEFINITION_JSON_TEXT')"
        />
        <div v-if="error" class="import-json-error"><strong>Error:</strong> {{ error }}</div>
      </div>
    </template>
    <template v-slot:footer>
      <div class="flex-spacer"></div>
      <appButton
        :click="onClickCreateCohortDefinition"
        :text="getText('MRI_PA_BUTTON_SAVE')"
        :disabled="isButtonDisabled"
        v-focus
      ></appButton>
      <appButton :click="cancel" :text="getText('MRI_PA_BUTTON_CANCEL')"></appButton>
    </template>
  </messageBox>
</template>

<script lang="ts">
import appButton from '../lib/ui/app-button.vue'
import messageBox from './MessageBox.vue'
import { mapActions, mapGetters } from 'vuex'
import { getPortalAPI } from '../utils/PortalUtils'
import { validateAtlasJson } from '../utils/AtlasJSONValidator'

export default {
  compatConfig: {
    MODE: 3,
  },
  name: 'importAtlasCohortDefinitionDialog',
  props: ['closeEv', 'createdEv'],
  data() {
    return {
      input: '',
      error: '',
      name: '',
      description: '',
      loading: false,
    }
  },
  computed: {
    ...mapGetters(['getText']),
    isButtonDisabled() {
      return this.error || this.input === '' || this.loading
    },
  },
  watch: {
    input: {
      handler(newVal: string) {
        if (newVal === '') {
          this.error = ''
          return
        }
        const result = validateAtlasJson(newVal)
        this.error = result.error
      },
    },
  },
  methods: {
    ...mapActions(['fireCreateAtlasCohortDefinitionQuery']),
    cancel() {
      this.$emit('closeEv')
    },
    clearInputs() {
      this.input = ''
      this.error = ''
      this.name = ''
      this.description = ''
    },
    async onClickCreateCohortDefinition() {
      try {
        const now = +new Date()
        const content = {
          id: 0,
          name: this.name || 'Imported Atlas Cohort Definition',
          tags: [],
          createdBy: getPortalAPI().username,
          expression: this.input,
          modifiedBy: getPortalAPI().username,
          createdDate: now,
          description: this.description || '',
          modifiedDate: now,
          expressionType: 'SIMPLE_EXPRESSION',
        }
        this.loading = true
        await this.fireCreateAtlasCohortDefinitionQuery({
          content,
        })
        this.clearInputs()
        this.$emit(['closeEv', 'createdEv'])
      } catch (e) {
        this.error = 'Invalid JSON format'
        return
      } finally {
        this.loading = false
      }
    },
  },
  components: {
    messageBox,
    appButton,
  },
}
</script>

<style scoped>
.input-container {
  display: flex;
  flex-direction: column;
  gap: 1em;
}
</style>

