import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";

export type ViewerStatus = "starting" | "up" | "stopping" | "down" | "failed" | "loading";

type UseKernelViewerResponse = [
  viewerStatus: ViewerStatus,
  startViewer: (viewerCode: string) => Promise<void>,
  stopViewer: () => Promise<void>
];

export const useKernelViewer = (id: string, selectedDatasetId: string = "", dashboardName?: string): UseKernelViewerResponse => {
  const [viewerStatus, setViewerStatus] = useState<ViewerStatus>("loading");

  const fetchViewerStatus = useCallback(async () => {
    try {
      const response = await api.strategusResults.getStrategusResultViewerStatus(id, dashboardName);
      if (response.running) {
        setViewerStatus("up");
      } else {
        setViewerStatus("down");
      }
    } catch (error: any) {
      if (error.status === 404 || error.status === 503) {
        setViewerStatus("down");
        return;
      }
      console.error("Error fetching viewer status:", error);
      setViewerStatus("failed");
    }
  }, [id, dashboardName]);

  useEffect(() => {
    fetchViewerStatus();
  }, [fetchViewerStatus]);

  const startViewer = useCallback(
    async (viewerCode: string) => {
      try {
        setViewerStatus("starting");
        await api.strategusResults.startStrategusResultViewer(id, selectedDatasetId, viewerCode || "", dashboardName);
        setViewerStatus("up");
      } catch (error: any) {
        console.error("Error starting viewer:", error);
        setViewerStatus("failed");
        throw error;
      }
    },
    [selectedDatasetId, id, dashboardName]
  );

  const stopViewer = useCallback(async () => {
    try {
      setViewerStatus("stopping");
      await api.strategusResults.stopStrategusResultViewer(id, dashboardName);
      setViewerStatus("down");
    } catch (error: any) {
      console.error(error);
      setViewerStatus("failed");
      throw error;
    }
  }, [id, dashboardName]);

  return [viewerStatus, startViewer, stopViewer];
};
