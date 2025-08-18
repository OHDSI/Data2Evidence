<script lang="ts">
export default {
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { defineProps } from 'vue'
import TrashIcon from '../icons/TrashIcon.vue'
import { QueryFilterAttribute } from '@/query-filter/types/QueryFilterTypes'
import DateInput from './DateInput.vue';

const props = defineProps<{
  attribute: QueryFilterAttribute
  onRemoveAttribute?: () => void
}>()

const emit = defineEmits<{
  (e: 'update-attribute', attributeId: string, value: any): void
}>()

console.log('AttributeContainer props:', props.attribute)

const isBooleanAttribute = (attribute: QueryFilterAttribute) => {
  return 'configType' in attribute && attribute.configType === 'boolean'
}

const getDescription = (attribute: QueryFilterAttribute) => {
  return ('description' in attribute && attribute.description) || 'No description available'
}

const getUpdate = (payload) => {
  console.log('Update attribute:', payload);
  console.log('Attribute ID:', props.attribute);
  
  emit('update-attribute', props.attribute.id, payload)
}

</script>

<template>
  <div class="attribute-container">
    <div class="attribute-title" :class="{ 'attribute-title__max-width': !isBooleanAttribute(attribute) }">{{ getDescription(props.attribute) }}</div>
    <div v-if="!isBooleanAttribute(props.attribute)" class="attribute-input">
        <DateInput v-if="props.attribute.configType === 'dateRange'" @update="getUpdate"/>
    </div>
    <div class="attribute-btn-container">
      <button
        class="remove-attribute-btn"
        title="Remove this attribute"
        @click="props.onRemoveAttribute && props.onRemoveAttribute()"
      >
        <TrashIcon />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.attribute-container {
  //   padding: 10px;
  display: flex;
  border-radius: 6px;
  border: 1px solid #000080;

  .attribute-title {
    display: flex;
    padding: 15px;
    flex: 1;
    color: #000080;
    background: #ebf2fa;
    font-size: 15px;
    border-top-left-radius: 6px;
    border-bottom-left-radius: 6px;
    border-right: 1px solid #000080;
    padding: 15px;
    flex: 2;

    &__max-width {
      max-width: 20%;
      align-items: center;
    }
  }

  .attribute-input {
    padding: 15px;
    flex: 2;
    border-right: 1px solid #000080;
    display: flex;
    align-items: center;
  }

  .attribute-btn-container {
    display: flex;
    .remove-attribute-btn {
      flex: 1;
      border: 1px solid transparent;
      background: #ebf2fa;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      padding: 6px 8px;
      border-top-right-radius: 6px;
      border-bottom-right-radius: 6px;

      &:hover {
        color: #000080;
        background: #f2f0f1;
      }
    }
  }
}
</style>

