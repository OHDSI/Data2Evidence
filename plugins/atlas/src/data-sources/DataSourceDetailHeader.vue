<template>
  <header class="data-source-detail-header">
    <div>
      <p class="eyebrow">Data source</p>
      <h1>{{ source.datasetDetail.name }}</h1>
      <p v-if="source.datasetDetail.summary || source.datasetDetail.description">
        {{ source.datasetDetail.summary || source.datasetDetail.description }}
      </p>
    </div>
    <div class="data-source-detail-header__access">
      <AccessStatusBadge v-if="source.accessState" :state="source.accessState" />
      <button
        v-if="source.accessState === 'no_access'"
        class="request-access-button"
        type="button"
        :disabled="requesting"
        @click="$emit('request-access')"
      >
        {{ requesting ? 'Requesting access…' : 'Request access' }}
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import AccessStatusBadge from './AccessStatusBadge.vue';
import type { DataSource } from './types';

defineProps<{ source: DataSource; requesting: boolean }>();
defineEmits<{ 'request-access': [] }>();
</script>
