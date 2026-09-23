import { computed, type Ref } from 'vue';
import { getCheckResults, type FlowRunStateType } from '../api/dqd';
import type { DqdCheckRow } from '../checks/types';
import { useLatestFlowRun, type DataQualityStatus } from './useLatestFlowRun';

export interface UseDataQualityChecks {
  status: Ref<DataQualityStatus>;
  /** The latest completed run's rows; [] until there are some. */
  rows: Ref<DqdCheckRow[]>;
  flowRunStateType: Ref<FlowRunStateType | undefined>;
  errorMessage: Ref<string>;
  retry: () => void;
}

/**
 * The checks view's data: the per-check rows of the latest run. The run lookup,
 * the poll and every state are useLatestFlowRun's, shared with the dashboard, so
 * both tabs read the same run and say the same thing about it.
 */
export function useDataQualityChecks(
  datasetId: Ref<string>,
  getToken: () => Promise<string>,
  cohortDefinitionId: Ref<string | undefined>,
): UseDataQualityChecks {
  const run = useLatestFlowRun(datasetId, getToken, cohortDefinitionId, getCheckResults);
  return {
    status: run.status,
    rows: computed(() => run.result.value ?? []),
    flowRunStateType: run.flowRunStateType,
    errorMessage: run.errorMessage,
    retry: run.retry,
  };
}
