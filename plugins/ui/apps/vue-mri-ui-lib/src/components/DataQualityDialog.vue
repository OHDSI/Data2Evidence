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

    <div v-if="showHost" class="mri-dq-modal__frame">
      <!-- The Atlas data-quality parcel paints here. It must exist before
           mount() runs, and survive until unmount() resolves. -->
      <div ref="host" class="mri-dq-modal__host" data-testid="explorations-dq-host" />

      <div v-if="parcel.status.value === 'loading'" class="mri-dq-modal__state" data-testid="explorations-dq-loading">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <!-- Only a failure to load the bundle surfaces here. A /jobplugins
           failure, and every job state, are the plugin's own screens - it has
           its own alert and its own retry, so do not render over them. -->
      <div v-else-if="parcel.status.value === 'error'" class="mri-dq-modal__state" data-testid="explorations-dq-error">
        <p>{{ getText('MRI_PA_DATA_QUALITY_LOAD_FAILED') }}</p>
        <D2eButton variant="secondary" data-testid="explorations-dq-retry" @click="parcel.mount()">
          {{ getText('MRI_PA_COLL_BUT_RETRY') }}
        </D2eButton>
      </div>
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
 * lifecycle against the dialog's own open and close.
 *
 * Atlas only. `ExplorationsPage.vue` renders it behind SHOW_DATA_QUALITY, which
 * is the VITE_ATLAS_NATIVE define, so the portal build never reaches this file.
 */
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import { D2eDialog, D2eButton } from '@d2e/ui'
import { useAtlasParcel } from '../composables/useAtlasParcel'
import { usePortalContext } from '../composables/usePortalContext'

const props = defineProps<{
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
const portalContext = usePortalContext()

const host = ref<HTMLElement | null>(null)
/**
 * `v-dialog` renders its body lazily, so `host` is null until the dialog is
 * open. This keeps the element in the DOM from just before mount() until after
 * unmount() resolves, which is what stops a close/reopen racing the parcel.
 */
const showHost = ref(false)

const textResolver = computed(() => store.getters.getText)
const getText = (key: string, param?: string | string[]): string => {
  const resolve = textResolver.value
  return typeof resolve === 'function' ? resolve(key, param) : key
}

const parcel = useAtlasParcel({
  pluginId: 'data-quality',
  container: host,
  props: () => ({
    // Parcel-mode contract (the plugin's src/types.ts). resolveSourceKey reads
    // hostContext.sourceKey first and falls back to datasetId, so both are
    // sent: the nested one is the contract, the flat one is the safety net.
    hostContext: {
      surface: 'mri-exploration-card',
      itemId: 'data-quality-dashboard',
      locale: portalContext.locale,
      permissions: [],
      sourceKey: props.datasetId,
      cohortDefinitionId: props.cohortDefinitionId,
    },
    datasetId: props.datasetId,
    getToken: portalContext.getToken,
    locale: portalContext.locale,
    // uiFilesUrl is deliberately absent. It is the plugin's routed-mode
    // discriminator, and in routed mode it subscribes to custom-props-changed,
    // which Atlas broadcasts to every app on a source change - an open dialog
    // would silently swap dataset. useAtlasParcel injects the CSS instead.
  }),
})

watch(
  () => props.modelValue,
  async open => {
    if (open) {
      showHost.value = true
      await nextTick()
      await parcel.mount()
      return
    }
    await parcel.unmount()
    showHost.value = false
  }
)

/** A source or cohort switch while the dialog is open, without a remount. */
watch(
  () => [props.datasetId, props.cohortDefinitionId],
  ([datasetId, cohortDefinitionId]) => {
    if (!props.modelValue) return
    void parcel.update({
      hostContext: { sourceKey: datasetId, cohortDefinitionId },
      datasetId,
    })
  }
)

onBeforeUnmount(() => {
  void parcel.unmount()
})
</script>

<style>
.mri-dq-modal__subtitle {
  margin: 0 0 16px;
}

/* The parcel paints into `__host`; `__frame` is the positioning context for
   the loading and error overlays. */
.mri-dq-modal__frame {
  position: relative;
  min-height: 320px;
}

.mri-dq-modal__state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--d2e-color-white);
}

/* The plugin's own card sets a host inset assuming Atlas's AtlasCard padding.
   The dialog body already pads, so zero it. Higher specificity than the
   plugin's own `.dq-root` rule, so source order does not matter. */
.mri-dq-modal__host .dq-root {
  padding: 0;
}
</style>
