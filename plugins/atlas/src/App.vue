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

/**
 * The first data source this user can read, or '' if that cannot be determined.
 *
 * Deliberately total: a failure here must leave the page exactly as it was
 * before this fallback existed, never worse. The caller treats '' the same way
 * it always treated a missing dataset.
 */
async function firstReadableSourceKey(token: string): Promise<string> {
  try {
    const res = await fetch('/d2e-webapi/source/sources', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return '';
    const sources = await res.json();
    if (!Array.isArray(sources)) return '';
    const first = sources.find((s: { sourceKey?: string }) => typeof s?.sourceKey === 'string' && s.sourceKey);
    return first?.sourceKey ?? '';
  } catch {
    return '';
  }
}

onMounted(async () => {
  // Prefer Atlas3's plugin token (always fresh), fall back to shared localStorage.
  let token = '';
  try {
    if (typeof pluginProps?.getToken === 'function') token = (await pluginProps.getToken()) || '';
  } catch { /* ignore */ }
  if (!token) token = localStorage.getItem('bearerToken') || '';

  // THE DATASET, AND A LAST RESORT WHEN THERE ISN'T ONE.
  //
  // Neither source is guaranteed. On a first visit storage is empty, and Atlas3
  // does not pass `datasetId` to this plugin at all, so `studyId` was '' and the
  // `if (studyId)` guard below meant nothing was ever stored -- permanently, for
  // that browser. mri-host.js then handed vue-mri `studyId: ""` and every
  // dataset-scoped call went out with `datasetId=`, which the bookmark service
  // answers with a 500. What the user sees is "No explorations yet" and a live
  // preview of 0: an empty result, not an error, so nothing points at a missing
  // dataset.
  //
  // The deadlock is that the data-source picker is the only control that could
  // set one, and it lives inside the page that cannot load without one.
  //
  // So when nothing supplies a dataset, take the first source the user can read.
  // That is not a privilege decision -- /d2e-webapi/source/sources is already
  // scoped to them, and picking among sources they can already open grants
  // nothing new. It only breaks the tie that otherwise leaves the page inert.
  let studyId =
    localStorage.getItem('selectedVocabulary') ||
    (pluginProps as any)?.datasetId ||
    '';

  if (!studyId) {
    studyId = await firstReadableSourceKey(token);
  }

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
