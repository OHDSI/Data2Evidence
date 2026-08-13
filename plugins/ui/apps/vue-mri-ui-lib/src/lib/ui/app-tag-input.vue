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
import { getConceptByCode, getConceptById, getConceptByName } from '../../utils/IfrToExtCohortDeps/conceptGetters'

// Concept ids are plain integers; anything else in a value list was typed by hand and
// cannot be round-tripped through the terminology overlay.
const isConceptId = value => /^\d+$/.test(String(value ?? ''))

// Scopes the terminology overlay to what the attribute is configured to accept. Both
// filters are optional; an empty one means "do not restrict".
const conceptFilters = ({ domainFilter, standardConceptCodeFilter }) => [
  { id: 'domainId', value: domainFilter ? [domainFilter] : [] },
  { id: 'concept', value: standardConceptCodeFilter ? [standardConceptCodeFilter] : [] },
]

// Which identifier the attribute's values hold. Anything not explicitly a code or a
// name is a concept id, mirroring how values are written, so reading and writing stay
// symmetric whatever spelling or casing the CDM config happens to use.
const identifierMode = conceptIdentifierType => {
  const normalized = String(conceptIdentifierType ?? '')
    .trim()
    .toLowerCase()
  return normalized === 'code' || normalized === 'name' ? normalized : 'id'
}

// The vocabulary lookup answers with upper-cased column names; the overlay's table reads
// camelCase fields and renders them verbatim, so every column it shows has to be spelled
// out here or the row comes back half empty.
const conceptFromLookup = record => {
  const name = record.CONCEPT_NAME || ''
  const code = record.CONCEPT_CODE
  return {
    conceptId: Number(record.CONCEPT_ID),
    display: name,
    conceptName: name,
    code,
    conceptCode: code,
    system: record.VOCABULARY_ID,
    vocabularyId: record.VOCABULARY_ID,
    domainId: record.DOMAIN_ID,
    conceptClassId: record.CONCEPT_CLASS_ID,
    standardConcept: record.STANDARD_CONCEPT,
    concept: record.STANDARD_CONCEPT === 'S' ? 'Standard' : 'Non-standard',
    validity: record.INVALID_REASON ? 'Invalid' : 'Valid',
    validStartDate: record.VALID_START_DATE,
    validEndDate: record.VALID_END_DATE,
  }
}

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
      return `${this.model.props.attributePath}__${this.$.uid}`
    },
    vuexTexts() {
      return {
        placeholder: this.getText('MRI_PA_INPUT_PLACEHOLDER_ALL'),
        enterSearchTerm: this.getText('MRI_PA_ENTER_SEARCH_TERM'),
        clearAll: this.getText('MRI_PA_FILTERCARD_CLEAR_ALL_BTN'),
        createConceptSet: this.getText('MRI_PA_TOOLTIP_CREATE_CONCEPT_SET'),
        browseConcepts: this.getText('MRI_PA_TOOLTIP_BROWSE_CONCEPTS'),
        loadingSuggestions: this.getText('MRI_PA_LOADING_SUGGESTIONS'),
        tooManyValues: this.getText('MRI_PA_TOO_MANY_VALUES'),
        noSuggestions: this.getText('MRI_PA_NO_SUGGESTIONS'),
      }
    },
    conceptSetConfig() {
      return {
        domainFilter: this.model.props.domainFilter,
        standardConceptCodeFilter: this.model.props.standardConceptCodeFilter,
        conceptIdentifierType: this.model.props.conceptIdentifierType,
        selectedDatasetId: this.getSelectedDataset.id,
      }
    },
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
    currentConstraintValues() {
      return this.getConstraint(this.model.id)?.props?.value || []
    },
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
    handleConceptSet({ values, config, action }) {
      if (action === 'browse') {
        this.openConceptBrowser(config)
        return
      }
      const { selectedDatasetId } = config
      const conceptSetId = values?.value
      const defaultFilters = conceptFilters(config)
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
              } else {
                const addThis = {
                  text: onCloseValues.currentConceptSet.name,
                  display_value: onCloseValues.currentConceptSet.name,
                  value: onCloseValues.currentConceptSet.id,
                }
                this.updateValue([...this.model.props.value, addThis])
              }

              // Bust the shared 'conceptSets' Vuex cache so ChartToolbar, bookmarks,
              // and other consumers see the updated list on their next access.
              this.$store.commit('DOMAIN_SET_VALUES', {
                attributePath: 'conceptSets',
                data: { values: [], isLoaded: false, isLoading: false },
              })
              this.loadValuesForAttributePath({
                attributePathUid: 'conceptSets',
                searchQuery: '',
                attributeType: 'conceptSet',
              })
            },
            defaultFilters,
          },
        },
      })
      window.dispatchEvent(event)
    },
    // Opens the terminology overlay in multi-select mode so concepts can be searched in
    // full screen and written straight back into this text constraint as tags. The value
    // written per concept is whatever identifier the attribute is configured to store.
    async openConceptBrowser(config) {
      const { selectedDatasetId, conceptIdentifierType } = config
      // Read live from the store, never off `model` or a computed: getConstraint hands
      // out a deep clone, so the prop is a snapshot from the last render, and a computed
      // can still be serving its cached copy. Either one misses values written since —
      // including the ones this overlay itself just saved.
      const currentValues = this.currentConstraintValues()
      const identifier = identifierMode(conceptIdentifierType)
      const { concepts, resolvedValues } = await this.resolveConceptsForValues(
        currentValues,
        identifier,
        selectedDatasetId
      )

      const props = {
        selectedDatasetId,
        mode: 'CONCEPT_MULTI_SELECT',
        defaultFilters: conceptFilters(config),
        // The overlay runs this callback BEFORE it tears its own state down, and it does
        // not guard the call. Anything thrown here would strand the modal mounted with a
        // reset selection, which silently breaks the next open — so never throw.
        onClose: onCloseValues => {
          try {
            this.applyBrowsedConcepts(onCloseValues, identifier, resolvedValues)
          } catch (error) {
            console.error('Failed to apply concepts picked in the terminology overlay:', error)
          }
        },
      }
      if (concepts.length) {
        props.initialSelectedConcepts = concepts
      }

      window.dispatchEvent(new CustomEvent('alp-terminology-open', { detail: { props } }))
    },
    // Turns the values already on the constraint back into concepts so the overlay opens
    // with them ticked. Concept ids map straight across; codes and names have to be
    // looked up in the vocabulary. `resolvedValues` records which values are represented
    // in the overlay, so closing it can replace exactly those and leave the rest alone.
    async resolveConceptsForValues(values, identifier, datasetId) {
      const concepts = []
      const resolvedValues = new Set()
      // Only values shaped like the configured identifier can be looked up; the rest were
      // typed by hand and stay plain tags.
      const candidates = identifier === 'id' ? values.filter(item => isConceptId(item.value)) : values

      const lookups = await Promise.all(
        candidates.map(async item => {
          const value = String(item.value)
          if (!datasetId) {
            return { value, item, record: null }
          }
          try {
            const record =
              identifier === 'code'
                ? await getConceptByCode({ conceptCode: value, datasetId })
                : identifier === 'name'
                ? await getConceptByName({ conceptName: value, datasetId })
                : await getConceptById({ conceptId: Number(value), datasetId })
            return { value, item, record }
          } catch (error) {
            // One bad lookup must not stop the overlay from opening.
            console.warn(`Could not resolve "${value}" to a concept:`, error)
            return { value, item, record: null }
          }
        })
      )

      lookups.forEach(({ value, item, record }) => {
        if (record) {
          resolvedValues.add(value)
          concepts.push(conceptFromLookup(record))
        } else if (identifier === 'id') {
          // The value is already a concept id, so it can still be shown as selected —
          // just without the vocabulary detail the table would otherwise fill in.
          const label = item.text || item.display_value || value
          resolvedValues.add(value)
          concepts.push({ conceptId: Number(value), display: label, conceptName: label })
        }
      })
      return { concepts, resolvedValues }
    },
    applyBrowsedConcepts(onCloseValues, identifier, resolvedValues) {
      const selectedConcepts = onCloseValues?.selectedConcepts
      if (!selectedConcepts) {
        return
      }
      const picked = selectedConcepts
        .map(concept => this.conceptToTag(concept, identifier))
        .filter(tag => tag.value !== '')

      // Whatever the overlay showed as selected is authoritative, so deselecting there
      // removes the tag here. Values it never knew about — free-typed, or no longer in
      // the vocabulary — are kept so nothing is silently dropped.
      const kept = this.currentConstraintValues().filter(item => !resolvedValues.has(String(item.value)))
      const byValue = new Map()
      ;[...kept, ...picked].forEach(item => {
        const key = String(item.value)
        if (!byValue.has(key)) {
          byValue.set(key, item)
        }
      })
      this.updateValue(Array.from(byValue.values()))
    },
    conceptToTag(concept, identifier) {
      const name = concept.display || concept.conceptName || concept.concept || ''
      let value
      if (identifier === 'code') {
        value = concept.code ?? concept.conceptCode
      } else if (identifier === 'name') {
        value = name
      } else {
        value = concept.conceptId
      }
      const stringValue = value === null || value === undefined ? '' : String(value)
      return {
        value: stringValue,
        text: name || stringValue,
        display_value: name || stringValue,
        score: 1,
      }
    },
  },
}
</script>
