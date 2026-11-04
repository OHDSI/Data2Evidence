const moduleNames = [
  "mri/CDM",
  "mri/PatientAnalyticsConfig",
  "mri/Search",
  "Researcher/KaplanMeier",
  "Researcher/ShinyLive",
  "SystemAdmin/StudyOverview",
  "SystemAdmin/UserOverview",
  "SystemAdmin/DQD",
  "SystemAdmin/Jobs",
  "SystemAdmin/Athena",
  "SystemAdmin/FlowOverview",
  "SystemAdmin/StudyPage",
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
  "Setup/MigrateUserArtifacts",
  "Setup/HybridSearch",
  "Setup/GitConfig",
];

const moduleLoaders = import.meta.glob("./**/module.{ts,tsx}");

const modulePaths = moduleNames.reduce<{ [path: string]: any }>((acc, moduleName) => {
  const loader =
    moduleLoaders[`./${moduleName}/module.ts`] ?? moduleLoaders[`./${moduleName}/module.tsx`];
  if (loader) {
    acc[`plugins/${moduleName}/module`] = loader;
  }
  return acc;
}, {});

const builtInPlugins: { [path: string]: any } = {
  ...modulePaths,
};

export default builtInPlugins;
