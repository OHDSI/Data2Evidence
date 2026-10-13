<template>
  <div class="ds-page">
    <DataSourceBanner
      :title="cat.banner.value.title"
      :description="cat.banner.value.description"
      :logo-url="cat.banner.value.logoUrl"
    />

    <div class="ds-content">
      <section class="ds-panel">
        <div class="ds-toolbar">
          <div class="ds-search">
            <AtlasIcon
              icon="mdi-magnify"
              size="20"
              class="ds-search__icon"
            />
            <input
              v-model="cat.query.value"
              data-testid="ds-search"
              placeholder="Search"
              aria-label="Search"
              class="ds-search__input"
            >
          </div>
          <SortMenu
            v-model="cat.sortMode.value"
            :is-logged-in="cat.isLoggedIn.value"
          />
        </div>

        <div
          v-if="cat.loading.value"
          class="ds-grid"
        >
          <div
            v-for="i in 4"
            :key="i"
            class="ds-skeleton"
          />
        </div>
        <p
          v-else-if="cat.error.value"
          class="ds-error"
        >
          {{ cat.error.value }}
        </p>
        <p
          v-else-if="cat.visible.value.length === 0"
          data-testid="ds-empty"
          class="ds-empty"
        >
          No data sources found
        </p>
        <div
          v-else
          class="ds-grid"
        >
          <DataSourceCard
            v-for="s in cat.visible.value"
            :key="s.id"
            :source="s"
            @select="onSelect"
          />
        </div>
      </section>
    </div>

    <DataSourceFooter />
  </div>
</template>

<script setup lang="ts">
import { AtlasIcon } from '@ohdsi/atlas-ui'
import { useDatasourceCatalog } from '../composables/useDatasourceCatalog'
import DataSourceCard from '../components/DataSourceCard.vue'
import DataSourceBanner from '../components/DataSourceBanner.vue'
import DataSourceFooter from '../components/DataSourceFooter.vue'
import SortMenu from '../components/SortMenu.vue'

const props = defineProps<{ token: string | null; onSelect: (id: string) => void }>()
const cat = useDatasourceCatalog(() => props.token)
</script>

<style scoped>
.ds-page {
  --ds-text: #595757;
  --ds-text-strong: #101111;
  --ds-light: #acaba8;
  --ds-lightest: #f2f0f1;
  --ds-meta-bg: #faf8f8;
  --ds-card-border: #e5e6f2;
  --ds-hero-bg: #fafafd;
  --ds-font-heading: 'GT America', 'GT-America', 'IBM Plex Sans', 'IBM Plex Sans Variable',
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  min-height: 100%;
  background: #faf8f8;
  color: var(--ds-text);
  font-family: var(--ds-font-body);
}
.ds-content { padding: 24px; }
.ds-panel {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
.ds-toolbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 76px;
  padding: 24px 24px 8px;
}
.ds-search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 0 1 466px;
}
.ds-search__icon {
  position: absolute;
  left: 16px;
  color: var(--ds-text, #595757);
  pointer-events: none;
}
.ds-search__input {
  width: 100%;
  height: 44px;
  padding: 0 16px 0 48px;
  border: 1px solid var(--ds-light, #acaba8);
  border-radius: 4px;
  font-family: var(--ds-font-body);
  font-size: 16px;
  color: var(--ds-text-strong, #101111);
  background: #fff;
  outline: none;
}
.ds-search__input::placeholder {
  font-family: var(--ds-font-body);
  font-weight: 400;
  font-size: 16px;
  line-height: 1.5;
  letter-spacing: 0.0312em;
  color: var(--ds-light, #acaba8);
  opacity: 1;
}
.ds-search__input:focus { border-color: var(--ds-primary, #000080); }
.ds-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 16px 24px 24px;
}
@media (max-width: 900px) {
  .ds-grid { grid-template-columns: 1fr; }
}
.ds-skeleton {
  height: 214px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f4f4f7 25%, #ececf0 37%, #f4f4f7 63%);
  background-size: 400% 100%;
  animation: ds-shimmer 1.4s ease infinite;
}
@keyframes ds-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}
.ds-empty,
.ds-error {
  padding: 56px 24px;
  text-align: center;
  font-size: 14px;
  color: var(--ds-text, #595757);
}
.ds-error { color: #d53939; }
</style>
