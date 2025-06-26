import { useCallback, useState } from "react";
import { request } from "../axios/request";
import { AppError } from "../types";

const JOBPLUGIN_URL = "jobplugins/";

interface OverwriteAllFromRemoteResponse {
  message: string;
  processedCount: number;
  results: Array<{
    canvasId: string;
    revisionId?: string;
    name?: string;
    error?: string;
  }>;
}

export const useOverwriteAllCanvasesFromRemote = (): [
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

      const headers: { [key: string]: string } = {};

      const response = await request<OverwriteAllFromRemoteResponse>({
        baseURL: JOBPLUGIN_URL,
        url: "dataflow/overwrite-all-from-remote",
        method: "POST",
        headers,
      });

      return response;
    } catch (error: any) {
      const appError = {
        message: error?.response?.data?.message || error.message || "Failed to overwrite canvases from remote",
      };
      setError(appError);
      throw appError;
    } finally {
      setLoading(false);
    }
  }, []);

  return [overwriteAllFromRemote, loading, error];
};
