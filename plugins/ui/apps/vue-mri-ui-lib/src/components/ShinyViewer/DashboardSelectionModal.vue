<template>
  <D2eDialog
    :model-value="isOpen"
    size="l"
    :title="getText('MRI_PA_SELECT_DASHBOARD_TITLE')"
    :close-label="getText('MRI_PA_CLOSE_BUTTON')"
    data-testid="pa-dashboard-selection-dialog"
    @close="handleClose"
  >
    <div class="dashboard-selection-body">
      <div v-if="loading" class="dashboard-selection-loading" data-testid="pa-dashboard-selection-loading">
        <VProgressCircular indeterminate color="primary" />
      </div>
      <p v-if="!loading" class="description">{{ getText('MRI_PA_SELECT_DASHBOARD_DESC') }}</p>

      <p v-if="!loading && error" class="error-text">{{ error }}</p>
      <p v-else-if="!loading && dashboards.length === 0" class="status-text">
        {{ getText('MRI_PA_NO_DASHBOARDS_AVAILABLE') }}
      </p>
      <p v-else-if="!loading && availableDashboards.length === 0 && dashboards.length > 0" class="status-text">
        {{ getText('MRI_PA_NO_CONFIGURED_DASHBOARDS') }}
      </p>

      <div
        v-else
        class="dashboard-grid"
        :class="{
          'dashboard-grid--single': availableDashboards.length === 1,
          'dashboard-grid--two': availableDashboards.length === 2,
        }"
      >
        <v-card
          v-for="dashboard in availableDashboards"
          :key="dashboard.id"
          class="dashboard-card"
          variant="flat"
          elevation="0"
          ripple
          role="button"
          tabindex="0"
          @click="handleDashboardSelect(dashboard.id)"
          @keydown.enter.prevent="handleDashboardSelect(dashboard.id)"
          @keydown.space.prevent="handleDashboardSelect(dashboard.id)"
        >
          <v-card-title class="dashboard-name">{{ dashboard.name }}</v-card-title>
          <v-card-text v-if="dashboard.description" class="dashboard-description">
            {{ dashboard.description }}
          </v-card-text>
        </v-card>
      </div>
    </div>
  </D2eDialog>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { D2eDialog } from '@d2e/ui'
import VProgressCircular from '../vuetify/VProgressCircular.vue'
import { isWizardVisibleOnSurface, type WizardDefinition } from '@/utils/dashboardFlowUtils'

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

const availableDashboards = computed(() => {
  // Config-first: only show dashboards that exist in BOTH config AND API
  return props.wizardDefinitions
    .filter(wizard => isWizardVisibleOnSurface(wizard, 'cohortBuilder'))
    .filter(wizard => props.dashboards.some(api => api.name === wizard.id))
    .map(wizard => ({
      id: wizard.id,
      name: wizard.name,
      description: wizard.description
    }))
})

function handleClose() {
  emit('close')
}

function handleDashboardSelect(dashboardId: string) {
  const dashboard = props.dashboards.find(dashboard => dashboard.name === dashboardId)
  if (!dashboard) {
    return
  }
  emit('select', dashboard)
}
</script>

<style scoped>
.dashboard-selection-body {
  min-height: 270px;
  position: relative;
}

.dashboard-selection-loading {
  align-items: center;
  background: rgb(255 255 255 / 70%);
  display: flex;
  inset: 0;
  justify-content: center;
  position: absolute;
  z-index: 1;
}

.description {
  color: #000;
  font-family: var(--app-font-family);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
  margin: 0 0 24px;
  max-width: 852px;
}

.dashboard-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-height: 222px;
}

.dashboard-grid--single {
  grid-template-columns: minmax(0, 273.33px);
}

.dashboard-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dashboard-card {
  background: #faf8f8;
  border: 1px solid #f2f0f1;
  border-radius: 16px !important;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  min-height: 222px;
  padding: 24px;
  box-shadow: none !important;
  text-align: left;
  transition:
    border-color 0.12s ease,
    box-shadow 0.12s ease,
    transform 0.12s ease;
}

.dashboard-card:hover,
.dashboard-card:focus-visible {
  border-color: var(--color-mri-brand, #000080);
  box-shadow: 0 4px 12px rgba(0, 0, 128, 0.12);
  outline: none;
  transform: translateY(-1px);
}

.dashboard-name {
  color: var(--color-mri-brand, #000080);
  font-family: var(--app-font-family);
  font-size: 18px !important;
  font-weight: 500 !important;
  line-height: 1.2 !important;
  padding: 0 !important;
  white-space: normal;
}

.dashboard-description {
  color: #595757;
  font-family: var(--app-font-family);
  font-size: 16px !important;
  font-weight: 400;
  line-height: 1.5;
  padding: 0 !important;
}

.status-text {
  color: var(--color-neutral, #595757);
}

.error-text {
  color: var(--color-feedback-error, #a3293d);
}

@media (max-width: 700px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-grid--single,
  .dashboard-grid--two {
    grid-template-columns: 1fr;
  }

  .dashboard-card {
    min-height: 180px;
  }
}
</style>
