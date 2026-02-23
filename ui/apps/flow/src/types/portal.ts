import { ParcelProps } from "single-spa";

export interface PortalProps extends Partial<ParcelProps> {
  appId?: string;
  getToken?: () => Promise<string>;
  username?: string;
  idpUserId?: string;
  datasetId?: string;
  locale?: string;
  isAtlas?: boolean;
  uiFilesUrl?: string;
}
