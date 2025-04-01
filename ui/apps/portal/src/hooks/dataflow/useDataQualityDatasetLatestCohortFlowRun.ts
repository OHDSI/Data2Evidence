import { useCallback, useEffect, useState } from "react";
import { api } from "../../axios/api";
import { AppError } from "../../types";

export const useDataQualityDatasetLatestCohortFlowRun = (
  datasetId: string,
  cohortDefinitionId: string,
  refetch = 0
): [any, boolean, AppError | undefined] => {
  const [results, setResults] = useState<any>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchDatasetLatestFlowRun = useCallback(async () => {
    try {
      setLoading(refetch ? false : true);
      const results = await api.dataflow.useDataQualityDatasetLatestCohortFlowRun(datasetId, cohortDefinitionId);
      setResults(results);
    } catch (error: any) {
      console.error(error);
      setError({ message: "An error occured while getting Data Quality Results" });
    } finally {
      setLoading(false);
    }
  }, [datasetId, cohortDefinitionId, refetch]);

  useEffect(() => {
    fetchDatasetLatestFlowRun();
  }, [fetchDatasetLatestFlowRun]);

  return [results, loading, error];
};
