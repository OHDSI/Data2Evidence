export const plugins = {};
export const uiPlugins = {
  setup: [
    {
      name: "Databases",
      notes: "",
      route: "db",
      enabled: true,
      pluginPath: "plugins/Setup/Db/module",
      description: "Database connection and credentials",
    },
  ],
  researcher: [
    {
      name: "Notebooks",
      route: "starboard",
      enabled: true,
      subMenus: "true",
      pluginPath: "plugins/Starboard/module",
      featureFlag: "starboard",
      requiredRoles: ["RESEARCHER"],
    },
    {
      name: "Analysis",
      route: "analysis_parent",
      enabled: true,
      children: [
        {
          name: "Strategus",
          route: "analysis",
          enabled: false,
          pluginPath: "https://localhost:41100/analysis/module.js",
          featureFlag: "strategus",
          requiredRoles: ["RESEARCHER"],
        },
      ],
      requiredRoles: ["RESEARCHER"],
    },
  ],
  systemadmin: [
    {
      name: "Setup",
      route: "setup",
      enabled: true,
      pluginPath: "plugins/Setup/module",
    },
  ],
};

export const expected = {
  setup: [
    {
      name: "Databases",
      notes: "",
      route: "db",
      enabled: true,
      pluginPath: "plugins/Setup/Db/module",
      description: "Database connection and credentials",
    },
  ],
  researcher: [
    {
      name: "Notebooks",
      route: "starboard",
      enabled: true,
      subMenus: "true",
      pluginPath: "plugins/Starboard/module",
      featureFlag: "starboard",
      requiredRoles: ["RESEARCHER"],
    },
    {
      name: "Analysis",
      route: "analysis_parent",
      enabled: true,
      children: [
        {
          name: "Strategus",
          route: "analysis",
          enabled: false,
          pluginPath: "https://localhost:41100/analysis/module.js",
          featureFlag: "strategus",
          requiredRoles: ["RESEARCHER"],
        },
      ],
      requiredRoles: ["RESEARCHER"],
    },
  ],
  systemadmin: [
    {
      name: "Setup",
      route: "setup",
      enabled: true,
      pluginPath: "plugins/Setup/module",
    },
  ],
};
