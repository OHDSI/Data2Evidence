<template>
  <main class="data-source-detail-page">
    <button class="back-to-data-sources" type="button" @click="$emit('back')">← Back to data sources</button>

    <section v-if="sources.loading && !sources.selectedDataSource" class="data-sources-state" aria-busy="true">
      <span class="skeleton skeleton--title" />
      <span class="skeleton skeleton--text" />
    </section>

    <section v-else-if="sources.error" class="data-sources-state data-sources-state--error" role="alert">
      <h1>Unable to load this data source</h1>
      <p>{{ sources.error }}</p>
      <button type="button" @click="sources.selectDataSource(sourceId)">Try again</button>
    </section>

    <template v-else-if="source">
      <DataSourceDetailHeader
        :source="source"
        :requesting="sources.requestingIds.has(source.id)"
        @request-access="sources.requestAccess(source)"
      />

      <section class="data-source-detail-content" aria-label="Data source details">
        <div class="data-source-detail-content__description">
          <h2>About this data source</h2>
          <p>{{ source.datasetDetail.description || source.datasetDetail.summary || 'No description available.' }}</p>
        </div>
        <dl class="data-source-metadata">
          <div><dt>Data source name</dt><dd>{{ source.datasetDetail.name }}</dd></div>
          <div><dt>Type</dt><dd>{{ source.type || 'Not specified' }}</dd></div>
          <div><dt>Data model</dt><dd>{{ source.dataModel || 'Not specified' }}</dd></div>
          <div><dt>Schema</dt><dd>{{ source.tokenDatasetCode || 'Not specified' }}</dd></div>
          <div><dt>Subjects</dt><dd>{{ source.totalSubjects?.toLocaleString() ?? 'Not available' }}</dd></div>
        </dl>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import DataSourceDetailHeader from './DataSourceDetailHeader.vue';
import type { useDataSources } from './use-data-sources';

const props = defineProps<{
  sourceId: string;
  sources: ReturnType<typeof useDataSources>;
}>();

defineEmits<{ back: [] }>();

const source = computed(() => props.sources.selectedDataSource?.id === props.sourceId
  ? props.sources.selectedDataSource
  : props.sources.dataSources.find((item) => item.id === props.sourceId));

function loadSource() {
  void props.sources.selectDataSource(props.sourceId);
}

onMounted(loadSource);
watch(() => props.sourceId, loadSource);
</script>
