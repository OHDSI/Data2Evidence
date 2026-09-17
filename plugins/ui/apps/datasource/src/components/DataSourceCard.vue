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
        <h3 class="ds-card__title">
          {{ source.name }}
        </h3>
        <div class="ds-card__badges">
          <span
            v-if="source.isPublic"
            class="ds-chip ds-chip--public"
            data-testid="ds-public"
          >
            <Icon
              name="globe"
              :size="16"
            />Public
          </span>
          <span
            class="ds-chip"
            :class="accessClass"
            data-testid="ds-access"
          >
            <Icon
              :name="accessIcon"
              :size="16"
            />{{ accessLabel }}
          </span>
        </div>
      </div>

      <p class="ds-card__desc">
        {{ source.description }}
      </p>
    </div>

    <div class="ds-card__meta">
      <span class="ds-meta"><Icon
        name="account"
        :size="16"
      />Subject: {{ source.subjectCount }}</span>
      <span class="ds-meta"><Icon
        name="calendar"
        :size="16"
      />Published: {{ source.publishedDate }}</span>
      <span class="ds-meta"><Icon
        name="info"
        :size="16"
      />Data source type: {{ source.sourceType }}</span>
      <span class="ds-meta"><Icon
        name="database"
        :size="16"
      />Version: {{ source.version }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import type { DatasourceCardVM } from '../composables/useDatasourceCatalog'
import type { AccessState } from '../composables/useDatasourceAccess'

const props = defineProps<{ source: DatasourceCardVM }>()
defineEmits<{ (e: 'select', id: string): void }>()

const LABEL: Record<AccessState, string> = {
  approved: 'Have access', pending: 'Pending access', 'no-access': 'No access', restricted: 'No access',
}
const ICON: Record<AccessState, string> = {
  approved: 'check', pending: 'clock', 'no-access': 'lock', restricted: 'lock',
}
const CLASS: Record<AccessState, string> = {
  approved: 'ds-chip--have', pending: 'ds-chip--pending', 'no-access': 'ds-chip--noaccess', restricted: 'ds-chip--noaccess',
}
const accessLabel = computed(() => LABEL[props.source.access])
const accessIcon = computed(() => ICON[props.source.access])
const accessClass = computed(() => CLASS[props.source.access])
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
  outline: 2px solid var(--ds-navy, #000080);
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
  font-family: var(--ds-font-body, 'IBM Plex Sans', sans-serif);
  font-weight: 600;
  font-size: 18px;
  line-height: 1.2;
  color: var(--ds-navy, #000080);
}
.ds-card__badges {
  display: flex;
  gap: 8px;
  flex: none;
}
.ds-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 100px;
  font-family: var(--ds-font-body, 'IBM Plex Sans', sans-serif);
  font-weight: 400;
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
}
/* Access colors sourced from the design assets (match his Description view). */
.ds-chip--public { background: var(--ds-lightest, #f2f0f1); color: var(--ds-text, #595757); }
.ds-chip--have { background: #e1fff6; color: #00855f; }
.ds-chip--pending { background: #fff8e2; color: #cd6000; }
.ds-chip--noaccess { background: #fdeded; color: #d53939; }
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
.ds-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--ds-font-body, 'IBM Plex Sans', sans-serif);
  font-weight: 400;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ds-text, #595757);
  min-width: 0;
}
.ds-meta :deep(svg) { color: var(--ds-text, #595757); flex: none; }
/* Chip icons (globe/check/lock/clock) must take the chip's own color — the
   bundled Vuetify/atlas-ui reset can break plain currentColor inheritance. */
.ds-chip :deep(svg) { color: inherit; fill: currentColor; flex: none; }
</style>
