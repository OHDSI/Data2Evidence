import { PluginDropdownItem } from "@portal/plugin";

export * from "./auth";
export * from "./study";
export * from "./user";
export * from "./systemApp";
export * from "./tenant";
export * from "./feature";
export * from "./cohort";
export * from "./system";
export * from "./paConfig";
export * from "./flow";
export * from "./dbCredentials";
export * from "./config";
export * from "./trex";
export * from "./demo";

export interface NavLink {
  id: string;
  path: string;
  title: string;
  subpaths?: string[];
  submenu?: NavLink[];
}

export interface Plugins {
  iconUrl?: string;
  iconSize?: number;
  name: string;
  enabled?: boolean;
  route: string;
  pluginPath: string;
  type?: string;
  children?: Plugins[];
  subMenus?: boolean;
  data?: any;
  iframe?: boolean;
  iframeUrlEnv?: string;
  requiredRoles?: string[];
  featureFlag?: string;
  menus?: string[];
}

export interface PluginDropdown {
  [pluginName: string]: PluginDropdownItem[];
}

export interface IPluginItem {
  name: string;
  route: string;
  pluginPath: string;
  featureFlag?: string;
  iconUrl?: string;
  iconSize?: number;
  enabled?: boolean;
  requiredRoles?: string[];
  type?: string;
  proxySource?: string;
  proxyDestination?: string;
  proxyTarget?: string;
  proxyTimeout?: number;
  subMenus?: boolean;
  subFeatureFlags?: string[];
  data?: any;
  iframe?: boolean;
  iframeUrlEnv?: string;
  description?: string;
  notes?: string;
  children?: IPluginItem[];
}

export interface IPlugin {
  researcher: IPluginItem[];
  systemadmin: IPluginItem[];
  setup: IPluginItem[];
}

export type UsefulEvent = Event & {
  detail: number;
  target: {
    dataset: {
      to: string;
    };
    label: string;
    name: string;
    value: string;
    type: string;
    checked: boolean;
    className: string;
    tagName: string;
  };
};

export interface DeleteMutationResponse {
  code: string;
  id: string;
  success: boolean;
  message?: string;
}

export interface Feedback {
  type?: "error" | "success";
  message?: string;
  description?: string;
  autoClose?: number;
}

export type CloseDialogType = "success" | "cancelled";

export interface LocationState {
  studyId: string;
  tab: string;
  subTab?: string;
  tenantId: string;
  configTab?: string;
}

export interface AppError {
  message: string;
}

declare global {
  interface Window {
    API: any;
    loadPyodide: (options: {
      indexURL?: string;
      homedir?: string;
      fullStdLib?: boolean;
      stdin?: () => string;
      stdout?: (msg: string) => void;
      stderr?: (msg: string) => void;
      jsglobals?: object;
    }) => {};
    _createPyodideModule: (Module: any) => Promise<void>;
    pyodide: any;
  }
}

export interface ConfigItem {
  code: string;
  value: string;
}

export enum PORTAL_TYPE {
  RESEARCHER = "researcher",
  SYSTEM_ADMIN = "system_admin",
}

export type PortalType = `${PORTAL_TYPE}`;
