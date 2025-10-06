<script lang="ts">
export default {
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import SelectMaterial from '../SelectMaterial.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { numericRangeOptions } from '../../utils/AtlasUtils'

// Props now use internal format: operator (string like 'GREATER_THAN') and value (string)
const props = defineProps<{
  value?: string
  operator?: string
}>()

// Emit internal format: operator and value as strings
const emit = defineEmits<{
  (e: 'update', payload: { operator: string; value: string; extent?: string }): void
}>()

// Internal state uses Atlas format for the dropdown compatibility
const numRangeModel = ref<string>('lt')
const numValueModel = ref<string>('0')
const numExtentModel = ref<string>('0')

const isDualNumRange = computed(() => {
  return numRangeModel.value === 'btw' || numRangeModel.value === '!btw'
})

// Convert internal operator format to Atlas format for dropdown
const internalToAtlasOperator = (internal: string): string => {
  const map: Record<string, string> = {
    GREATER_THAN: 'gt',
    LESS_THAN: 'lt',
    GREATER_THAN_OR_EQUAL: 'gte',
    LESS_THAN_OR_EQUAL: 'lte',
    EQUAL: 'eq',
    BETWEEN: 'btw',
    NOT_BETWEEN: '!btw',
  }
  return map[internal] || 'lt'
}

// Convert Atlas operator format to internal format
const atlasToInternalOperator = (atlas: string): string => {
  const map: Record<string, string> = {
    gt: 'GREATER_THAN',
    lt: 'LESS_THAN',
    gte: 'GREATER_THAN_OR_EQUAL',
    lte: 'LESS_THAN_OR_EQUAL',
    eq: 'EQUAL',
    btw: 'BETWEEN',
    '!btw': 'NOT_BETWEEN',
  }
  return map[atlas] || 'LESS_THAN'
}

onMounted(() => {
  if (props.operator) {
    numRangeModel.value = internalToAtlasOperator(props.operator)
  }
  if (props.value) {
    numValueModel.value = props.value
  }
})

watch(
  () => [props.operator, props.value],
  ([newOperator, newValue]) => {
    if (newOperator) {
      numRangeModel.value = internalToAtlasOperator(newOperator)
    }
    if (newValue) {
      numValueModel.value = newValue
    }
  }
)

watch(
  [numRangeModel, numValueModel, numExtentModel, isDualNumRange],
  ([range, value, extent, dual]) => {
    const payload: { operator: string; value: string; extent?: string } = {
      operator: atlasToInternalOperator(range),
      value: value || '0',
    }
    if (dual) {
      payload.extent = extent || '0'
    } else {
      numExtentModel.value = '0'
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
      <input type="number" name="numExtent" class="number-input" v-model="numExtentModel" />
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
