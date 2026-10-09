<template>
  <div
    class="ds-card"
    role="button"
    tabindex="0"
    data-testid="ds-card"
    @click="$emit('select', source.id)"
    @keydown.enter="$emit('select', source.id)"
  >
    <div class="ds-card__body">
      <div class="ds-card__head">
        <h3 class="ds-card__title text-h6">
          {{ source.name }}
        </h3>
        <div class="ds-card__badges">
          <AtlasChip
            v-if="source.isPublic"
            prepend-icon="mdi-earth"
            data-testid="ds-public"
            class="ds-public-chip text-caption"
          >
            Public
          </AtlasChip>
          <AccessChip
            :access="source.access"
            test-id="ds-access"
          />
        </div>
      </div>

      <p class="ds-card__desc">
        {{ source.description }}
      </p>
    </div>

    <div class="ds-card__meta">
      <CardMeta icon="mdi-account-multiple-outline">Subject: {{ source.subjectCount }}</CardMeta>
      <CardMeta icon="mdi-calendar-blank-outline">Published: {{ source.publishedDate }}</CardMeta>
      <CardMeta icon="mdi-information-outline">Data source type: {{ source.sourceType }}</CardMeta>
      <CardMeta icon="mdi-database-outline">Version: {{ source.version }}</CardMeta>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasChip } from '@ohdsi/atlas-ui'
import AccessChip from './AccessChip.vue'
import CardMeta from './CardMeta.vue'
import type { DatasourceCardVM } from '../composables/useDatasourceCatalog'

defineProps<{ source: DatasourceCardVM }>()
defineEmits<{ (e: 'select', id: string): void }>()
</script>

<style scoped>
.ds-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--ds-card-border, #e5e6f2);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}
.ds-card:hover {
  border-color: #c9cbe4;
  box-shadow: 0 4px 14px rgba(0, 0, 32, 0.08);
}
.ds-card:focus-visible {
  outline: 2px solid var(--ds-primary, #000080);
  outline-offset: 2px;
}
.ds-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}
.ds-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.ds-card__title {
  margin: 0;
  color: var(--ds-primary, #000080);
}
.ds-card__badges {
  display: flex;
  gap: 8px;
  flex: none;
}
.ds-public-chip {
  background-color: var(--ds-lightest, #f2f0f1) !important;
  color: var(--ds-text, #595757) !important;
}
.ds-card__desc {
  margin: 0;
  font-family: var(--ds-font-body, 'IBM Plex Sans', sans-serif);
  font-weight: 400;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ds-text, #595757);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ds-card__meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 24px;
  padding: 12px 24px;
  background: var(--ds-meta-bg, #faf8f8);
  border-top: 1px solid var(--ds-lightest, #f2f0f1);
}
</style>
