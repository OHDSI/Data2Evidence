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
        v-click-focus
        v-on:click="toggleAxisMenu"
        v-bind:title="axisDisplay.axisSelectionTooltip"
        tabindex="0"
      >
        <span class="axisMenuText" :class="[axisDisplay.isEmpty ? 'axisTextPlaceholder' : '']">{{
          axisDisplay.axisSelectionFilterText
        }}</span>
        <span class="axisMenuSubText" v-if="axisDisplay.axisSelectionAttrText">{{
          axisDisplay.axisSelectionAttrText
        }}</span>
        <span class="axisMenuButtonIcon"></span>
      </button>
      <dropDownMenu
        :target="menuButton"
        :parentContainer="parentContainer"
        :subMenu="axismenuData"
        :opened="axisMenuVisible"
        :openParam="axisMenuOpenParam"
        @clickEv="handleClick"
        @closeEv="closeAxisMenu"
      ></dropDownMenu>
    </div>
    <div class="binningWrapper" v-bind:class="{ hidden: !binningVisibility }">
      <binningButton
        :binningValue="binningValue"
        :parentBottom="parentBottomLocation"
        @updateBinningEv="setBinSize"
      ></binningButton>
    </div>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters, mapState, mapMutations } from 'vuex'
import { FILTERCARD_ADD_NEW_STATE } from '../store/mutation-types'
import BinningButton from './BinningButton.vue'
import DropDownMenu from './DropDownMenu.vue'

export default {
  name: 'axisMenuButton',
  props: ['dimensionIndex', 'parentContainer'],
  data() {
    return {
      axismenuData: [],
      axisMenuVisible: false,
      menuButton: null,
      axisMenuOpenParam: '',
      cachedBinValue: '',
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
    ...mapGetters(['getMriFrontendConfig', 'getChartableFilterCards', 'getAxis', 'getAllAxes', 'getText']),
    axisModel() {
      if (this.dimensionIndex || this.dimensionIndex === 0) {
        return this.getAxis(this.dimensionIndex)
      }
      return {}
    },
    componentStyle() {
      const axisModel = this.axisModel
      const result: any = {
        position: 'absolute',
      }
      if (axisModel && axisModel.props) {
        if (axisModel.props.layoutLeft) {
          result.left = axisModel.props.layoutLeft
        }
        if (axisModel.props.layoutTop) {
          result.top = axisModel.props.layoutTop
        }
        if (axisModel.props.layoutBottom) {
          result.bottom = axisModel.props.layoutBottom
        }
      }
      return result
    },
    icon() {
      const axisModel = this.axisModel
      if (axisModel && axisModel.props && axisModel.props.icon) {
        return axisModel.props.icon
      }
      return ''
    },
    iconFamily() {
      const axisModel = this.axisModel
      if (axisModel && axisModel.props && axisModel.props.iconFamily) {
        return axisModel.props.iconFamily
      }
      return ''
    },
    axisDisplay() {
      const axisModel = this.axisModel
      if (axisModel && axisModel.props && axisModel.props.filterCardId && axisModel.props.key) {
        const filterCard = this.getMriFrontendConfig.getFilterCardByInstanceId(axisModel.props.filterCardId)

        let filterCardName = filterCard.oInternalConfigFilterCard.name
        if (!filterCardName || filterCardName.indexOf('undefined') > -1) {
          filterCardName = this.getText('MRI_PA_FILTERCARD_TITLE_BASIC_DATA')
        }
        let filterCardCode = ''
        this.getChartableFilterCards.forEach(fCard => {
          if (fCard.instanceId === axisModel.props.filterCardId) {
            filterCardCode = fCard.name.replace(filterCardName, '').trim()
          }
        })

        if (filterCardCode) {
          filterCardCode = filterCardCode + ` - `
        }
        let attributeName = ''
        filterCard.aAllAttributes.forEach(attribute => {
          if (attribute.sConfigPath.split('.').pop() === axisModel.props.key) {
            attributeName = attribute.oInternalConfigAttribute.name
          }
        })

        return {
          axisSelectionTooltip: `${filterCardCode} ${filterCardName} - ${attributeName}`,
          axisSelectionFilterText: `${filterCardCode} ${filterCardName}`,
          axisSelectionAttrText: attributeName,
          isEmpty: false,
        }
      }
      return {
        axisSelectionFilterText: this.getText('MRI_PA_CHART_AXIS_PLACEHOLDER'), // "Select a Measure", --causing error maybe becuase it does not exist in all proerties file
        axisSelectionAttrText: '',
        axisSelectionTooltip: '',
        isEmpty: true,
      }
    },
    binningVisibility() {
      const axisModel = this.axisModel
      if (axisModel && axisModel.props && axisModel.props.filterCardId && axisModel.props.key) {
        const showBinning =
          this.getMriFrontendConfig.getAttributeByPath(axisModel.props.attributeId).isBinnable() &&
          this.axisModel.props.isCategory
        return showBinning
      }
      return false
    },
    binningValue() {
      const axisModel = this.axisModel
      if (this.cachedBinValue) {
        return this.cachedBinValue
      } else if (axisModel && axisModel.props && axisModel.props.filterCardId && axisModel.props.key) {
        const defaultBinningVal = this.getMriFrontendConfig
          .getAttributeByPath(axisModel.props.attributeId)
          .getDefaultBinSize()
        if (axisModel.props.binsize !== null && axisModel.props.binsize !== undefined) {
          this.cachedBinValue = `${axisModel.props.binsize}`
          return `${axisModel.props.binsize}`
        } else if (defaultBinningVal) {
          this.cachedBinValue = `${defaultBinningVal}`
          return `${defaultBinningVal}`
        } else {
          return ''
        }
      }
      return ''
    },
    parentBottomLocation() {
      if (this.$el && this.$el.parentElement && this.$el.parentElement.getBoundingClientRect()) {
        return this.$el.parentElement.getBoundingClientRect().bottom
      }
      return 0
    },
  },
  methods: {
    ...mapMutations([FILTERCARD_ADD_NEW_STATE]),
    ...mapActions([
      'setAxisValue',
      'clearAxisValue',
      'addNewFilterCardAndConstraint',
      'setNewAxisValue',
      'setFireRequest',
      'addFilterCardConstraint',
    ]),
    closeSubMenu(event) {
      if (this.axisMenuVisible && !this.$refs.menuButtonWrapper.contains(event.target)) {
        this.closeAxisMenu()
      }
    },
    handleClick({ action, filterCardId, key, attributeId, filterCardConfigPath, attributeConfigPath }) {
      switch (action) {
        case 'clear':
          this.clearSelection()
          break
        case 'addnew':
          this.addNewFilterCardAndConstraint({
            attributeConfigPath,
            key,
            configPath: filterCardConfigPath,
            axisId: this.dimensionIndex,
          }).then(() => {
            this[FILTERCARD_ADD_NEW_STATE](this.axisModel.props.filterCardId)
          })
          break
        case 'addexisting':
          // selected axis is already a chartable filtercard
          this.setNewAxisValue({
            id: this.dimensionIndex,
            props: {
              filterCardId,
              key,
              attributeId,
            },
          })
          this.addFilterCardConstraint({
            filterCardId,
            key,
          })

          break
        default:
          throw new Error(`${action} is not supported`)
      }

      this.closeAxisMenu()
    },
    toggleAxisMenu(event) {
      const sourceEvent = event || window.event

      const chartableFilterCards = this.getChartableFilterCards
      const selectedAttributes = this.getAllAxes.map(axis => ({
        filterCardId: axis.props.filterCardId,
        key: axis.props.key,
        active: axis.props.active,
      }))
      this.axisMenuVisible = !this.axisMenuVisible
      if (this.axisMenuVisible) {
        if (sourceEvent.clientX || sourceEvent.clientY) {
          this.axisMenuOpenParam = ''
        } else {
          this.$nextTick(() => {
            this.axisMenuOpenParam = 'firstItem'
          })
        }
      } else {
        this.axisMenuOpenParam = 'clear'
      }

      // Add "CURRENT FILTER CARDS"
      const menuData = []
      let menuIdx = 1
      menuData.push({
        idx: 0,
        subMenuStyle: {},
        text: this.getText('MRI_PA_MENUITEM_CURRENT_FILTERCARDS_TITLE'),
        hasSubMenu: false,
        isSeperator: false,
        subMenu: [],
        isTitle: true,
      })

      // Add Selected Filtercards
      chartableFilterCards.forEach(filterCard => {
        if (filterCard.excludeFilter) {
          return
        }
        const attributesMenu = []
        let attributeIndex = 0
        filterCard.attributes.forEach(attribute => {
          let disabled = false
          const attributeKey = attribute.sConfigPath.split('.').pop()
          selectedAttributes.forEach(sAttr => {
            if (sAttr.active && sAttr.filterCardId === filterCard.id && sAttr.key === attributeKey) {
              disabled = true
            }
          })
          if (
            (this.axisModel.props.isMeasure && attribute.measure) ||
            (this.axisModel.props.isCategory && attribute.category)
          ) {
            attributesMenu.push({
              disabled,
              idx: attributeIndex,
              subMenuStyle: {},
              text: attribute.name,
              hasSubMenu: false,
              isSeperator: false,
              subMenu: [],
              data: {
                action: 'addexisting',
                attributeId: attribute.attributeId,
                filterCardId: filterCard.id,
                key: attributeKey,
              },
            })
          }
          attributeIndex += 1
        })

        // Don't add filtercard if there are no attributes
        if (attributesMenu.length > 0) {
          menuData.push({
            idx: menuIdx,
            subMenuStyle: {},
            text:
              !filterCard.name && filterCard.configPath === 'patient'
                ? this.getText('MRI_PA_FILTERCARD_TITLE_BASIC_DATA')
                : filterCard.name,
            hasSubMenu: true,
            isSeperator: false,
            subMenu: attributesMenu,
          })
          menuIdx += 1
        }
      })

      menuData.push({ idx: menuIdx, hasSubMenu: false, isSeperator: true })
      menuIdx += 1

      // Add "More filter cards"
      let moreMenuIdx = 0
      const moremenuData: any[] = [
        {
          idx: moreMenuIdx,
          subMenuStyle: {},
          text: this.getText('MRI_PA_MENUITEM_MORE_FILTERCARDS_TITLE'),
          hasSubMenu: false,
          isSeperator: false,
          subMenu: [],
          isTitle: true,
        },
      ]
      const configFilterCards = this.getMriFrontendConfig.getFilterCards()
      configFilterCards.forEach(filterCard => {
        if (
          filterCard.sConfigPath !== 'patient' &&
          filterCard.getAttributesWithAnnotation('genomics_variant_location').length === 0
        ) {
          const attributesMenu = []
          let attributeIndex = 0
          filterCard.aAllAttributes.forEach(attribute => {
            if (
              (this.axisModel.props.isMeasure && attribute.oInternalConfigAttribute.measure) ||
              (this.axisModel.props.isCategory && attribute.oInternalConfigAttribute.category)
            ) {
              attributesMenu.push({
                idx: attributeIndex,
                subMenuStyle: {},
                text: attribute.oInternalConfigAttribute.name,
                hasSubMenu: false,
                isSeperator: false,
                subMenu: [],
                disabled: false,
                data: {
                  action: 'addnew',
                  filterCardConfigPath: filterCard.sConfigPath,
                  key: attribute.sConfigPath.split('.').pop(),
                  attributeConfigPath: attribute.sConfigPath,
                },
              })
            }
            attributeIndex += 1
          })
          // Don't add filtercard if there are no attributes
          if (attributesMenu.length > 0) {
            moremenuData.push({
              idx: (moreMenuIdx += 1),
              subMenuStyle: {},
              text: filterCard.oInternalConfigFilterCard.name,
              hasSubMenu: true,
              isSeperator: false,
              subMenu: attributesMenu,
            })
          }
        }
      })

      menuData.push({
        idx: menuIdx,
        subMenuStyle: {},
        text: this.getText('MRI_PA_MENUITEM_MORE'),
        hasSubMenu: true,
        isSeperator: false,
        subMenu: moremenuData,
        isTitle: true,
      })

      if (!this.axisModel.props.isMeasure) {
        menuData.push({
          idx: (menuIdx += 1),
          hasSubMenu: false,
          isSeperator: true,
        })
        menuData.push({
          idx: (menuIdx += 1),
          subMenuStyle: {},
          text: this.getText('MRI_PA_MENUITEM_NONE'),
          hasSubMenu: false,
          isSeperator: false,
          subMenu: [],
          disabled: false,
          data: { action: 'clear' },
        })
      }
      this.axismenuData = menuData
    },
    setBinSize(arg) {
      if (arg !== this.cachedBinValue) {
        this.cachedBinValue = arg
        this.binningValue = arg
        this.setAxisValue({
          id: this.dimensionIndex,
          props: { binsize: arg },
        })
        this.setFireRequest()
      }
    },
    clearSelection() {
      this.clearAxisValue(this.dimensionIndex)
      this.closeAxisMenu()
      this.setFireRequest()
    },
    closeAxisMenu() {
      this.axisMenuOpenParam = 'clear'
      this.axisMenuVisible = false
    },
  },
  components: {
    DropDownMenu,
    BinningButton,
  },
}
</script>
