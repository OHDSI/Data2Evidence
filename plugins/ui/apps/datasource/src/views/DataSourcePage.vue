<template>
  <AtlasPageShell
    hero
    compact
    eyebrow="OHDSI · CDM"
    title="Data Sources"
    :subtitle="subtitle"
  >
    <div class="ds-source-page">
      <aside class="ds-source-page__sidebar">
        <AtlasList
          nav
          density="compact"
          color="primary"
          class="ds-source-page__menu"
          data-testid="d2e-datasource-sidebar"
        >
          <template
            v-for="(group, gi) in groups"
            :key="group.label"
          >
            <v-list-subheader
              :class="['ds-source-page__group', gi === 0 && 'ds-source-page__group--first']"
            >
              {{ group.label }}
            </v-list-subheader>
            <AtlasListItem
              v-for="item in group.items"
              :key="item.id"
              :prepend-icon="item.icon"
              :title="item.label"
              :active="item.id === DESCRIPTION_REPORT"
              :data-testid="`d2e-datasource-sidebar-${item.id}`"
              rounded="0"
              class="ds-source-page__item"
              @click="openReport(item.id)"
            />
          </template>
        </AtlasList>
      </aside>

      <div class="ds-source-page__main">
        <div class="ds-source-page__toolbar">
          <DataSourcePicker
            :current-key="sourceKey"
            :sources="opts.sources.value"
            :loading="opts.loading.value"
            @select="onSelect"
          />
        </div>
        <AtlasCard padding="md">
          <DataSourceDescription
            :source-key="sourceKey"
            :token="token"
          />
        </AtlasCard>
      </div>
    </div>
  </AtlasPageShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasCard, AtlasList, AtlasListItem, AtlasPageShell } from '@ohdsi/atlas-ui'
import DataSourceDescription from './DataSourceDescription.vue'
import DataSourcePicker from '../components/DataSourcePicker.vue'
import { useDataSourceOptions } from '../composables/useDataSourceOptions'
import type { DataSourceCardVM } from '../composables/useDataSourceCatalog'
import { useSidebarGroups } from '../composables/useSidebarGroups'
import { DESCRIPTION_REPORT, atlasSourceHash, pluginSourceHash } from '../utils/routes'

const props = defineProps<{
  sourceKey: string
  token: string | null
  hasPermission?: (permission: string) => boolean
}>()

const opts = useDataSourceOptions(() => props.token)
const sidebar = useSidebarGroups(props.hasPermission)

const current = computed(() => opts.sources.value.find(s => s.id === props.sourceKey) ?? null)
const subtitle = computed(() => (current.value ? `${current.value.name} — Description` : ''))

const groups = computed(() => {
  if (current.value?.access === 'approved') return sidebar.value
  const description = sidebar.value.flatMap(g => g.items).find(i => i.id === DESCRIPTION_REPORT)
  return description ? [{ label: 'Overview', items: [description] }] : []
})

function openReport(id: string): void {
  if (id !== DESCRIPTION_REPORT) window.location.hash = atlasSourceHash(props.sourceKey, id)
}

function onSelect(source: DataSourceCardVM): void {
  window.location.hash = pluginSourceHash(source.id)
}
</script>

<style scoped>
.ds-source-page {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  align-items: start;
}

.ds-source-page__sidebar {
  border-right: 1px solid rgb(var(--v-theme-outline-variant));
  margin-block: 0 -32px;
  margin-inline-start: -32px;
  padding-block: 0 24px;
  padding-inline-start: 16px;
  align-self: stretch;
  background: rgb(var(--v-theme-surface));
}

.ds-source-page__menu {
  background: rgb(var(--v-theme-surface));
  padding: 8px 8px 16px;
}

.ds-source-page__sidebar .ds-source-page__group {
  margin-top: 12px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface-variant));
  padding-inline: 12px;
  height: 28px;
  min-height: 28px;
}


.ds-source-page__sidebar .ds-source-page__group--first {
  margin-top: 0;
}

.ds-source-page__sidebar .ds-source-page__item {
  border-radius: 6px !important;
  margin: 4px 0 2px;
  min-height: 36px;
  font-size: 13px;
}

.ds-source-page__item :deep(.v-list-item__prepend) {
  margin-inline-end: 12px;
}

.ds-source-page__item :deep(.v-list-item-title) {
  font-size: 13px;
  letter-spacing: 0;
}


.ds-source-page__toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 8px 0;
  margin: -8px 0;
}

.ds-source-page__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

@media (max-width: 768px) {
  .ds-source-page {
    grid-template-columns: 1fr;
  }

  .ds-source-page__sidebar {
    border-right: 0;
    border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
    margin-block: 0;
    margin-inline: -32px;
    padding-inline: 16px;
    padding-block: 16px;
  }
}
</style>
