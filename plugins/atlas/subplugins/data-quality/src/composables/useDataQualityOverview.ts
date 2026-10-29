import { ref, type Ref } from 'vue';
import {
  getDataQualityOverview,
  type FlowRunStateType,
  type OverviewResults,
} from '../api/dqd';
import { useLatestFlowRun } from './useLatestFlowRun';

export type { DataQualityStatus } from './useLatestFlowRun';
import type { DataQualityStatus } from './useLatestFlowRun';

/**
 * The dashboard's data: the latest run's derived overview. The run lookup, the
 * poll and every state live in useLatestFlowRun, which the checks view shares;
 * this only names the result for the dashboard.
 */
export interface UseDataQualityOverview {
  status: Ref<DataQualityStatus>;
  overview: Ref<OverviewResults | null>;
  flowRunStateType: Ref<FlowRunStateType | undefined>;
  /** Only meaningful while `status` is 'error'. */
  errorMessage: Ref<string>;
  /** Re-runs the load behind the error state's Retry button. */
  retry: () => void;
}

export function useDataQualityOverview(
  datasetId: Ref<string>,
  getToken: () => Promise<string>,
  /**
   * Scope the report to one cohort definition rather than the whole data
   * source. Optional and defaulted, so the datasource-sidebar mount - which
   * has no cohort - keeps calling this with two arguments and is unaffected.
   */
  cohortDefinitionId: Ref<string | undefined> = ref(undefined),
): UseDataQualityOverview {
  const run = useLatestFlowRun(datasetId, getToken, cohortDefinitionId, getDataQualityOverview);
  return {
    status: run.status,
    overview: run.result,
    flowRunStateType: run.flowRunStateType,
    errorMessage: run.errorMessage,
    retry: run.retry,
  };
}
