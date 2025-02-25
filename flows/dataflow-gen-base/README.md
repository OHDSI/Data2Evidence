# dataflow-gen-base

- build dataflow-gen-base image - used to build dataflow-gen

## build command

```bash
GIT_BRANCH_NAME=$(git symbolic-ref --short HEAD) && GITHUB_SHA=$(git rev-parse HEAD) && docker buildx build --build-arg GIT_COMMIT_ARG=${GITHUB_SHA} --ssh default --build-arg GITHUB_PAT=$GITHUB_PAT_NOSCOPE --file ./dataflow-gen-base/Dockerfile --platform linux/amd64 --tag ghcr.io/data2evidence/alp-dataflow-gen-base:${GIT_BRANCH_NAME} .
```

- Update base image `Dockerfile` at `line 1`

notes:

- `~/.ssh/config` references ssh key with permissions to access repos alp-SqlRender & alp-DatabaseConnector
  - https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent

```
Host github.com
	AddKeysToAgent yes
	ForwardAgent yes
	HostName github.com
	IdentityFile ~/.ssh/gh.id_ed25519
	UseKeychain yes
	User git
```
