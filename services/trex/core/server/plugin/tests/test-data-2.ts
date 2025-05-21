export const plugins = {
  researcher: [
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
};

export const uiPlugins = {
  researcher: [
    {
      enabled: true,
      featureFlag: "anotherPlugin",
      name: "Another Plugin",
      pluginPath: "plugins/Researcher/AnotherPlugin/module",
      requiredRoles: ["RESEARCHER"],
      route: "another-plugin",
    },
  ],
};
export const expected = {
  researcher: [
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
    {
      enabled: true,
      featureFlag: "anotherPlugin",
      name: "Another Plugin",
      pluginPath: "plugins/Researcher/AnotherPlugin/module",
      requiredRoles: ["RESEARCHER"],
      route: "another-plugin",
    },
  ],
};
