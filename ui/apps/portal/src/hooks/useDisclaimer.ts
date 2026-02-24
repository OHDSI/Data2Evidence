import { useCallback, useEffect } from "react";
import { useDisclaimer } from "../contexts";
import { api } from "../axios/api";
import { hasDisclaimerBeenAccepted } from "../utils/disclaimerStorage";

import { ConfigTypes } from "../constant";

export const useDisclaimerHook = () => {
  const { disclaimer, setShouldDisplayDisclaimer, setIsDisclaimerAccepted } = useDisclaimer();

  const fetchDisclaimerConfig = useCallback(async () => {
    // First check if the user has already accepted the disclaimer in localStorage
    const hasAccepted = hasDisclaimerBeenAccepted();
    
    if (hasAccepted) {
      // If already accepted, set it in context and don't show the disclaimer
      setIsDisclaimerAccepted(true);
      setShouldDisplayDisclaimer(false);
    } else {
      // If not accepted, check backend config to see if disclaimer should be shown
      const configs = await api.systemPortal.getConfigsByTypes([ConfigTypes.DISCLAIMER_DISPLAY]);
      setShouldDisplayDisclaimer(configs[ConfigTypes.DISCLAIMER_DISPLAY] === "1");
    }
  }, [setShouldDisplayDisclaimer, setIsDisclaimerAccepted]);

  useEffect(() => {
    if (disclaimer.shouldDisplay !== undefined) {
      return;
    }
    fetchDisclaimerConfig();
  }, []);
};
