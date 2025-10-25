<script setup lang="ts">
import bsCard from '../lib/ui/bs-card.vue'
import appTab from '@/lib/ui/app-tab.vue'
import { ref } from 'vue'

const props = defineProps<{
  availableSources: any[]
  patientCounts?: Record<string, number | null>
  isGeneratingCohort?: boolean
  generationStatus?: 'idle' | 'pending' | 'complete' | 'failed'
  currentGeneratingSourceKey?: string
}>()

// Emit an event to parent to trigger cohort generation for a source
const emit = defineEmits(['generate-cohort'])

const getDisplayPatientCount = (sourceKey: string) => {
  if (props.generationStatus === 'pending' && props.currentGeneratingSourceKey === sourceKey) {
    return 'Pending'
  }
  if (props.generationStatus === 'failed' && props.currentGeneratingSourceKey === sourceKey) {
    return 'Failed'
  }
  const count = props.patientCounts?.[sourceKey]
  return count !== null && count !== undefined ? count.toLocaleString() : '-'
}

const handleGenerateCohort = (sourceKey: string) => {
  emit('generate-cohort', sourceKey)
}

const isGeneratingForSource = (sourceKey: string) => {
  return props.isGeneratingCohort && props.currentGeneratingSourceKey === sourceKey
}

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

const selectedView = ref('inclusion_report')
const activeDataset = ref(props.availableSources[0].sourceKey)
</script>

<template>
  <div class="execute-content">
    <aside class="side">
      <!-- dataset list -->
      <div v-for="source in availableSources" :key="source.sourceId">
        <bsCard
          v-bind:class="{ 'active-dataset': activeDataset === source.sourceKey }"
          @click="activeDataset = source.sourceKey"
        >
          <template v-slot:header>
            <div class="card-header-content">
              <h3>{{ source.sourceName }}</h3>
              <div class="card-header-controls">
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

                <div class="patient-count-display">
                  <span class="patient-count-value">{{ getDisplayPatientCount(source.sourceKey) }}</span>
                  <span class="patient-count-label">Patients</span>
                </div>
              </div>
            </div>
          </template>
        </bsCard>
      </div>
      <!--  -->
    </aside>
    <section>
      <appTab class="tabs" :tabItems="tabList" :value="selectedView" @onSelectedChange="selectedView = $event" />
      <div class="tab-content">
        <h3 v-if="selectedView === 'inclusion_report'">Attrition</h3>
        <h3 v-if="selectedView === 'analysis'">Analysis</h3>
        <h3 v-if="selectedView === 'sample'">Sample</h3>
        <div>{{ activeDataset }}</div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.active-dataset {
  border: 2px solid var(--color-primary);
}
.tabs {
  width: 100%;

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
.generate-spinner {
  :global(.spinner) {
    width: 10px;
    height: 10px;
    border-width: 3px;
  }
}
.generate-spinner-container {
  width: 20px;
  height: 20px;
  &--horizontal {
    .spinner {
      width: 20px;
      height: 20px;
    }
  }
}
.sidepanel-title {
  text-align: center;
  margin-bottom: 1rem;
}

.card-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  grid-template-columns: 3fr 1fr;
  gap: 1rem;
  width: 100%;

  h3 {
    margin: 0;
    flex: 1;
    min-width: 0;
    color: var(--color-support-soft-red);
    font-weight: normal;
  }

  .card-header-controls {
    display: flex;
    flex-direction: column;
    align-items: right;
    gap: 12px;
    flex-shrink: 0;
    white-space: nowrap;

    .generate-cohort-btn {
      gap: 6px;
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;

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

    .patient-count-display {
      display: flex;
      align-items: center;
      gap: 4px;

      .patient-count-label {
        font-size: 11px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .patient-count-value {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-primary);
        min-width: 40px;
        text-align: right;
      }
    }
  }
}

.side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  align-self: start;
  max-height: 80vh;
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding-right: 1rem;
  padding-top: 40px;
}

.execute-content {
  margin: 0 auto;
  padding: 1rem 0 1rem;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1.5rem;
}
</style>

