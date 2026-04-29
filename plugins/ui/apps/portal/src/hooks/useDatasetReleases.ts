import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { AppError } from "../types";
import { DatasetRelease } from "../plugins/SystemAdmin/DQD/types";

export const useDatasetReleases = (
  datasetId: string,
  refetch = 0
): [DatasetRelease[], boolean, AppError | undefined] => {
  const [releases, setReleases] = useState<DatasetRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchDatasetReleases = useCallback(async () => {
    try {
      setLoading(refetch ? false : true);
      const response = await api.systemPortal.getDatasetReleases(datasetId);
      setReleases(response);
    } catch (error: any) {
      if ("message" in error) {
        setError({ message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [datasetId, refetch]);

  useEffect(() => {
    fetchDatasetReleases();
  }, [fetchDatasetReleases]);

  return [releases, loading, error];
};
