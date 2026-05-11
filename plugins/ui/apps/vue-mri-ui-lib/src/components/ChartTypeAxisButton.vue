<template>
  <div class="axis-menu-button-wrapper bar-display-mode-axis-button">
    <div class="iconWrapper">
      <label class="iconLabel">
        <CohortDefinitionIcon class="icon cursorDefault" />
      </label>
    </div>
    <div class="buttonWrapper" ref="menuButtonWrapper">
      <button
        class="axisMenuButton"
        ref="menuButton"
        @click="toggleMenu"
        :title="getText('MRI_PA_BAR_DISPLAY_MODE')"
        tabindex="0"
      >
        <span class="axisMenuText">{{ getText('MRI_PA_BAR_DISPLAY_MODE') }}</span>
        <span class="axisMenuSubText">{{ currentModeLabel }}</span>
        <span class="axisMenuButtonIcon"></span>
      </button>
      <dropDownMenu
        :target="menuButton"
        :parentContainer="parentContainer"
        :subMenu="menuData"
        :opened="menuVisible"
        @clickEv="handleClick"
        @closeEv="closeMenu"
      >
        <template #item="{ item }">
          <label
            v-if="item.kind === 'overlayToggle'"
            class="bar-display-mode-axis-button__toggle"
            :class="{ 'bar-display-mode-axis-button__toggle--disabled': item.disabled }"
            @click.stop
          >
            <input
              type="checkbox"
              :checked="getShowDistributionOverlay"
              :disabled="item.disabled"
              @change="onToggleOverlay(($event.target as HTMLInputElement).checked)"
            />
            {{ getText('MRI_PA_DISTRIBUTION_CURVE') }}
          </label>
          <span v-else>{{ item.text }}</span>
        </template>
      </dropDownMenu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
import { useStore } from 'vuex'
import DropDownMenu from './DropDownMenu.vue'
import CohortDefinitionIcon from './icons/CohortDefinitionIcon.vue'
import { modeOrder } from './StackBarModes/modes'

defineProps<{ parentContainer?: any }>()

const store = useStore()
const getBarDisplayMode = computed(() => store?.getters?.getBarDisplayMode)
const getShowDistributionOverlay = computed(() => store?.getters?.getShowDistributionOverlay)
const getMriFrontendConfig = computed(() => store?.getters?.getMriFrontendConfig)
const getText = (key: string) => store?.getters?.getText?.(key) || key

const menuButtonWrapper = useTemplateRef<HTMLDivElement>('menuButtonWrapper')
const menuButton = useTemplateRef<HTMLButtonElement>('menuButton')
const menuVisible = ref(false)

const modeIdToPanelOption: Record<string, string> = {
  overlay: 'overlappingHistogram',
  partialOverlaySolid: 'overlappingBarChart',
  distribution: 'kernelDensityPlot',
}

const enabledModes = computed(() => {
  const panelOptions = getMriFrontendConfig.value?._internalConfig?.panelOptions || {}
  return modeOrder.filter(mode => {
    const optionKey = modeIdToPanelOption[mode.id]
    if (!optionKey) return true
    return !!panelOptions[optionKey]
  })
})

const currentModeLabel = computed(() => {
  const current = modeOrder.find(m => m.id === getBarDisplayMode.value)
  return current ? current.label : ''
})

const overlayAllowed = computed(() => {
  const current = modeOrder.find(m => m.id === getBarDisplayMode.value)
  return !!current?.hasDistributionOverlay
})

const menuData = computed(() => {
  const items: any[] = []
  let idx = 0
  items.push({
    idx: idx++,
    text: getText('MRI_PA_CHART_TYPES'),
    isTitle: true,
    hasSubMenu: false,
    isSeperator: false,
    subMenu: [],
    data: null,
  })
  for (const mode of enabledModes.value) {
    items.push({
      idx: idx++,
      text: mode.label,
      hasSubMenu: false,
      isSeperator: false,
      subMenu: [],
      selected: getBarDisplayMode.value === mode.id,
      data: { id: mode.id },
    })
  }
  items.push({
    idx: idx++,
    text: getText('MRI_PA_OVERLAY'),
    isTitle: true,
    hasSubMenu: false,
    isSeperator: false,
    subMenu: [],
    data: null,
  })
  items.push({
    idx: idx++,
    kind: 'overlayToggle',
    text: getText('MRI_PA_DISTRIBUTION_CURVE'),
    hasSubMenu: false,
    isSeperator: false,
    subMenu: [],
    disabled: !overlayAllowed.value,
    data: { toggleOverlay: true },
  })
  return items
})

function toggleMenu() {
  menuVisible.value = !menuVisible.value
}

function closeMenu() {
  menuVisible.value = false
}

function handleClick(arg: any) {
  if (!arg) return
  if (arg.toggleOverlay) return
  if (arg.id) {
    store.dispatch('setBarDisplayMode', arg.id)
    const next = modeOrder.find(m => m.id === arg.id)
    if (!next?.hasDistributionOverlay && getShowDistributionOverlay.value) {
      store.dispatch('setShowDistributionOverlay', false)
    }
  }
}

function onToggleOverlay(value: boolean) {
  store.dispatch('setShowDistributionOverlay', value)
}

function handleOutsideClick(event: MouseEvent) {
  if (!menuVisible.value) return
  if (menuButtonWrapper.value && !menuButtonWrapper.value.contains(event.target as Node)) {
    closeMenu()
  }
}

onMounted(() => {
  window.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleOutsideClick)
})
</script>

<style scoped>
.bar-display-mode-axis-button__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.bar-display-mode-axis-button__toggle--disabled {
  cursor: not-allowed;
  color: var(--color-mri-disabled-text);
}
.bar-display-mode-axis-button__toggle input {
  margin: 0;
}
</style>
