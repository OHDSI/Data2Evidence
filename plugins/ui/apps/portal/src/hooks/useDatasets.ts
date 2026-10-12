import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../axios/api";
import { useUser } from "../contexts";
import { UserState } from "../contexts/app-context/states";
import { Study, AppError, DatasetQueryRole } from "../types";

export const useDatasets = (
  role: DatasetQueryRole,
  searchText?: string,
  filters: Record<string, string> = {},
  refetch = 0
): [Study[], boolean, AppError | undefined] => {
  const [datasets, setDatasets] = useState<Study[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();
  const filterQs = new URLSearchParams(filters).toString();

  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(refetch ? false : true);
      let datasets = await api.systemPortal.getDatasets(role, searchText, new URLSearchParams(filterQs));

      if (role === "researcher") {
        datasets = datasets.filter((dataset) => dataset.type !== "source");
      }

      setDatasets(datasets);
    } catch (error: any) {
      if ("message" in error) {
        setError({ message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [role, searchText, filterQs, refetch]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  return [datasets, loading, error];
};

export const filterAccessibleDatasets = (
  datasets: Study[],
  user: Pick<UserState, "isSystemAdmin" | "isDatasetResearcher">
): Study[] => {
  if (user.isSystemAdmin) return datasets;
  return datasets.filter((dataset) => Boolean(user.isDatasetResearcher?.[dataset.id]));
};

export const useAccessibleDatasets = (): [Study[], boolean, AppError | undefined] => {
  const [datasets, loading, error] = useDatasets("researcher");
  const { user } = useUser();
  const accessibleDatasets = useMemo(
    () => filterAccessibleDatasets(datasets, user),
    [datasets, user.isSystemAdmin, user.isDatasetResearcher]
  );
  return [accessibleDatasets, loading, error];
};
