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
  }
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
      [field]: value
    }
  }
  eventData.value = updatedEvent
}

// Handle concept set selection
const handleConceptSetSelected = (conceptSet: ConceptSetItem) => {
  const updatedEvent = {
    ...eventData.value,
    selectedConceptSet: conceptSet,
    conceptSetId: conceptSet.value,
    conceptSet: conceptSet.text || conceptSet.display_value || conceptSet.value,
    conceptSetLoading: true
  }
  eventData.value = updatedEvent
  emit('concept-set-selected', conceptSet)
}

// Handle attribute selection
const handleAttributeSelected = (attribute: AttributeConfig) => {
  // Add attribute to event
  const currentAttributes = eventData.value.selectedAttributes || []
  const updatedEvent = {
    ...eventData.value,
    selectedAttributes: [...currentAttributes, attribute.id]
  }
  eventData.value = updatedEvent
  emit('attribute-selected', attribute)
}

// Handle attribute removal
const handleAttributeRemoved = (attributeId: string) => {
  const currentAttributes = eventData.value.selectedAttributes || []
  const updatedEvent = {
    ...eventData.value,
    selectedAttributes: currentAttributes.filter(id => id !== attributeId)
  }
  eventData.value = updatedEvent
  emit('attribute-removed', attributeId)
}

// Handle event duplication
const duplicateEvent = () => {
  emit('duplicate-event')
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
  
  const typeText = {
    'AT_LEAST': 'At least',
    'exactly': 'Exactly',
    'atMost': 'At most'
  }[cardinality.type] || cardinality.type
  
  return `${typeText} ${cardinality.count}`
}
</script>

<template>
  <div 
    class="query-filter-event-card"
    :class="{
      'query-filter-event-card--nested': nestedLevel > 0,
      'query-filter-event-card--readonly': readonly,
      'query-filter-event-card--has-nested': hasNestedAttributes
    }"
  >
    <!-- Event Header -->
    <div class="event-header">
      <div class="event-header__left">
        <div class="event-type-indicator">
          <span class="event-type-label">
            {{ getEventTypeDisplay(eventData.criteriaType) }}
          </span>
          <span v-if="nestedLevel > 0" class="nested-indicator">
            (Level {{ nestedLevel }})
          </span>
        </div>
        
        <div class="event-cardinality">
          <span class="cardinality-label">Occurs:</span>
          <select 
            v-if="!readonly"
            :value="eventData.cardinality?.type || 'AT_LEAST'"
            class="cardinality-type-select"
            @change="updateCardinality('type', $event.target.value)"
          >
            <option value="AT_LEAST">At least</option>
            <option value="exactly">Exactly</option>
            <option value="atMost">At most</option>
          </select>
          <input 
            v-if="!readonly"
            :value="eventData.cardinality?.count || 1"
            type="number" 
            min="1" 
            max="999"
            class="cardinality-count-input"
            @input="updateCardinality('count', parseInt($event.target.value))"
          />
          <span v-else class="cardinality-readonly">
            {{ getCardinalityDisplay(eventData.cardinality) }}
          </span>
          <span class="cardinality-suffix">time(s)</span>
        </div>
      </div>
      
      <div class="event-header__right">
        <button 
          v-if="!readonly"
          class="btn-duplicate-event" 
          @click="duplicateEvent"
          title="Duplicate this event"
        >
          📋
        </button>
        <button 
          v-if="!readonly"
          class="btn-remove-event" 
          @click="removeEvent"
          title="Remove this event"
        >
          ×
        </button>
      </div>
    </div>
    
    <!-- Event Content -->
    <div class="event-content">
      <!-- Concept Set Selection -->
      <div class="concept-set-section">
        <label class="concept-set-label">Event Concept Set:</label>
        <QueryFilterTagInputAdapter
          v-if="!readonly"
          :model="tagInputModel"
          :external-value="eventData.selectedConceptSet ? [eventData.selectedConceptSet] : []"
          :external-domain-values="conceptSetDomainValues"
          :external-texts="conceptSetTexts"
          :is-catalog-attribute="false"
          @update:value="(values) => values[0] && handleConceptSetSelected(values[0])"
        />
        <div v-else class="concept-set-readonly">
          {{ eventData.conceptSet || 'No concept set selected' }}
        </div>
      </div>
      
      <!-- Attributes Section -->
      <div v-if="!readonly" class="attributes-section">
        <AttributesDropdown
          :event-id="eventData.id"
          :selected-attributes="eventData.selectedAttributes || []"
          @attribute-selected="handleAttributeSelected"
          @attribute-removed="handleAttributeRemoved"
        />
      </div>
      
      <!-- Selected Attributes Display -->
      <div v-if="eventData.selectedAttributes?.length" class="selected-attributes">
        <h5 class="selected-attributes-title">Selected Attributes:</h5>
        <div class="attribute-chips">
          <div 
            v-for="attributeId in eventData.selectedAttributes"
            :key="attributeId"
            class="attribute-chip"
          >
            <span class="attribute-chip-text">{{ attributeId }}</span>
            <button 
              v-if="!readonly"
              class="attribute-chip-remove"
              @click="handleAttributeRemoved(attributeId)"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Nested Criteria (Recursive) -->
    <div v-if="hasNestedAttributes && nestedCriteria" class="nested-criteria-section">
      <QueryFilterNestedCriteria
        :nested-criteria="nestedCriteria"
        :level="nestedLevel + 1"
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
  overflow: hidden;
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

  .btn-duplicate-event,
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

  .event-content {
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