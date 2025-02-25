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
  name: 'sortMenuButton',
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
    ...mapGetters(['getChartProperty', 'getText']),
    chartPropertyModel() {
      return this.getChartProperty(Constants.MRIChartProperties.Sort)
    },
    componentStyle() {
      const chartPropertyModel = this.chartPropertyModel
      const result: any = {
        position: 'absolute',
      }
      if (chartPropertyModel && chartPropertyModel.props) {
        if (chartPropertyModel.props.layoutLeft) {
          result.left = chartPropertyModel.props.layoutLeft
        }
        if (chartPropertyModel.props.layoutTop) {
          result.top = chartPropertyModel.props.layoutTop
        }
        if (chartPropertyModel.props.layoutBottom) {
          result.bottom = chartPropertyModel.props.layoutBottom
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
      const chartPropertyModel = this.chartPropertyModel
      if (chartPropertyModel && chartPropertyModel.props && chartPropertyModel.props.value) {
        return {
          chartPropertyText: `${this.getText(chartPropertyModel.props.value).split(' - ').shift()} -`,
          chartPropertySortType: this.getText(chartPropertyModel.props.value).split(' - ').pop(),
          chartPropertyTooltip: this.getText(chartPropertyModel.props.value),
        }
      }
      return {
        chartPropertyText: '',
        chartPropertySortType: '',
        chartPropertyTooltip: '',
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
    ...mapActions(['setChartPropertyValue']),
    closeSubMenu(event) {
      if (this.menuVisible && !this.$refs.menuButtonWrapper.contains(event.target)) {
        this.closeMenu()
      }
    },
    handleClick(arg) {
      if (arg) {
        this.setChartPropertyValue({
          id: Constants.MRIChartProperties.Sort,
          props: { value: arg },
        })
      }
      this.closeMenu()
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
