<script lang="ts">
export default {
  name: 'CardinalityMenu',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import Popper from '@/components/Popper.vue'
import ButtonMaterial from './ButtonMaterial.vue'
import DropdownMenu from './DropdownMenu.vue'
import { ref } from 'vue'
import GroupButtons from './GroupButtons.vue'
import { QueryFilterCardinality } from '../models/QueryFilterModel'

interface Props {
  type: 'GROUP' | 'EVENT'
  target: HTMLElement
  namePrefix?: string
  cardinality?: QueryFilterCardinality
}

type OccurrenceType = 'EXACTLY' | 'AT_LEAST' | 'AT_MOST'
type OccurrenceCountColumn = 'ALL' | 'DISTINCT_CONCEPT' | 'DISTINCT_START_DATE' | 'DISTINCT_VISIT'

const props = defineProps<Props>()

const emit = defineEmits<{
  updateCardinalityField: [value: QueryFilterCardinality]
}>()

// Static options
const occurrenceCountOptions = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '20', '50', '100']
const occurenceCountColumnOptions = [
  { value: 'ALL', label: 'All' },
  { value: 'DISTINCT_CONCEPT', label: 'Distinct concept' },
  { value: 'DISTINCT_START_DATE', label: 'Distinct start date' },
  { value: 'DISTINCT_VISIT', label: 'Distinct visit date' },
]

// Component refs for Popper
const exactlyRef = ref(null)
const atLeastRef = ref(null)
const atMostRef = ref(null)

// State variables
const activeOccurenceType = ref<OccurrenceType>(props.cardinality?.type || 'AT_LEAST')
const exactlyCount = ref(props.cardinality?.type === 'EXACTLY' ? props.cardinality.count.toString() : '1')
const atLeastCount = ref(props.cardinality?.type === 'AT_LEAST' ? props.cardinality.count.toString() : '1')
const atMostCount = ref(props.cardinality?.type === 'AT_MOST' ? props.cardinality.count.toString() : '1')
const occurenceCountColumn = ref<OccurrenceCountColumn>(props.cardinality?.using || 'ALL')

const isGroup = props.type === 'GROUP'
const isActiveOccurenceType = (type: OccurrenceType) => {
  return activeOccurenceType.value === type
}

// Updates
const updateCardinalityField = () => {
  const newCardinality = {
    type: activeOccurenceType.value,
    count: parseInt(getCardinalityCount()),
    using: occurenceCountColumn.value,
  }
  emit('updateCardinalityField', newCardinality)
}

const updateCountState = (type: 'EXACTLY' | 'AT_LEAST' | 'AT_MOST' | 'COUNT_COL', value: string) => {
  switch (type) {
    case 'EXACTLY':
      exactlyCount.value = value
      break
    case 'AT_LEAST':
      atLeastCount.value = value
      break
    case 'AT_MOST':
      atMostCount.value = value
      break
  }
}

const updateOccurenceCountColumn = (value: OccurrenceCountColumn) => {
  occurenceCountColumn.value = value || 'ALL'
}

const updateActiveOccurenceType = (type: OccurrenceType) => {
  activeOccurenceType.value = type
}

const getCardinalityCount = () => {
  switch (activeOccurenceType.value) {
    case 'EXACTLY':
      return exactlyCount.value
    case 'AT_LEAST':
      return atLeastCount.value
    case 'AT_MOST':
      return atMostCount.value
    default:
      return '1'
  }
}
</script>

<template>
  <Popper :target="target" placement="bottom-end" class="cardinality-menu-popper">
    <template #default="{ hide }">
      <div class="popover-content">
        <div class="cardinality-menu">
          <div class="body">
            <div v-if="isGroup" class="cardinality-menu__group">
              <div class="group-button-container"></div>
            </div>

            <div v-else class="cardinality-menu__event">
              <div class="event-button-container">
                <div
                  class="button-container"
                  :class="{ 'button-container__selected': isActiveOccurenceType('EXACTLY') }"
                >
                  <ButtonMaterial @click="updateActiveOccurenceType('EXACTLY')">Exactly</ButtonMaterial>
                  <div class="box" ref="exactlyRef">{{ exactlyCount }}</div>
                </div>

                <div
                  class="button-container"
                  :class="{ 'button-container__selected': isActiveOccurenceType('AT_LEAST') }"
                >
                  <ButtonMaterial color="success" @click="updateActiveOccurenceType('AT_LEAST')"
                    >At least</ButtonMaterial
                  >
                  <div class="box" ref="atLeastRef">{{ atLeastCount }}</div>
                </div>

                <div
                  class="button-container"
                  :class="{ 'button-container__selected': isActiveOccurenceType('AT_MOST') }"
                >
                  <ButtonMaterial color="secondary" @click="updateActiveOccurenceType('AT_MOST')"
                    >At most</ButtonMaterial
                  >
                  <div class="box" ref="atMostRef">{{ atMostCount }}</div>
                </div>

                <div class="button-container">
                  <GroupButtons
                    :options="occurenceCountColumnOptions"
                    :limitValue="occurenceCountColumn"
                    :small="true"
                    :namePrefix="props.namePrefix"
                    @update-limit-value="value => updateOccurenceCountColumn(value)"
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="footer">
            <ButtonMaterial
              @click="
                () => {
                  updateCardinalityField()
                  hide()
                }
              "
              >OK</ButtonMaterial
            >
          </div>
        </div>
      </div>
    </template>
  </Popper>

  <DropdownMenu
    :options="occurrenceCountOptions"
    @select="value => updateCountState('EXACTLY', value)"
    :target="exactlyRef"
  />
  <DropdownMenu
    :options="occurrenceCountOptions"
    @select="value => updateCountState('AT_LEAST', value)"
    :target="atLeastRef"
  />
  <DropdownMenu
    :options="occurrenceCountOptions"
    @select="value => updateCountState('AT_MOST', value)"
    :target="atMostRef"
  />
</template>

<style lang="scss" scoped>
.cardinality-menu-popper {
  z-index: 1000;
}
.cardinality-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  min-width: 300px;
  margin-top: 4px;
  padding: 16px;

  .body {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;

    .event-button-container {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      height: auto;

      .button-container {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        gap: 8px;
        height: 40px;
        padding: 6px;
        border-radius: 4px;

        &__selected {
          border: 2px solid #000080;
          background: #faf8f8;
        }
        .material-button {
          flex: 5;
        }
        .box {
          flex: 1;
          background-color: #fff;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 85%;
          border: 1px solid #000080;
          border-radius: 4px;
          text-align: center;
          font-weight: 500;
          color: #000080;
          cursor: pointer;
        }
      }
    }
  }
  .footer {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8px 0;
    border-top: 1px solid #e0e0e0;

    .material-button {
      padding: 0 34px;
    }
  }
}
</style>
