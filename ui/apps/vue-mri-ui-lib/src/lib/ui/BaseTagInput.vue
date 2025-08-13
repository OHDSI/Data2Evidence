<template>
  <div
    @focus="handleContainerInteraction"
    @click="handleContainerInteraction"
    tabindex="0"
    class="app-tag-input"
    ref="container"
    style="display: flex; flex-direction: row"
  >
    <multiselect
      size="sm"
      :value="maxSelections === 1 ? selectedValues[0] || null : selectedValues"
      @input="handleUpdateValue"
      track-by="value"
      :hide-selected="true"
      :internal-search="false"
      @tag="addTag"
      :placeholder="currentPlaceholder"
      @open="open"
      @close="close"
      @remove="remove"
      :show-labels="false"
      :tag-placeholder="currentTagPlaceholder"
      :taggable="componentType !== 'conceptSet'"
      label="display_value"
      :options="filteredList"
      :multiple="maxSelections !== 1"
      :options-limit="optionLimitSize"
      :loading="isLoading"
      :close-on-select="false"
      @search-change="handleSearchChange"
      @select="openControl"
      :preserveSearch="true"
      ref="multiselect"
      :clear-on-select="true"
    >
      <template v-slot:option="props">{{ formatCustomOption(props.option) }}</template>
      <template v-slot:clear>
        <div class="multiselect__clear" v-if="selectedValues.length" @mousedown.prevent.stop="clearAll()">
          {{ texts.clearAll }}
        </div>
      </template>
      <template v-slot:tag="props">
        <div :ref="el => setTagRef(el, props.option.value)" class="multiselect__tags-wrap">
          <span
            tabindex="0"
            :class="getClass(props.option)"
            @keyup.right="tagNavHandler(props, $event)"
            @keyup.left="tagNavHandler(props, $event)"
            @click.stop.prevent="tagClickHandler(props)"
            @keydown.stop.prevent.delete="tagKeyUpHandler(props)"
          >
            <span>{{ props.option.display_value }}</span>
            <span v-if="componentType === 'conceptSet'"
              ><i
                aria-hidden="true"
                tabindex="1"
                @mousedown.stop.prevent="handleConceptSetAction(props.option)"
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
    <div v-if="componentType === 'conceptSet' || componentType === 'concept'">
      <d4l-button
        class="unicode-icon"
        text="+"
        :title="componentType === 'concept' ? 'Select concepts' : texts.createConceptSet"
        style="--border-radius-button: 9999px; margin-left: 8px; margin-right: 0px"
        @mousedown.stop.prevent="handleConceptSetAction(null)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import appIcon from './app-icon.vue'

const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g
function escapeStringRegExp(str) {
  return str.replace(matchOperatorsRe, '\\$&')
}

export default {
  name: 'BaseTagInput',
  compatConfig: {
    MODE: 3 as const,
  },
  props: {
    value: {
      type: Array,
      default: () => [],
    },
    domainValues: {
      type: Object,
      default: () => ({
        values: [],
        isLoading: false,
        loadedStatus: 'NO_RESULTS',
      }),
    },
    texts: {
      type: Object,
      default: () => ({
        placeholder: 'Select items...',
        enterSearchTerm: 'Enter search term',
        clearAll: 'Clear All',
        createConceptSet: 'Create concept set',
        loadingSuggestions: 'Loading suggestions...',
        tooManyValues: 'Too many values',
        noSuggestions: 'No suggestions found',
      }),
    },
    componentType: {
      type: String,
      default: 'default',
    },
    isCatalogAttribute: {
      type: Boolean,
      default: false,
    },
    optionsLimit: {
      type: Number,
      default: 200,
    },
    conceptSetConfig: {
      type: Object,
      default: () => ({}),
    },
    maxSelections: {
      type: Number,
      default: null,
    },
  },
  emits: ['update:value', 'search-change', 'concept-set-action'],
  data() {
    return {
      searchQuery: '',
      newTags: [],
      currentPlaceholder: '',
      currentTagPlaceholder: '',
      optionLimitSize: 200,
      selectedValuesTimeout: null,
      tagRefs: {},
    }
  },
  mounted() {
    this.currentPlaceholder = this.texts.placeholder
    this.currentTagPlaceholder = this.texts.tooManyValues
    this.optionLimitSize = this.optionsLimit
  },
  watch: {
    domainValues: {
      handler(newVal, oldVal) {
        if (newVal.isLoading !== oldVal.isLoading && !newVal.isLoading) {
          this.currentTagPlaceholder = ''
        }
      },
      deep: true,
    },
    selectedValues(newVal) {
      if (this.selectedValues.length) {
        this.currentPlaceholder = this.texts.enterSearchTerm
      } else {
        this.currentPlaceholder = this.texts.placeholder
      }
    },
    texts: {
      handler() {
        if (this.selectedValues.length) {
          this.currentPlaceholder = this.texts.enterSearchTerm
        } else {
          this.currentPlaceholder = this.texts.placeholder
        }
      },
      deep: true,
    },
  },
  computed: {
    filteredList() {
      const regex = new RegExp(escapeStringRegExp(this.searchQuery), 'gi')
      const list = [...this.domainValues.values, ...this.newTags]
      const updatedList = []

      if (this.domainValues.isLoading) {
        this.currentTagPlaceholder = this.texts.loadingSuggestions
      } else if (this.domainValues.loadedStatus === 'TOO_MANY_RESULTS') {
        this.currentTagPlaceholder = this.texts.tooManyValues
      } else if (this.domainValues.loadedStatus === 'HAS_RESULTS') {
        const formattedValues = this.formatValues(list)
        updatedList.push(...formattedValues)
      } else if (this.domainValues.loadedStatus === 'NO_RESULTS') {
        this.currentTagPlaceholder = this.texts.noSuggestions
      }

      return updatedList
    },
    selectedValues() {
      return this.formatValues(this.value)
    },
    isLoading() {
      return this.domainValues.isLoading
    },
  },
  methods: {
    setTagRef(el, value) {
      if (el) {
        this.tagRefs[value] = el
      } else {
        delete this.tagRefs[value]
      }
    },
    remove(removedOption) {
      // Handle multiselect concepts (pa-atlas case) - emit concept-set-action for proper state management
      if (this.componentType === 'concept') {
        // Create an updated value array without the removed concept
        const updatedValue = this.value.filter(item => item.value !== removedOption.value)
        // Emit concept-set-action to properly update the attribute's conceptItems
        this.$emit('concept-set-action', {
          values: updatedValue,
          config: this.conceptSetConfig,
          componentType: this.componentType,
          action: 'remove',
          removedItem: removedOption,
        })
      } else {
        // PA Filter card behavior)
        this.removeFromNewTags(removedOption.value)
      }
    },
    handleContainerInteraction() {
      // For concept and conceptSet types, directly open terminology modal
      if (this.componentType === 'concept') {
        this.handleConceptSetAction(null)
        return
      }

      // For other types, use normal behavior
      this.openControl()
    },
    async openControl() {
      await this.$nextTick()
      if (this.$refs.multiselect?.activate) {
        this.$refs.multiselect.activate()
      }
      if (this.$refs.multiselect?.$refs?.search) {
        this.$refs.multiselect.$refs.search.focus()
      }
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
          const nextRefId = this.selectedValues[nextItemIndex].value
          const nextRef = this.tagRefs[nextRefId]
          if (nextRef?.firstChild) {
            nextRef.firstChild.focus()
          }
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
          const prevRef = this.tagRefs[prevRefId]
          if (prevRef?.firstChild) {
            prevRef.firstChild.focus()
          }
        }
      }
    },
    formatCustomOption(option) {
      if (this.componentType === 'conceptSet') {
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
      // For concept types, open terminology modal directly instead of showing dropdown
      // dropdown is still used to select existing concept sets
      if (this.componentType === 'concept') {
        this.handleConceptSetAction(null)
        return
      }

      this.currentPlaceholder = this.texts.enterSearchTerm
      this.handleSearchChange(this.searchQuery)
    },
    close() {
      if (this.selectedValues.length) {
        this.currentPlaceholder = this.texts.enterSearchTerm
      } else {
        this.currentPlaceholder = this.texts.placeholder
      }
    },
    addTag(newTag) {
      if (this.componentType === 'conceptSet') {
        return
      }
      if (newTag.length > 0) {
        const addThis = {
          text: newTag,
          value: newTag,
          hidden: true,
        }
        this.newTags.push(addThis)
        this.handleUpdateValue([...this.value, addThis])
      }
    },
    handleUpdateValue(value) {
      let finalValue = value

      // Handle single-select mode (when maxSelections = 1)
      if (this.maxSelections === 1) {
        // In single-select mode, value is a single object, not an array
        // Convert to array format for consistent handling
        finalValue = value ? [value] : []
      } else if (this.maxSelections && value && Array.isArray(value) && value.length > this.maxSelections) {
        // Multi-select mode with limit enforcement
        finalValue = value.slice(0, this.maxSelections)
      }

      this.$emit('update:value', finalValue)
      if (this.selectedValuesTimeout) {
        clearTimeout(this.selectedValuesTimeout)
      }
      this.selectedValuesTimeout = setTimeout(() => {
        this.currentPlaceholder = this.texts.enterSearchTerm
      }, 100)
    },
    handleSearchChange(searchQuery) {
      if (this.searchQuery !== searchQuery) {
        this.searchQuery = searchQuery
        this.$emit('search-change', searchQuery)
      }
    },
    getClass(item) {
      const classes = ['multiselect__tag']
      const dataMatchFound = this.domainValues.values.find(
        o => o.value === item.value && o.display_value === item.display_value
      )
      if (this.isCatalogAttribute || this.componentType === 'conceptSet') {
        item.hidden ? classes.push('MriPaTagElementInvalid') : classes.push('MriPaTagElementValid')
      } else {
        dataMatchFound ? classes.push('MriPaTagElementValidWithData') : classes.push('MriPaTagElementValidNoData')
      }
      return classes
    },
    clearAll() {
      this.handleUpdateValue([])
      this.currentPlaceholder = this.texts.placeholder
    },
    handleConceptSetAction(values) {
      this.$emit('concept-set-action', {
        values,
        config: this.conceptSetConfig,
        componentType: this.componentType, // Pass component type for mode determination
      })
    },
    tagClickHandler(props) {
      if (this.$refs.multiselect?.$refs?.search) {
        this.$refs.multiselect.$refs.search.blur()
      }
      const tagRef = this.tagRefs[props.option.value]
      if (tagRef?.firstChild) {
        tagRef.firstChild.focus()
      }
      if (this.selectedValues.length === 0) {
        this.currentPlaceholder = this.texts.placeholder
      }
    },
    removeFromNewTags(value) {
      this.newTags = this.newTags.filter(item => item.value !== value)
    },
    tagKeyUpHandler(props) {
      const prevItemIndex =
        this.selectedValues.findIndex(v => {
          return v.value === props.option.value
        }) - 1
      props.remove(props.option)
      this.removeFromNewTags(props.option.value)
      if (prevItemIndex >= 0) {
        const prevRefId = this.selectedValues[prevItemIndex].value
        const prevRef = this.tagRefs[prevRefId]
        if (prevRef?.firstChild) {
          prevRef.firstChild.focus()
        }
      }
      if (this.selectedValues.length === 0) {
        this.currentPlaceholder = this.texts.placeholder
        this.openControl()
      }
    },
  },
  components: {
    appIcon,
  },
}
</script>
