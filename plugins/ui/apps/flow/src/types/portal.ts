import { ParcelProps } from "single-spa";

export interface PortalProps extends Partial<ParcelProps> {
  appId?: string;
  getToken?: () => Promise<string>;
  userId?: string;
  system: string;
  data: any;
}

export interface D2EUnsavedChangesRegistration {
  hasUnsavedChanges: () => boolean;
  clearUnsavedChanges?: () => void;
}

export interface D2EUnsavedChangesRegistry {
  register: (appName: string, api: D2EUnsavedChangesRegistration) => void;
  unregister: (appName: string) => void;
  hasAnyUnsavedChanges: () => boolean;
  getDirtyApps: () => string[];
  clearAll: () => void;
}

declare global {
  interface Window {
    __d2eUnsavedChangesRegistry?: D2EUnsavedChangesRegistry;
  }
}
