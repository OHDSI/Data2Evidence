import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { AppError, ConfigItem } from "../types";

export const useAzureAdConfigs = (): [ConfigItem[], boolean, AppError | undefined] => {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const configs = await api.userMgmt.getAzureAdConfigs();
      setConfigs(configs);
    } catch (error: any) {
      if ("message" in error) {
        setError({ message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  return [configs, loading, error];
};
