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
1. Create a folder in `flows` with its own `Dockerfile`, `__init__.py`, and `requirements.txt`.
2. After developing flow, cd to `flows` and run script to generate a package.json in folder. Package name and entrypoint are compulsory arguments.
    - package_name: package.json name e.g.`d2e-flows`
    - entrypoint: Flow entry point e.g. `path/to/flow.py:function`
    - plugin_type: Plugin type. Use 'datamodel' if plugin is a datamodel.
    - -dm: Optional comma separated list of datamodels e.g. `datamodel1,datamodel2`
    ```
    python flowinit.py --help
    python flowinit.py [package_name] [entrypoint] [plugin_type] [-dm]
    ```
3. Mount flow folder to `trex` in `docker-compose-local.yml`
    ```
    volumes:
        - ./flows/testflow:/usr/src/plugins/d2e-flows/testflow
    ```
4. Restart trex
5. Build local image in flows folder with `yarn build`
6. In jobs portal, edit deployment and change image name.
7. Run flow from jobs portal.
8. Add flow to GHA

### Develop a new flow in an existing folder
1. After developing flow, cd to `flows` and modify existing `package.json` in folder by running script. Package name and entrypoint are compulsory arguments. If there is an existing `package.json`, the name will not be overwritten.
    - package_name: package.json name e.g.`d2e-flows`
    - entrypoint: Flow entry point e.g. `path/to/flow.py:function`
    - plugin_type: Plugin type. Use 'datamodel' if plugin is a datamodel.
    - -dm: Optional comma separated list of datamodels e.g. `datamodel1,datamodel2`
    ```
    python flowinit.py --help
    python flowinit.py [package_name] [entrypoint] [plugin_type] [-dm]
    ```
2. Mount flow folder to `trex` in `docker-compose-local.yml`
    ```
    volumes:
        - ./flows/testflow:/usr/src/plugins/d2e-flows/testflow
    ```
3. Restart trex
4. Build local image in flows folder with `yarn build`. Image should have the local tag.
5. In jobs portal, edit deployment and change image name.
6. Run flow from jobs portal.

## Modifying an existing flow
### Modify flow parameters
1. After developing flow, cd to `flows` and modify existing `package.json` in folder by running script. Package name and entrypoint are compulsory arguments. If there is an existing `package.json`, the name will not be overwritten.
    - package_name: package.json name e.g.`d2e-flows`
    - entrypoint: Flow entry point e.g. `path/to/flow.py:function`
    - plugin_type: Plugin type. Use 'datamodel' if plugin is a datamodel.
    - -dm: Optional comma separated list of datamodels e.g. `datamodel1,datamodel2`
    ```
    python flowinit.py --help
    python flowinit.py [package_name] [entrypoint] [plugin_type] [-dm]
    ```
2. Mount flow folder to `trex` in `docker-compose-local.yml`
    ```
    volumes:
        - ./flows/testflow:/usr/src/plugins/d2e-flows/testflow
    ```
3. Restart trex
4. Build local image in flows folder with `yarn build`. Image should have the local tag.
5. In jobs portal, edit deployment and change image name.
6. Run flow from jobs portal.

### Modify code
1. Build local image in flows folder with `yarn build`. Image should have the local tag.
2. In jobs portal, edit deployment and change image name.
3. Run flow from jobs portal.


## Pointing to the Prefect server on local
1. Prefect server container must be running
2. Create a new prefect profile
    ```
    prefect profile create test
    prefect profile use test
    ```
3. Run `prefect config set PREFECT_API_URL='http://localhost:41120/api'` to point to Prefect server 
4. Run `prefect --help` to see all commands