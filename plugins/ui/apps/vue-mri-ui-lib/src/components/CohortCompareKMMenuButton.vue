<template>
  <div class="axis-menu-button-wrapper kmControlComponent">
    <div class="buttonWrapper" ref="menuButtonWrapper">
      <button
        class="kmMenuButton"
        ref="menuButton"
        v-on:click="toggleMenu"
        v-bind:title="propertyDisplay.chartPropertyTooltip"
      >
        <span class="kmMenuText">{{ propertyDisplay.chartPropertyText }}</span>
        <span class="kmMenuSubtext">{{ propertyDisplay.chartPropertySubtext }}</span>
        <span class="kmMenuButtonIcon"></span>
      </button>
      <dropDownMenu
        :target="menuButton"
        boundariesElement="modal-body"
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
  name: 'cohortCompareKMMenuButton',
  props: ['kmEventChangeEv', 'type'],
  data() {
    return {
      menuData: [],
      menuVisible: false,
      menuButton: null,
      menuOpenParam: '',
      propertyDisplay: {
        chartPropertyText: '',
        chartPropertySubtext: '',
        chartPropertyTooltip: '',
      },
    }
  },
  mounted() {
    this.$nextTick(() => {
      window.addEventListener('click', this.closeSubMenu)
    })

    if (this.type === 'startEvent') {
      this.propertyDisplay = {
        chartPropertyText: this.getText('MRI_PA_KAPLAN_DOB'),
        chartPropertySubtext: '',
        chartPropertyTooltip: '',
      }
    } else if (this.type === 'endEvent') {
      this.propertyDisplay = {
        chartPropertyText: this.getText('MRI_PA_KAPLAN_DOD'),
        chartPropertySubtext: '',
        chartPropertyTooltip: '',
      }
    }
    this.menuButton = this.$refs.menuButton
  },
  beforeDestroy() {
    window.removeEventListener('click', this.closeSubMenu)
  },
  computed: {
    ...mapGetters(['getChartableFilterCards', 'getMriFrontendConfig', 'getText']),
  },
  methods: {
    closeSubMenu(event) {
      if (this.menuVisible && !this.$refs.menuButtonWrapper.contains(event.target)) {
        this.closeMenu()
      }
    },
    handleClick(arg) {
      if (arg && this.type === 'startEvent') {
        this.propertyDisplay = {
          chartPropertyText: arg.kmStartEventName,
          chartPropertySubtext: arg.kmStartEventOccName,
          chartPropertyTooltip: arg.kmStartEventName + ' - ' + arg.kmStartEventOccName,
        }
      } else if (arg && this.type === 'endEvent') {
        this.propertyDisplay = {
          chartPropertyText: arg.kmEndEventName,
          chartPropertySubtext: arg.kmEndEventOccName,
          chartPropertyTooltip: arg.kmEndEventName + ' - ' + arg.kmEndEventOccName,
        }
      }
      this.closeMenu()
      this.$emit('kmEventChangeEv', arg)
    },
    startEventToggleMenu(event) {
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

      const firstOccurenceMenu = {
        idx: 0,
        subMenuStyle: {},
        text: this.getText('MRI_PA_KAPLAN_END_EVENT_FIRST_OCCURRENCE_LABEL'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
      }
      const lastOccurenceMenu = {
        idx: 1,
        subMenuStyle: {},
        text: this.getText('MRI_PA_KAPLAN_START_EVENT_LAST_OCCURRENCE_LABEL'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
      }
      const chartableFilterCard = this.getChartableFilterCards
      let menuIdx = 0
      const menuData = []

      chartableFilterCard.forEach(filterCard => {
        if (!filterCard.excludeFilter && filterCard.id !== 'patient') {
          const subMenu = []
          subMenu.push({
            ...firstOccurenceMenu,
            data: {
              kmEventIdentifier: filterCard.id,
              kmStartEventOccurence: 'start_min',
              kmStartEventName: filterCard.name,
              kmStartEventOccName: firstOccurenceMenu.text,
            },
          })
          subMenu.push({
            ...lastOccurenceMenu,
            data: {
              kmEventIdentifier: filterCard.id,
              kmStartEventOccurence: 'start_before_end',
              kmStartEventName: filterCard.name,
              kmStartEventOccName: lastOccurenceMenu.text,
            },
          })
          menuData.push({
            subMenu,
            idx: menuIdx,
            subMenuStyle: {},
            text: filterCard.name,
            hasSubMenu: true,
            isSeperator: false,
            disabled: false,
          })
          menuIdx += 1
        }
      })

      menuData.push({
        idx: menuIdx,
        subMenuStyle: {},
        text: this.getText('MRI_PA_KAPLAN_DOB'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
        data: {
          kmEventIdentifier: 'patient.dateOfBirth',
          kmStartEventOccurence: '',
          kmStartEventName: this.getText('MRI_PA_KAPLAN_DOB'),
          kmStartEventOccName: '',
        },
      })

      this.menuData = menuData
    },
    endEventToggleMenu(event) {
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

      // should be defaulted to Date of Birth for this release
      const firstOccurenceMenu = {
        idx: 0,
        subMenuStyle: {},
        text: this.getText('MRI_PA_KAPLAN_END_EVENT_FIRST_OCCURRENCE_LABEL'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
      }
      const lastOccurenceMenu = {
        idx: 1,
        subMenuStyle: {},
        text: this.getText('MRI_PA_KAPLAN_END_EVENT_LAST_OCCURRENCE_LABEL'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
      }
      const configFilterCards = this.getMriFrontendConfig.getFilterCards()
      let menuIdx = 0
      const menuData = []

      menuData.push({
        idx: menuIdx,
        subMenuStyle: {},
        text: this.getText('MRI_PA_KAPLAN_DOD'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
        data: {
          kmEndEventIdentifier: 'patient.dateOfDeath',
          kmEndEventOccurence: '',
          kmEndEventName: this.getText('MRI_PA_KAPLAN_DOD'),
          kmEndEventOccName: '',
        },
      })
      menuIdx += 1

      configFilterCards.forEach(filterCard => {
        if (!filterCard.excludeFilter && filterCard.sConfigPath !== 'patient') {
          const subMenu = []
          subMenu.push({
            ...firstOccurenceMenu,
            data: {
              kmEndEventIdentifier: filterCard.sConfigPath,
              kmEndEventOccurence: 'end_min',
              kmEndEventName: filterCard.oInternalConfigFilterCard.name,
              kmEndEventOccName: firstOccurenceMenu.text,
            },
          })
          subMenu.push({
            ...lastOccurenceMenu,
            data: {
              kmEndEventIdentifier: filterCard.sConfigPath,
              kmEndEventOccurence: 'end_max',
              kmEndEventName: filterCard.oInternalConfigFilterCard.name,
              kmEndEventOccName: lastOccurenceMenu.text,
            },
          })
          menuData.push({
            subMenu,
            idx: menuIdx,
            subMenuStyle: {},
            text: filterCard.oInternalConfigFilterCard.name,
            hasSubMenu: true,
            isSeperator: false,
            disabled: false,
          })
          menuIdx += 1
        }
      })

      this.menuData = menuData
    },
    toggleMenu(event) {
      this[`${this.type}ToggleMenu`]()
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
