import { useCallback, useEffect, useState } from "react";
import { PaConfig } from "../types";
import { api } from "../axios/api";

export const usePaConfigs = (): [PaConfig[]] => {
  const [paConfigs, setPaConfigs] = useState<PaConfig[]>([]);

  const getPaConfigs = useCallback(async () => {
    try {
      const paConfigs = await api.systemPortal.getPaConfigs();
      setPaConfigs(paConfigs);
    } catch (error) {
      console.error(error);
    }
  }, [setPaConfigs]);

  useEffect(() => {
    getPaConfigs();
  }, [getPaConfigs]);

  return [paConfigs];
};
