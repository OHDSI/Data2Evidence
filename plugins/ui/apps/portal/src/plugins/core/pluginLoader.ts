import React from "react";
import ReactDOM from "react-dom";
import * as ReactRouterDOM from "react-router-dom";
import * as EmotionReact from "@emotion/react";
import * as D2EStarboardWrap from "@data2evidence/d2e-starboard-wrap";
import builtInPlugins from "../builtInPlugins";

//@ts-ignore
import SystemJS from "systemjs/dist/system-production";

function exposeToPlugin(name: string, component: any) {
  SystemJS.registerDynamic(name, [], true, (require: any, exports: any, module: { exports: any }) => {
    module.exports = component;
  });
}

exposeToPlugin("react", React);
exposeToPlugin("react-dom", ReactDOM);
exposeToPlugin("react-router-dom", ReactRouterDOM);
exposeToPlugin("@emotion/react", EmotionReact);
exposeToPlugin("@data2evidence/d2e-starboard-wrap", D2EStarboardWrap);

const moduleCache: { [key: string]: any } = {};

export const importPluginModule = (url: string): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    const builtIn = builtInPlugins[url];
    if (typeof builtIn === "function") {
      const module = await builtIn();
      resolve(module.plugin);
      return;
    }

    const cached = moduleCache[url];
    if (cached) {
      resolve(cached);
      return;
    }

    SystemJS.import(url)
      .then((pluginModule: any) => {
        const plugin = pluginModule.plugin || pluginModule.default.plugin;
        if (plugin) {
          moduleCache[url] = plugin;
          resolve(plugin);
        } else {
          reject("Missing export: plugin");
          console.log("pluginModule", pluginModule);
        }
      })
      .catch((err: any) => {
        console.warn("Error loading plugin: ", module, err);
      });
  });
};
