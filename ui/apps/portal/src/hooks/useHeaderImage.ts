import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { Config } from "../types";

export const useHeaderImage = (): [string | null, boolean] => {
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHeaderImage = useCallback(async () => {
    try {
      setLoading(true);
      const config: Config = await api.systemPortal.getPublicHeaderImage();
      setHeaderImage(config?.value || null);
    } catch (error: any) {
      console.error("Failed to fetch header image config", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHeaderImage();
  }, [fetchHeaderImage]);

  return [headerImage, loading];
};
