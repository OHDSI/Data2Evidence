<script lang="ts">
export default {
  name: 'ObervationPeriodBlock',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { ref, watch } from 'vue'
import DropdownMenu from './DropdownMenu.vue'

interface Props {
  modelValue?: string
}

const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue'])

// Watch for external changes to modelValue
// watch(
//   () => props.modelValue,
//   newValue => {
//     selectedOption.value = newValue
//   }
// )

// Emit changes when selection changes
// watch(selectedOption, newValue => {
//   emit('update:modelValue', newValue)
// })

const daysBefore = ref('0')
const daysAfter = ref('0')
const boxBefore = ref(null)
const boxAfter = ref(null)

const dayOptions = ['0', '1', '7', '14', '21', '30', '60', '90', '120', '180', '365', '548', '730', '1095']

const selectDay = (type, value) => {
  if (type === 'before') {
    daysBefore.value = value
  } else if (type === 'after') {
    daysAfter.value = value
  }
}
</script>

<template>
  <div class="obs-period">
    <div class="obs-period__container">
      <div class="obs-period__row obs-period__header">Continuous Observation Period</div>

      <div class="obs-period__row">
        observation period of at least
        <div class="box" ref="boxBefore">
          <span class="day-digit">{{ daysBefore }}</span>
        </div>
        <span>days before</span> <br />
      </div>

      <div class="obs-period__row">
        and
        <div class="box" ref="boxAfter">
          <span class="day-digit">{{ daysAfter }}</span>
        </div>
        days after event
      </div>
    </div>

    <DropdownMenu :options="dayOptions" @select="value => selectDay('before', value)" :target="boxBefore" />
    <DropdownMenu :options="dayOptions" @select="value => selectDay('after', value)" :target="boxAfter" />
  </div>
</template>

<style scoped lang="scss">
.obs-period {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000080;
  &__container {
    display: flex;
    flex-direction: column;
  }
  &__row {
    display: flex;
    align-items: center;
    margin-bottom: 2px;
    font-size: 12px;
  }
  &__header {
    font-size: 12px;
    font-weight: 500;
  }
  .box {
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 20px;
    height: 20px;
    border: 1px solid #000080;
    border-radius: 4px;
    margin: -4px 4px;
    text-align: center;
    line-height: 30px;
    font-size: 12px;
    font-weight: 500;
    color: #000080;
    cursor: pointer;
    .day-digit {
      padding: 0 2px;
    }
  }
}
</style>

