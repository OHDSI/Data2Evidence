import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { Tenant, AppError } from "../types";

export const useTenants = (refetch = 0): [Tenant[], boolean, AppError | undefined] => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(refetch ? false : true);
      const tenants = await api.systemPortal.getTenants();
      setTenants(tenants);
    } catch (error: any) {
      if ("message" in error) {
        setError({ message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  return [tenants, loading, error];
};
