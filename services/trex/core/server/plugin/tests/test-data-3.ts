export const plugins = {
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
};

export const uiPlugins = {
  researcher: [
    {
      route: "analysis_parent",
      children: [
        {
          enabled: true,
          featureFlag: "cohortSurvival",
          name: "Cohort Survival",
          pluginPath: "plugins/Researcher/CohortSurvival/module",
          requiredRoles: ["RESEARCHER"],
          route: "cohort-survival",
        },
      ],
    },
  ],
};
export const expected = {
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
        {
          enabled: true,
          featureFlag: "cohortSurvival",
          name: "Cohort Survival",
          pluginPath: "plugins/Researcher/CohortSurvival/module",
          requiredRoles: ["RESEARCHER"],
          route: "cohort-survival",
        },
      ],
      requiredRoles: ["RESEARCHER"],
    },
  ],
};
