<template>
  <div class="axis-menu-button-wrapper" v-bind:style="componentStyle">
    <div class="iconWrapper">
      <label class="iconLabel">
        <span class="icon" v-bind:style="'font-family:' + iconFamily">{{ icon }}</span>
      </label>
    </div>
    <div class="buttonWrapper" ref="menuButtonWrapper">
      <button
        class="axisMenuButton"
        ref="menuButton"
        v-on:click="toggleMenu"
        v-bind:title="propertyDisplay.chartPropertyTooltip"
        tabindex="0"
      >
        <span class="axisMenuText">{{ propertyDisplay.chartPropertyText }}</span>
        <span class="axisMenuSubText">{{ propertyDisplay.chartPropertySortType }}</span>
        <span class="axisMenuButtonIcon"></span>
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
  name: 'cohortCompareSortButton',
  data() {
    return {
      menuData: [],
      menuVisible: false,
      menuButton: null,
      menuOpenParam: '',
      sortData: '',
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
    chartPropertyModel() {
      const sortButtonProps = {
        props: {
          layoutLeft: 0,
          layoutTop: 100,
          layoutBottom: '',
          icon: '',
          iconFamily: 'app-icons',
          active: true,
        },
      }
      return sortButtonProps
    },
    componentStyle() {
      const chartPropertyModel = this.chartPropertyModel
      const result: any = {
        position: 'absolute',
      }
      if (chartPropertyModel && chartPropertyModel.props) {
        if (chartPropertyModel.props.layoutLeft) {
          result.left = `${chartPropertyModel.props.layoutLeft}px`
        }
        if (chartPropertyModel.props.layoutTop) {
          result.top = `${chartPropertyModel.props.layoutTop}px`
        }
        if (chartPropertyModel.props.layoutBottom) {
          result.bottom = `${chartPropertyModel.props.layoutBottom}px`
        }
      }

      return result
    },
    icon() {
      const chartPropertyModel = this.chartPropertyModel
      if (chartPropertyModel && chartPropertyModel.props && chartPropertyModel.props.icon) {
        return chartPropertyModel.props.icon
      }
      return ''
    },
    iconFamily() {
      const chartPropertyModel = this.chartPropertyModel
      if (chartPropertyModel && chartPropertyModel.props && chartPropertyModel.props.iconFamily) {
        return chartPropertyModel.props.iconFamily
      }
      return ''
    },
    propertyDisplay() {
      let val = ''
      if (this.sortData && this.sortData.value) {
        val = this.sortData.value
      } else {
        val = 'MRI_PA_CHART_SORT_DEFAULT'
      }
      return {
        chartPropertyText: `${this.getText(val).split(' - ').shift()} -`,
        chartPropertySortType: this.getText(val).split(' - ').pop(),
        chartPropertyTooltip: this.getText(val),
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
    handleClick(arg) {
      this.propertyDisplay = {
        chartPropertyText: `${this.getText(arg).split(' - ').shift()} -`,
        chartPropertySortType: this.getText(arg).split(' - ').pop(),
        chartPropertyTooltip: this.getText(arg),
      }
      this.sortData = {
        type: 'sort',
        value: arg,
      }

      this.$emit('selectEv', this.sortData)
      this.closeMenu()
    },

    closeSubMenu(event) {
      if (this.menuVisible && !this.$refs.menuButtonWrapper.contains(event.target)) {
        this.closeMenu()
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

      const menuData = []
      menuData.push({
        idx: 0,
        subMenuStyle: {},
        text: this.getText('MRI_PA_CHART_SORT_DEFAULT'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
        data: 'MRI_PA_CHART_SORT_DEFAULT',
      })
      menuData.push({
        idx: 1,
        subMenuStyle: {},
        text: this.getText('MRI_PA_CHART_SORT_REVERSE'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
        data: 'MRI_PA_CHART_SORT_REVERSE',
      })
      menuData.push({
        idx: 2,
        subMenuStyle: {},
        text: this.getText('MRI_PA_CHART_SORT_ASCENDING'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
        data: 'MRI_PA_CHART_SORT_ASCENDING',
      })
      menuData.push({
        idx: 3,
        subMenuStyle: {},
        text: this.getText('MRI_PA_CHART_SORT_DESCENDING'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        disabled: false,
        data: 'MRI_PA_CHART_SORT_DESCENDING',
      })
      this.menuData = menuData
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
