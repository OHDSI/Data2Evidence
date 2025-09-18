import { useCallback, useEffect, useState } from "react";
import { api } from "../../axios/api";
import { AppError } from "../../types";
import env from "../../env";

export const useDatasetLatestFlowRun = (
  jobType: string,
  datasetId: string,
  refetch = 0,
  releaseId?: string
): [any, boolean, AppError | undefined] => {
  const [results, setResults] = useState<any>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchDatasetLatestFlowRun = useCallback(async () => {
    try {
      setLoading(refetch ? false : true);
      let results;
      // If using public webapi proxy and job type is data-characterization, dont get dataset latest flow run details
      if (env.REACT_APP_USE_PUBLIC_WEBAPI_PROXY === "true" && jobType === "data-characterization") {
        // If flag is true, request is sent directly to public webapi, therefore no need to send request to get latest flow run details
        results = {
          id: "dummyid", // Dummy id, not checked against, just need a dummy value to be present
          state: {
            type: "COMPLETED",
          },
        };
      } else if (releaseId) {
        results = await api.dataflow.getDatasetReleaseFlowRun(jobType, datasetId, releaseId);
      } else {
        results = await api.dataflow.getDatasetLatestFlowRun(jobType, datasetId);
      }
      setResults(results);
    } catch (error: any) {
      console.error(error);
      setError({
        message: `An error occured while getting ${_getReadableJobType(jobType)} Results`,
      });
    } finally {
      setLoading(false);
    }
  }, [refetch, releaseId, jobType, datasetId]);

  useEffect(() => {
    fetchDatasetLatestFlowRun();
  }, [fetchDatasetLatestFlowRun]);

  return [results, loading, error];
};

const _getReadableJobType = (jobType: string) => {
  return jobType === "data-quality" ? "Data Quality" : "Data Characterization";
};
