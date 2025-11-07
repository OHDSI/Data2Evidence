<template>
  <div class="axis-menu-button-wrapper kmControlComponent" v-bind:style="componentStyle">
    <div class="buttonWrapper" ref="menuButtonWrapper">
      <button
        class="kmMenuButton"
        ref="menuButton"
        v-click-focus
        v-on:click="toggleMenu"
        v-bind:title="propertyDisplay.chartPropertyTooltip"
      >
        <span class="kmMenuText">{{ propertyDisplay.chartPropertyText }}</span>
        <span class="kmMenuSubtext">{{ propertyDisplay.chartPropertySubtext }}</span>
        <span class="kmMenuButtonIcon"></span>
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
  name: 'kmEndEventMenu',
  props: ['kmEventChangeEv'],
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
    ...mapGetters(['getChartProperty', 'getMriFrontendConfig', 'getText']),
    chartPropertyModel() {
      return this.getChartProperty(Constants.MRIChartProperties.KMEndEvent)
    },
    componentStyle() {
      const chartPropertyModel = this.chartPropertyModel
      const result: any = {
        // position: 'absolute',
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
    propertyDisplay() {
      const chartPropertyModel = this.chartPropertyModel
      let text = ''
      let occurenceText = ''
      let filterCardName = ''
      if (chartPropertyModel && chartPropertyModel.props && chartPropertyModel.props.value) {
        if (chartPropertyModel.props.value.kmEndEventOccurence) {
          filterCardName = chartPropertyModel.props.value.kmEndEventIdentifier
          const configFilterCards = this.getMriFrontendConfig.getFilterCards()
          configFilterCards.forEach(filterCard => {
            if (
              !filterCard.excludeFilter &&
              filterCard.sConfigPath !== 'patient' &&
              filterCard.sConfigPath === chartPropertyModel.props.value.kmEndEventIdentifier
            ) {
              filterCardName = filterCard.oInternalConfigFilterCard.name
            }
          })
          if (chartPropertyModel.props.value.kmEndEventOccurence === 'end_max') {
            occurenceText = this.getText('MRI_PA_KAPLAN_END_EVENT_LAST_OCCURRENCE_LABEL')
          } else {
            occurenceText = this.getText('MRI_PA_KAPLAN_END_EVENT_FIRST_OCCURRENCE_LABEL')
          }
          text = `${filterCardName} - ${occurenceText}`
        } else {
          text = this.getText('MRI_PA_KAPLAN_DOD')
        }
        return {
          chartPropertyText: filterCardName === '' ? text : filterCardName,
          chartPropertySubtext: occurenceText,
          chartPropertyTooltip: text,
        }
      }
      return {
        chartPropertyText: '',
        chartPropertySubtext: '',
        chartPropertyTooltip: '',
      }
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
          id: Constants.MRIChartProperties.KMEndEvent,
          props: { value: arg },
        })
        this.closeMenu()
        this.$emit('kmEventChangeEv')
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
        },
      })
      menuIdx += 1

      configFilterCards
        .filter(
          filterCard =>
            this.getMriFrontendConfig._internalConfig.chartOptions.km.selectedEndInteractions.indexOf(
              filterCard.sConfigPath
            ) > -1
        )
        .forEach(filterCard => {
          if (!filterCard.excludeFilter && filterCard.sConfigPath !== 'patient') {
            const subMenu = []
            subMenu.push({
              ...firstOccurenceMenu,
              data: {
                kmEndEventIdentifier: filterCard.sConfigPath,
                kmEndEventOccurence: 'end_min',
              },
            })
            subMenu.push({
              ...lastOccurenceMenu,
              data: {
                kmEndEventIdentifier: filterCard.sConfigPath,
                kmEndEventOccurence: 'end_max',
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
