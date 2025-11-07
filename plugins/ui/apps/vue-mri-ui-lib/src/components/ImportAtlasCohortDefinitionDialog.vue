<script lang="ts">
export default {
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { ref, computed, watch, defineProps } from 'vue';
import { useStore } from 'vuex';
import appButton from '../lib/ui/app-button.vue';
import messageBox from './MessageBox.vue';
import { getPortalAPI } from '../utils/PortalUtils';
import { validateAtlasJson } from '../utils/AtlasJSONValidator';

defineProps({
  closeEv: {
    type: String,
    required: false,
  },
  createdEv: {
    type: String,
    required: false,
  },
});

const emit = defineEmits(['closeEv', 'createdEv']);

const store = useStore();

const input = ref('');
const error = ref('');
const name = ref('');
const description = ref('');
const loading = ref(false);

const getText = computed(() => store.getters.getText);
const isButtonDisabled = computed(() => {
  return Boolean(error.value || input.value === '' || loading.value);
});

watch(input, (newVal) => {
  if (newVal === '') {
    error.value = '';
    return;
  }
  const result = validateAtlasJson(newVal);
  error.value = result.error;
});

const cancel = () => {
  emit('closeEv');
};

const clearInputs = () => {
  input.value = '';
  error.value = '';
  name.value = '';
  description.value = '';
};

const onClickCreateCohortDefinition = async () => {
  try {
    const now = +new Date();
    const content = {
      id: 0,
      name: name.value || 'Imported Atlas Cohort Definition',
      tags: [],
      createdBy: getPortalAPI().username,
      expression: JSON.parse(input.value),
      modifiedBy: getPortalAPI().username,
      createdDate: now,
      description: description.value || '',
      modifiedDate: now,
      expressionType: 'SIMPLE_EXPRESSION',
    };
    loading.value = true;
    await store.dispatch('fireCreateAtlasCohortDefinitionQuery', { content });
    clearInputs();
    emit('closeEv');
    emit('createdEv');
  } catch (e) {
    error.value = 'Invalid JSON format';
    return;
  } finally {
    loading.value = false;
  }
};
</script>

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

<style scoped>
.input-container {
  display: flex;
  flex-direction: column;
  gap: 1em;
}
</style>