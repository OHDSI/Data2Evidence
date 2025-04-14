import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { AppError, Config } from "../types";
import { ConfigTypes } from "../constant";

export const useOverviewDescription = (isPublic?: boolean, refetch = 0): [Config, boolean, AppError | undefined] => {
  const [overviewDescription, setOverviewDescription] = useState<Config>({
    type: ConfigTypes.OVERVIEW_DESCRIPTION,
    value: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchoverviewDescription = useCallback(async () => {
    let overviewDescription;
    try {
      setLoading(refetch ? false : true);
      if (isPublic) {
        overviewDescription = await api.systemPortal.getPublicOverviewDescription();
      } else {
        overviewDescription = await api.systemPortal.getOverviewDescription();
      }
      setOverviewDescription(overviewDescription);
    } catch (error: any) {
      if ("message" in error) {
        setError({ message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  useEffect(() => {
    fetchoverviewDescription();
  }, [fetchoverviewDescription]);

  return [overviewDescription, loading, error];
};
