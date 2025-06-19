<script lang="ts">
export default {
  name: 'QueryFilterEventCard',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { ref, computed } from 'vue'
import QueryFilterNestedCriteria from './QueryFilterNestedCriteria.vue'
import AttributesDropdown from './AttributesDropdown.vue'
import QueryFilterTagInputAdapter from '../../lib/ui/QueryFilterTagInputAdapter.vue'
import type { QueryFilterEvent } from '../models/QueryFilterModel'
import type { ConceptSetItem, ConceptSetDomainValues } from '../types/ConceptSetTypes'
import type { AttributeConfig } from '../utils/CriteriaConfigLoader'

interface Props {
  event: QueryFilterEvent
  eventIndex: number
  conceptSets?: ConceptSetItem[]
  conceptSetDomainValues?: ConceptSetDomainValues
  conceptSetTexts?: Record<string, string>
  nestedLevel?: number
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  conceptSets: () => [],
  nestedLevel: 0,
  readonly: false,
})

const emit = defineEmits<{
  'update:event': [event: QueryFilterEvent]
  'remove-event': []
  'duplicate-event': []
  'concept-set-selected': [conceptSet: ConceptSetItem]
  'attribute-selected': [attribute: AttributeConfig]
  'attribute-removed': [attributeId: string]
}>()

// Local reactive copy of the event
const localEvent = ref<QueryFilterEvent>({ ...props.event })

// Two-way binding computed
const eventData = computed({
  get: () => localEvent.value,
  set: (value: QueryFilterEvent) => {
    localEvent.value = value
    emit('update:event', value)
  },
})

// Check if event has nested attributes
const hasNestedAttributes = computed(() => {
  return eventData.value.attributes?.some(attr => attr.attributeType === 'nested')
})

// Get nested criteria from attributes
const nestedCriteria = computed(() => {
  const nestedAttribute = eventData.value.attributes?.find(attr => attr.attributeType === 'nested')
  return nestedAttribute?.nestedCriteria
})

// Handle cardinality changes
const updateCardinality = (field: 'type' | 'count', value: any) => {
  const updatedEvent = {
    ...eventData.value,
    cardinality: {
      ...eventData.value.cardinality,
      [field]: value,
    },
  }
  eventData.value = updatedEvent
}

// Handle concept set changes (add/remove/update)
const handleConceptSetChange = async (values: ConceptSetItem[]) => {
  if (!values || values.length === 0) {
    // Remove concept set
    const updatedEvent = {
      ...eventData.value,
      selectedConceptSet: undefined,
      conceptSetId: undefined,
      conceptSet: '',
      conceptSetDetails: [],
      conceptSetLoading: false,
    }
    eventData.value = updatedEvent
    emit('concept-set-selected', null)
    return
  }

  // For events, we typically only support one concept set
  const conceptSet = values[0]
  await handleConceptSetSelected(conceptSet)
}

// Handle concept set selection
const handleConceptSetSelected = async (conceptSet: ConceptSetItem) => {
  const updatedEvent = {
    ...eventData.value,
    selectedConceptSet: conceptSet,
    conceptSetId: conceptSet.value,
    conceptSet: conceptSet.text || conceptSet.display_value || conceptSet.value,
    conceptSetLoading: true,
  }
  eventData.value = updatedEvent
  emit('concept-set-selected', conceptSet)

  // Load concept set details for Atlas conversion
  try {
    // Import the API service function
    const { loadSingleConceptSetDetails } = await import('../services/ConceptSetApiService')
    const conceptSetDetails = await loadSingleConceptSetDetails(conceptSet, getDatasetIdFromProps())

    // Update event with concept set details
    const eventWithDetails = {
      ...eventData.value,
      conceptSetDetails,
      conceptSetLoading: false,
    }
    eventData.value = eventWithDetails
  } catch (error) {
    console.error('Failed to load concept set details:', error)
    // Update loading state even if failed
    const eventWithError = {
      ...eventData.value,
      conceptSetLoading: false,
    }
    eventData.value = eventWithError
  }
}

// Helper to get dataset ID (could be passed as prop in the future)
const getDatasetIdFromProps = (): string => {
  // For now, use the same fallback as QueryFilterModern
  // In the future, this could be passed as a prop
  return '4f05abcf-36d6-4e88-a44d-ad1ee3a0b06e'
}

// Handle attribute selection
const handleAttributeSelected = (attribute: AttributeConfig) => {
  // Add full attribute object to event, not just ID
  const currentAttributeObjects = eventData.value.attributeObjects || []
  const currentAttributes = eventData.value.selectedAttributes || []

  // Store both the ID (for compatibility) and the full object
  const updatedEvent = {
    ...eventData.value,
    selectedAttributes: [...currentAttributes, attribute.id],
    attributeObjects: [
      ...currentAttributeObjects,
      {
        ...attribute,
        // Initialize based on attribute type
        conceptSet: attribute.id === 'nested' ? null : undefined,
        nestedCriteria:
          attribute.id === 'nested'
            ? {
                id: `nested_${Date.now()}`,
                criteriaType: 'ANY' as const,
                events: [],
              }
            : undefined,
      },
    ],
  }
  eventData.value = updatedEvent
  emit('attribute-selected', attribute)
}

// Handle attribute removal
const handleAttributeRemoved = (attributeId: string) => {
  const currentAttributes = eventData.value.selectedAttributes || []
  const currentAttributeObjects = eventData.value.attributeObjects || []

  const updatedEvent = {
    ...eventData.value,
    selectedAttributes: currentAttributes.filter(id => id !== attributeId),
    attributeObjects: currentAttributeObjects.filter(obj => obj.id !== attributeId),
  }
  eventData.value = updatedEvent
  emit('attribute-removed', attributeId)
}

// Handle event removal
const removeEvent = () => {
  if (confirm('Are you sure you want to remove this event?')) {
    emit('remove-event')
  }
}

// Handle nested criteria updates
const updateNestedCriteria = (updatedCriteria: any) => {
  if (eventData.value.attributes) {
    const nestedAttribute = eventData.value.attributes.find(attr => attr.attributeType === 'nested')
    if (nestedAttribute) {
      nestedAttribute.nestedCriteria = updatedCriteria
      eventData.value = { ...eventData.value }
    }
  }
}

// Handle attribute concept set selection
const handleAttributeConceptSetSelected = (attributeId: string, conceptSet: ConceptSetItem) => {
  const currentAttributeObjects = eventData.value.attributeObjects || []
  const updatedAttributeObjects = currentAttributeObjects.map(attr =>
    attr.id === attributeId ? { ...attr, conceptSet, conceptSetId: conceptSet.value } : attr
  )

  const updatedEvent = {
    ...eventData.value,
    attributeObjects: updatedAttributeObjects,
  }
  eventData.value = updatedEvent
}

// Handle attribute nested criteria updates
const handleAttributeNestedCriteriaUpdate = (attributeId: string, nestedCriteria: any) => {
  const currentAttributeObjects = eventData.value.attributeObjects || []
  const updatedAttributeObjects = currentAttributeObjects.map(attr =>
    attr.id === attributeId ? { ...attr, nestedCriteria } : attr
  )

  const updatedEvent = {
    ...eventData.value,
    attributeObjects: updatedAttributeObjects,
  }
  eventData.value = updatedEvent
}

// Create tag input model for concept set selection
const tagInputModel = computed(() => ({
  id: `event-concept-set-${eventData.value.id}`,
  props: {
    type: 'conceptSet',
    value: eventData.value.selectedConceptSet ? [eventData.value.selectedConceptSet] : [],
    attributePath: 'condition_occurrence.concept_id',
    domainFilter: 'Condition',
    standardConceptCodeFilter: 'Standard',
  },
}))

// Get the external value for the tag input (ensuring it's always an array)
const getTagInputValue = () => {
  if (eventData.value.selectedConceptSet) {
    return [eventData.value.selectedConceptSet]
  }
  return []
}

// Get event type display name
const getEventTypeDisplay = (eventType?: string) => {
  if (!eventType) return 'Unknown Event'

  const typeMap: Record<string, string> = {
    conditionOccurrence: 'Condition Occurrence',
    drugExposure: 'Drug Exposure',
    procedureOccurrence: 'Procedure Occurrence',
    measurement: 'Measurement',
    observation: 'Observation',
    visitOccurrence: 'Visit Occurrence',
    deviceExposure: 'Device Exposure',
    death: 'Death',
  }

  return typeMap[eventType] || eventType
}

// Get cardinality display text
const getCardinalityDisplay = (cardinality?: any) => {
  if (!cardinality) return 'At least 1'

  const typeText =
    {
      AT_LEAST: 'At least',
      exactly: 'Exactly',
      atMost: 'At most',
    }[cardinality.type] || cardinality.type

  return `${typeText} ${cardinality.count}`
}

// Get concept set display name for readonly mode
const getConceptSetDisplayName = (): string => {
  // Priority: selectedConceptSet.text > selectedConceptSet.display_value > conceptSet property > conceptSetId
  if (eventData.value.selectedConceptSet) {
    return (
      eventData.value.selectedConceptSet.text ||
      eventData.value.selectedConceptSet.display_value ||
      eventData.value.selectedConceptSet.value ||
      'Unknown Concept Set'
    )
  }

  if (eventData.value.conceptSet) {
    return eventData.value.conceptSet
  }

  if (eventData.value.conceptSetId) {
    return `Concept Set ${eventData.value.conceptSetId}`
  }

  return ''
}
</script>

<template>
  <div
    class="query-filter-event-card"
    :class="{
      'query-filter-event-card--nested': nestedLevel > 0,
      'query-filter-event-card--readonly': readonly,
      'query-filter-event-card--has-nested': hasNestedAttributes,
    }"
  >
    <!-- Event Header -->
    <div class="event-header">
      <div class="event-header__left">
        <div class="event-type-indicator">
          <span class="event-type-label">
            {{ getEventTypeDisplay(eventData.criteriaType) }}
          </span>
          <span v-if="nestedLevel > 0" class="nested-indicator"> (Level {{ nestedLevel }}) </span>
        </div>
      </div>

      <div class="event-header__right">
        <AttributesDropdown
          v-if="!readonly"
          :criteria-type="eventData.criteriaType || 'conditionOccurrence'"
          :event-id="eventData.id"
          :all-events="[eventData]"
          @attribute-selected="handleAttributeSelected"
          @attribute-removed="handleAttributeRemoved"
        />
        <button v-if="!readonly" class="btn-remove-event" @click="removeEvent" title="Remove this event">×</button>
      </div>
    </div>

    <!-- Event Body with Sidebar -->
    <div class="event-body">
      <!-- Event Sidebar -->
      <div class="event-sidebar">
        <span class="sidebar-label">AT LEAST 1</span>
      </div>

      <!-- Event Content -->
      <div class="event-content">
        <!-- Concept Set Selection -->
        <div class="concept-set-section">
          <label class="concept-set-label">Event Concept Set:</label>
          <QueryFilterTagInputAdapter
            v-if="!readonly"
            :model="tagInputModel"
            :external-value="getTagInputValue()"
            :external-domain-values="conceptSetDomainValues"
            :external-texts="conceptSetTexts"
            :is-catalog-attribute="false"
            :max-selections="1"
            @update:value="handleConceptSetChange"
          />
          <div v-else class="concept-set-readonly">
            {{ getConceptSetDisplayName() || 'No concept set selected' }}
          </div>
        </div>

        <!-- Selected Attributes Display -->
        <div v-if="eventData.attributeObjects?.length" class="selected-attributes">
          <div v-for="attribute in eventData.attributeObjects" :key="attribute.id" class="attribute-component">
            <!-- Attribute Header -->
            <div class="attribute-header">
              <span class="attribute-title">{{ attribute.title || attribute.name }}</span>
              <button v-if="!readonly" class="attribute-remove" @click="handleAttributeRemoved(attribute.id)">×</button>
            </div>

            <!-- Nested Criteria Attribute -->
            <div v-if="attribute.id === 'nested'" class="attribute-nested">
              <QueryFilterNestedCriteria
                :nested-criteria="attribute.nestedCriteria"
                :concept-sets="conceptSets"
                :concept-set-domain-values="conceptSetDomainValues"
                :concept-set-texts="conceptSetTexts"
                :readonly="readonly"
                :hide-header="true"
                @update:nested-criteria="criteria => handleAttributeNestedCriteriaUpdate(attribute.id, criteria)"
              />
            </div>

            <!-- Regular Attribute with Concept Set -->
            <div v-else class="attribute-concept-set">
              <label class="attribute-concept-set-label">
                {{ attribute.description || `Select ${attribute.name} concepts:` }}
              </label>
              <QueryFilterTagInputAdapter
                v-if="!readonly"
                :model="{
                  id: `attribute-${attribute.id}-${eventData.id}`,
                  props: {
                    type: 'conceptSet',
                    value: attribute.conceptSet ? [attribute.conceptSet] : [],
                    attributePath: 'condition_occurrence.concept_id',
                    domainFilter: 'Condition',
                    standardConceptCodeFilter: 'Standard',
                  },
                }"
                :external-value="attribute.conceptSet ? [attribute.conceptSet] : []"
                :external-domain-values="conceptSetDomainValues"
                :external-texts="conceptSetTexts"
                :is-catalog-attribute="false"
                @update:value="values => values[0] && handleAttributeConceptSetSelected(attribute.id, values[0])"
              />
              <div v-else class="attribute-concept-set-readonly">
                {{ attribute.conceptSet?.text || 'No concept set selected' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Nested Criteria (Recursive) -->
    <div v-if="hasNestedAttributes && nestedCriteria" class="nested-criteria-section">
      <QueryFilterNestedCriteria
        :nested-criteria="nestedCriteria"
        :concept-sets="conceptSets"
        :concept-set-domain-values="conceptSetDomainValues"
        :concept-set-texts="conceptSetTexts"
        :readonly="readonly"
        @update:nested-criteria="updateNestedCriteria"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.query-filter-event-card {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fff;
  margin-bottom: 12px;
  overflow: visible;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &--nested {
    border-left: 3px solid #1976d2;
    margin-left: 16px;
    background: #f8f9fa;
  }

  &--readonly {
    background: #f5f5f5;
    border-color: #ccc;
  }

  &--has-nested {
    border-color: #1976d2;
  }

  .event-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #fafafa;
    border-bottom: 1px solid #e0e0e0;

    &__left {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    &__right {
      display: flex;
      gap: 8px;
    }
  }

  .event-type-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .event-type-label {
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }

  .nested-indicator {
    font-size: 12px;
    color: #666;
    font-style: italic;
  }

  .event-cardinality {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  .cardinality-label {
    color: #666;
    font-weight: 500;
  }

  .cardinality-type-select {
    padding: 2px 6px;
    border: 1px solid #d0d0d0;
    border-radius: 3px;
    font-size: 12px;
    background: #fff;

    &:focus {
      outline: none;
      border-color: #1976d2;
    }
  }

  .cardinality-count-input {
    width: 50px;
    padding: 2px 6px;
    border: 1px solid #d0d0d0;
    border-radius: 3px;
    font-size: 12px;
    text-align: center;

    &:focus {
      outline: none;
      border-color: #1976d2;
    }
  }

  .cardinality-readonly {
    font-weight: 500;
    color: #333;
  }

  .cardinality-suffix {
    color: #666;
  }

  .btn-remove-event {
    width: 28px;
    height: 28px;
    border: 1px solid #d0d0d0;
    background: #fff;
    border-radius: 4px;
    color: #666;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
      border-color: #1976d2;
      color: #1976d2;
    }
  }

  .btn-remove-event:hover {
    border-color: #dc3545;
    color: #dc3545;
    background: #fff5f5;
  }

  .event-body {
    display: flex;
  }

  .event-sidebar {
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px 8px;
    background: #000080; // Blue similar to nested criteria
    position: relative;

    // Add subtle border to indicate different states
    &::after {
      content: '';
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      background: rgba(255, 255, 255, 0.3);
    }
  }

  .sidebar-label {
    writing-mode: sideways-lr;
    text-orientation: sideways;
    font-size: 11px;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    user-select: none;
  }

  .event-content {
    flex: 1;
    padding: 16px;
  }

  .concept-set-section {
    margin-bottom: 16px;
  }

  .concept-set-label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }

  .concept-set-readonly {
    padding: 8px 12px;
    background: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 14px;
    color: #666;
  }

  .attributes-section {
    margin-bottom: 16px;
  }

  .selected-attributes {
    margin-bottom: 16px;

    &-title {
      margin: 0 0 8px 0;
      font-size: 13px;
      font-weight: 600;
      color: #333;
    }
  }

  .attribute-component {
    margin-bottom: 16px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fafafa;
    overflow: hidden;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .attribute-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f0f0f0;
    border-bottom: 1px solid #e0e0e0;
  }

  .attribute-title {
    font-size: 13px;
    font-weight: 600;
    color: #333;
  }

  .attribute-remove {
    width: 20px;
    height: 20px;
    border: 1px solid #d0d0d0;
    background: #fff;
    border-radius: 3px;
    color: #666;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
      border-color: #dc3545;
      color: #dc3545;
      background: #fff5f5;
    }
  }

  .attribute-nested {
    padding: 12px;
  }

  .attribute-concept-set {
    padding: 12px;

    &-label {
      display: block;
      margin-bottom: 8px;
      font-size: 12px;
      font-weight: 500;
      color: #666;
    }

    &-readonly {
      padding: 8px 12px;
      background: #f8f9fa;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 13px;
      color: #666;
    }
  }

  .attribute-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .attribute-chip {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    background: #e3f2fd;
    border: 1px solid #bbdefb;
    border-radius: 16px;
    font-size: 12px;

    &-text {
      color: #1565c0;
      font-weight: 500;
    }

    &-remove {
      margin-left: 6px;
      background: none;
      border: none;
      color: #1565c0;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      padding: 0;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;

      &:hover {
        background: rgba(21, 101, 192, 0.1);
      }
    }
  }

  .nested-criteria-section {
    border-top: 1px solid #e0e0e0;
    background: #f9f9f9;
  }
}
</style>
