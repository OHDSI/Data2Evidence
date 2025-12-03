import { Plugins } from "../types";

export const sortPluginsByType = (plugins: Plugins[]): Plugins[] => {
  const sortedPlugins = [] as Plugins[];

  plugins.forEach((item) => {
    if ("enabled" in item && !item.enabled) {
      return;
    }

    if (item.type && item.type === "hidden") {
      return;
    }

    if ("children" in item) {
      sortedPlugins.push({ ...item, children: item.children?.filter((x) => x.enabled) });
    } else {
      sortedPlugins.push(item);
    }
  });

  return sortedPlugins;
};
