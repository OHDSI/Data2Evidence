import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { Tenant, AppError } from "../types";

export const useTenant = (refetch = 0): [Tenant | undefined, boolean, AppError | undefined] => {
  const [tenant, setTenant] = useState<Tenant>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(refetch ? false : true);
      const tenants = await api.systemPortal.getTenants();
      if (tenants?.length > 0) setTenant(tenants[0]);
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

  return [tenant, loading, error];
};
