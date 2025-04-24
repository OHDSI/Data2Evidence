<template>
  <div class="side-bar">
    <p-context-nav-item title="Job Runs" to="/runs" />
    <p-context-nav-item title="Jobs" to="/deployments" />
  </div>
</template>
  
  <script lang="ts" setup>
import { PContextNavItem } from '@prefecthq/prefect-design'
</script>

<style scoped>
.side-bar {
  margin-top: 5px;
  padding: 0 400px 0 400px;
  gap: 10px;
  display: flex;
  height: 40px;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
}

.p-context-nav-item {
  justify-content: center;
  background: none;
  border-radius: 0;
  font-weight: 700;

  &--active {
    border-bottom: 5px solid var(--color-primary);
  }
}
</style>