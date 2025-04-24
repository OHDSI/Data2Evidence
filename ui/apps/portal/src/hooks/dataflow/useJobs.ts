import { useCallback, useEffect, useState } from "react";
import { api } from "../../axios/api";
import { HistoryJob } from "../../plugins/SystemAdmin/DQD/types";
import { AppError, FlowRunFilters } from "../../types";

export const useJobs = (
  filter: FlowRunFilters | undefined,
  refetch = 0,
  isSilentRefresh = false
): [HistoryJob[] | undefined, boolean, AppError | undefined] => {
  const [jobs, setJobs] = useState<HistoryJob[]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(!isSilentRefresh);
      const results = await api.dataflow.getFlowRuns("all", filter);
      setJobs(results);
    } catch (error: any) {
      console.error(error);
      setError({ message: "An error occured while getting Jobs" });
    } finally {
      setLoading(false);
    }
  }, [filter, refetch, isSilentRefresh]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return [jobs, loading, error];
};
