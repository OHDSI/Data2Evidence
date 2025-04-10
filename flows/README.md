# D2E Flows

[![Docker Build](https://github.com/data2evidence/d2e-flows/actions/workflows/docker-build-push.yaml/badge.svg)](https://github.com/data2evidence/d2e-flows/actions/workflows/docker-build-push.yaml) &nbsp;&nbsp; [![build plugin](https://github.com/data2evidence/d2e-flows/actions/workflows/plugin-ci.yml/badge.svg)](https://github.com/data2evidence/d2e-flows/actions/workflows/plugin-ci.yml)

## Local Development Setup

1. Start a python virtual environment using your prefered tool e.g if using venv
    ```
    python -m venv venv
    source venv/bin/activate
    ```
2. Install development packages from `requirements-dev.txt`. These are required to generate the `pacakge.json` for each flow plugin and the openapi spec for the flows.
    ```
    pip install --upgrade requirements-dev.txt
    ```

3. (Optional) If working with flow plugins in base folder, create a [Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic) with **no scopes** to avoid rate limiting with downloading the OHDSI packages https://ohdsi.github.io/Hades/rSetup.html | section GitHub Personal Access Token. Export PAT as env 
    ```
    export GITHUB_PAT=<GITHUB_PAT>
    ```

## Developing a new flow
### Develop a new flow with a new folder
1. Create a subfolder in `flows` with its own `Dockerfile`, `__init__.py`, and `requirements.txt`.
2. After developing flow, cd to `flows` and run the command below to generate a package.json in the root of that subfolder. Package name and entrypoint are compulsory arguments. This will modify the package.json in the subfolder.
    - package_name: Any package.json name of choice e.g.`d2e-flows`
    - entrypoint: Flow entry point e.g. `path/to/flow.py:function`
    - plugin_type: Plugin type. Use 'datamodel' if plugin is a datamodel.
    - -dm: Optional comma separated list of datamodels e.g. `datamodel1,datamodel2`
    ```
    python flowinit.py --help
    python flowinit.py [package_name] [entrypoint] [plugin_type] [-dm]
    ```
3. Mount the updated package.json to `trex` in `docker-compose-local.yml`and set `PLUGINS_SEED_UPDATE` to true.
    ```
    volumes:
        - ./flows/base/package.json:/usr/src/plugins/d2e-flows/package.json

    PLUGINS_SEED_UPDATE: true
    ```
4. Navigate to subfolder and run `yarn build` to build the image locally. The image will have the local tag. 
5. Restart trex. In the Admin Portal, navigate to jobs. The deployment should be listed with the flow name.
6. To run the flow locally, edit the deployment and change the image to the local image.
7. Add Dockerfile to Github Actions to test build.
    - .github/workflows/flows-docker-build-push.yaml
    - .github/workflows/flows-plugin-ci.yml

### Develop a new flow in an existing folder
1. After developing flow, cd to `flows` and run the command below. Package name and entrypoint are compulsory arguments.  This will modify the package.json in the subfolder. If there is an existing `package.json`, the name will not be overwritten.
    - package_name: Any package.json name of choice e.g.`d2e-flows`
    - entrypoint: Flow entry point e.g. `path/to/flow.py:function`
    - plugin_type: Plugin type. Use 'datamodel' if plugin is a datamodel.
    - -dm: Optional comma separated list of datamodels e.g. `datamodel1,datamodel2`
    ```
    python flowinit.py --help
    python flowinit.py [package_name] [entrypoint] [plugin_type] [-dm]
    ```
2. Mount the updated package.json to `trex` in `docker-compose-local.yml`and set `PLUGINS_SEED_UPDATE` to true.
    ```
    volumes:
        - ./flows/base/package.json:/usr/src/plugins/d2e-flows/package.json

    PLUGINS_SEED_UPDATE: true
    ```
3. Navigate to subfolder   and run `yarn build` to build the image locally. The image will have the local tag. 
4. Restart trex. In the Admin Portal, navigate to jobs. The deployment should be listed with the flow name.
5. To run the flow locally, edit the deployment and change the image to the local image.

## Modifying an existing flow
### Modify flow parameters
1. After modifying flow, cd to `flows` and run the command below. Package name and entrypoint are compulsory arguments. This will modify the package.json in the subfolder. If there is an existing `package.json`, the name will not be overwritten.
    - package_name: Any package.json name of choice e.g.`d2e-flows`
    - entrypoint: Flow entry point e.g. `path/to/flow.py:function`
    - plugin_type: Plugin type. Use 'datamodel' if plugin is a datamodel.
    - -dm: Optional comma separated list of datamodels e.g. `datamodel1,datamodel2`
    ```
    python flowinit.py --help
    python flowinit.py [package_name] [entrypoint] [plugin_type] [-dm]
    ```
2. Mount the updated package.json to `trex` in `docker-compose-local.yml`and set `PLUGINS_SEED_UPDATE` to true.
    ```
    volumes:
        - ./flows/base/package.json:/usr/src/plugins/d2e-flows/package.json

    PLUGINS_SEED_UPDATE: true
    ```
3. Navigate to subfolder and run `yarn build` to build the image locally. The image will have the local tag.
4. Restart trex. In the Admin Portal, navigate to jobs. The deployment should be listed with the flow name. Check the updated parameters in Run > Quick Run.
5. To run the flow locally, edit the deployment and change the image to the local image.


### Modify code
1. Navigate to subfolder and run `yarn build` to build the image locally. The image will have the local tag.
2. In the Admin Portal, navigate to jobs. The deployment should be listed with the flow name.
3. To run the flow locally, edit the deployment and change the image to the local image.


## Pointing to the Prefect server on local
1. Prefect server container must be running
2. Create a new prefect profile
    ```
    prefect profile create test
    prefect profile use test
    ```
3. Run `prefect config set PREFECT_API_URL='http://localhost:41120/api'` to point to Prefect server 
4. Run `prefect --help` to see all commands