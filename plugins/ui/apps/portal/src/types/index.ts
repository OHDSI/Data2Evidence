import { PluginDropdownItem } from "@portal/plugin";
import { LanguageMappings } from "../contexts";

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
export * from "./strategusStudy";
export * from "./code";

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
  nameI18nKey?: keyof LanguageMappings;
  visible?: boolean;
  /** @deprecated Use `visible` instead */
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
  nameI18nKey?: keyof LanguageMappings;
  route: string;
  pluginPath: string;
  featureFlag?: string;
  iconUrl?: string;
  iconSize?: number;
  visible?: boolean;
  /** @deprecated Use `visible` instead */
  enabled?: boolean;
  requiredRoles?: string[];
  type?: string;
  autoMount?: boolean;
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
  descriptionI18nKey?: keyof LanguageMappings;
  notes?: string;
  notesI18nKey?: keyof LanguageMappings;
  children?: IPluginItem[];
}

export interface IPlugin {
  researcher: IPluginItem[];
  systemadmin: IPluginItem[];
  etl: IPluginItem[];
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
  // Opt-in to the new Alert toast (default/undefined renders the legacy Snackbar).
  variant?: "snackbar" | "alert";
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export type CloseDialogType = "success" | "cancelled";

export type AiConfigProvider = "bedrock" | "anthropic" | "openai-compatible";

/** An AI configuration as the portal API returns it. `apiKey` is always the redaction placeholder. */
export interface AiConfig {
  id: number;
  name: string;
  provider: AiConfigProvider;
  model: string;
  baseUrl: string | null;
  region: string | null;
  workspaceId: string | null;
  apiKey: string;
  /** Present (and false) only when the stored key cannot be decrypted with the current key. */
  keyReadable?: false;
  isActive: boolean;
}

/**
 * Body of a create or update. On update only, send the redaction placeholder as `apiKey` to keep the
 * stored key; the backend refuses it on create, and on update when `provider` or `baseUrl` changed.
 */
export interface AiConfigInput {
  name: string;
  provider: AiConfigProvider;
  model: string;
  apiKey: string;
  baseUrl?: string | null;
  region?: string | null;
  workspaceId?: string | null;
}

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
  ETL = "etl",
}

export type PortalType = `${PORTAL_TYPE}`;

export type PluginType = "legacy" | "app";
