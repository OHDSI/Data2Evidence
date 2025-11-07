import React, { FC, ReactNode } from "react";
import { useEnabledFeatures } from "../hooks";

interface FeatureGateProps {
  featureFlags: string[];
  children?: ReactNode;
}

export const FeatureGate: FC<FeatureGateProps> = (props) => {
  const { featureFlags } = props;
  const features = useEnabledFeatures();

  if (!features.some((f) => featureFlags.includes(f))) return null;
  return <>{props.children}</>;
};
