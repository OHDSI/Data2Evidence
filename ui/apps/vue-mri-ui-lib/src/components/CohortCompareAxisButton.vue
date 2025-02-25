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
        v-bind:title="propertyDisplay.axisPropertyTooltip"
        :disabled="!isActive"
      >
        <span class="axisMenuText">{{ propertyDisplay.axisPropertyText }}</span>
        <span class="axisMenuSubText" v-if="propertyDisplay.axisAttrText">{{ propertyDisplay.axisAttrText }}</span>
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
  name: 'cohortCompareAxisButton',
  props: {
    axisProps: {
      type: Object,
      default() {
        return {
          chart: '',
          type: '',
          order: 0,
          icon: '',
          iconFamily: 'app-MRI-icons',
          isCategory: false,
          isMeasure: false,
          active: false,
          layoutLeft: 0,
          layoutTop: 0,
          layoutBottom: 0,
          axisPropertyTooltip: '',
          axisPropertyText: '',
          axisAttrText: '',
        }
      },
    },
  },
  data() {
    return {
      menuData: [],
      menuVisible: false,
      menuButton: null,
      axisProperties: this.axisProps,
      icon: this.axisProps.icon,
      iconFamily: this.axisProps.iconFamily,
      isActive: this.axisProps.active,
      menuOpenParam: 'clear',
      axisText: {},
    }
  },
  watch: {
    'axisProps.chart'(val) {
      this.axisText = {
        axisPropertyTooltip: this.axisProps.axisPropertyTooltip,
        axisPropertyText: this.axisProps.axisPropertyText,
        axisAttrText: this.axisProps.axisAttrText,
      }
    },
  },
  mounted() {
    this.$nextTick(() => {
      window.addEventListener('click', this.closeSubMenu)
    })

    this.axisText = {
      axisPropertyTooltip: this.axisProperties.axisPropertyTooltip,
      axisPropertyText: this.axisProperties.axisPropertyText,
      axisAttrText: this.axisProperties.axisAttrText,
    }
    this.menuButton = this.$refs.menuButton
  },
  beforeDestroy() {
    window.removeEventListener('click', this.closeSubMenu)
  },
  computed: {
    ...mapGetters(['getMriFrontendConfig', 'getText']),
    componentStyle() {
      const axisProps = this.axisProps
      const result: any = {
        position: 'absolute',
      }
      if (axisProps) {
        if (axisProps.layoutLeft) {
          result.left = `${axisProps.layoutLeft}px`
        }
        if (axisProps.layoutTop) {
          result.top = `${axisProps.layoutTop}px`
        }
        if (axisProps.layoutBottom) {
          result.bottom = `${axisProps.layoutBottom}px`
        }
      }
      return result
    },
    propertyDisplay() {
      const axisModel = this.axisProperties

      if (this.isActive && !this.axisText.axisPropertyTooltip) {
        return {
          axisPropertyTooltip: '',
          axisPropertyText: this.getText('MRI_PA_CHART_AXIS_PLACEHOLDER'),
          axisAttrText: '',
        }
      } else if (!this.isActive && !this.axisText.axisPropertyTooltip) {
        return {
          axisPropertyTooltip: '',
          axisPropertyText: this.getText('MRI_COMP_COHORT_AXIS_BUTTON'),
          axisAttrText: '',
        }
      } else if (this.axisText) {
        return this.axisText
      }
    },
  },
  methods: {
    closeSubMenu(event) {
      if (this.menuVisible && !this.$refs.menuButtonWrapper.contains(event.target)) {
        this.closeMenu()
      }
    },

    toggleMenu(event) {
      const sourceEvent = event || window.event
      this.menuVisible = !this.menuVisible

      const aMenuItems = []
      let aSubMenu = []
      const configFilterCards = this.getMriFrontendConfig.getFilterCards()
      let menuIdx = 0
      const moreMenuData = []

      let moreMenuIdx = 0
      moreMenuData.push({
        idx: moreMenuIdx,
        subMenuStyle: {},
        text: this.getText('MRI_PA_MENUITEM_MORE_FILTERCARDS_TITLE'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        isTitle: true,
      })
      moreMenuIdx += 1
      configFilterCards.forEach(filterCard => {
        const attributesMenu = []

        let aSubidx = 0
        filterCard.aAllAttributes.forEach(attribute => {
          if (
            (this.axisProps.isMeasure && attribute.oInternalConfigAttribute.measure) ||
            (this.axisProps.isCategory && attribute.oInternalConfigAttribute.category)
          ) {
            attributesMenu.push({
              idx: aSubidx,
              subMenuStyle: {},
              text: attribute.oInternalConfigAttribute.name,
              hasSubMenu: false,
              isSeperator: false,
              subMenu: [],
              disabled: false,
              data: {
                attributeName: attribute.oInternalConfigAttribute.name,
                filterName: filterCard.oInternalConfigFilterCard.name,
                attributeConfig: attribute.sConfigPath,
                filterConfig: filterCard.sConfigPath,
              },
            })
            aSubMenu = attributesMenu
            aSubidx += 1
          }
        })
        let selectionName = ''
        if (filterCard.oInternalConfigFilterCard.name) {
          selectionName = filterCard.oInternalConfigFilterCard.name
          moreMenuData.push({
            idx: moreMenuIdx,
            subMenuStyle: {},
            text: selectionName,
            hasSubMenu: true,
            isSeperator: false,
            subMenu: aSubMenu,
            isTitle: false,
            data: filterCard.oInternalConfigFilterCard.name,
          })
          moreMenuIdx += 1
        } else {
          selectionName = this.getText('MRI_PA_FILTERCARD_TITLE_BASIC_DATA')
          aMenuItems.push({
            idx: menuIdx,
            subMenuStyle: {},
            text: selectionName,
            hasSubMenu: true,
            isSeperator: false,
            subMenu: aSubMenu,
            isTitle: false,
            data: filterCard.oInternalConfigFilterCard.name,
          })
          menuIdx += 1
        }
      })
      aMenuItems.push({
        idx: menuIdx,
        subMenuStyle: {},
        text: this.getText('MRI_COMP_COHORT_AXIS_BUTTON_MORE'),
        hasSubMenu: true,
        isSeperator: false,
        subMenu: moreMenuData,
        isTitle: true,
      })

      if (!this.axisProps.isMeasure) {
        menuIdx += 1

        aMenuItems.push({
          idx: menuIdx,
          subMenuStyle: {},
          text: this.getText('MRI_PA_MENUITEM_NONE'),
          hasSubMenu: false,
          isSeperator: false,
          subMenu: [],
          disabled: false,
          data: { action: 'clear' },
        })
      }
      this.menuData = aMenuItems
    },
    closeMenu() {
      this.menuOpenParam = 'clear'
      this.menuVisible = false
    },
    handleClick({ attributeName, filterName, attributeConfig, filterConfig }) {
      if (!filterName && attributeName) {
        filterName = this.getText('MRI_PA_FILTERCARD_TITLE_BASIC_DATA')
      } else if (!filterName && !attributeName) {
        filterName = this.getText('MRI_PA_CHART_AXIS_PLACEHOLDER')
      }

      this.axisText = {
        axisPropertyTooltip: filterName + ' - ' + attributeName,
        axisPropertyText: filterName,
        axisAttrText: attributeName,
      }

      const val = {
        type: this.axisProps.type,
        order: this.axisProps.order,
        configname: attributeConfig,
        text: this.axisText,
      }
      this.$emit('selectEv', val)
      this.closeMenu()
    },
  },
  components: {
    DropDownMenu,
  },
}
</script>
