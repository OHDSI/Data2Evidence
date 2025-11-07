import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { Study, AppError } from "../types";

export const usePublicDatasets = (
  searchText?: string,
  refetch = 0
): [Study[] | undefined, boolean, AppError | undefined] => {
  const [datasets, setDatasets] = useState<Study[] | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(refetch ? false : true);
      const datasets = await api.systemPortal.getPublicDatasets(searchText);
      setDatasets(datasets);
    } catch (error: any) {
      if ("message" in error) {
        setError({ message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [searchText, refetch]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  return [datasets, loading, error];
};
