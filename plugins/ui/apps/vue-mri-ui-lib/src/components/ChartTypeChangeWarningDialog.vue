<template>
  <VDialog
    :model-value="modelValue"
    class="ctw-dialog"
    max-width="540"
    width="calc(100vw - 48px)"
    @update:modelValue="onModelUpdate"
  >
    <!--
      Built from plain elements (not v-card/v-btn) so the Figma spec is honoured exactly:
      Vuetify's global VCardTitle/VCardText/VBtn `defaults` inject inline styles
      (font-size, weight, padding) that would otherwise override scoped CSS.
    -->
    <div class="ctw-card" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <div class="ctw-header">
        <span :id="titleId" class="ctw-title">{{ getText('MRI_PA_CHANGE_CHART_TYPE_TITLE') }}</span>
        <button type="button" class="ctw-close" :aria-label="getText('MRI_PA_CLOSE_BUTTON')" @click="onCancel">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <div class="ctw-content">
        <p class="ctw-message">
          <template v-for="(segment, index) in messageSegments" :key="index">
            <strong v-if="segment.bold">{{ segment.text }}</strong>
            <template v-else>{{ segment.text }}</template>
          </template>
        </p>
      </div>

      <div class="ctw-actions">
        <button type="button" class="ctw-btn ctw-btn--secondary" @click="onCancel">
          {{ getText('MRI_PA_BUTTON_CANCEL') }}
        </button>
        <button type="button" class="ctw-btn ctw-btn--primary" @click="onConfirm">
          {{ getText('MRI_PA_CHANGE_CHART_TYPE_CONFIRM') }}
        </button>
      </div>
    </div>
  </VDialog>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import { useStore } from 'vuex'
import VDialog from './vuetify/VDialog.vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const store = useStore()
const getText = (key: string, param?: string | string[]) => store?.getters?.getText?.(key, param) ?? key

const titleId = useId()

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
.ctw-card {
  width: 540px;
  max-width: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow:
    0 6px 30px 5px rgba(0, 0, 0, 0.12),
    0 16px 24px 2px rgba(0, 0, 0, 0.14),
    0 8px 10px -5px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  font-family: var(--app-font-family, 'IBM Plex Sans', sans-serif);
}

.ctw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 24px 12px;
}

.ctw-title {
  color: #000080;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0;
  word-break: break-word;
}

.ctw-close {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: #000080;
  cursor: pointer;
  border-radius: 4px;
}

.ctw-close:hover {
  background: rgba(0, 0, 128, 0.06);
}

.ctw-close:focus-visible {
  outline: 2px solid #000080;
  outline-offset: 1px;
}

.ctw-content {
  padding: 16px 24px 24px;
}

.ctw-message {
  margin: 0;
  color: #000;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
  word-break: break-word;
}

.ctw-message strong {
  font-weight: 700;
}

.ctw-actions {
  display: flex;
  gap: 16px;
  padding: 16px 24px;
  border-top: 1px solid #dedcda;
}

.ctw-btn {
  flex: 1 1 0;
  min-width: 0;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 22px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-family: inherit;
  font-size: 16px;
  font-weight: 500;
  line-height: 16px;
  letter-spacing: 0;
  cursor: pointer;
  text-transform: none;
  transition: background-color 0.15s ease;
}

.ctw-btn--secondary {
  background: #fff;
  border-color: #cccfe5;
  color: #000080;
}

.ctw-btn--secondary:hover {
  background: rgba(0, 0, 128, 0.04);
}

.ctw-btn--primary {
  background: #000080;
  color: #faf8f8;
  /* elevation/2 from the design */
  box-shadow:
    0 3px 1px -2px rgba(0, 0, 0, 0.2),
    0 2px 2px 0 rgba(0, 0, 0, 0.14),
    0 1px 5px 0 rgba(0, 0, 0, 0.12);
}

.ctw-btn--primary:hover {
  background: #000066;
}

.ctw-btn:focus-visible {
  outline: 2px solid #000080;
  outline-offset: 2px;
}

@media (max-width: 620px) {
  .ctw-header {
    padding: 20px 20px 12px;
  }

  .ctw-content {
    padding: 16px 20px 24px;
  }

  .ctw-actions {
    padding: 16px 20px;
  }
}
</style>
