<template>
  <D2eDialog
    :model-value="modelValue"
    :title="getText('MRI_PA_CHANGE_CHART_TYPE_TITLE')"
    :close-label="getText('MRI_PA_CLOSE_BUTTON')"
    data-testid="pa-chart-type-warning-dialog"
    @close="onCancel"
  >
    <p>
      <template v-for="(segment, index) in messageSegments" :key="index">
        <strong v-if="segment.bold">{{ segment.text }}</strong>
        <template v-else>{{ segment.text }}</template>
      </template>
    </p>
    <template #actions>
      <D2eButton variant="secondary" data-testid="pa-chart-type-warning-cancel-btn" @click="onCancel">
        {{ getText('MRI_PA_BUTTON_CANCEL') }}
      </D2eButton>
      <D2eButton data-testid="pa-chart-type-warning-confirm-btn" @click="onConfirm">
        {{ getText('MRI_PA_CHANGE_CHART_TYPE_CONFIRM') }}
      </D2eButton>
    </template>
  </D2eDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import { D2eButton, D2eDialog } from '@d2e/ui'

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
</script>
