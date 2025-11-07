import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { AppError } from "../types";

export const useDatasetTagConfigs = (refetch = 0): [string[], boolean, AppError | undefined] => {
  const [datasetTagConfigs, setDatasetTagConfigs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchDatasetTagConfigs = useCallback(async () => {
    try {
      setLoading(refetch ? false : true);
      const datasetTagConfigs = await api.systemPortal.getDatasetTagConfigs();
      setDatasetTagConfigs(datasetTagConfigs);
    } catch (error: any) {
      console.error(error);
      setError({ message: "An error occured while getting Dataset Tag Config list" });
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  useEffect(() => {
    fetchDatasetTagConfigs();
  }, [fetchDatasetTagConfigs]);

  return [datasetTagConfigs, loading, error];
};
