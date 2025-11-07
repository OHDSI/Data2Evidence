import { useCallback, useEffect, useState } from "react";
import { api } from "../../axios/api";
import { CheckResults } from "../../components/DQD/types";
import { AppError } from "../../types";

export const useDataQualityResultsFromId = (
  flowRunId: string,
  datasetId: string
): [CheckResults[], boolean, AppError | undefined] => {
  const [results, setResults] = useState<CheckResults[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchDataQualityDataflowResults = useCallback(async () => {
    try {
      setLoading(true);
      const results = await api.dataflow.getDataQualityDataflowResults(flowRunId, datasetId);
      setResults(results);
    } catch (error: any) {
      console.error(error);
      setError({ message: "An error occured while getting Data Quality Results" });
    } finally {
      setLoading(false);
    }
  }, [flowRunId, datasetId]);

  useEffect(() => {
    fetchDataQualityDataflowResults();
  }, [fetchDataQualityDataflowResults]);

  return [results, loading, error];
};
