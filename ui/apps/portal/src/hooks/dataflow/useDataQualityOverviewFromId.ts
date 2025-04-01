import { useCallback, useEffect, useState } from "react";
import { api } from "../../axios/api";
import { OverviewResults } from "../../components/DQD/types";
import { AppError } from "../../types";

export const useDataQualityOverviewFromId = (
  flowRunId: string,
  datasetId: string
): [OverviewResults | undefined, boolean, AppError | undefined] => {
  const [results, setResults] = useState<OverviewResults>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchDataQualityDataflowResults = useCallback(async () => {
    try {
      setLoading(true);
      const results = await api.dataflow.getDataQualityDataflowOverview(flowRunId, datasetId);
      setResults(results);
    } catch (error: any) {
      console.error(error);
      setError({ message: "An error occured while getting Data Quality Overview" });
    } finally {
      setLoading(false);
    }
  }, [flowRunId, datasetId]);

  useEffect(() => {
    fetchDataQualityDataflowResults();
  }, [fetchDataQualityDataflowResults]);

  return [results, loading, error];
};
