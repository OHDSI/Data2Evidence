const moduleNames = [
  "mri/CDM",
  "mri/PatientAnalyticsConfig",
  "mri/PatientAnalytics",
  "mri/Search",
  "Researcher/ConceptSets",
  "Researcher/KaplanMeier",
  "SystemAdmin/Nifi",
  "SystemAdmin/StudyOverview",
  "SystemAdmin/UserOverview",
  "SystemAdmin/NifiRegistry",
  "SystemAdmin/DQD",
  "SystemAdmin/Jobs",
  "SystemAdmin/AiModels",
  "SystemAdmin/Terminology",
  "SystemAdmin/Athena",
  "SystemAdmin/FlowOverview",
  "SystemAdmin/ConceptMapping",
  "Starboard",
  "Cohort",
  "Admin/Permissions",
  "Admin/Configuration",
  "Setup",
  "Setup/AzureAD",
  "Setup/Metadata",
  "Setup/Feature",
  "Setup/Db",
  "Setup/OverviewDescription",
  "Setup/TrexPlugins",
  "Setup/DemoSetup",
  "Setup/HybridSearch",
  "Setup/GitConfig",
];

const modulePaths = moduleNames.reduce(
  (acc, moduleName) => ({
    ...acc,
    [`plugins/${moduleName}/module`]: async () => await import(`./${moduleName}/module`),
  }),
  {}
);

const builtInPlugins: { [path: string]: any } = {
  ...modulePaths,
};

export default builtInPlugins;
