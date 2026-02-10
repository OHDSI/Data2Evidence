import {
  registerApplication,
  start,
  unregisterApplication,
  getAppStatus,
  MOUNTED,
  NOT_LOADED,
  NOT_MOUNTED,
} from "single-spa";
import { RegisteredApp, SingleSpaPluginConfig } from "./types";
import { createActivityFunction, generateContainerId } from "./utils";
import { resolveModuleUrl } from "./overrideUtils";

const registeredApps: Map<string, RegisteredApp> = new Map();
const moduleCache: Map<string, Promise<any>> = new Map();
const propsStore: Map<string, Record<string, any>> = new Map();

export async function registerSingleSpaApp(config: SingleSpaPluginConfig): Promise<void> {
  if (registeredApps.has(config.id)) {
    console.warn(`[singleSpaRegistry] App ${config.id} is already registered`);
    return;
  }

  console.debug(`[singleSpaRegistry] ${config.id} - register`, { config });

  const initialProps = config.customProps || {};
  const activeWhen = createActivityFunction(config.basePath, config.customProps?.autoMount);

  propsStore.set(config.id, initialProps);

  const registration = {
    name: config.id,
    app: () => {
      console.debug(`[singleSpaRegistry] ${config.id} - loading module`);

      if (moduleCache.has(config.id)) {
        return moduleCache.get(config.id)!;
      }

      const resolvedUrl = resolveModuleUrl(config.url);
      const maxRetries = 3;
      const retryDelay = 10000;

      const importWithRetry = async (): Promise<any> => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const module = await window.System.import(resolvedUrl);
            console.debug(`[singleSpaRegistry] ${config.id} - module loaded`);
            return module.default || module;
          } catch (error) {
            if (attempt < maxRetries) {
              console.warn(
                `[singleSpaRegistry] ${config.id} - import failed, retrying in ${retryDelay / 1000}s (attempt ${
                  attempt + 1
                }/${maxRetries})...`,
                error
              );
              try {
                window.System.delete(resolvedUrl);
              } catch (_e) {
                /* ignore */
              }
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
            } else {
              console.error(`[singleSpaRegistry] ${config.id} - import failed after ${maxRetries} retries`, error);
              throw error;
            }
          }
        }
      };

      const modulePromise = importWithRetry().catch((error) => {
        moduleCache.delete(config.id);
        throw error;
      });

      moduleCache.set(config.id, modulePromise);
      return modulePromise;
    },
    activeWhen,
    customProps: () => ({
      ...propsStore.get(config.id),
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

export function updateCustomProps(appId: string, customProps: Record<string, any>): void {
  if (!registeredApps.has(appId)) {
    console.warn(`[singleSpaRegistry] Cannot update props for unregistered app: ${appId}`);
    return;
  }

  console.debug(`[singleSpaRegistry] ${appId} - updating custom props`, customProps);

  const currentProps = propsStore.get(appId) || {};
  propsStore.set(appId, { ...currentProps, ...customProps });

  window.dispatchEvent(
    new CustomEvent("custom-props-changed", {
      detail: { appId, ...customProps },
    })
  );
}

export function startSingleSpa(options?: { urlRerouteOnly?: boolean }): void {
  start(options || { urlRerouteOnly: true });
  console.log("[singleSpaRegistry] Started monitoring URL changes");
}

export async function unloadSingleSpaApp(appId: string): Promise<void> {
  if (!registeredApps.has(appId)) {
    console.debug(`[singleSpaRegistry] App ${appId} is not registered, skipping unload`);
    return;
  }

  const status = getAppStatus(appId);
  console.debug(`[singleSpaRegistry] ${appId} - unregistering, current status: ${status}`);

  try {
    if (status === MOUNTED || status === NOT_MOUNTED || status === NOT_LOADED) {
      await unregisterApplication(appId);
      console.debug(`[singleSpaRegistry] ${appId} - unregistered successfully`);
    }

    registeredApps.delete(appId);
    moduleCache.delete(appId);
    propsStore.delete(appId);
  } catch (error) {
    console.error(`[singleSpaRegistry] Failed to unregister app ${appId}:`, error);
  }
}
