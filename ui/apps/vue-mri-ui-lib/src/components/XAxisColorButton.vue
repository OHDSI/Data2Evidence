<template>
  <div class="axis-menu-button-wrapper x-axis-dropdown-button" v-show="axisMenuData.length > 0">
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
        :title="selectedOption || 'Select an x-axis'"
        tabindex="0"
      >
        <span class="axisMenuText axisTextPlaceholder" v-if="!selectedOption"> Select an x-axis </span>
        <span class="axisMenuSubText" v-if="selectedOption">
          {{ selectedOption }}
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
defineProps<{ parentContainer: any }>()
const emit = defineEmits<{ colorAxisSelected: [value: number | null] }>()

// Store
const store = useStore()
const getAllAxes = computed(() => store?.getters?.getAllAxes)
const getMriFrontendConfig = computed(() => store?.getters?.getMriFrontendConfig)
const getText = (key: string) => store?.getters?.getText?.(key) || key

// Template refs
const menuButton = useTemplateRef<HTMLButtonElement>('menuButton')
const menuButtonWrapper = useTemplateRef<HTMLDivElement>('menuButtonWrapper')

// Reactive state
const menuVisible = ref(false)
const menuButtonEl = ref<HTMLButtonElement | null>(null)
const selectedOption = ref('')
const axisMenuData = ref<any[]>([])

// Lifecycle
onMounted(() => {
  nextTick(() => {
    window.addEventListener('click', closeSubMenu)
    menuButtonEl.value = menuButton.value
  })
})

onBeforeUnmount(() => {
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

watch(selectedOption, () => {
  buildMenuData()
})

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
        menuData.push({
          idx: menuIdx,
          subMenuStyle: {},
          text: attrName,
          hasSubMenu: false,
          isSeperator: false,
          subMenu: [],
          disabled: false,
          data: { axisIndex: i },
        })
        menuIdx += 1
      }
    }
  }
  if (selectedOption.value && menuData.length > 0) {
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
        selectedOption.value = menuItem.text
        emit('colorAxisSelected', data.axisIndex)
      }
    }
  }
  closeMenu()
}

function resetSelection() {
  selectedOption.value = ''
}

// Expose resetSelection so parent can call it via template ref
defineExpose({ resetSelection })
</script>

<style scoped>
.x-axis-dropdown-button {
  position: absolute;
  left: 0px;
  bottom: 138px;
}
</style>
