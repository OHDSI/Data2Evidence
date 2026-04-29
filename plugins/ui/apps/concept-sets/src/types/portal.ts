import { ParcelProps } from "single-spa";

export interface Feature {
  feature: string;
  isEnabled: boolean;
}

export interface PortalProps extends Partial<ParcelProps> {
  appId?: string;
  getToken?: () => Promise<string>;
  username?: string;
  datasetId?: string;
  locale?: string;
  isAtlas?: boolean;
  autoMount?: boolean;
  features?: Feature[];
  featuresLoading?: boolean;
}
