<template>
  <div class="bs-dropdown-divider"></div>
</template>

<script lang="ts">
export default {
  name: 'bs-dropdown-divider',
  compatConfig: {
    MODE: 3, // Run in Vue 3 mode for proper behavior
  },
}
</script>

<script setup lang="ts">
// No props or logic needed for divider
</script>

<style lang="scss">
.bs-dropdown-divider {
  height: 0;
  margin: 0.5rem 0;
  overflow: hidden;
  border-top: 1px solid #e9ecef;
}
</style>
