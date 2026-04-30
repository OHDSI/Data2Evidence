import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveDataset, useFeedback } from "../contexts";
import { syncDatasetFromUrl } from "../utils/deepLinkHandler";
import { Study } from "../types";
import { config } from "../config";

/**
 * Custom hook to sync dataset from URL on mount
 *
 * This hook runs once on component mount and checks for a `datasetId` URL parameter.
 * If found and valid, it auto-selects that dataset in Portal and navigates to the information page.
 *
 * @param datasets - List of available datasets user has access to
 * @param loading - Whether datasets are still loading
 */
export const useDeepLinkSync = (datasets: Study[], loading: boolean) => {
  const { setActiveDatasetId } = useActiveDataset();
  const { setFeedback } = useFeedback();
  const navigate = useNavigate();
  const hasProcessedRef = useRef(false);
  const hasStartedLoadingRef = useRef(false);

  useEffect(() => {
    // Track loading cycle to avoid running before datasets are fetched
    if (loading) {
      hasStartedLoadingRef.current = true;
    }

    // Wait for loading to complete (true → false transition)
    if (hasProcessedRef.current || loading || !hasStartedLoadingRef.current) {
      return;
    }

    hasProcessedRef.current = true;

    syncDatasetFromUrl({
      url: window.location.href,
      availableDatasets: datasets,
      setActiveDatasetId,
      setFeedback,
      navigate,
      basePath: config.ROUTES.researcher,
    });
  }, [datasets, loading, navigate]);
};
