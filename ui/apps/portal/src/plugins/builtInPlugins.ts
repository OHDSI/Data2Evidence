const moduleNames = [
  "mri/CDM",
  "mri/PatientAnalyticsConfig",
  "mri/PatientAnalytics",
  "mri/PatientSummaryConfig",
  "mri/Search",
  "Researcher/ConceptSets",
  "Researcher/KaplanMeier",
  "SystemAdmin/Nifi",
  "SystemAdmin/StudyOverview",
  "SystemAdmin/UserOverview",
  "SystemAdmin/NifiRegistry",
  "SystemAdmin/Sqleditor",
  "SystemAdmin/DQD",
  "SystemAdmin/Jobs",
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
