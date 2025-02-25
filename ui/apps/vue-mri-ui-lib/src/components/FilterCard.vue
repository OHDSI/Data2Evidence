<template>
  <div
    v-bind:class="['FilterCard', cssClass, this.isNew && !this.isBasic ? 'MriPaFilterCardNew' : '']"
    @click="onFiltercardClick"
  >
    <!--Filtercard rename messageBox-->
    <messageBox messageType="custom" @close="cancel" :busy="busy" v-if="renameModal.show">
      <template v-slot:header>{{ getText('MRI_PA_FILTERCARD_RENAME_DIALOG_TITLE') }}</template>
      <template v-slot:body>
        <div>
          <div>{{ getText('MRI_PA_FILTERCARD_RENAME_DIALOG_TEXT') }}</div>
          <input class="form-control" type="text" v-model="renameModal.text" />
        </div>
      </template>
      <template v-slot:footer>
        <div class="flex-spacer"></div>
        <appButton
          :click="openRenameDialog"
          :text="getText('MRI_PA_FILTERCARD_RENAME_DIALOG_CANCEL_BUTTON')"
          v-focus
        ></appButton>
        <appButton :click="onRenameSubmit" :text="getText('MRI_PA_FILTERCARD_RENAME_DIALOG_BUTTON')"></appButton>
      </template>
    </messageBox>
    <b-card v-bind:class="getClasses()">
      <template v-slot:header>
        <div class="d-flex" role="tab">
          <button
            v-if="!isBasic && showBooleanCondition"
            class="btn btn-sm btn-boolean-toggle"
            @click="toggleBooleanCondition"
          >
            {{ getText(boolConditionText) }}
            <appIcon icon="synchronize"></appIcon>
          </button>
          <div class="mr-auto card-header-left">
            <button
              class="btn btn-link btn-sm btn-collapse"
              @click="showCollapse = !showCollapse"
              :class="showCollapse ? 'collapsed' : 'null'"
              :aria-controls="id"
              :aria-expanded="showCollapse ? 'true' : 'false'"
            >
              <appIcon icon="slimArrowDown" v-if="showCollapse"></appIcon>
              <appIcon icon="slimArrowRight" v-if="!showCollapse"></appIcon>
            </button>
            <label>{{ name }}</label>
            <b-badge v-if="displayShowCohortEntryExit" variant="light" class="ml-2 filter-card-badge">{{ entryExitLabel }}</b-badge>
            <span v-show="isDisabled" class="card-help-button" @click="openHelp">
              <appIcon icon="information"></appIcon>
            </span>
          </div>
          <div>
            <!-- filter card context menu -->
            <b-dropdown variant="link" size="sm" class="btn-filtercard-menu" no-caret>
              <template v-slot:button-content>
                <appIcon
                  icon="menu"
                  :title="getText('MRI_PA_TOOLTIP_FILTERCARD_MOREMENU_BUTTON')"
                  style="margin-right: 16px"
                ></appIcon>
              </template>
              <!-- operations -->
              <div class="dropdown-scroll" :style="dropdownScrollStyle">
                <template v-for="item in moreButtonMenuOperations" :key="item">
                  <b-dropdown-item @click="onMoreMenuItemSelected(item)">{{ item.text }}</b-dropdown-item>
                </template>

                <div class="dropdown-divider"></div>
                <!-- attributes -->
                <b-form-checkbox-group stacked v-model="checkedAttributes" :text-field="text">
                  <template v-for="item in moreButtonMenuAttributes" :key="item">
                    <div class="dropdown-item bg-white text-body" :style="dropdownItemStyle">
                      <b-form-checkbox :value="item.value">{{ item.text }}</b-form-checkbox>
                    </div>
                  </template>
                </b-form-checkbox-group>

                <div v-if="moreButtonMenuTimeOperations.length > 0" class="dropdown-divider"></div>
                <!-- time -->
                <template v-for="item in moreButtonMenuTimeOperations" :key="item">
                  <b-dropdown-item class="dropdown-item bg-white text-body" @click="onMoreMenuItemSelected(item)">
                    <b-form-checkbox :checked="isChecked(item)">{{ item.text }}</b-form-checkbox>
                  </b-dropdown-item>
                </template>

                <div v-if="moreButtonMenuExcludeOperation.length > 0" class="dropdown-divider"></div>
                <!-- exclude -->
                <template v-for="item in moreButtonMenuExcludeOperation" :key="item">
                  <b-dropdown-item @click="onMoreMenuItemSelected(item)">
                    <b-form-checkbox :checked="isChecked(item)">{{ item.text }}</b-form-checkbox>
                  </b-dropdown-item>
                </template>
              </div>
            </b-dropdown>
          </div>
        </div>
      </template>
      <b-collapse :id="id" role="tabpanel" v-model="showCollapse" class="body-collapse">
        <div class="row">
          <div class="col">
            <!-- attributes -->
            <template v-for="item in constraints" :key="item">
              <constraint
                :id="item"
                :parent-name="name"
                v-on:enable-filtercard="enableFilterCard"
                v-on:disable-filtercard="disableFilterCard"
              ></constraint>
            </template>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <!-- advance time -->
            <advancedtime
              v-if="displayAdvanceTime"
              :advancedTimeLayout="filterCardModel.props.layout.advancedTimeLayout"
              :filterCardId="id"
              :parentId="parentId"
              :filterCardName="name"
            ></advancedtime>
          </div>
        </div>
        <dialogBox
          v-if="showHelpPopover"
          :position="helpPosition"
          :dialogWidth="'380px'"
          @close="showHelpPopover = false"
        >
          <template v-slot:header>{{ dialogContent.header }}</template>
          <template v-slot:body>
            <div class="helpDialogBox">
              <span>{{ dialogContent.text }}</span>
            </div>
          </template>
        </dialogBox>
      </b-collapse>
    </b-card>
  </div>
</template>
<script lang="ts">
import { mapActions, mapGetters, mapMutations } from 'vuex'
import { FILTERCARD_REMOVE_NEW_STATE } from '../store/mutation-types'
import appButton from '../lib/ui/app-button.vue'
import appLabel from '../lib/ui/app-label.vue'
import appIcon from '../lib/ui/app-icon.vue'
import messageBox from './MessageBox.vue'
import constraint from './Constraint.vue'
import advancedtime from './AdvancedTime.vue'
import dialogBox from './DialogBox.vue'

const operationsMenu = ['rename', 'close', 'clear']

interface IMenuItemType {
  text: string
  tooltip?: string
  key: string
  constraintId?: string
  icon?: string
}

const defaultProps = {
  displayAdvanceTime: false,
  renameModal: {
    text: '',
    show: false,
  },
  isDisabled: false,
  showHelpPopover: false,
  helpPosition: {
    left: '',
    bottom: '',
  },
  dialogContent: {
    header: '',
    text: '',
  },
}

export default {
  name: 'filtercard',
  props: ['id', 'parentId', 'cssClass', 'showBooleanCondition'],
  data() {
    return {
      ...JSON.parse(JSON.stringify(defaultProps)),
      showCollapse: true,
      dropdownScrollStyle: {},
      dropdownItemStyle: {},
    }
  },
  mounted() {
    this.displayAdvanceTime =
      this.filterCardModel.props.hasOwnProperty('layout') &&
      this.filterCardModel.props.layout.hasOwnProperty('advancedTimeLayout') &&
      this.filterCardModel.props.layout.advancedTimeLayout.props.timeFilterModel.timeFilters.length > 0
  },
  watch: {
    getHasAssignedConfig(oldValue, newValue) {
      if (newValue !== oldValue) {
        this.displayAdvanceTime = false
      }
    },
    getSplitterWidth: {
      handler(width) {
        this.dropdownScrollStyle = {
          width: `${width - 25}px`,
          maxWidth: '400px',
          overflowX: 'hidden',
        }
        this.dropdownItemStyle = {
          width: `${width - 25}px`,
          whiteSpace: 'normal',
        }
      },
      immediate: true,
    },
    'renameModal.show': {
      immediate: true,
      handler(value) {
        this.$emit('renameModalShown', value)
      },
    },
  },
  computed: {
    ...mapGetters([
      'getText',
      'getFilterCard',
      'getFilterCardConstraints',
      'getMriFrontendConfig',
      'getHasAssignedConfig',
      'getNewCardStates',
      'getSplitterWidth',
    ]),
    isNew() {
      return this.getNewCardStates[this.id]
    },
    boolConditionText() {
      let text
      switch (this.filterCardModel.props.op) {
        case 'AND':
          text = 'MRI_PA_AND'
          break
        case 'OR':
          text = 'MRI_PA_OR'
          break
      }
      return text
    },
    checkedAttributes: {
      get() {
        return this.filterCardModel.props.constraints
      },
      set(newList: string[]) {
        if (newList.length === this.checkedAttributes.length) {
          return
        }
        // an attribute  was removed
        if (newList.length < this.checkedAttributes.length) {
          const constraintId = this.checkedAttributes.filter(i => newList.indexOf(i) < 0)[0]
          this.deleteFilterCardConstraint({
            constraintId,
            filterCardId: this.id,
          })
        } else {
          // an attribute was checked
          const key = newList.filter(i => this.checkedAttributes.indexOf(i) < 0)[0]
          this.addFilterCardConstraint({ key, filterCardId: this.id })
        }
      },
    },
    isExcluded() {
      return this.filterCardModel.props.excludeFilter
    },
    isBasic() {
      return this.filterCardModel.props.key === 'patient'
    },
    moreButtonMenuOperations() {
      const menu: IMenuItemType[] = [
        {
          text: this.getText('MRI_PA_FILTERCARD_CLEAR_CONSTRAINTS_BTN_LABEL'),
          icon: 'app-icon://eraser',
          tooltip: this.getText('MRI_PA_TOOLTIP_FILTERCARD_CLEAR_CONSTRAINTS_BUTTON'),
          key: 'clear',
        },
        {
          text: this.getText('MRI_PA_FILTERCARD_RENAME'),
          tooltip: this.getText('MRI_PA_FILTERCARD_RENAME'),
          icon: 'app-icon://edit',
          key: 'rename',
        },
      ]

      if (this.filterCardModel.props.key !== 'patient') {
        menu.unshift({
          text: this.getText('MRI_PA_FILTERCARD_CLOSE_BTN_LABEL'),
          icon: 'app-icon://decline',
          tooltip: this.getText('MRI_PA_TOOLTIP_FILTERCARD_CLOSE_BUTTON'),
          key: 'close',
        })
      }
      return menu
    },
    moreButtonMenuTimeOperations() {
      const menu: IMenuItemType[] = []

      if (this.filterCardModel.props.allowParentConstraint) {
        const parentInteractionConfig =
          this.filterCardModel.props.filterCardConfig.oInternalConfigFilterCard.parentInteraction
        if (
          parentInteractionConfig &&
          parentInteractionConfig.possibleParent &&
          parentInteractionConfig.possibleParent.length > 0
        ) {
          const key = 'parentInteraction'
          const constraintId = this.constraints.find(c => c.split('.').pop() === key)
          menu.push({
            key,
            constraintId,
            text: parentInteractionConfig.parentLabel || this.getText('MRI_PA_FILTERCARD_CONSTRAINT_PARENT'),
          })
        }
      }

      // item for Advanced Time Filter
      menu.push({
        text: this.getText('MRI_PA_TEMPORAL_FILTER_ADVANCED_TIME_FILTER'),
        key: 'advancedTime',
      })

      return menu
    },
    moreButtonMenuExcludeOperation() {
      const menu: IMenuItemType[] = []
      if (this.filterCardModel.props.allowExcludeOption) {
        // item for exclusion filter
        menu.push({
          text: this.getText('MRI_PA_MENUITEM_EXCLUDE'),
          key: 'exclude',
        })
      }
      return menu
    },
    moreButtonMenuAttributes(): IMenuItemType[] {
      if (!this.filterCardModel.props.filterCardConfig) {
        return []
      }
      return this.filterCardModel.props.filterCardConfig.getFilterAttributes().map(oneConfigAttr => {
        const key = oneConfigAttr.getConfigKey()
        const constraintId = this.constraints.find(
          c => oneConfigAttr.getConfigPath() === this.getMriFrontendConfig.getGenericPath(c)
        )
        return {
          value: constraintId || key,
          key,
          constraintId,
          text: oneConfigAttr.getName(),
        }
      })
    },
    filterCardModel() {
      try {
        return this.getFilterCard(this.id)
      } catch (err) {
        return {
          props: {},
        }
      }
    },
    name() {
      return !this.filterCardModel.props.name && this.filterCardModel.props.key === 'patient'
        ? this.getText('MRI_PA_FILTERCARD_TITLE_BASIC_DATA')
        : this.filterCardModel.props.name
    },
    entryExitLabel() {
      return this.filterCardModel.props.isEntry ? this.getText('MRI_PA_CHART_ENTRY') : this.filterCardModel.props.isExit ? this.getText('MRI_PA_CHART_EXIT') : ""
    },
    constraints() {
      return this.filterCardModel.props.constraints
    },
    displayShowCohortEntryExit() {      
      return this.getMriFrontendConfig._internalConfig.panelOptions.cohortEntryExit
    }
  },
  methods: {
    ...mapMutations([FILTERCARD_REMOVE_NEW_STATE]),
    ...mapActions([
      'changeFilterCardName',
      'deleteFilterCard',
      'addFilterCardConstraint',
      'deleteFilterCardConstraint',
      'toggleExcludeFilterCard',
      'clearFilterCardTimeFilter',
      'clearAllConstraintsOfFilterCard',
      'toggleFilterBooleanCondition',
    ]),
    onFiltercardClick() {
      this[FILTERCARD_REMOVE_NEW_STATE](this.id)
    },
    isChecked({ key, icon }) {
      switch (key) {
        case 'exclude':
          return this.filterCardModel.props.excludeFilter
        case 'advancedTime':
          return this.displayAdvanceTime
        case 'parentInteraction':
          return this.constraints.find(c => c.split('.').pop() === key) !== undefined
        default:
          return icon === 'checked'
      }
    },
    onRenameSubmit() {
      this.changeFilterCardName({
        filterCardId: this.id,
        name: this.renameModal.text,
      })
      this.renameModal.show = false
    },
    openRenameDialog() {
      if (!this.renameModal.show) {
        this.renameModal.text = this.name
        this.renameModal.show = true
      } else {
        this.renameModal.text = ''
        this.renameModal.show = false
      }
    },
    onMoreMenuItemSelected({ key, constraintId }) {
      // if there already is a constraint for this attribute, we remove it otherwise we add it
      if (key === 'exclude') {
        this.toggleExcludeFilterCard({ filterCardId: this.id })
      } else if (key === 'advancedTime') {
        this.displayAdvanceTime = !this.displayAdvanceTime
        if (!this.displayAdvanceTime) {
          this.clearFilterCardTimeFilter({ filterCardId: this.id })
        }
      } else if (key === 'close') {
        this.deleteFilterCard({
          filterCardId: this.id,
        })
      } else if (key === 'clear') {
        this.clearAllConstraintsOfFilterCard({ filterCardId: this.id })
      } else if (key === 'rename') {
        this.openRenameDialog()
      } else if (this.getFilterCardConstraints(this.id).findIndex(fcconst => fcconst.props.attrKey === key) > -1) {
        this.deleteFilterCardConstraint({
          constraintId,
          filterCardId: this.id,
        })
      } else {
        this.addFilterCardConstraint({ key, filterCardId: this.id })
      }
    },
    enableFilterCard() {
      this.isDisabled = false
    },
    disableFilterCard() {
      this.isDisabled = true
    },
    getClasses() {
      return [this.isDisabled ? 'MriPaFilterCardDisabled' : '']
    },
    toggleBooleanCondition() {
      // TOGGLE Boolean Condition
      const filterCardOperator = this.filterCardModel.props.op
      this.toggleFilterBooleanCondition({
        filterCardId: this.id,
        operator: filterCardOperator,
        parentId: this.parentId,
      })
    },
    openHelp() {
      this.showHelpPopover = true
      this.helpPosition.bottom = `${window.innerHeight - this.$el.children[0].getBoundingClientRect().top}px`
      this.helpPosition.left = `${this.$el.children[0].getBoundingClientRect().left}px`

      this.dialogContent = {
        header: this.getText('MRI_PA_DISABLED_FC_HELP_HEADER'),
        text: this.getText('MRI_PA_DISABLED_FC_HELP_TEXT'),
      }
    },
  },
  components: {
    messageBox,
    appButton,
    appLabel,
    appIcon,
    constraint,
    advancedtime,
    dialogBox,
  },
}
</script>

<style scoped>
.filter-card-badge {
  color: #000080 !important;
}
</style>
