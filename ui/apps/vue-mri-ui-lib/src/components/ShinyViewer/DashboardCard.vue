<template>
  <div class="dashboard-card" @click="$emit('select', dashboard)">
    <div class="dashboard-card-content">
      <h3 class="dashboard-card-title">{{ displayName }}</h3>
      <p class="dashboard-card-description">{{ dashboard.description }}</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import type { Dashboard } from '@/api/DashboardService'

const props = defineProps<{
  dashboard: Dashboard
}>()

defineEmits<{
  (e: 'select', dashboard: Dashboard): void
}>()

// Convert kebab-case name to Title Case for display
const displayName = computed(() => {
  return props.dashboard.name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
})
</script>

<style scoped>
.dashboard-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dashboard-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}

.dashboard-card:active {
  transform: translateY(0);
}

.dashboard-card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.dashboard-card-title {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.dashboard-card-description {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}
</style>
