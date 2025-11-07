import { useMemo } from "react";
import { useFeatures } from "./useFeatures";

export const useEnabledFeatures = (): string[] => {
  const [features] = useFeatures();
  const enabledFeatures = useMemo(() => features.filter((f) => f.isEnabled).map((f) => f.feature), [features]);
  return enabledFeatures;
};
