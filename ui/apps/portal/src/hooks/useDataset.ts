import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { Study, AppError } from "../types";

export const useDataset = (id: string, refetch = 0): [Study | undefined, boolean, AppError | undefined] => {
  const [dataset, setDataset] = useState<Study>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchDataset = useCallback(async () => {
    try {
      setLoading(refetch ? false : true);
      const dataset = await api.systemPortal.getDataset(id);
      setDataset(dataset);
    } catch (error: any) {
      if ("message" in error) {
        setError({ message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [id, refetch]);

  useEffect(() => {
    fetchDataset();
  }, [fetchDataset]);

  return [dataset, loading, error];
};
