<template>
  <!-- MRI Patient Analytics runs in an isolated iframe (its own document at
       /atlas-mri/) so its SAP UI5 + Vuetify CSS can't leak into the Atlas3 host.
       The iframe is same-origin, so it reads the auth token and dataset from the
       shared localStorage — they are never put in the URL (which would leak the
       bearer token via history, logs and Referer). -->
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

  // Hand the freshest values to the same-origin iframe via shared localStorage
  // (never via the URL), then load it. The iframe reads these keys on boot.
  try {
    if (token) localStorage.setItem('bearerToken', token);
    if (studyId) localStorage.setItem('selectedVocabulary', studyId);
    if (username) localStorage.setItem('atlas_username', username);
  } catch { /* ignore */ }
  src.value = '/atlas-mri/';
});
</script>
