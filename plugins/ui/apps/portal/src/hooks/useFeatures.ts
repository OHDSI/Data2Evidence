import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { AppError, IFeature } from "../types";

export const useFeatures = (): [IFeature[], boolean, AppError | undefined] => {
  const [features, setFeatures] = useState<IFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchFeatures = useCallback(async () => {
    try {
      setLoading(true);
      const features = await api.systemPortal.getFeatures();
      setFeatures(features);
    } catch (error: any) {
      if ("message" in error) {
        setError({ message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  return [features, loading, error];
};
