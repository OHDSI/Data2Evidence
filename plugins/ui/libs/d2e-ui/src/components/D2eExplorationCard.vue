<template>
  <D2eCard>
    <template #header>
      <div class="d2e-exploration-card__title-row">
        <v-checkbox
          :model-value="selected"
          density="compact"
          hide-details
          :aria-label="checkboxLabel"
          @update:model-value="$emit('update:selected', $event)"
        />
        <h3 class="d2e-exploration-card__title">{{ name }}</h3>
      </div>
    </template>

    <div v-if="status" class="d2e-exploration-card__status-row">
      <span class="d2e-exploration-card__meta-label">By:</span>
      <D2eStatusChip
        :variant="status.variant"
        :label="status.label"
        :icon="status.icon"
      />
    </div>

    <dl class="d2e-exploration-card__metadata">
      <div
        v-for="row in metadata"
        :key="row.label"
        class="d2e-exploration-card__metadata-row"
      >
        <dt class="d2e-exploration-card__meta-label">{{ row.label }}</dt>
        <dd class="d2e-exploration-card__meta-value">{{ row.value }}</dd>
      </div>
    </dl>

    <template #actions>
      <D2eToolbar>
        <slot name="toolbar" />
      </D2eToolbar>
    </template>
  </D2eCard>
</template>

<script setup lang="ts">
import D2eCard from "./D2eCard.vue";
import D2eStatusChip from "./D2eStatusChip.vue";
import D2eToolbar from "./D2eToolbar.vue";

export interface D2eExplorationCardMetadataRow {
  label: string;
  value: string;
}

interface Props {
  name: string;
  selected?: boolean;
  checkboxLabel?: string;
  status?: {
    variant:
      | "positive"
      | "warning"
      | "negative"
      | "neutral"
      | "multiselect"
      | "have-access"
      | "pending-access"
      | "locked";
    label: string;
    icon?: string;
  };
  metadata?: D2eExplorationCardMetadataRow[];
}

withDefaults(defineProps<Props>(), {
  selected: false,
  checkboxLabel: "Select exploration",
  status: undefined,
  metadata: () => [],
});

defineEmits<{ "update:selected": [value: boolean] }>();
</script>

<style scoped lang="scss">
.d2e-exploration-card {
  &__title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__title {
    margin: 0;
    font-size: var(--d2e-font-heading5-size);
    font-weight: var(--d2e-font-heading5-weight);
    line-height: var(--d2e-font-heading5-line-height);
    color: var(--d2e-color-primary);
  }

  &__status-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__metadata {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
  }

  &__metadata-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }

  &__meta-label {
    color: var(--d2e-color-neutral);
    font-size: var(--d2e-font-caption1-size);
    line-height: var(--d2e-font-caption1-line-height);
  }

  &__meta-value {
    margin: 0;
    color: var(--d2e-color-neutral-light);
    font-size: var(--d2e-font-body2-size);
    line-height: var(--d2e-font-body2-line-height);
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
