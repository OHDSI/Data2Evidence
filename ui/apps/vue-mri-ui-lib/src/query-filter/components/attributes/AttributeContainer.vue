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

const props = defineProps<{
  attribute: QueryFilterAttribute
  onRemoveAttribute?: () => void
}>()

console.log('AttributeContainer props:', props.attribute)

const isBooleanAttribute = (attribute: QueryFilterAttribute) => {
  return 'configType' in attribute && attribute.configType === 'boolean'
}

const getDescription = (attribute: QueryFilterAttribute) => {
  return ('description' in attribute && attribute.description) || 'No description available'
}
</script>

<template>
  <div class="attribute-container">
    <div class="attribute-title">{{ getDescription(props.attribute) }}</div>
    <div v-if="!isBooleanAttribute(props.attribute)" class="attribute-input">random input</div>
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
    padding: 15px;
    flex: 1;
    color: #000080;
    background: #ebf2fa;
    font-size: 16px;
    border-top-left-radius: 6px;
    border-bottom-left-radius: 6px;
    border-right: 1px solid #000080;
    padding: 15px;
    flex: 2;
  }

  .attribute-input {
    padding: 15px;
    flex: 2;
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

