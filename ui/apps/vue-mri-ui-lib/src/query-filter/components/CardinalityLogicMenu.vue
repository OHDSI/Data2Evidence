<script lang="ts">
export default {
  name: 'CardinalityLogicMenu',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Props {
  menuPosition: { x: number; y: number }
  filterId: string
}

const props = defineProps<Props>()

const logicOptions = [
  { value: 'Exactly', label: 'Exactly', class: 'exactly', hasInput: true },
  { value: 'At least', label: 'At least', class: 'at-least', hasInput: true },
  { value: 'At most', label: 'At most', class: 'at-most', hasInput: true },
]

const currentLogic = ref<string | null>(null)
const inputValue = ref<number | null>(null)
const activeTab = ref<'all' | 'distinct' | 'start'>('all')

const selectLogic = (value: string) => {
  currentLogic.value = value
  inputValue.value = null // Reset input when selecting a new logic
}

const applyLogic = () => {
  if (currentLogic.value && inputValue.value !== null) {
    // Emit the selected logic and input value
    console.log(`Applying logic: ${currentLogic.value} with value: ${inputValue.value}`)
    // Here you would typically emit an event or call a method to apply the logic
  }
  currentLogic.value = null // Reset after applying
  inputValue.value = null // Reset input after applying
}
</script>

<template>
  <div class="logic-menu-overlay">
    <div class="logic-menu" :style="{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }" @click.stop>
      <div class="menu-section">
        <button
          v-for="option in logicOptions"
          :key="option.value"
          :class="['menu-option', option.class, { active: currentLogic === option.value }]"
          @click="selectLogic(option.value)"
        >
          <span class="option-label">{{ option.label }}</span>
          <input v-if="option.hasInput" v-model="inputValue" type="number" class="option-input" min="1" @click.stop />
        </button>
      </div>

      <div class="menu-divider"></div>

      <div class="menu-section">
        <div class="menu-tabs">
          <button :class="['tab', { active: activeTab === 'all' }]" @click="activeTab = 'all'">All</button>
          <button :class="['tab', { active: activeTab === 'distinct' }]" @click="activeTab = 'distinct'">
            Distinct concept
          </button>
          <button :class="['tab', { active: activeTab === 'start' }]" @click="activeTab = 'start'">
            Distinct start date
          </button>
        </div>

        <button class="ok-btn" @click="applyLogic">OK</button>
      </div>

      <div class="menu-divider"></div>

      <div class="menu-section">
        <div class="group-options">
          <button class="group-btn">Group</button>
          <button class="nested-btn">Nested</button>
        </div>

        <div class="action-buttons">
          <button class="ungroup-btn">Ungroup</button>
          <button class="ok-btn" @click="applyLogic">OK</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// @import '../styles/AttributesDropdown';
</style>

