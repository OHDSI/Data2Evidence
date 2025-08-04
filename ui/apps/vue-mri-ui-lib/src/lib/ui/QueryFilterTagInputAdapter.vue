<template>
  <BaseTagInput
    :value="externalValue"
    :domain-values="externalDomainValues"
    :texts="externalTexts"
    :component-type="model.props.type"
    :is-catalog-attribute="isCatalogAttribute"
    :options-limit="200"
    :max-selections="maxSelections"
    :concept-set-config="conceptSetConfig"
    @update:value="handleUpdateValue"
    @search-change="handleSearchChange"
    @concept-set-action="handleConceptSetAction"
  />
</template>

<script lang="ts">
import BaseTagInput from './BaseTagInput.vue'
import type { ConceptSetAction, TagInputModel } from '../../query-filter/types/ConceptSetTypes'

export default {
  name: 'QueryFilterTagInputAdapter',
  props: {
    model: {
      type: Object as () => TagInputModel,
      required: true,
    },
    externalValue: {
      type: Array,
      default: () => [],
    },
    externalDomainValues: {
      type: Object,
      default: () => ({
        values: [],
        isLoading: false,
        loadedStatus: 'NO_RESULTS',
      }),
    },
    externalTexts: {
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
    isCatalogAttribute: {
      type: Boolean,
      default: false,
    },
    maxSelections: {
      type: Number,
      default: null,
    },
  },
  emits: ['update:value', 'search-change', 'concept-set-action'],
  components: {
    BaseTagInput,
  },
  computed: {
    conceptSetConfig() {
      return {
        domainFilter: this.model.props.domainFilter,
        standardConceptCodeFilter: this.model.props.standardConceptCodeFilter,
        // For query filter, we don't have selectedDataset, so we'll pass null
        selectedDatasetId: null,
      }
    },
  },
  methods: {
    handleUpdateValue(value: any) {
      this.$emit('update:value', value)
    },
    handleSearchChange(searchQuery: any) {
      this.$emit('search-change', searchQuery)
    },
    handleConceptSetAction({ values, config, componentType }: ConceptSetAction) {
      // For query filter, we'll emit the event to let the parent handle it
      this.$emit('concept-set-action', { values, config: config || this.conceptSetConfig, componentType })
    },
  },
}
</script>
