<template>
  <D2eDialog
    :model-value="modelValue"
    size="xl"
    :title="getText('MRI_PA_DATA_QUALITY_DIALOG_TITLE')"
    data-testid="explorations-dq-modal"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- Figma 1801:210537: the exploration name is the bold part. -->
    <template #subtitle>
      <span data-testid="explorations-dq-subtitle">
        {{ getText('MRI_PA_DATA_QUALITY_DIALOG_SUBTITLE') }} <strong>{{ explorationName }}</strong>
      </span>
    </template>

    <!-- The tabs are this dialog's; the tab body is one parcel, switched with
         parcel.update rather than remounted (Figma 1801:210538). -->
    <template #header-append>
      <D2eTabs
        v-model="activeTab"
        :items="tabItems"
        :aria-label="getText('MRI_PA_DATA_QUALITY_TABS_LABEL')"
        data-testid="explorations-dq-tabs"
      />
    </template>

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
 * The two tabs are the dialog's too. They drive the plugin's `itemId`, and the
 * plugin swaps between its dashboard and checks views without a remount - the
 * same way Atlas's Data sources sidebar moves between the two.
 *
 * Atlas only. `ExplorationsPage.vue` renders it behind SHOW_DATA_QUALITY, which
 * is the VITE_ATLAS_NATIVE define, so the portal build never reaches this file.
 */
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import { D2eDialog, D2eButton, D2eTabs, type D2eTabItem } from '@d2e/ui'
import { useAtlasParcel } from '../composables/useAtlasParcel'
import { usePortalContext } from '../composables/usePortalContext'
import { buildDataQualityParcelProps, type DataQualityTab } from './helpers/explorationDataQuality'

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

/** Dashboard is where every open starts, whichever tab it was closed on. */
const activeTab = ref<DataQualityTab>('dashboard')

const tabItems = computed<D2eTabItem[]>(() => [
  { value: 'dashboard', label: getText('MRI_PA_DATA_QUALITY_TAB_DASHBOARD'), icon: 'mdi-license' },
  { value: 'checks', label: getText('MRI_PA_DATA_QUALITY_TAB_CHECKS'), icon: 'mdi-list-box-outline' },
])

/** The whole bundle, every time: parcel.update replaces props, it does not merge. */
const parcelProps = () =>
  buildDataQualityParcelProps({
    datasetId: props.datasetId,
    cohortDefinitionId: props.cohortDefinitionId,
    itemId: activeTab.value,
    locale: portalContext.locale,
    getToken: portalContext.getToken,
  })

const parcel = useAtlasParcel({
  pluginId: 'data-quality',
  container: host,
  props: parcelProps,
})

watch(
  () => props.modelValue,
  async open => {
    if (open) {
      activeTab.value = 'dashboard'
      showHost.value = true
      await nextTick()
      await parcel.mount()
      return
    }
    await parcel.unmount()
    if (!props.modelValue) showHost.value = false
  }
)

/** A source, cohort or tab switch while the dialog is open, without a remount. */
watch(
  () => [props.datasetId, props.cohortDefinitionId, activeTab.value],
  () => {
    if (!props.modelValue) return
    void parcel.update(parcelProps())
  }
)

onBeforeUnmount(() => {
  void parcel.unmount()
})
</script>

<style>
/* The parcel paints into `__host`; `__frame` is the positioning context for
   the loading and error overlays, and the card the tab body sits in (Figma
   1801:210901). The dialog body pads 16px on top; the design has 24px. */
.mri-dq-modal__frame {
  position: relative;
  min-height: 320px;
  margin-top: 8px;
  padding: 24px;
  background: var(--d2e-color-white);
  border: 1px solid var(--d2e-color-neutral-lightest);
  border-radius: 16px;
  box-shadow: 0 0 5px rgb(0 0 0 / 10%);
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
  border-radius: 16px;
}

/* The plugin's own card sets a host inset assuming Atlas's AtlasCard padding.
   The dialog body already pads, so zero it. Higher specificity than the
   plugin's own `.dq-root` rule, so source order does not matter. */
.mri-dq-modal__host .dq-root {
  padding: 0;
}
</style>
