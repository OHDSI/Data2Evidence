import { AppLifecycles } from "./types";

export function isSingleSpaApp(module: any): module is AppLifecycles {
  return (
    module &&
    typeof module.bootstrap === "function" &&
    typeof module.mount === "function" &&
    typeof module.unmount === "function"
  );
}

export function createActivityFunction(basePath: string, alwaysActive?: boolean): (location: Location) => boolean {
  return (location: Location) => {
    if (alwaysActive) {
      return true;
    }

    return location.pathname === basePath || location.pathname.startsWith(basePath + "/");
  };
}

export function generateContainerId(appName: string): string {
  return `single-spa-application:${appName}`;
}
