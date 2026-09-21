<template>
  <D2eDialog
    :model-value="modelValue"
    size="xl"
    :title="getText('MRI_PA_DATA_QUALITY_DIALOG_TITLE')"
    data-testid="explorations-dq-modal"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- D2eDialog's header carries a title and a close button only, so the
         frame's subtitle is the first body child, below the divider. Adding a
         `subtitle` prop to @d2e/ui would be a shared design-system change and
         belongs with a design review, not with this feature. -->
    <p class="mri-dq-modal__subtitle" data-testid="explorations-dq-subtitle">
      {{ getText('MRI_PA_DATA_QUALITY_DIALOG_SUBTITLE', explorationName) }}
    </p>

    <div class="mri-dq-modal__frame">
      <!-- The Atlas data-quality parcel mounts here. Kept in the DOM for as
           long as the dialog is open so the parcel has a stable element. -->
      <div ref="host" class="mri-dq-modal__host" data-testid="explorations-dq-host" />
    </div>
  </D2eDialog>
</template>

<script setup lang="ts">
/**
 * The Data quality dialog opened from an exploration card (#3119).
 *
 * The dashboard itself is not implemented here. It is the Atlas3
 * `data-quality` sub-plugin (plugins/atlas/subplugins/data-quality, delivered
 * by #3147), mounted into `host` as a single-spa parcel. This component owns
 * the chrome: the 1200px shell, the title and subtitle, and the parcel's
 * lifecycle against the dialog's own open/close.
 *
 * Atlas only. `ExplorationsPage.vue` renders it behind SHOW_DATA_QUALITY, which
 * is the VITE_ATLAS_NATIVE define, so the portal build never reaches this file.
 */
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { D2eDialog } from '@d2e/ui'

defineProps<{
  modelValue: boolean
  /** The active data source. WebAPI sourceKey == the d2e dataset id. */
  datasetId: string
  /** The cohort whose run to show. The card guarantees this is non-empty. */
  cohortDefinitionId: string
  /** Display only, for the subtitle. */
  explorationName: string
}>()

defineEmits<{ 'update:modelValue': [open: boolean] }>()

const store = useStore()
const host = ref<HTMLElement | null>(null)

const textResolver = computed(() => store.getters.getText)
const getText = (key: string, param?: string | string[]): string => {
  const resolve = textResolver.value
  return typeof resolve === 'function' ? resolve(key, param) : key
}
</script>

<style>
.mri-dq-modal__subtitle {
  margin: 0 0 16px;
}

/* The parcel paints into `__host`; `__frame` is the positioning context the
   loading and error overlays will use. */
.mri-dq-modal__frame {
  position: relative;
  min-height: 320px;
}
</style>
