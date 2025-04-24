# D2E Plugins

[![Docker Build](https://github.com/data2evidence/d2e-flows/actions/workflows/docker-build-push.yaml/badge.svg)](https://github.com/data2evidence/d2e-flows/actions/workflows/docker-build-push.yaml) &nbsp;&nbsp; [![build plugin](https://github.com/data2evidence/d2e-flows/actions/workflows/plugin-ci.yml/badge.svg)](https://github.com/data2evidence/d2e-flows/actions/workflows/plugin-ci.yml)

## How to modify package.json for local development

In the flow to be modified in trex > flow > flows

1. Change the value of the image to `d2e-flows-local:latest`
2. Create a [Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic) with **no scopes** to avoid rate limiting with downloading the OHDSI packages https://ohdsi.github.io/Hades/rSetup.html | section `GitHub Personal Access Token
`
3. Export PAT as env `export GITHUB_PAT=<GITHUB_PAT>`
4. Run `yarn build` to build `d2e-flows-local:latest` after making changes to flow code
5. In d2e-plugins repo, set PLUGINS_SEED_UDPATE=True and then run `yarn start:minerva trex` to reinitialize the plugins
 