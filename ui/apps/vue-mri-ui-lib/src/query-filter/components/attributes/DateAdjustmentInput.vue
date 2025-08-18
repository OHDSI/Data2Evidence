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
  (e: 'update', value: { StartWith: string; StartOffset: number; EndWith: string; EndOffset: number }): void
}>()

const startWithModel = ref<string>('START_DATE')
const endWithModel = ref<string>('END_DATE')
const startOffsetModel = ref<number>(0)
const endOffsetModel = ref<number>(0)

const startEndDateOptions = [
  { label: 'start date', value: 'START_DATE' },
  { label: 'end date', value: 'END_DATE' },
]

watch(
  [startWithModel, endWithModel, startOffsetModel, endOffsetModel],
  ([startWith, endWith, startOffset, endOffset]) => {
    const payload: { StartWith: string; StartOffset: number; EndWith: string; EndOffset: number } = {
      StartWith: startWith,
      StartOffset: startOffset,
      EndWith: endWith,
      EndOffset: endOffset,
    }

    emit('update', payload)
  },
  { immediate: true }
)
</script>

<template>
  <div class="date-adjustment-input-container">
    <div>starting with</div>
    <div class="select-container">
      <SelectMaterial v-model="startWithModel" :options="startEndDateOptions" label="Select an option" />
    </div>
    <div>+</div>
    <div class="input-container">
      <input type="number" name="startOffset" class="number-input" v-model="startOffsetModel" />
    </div>
    <div>days and ending with</div>
    <div class="select-container">
      <SelectMaterial v-model="endWithModel" :options="startEndDateOptions" label="Select an option" />
    </div>
    <div>+</div>
    <div class="input-container">
      <input type="number" name="endOffset" class="number-input" v-model="endOffsetModel" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.date-adjustment-input-container {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 100%;
  max-height: 40px;

  .select-container {
    display: flex;
    align-items: center;
    height: 100%;
    .select-wrapper {
      width: 120px;
    }
  }

  .input-container {
    display: flex;
    height: 100%;
    align-items: center;
    .number-input {
      width: 65px;
      height: 100%;
      line-height: 40px;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 0 8px;
    }
  }
}
</style>

