import { useCallback, useEffect, useState } from "react";
import { AppError, IDatabase } from "../types";
import { api } from "../axios/api";

export const useDatabases = (refetch = 0): [IDatabase[], boolean, AppError | undefined] => {
  const [databases, setDatabases] = useState<IDatabase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const fetchDbs = useCallback(async () => {
    try {
      setLoading(refetch ? false : true);
      const dbs = await api.dbCredentialsMgr.getDbList();
      setDatabases(dbs);
    } catch (error: any) {
      if ("message" in error) {
        setError({ message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  useEffect(() => {
    fetchDbs();
  }, [fetchDbs]);

  return [databases, loading, error];
};
