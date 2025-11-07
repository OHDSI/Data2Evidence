import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { DatasetResource, AppError } from "../types";

export const useDatasetResources = (
  datasetId: string,
  refetch = 0
): [DatasetResource[], boolean, AppError | undefined] => {
  const [resources, setResources] = useState<DatasetResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchDatasetResources = useCallback(async () => {
    try {
      setLoading(refetch ? false : true);
      const response = await api.systemPortal.getResources(datasetId);
      setResources(response?.resources || []);
    } catch (error: any) {
      if ("message" in error) {
        setError({ message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [datasetId, refetch]);

  useEffect(() => {
    fetchDatasetResources();
  }, [fetchDatasetResources]);

  return [resources, loading, error];
};
