<template>
  <MessageBox v-if="isOpen" messageType="custom" dialogWidth="640px" @close="handleClose">
    <template #header>{{ getText('MRI_PA_SELECT_DASHBOARD_TITLE') }}</template>

    <template #body>
      <div class="dashboard-selection-modal">
        <p class="description">{{ getText('MRI_PA_SELECT_DASHBOARD_DESC') }}</p>

        <p v-if="loading" class="status-text">{{ getText('MRI_PA_LOADING_DASHBOARDS') }}</p>
        <p v-else-if="error" class="error-text">{{ error }}</p>
        <p v-else-if="dashboards.length === 0" class="status-text">{{ getText('MRI_PA_NO_DASHBOARDS_AVAILABLE') }}</p>
        <p v-else-if="availableDashboards.length === 0 && dashboards.length > 0" class="status-text">
          {{ getText('MRI_PA_NO_CONFIGURED_DASHBOARDS') }}
        </p>

        <ul v-else class="dashboard-list">
          <li v-for="dashboard in availableDashboards" :key="dashboard.id" class="dashboard-item">
            <label class="dashboard-option">
              <input
                type="radio"
                name="dashboard-selection"
                :value="dashboard.id"
                v-model="selectedDashboardId"
              />
              <div class="dashboard-info">
                <span class="dashboard-name">{{ dashboard.name }}</span>
                <span v-if="dashboard.description" class="dashboard-description">{{ dashboard.description }}</span>
              </div>
            </label>
          </li>
        </ul>
      </div>
    </template>

    <template #footer>
      <div class="flex-spacer"></div>
      <appButton :click="handleContinue" :text="getText('MRI_PA_BUTTON_CONTINUE')" :disabled="loading || !selectedDashboardId" />
      <appButton :click="handleClose" :text="getText('MRI_PA_BUTTON_CANCEL')" :disabled="loading" />
    </template>
  </MessageBox>
</template>

<script lang="ts" setup>
import { computed, ref, watch, type PropType } from 'vue'
import { useStore } from 'vuex'
import MessageBox from '../MessageBox.vue'
import appButton from '@/lib/ui/app-button.vue'
import type { WizardDefinition } from '@/utils/dashboardFlowUtils'

const store = useStore()
const getText = (key: string, param?: string | string[]) => store.getters.getText(key, param)

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
  wizardDefinitions: WizardDefinition[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', dashboard: DashboardCode): void
}>()

const selectedDashboardId = ref('')

const availableDashboards = computed(() => {
  // Config-first: only show dashboards that exist in BOTH config AND API
  return props.wizardDefinitions
    .filter(wizard => props.dashboards.some(api => api.name === wizard.id))
    .map(wizard => ({
      id: wizard.id,
      name: wizard.name,
      description: wizard.description
    }))
})

const selectedDashboard = computed(() => {
  return props.dashboards.find(dashboard => dashboard.name === selectedDashboardId.value)
})

watch(
  () => props.isOpen,
  isOpen => {
    if (isOpen) {
      selectedDashboardId.value = ''
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
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
}

.dashboard-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dashboard-name {
  font-weight: 500;
}

.dashboard-description {
  font-size: 0.875rem;
  color: var(--color-neutral, #595757);
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
