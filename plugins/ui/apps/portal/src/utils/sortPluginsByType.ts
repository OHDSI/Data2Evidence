import { Plugins } from "../types";

export const sortPluginsByType = (plugins: Plugins[]): Plugins[] => {
  const sortedPlugins = [] as Plugins[];

  plugins.forEach((item) => {
    const isVisible = item.visible ?? item.enabled;
    if ("visible" in item || "enabled" in item) {
      if (!isVisible) return;
    }

    if (item.type && item.type === "hidden") {
      return;
    }

    if ("children" in item) {
      sortedPlugins.push({ ...item, children: item.children?.filter((x) => x.visible ?? x.enabled) });
    } else {
      sortedPlugins.push(item);
    }
  });

  return sortedPlugins;
};
