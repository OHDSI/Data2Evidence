<template>
  <div class="axis-menu-button-wrapper" v-bind:style="componentStyle">
    <div class="buttonWrapper" ref="menuButtonWrapper">
      <button
        class="axisMenuButton"
        ref="menuButton"
        v-click-focus
        v-on:click="toggleMenu"
        v-bind:title="propertyDisplay.chartPropertyTooltip"
      >
        <span class="axisMenuText">{{ propertyDisplay.chartPropertyText }}</span>
        <span class="axisMenuButtonIcon"></span>
      </button>
      <dropDownMenu
        :target="menuButton"
        :subMenu="menuData"
        :opened="menuVisible"
        @clickEv="handleClick"
      ></dropDownMenu>
    </div>
  </div>
</template>

<script lang="ts">
import { mapGetters } from 'vuex'
import DropDownMenu from './DropDownMenu.vue'

const DAYS_PER_DAY = 1
const DAYS_PER_WEEK = 7
const DAYS_PER_YEAR = 365.24
const DAYS_PER_MONTH = DAYS_PER_YEAR / 12

const UNIT_DATA = {
  days: {
    label: 'MRI_PA_KAPLAN_DAYS_LONG',
    avgDaysInUnit: DAYS_PER_DAY,
    upperRangeLimit: DAYS_PER_MONTH,
    digitsAfterDecimalPoint: 1,
    fontStyle: 'normal',
    fontWeight: 'normal',
  },
  weeks: {
    label: 'MRI_PA_KAPLAN_WEEKS_LONG',
    avgDaysInUnit: DAYS_PER_WEEK,
    upperRangeLimit: 12 * DAYS_PER_WEEK,
    digitsAfterDecimalPoint: 1,
    fontStyle: 'normal',
    fontWeight: 'normal',
  },
  months: {
    label: 'MRI_PA_KAPLAN_MONTHS_LONG',
    avgDaysInUnit: DAYS_PER_MONTH,
    upperRangeLimit: 3 * DAYS_PER_YEAR,
    digitsAfterDecimalPoint: 1,
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
  years: {
    label: 'MRI_PA_KAPLAN_YEARS_LONG',
    avgDaysInUnit: DAYS_PER_YEAR,
    upperRangeLimit: null,
    digitsAfterDecimalPoint: 1,
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
}

export default {
  name: 'unitMenuButton',
  props: ['updateUnitEvt'],
  data() {
    return {
      menuData: [],
      menuVisible: false,
      menuButton: null,
      selectedUnit: 'years',
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
    ...mapGetters(['getText']),
    propertyDisplay() {
      if (this.selectedUnit) {
        const unitText = this.getText(UNIT_DATA[this.selectedUnit].label)
        return {
          chartPropertyText: unitText,
          chartPropertyTooltip: unitText,
        }
      }
      return {
        chartPropertyText: 'Auto',
        chartPropertyTooltip: 'Best Fit Unit',
      }
    },
    parentBottomLocation() {
      if (this.$el && this.$el.parentElement && this.$el.parentElement.getBoundingClientRect()) {
        return this.$el.parentElement.getBoundingClientRect().bottom
      }
      return 0
    },
  },
  methods: {
    closeSubMenu(event) {
      if (this.menuVisible && !this.$refs.menuButtonWrapper.contains(event.target)) {
        this.closeMenu()
      }
    },
    handleClick(arg) {
      const oldKey = this.selectedUnit
      let newKey = oldKey
      if (arg) {
        newKey = arg
        this.selectedUnit = arg
      }
      this.closeMenu()
      if (oldKey !== newKey) {
        this.$emit('updateUnitEvt', { oldKey, newKey })
      }
    },
    toggleMenu() {
      this.menuVisible = !this.menuVisible

      const menuData = []
      menuData.push({
        idx: 0,
        subMenuStyle: {},
        text: this.getText('MRI_PA_KAPLAN_YEARS_LONG'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
        data: 'years',
      })
      menuData.push({
        idx: 1,
        subMenuStyle: {},
        text: this.getText('MRI_PA_KAPLAN_MONTHS_LONG'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
        data: 'months',
      })
      menuData.push({
        idx: 2,
        subMenuStyle: {},
        text: this.getText('MRI_PA_KAPLAN_WEEKS_LONG'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
        data: 'weeks',
      })
      menuData.push({
        idx: 3,
        subMenuStyle: {},
        text: this.getText('MRI_PA_KAPLAN_DAYS_LONG'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
        data: 'days',
      })
      this.menuData = menuData
    },
    closeMenu() {
      this.menuVisible = false
    },
  },
  components: {
    DropDownMenu,
  },
}
</script>
