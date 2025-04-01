# Dataflow UI

To develop locally, these are the following steps:

- Run `yarn nx start:plugin flow` in alp-ui, this will serve module.js in https://localhost:4900/
- In `.env` file, update `pluginPath` to `https://localhost:4900/module.js` in `REACT_APP_PLUGINS` for Dataflow.
- Run `yarn nx start portal` in alp-ui for running Portal locally.
- Open https://localhost:4000 to access Portal and navigate to Admin portal to access Dataflow
