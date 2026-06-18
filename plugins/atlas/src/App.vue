<template>
  <!-- Inline styles (Atlas3's plugin loader doesn't load the plugin CSS sidecar).
       MRI Patient Analytics runs in an isolated iframe (its own document at
       /atlas-mri/) so its SAP UI5 + Vuetify CSS can't leak into the Atlas3 host.
       Token + dataset are passed via query because the iframe can't always rely
       on reading the parent's localStorage. -->
  <iframe
    v-if="src"
    :src="src"
    :style="frameStyle"
    title="Patient Analytics"
    allow="clipboard-read; clipboard-write"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import type { PluginProps } from './types';

const pluginProps = inject<PluginProps>('pluginProps');
const src = ref('');
const frameStyle =
  'display:block;width:100%;height:calc(100vh - 56px);min-height:calc(100vh - 56px);border:0;';

onMounted(async () => {
  // Prefer Atlas3's plugin token (always fresh), fall back to shared localStorage.
  let token = '';
  try {
    if (typeof pluginProps?.getToken === 'function') token = (await pluginProps.getToken()) || '';
  } catch { /* ignore */ }
  if (!token) token = localStorage.getItem('bearerToken') || '';

  const studyId =
    localStorage.getItem('selectedVocabulary') ||
    (pluginProps as any)?.datasetId ||
    '';

  // The d2e username (id_token `username` claim, captured by the login bridge)
  // — vue-mri needs it to show the current user's own cohort definitions/bookmarks.
  const username =
    localStorage.getItem('atlas_username') ||
    (pluginProps as any)?.username ||
    '';

  const params = new URLSearchParams();
  if (studyId) params.set('studyId', studyId);
  if (token) params.set('token', token);
  if (username) params.set('username', username);
  src.value = '/atlas-mri/' + (params.toString() ? `?${params.toString()}` : '');
});
</script>
