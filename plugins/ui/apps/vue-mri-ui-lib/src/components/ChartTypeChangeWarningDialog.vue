<template>
  <VDialog
    :model-value="modelValue"
    class="chart-type-warning-dialog"
    max-width="540"
    width="calc(100vw - 48px)"
    @update:modelValue="onModelUpdate"
  >
    <v-card class="chart-type-warning-card">
      <v-card-title class="chart-type-warning-dialog__header">
        <span>{{ getText('MRI_PA_CHANGE_CHART_TYPE_TITLE') }}</span>
        <v-btn
          icon
          variant="text"
          density="comfortable"
          color="primary"
          class="chart-type-warning-dialog__close"
          :aria-label="getText('MRI_PA_CLOSE_BUTTON')"
          @click="onCancel"
        >
          <span class="chart-type-warning-dialog__close-icon" aria-hidden="true">&#215;</span>
        </v-btn>
      </v-card-title>

      <v-card-text class="chart-type-warning-body">
        <p class="chart-type-warning-message">
          <template v-for="(segment, index) in messageSegments" :key="index">
            <strong v-if="segment.bold">{{ segment.text }}</strong>
            <template v-else>{{ segment.text }}</template>
          </template>
        </p>
      </v-card-text>

      <v-card-actions class="chart-type-warning-actions">
        <v-btn
          variant="outlined"
          class="chart-type-warning-button chart-type-warning-button--secondary"
          :title="getText('MRI_PA_BUTTON_CANCEL')"
          @click="onCancel"
        >
          {{ getText('MRI_PA_BUTTON_CANCEL') }}
        </v-btn>
        <v-btn
          variant="flat"
          class="chart-type-warning-button chart-type-warning-button--primary"
          :title="getText('MRI_PA_CHANGE_CHART_TYPE_CONFIRM')"
          @click="onConfirm"
        >
          {{ getText('MRI_PA_CHANGE_CHART_TYPE_CONFIRM') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </VDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import VDialog from './vuetify/VDialog.vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const store = useStore()
const getText = (key: string, param?: string | string[]) => store?.getters?.getText?.(key, param) ?? key

// Build the warning message from a full localized sentence with {0}/{1} placeholders,
// rendering the two referenced feature names in bold to match the design.
const messageSegments = computed<{ text: string; bold: boolean }[]>(() => {
  const template = getText('MRI_PA_CHANGE_CHART_TYPE_MESSAGE')
  const terms = [getText('MRI_PA_COLOUR_BY'), getText('MRI_PA_X_AXIS_2')]
  const segments: { text: string; bold: boolean }[] = []
  const placeholder = /\{(\d+)\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = placeholder.exec(template)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: template.slice(lastIndex, match.index), bold: false })
    }
    const termIndex = Number(match[1])
    segments.push({ text: terms[termIndex] ?? match[0], bold: true })
    lastIndex = placeholder.lastIndex
  }
  if (lastIndex < template.length) {
    segments.push({ text: template.slice(lastIndex), bold: false })
  }
  return segments
})

function onCancel() {
  emit('cancel')
}

function onConfirm() {
  emit('confirm')
}

function onModelUpdate(value: boolean) {
  // Closing via backdrop/Esc is treated as a cancel.
  if (!value) emit('cancel')
}
</script>

<style scoped>
.chart-type-warning-card {
  --warning-brand: var(--color-mri-brand, #000080);
  --warning-border: #cccfe5;
  --warning-divider: #dedcda;
  --warning-font: var(--app-font-family);
  --warning-on-primary: #faf8f8;

  background: #fff;
  border-radius: 16px;
  box-shadow:
    0 6px 30px 5px rgba(0, 0, 0, 0.12),
    0 16px 24px 2px rgba(0, 0, 0, 0.14),
    0 8px 10px -5px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.chart-type-warning-dialog__header {
  align-items: center;
  color: var(--warning-brand);
  display: flex;
  font-family: var(--warning-font);
  font-size: 18px;
  font-weight: 600;
  justify-content: space-between;
  letter-spacing: 0;
  line-height: 1.2;
  padding: 24px 24px 12px;
  white-space: normal;
  width: 100%;
}

.chart-type-warning-dialog__close {
  color: var(--warning-brand);
  flex: 0 0 auto;
  margin: -4px -4px 0 16px;
  min-width: 32px;
}

.chart-type-warning-dialog__close-icon {
  font-size: 24px;
  font-weight: 400;
  line-height: 1;
}

.chart-type-warning-body {
  padding: 16px 24px 24px;
}

.chart-type-warning-message {
  color: var(--color-ui-darkest-text, #000);
  font-family: var(--warning-font);
  font-size: 16px;
  line-height: 1.5;
  margin: 0;
  word-break: break-word;
}

.chart-type-warning-message strong {
  font-weight: 700;
}

.chart-type-warning-actions {
  align-items: flex-start;
  border-top: 1px solid var(--warning-divider);
  display: flex;
  gap: 16px;
  padding: 16px 24px;
}

.chart-type-warning-button {
  border-radius: 8px;
  cursor: pointer;
  flex: 1 1 0;
  font-family: var(--warning-font);
  font-size: 16px;
  font-weight: 500;
  height: 40px;
  letter-spacing: 0;
  line-height: 16px;
  margin: 0;
  min-width: 0;
  text-transform: none;
}

.chart-type-warning-button--secondary {
  background: #fff;
  border-color: var(--warning-border);
  color: var(--warning-brand);
}

.chart-type-warning-button--primary {
  background: var(--warning-brand);
  color: var(--warning-on-primary);
  /* elevation/2 from the design */
  box-shadow:
    0 3px 1px -2px rgba(0, 0, 0, 0.2),
    0 2px 2px 0 rgba(0, 0, 0, 0.14),
    0 1px 5px 0 rgba(0, 0, 0, 0.12);
}

@media (max-width: 620px) {
  .chart-type-warning-dialog__header {
    padding: 20px 20px 12px;
  }

  .chart-type-warning-body {
    padding: 16px 20px 24px;
  }

  .chart-type-warning-actions {
    padding: 16px 20px;
  }
}
</style>
