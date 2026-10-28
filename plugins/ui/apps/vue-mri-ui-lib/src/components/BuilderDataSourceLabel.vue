<template>
  <div v-if="isAtlasHosted" ref="rootRef" class="builder-data-source" data-testid="builder-datasource">
    <span class="builder-data-source__label">{{ getText('MRI_PA_BUILDER_DATASOURCE') }}</span>
    <D2eTooltip location="bottom" :text="datasetName" :disabled="!nameTruncated">
      <template #activator="{ props: tooltipProps }">
        <span
          class="builder-data-source__name"
          :tabindex="nameTruncated ? 0 : undefined"
          data-testid="builder-datasource-name"
          v-bind="tooltipProps"
        >
          {{ datasetName }}
        </span>
      </template>
    </D2eTooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { D2eTooltip, isTruncated } from '@d2e/ui'
import { usePortalContext } from '../composables/usePortalContext'

const isAtlasHosted = import.meta.env.VITE_ATLAS_HOSTED === 'true'

const store = useStore()
const portalContext = usePortalContext()
const getText = (key: string): string => store.getters.getText(key)

const datasetName = computed<string>(() => store.getters.getSelectedDatasetName || portalContext.datasetId)

const rootRef = ref<HTMLElement | null>(null)
const nameTruncated = ref(false)

const nameElement = (): HTMLElement | null =>
  rootRef.value?.querySelector<HTMLElement>('.builder-data-source__name') ?? null

const syncTruncation = (): void => {
  const element = nameElement()
  nameTruncated.value = element ? isTruncated(element) : false
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (isAtlasHosted && (store.getters.getDataSources || []).length === 0) {
    store.dispatch('fireGetDataSources')
  }
  syncTruncation()
  const element = nameElement()
  if (element && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(syncTruncation)
    resizeObserver.observe(element)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

watch(datasetName, () => nextTick(syncTruncation))
</script>

<style scoped lang="scss">
.builder-data-source {
  display: flex;
  align-items: baseline;
  gap: var(--d2e-spacing-xxs);
  min-width: 0;
  margin-left: var(--d2e-spacing-s);
  font-family: var(--d2e-font-family);
  font-size: var(--d2e-font-body1-size);
  line-height: var(--d2e-font-body1-line-height);

  &__label {
    flex: 0 0 auto;
    color: var(--d2e-color-text-secondary);
    font-weight: var(--d2e-font-body1-weight);
  }

  &__name {
    min-width: 0;
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--d2e-color-neutral-black);
    font-weight: 500;
  }
}
</style>
