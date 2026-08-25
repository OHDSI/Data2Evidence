import { ParcelProps } from "single-spa";

export interface AtlasPluginHostContext {
  surface?: string;
  itemId?: string;
  sourceKey?: string;
  locale?: string;
  permissions?: string[];
}

export interface AtlasPluginAuthContext {
  user?: {
    username?: string;
  } | null;
}

export interface PortalProps extends Partial<ParcelProps> {
  appId?: string;
  getToken?: () => Promise<string>;
  username?: string;
  datasetId?: string;
  locale?: string;
  isAtlas?: boolean;
  authContext?: AtlasPluginAuthContext;
  hostContext?: AtlasPluginHostContext;
  // Atlas supplies the parcel mount target directly instead of a Portal containerId.
  domElement?: HTMLElement;
}
