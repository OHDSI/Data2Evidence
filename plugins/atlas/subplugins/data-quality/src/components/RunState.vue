<script setup lang="ts">
/**
 * Everything a data quality view shows before it has results: the fetch in
 * flight, a job still running, a failed load, a cancelled or failed job, and
 * the three kinds of nothing-to-show. Shared by the dashboard and the checks
 * view, so both tabs describe the same run in the same words.
 *
 * The treatments follow Atlas3's own conventions - see DashboardView for why a
 * running job gets a spinner rather than a skeleton. It renders nothing once
 * `status` is 'ready'. It must sit inside `.dq-root`, which carries the --dq-*
 * tokens its styles read (style.css).
 */
import { computed } from 'vue';
import {
  AtlasAlert,
  AtlasButton,
  AtlasChip,
  AtlasIcon,
  AtlasProgressCircular,
  AtlasSkeleton,
} from '@ohdsi/atlas-ui';
import type { FlowRunStateType } from '../api/dqd';
import type { DataQualityStatus } from '../composables/useLatestFlowRun';
import { useHostContext } from '../composables/useHostContext';

const props = defineProps<{
  status: DataQualityStatus;
  flowRunStateType?: FlowRunStateType;
  errorMessage: string;
}>();

const emit = defineEmits<{ retry: [] }>();

const { t } = useHostContext();

/**
 * The states that mean "nothing to render yet", as opposed to a job that ended
 * badly — those stay alerts below, because a cancelled or failed run is an
 * outcome the user may need to act on rather than an absence.
 */
const EMPTY_STATES: Partial<
  Record<DataQualityStatus, { icon: string; key: string; fallback: string }>
> = {
  'no-source': {
    // Same icon Atlas3 uses for its own "pick a source" hint.
    icon: 'mdi-database-arrow-down-outline',
    key: 'plugins.dataQuality.noSource',
    fallback: 'Select a data source to see its data quality results.',
  },
  'no-run': {
    icon: 'mdi-clipboard-text-off-outline',
    key: 'plugins.dataQuality.noRun',
    fallback: 'No data quality job has run for this data source yet.',
  },
  'no-results': {
    icon: 'mdi-information-outline',
    key: 'plugins.dataQuality.noResults',
    fallback: 'The latest data quality job finished without producing results.',
  },
};

const emptyState = computed(() => EMPTY_STATES[props.status] ?? null);
</script>

<template>
    <!-- Fetch in flight: the shape of what is arriving is known, so stand in for
         it rather than spinning. -->
    <AtlasSkeleton
      v-if="status === 'loading'"
      type="heading, paragraph, table"
      class="dq-skeleton"
      data-testid="dq-loading"
    />

    <div v-else-if="status === 'in-progress'" class="dq-state" data-testid="dq-job-progress">
      <AtlasProgressCircular indeterminate size="16" width="2" color="warning" />
      <AtlasChip tone="warning" size="sm" data-testid="dq-job-state">
        {{ flowRunStateType }}
      </AtlasChip>
      <p class="dq-state__text">
        {{
          t(
            'plugins.dataQuality.jobInProgress',
            'Results appear here once the data quality job finishes.',
          )
        }}
      </p>
    </div>

    <AtlasAlert v-else-if="status === 'error'" severity="danger" data-testid="dq-error">
      {{ errorMessage }}
      <template #actions>
        <AtlasButton variant="ghost" size="sm" data-testid="dq-retry" @click="emit('retry')">
          {{ t('plugins.dataQuality.retry', 'Retry') }}
        </AtlasButton>
      </template>
    </AtlasAlert>

    <AtlasAlert v-else-if="status === 'cancelled'" severity="warning">
      {{
        t('plugins.dataQuality.cancelled', 'The latest data quality job was cancelled.')
      }}
    </AtlasAlert>

    <AtlasAlert v-else-if="status === 'failed'" severity="danger">
      {{
        t(
          'plugins.dataQuality.failed',
          'The latest data quality job failed. Re-run it to see results here.',
        )
      }}
    </AtlasAlert>

    <div v-else-if="emptyState" class="dq-empty" data-testid="dq-empty">
      <AtlasIcon :icon="emptyState.icon" size="36" class="dq-empty__icon" />
      <p class="dq-empty__text">{{ t(emptyState.key, emptyState.fallback) }}</p>
    </div>
</template>

<style scoped>
/* Atlas3 rounds its report skeleton to 12px; matched here so the placeholder
   sits in the host card the same way the real content does. */
.dq-skeleton {
  border-radius: 12px;
  background: transparent;
}

.dq-state {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--dq-text-muted);
}

.dq-state__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

/* Atlas3's `datasources-view__empty`: an MD3 "filled" placeholder region, the
   tint alone signalling emptiness with no border or dashed outline. Its metrics
   land exactly on tokens this plugin already defines (56px/24px). The colours
   come from --dq-* rather than --v-theme-* because the plugin's Vuetify runs
   with `theme: false` and inherits the host's :root tokens instead. */
.dq-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: var(--dq-space-xl) var(--dq-space-m);
  border-radius: 12px;
  background: var(--dq-surface-subtle);
}

.dq-empty__icon {
  color: var(--dq-text-muted);
  opacity: 0.7;
}

.dq-empty__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--dq-text-muted);
  text-align: center;
}
</style>
