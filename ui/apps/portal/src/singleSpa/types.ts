import { LifeCycles, RegisterApplicationConfig } from "single-spa";

export interface SingleSpaPluginConfig {
  id: string;
  name: string;
  basePath: string;
  url: string;
  customProps?: Record<string, any>;
}

export interface AppLifecycles extends LifeCycles<any> {
  bootstrap: (props: any) => Promise<void>;
  mount: (props: any) => Promise<void>;
  unmount: (props: any) => Promise<void>;
}

export interface RegisteredApp {
  config: SingleSpaPluginConfig;
  registration: RegisterApplicationConfig<any>;
  isActive: boolean;
}

export interface PluginApp {
  pluginPath?: string;
  [key: string]: any;
}
