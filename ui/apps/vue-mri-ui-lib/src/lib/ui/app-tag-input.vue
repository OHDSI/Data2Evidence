<template>
  <BaseTagInput
    :value="selectedValues"
    :domain-values="myDomainValues"
    :texts="vuexTexts"
    :component-type="model.props.type"
    :is-catalog-attribute="isCatalogAttribute"
    :options-limit="optionLimitSize"
    :concept-set-config="conceptSetConfig"
    @update:value="updateValue"
    @search-change="asyncFind"
    @concept-set-action="handleConceptSet"
  />
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import BaseTagInput from './BaseTagInput.vue'

export default {
  name: 'app-tag-input',
  props: ['model', 'isCatalogAttribute'],
  components: {
    BaseTagInput,
  },
  data() {
    return {
      selectedValuesTimeout: null,
      optionLimitSize: 200,
    }
  },
  computed: {
    ...mapGetters(['getDomainValues', 'getConstraint', 'getText', 'getMriFrontendConfig', 'getSelectedDataset']),
    myDomainValues() {
      return this.getDomainValues(this.attributePathUid)
    },
    selectedValues() {
      return this.getConstraint(this.model.id).props.value
    },
    attributePathUid() {
      return `${this.model.props.attributePath}__${this._uid}`
    },
    vuexTexts() {
      return {
        placeholder: this.getText('MRI_PA_INPUT_PLACEHOLDER_ALL'),
        enterSearchTerm: this.getText('MRI_PA_ENTER_SEARCH_TERM'),
        clearAll: this.getText('MRI_PA_FILTERCARD_CLEAR_ALL_BTN'),
        createConceptSet: this.getText('MRI_PA_TOOLTIP_CREATE_CONCEPT_SET'),
        loadingSuggestions: this.getText('MRI_PA_LOADING_SUGGESTIONS'),
        tooManyValues: this.getText('MRI_PA_TOO_MANY_VALUES'),
        noSuggestions: this.getText('MRI_PA_NO_SUGGESTIONS')
      }
    },
    conceptSetConfig() {
      return {
        domainFilter: this.model.props.domainFilter,
        standardConceptCodeFilter: this.model.props.standardConceptCodeFilter,
        selectedDatasetId: this.getSelectedDataset.id
      }
    }
  },
  mounted() {
    // Set option limit from config
    const configLimit = this.getMriFrontendConfig._internalConfig.panelOptions.domainValuesLimit
    if (configLimit) {
      this.optionLimitSize = configLimit
    }
  },
  methods: {
    ...mapActions(['loadValuesForAttributePath', 'updateConstraintValue']),
    updateValue(value) {
      const payload = {
        value,
        constraintId: this.model.id,
      }
      this.updateConstraintValue(payload)
    },
    asyncFind(searchQuery) {
      this.loadDomainValues(searchQuery)
    },
    loadDomainValues(searchQuery) {
      if (this.selectedValuesTimeout) {
        clearInterval(this.selectedValuesTimeout)
      }
      const INPUT_WAIT_TIME_MS = 600
      this.selectedValuesTimeout = setTimeout(() => {
        this.loadValuesForAttributePath({
          attributePathUid: this.attributePathUid,
          searchQuery: searchQuery,
          attributeType: this.model.props.type,
        })
      }, INPUT_WAIT_TIME_MS)
    },
    handleConceptSet({ values, config }) {
      const { domainFilter, standardConceptCodeFilter, selectedDatasetId } = config
      const conceptSetId = values?.value
      const defaultFilters = [
        { id: 'domainId', value: domainFilter ? [domainFilter] : [] },
        { id: 'concept', value: standardConceptCodeFilter ? [standardConceptCodeFilter] : [] },
      ]
      const event = new CustomEvent('alp-terminology-open', {
        detail: {
          props: {
            selectedDatasetId: selectedDatasetId,
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
              this.updateValue([...this.model.props.value, addThis])
            },
            defaultFilters,
          },
        },
      })
      window.dispatchEvent(event)
    },
  },
}
</script>
