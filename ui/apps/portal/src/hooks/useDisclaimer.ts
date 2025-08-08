import { useCallback, useEffect, useState } from "react";
import { useDisclaimer } from "../contexts";
import { api } from "../axios/api";

import { ConfigTypes } from "../constant";

export const useDisclaimerHook = () => {
  const { disclaimer, setShouldDisplayDisclaimer } = useDisclaimer();

  const fetchDisclaimerConfig = useCallback(async () => {
    const configs = await api.systemPortal.getConfigsByTypes([ConfigTypes.DISCLAIMER_DISPLAY]);
    setShouldDisplayDisclaimer(configs[ConfigTypes.DISCLAIMER_DISPLAY] === "1");
  }, []);

  useEffect(() => {
    if (disclaimer.shouldDisplay !== undefined) {
      return;
    }
    fetchDisclaimerConfig();
  }, []);
};
