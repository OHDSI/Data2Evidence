<template>
  <div class="axis-menu-button-wrapper" v-bind:style="componentStyle">
    <div class="iconWrapper">
      <label class="iconLabel">
        <span class="icon" v-bind:style="'font-family: app-icons'" v-html="getIcon"></span>
      </label>
    </div>
    <div class="buttonWrapper" ref="menuButtonWrapper">
      <button class="axisMenuButton" ref="menuButton" v-on:click="toggleMenu" v-bind:title="text" tabindex="0">
        <span class="axisMenuText">{{ text }}</span>
        <span class="axisMenuSubText">{{ this.getSubText }}</span>
        <span class="axisMenuButtonIcon"></span>
      </button>
      <dropDownMenu
        :target="menuButton"
        :subMenu="menuData"
        :opened="menuVisible"
        :openParam="menuOpenParam"
        @clickEv="handleClick"
        @closeEv="closeMenu"
      ></dropDownMenu>
    </div>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import Constants from '../utils/Constants'
import DropDownMenu from './DropDownMenu.vue'

export default {
  name: 'cohortEntryExitButton',
  props: {
    text: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      menuData: [],
      menuVisible: false,
      menuButton: null,
      menuOpenParam: '',
    }
  },
  mounted() {
    this.$nextTick(() => {
      window.addEventListener('click', this.closeSubMenu)
    })
    this.menuButton = this.$refs.menuButton
  },
  beforeDestroy() {
    window.removeEventListener('click', this.closeSubMenu)
  },
  computed: {
    ...mapGetters(['getChartableFilterCards', 'getText', 'getFilterCards', 'getSelectedEntryExitFilterCard']),
    componentStyle() {
      const result: any = {
        position: 'absolute',
        top: (this.text === Constants.CohortEntryExit.ENTRY ? 250 : 300) + 'px',
      }
      return result
    },
    getIcon() {
      return this.text === Constants.CohortEntryExit.ENTRY
        ? Constants.CohortEntryExit.ENTRY_ICON
        : Constants.CohortEntryExit.EXIT_ICON
    },
    getKey() {
      return this.text === Constants.CohortEntryExit.ENTRY
        ? Constants.CohortEntryExit.ENTRY_KEY
        : Constants.CohortEntryExit.EXIT_KEY
    },
    isDisabled() {
      return id => {
        const filterCards = this.getFilterCards()
        if (filterCards && filterCards[id]) {
          return filterCards[id].props.isEntry || filterCards[id].props.isExit
        }
        return false
      }
    },
    getSubText() {
      return this.getSelectedEntryExitFilterCard(this.getKey) || this.getText('MRI_PA_CHART_ENTRY_EXIT_PLACEHOLDER')
    },
  },
  methods: {
    ...mapActions(['setChartPropertyValue', 'updateCohortEntryExit', 'resetAllFilterCardEntryExit']),
    closeSubMenu(event) {
      if (this.menuVisible && !this.$refs.menuButtonWrapper.contains(event.target)) {
        this.closeMenu()
      }
    },
    handleClick(arg) {
      if (arg) {
        if (arg.action === 'clear') {
          this.resetAllFilterCardEntryExit({ key: this.getKey })
          this.closeMenu()
        } else {
          this.resetAllFilterCardEntryExit({ key: this.getKey })
          this.updateCohortEntryExit({ filterCardId: arg.id, key: this.getKey, toggle: true })
          this.closeMenu()
        }
      }
    },
    toggleMenu(event) {
      const sourceEvent = event || window.event
      this.menuVisible = !this.menuVisible
      if (this.menuVisible) {
        if (sourceEvent.clientX || sourceEvent.clientY) {
          this.menuOpenParam = ''
        } else {
          this.$nextTick(() => {
            this.menuOpenParam = 'firstItem'
          })
        }
      } else {
        this.menuOpenParam = 'clear'
      }

      const filterCards = this.getChartableFilterCards.slice(1)
      const seperator = {
        idx: filterCards.length,
        hasSubMenu: false,
        isSeperator: true,
      }
      const resetButton = {
        idx: filterCards.length + 1,
        subMenuStyle: {},
        text: this.getText('MRI_PA_MENUITEM_NONE'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
        data: { action: 'clear', type: this.text },
      }

      this.menuData = [
        ...filterCards.map((card, index) => ({
          idx: index,
          subMenuStyle: {},
          text: card.name,
          hasSubMenu: false,
          isSeperator: false,
          subMenu: [],
          disabled: this.isDisabled(card.id),
          data: card,
        })),
        seperator,
        resetButton,
      ]
    },
    closeMenu() {
      this.menuOpenParam = 'clear'
      this.menuVisible = false
    },
  },
  components: {
    DropDownMenu,
  },
}
</script>
