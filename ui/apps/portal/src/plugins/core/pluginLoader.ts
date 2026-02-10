import React from "react";
import ReactDOM from "react-dom";
import * as ReactRouterDOM from "react-router-dom";
import * as EmotionReact from "@emotion/react";
import builtInPlugins from "../builtInPlugins";
import { isSingleSpaApp, resolveModuleUrl } from "../../singleSpa";
import { PluginType } from "../../types";

//@ts-ignore
import SystemJS from "systemjs/dist/system-production";

function exposeToPlugin(name: string, component: any) {
  SystemJS.registerDynamic(name, [], true, (_require: any, _exports: any, module: { exports: any }) => {
    module.exports = component;
  });
}

exposeToPlugin("react", React);
exposeToPlugin("react-dom", ReactDOM);
exposeToPlugin("react-router-dom", ReactRouterDOM);
exposeToPlugin("@emotion/react", EmotionReact);

const moduleCache: { [key: string]: any } = {};

/**
 * Import a plugin module (legacy format)
 * This is the original function for backward compatibility with legacy plugin renderers
 * @deprecated Use loadPlugin() for new code - it auto-detects plugin type
 */
export const importPluginModule = async (url: string): Promise<any> => {
  const builtIn = builtInPlugins[url];
  if (typeof builtIn === "function") {
    const module = await builtIn();
    return module.plugin;
  }

  const cached = moduleCache[url];
  if (cached) {
    return cached;
  }

  const maxRetries = 3;
  const retryDelay = 10000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const pluginModule = await SystemJS.import(url);
      const plugin = pluginModule.plugin || pluginModule.default.plugin;
      if (plugin) {
        moduleCache[url] = plugin;
        return plugin;
      } else {
        throw new Error(`Missing export: plugin in ${url}`);
      }
    } catch (error) {
      if (attempt < maxRetries) {
        console.warn(
          `[PluginLoader] ${url} - import failed, retrying in ${retryDelay / 1000}s (attempt ${
            attempt + 1
          }/${maxRetries})...`,
          error
        );
        try {
          SystemJS.delete(url);
        } catch (_e) {
          /* ignore */
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        console.error(`[PluginLoader] ${url} - import failed after ${maxRetries} retries`, error);
        throw error;
      }
    }
  }
};

/**
 * Enhanced plugin loading that detects and handles both types
 * @param url - URL to load from
 * @param expectedType - Expected plugin type ('legacy' | 'app' | 'auto')
 * @returns Loaded module
 */
export const loadPlugin = async (
  url: string,
  expectedType: PluginType | "auto" = "auto"
): Promise<{ module: any; type: PluginType }> => {
  console.debug(`[PluginLoader] Loading plugin from: ${url} (expected type: ${expectedType})`);

  try {
    // Check built-in plugins first
    const builtIn = builtInPlugins[url];
    if (typeof builtIn === "function") {
      const module = await builtIn();
      return {
        module: module.plugin,
        type: "legacy",
      };
    }

    // Check cache
    const cached = moduleCache[url];
    if (cached) {
      const type = isSingleSpaApp(cached) ? "app" : "legacy";
      return { module: cached, type };
    }

    let loadedModule;
    const resolvedUrl = resolveModuleUrl(url);
    const maxRetries = 3;
    const retryDelay = 10000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        loadedModule = await SystemJS.import(resolvedUrl);
        break;
      } catch (error: any) {
        if (attempt < maxRetries) {
          console.warn(
            `[PluginLoader] ${url} - import failed, retrying in ${retryDelay / 1000}s (attempt ${
              attempt + 1
            }/${maxRetries})...`,
            error
          );
          try {
            SystemJS.delete(resolvedUrl);
          } catch (_e) {
            /* ignore */
          }
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } else {
          console.error(`[PluginLoader] ${url} - import failed after ${maxRetries} retries`, error);
          throw error;
        }
      }
    }

    // Auto-detect type if not specified
    if (expectedType === "auto") {
      if (isSingleSpaApp(loadedModule) || isSingleSpaApp(loadedModule.default)) {
        const app = loadedModule.default || loadedModule;
        moduleCache[url] = app;
        return { module: app, type: "app" };
      } else {
        // Legacy plugin
        const plugin = loadedModule.plugin || loadedModule.default?.plugin;
        if (!plugin) {
          throw new Error(`Module at ${url} is missing 'plugin' export (legacy format)`);
        }
        moduleCache[url] = plugin;
        return { module: plugin, type: "legacy" };
      }
    }

    // Use specified type
    if (expectedType === "app") {
      const app = loadedModule.default || loadedModule;
      if (!isSingleSpaApp(app)) {
        throw new Error(`Module at ${url} is not a valid single-spa application`);
      }
      moduleCache[url] = app;
      return { module: app, type: "app" };
    } else {
      // Legacy
      const plugin = loadedModule.plugin || loadedModule.default?.plugin;
      if (!plugin) {
        throw new Error(`Module at ${url} is missing 'plugin' export`);
      }
      moduleCache[url] = plugin;
      return { module: plugin, type: "legacy" };
    }
  } catch (error) {
    console.error(`[PluginLoader] Failed to load plugin from ${url}:`, error);
    throw error;
  }
};
