import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { AppError, Config } from "../types";
import { ConfigTypes } from "../constant";

const EMPTY_CONFIGS = {
  [ConfigTypes.OVERVIEW_DESCRIPTION]: "",
  [ConfigTypes.TERMS_OF_USE]: "",
  [ConfigTypes.TERMS_OF_USE_DISPLAY]: "0",
  [ConfigTypes.PRIVACY_POLICY]: "",
  [ConfigTypes.PRIVACY_POLICY_DISPLAY]: "0",
  [ConfigTypes.IMPRINT]: "",
  [ConfigTypes.IMPRINT_DISPLAY]: "0",
};

export const usePortalDescriptionConfigs = (
  types: ConfigTypes[] = [],
  refetch = 0
): [{ [key: string]: string }, boolean, AppError | undefined] => {
  const [configs, setConfigs] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(refetch ? false : true);
      const configs = await api.systemPortal.getConfigsByTypes(types);
      setConfigs({ ...EMPTY_CONFIGS, ...configs });
    } catch (error: any) {
      if ("message" in error) {
        setError({ message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  return [configs, loading, error];
};
