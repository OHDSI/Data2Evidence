import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { AppError } from "../types";

export const useSystemFeatures = (): [string[], boolean, AppError | undefined] => {
  const [systemFeatures, setSystemFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchSystemFeatures = useCallback(async () => {
    try {
      setLoading(true);
      const systemFeatures = await api.systemPortal.getSystemFeatures();
      const enabledFeatures = systemFeatures.map((f) => f.feature);
      setSystemFeatures(enabledFeatures);
    } catch (error: any) {
      if ("message" in error) {
        setError({ message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemFeatures();
  }, [fetchSystemFeatures]);

  return [systemFeatures, loading, error];
};
