<template>
  <div class="bs-dropdown-item" @click="handleClick" @keydown="onKeydown" role="menuitem" tabindex="-1">
    <slot></slot>
  </div>
</template>

<script lang="ts">
export default {
  name: 'bs-dropdown-item',
  compatConfig: {
    MODE: 3, // Run in Vue 3 mode for proper behavior
  },
}
</script>

<script setup lang="ts">
const emit = defineEmits(['click'])

const handleClick = (event: Event) => {
  emit('click', event)
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleClick(event)
  }
}
</script>

<style lang="scss">
.bs-dropdown-item {
  display: block;
  width: 100%;
  padding: 0.375rem 1.5rem;
  clear: both;
  font-weight: 400;
  color: #212529;
  text-align: inherit;
  text-decoration: none;
  white-space: nowrap;
  background-color: transparent;
  border: 0;
  cursor: pointer;

  &:hover,
  &:focus {
    color: #16181b;
    background-color: #e9ecef;
  }

  &:active {
    color: #fff;
    background-color: #007bff;
  }
}
</style>
