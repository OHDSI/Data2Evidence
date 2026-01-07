import { Feature } from "../../types/portal";

export interface PortalState {
  userName?: string;
  userId?: string;
  getToken?: () => Promise<string>;
  datasetId?: string;
  features?: Feature[];
  featuresLoading?: boolean;
}

export const portalDefault: PortalState = {
  userName: undefined,
  userId: undefined,
  getToken: undefined,
  datasetId: undefined,
  features: undefined,
  featuresLoading: undefined,
};
