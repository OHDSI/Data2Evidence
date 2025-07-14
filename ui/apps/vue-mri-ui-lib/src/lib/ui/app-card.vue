<template>
  <div class="app-card">
    <div v-if="hasHeader" class="app-card__header">
      <slot name="header">
        <h5 v-if="title" class="app-card__title">{{ title }}</h5>
      </slot>
    </div>
    <div class="app-card__body">
      <slot></slot>
    </div>
    <div v-if="hasFooter" class="app-card__footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

interface Props {
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
})

const slots = useSlots()

const hasHeader = computed(() => slots.header || props.title)
const hasFooter = computed(() => slots.footer)
</script>

<script lang="ts">
export default {
  compatConfig: {
    MODE: 3,
  },
}
</script>

<style lang="scss">
// Base Bootstrap card styles (self-contained since Bootstrap is removed)
.app-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  word-wrap: break-word;
  background-color: #fff;
  background-clip: border-box;
  border: 1px solid rgba(0, 0, 0, 0.125);
  border-radius: 0.25rem;

  &__header {
    padding: 0.75rem 1.25rem;
    margin-bottom: 0;
    background-color: rgba(0, 0, 0, 0.03);
    border-bottom: 1px solid rgba(0, 0, 0, 0.125);

    &:first-child {
      border-radius: calc(0.25rem - 1px) calc(0.25rem - 1px) 0 0;
    }
  }

  &__title {
    margin-bottom: 0;
    font-size: 1.25rem;
    font-weight: 500;
    line-height: 1.2;
    color: inherit;
  }

  &__body {
    flex: 1 1 auto;
    min-height: 1px;
    padding: 1.25rem;
    color: inherit;
  }

  &__footer {
    padding: 0.75rem 1.25rem;
    background-color: rgba(0, 0, 0, 0.03);
    border-top: 1px solid rgba(0, 0, 0, 0.125);

    &:last-child {
      border-radius: 0 0 calc(0.25rem - 1px) calc(0.25rem - 1px);
    }
  }
}
</style>
