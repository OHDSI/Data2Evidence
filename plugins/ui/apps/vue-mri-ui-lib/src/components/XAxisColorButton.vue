<template>
  <div class="axis-menu-button-wrapper x-axis-dropdown-button x-axis-color-button" v-show="axisMenuData.length > 0">
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
      <button class="axisMenuButton" ref="menuButton" @click="toggleMenu" :title="selectionTooltip" tabindex="0">
        <span class="axisMenuText axisTextPlaceholder" v-if="!selectedAttrText">
          {{ getText('MRI_PA_SELECT_X_AXIS') }}
        </span>
        <span class="axisMenuText" v-if="selectedAttrText">{{ selectedFilterText }}</span>
        <span class="axisMenuSubText" v-if="selectedAttrText">
          {{ selectedAttrText }}
        </span>
        <span class="axisMenuButtonIcon"></span>
      </button>
      <dropDownMenu
        :target="menuButtonEl"
        :parentContainer="parentContainer"
        :subMenu="axisMenuData"
        :opened="menuVisible"
        @clickEv="handleClick"
        @closeEv="closeMenu"
      ></dropDownMenu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, useTemplateRef } from 'vue'
import { useStore } from 'vuex'
import DropDownMenu from './DropDownMenu.vue'

// Props & Emits
const props = defineProps<{ parentContainer: any; selectedAxis: number | null }>()
const emit = defineEmits<{ colorAxisSelected: [value: number | null] }>()

// Store
const store = useStore()
const getAllAxes = computed(() => store?.getters?.getAllAxes)
const getMriFrontendConfig = computed(() => store?.getters?.getMriFrontendConfig)
const getChartableFilterCards = computed(() => store?.getters?.getChartableFilterCards)
const getText = (key: string) => store?.getters?.getText?.(key) || key

// Template refs
const menuButton = useTemplateRef<HTMLButtonElement>('menuButton')
const menuButtonWrapper = useTemplateRef<HTMLDivElement>('menuButtonWrapper')

// Reactive state
const menuVisible = ref(false)
const menuButtonEl = ref<HTMLButtonElement | null>(null)
const selectedFilterText = ref('')
const selectedAttrText = ref('')
const selectedAxisIndex = ref<number | null>(null)
const selectedFilterCardId = ref<string | null>(null)
const selectedKey = ref<string | null>(null)
const selectionTooltip = computed(() =>
  selectedAttrText.value ? `${selectedFilterText.value} - ${selectedAttrText.value}` : getText('MRI_PA_SELECT_X_AXIS')
)
const axisMenuData = ref<any[]>([])

// Lifecycle
let isUnmounted = false

onMounted(() => {
  nextTick(() => {
    if (isUnmounted) return
    window.addEventListener('click', closeSubMenu)
    menuButtonEl.value = menuButton.value
  })
})

onBeforeUnmount(() => {
  isUnmounted = true
  window.removeEventListener('click', closeSubMenu)
})

// Watchers
watch(
  getAllAxes,
  () => {
    buildMenuData()
  },
  { deep: true }
)

watch(getMriFrontendConfig, () => {
  buildMenuData()
})

watch(selectedAxisIndex, () => {
  buildMenuData()
})

// Sync internal state when parent changes selectedAxis prop
watch(
  () => props.selectedAxis,
  newVal => {
    if (newVal === null && selectedAxisIndex.value !== null) {
      resetSelection()
    } else if (newVal !== null && newVal !== selectedAxisIndex.value) {
      selectAxisInternal(newVal)
    }
  }
)

// Methods
function buildMenuData() {
  const allAxes = getAllAxes.value
  const menuData: any[] = []
  if (!getMriFrontendConfig.value) {
    axisMenuData.value = menuData
    return
  }
  let menuIdx = 0
  for (let i = 0; i <= 1; i++) {
    const axis = allAxes[i]
    if (axis?.props?.filterCardId && axis?.props?.key) {
      const filterCard = getMriFrontendConfig.value.getFilterCardByInstanceId(axis.props.filterCardId)
      if (!filterCard) continue
      let attrName = ''
      filterCard.aAllAttributes.forEach((attribute: any) => {
        if (attribute.sConfigPath.split('.').pop() === axis.props.key) {
          attrName = attribute.oInternalConfigAttribute.name
        }
      })
      if (attrName) {
        let filterCardName = filterCard.oInternalConfigFilterCard.name
        if (!filterCardName || filterCardName.indexOf('undefined') > -1) {
          filterCardName = getText('MRI_PA_FILTERCARD_TITLE_BASIC_DATA')
        }
        let filterCardCode = ''
        if (getChartableFilterCards.value) {
          getChartableFilterCards.value.forEach((fCard: any) => {
            if (fCard.instanceId === axis.props.filterCardId) {
              filterCardCode = fCard.name.replace(filterCardName, '').trim()
            }
          })
        }
        if (filterCardCode) {
          filterCardCode = filterCardCode + ' - '
        }
        const filterText = `${filterCardCode}${filterCardName}`
        menuData.push({
          idx: menuIdx,
          subMenuStyle: {},
          text: `${filterText} - ${attrName}`,
          hasSubMenu: false,
          isSeperator: false,
          subMenu: [],
          disabled: false,
          data: { axisIndex: i, filterText, attrText: attrName },
        })
        menuIdx += 1
      }
    }
  }
  if (selectedAxisIndex.value !== null && menuData.length > 0) {
    menuData.push({
      idx: (menuIdx += 1),
      hasSubMenu: false,
      isSeperator: true,
    })
    menuData.push({
      idx: (menuIdx += 1),
      subMenuStyle: {},
      text: getText('MRI_PA_MENUITEM_NONE'),
      hasSubMenu: false,
      isSeperator: false,
      subMenu: [],
      disabled: false,
      data: { action: 'clear' },
    })
  }
  axisMenuData.value = menuData

  // Reset selection if the selected option is no longer among the available menu items
  if (selectedAxisIndex.value !== null) {
    const axis = allAxes[selectedAxisIndex.value]
    const stillValid =
      menuData.some((item: any) => item.data && item.data.axisIndex === selectedAxisIndex.value) &&
      axis?.props?.filterCardId === selectedFilterCardId.value &&
      axis?.props?.key === selectedKey.value
    if (!stillValid) {
      resetSelection()
      emit('colorAxisSelected', null)
    }
  }
}

function toggleMenu() {
  menuVisible.value = !menuVisible.value
}

function closeMenu() {
  menuVisible.value = false
}

function closeSubMenu(event: MouseEvent) {
  if (menuVisible.value && menuButtonWrapper.value && !menuButtonWrapper.value.contains(event.target as Node)) {
    closeMenu()
  }
}

function handleClick(data: any) {
  if (data) {
    if (data.action === 'clear') {
      resetSelection()
      emit('colorAxisSelected', null)
    } else {
      const menuItem = axisMenuData.value.find((item: any) => item.data && item.data.axisIndex === data.axisIndex)
      if (menuItem) {
        emit('colorAxisSelected', data.axisIndex)
      }
    }
  }
  closeMenu()
}

function selectAxisInternal(axisIndex: number) {
  const menuItem = axisMenuData.value.find((item: any) => item.data && item.data.axisIndex === axisIndex)
  if (menuItem) {
    selectedFilterText.value = menuItem.data.filterText
    selectedAttrText.value = menuItem.data.attrText
    selectedAxisIndex.value = axisIndex
    const axis = getAllAxes.value[axisIndex]
    selectedFilterCardId.value = axis?.props?.filterCardId ?? null
    selectedKey.value = axis?.props?.key ?? null
  }
}

function resetSelection() {
  selectedFilterText.value = ''
  selectedAttrText.value = ''
  selectedAxisIndex.value = null
  selectedFilterCardId.value = null
  selectedKey.value = null
}
</script>

<style scoped></style>
