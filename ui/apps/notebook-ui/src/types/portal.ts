import { ParcelProps } from "single-spa";

export interface PortalProps extends Partial<ParcelProps> {
  getToken?: () => Promise<string>;
  username?: string;
  idpUserId?: string;
  datasetId?: string;
  locale?: string;
  isActiveRoute?: boolean;
  isAtlas?: boolean;
  uiFilesUrl?: string;
}
