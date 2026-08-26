<template>
  <main class="data-sources-page">
    <header class="data-sources-page__header">
      <div>
        <p class="data-sources-page__eyebrow">Explore</p>
        <h1>Data Sources</h1>
        <p>Browse the available data sources and request access where needed.</p>
      </div>
      <div class="data-sources-page__controls">
        <label class="data-sources-search">
          <span class="sr-only">Search data sources</span>
          <input v-model="sources.query" type="search" placeholder="Search data sources" />
        </label>
        <label v-if="isAuthenticated" class="data-sources-sort">
          <span>Sort by</span>
          <select v-model="sources.sort">
            <option value="access">Access</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
          </select>
        </label>
      </div>
    </header>

    <section v-if="sources.loading" class="data-source-grid" aria-label="Loading data sources" aria-busy="true">
      <div v-for="index in 4" :key="index" class="data-source-card data-source-card--skeleton">
        <span class="skeleton skeleton--badge" />
        <span class="skeleton skeleton--title" />
        <span class="skeleton skeleton--text" />
        <span class="skeleton skeleton--text skeleton--short" />
      </div>
    </section>

    <section v-else-if="sources.error" class="data-sources-state data-sources-state--error" role="alert">
      <h2>Unable to load data sources</h2>
      <p>{{ sources.error }}</p>
      <button type="button" @click="sources.loadDataSources">Try again</button>
    </section>

    <section v-else-if="sources.sortedDataSources.length === 0" class="data-sources-state">
      <h2>No data sources found</h2>
      <p>Try changing the search term.</p>
    </section>

    <section v-else class="data-source-grid" aria-label="Data sources">
      <DataSourceCard
        v-for="source in sources.sortedDataSources"
        :key="source.id"
        :source="source"
        :show-access-status="isAuthenticated"
        @select="$emit('select', $event)"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import DataSourceCard from './DataSourceCard.vue';
import type { useDataSources } from './use-data-sources';

const props = defineProps<{
  sources: ReturnType<typeof useDataSources>;
  isAuthenticated: boolean;
}>();

defineEmits<{ select: [id: string] }>();

onMounted(() => {
  if (!props.sources.dataSources.length) void props.sources.loadDataSources();
});
</script>
