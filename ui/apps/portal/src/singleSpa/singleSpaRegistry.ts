import { registerApplication, start } from "single-spa";
import { RegisteredApp, SingleSpaPluginConfig } from "./types";
import { createActivityFunction, generateContainerId } from "./utils";
import { resolveModuleUrl } from "./overrideUtils";

declare global {
  interface Window {
    System: any;
    importMapOverrides?: {
      getOverrideMap: () => { imports?: Record<string, string> };
    };
  }
}

const registeredApps: Map<string, RegisteredApp> = new Map();
const moduleCache: Map<string, Promise<any>> = new Map();

export async function registerSingleSpaApp(
  config: SingleSpaPluginConfig,
  options?: { deferLoad?: boolean }
): Promise<void> {
  if (registeredApps.has(config.id)) {
    console.warn(`[singleSpaRegistry] App ${config.id} is already registered`);
    return;
  }

  console.debug(`[singleSpaRegistry] ${config.id} - register`, { config, options });

  const activeWhen = createActivityFunction(
    config.basePath,
    false // Not always active by default
  );

  const registration = {
    name: config.id,
    app: () => {
      console.debug(`[singleSpaRegistry] ${config.id} - loading module`);

      if (moduleCache.has(config.id)) {
        return moduleCache.get(config.id)!;
      }

      const resolvedUrl = resolveModuleUrl(config.url);
      const modulePromise = window.System.import(resolvedUrl).then((module: any) => {
        console.debug(`[singleSpaRegistry] ${config.id} - module loaded`);
        return module.default || module;
      });

      moduleCache.set(config.id, modulePromise);
      return modulePromise;
    },
    activeWhen,
    customProps: () => ({
      ...config.customProps,
      containerId: generateContainerId(config.id),
    }),
  };

  registerApplication(registration);

  registeredApps.set(config.id, {
    config,
    registration,
    isActive: false,
  });
}

export function startSingleSpa(options?: { urlRerouteOnly?: boolean }): void {
  start(options || { urlRerouteOnly: true });
  console.log("[singleSpaRegistry] Started monitoring URL changes");
}
