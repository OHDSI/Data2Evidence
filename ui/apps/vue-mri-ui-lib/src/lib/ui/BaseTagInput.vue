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
      :placeholder="currentPlaceholder"
      @open="open"
      @close="close"
      @remove="remove"
      :show-labels="false"
      :tag-placeholder="currentTagPlaceholder"
      :taggable="componentType !== 'conceptSet'"
      label="display_value"
      :options="filteredList"
      :multiple="true"
      :options-limit="optionLimitSize"
      :loading="isLoading"
      :close-on-select="false"
      @search-change="handleSearchChange"
      @input="handleUpdateValue"
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
    <div v-if="componentType === 'conceptSet'">
      <d4l-button
        class="unicode-icon"
        text="+"
        :title="texts.createConceptSet"
        style="--border-radius-button: 9999px; margin-left: 8px; margin-right: 0px"
        @mousedown.stop.prevent="handleConceptSetAction()"
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
  props: {
    value: {
      type: Array,
      default: () => []
    },
    domainValues: {
      type: Object,
      default: () => ({
        values: [],
        isLoading: false,
        loadedStatus: 'NO_RESULTS'
      })
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
        noSuggestions: 'No suggestions found'
      })
    },
    componentType: {
      type: String,
      default: 'default'
    },
    isCatalogAttribute: {
      type: Boolean,
      default: false
    },
    optionsLimit: {
      type: Number,
      default: 200
    },
    conceptSetConfig: {
      type: Object,
      default: () => ({})
    }
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
      deep: true
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
      deep: true
    }
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
    }
  },
  methods: {
    remove(removedOption, id) {
      this.removeFromNewTags(removedOption.value)
    },
    async openControl() {
      await this.$nextTick()
      this.$refs.multiselect.activate()
      this.$refs.multiselect.$refs.search.focus()
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
      this.$emit('update:value', value)
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
      this.$emit('concept-set-action', { values, config: this.conceptSetConfig })
    },
    tagClickHandler(props) {
      this.$refs.multiselect.$refs.search.blur()
      if (this.$refs.hasOwnProperty(props.option.value)) {
        this.$refs[props.option.value].firstChild.focus()
      }
      if (this.selectedValues.length === 0) {
        this.currentPlaceholder = this.texts.placeholder
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