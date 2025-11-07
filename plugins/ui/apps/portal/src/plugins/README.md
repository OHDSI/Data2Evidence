# Built-in Portal Plugin

## Choose the right plugin type to be develop:

Type of plugins:

- ResearcherStudyPlugin
  sample boilerplate code: ./boilerplates/ResearcherStudy
- SystemAdminPagePlugin
  sample boilerplate code: ./boilerplates/SystemAdminPage

## Steps to create built-in plugin:

- Identify the type of plugin to be developed
- For below example, we will be creating researcher study plugin
- Copy `ResearcherStudy` folder in `apps/portal/src/plugins/boilerplates` to `apps/portal/src/plugins`.
- Rename the folder name, file name and variables to your new plugin name. E.g. `ResearcherStudy` to `NewPlugin`.
- Update `builtInPlugins.ts` in `apps/portal/src/plugins` to add your new plugin in the moduleNames.
- Update `SHARED__PLUGINS_JSON` in the `.env.cs.local`, `.env.cs.remote` and `.env.cs.example`:
  ```
  {
    "researcher": [
      ...
      {
        "name": "NewPlugin",
        "route": "new-plugin",
        "pluginPath": "plugins/NewPlugin/module",
        "featureFlag": "new-plugin",
        "iconUrl": "icons/new-plugin.svg",
        "iconSize": 24,
        "requiredRoles": [
          "RESEARCHER"
        ]
        ...
      }
    ]
  }
  ```
- Update `REACT_APP_PLUGINS` in the `.env` and `.env.example` in `alp-ui/apps/portal` folder without carriage-return.
- Run `yarn nx start portal` in `alp-ui` folder.
- Enable feature flag in Super Admin portal -> "Tenant overview".
- Go to Researcher portal -> "Dataset" to view the plugin.
