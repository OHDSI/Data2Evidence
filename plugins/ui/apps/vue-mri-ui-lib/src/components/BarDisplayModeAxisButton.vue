<template>
  <div class="axis-menu-button-wrapper bar-display-mode-axis-button">
    <div class="iconWrapper">
      <label class="iconLabel">
        <svg
          class="icon cursorDefault"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 -960 960 960"
          width="14"
          height="16"
          fill="currentColor"
        >
          <path
            d="M346-140 100-386q-10-10-15-22t-5-25q0-13 5-25t15-22l230-229-106-106 62-65 400 400q10 10 14.5 22t4.5 25q0 13-4.5 25T686-386L440-140q-10 10-22 15t-25 5q-13 0-25-5t-22-15Zm47-506L179-432h428L393-646Zm399 526q-36 0-61-25.5T706-208q0-27 13.5-51t30.5-47l42-54 44 54q16 23 30 47t14 51q0 37-26 62.5T792-120Z"
          />
        </svg>
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
import { modeOrder } from './StackBarModes/modes'

defineProps<{ parentContainer?: any }>()

const store = useStore()
const getBarDisplayMode = computed(() => store?.getters?.getBarDisplayMode)
const getShowDistributionOverlay = computed(() => store?.getters?.getShowDistributionOverlay)
const getText = (key: string) => store?.getters?.getText?.(key) || key

const menuButtonWrapper = useTemplateRef<HTMLDivElement>('menuButtonWrapper')
const menuButton = useTemplateRef<HTMLButtonElement>('menuButton')
const menuVisible = ref(false)

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
  for (const mode of modeOrder) {
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
