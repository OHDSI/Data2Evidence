<template>
  <div class="query-filter-chip" :class="chipClasses">
    <span class="query-filter-chip__label">{{ chip.label }}</span>
    <button
      v-if="removable"
      class="query-filter-chip__remove"
      @click="$emit('remove')"
      :aria-label="`Remove ${chip.label}`"
    >
      <i class="icon icon-times"></i>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue'
import { QueryFilterChip } from '../lib/models/QueryFilterModel'

export default defineComponent({
  name: 'QueryFilterChip',
  props: {
    chip: {
      type: Object as PropType<QueryFilterChip>,
      required: true,
    },
    removable: {
      type: Boolean,
      default: true,
    },
    variant: {
      type: String as PropType<'default' | 'primary' | 'secondary'>,
      default: 'default',
    },
  },
  emits: ['remove'],
  setup(props) {
    const chipClasses = computed(() => {
      const classes: Record<string, boolean> = {
        [`query-filter-chip--${props.variant}`]: true,
        'query-filter-chip--removable': props.removable,
      }

      if (props.chip.color) {
        classes[`query-filter-chip--${props.chip.color}`] = true
      }

      return classes
    })

    return {
      chipClasses,
    }
  },
})
</script>

<style lang="scss" scoped>
.query-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #e0f2fe;
  border: 1px solid #7dd3fc;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.4;
  color: #0369a1;
  transition: all 0.2s;
  max-width: 200px;

  &--removable {
    padding-right: 8px;
  }

  &__label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__remove {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    color: #0369a1;
    opacity: 0.7;
    transition: opacity 0.2s;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;

    &:hover {
      opacity: 1;
    }

    .icon {
      font-size: 10px;
    }
  }

  // Variants
  &--default {
    background: #e0f2fe;
    border-color: #7dd3fc;
    color: #0369a1;

    .query-filter-chip__remove {
      color: #0369a1;
    }
  }

  &--primary {
    background: #dbeafe;
    border-color: #60a5fa;
    color: #1e40af;

    .query-filter-chip__remove {
      color: #1e40af;
    }
  }

  &--secondary {
    background: #f3f4f6;
    border-color: #d1d5db;
    color: #374151;

    .query-filter-chip__remove {
      color: #374151;
    }
  }

  // Color variants (can be used with custom colors)
  &--blue {
    background: #dbeafe;
    border-color: #60a5fa;
    color: #1e40af;
  }

  &--green {
    background: #d1fae5;
    border-color: #6ee7b7;
    color: #065f46;
  }

  &--red {
    background: #fee2e2;
    border-color: #fca5a5;
    color: #991b1b;
  }

  &--yellow {
    background: #fef3c7;
    border-color: #fcd34d;
    color: #92400e;
  }

  &--purple {
    background: #ede9fe;
    border-color: #a78bfa;
    color: #5b21b6;
  }

  &--gray {
    background: #f3f4f6;
    border-color: #d1d5db;
    color: #374151;
  }

  // Hover states
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
}
</style>

