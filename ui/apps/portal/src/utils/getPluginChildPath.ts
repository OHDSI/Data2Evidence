import { Plugins } from "../types";

export const getPluginChildPathPattern = (plugin: Plugins) => {
  if (plugin.type && plugin.type !== "app" && plugin.type !== "legacy") {
    const path = plugin.type.replace(/\s+/g, "-").toLowerCase();
    return `${path}/${plugin.route}`;
  } else {
    return `${plugin.route}/*`;
  }
};

export const getPluginChildPath = (plugin: Plugins) => {
  if (plugin.type && plugin.type !== "app" && plugin.type !== "legacy") {
    const path = plugin.type.replace(/\s+/g, "-").toLowerCase();
    return `${path}/${plugin.route}`;
  } else {
    return plugin.route;
  }
};
