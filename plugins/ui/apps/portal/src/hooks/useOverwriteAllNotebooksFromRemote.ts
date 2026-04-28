import { useCallback, useState } from "react";
import { api } from "../axios/api";
import { OverwriteAllFromRemoteResponse } from "../axios/study-notebook";
import { AppError } from "../types";

export const useOverwriteAllNotebooksFromRemote = (): [
  () => Promise<OverwriteAllFromRemoteResponse>,
  boolean,
  AppError | undefined
] => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError>();

  const overwriteAllFromRemote = useCallback(async (): Promise<OverwriteAllFromRemoteResponse> => {
    try {
      setLoading(true);
      setError(undefined);

      const response = await api.studyNotebook.overwriteAllFromRemote();

      return response;
    } catch (error: any) {
      const appError = {
        message: error?.response?.data?.message || error.message || "Failed to overwrite notebooks from remote",
      };
      setError(appError);
      throw appError;
    } finally {
      setLoading(false);
    }
  }, []);

  return [overwriteAllFromRemote, loading, error];
};
