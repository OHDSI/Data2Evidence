import { Plugins } from "../types";

export const getPluginChildPathPattern = (plugin: Plugins) => {
  if (plugin.type) {
    const path = plugin.type.replace(/\s+/g, "-").toLowerCase();
    return `${path}/${plugin.route}`;
  } else {
    return `${plugin.route}/*`;
  }
};

export const getPluginChildPath = (plugin: Plugins) => {
  if (plugin.type) {
    const path = plugin.type.replace(/\s+/g, "-").toLowerCase();
    return `${path}/${plugin.route}`;
  } else {
    return plugin.route;
  }
};
