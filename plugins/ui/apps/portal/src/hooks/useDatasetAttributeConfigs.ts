import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { AppError } from "../types";
import { DatasetAttributeConfig } from "../types";

export const useDatasetAttributeConfigs = (refetch = 0): [DatasetAttributeConfig[], boolean, AppError | undefined] => {
  const [datasetAttributeConfigs, setDatasetAttributeConfigs] = useState<DatasetAttributeConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchDatasetAttributeConfigs = useCallback(async () => {
    try {
      setLoading(refetch ? false : true);
      const datasetAttributeConfigs = await api.systemPortal.getDatasetAttributeConfigs();
      setDatasetAttributeConfigs(datasetAttributeConfigs);
    } catch (error: any) {
      console.error(error);
      setError({ message: "An error occured while getting Dataset Attribute Config list" });
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  useEffect(() => {
    fetchDatasetAttributeConfigs();
  }, [fetchDatasetAttributeConfigs]);

  return [datasetAttributeConfigs, loading, error];
};
