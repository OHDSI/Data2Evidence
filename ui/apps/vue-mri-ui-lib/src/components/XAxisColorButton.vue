<template>
  <div class="axis-menu-button-wrapper x-axis-dropdown-button" v-show="menuData.length > 0">
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
        :title="selectedOption || getText('MRI_PA_CHART_AXIS_PLACEHOLDER')"
        tabindex="0"
      >
        <span class="axisMenuText" :class="{ axisTextPlaceholder: !selectedOption }">
          {{ selectedOption || getText('MRI_PA_CHART_AXIS_PLACEHOLDER') }}
        </span>
        <span class="axisMenuButtonIcon"></span>
      </button>
      <dropDownMenu
        :target="menuButtonEl"
        :parentContainer="parentContainer"
        :subMenu="menuData"
        :opened="menuVisible"
        @clickEv="handleClick"
        @closeEv="closeMenu"
      ></dropDownMenu>
    </div>
  </div>
</template>

<script lang="ts">
import { mapGetters } from 'vuex'
import DropDownMenu from './DropDownMenu.vue'

export default {
  name: 'xAxisColorButton',
  props: ['parentContainer'],
  data() {
    return {
      menuVisible: false,
      menuButtonEl: null,
      selectedOption: '',
    }
  },
  mounted() {
    this.$nextTick(() => {
      window.addEventListener('click', this.closeSubMenu)
      this.menuButtonEl = this.$refs.menuButton
    })
  },
  beforeUnmount() {
    window.removeEventListener('click', this.closeSubMenu)
  },
  computed: {
    ...mapGetters(['getAllAxes', 'getMriFrontendConfig', 'getText']),
    menuData() {
      const allAxes = this.getAllAxes
      const items = []
      if (!this.getMriFrontendConfig) return items
      for (let i = 0; i <= 1; i++) {
        const axis = allAxes[i]
        if (axis?.props?.filterCardId && axis?.props?.key) {
          const filterCard = this.getMriFrontendConfig.getFilterCardByInstanceId(axis.props.filterCardId)
          if (!filterCard) continue
          let attrName = ''
          filterCard.aAllAttributes.forEach(attribute => {
            if (attribute.sConfigPath.split('.').pop() === axis.props.key) {
              attrName = attribute.oInternalConfigAttribute.name
            }
          })
          if (attrName) {
            items.push({
              idx: i,
              subMenuStyle: {},
              text: attrName,
              hasSubMenu: false,
              isSeperator: false,
              subMenu: [],
              disabled: false,
              data: { axisIndex: i },
            })
          }
        }
      }
      return items
    },
  },
  methods: {
    toggleMenu() {
      this.menuVisible = !this.menuVisible
    },
    closeMenu() {
      this.menuVisible = false
    },
    closeSubMenu(event) {
      if (this.menuVisible && this.$refs.menuButtonWrapper && !this.$refs.menuButtonWrapper.contains(event.target)) {
        this.closeMenu()
      }
    },
    handleClick({ data }) {
      if (data) {
        const menuItem = this.menuData.find(item => item.data.axisIndex === data.axisIndex)
        if (menuItem) {
          this.selectedOption = menuItem.text
        }
      }
      this.closeMenu()
    },
  },
  components: {
    DropDownMenu,
  },
}
</script>

<style scoped>
.x-axis-dropdown-button {
  position: absolute;
  left: 0px;
  bottom: 102px;
}
</style>
