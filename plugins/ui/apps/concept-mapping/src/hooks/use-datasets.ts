import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { Study, AppError } from "../types";

export const useDatasets = (refetch = 0): [Study[], boolean, AppError | undefined] => {
  const [datasets, setDatasets] = useState<Study[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(refetch ? false : true);
      const datasets = await api.systemPortal.getDatasets();
      setDatasets(datasets);
    } catch (error: any) {
      if ("message" in error) {
        setError({ message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  return [datasets, loading, error];
};
