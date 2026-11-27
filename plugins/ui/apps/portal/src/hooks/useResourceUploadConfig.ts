import { useEffect, useState } from "react";
import { api } from "../axios/api";
import { ResourceUploadConfig } from "../types";

// Fetches the resource upload rules. If the request fails, config stays
// undefined: the UI then skips its own checks and the backend still enforces them.
export const useResourceUploadConfig = (): [ResourceUploadConfig | undefined, boolean] => {
  const [config, setConfig] = useState<ResourceUploadConfig>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.systemPortal
      .getResourceUploadConfig()
      .then((result) => {
        if (!cancelled) setConfig(result);
      })
      .catch((error) => {
        console.error("Failed to load resource upload config", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return [config, loading];
};
