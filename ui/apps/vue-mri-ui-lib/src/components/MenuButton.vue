<template>
  <div class="menu-button-wrapper" ref="menuButtonWrapper">
    <button
      class="menuButton"
      ref="menuButton"
      v-click-focus
      v-on:click="openMenu"
      v-bind:title="selectedItem.tooltip"
      tabindex="0"
    >
      <span class="menuText">{{ selectedItem.text || placeholder }}</span>
      <span class="menuButtonIcon"></span>
    </button>
    <dropDownMenu
      :target="menuButton"
      :subMenu="menuData"
      :opened="menuVisible"
      :openParam="menuOpenParameter"
      @clickEv="handleClick"
      @closeEv="closeAxisMenu"
    ></dropDownMenu>
  </div>
</template>

<script lang="ts">
import DropDownMenu from './DropDownMenu.vue'

export default {
  name: 'menuButton',
  props: {
    menuData: {
      type: Object,
      default: () => [],
    },
    placeholder: {
      type: String,
      default: '',
    },
    selectedItem: {
      type: Object,
      default: () => ({
        text: '',
        value: '',
        tooltip: '',
      }),
    },
  },
  data() {
    return {
      menuVisible: false,
      menuButton: null,
      menuOpenParameter: '',
    }
  },
  mounted() {
    this.$nextTick(() => {
      window.addEventListener('click', this.closeSubMenu)
    })

    this.menuButton = this.$refs.menuButton
    // this.menuData = this.generateSampleMenu();
  },
  beforeDestroy() {
    window.removeEventListener('click', this.closeSubMenu)
  },
  computed: {
    axisModel() {
      if (this.dimensionIndex || this.dimensionIndex === 0) {
        return this.getAxis(this.dimensionIndex)
      }
      return {}
    },
  },
  methods: {
    generateSampleMenu() {
      // demo data
      const menuData = []
      const subMenu = []
      let menuIdx = 0

      for (let i = 0; i < 3; i += 1) {
        subMenu.push({
          idx: i,
          subMenuStyle: {},
          text: `submenu ${i}`,
          hasSubMenu: false,
          isSeperator: false,
          subMenu: [],
          disabled: false,
          data: {},
        })
      }

      for (menuIdx = 0; menuIdx < 3; menuIdx += 1) {
        menuData.push({
          subMenu,
          idx: menuIdx,
          subMenuStyle: {},
          text: `menu ${menuIdx}`,
          hasSubMenu: true,
          isSeperator: false,
          isTitle: true,
        })
      }

      menuData.push({
        idx: (menuIdx += 1),
        subMenuStyle: {},
        text: 'i am a TITLE',
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        isTitle: true,
      })

      menuData.push({
        idx: (menuIdx += 1),
        hasSubMenu: false,
        isSeperator: true,
      })

      menuData.push({
        idx: (menuIdx += 1),
        subMenuStyle: {},
        text: 'no submenu',
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
        data: { action: 'clear' },
      })

      return menuData
    },
    closeSubMenu(event) {
      if (this.menuVisible && !this.$refs.menuButtonWrapper.contains(event.target)) {
        this.closeAxisMenu()
      }
    },
    handleClick(arg) {
      this.$emit('clickItem', arg)
      this.closeAxisMenu()
    },
    openMenu(event) {
      this.$emit('openMenu')
      const sourceEvent = event || window.event
      this.menuVisible = !this.menuVisible
      if (this.menuVisible) {
        if (sourceEvent.clientX || sourceEvent.clientY) {
          this.menuOpenParameter = ''
        } else {
          this.$nextTick(() => {
            this.menuOpenParameter = 'firstItem'
          })
        }
      } else {
        this.menuOpenParameter = 'clear'
      }
    },
    clearSelection() {
      this.clearAxisValue(this.dimensionIndex)
      this.closeAxisMenu()
      this.setFireRequest()
    },
    closeAxisMenu() {
      this.menuOpenParameter = 'clear'
      this.menuVisible = false
    },
  },
  components: {
    DropDownMenu,
  },
}
</script>
