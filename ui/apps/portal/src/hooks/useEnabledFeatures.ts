import { useMemo } from "react";
import { useFeatures } from "./useFeatures";
import { AppError } from "../types";

export const useEnabledFeatures = (): [string[], boolean, AppError | undefined] => {
  const [features, loading, error] = useFeatures();
  const enabledFeatures = useMemo(() => features.filter((f) => f.isEnabled).map((f) => f.feature), [features]);
  return [enabledFeatures, loading, error];
};
