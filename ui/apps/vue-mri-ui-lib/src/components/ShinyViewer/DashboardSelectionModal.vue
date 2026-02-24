<template>
  <MessageBox v-if="isOpen" messageType="custom" dialogWidth="640px" @close="handleClose">
    <template #header>Select Dashboard</template>

    <template #body>
      <div class="dashboard-selection-modal">
        <p class="description">Select a dashboard to open for the current cohort.</p>

        <p v-if="loading" class="status-text">Loading dashboards...</p>
        <p v-else-if="error" class="error-text">{{ error }}</p>
        <p v-else-if="dashboards.length === 0" class="status-text">No dashboards available for this dataset.</p>

        <ul v-else class="dashboard-list">
          <li v-for="(dashboard, index) in dashboards" :key="`${dashboard.name}-${index}`" class="dashboard-item">
            <label class="dashboard-option">
              <input
                type="radio"
                name="dashboard-selection"
                :value="dashboard.name"
                v-model="selectedDashboardName"
              />
              <span>{{ dashboard.name }}</span>
            </label>
          </li>
        </ul>
      </div>
    </template>

    <template #footer>
      <div class="flex-spacer"></div>
      <appButton :click="handleContinue" text="Continue" :disabled="loading || !selectedDashboardName" />
      <appButton :click="handleClose" text="Cancel" :disabled="loading" />
    </template>
  </MessageBox>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import MessageBox from '../MessageBox.vue'
import appButton from '@/lib/ui/app-button.vue'

interface DashboardCode {
  name: string
  code?: string
  type?: string
  language?: string
  queries?: Array<{ name: string; queryName: string; sql: string }>
}

const props = defineProps<{
  isOpen: boolean
  dashboards: DashboardCode[]
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', dashboard: DashboardCode): void
}>()

const selectedDashboardName = ref('')

const selectedDashboard = computed(() => {
  return props.dashboards.find(dashboard => dashboard.name === selectedDashboardName.value)
})

watch(
  () => props.isOpen,
  isOpen => {
    if (isOpen) {
      selectedDashboardName.value = ''
    }
  }
)

function handleClose() {
  emit('close')
}

function handleContinue() {
  if (!selectedDashboard.value) {
    return
  }
  emit('select', selectedDashboard.value)
}
</script>

<style scoped>
.dashboard-selection-modal {
  min-height: 180px;
}

.description {
  margin-bottom: 12px;
}

.dashboard-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 260px;
  overflow: auto;
  border: 1px solid var(--color-ui-light-border, #d9d9d9);
  border-radius: 8px;
}

.dashboard-item {
  border-bottom: 1px solid var(--color-ui-light-border, #ededed);
}

.dashboard-item:last-child {
  border-bottom: none;
}

.dashboard-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
}

.status-text {
  color: var(--color-neutral, #595757);
}

.error-text {
  color: var(--color-feedback-error, #a3293d);
}

.flex-spacer {
  flex: 1;
}
</style>
