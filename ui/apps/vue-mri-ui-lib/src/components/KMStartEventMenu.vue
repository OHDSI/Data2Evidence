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
  name: 'kmStartEventMenu',
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
    ...mapGetters(['getChartProperty', 'getChartableFilterCards', 'getText']),
    chartPropertyModel() {
      return this.getChartProperty(Constants.MRIChartProperties.KMStartEvent)
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
      const chartableFilterCard = this.getChartableFilterCards
      let text = ''
      let filterCardName = ''
      let occurenceText = ''
      let isChartable = false
      if (chartPropertyModel && chartPropertyModel.props && chartPropertyModel.props.value) {
        if (chartPropertyModel.props.value.kmStartEventOccurence) {
          chartableFilterCard.forEach(filterCard => {
            if (
              !filterCard.excludeFilter &&
              filterCard.id !== 'patient' &&
              filterCard.id === chartPropertyModel.props.value.kmEventIdentifier
            ) {
              filterCardName = filterCard.name
              isChartable = true
            }
          })
          if (isChartable) {
            if (chartPropertyModel.props.value.kmStartEventOccurence === 'start_before_end') {
              occurenceText = this.getText('MRI_PA_KAPLAN_START_EVENT_LAST_OCCURRENCE_LABEL')
            } else {
              occurenceText = this.getText('MRI_PA_KAPLAN_END_EVENT_FIRST_OCCURRENCE_LABEL')
            }
            text = `${filterCardName} - ${occurenceText}`
          } else {
            occurenceText = ''
            text = this.getText('MRI_PA_KAPLAN_DOB')
          }
        } else {
          text = this.getText('MRI_PA_KAPLAN_DOB')
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
          id: Constants.MRIChartProperties.KMStartEvent,
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
            },
          })
          subMenu.push({
            ...lastOccurenceMenu,
            data: {
              kmEventIdentifier: filterCard.id,
              kmStartEventOccurence: 'start_before_end',
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
        },
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
