<template>
  <div
    @focus="openControl"
    @click="openControl"
    tabindex="0"
    class="app-tag-input"
    ref="container"
    style="display: flex; flex-direction: row"
  >
    <multiselect
      size="sm"
      v-model="selectedValues"
      track-by="value"
      :hide-selected="true"
      :internal-search="false"
      @tag="addTag"
      :placeholder="placeHolder"
      @open="open"
      @close="close"
      @remove="remove"
      :show-labels="false"
      :tag-placeholder="tagPlaceHolder"
      :taggable="model.props.type !== 'conceptSet'"
      label="display_value"
      :options="filteredList"
      :multiple="true"
      :options-limit="optionLimitSize"
      :loading="isLoading"
      :close-on-select="false"
      @search-change="asyncFind"
      @input="updateValue"
      @select="openControl"
      :preserveSearch="true"
      ref="multiselect"
      :clear-on-select="false"
    >
      <template v-slot:option="props">{{ formatCustomOption(props.option) }}</template>
      <template v-slot:clear>
        <div class="multiselect__clear" v-if="selectedValues.length" @mousedown.prevent.stop="clearAll()">
          {{ getText('MRI_PA_FILTERCARD_CLEAR_ALL_BTN') }}
        </div>
      </template>
      <template v-slot:tag="props">
        <div :ref="props.option.value" class="multiselect__tags-wrap">
          <span
            tabindex="0"
            :class="getClass(props.option)"
            @keyup.right="tagNavHandler(props, $event)"
            @keyup.left="tagNavHandler(props, $event)"
            @click.stop.prevent="tagClickHandler(props)"
            @keydown.stop.prevent.delete="tagKeyUpHandler(props)"
          >
            <span>{{ props.option.display_value }}</span>
            <span v-if="model.props.type === 'conceptSet'"
              ><i
                aria-hidden="true"
                tabindex="1"
                @mousedown.stop.prevent="handleConceptSet(props.option)"
                style="margin-left: 15px"
              >
                <appIcon icon="lowerRightPencil"></appIcon> </i
            ></span>
            <i
              aria-hidden="true"
              tabindex="1"
              class="multiselect__tag-icon"
              @mousedown.stop.prevent="props.remove(props.option)"
            ></i>
          </span>
        </div>
      </template>
      <template v-slot:caret="{ toggle }">
        <span class="arrow" @mousedown.prevent.stop="toggle">
          <appIcon icon="slimArrowDown" class="icon" />
        </span>
      </template>
    </multiselect>
    <div v-if="model.props.type === 'conceptSet'">
      <d4l-button
        class="unicode-icon"
        text="+"
        :title="getText('MRI_PA_TOOLTIP_CREATE_CONCEPT_SET')"
        style="--border-radius-button: 9999px; margin-left: 8px; margin-right: 0px"
        @mousedown.stop.prevent="handleConceptSet()"
      />
    </div>
  </div>
</template>
<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import appIcon from './app-icon.vue'

const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g
function escapeStringRegExp(str) {
  return str.replace(matchOperatorsRe, '\\$&')
}

export default {
  name: 'app-tag-input',
  props: ['model', 'isCatalogAttribute'],
  data() {
    return {
      searchQuery: '',
      newTags: [],
      placeHolder: '',
      tagPlaceHolder: '',
      optionLimitSize: 200, // default value if no value is set in the PA config
      selectedValuesTimeout: null,
      isLoading: false,
    }
  },
  mounted() {
    this.placeHolder = this.getText('MRI_PA_INPUT_PLACEHOLDER_ALL')
    this.tagPlaceHolder = this.getText('MRI_PA_TOO_MANY_VALUES')
  },
  watch: {
    myDomainValues(newVal, oldVal) {
      if (newVal.isLoading !== oldVal.isLoading && !newVal.isLoading) {
        this.isLoading = false
        this.tagPlaceHolder = ''
      }
    },
    selectedValues(newVal) {
      if (this.selectedValues.length) {
        this.placeHolder = this.getText('MRI_PA_ENTER_SEARCH_TERM')
      } else {
        this.placeHolder = this.getText('MRI_PA_INPUT_PLACEHOLDER_ALL')
      }
    },
  },
  computed: {
    ...mapGetters(['getDomainValues', 'getConstraint', 'getText', 'getMriFrontendConfig', 'getSelectedDataset']),
    myDomainValues() {
      return this.getDomainValues(this.attributePathUid)
    },
    filteredList() {
      // get limit size from config
      const configLimit = this.getMriFrontendConfig._internalConfig.panelOptions.domainValuesLimit
      if (configLimit) {
        this.optionLimitSize = configLimit
      }
      const regex = new RegExp(escapeStringRegExp(this.searchQuery), 'gi')
      const list = [...this.myDomainValues.values, ...this.newTags]
      const updatedList = []
      if (this.isLoading) {
        this.tagPlaceHolder = this.getText('MRI_PA_LOADING_SUGGESTIONS')
      } else if (this.myDomainValues.loadedStatus === 'TOO_MANY_RESULTS') {
        this.tagPlaceHolder = this.getText('MRI_PA_TOO_MANY_VALUES')
      } else if (this.myDomainValues.loadedStatus === 'HAS_RESULTS') {
        const formattedValues = this.formatValues(list)
        updatedList.push(...formattedValues)
      } else if (this.myDomainValues.loadedStatus === 'NO_RESULTS') {
        this.tagPlaceHolder = this.getText('MRI_PA_NO_SUGGESTIONS')
      }
      return updatedList
    },
    inputOptions() {
      return this.options
    },
    selectedValues() {
      return this.formatValues(this.getConstraint(this.model.id).props.value)
    },
    attributePathUid() {
      return `${this.model.props.attributePath}__${this._uid}`
    },
  },
  methods: {
    ...mapActions(['loadValuesForAttributePath', 'updateConstraintValue']),
    remove(removedOption, id) {
      this.removeFromNewTags(removedOption.value)
    },
    async openControl() {
      // IE11 Workaround as the input field does not open up when clicking the multiselect control.
      await this.$nextTick()
      this.$refs.multiselect.activate()
      this.$refs.multiselect.$refs.search.focus()
    },
    toggleFocus() {
      this.$refs.multiselect.$el.querySelector('div.multiselect__tags').classList.toggle('MriHilite')
    },
    tagNavHandler(props, event) {
      const t = event.target
      let to = event.target
      if (event.code === 'ArrowRight' || event.keyCode === 39) {
        const nextItemIndex =
          this.selectedValues.findIndex(v => {
            return v.value === props.option.value
          }) + 1
        if (nextItemIndex < this.selectedValues.length) {
          const prevRefId = this.selectedValues[nextItemIndex].value
          this.$refs[prevRefId].firstChild.focus()
        }
      }
      if (event.code === 'ArrowLeft' || event.keyCode === 37) {
        to = t.previousElement
        const prevItemIndex =
          this.selectedValues.findIndex(v => {
            return v.value === props.option.value
          }) - 1
        if (prevItemIndex >= 0) {
          const prevRefId = this.selectedValues[prevItemIndex].value
          this.$refs[prevRefId].firstChild.focus()
        }
      }
    },
    formatCustomOption(option) {
      if (this.model.props.type === 'conceptSet') {
        if (option.isTag) {
          return 'Please select or create a concept set'
        }
        return `${option.text} - ${option.value}`
      }
      let label = ''
      if (option.isTag) {
        return option.label
      }
      if (option.value) {
        label += option.value
        if (option.text) {
          label += ` - ${option.text}`
        }
      }
      return label
    },
    formatValues(values) {
      return values.map(elem => {
        const displayValue = elem.text || elem.value
        elem.display_value = displayValue.replace('</b>', '').replace('<b>', '')
        return elem
      })
    },
    open() {
      this.placeHolder = this.getText('MRI_PA_ENTER_SEARCH_TERM')
      this.asyncFind(this.searchQuery)
    },
    close() {
      if (this.selectedValues.length) {
        this.placeHolder = this.getText('MRI_PA_ENTER_SEARCH_TERM')
      } else {
        this.placeHolder = this.getText('MRI_PA_INPUT_PLACEHOLDER_ALL')
      }
    },
    addTag(newTag) {
      // Only allow concept sets to be chosen from list, or created
      if (this.model.props.type === 'conceptSet') {
        return
      }
      if (newTag.length > 0) {
        const addThis = {
          text: newTag,
          value: newTag,
          hidden: true,
        }
        this.newTags.push(addThis)
        this.updateValue([...this.model.props.value, addThis])
        }
    },
    updateValue(value) {
      const payload = {
        value,
        constraintId: this.model.id,
      }
      this.updateConstraintValue(payload)
    },
    asyncFind(searchQuery) {
      if (this.searchQuery !== searchQuery) {
        this.searchQuery = searchQuery
        this.loadDomainValues()
      }
    },
    loadDomainValues() {
      if (this.selectedValuesTimeout) {
        clearInterval(this.selectedValuesTimeout)
      }
      this.isLoading = true
      const INPUT_WAIT_TIME_MS = 600
      this.selectedValuesTimeout = setTimeout(() => {
        this.loadValuesForAttributePath({
          attributePathUid: this.attributePathUid,
          searchQuery: this.searchQuery,
          attributeType: this.model.props.type,
        })
      }, INPUT_WAIT_TIME_MS)
    },
    getClass(item) {
      const classes = ['multiselect__tag']
      const dataMatchFound = this.myDomainValues.values.find(
        o => o.value === item.value && o.display_value === item.display_value
      )
      if (this.isCatalogAttribute || this.model.props.type === 'conceptSet') {
        item.hidden ? classes.push('MriPaTagElementInvalid') : classes.push('MriPaTagElementValid')
      } else {
        dataMatchFound ? classes.push('MriPaTagElementValidWithData') : classes.push('MriPaTagElementValidNoData')
      }
      return classes
    },
    clearAll() {
      this.updateValue([])
      this.placeHolder = this.getText('MRI_PA_INPUT_PLACEHOLDER_ALL')
    },
    handleConceptSet(values?: { value?: string }) {
      const { domainFilter, standardConceptCodeFilter } = this.model.props
      const conceptSetId = values?.value
      const defaultFilters = [
        { id: 'domainId', value: domainFilter ? [domainFilter] : [] },
        { id: 'concept', value: standardConceptCodeFilter ? [standardConceptCodeFilter] : [] },
      ]
      const event = new CustomEvent<{ props: TerminologyProps }>('alp-terminology-open', {
        detail: {
          props: {
            selectedDatasetId: this.getSelectedDataset.id,
            selectedConceptSetId: conceptSetId,
            mode: 'CONCEPT_SET',
            onClose: onCloseValues => {
              // No action to do if no concept set is being created
              if (!onCloseValues?.currentConceptSet) {
                return
              }
              if (conceptSetId) {
                // Force reload of data in case concept set has changed
                const newName = onCloseValues.currentConceptSet.name
                const index = this.model.props.value.findIndex(constraint => constraint.value === conceptSetId)
                this.model.props.value[index].text = newName
                this.model.props.value[index].display_name = newName
                this.updateValue([...this.model.props.value])
                return
              }

              const addThis = {
                text: onCloseValues.currentConceptSet.name,
                display_value: onCloseValues.currentConceptSet.name,
                value: onCloseValues.currentConceptSet.id,
              }
              this.newTags.push(addThis)
              this.updateValue([...this.model.props.value, addThis])
            },
            defaultFilters,
          },
        },
      })
      window.dispatchEvent(event)
    },
    tagClickHandler(props) {
      this.$refs.multiselect.$refs.search.blur()
      if (this.$refs.hasOwnProperty(props.option.value)) {
        this.$refs[props.option.value].firstChild.focus()
      }
      if (this.selectedValues.length === 0) {
        this.placeHolder = this.getText('MRI_PA_INPUT_PLACEHOLDER_ALL')
      }
    },
    removeFromNewTags(value) {
      this.newTags = this.newTags.filter(item => item.value !== value)
    },
    tagKeyUpHandler(props, e) {
      const prevItemIndex =
        this.selectedValues.findIndex(v => {
          return v.value === props.option.value
        }) - 1
      props.remove(props.option)
      this.removeFromNewTags(props.option.value)
      if (prevItemIndex >= 0) {
        const prevRefId = this.selectedValues[prevItemIndex].value
        this.$refs[prevRefId].firstChild.focus()
      }
      if (this.selectedValues.length === 0) {
        this.placeHolder = this.getText('MRI_PA_INPUT_PLACEHOLDER_ALL')
        this.openControl()
      }
    },
  },
  components: {
    appIcon,
  },
}
</script>
