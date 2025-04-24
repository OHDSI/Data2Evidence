# D2E UI

## Inital set up

- Prepare your own Github Personal Access Token (classic).
- Ensure that it has `read:packages` scope. See [here](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages)
- Create an environment variable in `.zshrc`

```
export GITHUB_TOKEN=<GITHUB_PERSONAL_ACCESS_TOKEN>
```

- Run `source ~/.zshrc` to refresh `.zshrc` file.
- Run `yarn` at the root to install node-modules

## Portal (apps/portal)

### Local development setup

- Copy contents of `.env.example` to a new `.env` file in the `/apps/portal` directory
- Run `nx build vue-mri` to build patient analytics used by portal
- Run `nx build jobs` to build log viewer used by jobs plugin in portal
- Run `nx build mapping` to build mapping used by ETL plugin in portal
- Run `nx build @portal/plugin` to build libs used by portal
- Run `nx build @portal/components` to build components used by portal
- Run `nx start portal` to start portal, and visit `https://localhost:4000/portal`

## Patient Analytics (apps/vue-mri-ui-lib)

### Local development setup

- For developing Patient Analytics, run `nx serve vue-mri`, and visit `https://localhost:8081`

Note:

- When accessing via `https://localhost:41100/portal`, the PA UI files is served from CDN (DEV)
- When accessing via `https://localhost:4000/portal`, the PA UI files is served from local built-files under `resources/mri`

- For developing log viewer, run `nx dev jobs`, and visit `https://localhost:5173/`

## PYQE / Starboard Notebookpsave

### Local development setup for testing new PYQE package

- Create a new folder named `starboard-notebook-base` in `resources`
- Ensure node modules are installed
- Copy contents of `node_modules/@alp-os/alp-starboard-notebook/packages/starboard-notebook/dist` to `resources/starboard-notebook-base`
- Copy newly created PYQE package to `resources/starboard-notebook-base`

## Plugins

For remote plugin, refer to [this](./plugins/README.md)

For built-in plugin, refer to [this](./apps/portal/src/plugins/README.md)

### Plugins Troubleshooting

- If nx commands do not seem to be working, try `nx clear-cache` and rerun nx commands.

## Testing full UI build

Attaching directly to the `/resources` folder does not work some times, when the ui npm module loads after startup and overwrites the contents. Hence we attach the files to another folder, then copy them when needed.

```bash
cd ui
# The local .env will replace values during portal build
mv ./apps/portal/.env ./apps/portal/.env-temp && yarn build-all && mv ./apps/portal/.env-temp ./apps/portal/.env
```

Uncomment

```bash
# docker-compose-local.yml
- ./ui/resources:/usr/src/local-resources # For local ui development only

yarn start:minerva
```

Attach shell to trex container

```bash
mv /usr/src/data/plugins/node_modules/\@data2evidence/d2e-ui/resources /usr/src/data/plugins/node_modules/\@data2evidence/d2e-ui/resources-backup
rm -r /usr/src/data/plugins/node_modules/\@data2evidence/d2e-ui/resources
cp -r /usr/src/local-resources /usr/src/data/plugins/node_modules/\@data2evidence/d2e-ui/resources
```

Access latest built files on localhost:41100
