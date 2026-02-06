<template>
  <transition name="modal-fade">
    <div v-if="isOpen" class="modal-overlay" @click.self="handleClose">
      <div class="modal-container">
        <!-- Close Button -->
        <button class="modal-close-btn" @click="handleClose" :title="'Close'">
          <span class="icon" style="font-family: app-icons">&#xe60f;</span>
        </button>

        <!-- Back Button (when viewing iframe) -->
        <button v-if="selectedDashboard" class="modal-back-btn" @click="handleBack">
          <span class="icon" style="font-family: app-icons">&#xe619;</span>
          <span>Back to Dashboards</span>
        </button>

        <!-- Card Grid View -->
        <div v-if="!selectedDashboard" class="modal-content">
          <h2 class="modal-title">ShinyLive Dashboards</h2>
          
          <!-- Loading State -->
          <div v-if="loading" class="loading-container">
            <div class="spinner"></div>
            <p>Loading dashboards...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="error-container">
            <span class="error-icon">⚠️</span>
            <p class="error-message">{{ error }}</p>
            <button class="retry-btn" @click="fetchDashboards">Retry</button>
          </div>

          <!-- Empty State -->
          <div v-else-if="dashboards.length === 0" class="empty-container">
            <span class="empty-icon">📊</span>
            <p>No dashboards available for this dataset</p>
          </div>

          <!-- Dashboard Cards -->
          <div v-else class="dashboard-grid">
            <DashboardCard
              v-for="dashboard in dashboards"
              :key="dashboard.id"
              :dashboard="dashboard"
              @select="handleSelectDashboard"
            />
          </div>
        </div>

        <!-- iframe View -->
        <div v-else class="iframe-container">
          <ShinyDashboardIframe
            :dashboard="selectedDashboard"
            :dataset-id="datasetId"
            :cohort-id="cohortId"
            :wizard-config="wizardConfig"
            :mriquery="mriquery"
          />
        </div>
      </div>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { DashboardService, type Dashboard } from '@/api/DashboardService'
import DashboardCard from './DashboardCard.vue'
import ShinyDashboardIframe from './ShinyDashboardIframe.vue'

const props = defineProps<{
  isOpen: boolean
  datasetId: string
  cohortId: string
  wizardConfig?: Record<string, any>
  mriquery?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const dashboards = ref<Dashboard[]>([])
const selectedDashboard = ref<Dashboard | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const dashboardService = new DashboardService()

// Fetch dashboards when modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen && dashboards.value.length === 0) {
      fetchDashboards()
    }
  },
  { immediate: true }
)

async function fetchDashboards() {  
  loading.value = true
  error.value = null

  try {
    dashboards.value = await dashboardService.getDashboards({
      datasetId: props.datasetId,
    })
  } catch (err) {
    console.error('Failed to fetch dashboards:', err)
    error.value = 'Failed to load dashboards. Please try again.'
  } finally {
    loading.value = false
  }
}

function handleSelectDashboard(dashboard: Dashboard) {
  selectedDashboard.value = dashboard
}

function handleBack() {
  selectedDashboard.value = null
}

function handleClose() {
  selectedDashboard.value = null
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-container {
  position: relative;
  background: #f9fafb;
  width: 100%;
  height: 100%;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
  width: 40px;
  height: 40px;
  border: none;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #6b7280;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.modal-close-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
  transform: scale(1.05);
}

.modal-back-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
  padding: 10px 20px;
  border: none;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.modal-back-btn:hover {
  background: #f3f4f6;
  transform: translateX(-2px);
}

.modal-back-btn .icon {
  font-size: 16px;
}

.modal-content {
  flex: 1;
  padding: 80px 60px 60px;
  overflow-y: auto;
}

.modal-title {
  margin: 0 0 40px 0;
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  text-align: center;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-container p,
.empty-container p {
  margin-top: 16px;
  font-size: 16px;
  color: #6b7280;
}

.error-icon,
.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.error-message {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #dc2626;
}

.retry-btn {
  padding: 10px 24px;
  border: none;
  background: #3b82f6;
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #2563eb;
}

.iframe-container {
  flex: 1;
  padding: 80px 20px 20px;
  display: flex;
}

/* Transition animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-container {
  animation: modal-slide-in 0.3s ease;
}

.modal-fade-leave-active .modal-container {
  animation: modal-slide-out 0.3s ease;
}

@keyframes modal-slide-in {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes modal-slide-out {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(0.95);
    opacity: 0;
  }
}
</style>
