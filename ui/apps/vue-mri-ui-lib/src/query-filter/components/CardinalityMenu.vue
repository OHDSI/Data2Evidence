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
  namePrefix: string
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
const occurrenceCountColumnOptions = [
  { value: 'ALL', label: 'All' },
  { value: 'DISTINCT_CONCEPT', label: 'Distinct concept' },
  { value: 'DISTINCT_START_DATE', label: 'Distinct start date' },
  { value: 'DISTINCT_VISIT', label: 'Distinct visit date' },
]

// Component refs for Popper
const exactlyRef = ref<HTMLElement | null>(null)
const atLeastRef = ref<HTMLElement | null>(null)
const atMostRef = ref<HTMLElement | null>(null)

// State variables
const activeOccurrenceType = ref<OccurrenceType>(props.cardinality?.type || 'AT_LEAST')
const exactlyCount = ref(props.cardinality?.type === 'EXACTLY' ? props.cardinality.count.toString() : '1')
const atLeastCount = ref(props.cardinality?.type === 'AT_LEAST' ? props.cardinality.count.toString() : '1')
const atMostCount = ref(props.cardinality?.type === 'AT_MOST' ? props.cardinality.count.toString() : '1')
const occurrenceCountColumn = ref<OccurrenceCountColumn>(props.cardinality?.using || 'ALL')

const isGroup = props.type === 'GROUP'
const isActiveOccurrenceType = (type: OccurrenceType) => {
  return activeOccurrenceType.value === type
}

// Updates
const updateCardinalityField = () => {
  const newCardinality = {
    type: activeOccurrenceType.value,
    count: parseInt(getCardinalityCount()),
    using: occurrenceCountColumn.value,
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

const isValidOccurrenceCountColumn = (value: string): value is OccurrenceCountColumn => {
  return ['ALL', 'DISTINCT_CONCEPT', 'DISTINCT_START_DATE', 'DISTINCT_VISIT'].includes(value)
}

const updateOccurrenceCountColumn = (value: string) => {
  occurrenceCountColumn.value = isValidOccurrenceCountColumn(value) ? value : 'ALL'
}

const updateActiveOccurrenceType = (type: OccurrenceType) => {
  activeOccurrenceType.value = type
}

const getCardinalityCount = () => {
  switch (activeOccurrenceType.value) {
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
                  :class="{ 'button-container__selected': isActiveOccurrenceType('EXACTLY') }"
                >
                  <ButtonMaterial @button-click="updateActiveOccurrenceType('EXACTLY')">Exactly</ButtonMaterial>
                  <div class="box" ref="exactlyRef">{{ exactlyCount }}</div>
                </div>

                <div
                  class="button-container"
                  :class="{ 'button-container__selected': isActiveOccurrenceType('AT_LEAST') }"
                >
                  <ButtonMaterial color="success" @button-click="updateActiveOccurrenceType('AT_LEAST')"
                    >At least</ButtonMaterial
                  >
                  <div class="box" ref="atLeastRef">{{ atLeastCount }}</div>
                </div>

                <div
                  class="button-container"
                  :class="{ 'button-container__selected': isActiveOccurrenceType('AT_MOST') }"
                >
                  <ButtonMaterial color="secondary" @button-click="updateActiveOccurrenceType('AT_MOST')"
                    >At most</ButtonMaterial
                  >
                  <div class="box" ref="atMostRef">{{ atMostCount }}</div>
                </div>

                <div class="button-container">
                  <GroupButtons
                    :options="occurrenceCountColumnOptions"
                    :limitValue="occurrenceCountColumn"
                    :small="true"
                    :namePrefix="props.namePrefix"
                    @update-limit-value="value => updateOccurrenceCountColumn(value)"
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="footer">
            <ButtonMaterial
              @button-click="
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
    v-if="exactlyRef"
    :options="occurrenceCountOptions"
    @select="(value: string) => updateCountState('EXACTLY', value)"
    :target="exactlyRef"
  />
  <DropdownMenu
    v-if="atLeastRef"
    :options="occurrenceCountOptions"
    @select="(value: string) => updateCountState('AT_LEAST', value)"
    :target="atLeastRef"
  />
  <DropdownMenu
    v-if="atMostRef"
    :options="occurrenceCountOptions"
    @select="(value: string) => updateCountState('AT_MOST', value)"
    :target="atMostRef"
  />
</template>

<style lang="scss">
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
