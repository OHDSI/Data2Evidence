<script setup lang="ts">
import bsCard from '@/lib/ui/bs-card.vue'
import appTab from '@/lib/ui/app-tab.vue'
import { ref, computed } from 'vue'
import InclusionReport from './InclusionReport/index.vue'

const props = defineProps<{
  cohortDefinitionId: number
  availableSources: any[]
  patientCounts?: Record<string, number | null>
  isGeneratingCohort?: boolean
  generationStatus: Record<string, 'idle' | 'pending' | 'complete' | 'failed'>
}>()

const tabList = [
  {
    text: 'Inclusion report',
    value: 'inclusion_report',
  },
  {
    text: 'Analysis',
    value: 'analysis',
  },
  {
    text: 'Sample',
    value: 'sample',
  },
]

const selectedView = ref<'inclusion_report' | 'analysis' | 'sample'>('inclusion_report')
const activeDataset = ref<string>(props.availableSources[0].sourceKey)

// Emit an event to parent to trigger cohort generation for a source
const emit = defineEmits(['generate-cohort'])

const getPatientCountStatus = (sourceKey: string) => {
  const status = props.generationStatus[sourceKey]
  const count = props.patientCounts?.[sourceKey]

  if (status === 'pending') return 'pending'
  if (status === 'failed') return 'failed'
  if (count !== null && count !== undefined) return 'success'
  return 'not-generated'
}

const getDisplayPatientCount = (sourceKey: string) => {
  const countStatus = getPatientCountStatus(sourceKey)

  switch (countStatus) {
    case 'pending':
      return 'Pending'
    case 'failed':
      return 'Failed'
    case 'success':
      return props.patientCounts![sourceKey].toLocaleString()
    case 'not-generated':
    default:
      return 'Not generated'
  }
}

const shouldShowPatientLabel = (sourceKey: string) => {
  return getPatientCountStatus(sourceKey) === 'success'
}

const handleGenerateCohort = (sourceKey: string) => {
  emit('generate-cohort', sourceKey)
}

const isGeneratingForSource = (sourceKey: string) => {
  return props.generationStatus[sourceKey] === 'pending'
}
const hasCohortGenerated = computed(() => {
  return props.patientCounts?.[activeDataset.value] !== null && props.patientCounts?.[activeDataset.value] !== undefined
})
</script>

<template>
  <div class="execute-content">
    <aside class="side">
      <!-- dataset list -->
      <h3 class="sidepanel-title">Datasets</h3>
      <div v-for="source in availableSources" :key="source.sourceId">
        <bsCard
          class="dataset-card"
          v-bind:class="{ 'active-dataset': activeDataset === source.sourceKey }"
          @click="activeDataset = source.sourceKey"
        >
          <template v-slot:header>
            <div class="card-header-content">
              <h3>{{ source.sourceName }}</h3>
            </div>
          </template>
          <div class="card-body-content">
            <div class="patient-count-display">
              <div v-if="isGeneratingForSource(source.sourceKey)" class="patient-count-label generating-label">
                Generating...
              </div>
              <div v-else>
                <!-- "Uninitialised" or something when it's never been generated? -->
                <div
                  class="patient-count-value"
                  :class="{ 'patient-count-actual': getPatientCountStatus(source.sourceKey) === 'success' }"
                >
                  {{ getDisplayPatientCount(source.sourceKey) }}
                </div>
                <div v-if="shouldShowPatientLabel(source.sourceKey)" class="patient-count-label">Patients</div>
              </div>
            </div>
            <div class="card-controls">
              <div class="generate-spinner-container" v-if="isGeneratingForSource(source.sourceKey)">
                <d4l-spinner class="generate-spinner" size="1" />
              </div>

              <button
                v-else
                @click.stop="handleGenerateCohort(source.sourceKey)"
                :disabled="isGeneratingForSource(source.sourceKey)"
                class="btn btn-primary generate-cohort-btn"
              >
                Generate cohort
              </button>
            </div>
          </div>
        </bsCard>
      </div>

      <div style="height: 24px"></div>
    </aside>
    <!-- Main content -->
    <section class="main-content">
      <appTab class="tabs" :tabItems="tabList" :value="selectedView" @onSelectedChange="selectedView = $event" />
      <div class="tab-content">
        <div v-if="generationStatus[activeDataset] === 'pending'" class="status-message pending">
          Generating cohort... Please wait
        </div>
        <div v-else-if="generationStatus[activeDataset] === 'failed'" class="status-message error">
          Cohort generation failed. Please try again.
        </div>
        <div v-else-if="!hasCohortGenerated" class="status-message">Please generate the cohort first</div>
        <div v-else>
          <InclusionReport
            v-if="selectedView === 'inclusion_report'"
            :cohort-definition-id="cohortDefinitionId"
            :source-key="activeDataset"
            :modeId="1"
            :generation-status="generationStatus[activeDataset]"
            :patient-count="patientCounts?.[activeDataset]"
          />
          <h3 v-if="selectedView === 'analysis'">Analysis</h3>
          <h3 v-if="selectedView === 'sample'">Sample</h3>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
:global(.dataset-card .card-header) {
  background-color: transparent;
  border-bottom: none;
  padding: 12px;
}

.status-message {
  padding: 2rem;
  text-align: center;
  color: var(--color-neutral);

  &.error {
    color: var(--color-feedback-error);
  }
}

.dataset-card {
  border-radius: 8px;
  background-color: white;
  border: none;
}
.active-dataset {
  border: 2px solid var(--color-primary);
  box-sizing: border-box;
}
:global(.dataset-card .card-body) {
  padding-top: 8px;
  padding-bottom: 16px;
}

.card-body-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-left: 0;
  padding-right: 0;
}

.main-content {
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  width: 70%;
  .tabs {
    width: 100%;
    margin-bottom: -5px;
    z-index: 1;

    :global(.app-list) {
      margin-top: 0;
      margin-bottom: 0;
      width: 100%;
      display: flex;
      justify-content: space-between;
      background-color: transparent;
    }

    :global(.app-listItem) {
      width: 100%;
      // text-align: center;
      background-color: transparent !important;
      color: var(--color-primary) !important;
      font-size: 1.2rem !important;
    }
  }

  .tab-content {
    background-color: white;
    height: 100%;
    border-radius: 8px;
    overflow-y: scroll;
    // height: 100%;
  }
}

.generate-spinner-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: end;

  :global(.generate-spinner .spinner) {
    width: 22px;
    height: 22px;
    border-width: 4px;
  }
}

.card-header-content {
  width: 100%;
  h3 {
    margin: 0;
    flex: 1;
    min-width: 0;
    color: var(--color-support-soft-red);
    font-weight: normal;
  }
}

.card-controls {
  display: flex;
  justify-content: end;
  gap: 12px;
  flex-shrink: 0;
  white-space: nowrap;

  .generate-cohort-btn {
    gap: 6px;
    padding: 8px 16px;
    font-size: 16px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    width: fit-content;
    &.btn-primary {
      background-color: var(--color-primary);
      color: #fff;

      &:hover:not(:disabled) {
        background-color: var(--color-primary-light);
      }

      &:disabled {
        background-color: #e0e0e0;
        color: #9e9e9e;
        cursor: not-allowed;
      }
    }

    .btn-icon {
      width: 14px;
      height: 14px;

      :deep(svg) {
        width: 14px;
        height: 14px;
      }
    }

    &.btn-primary .btn-icon {
      :deep(svg) {
        fill: white !important;
      }

      :deep(path) {
        fill: white !important;
      }

      :deep(g) {
        fill: white !important;
      }
    }
  }
}

.patient-count-display {
  display: flex;
  align-items: center;
  justify-content: end;
  gap: 4px;
  min-height: 36px;

  .patient-count-label {
    font-size: 16px;
    color: var(--color-neutral);
    letter-spacing: 0.5px;
    &.generating-label {
      min-height: 50px;
      display: flex;
      align-items: center;
    }
  }

  .patient-count-value {
    font-size: 16px;
    color: var(--color-neutral);
    min-width: 40px;

    &.patient-count-actual {
      font-size: 20px;
      color: var(--color-primary);
      font-weight: 700;
    }
  }
}
.side {
  padding-right: 1rem;
  height: 100%;
  overflow-y: auto;
  width: 30%;

  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-self: start;

  .sidepanel-title {
    text-align: center;
    margin-bottom: 1rem;
    font-weight: normal;
  }
}

.execute-content {
  // margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  // display: grid;
  // grid-template-columns: 1fr 2fr;
  gap: 1.5rem;
  height: calc(100vh - 49px - 16px);
}
</style>

