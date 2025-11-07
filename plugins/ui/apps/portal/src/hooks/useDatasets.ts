import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { Study, AppError, DatasetQueryRole } from "../types";

export const useDatasets = (
  role: DatasetQueryRole,
  searchText?: string,
  filters: Record<string, string> = {},
  refetch = 0
): [Study[], boolean, AppError | undefined] => {
  const [datasets, setDatasets] = useState<Study[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();
  const filterQs = new URLSearchParams(filters).toString();

  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(refetch ? false : true);
      const datasets = await api.systemPortal.getDatasets(role, searchText, new URLSearchParams(filterQs));
      setDatasets(datasets);
    } catch (error: any) {
      if ("message" in error) {
        setError({ message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [role, searchText, filterQs, refetch]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  return [datasets, loading, error];
};
