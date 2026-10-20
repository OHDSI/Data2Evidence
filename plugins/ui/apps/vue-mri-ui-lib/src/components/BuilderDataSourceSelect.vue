<template>
  <div v-if="isAtlasHosted" ref="rootRef" class="builder-data-source">
    <v-tooltip location="bottom" :text="datasetName" :disabled="!nameTruncated">
      <template #activator="{ props: tooltipProps }">
        <D2eSelect
          class="builder-data-source__select"
          size="sm"
          :disabled="!canSwitchDataSource"
          :label="getText('MRI_PA_EXPLORATIONS_DATASOURCE')"
          :items="datasetItems"
          :model-value="datasetId"
          prepend-icon="mdi-database-outline"
          hide-details
          data-testid="builder-datasource"
          v-bind="tooltipProps"
          @update:model-value="onSelect"
        />
      </template>
    </v-tooltip>

    <D2eDialog
      :model-value="pendingDatasetId !== ''"
      :title="getText('MRI_PA_BUILDER_DATASOURCE_DIALOG_TITLE')"
      :close-label="getText('MRI_PA_CLOSE')"
      data-testid="builder-datasource-dialog"
      @update:model-value="onDialogToggle"
      @close="cancelSwitch"
    >
      <p class="builder-data-source__text">
        {{ getText('MRI_PA_BUILDER_DATASOURCE_DIALOG_TEXT', pendingDatasetName) }}
      </p>
      <template #actions>
        <D2eButton variant="secondary" data-testid="builder-datasource-cancel-btn" @click="cancelSwitch">
          {{ getText('MRI_PA_BUTTON_CANCEL') }}
        </D2eButton>
        <D2eButton autofocus data-testid="builder-datasource-confirm-btn" @click="confirmSwitch">
          {{ getText('MRI_PA_BUTTON_CHANGE_DATASOURCE') }}
        </D2eButton>
      </template>
    </D2eDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { D2eButton, D2eDialog, D2eSelect, isTruncated } from '@d2e/ui'
import { useDataSourceSelection } from '../composables/useDataSourceSelection'
import { builderSwitchStep } from './helpers/dataSourceSelection'

const store = useStore()
const getText = (key: string, param?: string): string => store.getters.getText(key, param)

const {
  isAtlasHosted,
  datasetId,
  datasetName,
  datasetItems,
  canSwitchDataSource,
  hasUnsavedChanges,
  switchDataSource,
} = useDataSourceSelection()

const pendingDatasetId = ref('')
const pendingDatasetName = computed(
  () => datasetItems.value.find(item => item.value === pendingDatasetId.value)?.label ?? pendingDatasetId.value
)

const onSelect = (next: string | string[] | null): void => {
  const nextDatasetId = typeof next === 'string' ? next : ''
  const step = builderSwitchStep(datasetId.value, nextDatasetId, hasUnsavedChanges.value)
  if (step === 'guard') switchDataSource(nextDatasetId)
  if (step === 'confirm') pendingDatasetId.value = nextDatasetId
}

const cancelSwitch = (): void => {
  pendingDatasetId.value = ''
}

const confirmSwitch = (): void => {
  const nextDatasetId = pendingDatasetId.value
  pendingDatasetId.value = ''
  switchDataSource(nextDatasetId)
}

const onDialogToggle = (open: boolean): void => {
  if (!open) cancelSwitch()
}

const rootRef = ref<HTMLElement | null>(null)
const nameTruncated = ref(false)

const syncTruncation = (): void => {
  const selection = rootRef.value?.querySelector<HTMLElement>('.v-select__selection-text')
  nameTruncated.value = selection ? isTruncated(selection) : false
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  syncTruncation()
  if (rootRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(syncTruncation)
    resizeObserver.observe(rootRef.value)
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
  align-items: center;
  margin-left: var(--d2e-spacing-s);

  &__select {
    flex: 0 0 208px;
    width: 208px;

    :deep(.v-input__details) {
      display: none;
    }

    :deep(.v-field) {
      border-radius: var(--d2e-radius-sm);
    }

    :deep(.v-field--disabled),
    :deep(.v-field--disabled .v-field__input),
    :deep(.v-field--disabled .v-field-label) {
      opacity: 1;
    }
  }

  &__text {
    margin: 0;
  }
}
</style>
