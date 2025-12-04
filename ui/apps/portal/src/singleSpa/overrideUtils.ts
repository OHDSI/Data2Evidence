import { PluginApp } from "./types";

// Manual check overrides as SystemJS 0.21.6 doesn't support import maps natively
export function resolveModuleUrl(url: string): string {
  if (window.importMapOverrides) {
    const overrides = window.importMapOverrides.getOverrideMap().imports || {};
    if (overrides[url]) {
      const resolvedUrl = overrides[url];
      console.log(`[Override] ${url} -> ${resolvedUrl}`);
      return resolvedUrl;
    }
  }
  return url;
}

// Creates import map script tag for import-map-overrides UI
export function createImportMapScript(modules: Record<string, string>): void {
  const existing = document.querySelector('script[type="systemjs-importmap"]');
  if (existing) existing.remove();

  const script = document.createElement("script");
  script.type = "systemjs-importmap";
  script.textContent = JSON.stringify({ imports: modules }, null, 2);
  document.head.appendChild(script);
}

// Initialize import map from single-spa apps
export function initializeImportMap(singleSpaApps: PluginApp[]): void {
  if (singleSpaApps.length > 0) {
    const modules: Record<string, string> = {};
    singleSpaApps.forEach((app) => {
      if (app.pluginPath) {
        modules[app.pluginPath] = app.pluginPath;
      }
    });
    createImportMapScript(modules);
  }
}
