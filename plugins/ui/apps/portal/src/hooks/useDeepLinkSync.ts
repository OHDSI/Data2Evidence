import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveDataset, useFeedback } from "../contexts";
import { syncDatasetFromUrl } from "../utils/deepLinkHandler";
import { Study } from "../types";
import { config } from "../config";

/**
 * Custom hook to sync dataset from captured deep-link params on mount
 *
 * Portal startup captures deep-link URL params in sessionStorage before this hook runs.
 * If a stored datasetId is found and valid, this hook auto-selects that dataset in Portal
 * and navigates to the captured target path or information page.
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
      availableDatasets: datasets,
      setActiveDatasetId,
      setFeedback,
      navigate,
      basePath: config.ROUTES.researcher,
    });
  }, [datasets, loading, navigate]);
};
