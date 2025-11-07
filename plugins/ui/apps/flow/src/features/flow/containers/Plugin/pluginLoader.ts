const moduleCache: { [key: string]: any } = {};

export const importPluginModule = (url: string): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    const cached = moduleCache[url];
    if (cached) {
      resolve(cached);
      return;
    }

    // SystemJS already exists in the sub remote plugin scope
    // @ts-ignore
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
