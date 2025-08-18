<script lang="ts">
export default {
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import SelectMaterial from '../SelectMaterial.vue'
import { ref, watch } from 'vue'

const emit = defineEmits<{
  (e: 'update', value: { Op: string; Text: string }): void
}>()

const stringOptionsModel = ref<string>('startsWith')
const textModel = ref<string>('')

const stringOptions = [
  { label: 'Starting With', value: 'startsWith' },
  { label: 'Containing', value: 'contains' },
  { label: 'Ending With', value: 'endsWith' },
  { label: 'Not Starting With', value: '!startsWith' },
  { label: 'Not Containing', value: '!contains' },
  { label: 'Not Ending With', value: '!endsWith' },
]

watch(
  [stringOptionsModel, textModel],
  ([option, text]) => {
    const payload: { Op: string; Text: string } = {
      Op: option,
      Text: text || '',
    }
    emit('update', payload)
  },
  { immediate: true }
)
</script>

<template>
  <div class="string-input-container">
    <div class="select-container">
      <SelectMaterial v-model="stringOptionsModel" :options="stringOptions" label="Select an option" />
    </div>
    <div class="input-container">
      <input name="textInput" class="text-input" v-model="textModel" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.string-input-container {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
  width: 100%;
  max-height: 40px;

  .select-container {
    display: flex;
    height: 100%;
    align-items: center;
    .select-wrapper {
      width: 200px;
    }
  }
  .input-container {
    display: flex;
    height: 100%;
    width: 100%;
    align-items: center;
    .text-input {
      height: 100%;
      width: 100%;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 0 8px;
    }
  }
}
</style>

