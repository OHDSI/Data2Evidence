import { useCallback } from "react";
import { QueryEntry } from "./useViewerData";

interface UseQueryManagementParams {
  queries: QueryEntry[];
  setQueries: React.Dispatch<React.SetStateAction<QueryEntry[]>>;
  originalQueryNames: string[];
}

export function useQueryManagement({
  queries,
  setQueries,
  originalQueryNames,
}: UseQueryManagementParams) {
  const addQuery = useCallback(() => {
    setQueries((prev) => [...prev, { queryName: "", sql: "" }]);
  }, [setQueries]);

  const updateQuery = useCallback((index: number, field: keyof QueryEntry, value: string) => {
    setQueries((prev) => prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)));
  }, [setQueries]);

  const removeQuery = useCallback((index: number) => {
    setQueries((prev) => prev.filter((_, i) => i !== index));
  }, [setQueries]);

  const getDeletedQueryNames = useCallback(() => {
    const currentQueryNames = queries.filter((q) => q.queryName).map((q) => q.queryName);
    return originalQueryNames.filter((origName) => !currentQueryNames.includes(origName));
  }, [queries, originalQueryNames]);

  const getValidQueries = useCallback(() => {
    return queries.filter((q) => q.queryName && q.sql);
  }, [queries]);

  return {
    addQuery,
    updateQuery,
    removeQuery,
    getDeletedQueryNames,
    getValidQueries,
  };
}
