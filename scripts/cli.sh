#!/usr/bin/env bash
set -o errexit

version=develop #default version

cmd=""
script_full_path=$(dirname "$0")

if [[ -n "$D2ECLI_NODE_MODULES_PATH" ]]; then
  node_modules_path=$D2ECLI_NODE_MODULES_PATH
elif [ -d "$script_full_path/../lib/node_modules/@data2evidence/cli/" ]; then
  node_modules_path=$script_full_path/../lib/node_modules/@data2evidence/cli/
elif [ -d "$script_full_path/../@data2evidence/cli/" ]; then
  node_modules_path=$script_full_path/../@data2evidence/cli/
else
  echo "Can't find d2e cli node_modules dir. You can set D2ECLI_NODE_MODULES_PATH to define the path. Exiting"
  exit -1
fi

export CADDY__CONFIG=${CADDY__CONFIG:-./.deploy/caddy-config}
export ENV_TYPE=${ENV_TYPE:-remote}
DOCKER_LOG_LEVEL=${DOCKER_LOG_LEVEL:-ERROR}

export ENV_EXAMPLE=$node_modules_path/env.example
export GIT_BASE_DIR=.

env=.env
context=""
fhir=""
demo=""
dicom=""
compose=""
args=""
services=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--function-path) function_path="$2"; shift ;;
        -e|--demo) demo=--profile="demodb" ;;
        -f|--fhir) fhir=--profile="fhir" ;;
        -i|--dicom) dicom=--profile="dicom" ;;
        -c|--compose-file) compose="--file $2"; shift ;;
        -t|--docker-context) context="--context $2"; shift ;;
        -v|--version) version="$2"; shift ;;
        -a|--args) args="$2"; shift ;;
        -n|--env-file) env="$2"; shift ;;
        -p|--port) export PORT="$2"; shift ;;
        -s|--services) services="$2"; shift ;;
        *) if [[ -z ${cmd:-} ]]; then
               cmd=$1
           else
               echo "Unexpected argument after command: $1"
               exit 1
           fi
    esac
    shift
done

if [ -n "${function_path:-}" ]; then
    dev="--file $node_modules_path/docker-compose-local.yml --env-file $env"
    export D2E_FUNCTIONS=$function_path
    export PROJECT_NAME=${PROJECT_NAME:-alp}
else
    dev="--env-file $env"
fi
export ENVFILE=$env

if [[ $version = "develop" ]]; then
  export PLUGINS_API_VERSION=${PLUGINS_API_VERSION:-latest}
  export DOCKER_TAG_NAME=${DOCKER_TAG_NAME:-develop}
  export DOCKER_TREX_TAG_NAME=${DOCKER_TREX_TAG_NAME:-develop}
  DOCKER_LOG_LEVEL=INFO
else
  export PLUGINS_API_VERSION=${PLUGINS_API_VERSION:-~$version}
  export DOCKER_TAG_NAME=${DOCKER_TAG_NAME:-$version-beta}
  export DOCKER_TREX_TAG_NAME=${DOCKER_TREX_TAG_NAME:-$version-beta}
fi

dockerbasecmd="docker $context --log-level $DOCKER_LOG_LEVEL compose --file $node_modules_path/docker-compose.yml $demo $fhir $dicom $dev $compose $args"

case $cmd in
    start)
        cmd="$dockerbasecmd up --force-recreate --wait"
        if [ -n "$services" ]; then
            cmd="$cmd --no-deps $services"
        fi
        echo $cmd
        $cmd
        ;;
    stop)
        cmd="$dockerbasecmd stop"
        if [ -n "$services" ]; then
            cmd="$cmd $services"
        fi
        echo $cmd
        $cmd
        ;;
    build)
        cmd="$dockerbasecmd build"
        echo $cmd
        $cmd
        ;;
    status)
        cmd="$dockerbasecmd ps"
        echo $cmd
        $cmd
        ;;
    logs)
        cmd="$dockerbasecmd logs -t"
        if [ -n "$services" ]; then
            cmd="$cmd $services"
        fi
        echo $cmd
        $cmd
        ;;
    clean)
        read -p "This action will delete all docker containers and volumes. Continue (y/n)?" choice
        case "$choice" in
            y|Y)
                cmd="$dockerbasecmd down --volumes --remove-orphans"
                echo $cmd
                $cmd
                ;;
            *)
                echo "Aborting";;
        esac
        ;;
    cleanci)
        cmd="$dockerbasecmd down --volumes --remove-orphans"
        echo $cmd
        $cmd
        ;;
    patchdemodb)
        database_host=${PROJECT_NAME:-d2e}-demodb
        docker exec $database_host psql -h localhost -U postgres -c "SET search_path TO demo_cdm;"
        docker exec $database_host psql -h localhost -U postgres -c "CREATE TABLE IF NOT EXISTS cohort (cohort_definition_id integer NOT NULL,subject_id integer NOT NULL,cohort_start_date DATE NOT NULL,cohort_end_date DATE NOT NULL)"
        ;;
    init)
        $node_modules_path/scripts/dotenv.sh
        ;;
    pull)
        docker pull ghcr.io/data2evidence/d2e-flow/base:${DOCKER_TAG_NAME:-develop}
        ;;
    setupdemo)
        npx zx ./scripts/load-demodatabase.mjs && 
        npx zx ./scripts/load-demodataset.mjs
        ;;
    *)
        if [ -z ${cmd:-} ]; then
            echo "d2e: command is missing"
        else
            echo "d2e: $cmd is not a d2e command."
        fi
        cat << EOT

Usage: d2e [OPTIONS] COMMAND

Commands:
  init        Initializes D2E directory and generates .env file
  start       Starts d2e services. Requires d2e init and d2e setup to be run.
  stop        Stops d2e services
  clean       Removes d2e docker containers and volumes
  setupdemo        Load d2e services. Requires d2e init and d2e setup to be run.

Options:
 -d, --function-path [PATH] Development mode. [PATH] is the path to functions
 -e, --demo                 Include demo database
 -f, --fhir                 Include FHIR Server
 -i, --dicom                Include DICOM Server
 -c, --compose-file [PATH]  [PATH] is path to an additional docker compose file
 -t, --docker-context [CONTEXT] Use docker context
 -v, --version [VERSION]    Version of the d2e services to use
 -a, --args [ARGUMENTS]     Additional arguments for docker-compose
 -n, --env-file [FILE]      Path to environment file
 -p, --port [PORT]          Port number to use
 -s, --services [SERVICES]  Comma-separated list of services to start/stop

EOT
        ;;
esac
