# Operations

## Docker Containers

## Clean start

- remove all container and volumes
- generate new passwords

```bash
alias clean="yarn clean:minerva && yarn gen:dotenv"
```

## Build

- Build with progress and logging

```bash
alias build="yarn build:minerva --progress=plain | tee ~/Downloads/build-$(date '+%Y%m%dT%H%M').log"
```

## Start

- start minerva

```bash
alias start="yarn start:minerva --remove-orphans --force-recreate | tee ~/Downloads/start-$(date '+%Y%m%dT%H%M').log"
```

## Stop

- stop UI and minerva

```bash
alias stop="yarn stop:minerva"
```
