<script lang="ts">
export default {
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import SelectMaterial from '../SelectMaterial.vue'
import { computed, ref, watch } from 'vue'

const emit = defineEmits<{
  (e: 'update', value: { Op: string; Value: number; Extent?: number }): void
}>()

const numRangeModel = ref<string>('lt')
const numValueModel = ref<number>(0)
const numExtentModel = ref<number>(0)

const numericRangeOptions = [
  { label: 'Less Than', value: 'lt' },
  { label: 'Less or Equal To', value: 'lte' },
  { label: 'Equal To', value: 'eq' },
  { label: 'Greater Than', value: 'gt' },
  { label: 'Greater or Equal To', value: 'gte' },
  { label: 'Between', value: 'btw' },
  { label: 'Not Between', value: '!btw' },
]

const isDualNumRange = computed(() => {
  return numRangeModel.value === 'btw' || numRangeModel.value === '!btw'
})

watch(
  [numRangeModel, numValueModel, numExtentModel, isDualNumRange],
  ([range, value, extent, dual]) => {
    const payload: { Op: string; Value: number; Extent?: number } = {
      Op: range,
      Value: value || 0,
    }
    if (dual && extent) {
      payload.Extent = extent
    } else {
      numExtentModel.value = 0
    }
    emit('update', payload)
  },
  { immediate: true }
)
</script>

<template>
  <div class="numeric-input-container">
    <div class="select-container">
      <SelectMaterial v-model="numRangeModel" :options="numericRangeOptions" label="Select an option" />
    </div>
    <div class="input-container">
      <input type="number" name="startOffset" class="number-input" v-model="numValueModel" />
    </div>

    <div v-if="isDualNumRange">and</div>
    <div v-if="isDualNumRange" class="input-container">
      <input type="number" name="startOffset" class="number-input" v-model="numExtentModel" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.numeric-input-container {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
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

