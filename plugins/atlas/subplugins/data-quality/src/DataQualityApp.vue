<script setup lang="ts">
/**
 * The plugin root: chooses a view from `hostContext.itemId` (see resolveView in
 * types.ts). Atlas's two Data sources sidebar entries and the vue-mri dialog's
 * two tabs both switch it through `parcel.update`, never with a remount.
 *
 * KeepAlive keeps each view's own state - the checks view's search, filters and
 * expanded rows - across a switch, so going to the dashboard and back does not
 * throw the user's place away.
 */
import { computed, type Component } from 'vue';
import ChecksView from './views/ChecksView.vue';
import DashboardView from './views/DashboardView.vue';
import { useHostContext } from './composables/useHostContext';
import type { DataQualityView } from './types';

const ctx = useHostContext();
// Partial with a fallback, so a view added to the union before its component
// still renders something rather than nothing.
const VIEWS: Partial<Record<DataQualityView, Component>> = {
  dashboard: DashboardView,
  checks: ChecksView,
};
const active = computed(() => VIEWS[ctx.view.value] ?? DashboardView);
</script>

<template>
  <KeepAlive>
    <component :is="active" :key="ctx.view.value" />
  </KeepAlive>
</template>
