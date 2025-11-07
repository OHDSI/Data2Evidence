import { useCallback, useEffect, useState } from "react";
import { api } from "../../axios/api";
import { HistoryJob } from "../../plugins/SystemAdmin/DQD/types";
import { AppError } from "../../types";

export const useHistoryTableJobs = (
  refetch = 0,
  isSilentRefresh = false
): [HistoryJob[] | undefined, boolean, AppError | undefined] => {
  const [dqdJobs, setDqdJobs] = useState<HistoryJob[]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchDqdJobs = useCallback(async () => {
    try {
      setLoading(!isSilentRefresh);
      const results = await api.dataflow.getFlowRuns("dqd");
      setDqdJobs(results);
    } catch (error: any) {
      console.error(error);
      setError({ message: "An error occured while getting DQD Jobs" });
    } finally {
      setLoading(false);
    }
  }, [refetch, isSilentRefresh]);

  useEffect(() => {
    fetchDqdJobs();
  }, [fetchDqdJobs]);

  return [dqdJobs, loading, error];
};
