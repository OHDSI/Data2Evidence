<script setup lang="ts">
/**
 * DQD dashboard for the data source selected in the Atlas header — Figma node
 * 1747:229812 of the D2E WebApp main file.
 *
 * Data comes from the same place the portal's DQD overview reads: the dataset's
 * latest data-quality flow run, then that run's derived overview. The job-state
 * branches below mirror DQDJobResults.tsx, which is what makes a still-running or
 * failed job say so instead of rendering an empty card.
 *
 * The state treatments follow Atlas3's own convention, so this plugin reads like
 * the reports it sits beside in DataSourcesView:
 *
 *   fetch in flight      -> AtlasSkeleton    (DataSourcesView's loading.report)
 *   job of unknown length -> spinner + chip  (DataSourceRunTable's 'running' row)
 *   load failed          -> danger alert + Retry  (DataSourcesView, JobsSection)
 *   nothing to show      -> icon + muted text (DataSourcesView's __empty block)
 *
 * The spinner/skeleton split is deliberate rather than an oversight: a skeleton
 * promises content in a moment, which is a lie for a Prefect run that can take
 * hours. Atlas3 draws the same line — every one of its skeletons stands in for a
 * fetch, and both of its long-running-job surfaces use a spinner.
 *
 * Two states the portal has no equivalent for are handled in the composable
 * rather than here, because neither is anything the user should be shown: the
 * wait for the host's access token reads as 'loading', and a single failed
 * background poll leaves the running job's spinner in place instead of raising
 * the alert. See useLatestFlowRun. The branches themselves are RunState's, which
 * the checks view shares.
 */
import { computed } from 'vue';
import OverviewSummary from '../components/OverviewSummary.vue';
import RunState from '../components/RunState.vue';
import OverviewTable from '../components/OverviewTable.vue';
import { useDataQualityOverview } from '../composables/useDataQualityOverview';
import { useHostContext } from '../composables/useHostContext';
import { formatDuration, formatRunTimestamp } from '../utils/format';

const ctx = useHostContext();
const { status, overview, flowRunStateType, errorMessage, retry } = useDataQualityOverview(
  ctx.datasetId,
  ctx.getToken,
  ctx.cohortDefinitionId,
);


// Run metadata is optional: artifacts written before jobplugins started emitting
// it (#3158) have none, so the footer only appears once there is something in it.
const generatedOn = computed(() => {
  const timing = overview.value?.timing;
  return formatRunTimestamp(timing?.startTimestamp ?? timing?.endTimestamp);
});
const duration = computed(() => formatDuration(overview.value?.timing));
const dqdVersion = computed(() => overview.value?.dqdVersion ?? '');
</script>

<template>
  <div class="dq-root">
    <!-- Every state before results is RunState's, shared with the checks view. -->
    <RunState
      v-if="status !== 'ready'"
      :status="status"
      :flow-run-state-type="flowRunStateType"
      :error-message="errorMessage"
      @retry="retry"
    />

    <div v-else-if="overview" class="dq-dashboard" data-testid="dq-overview">
      <OverviewSummary :data="overview" />
      <div class="dq-dashboard__results">
        <OverviewTable :data="overview" />
        <div v-if="generatedOn || dqdVersion" class="dq-dashboard__footer">
          <p v-if="generatedOn">
            Generated on {{ generatedOn }}<template v-if="duration"> in {{ duration }}</template>
          </p>
          <p v-if="dqdVersion">Data quality dashboard version: {{ dqdVersion }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* The card the design draws around this content is the surface's own: Atlas
   mounts us inside `AtlasCard padding="md"` (DataSourcesView's
   `datasources-view__report`), which already supplies the frame, the inset and
   the elevation. Drawing our own would stack a second card inside the first, so
   everything here is flat and keeps only the design's internal rhythm. */
.dq-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--dq-space-m);
}

.dq-dashboard__results {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dq-dashboard__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px var(--dq-space-s);
  font-size: 14px;
  line-height: 1.5;
  color: var(--dq-text-muted);
}

.dq-dashboard__footer p {
  margin: 0;
}
</style>
