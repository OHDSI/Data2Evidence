import React from "react";
import ReactDOM from "react-dom";

//@ts-ignore
import SystemJS from "systemjs/dist/system-production";

function exposeToPlugin(name: string, component: any) {
  SystemJS.registerDynamic(
    name,
    [],
    true,
    (require: any, exports: any, module: { exports: any }) => {
      module.exports = component;
    }
  );
}

exposeToPlugin("react", React);
exposeToPlugin("react-dom", ReactDOM);

const moduleCache: { [key: string]: any } = {};

export const importPluginModule = (url: string): Promise<any> => {
  return new Promise(async (resolve, reject) => {
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
