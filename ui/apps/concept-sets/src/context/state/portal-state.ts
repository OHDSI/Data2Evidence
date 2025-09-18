export interface PortalState {
  userName?: string;
  userId?: string;
  getToken?: () => Promise<string>;
  datasetId?: string;
}

export const portalDefault: PortalState = {
  userName: undefined,
  userId: undefined,
  getToken: undefined,
  datasetId: undefined,
};
