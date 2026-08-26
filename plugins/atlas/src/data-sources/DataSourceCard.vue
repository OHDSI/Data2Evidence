<template>
  <button class="data-source-card" type="button" @click="$emit('select', source.id)">
    <div class="data-source-card__topline">
      <span class="visibility-badge">{{ visibilityLabel }}</span>
      <AccessStatusBadge v-if="showAccessStatus && source.accessState" :state="source.accessState" />
    </div>
    <h2>{{ source.datasetDetail.name }}</h2>
    <p>{{ source.datasetDetail.summary || source.datasetDetail.description || 'No description available.' }}</p>
    <dl>
      <div><dt>Data model</dt><dd>{{ source.dataModel || 'Not specified' }}</dd></div>
      <div><dt>Subjects</dt><dd>{{ source.totalSubjects?.toLocaleString() ?? 'Not available' }}</dd></div>
      <div><dt>Type</dt><dd>{{ source.type || 'Not specified' }}</dd></div>
    </dl>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AccessStatusBadge from './AccessStatusBadge.vue';
import type { DataSource } from './types';

const props = defineProps<{ source: DataSource; showAccessStatus?: boolean }>();
defineEmits<{ select: [id: string] }>();

const visibilityLabel = computed(() => props.source.datasetDetail.showRequestAccess ? 'Available by request' : 'Restricted');
</script>
