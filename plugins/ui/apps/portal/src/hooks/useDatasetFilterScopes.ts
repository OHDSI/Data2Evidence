import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { DatasetFilter, AppError } from "../types";

export const useDatasetFilterScopes = (): [DatasetFilter | undefined, boolean, AppError | undefined] => {
  const [filterScopes, setFilterScopes] = useState<DatasetFilter>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchDatasetFilterScopes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.systemPortal.getDatasetFilterScopes();
      setFilterScopes(response);
    } catch (error: any) {
      if ("message" in error) {
        setError({ message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDatasetFilterScopes();
  }, [fetchDatasetFilterScopes]);

  return [filterScopes, loading, error];
};
