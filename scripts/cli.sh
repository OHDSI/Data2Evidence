#!/usr/bin/env bash
version=develop #default version

cmd=${@: -1}
script_full_path=$(dirname "$0")

if [[ -n "$D2ECLI_NODE_MODULES_PATH" ]]; then
  node_modules_path=$D2ECLI_NODE_MODULES_PATH
elif [ -d "$script_full_path/../lib/node_modules/@data2evidence/cli/" ]; then
  node_modules_path=$script_full_path/../lib/node_modules/@data2evidence/cli/
elif [ -d "$script_full_path/../@data2evidence/cli/" ]; then
  node_modules_path=$script_full_path/../@data2evidence/cli/
else
  echo "Can't find d2e cli node_modules dir. You can set D2ECLI_NODE_MODULES_PATH to define the path. Existing"
  exit -1
fi

export CADDY__CONFIG=${CADDY__CONFIG:-./.deploy/caddy-config}
export ENV_TYPE=${ENV_TYPE:-remote}
DOCKER_LOG_LEVEL=${DOCKER_LOG_LEVEL:-ERROR}

export ENV_EXAMPLE=$node_modules_path/env.example
export GIT_BASE_DIR=.
export ENVFILE=.env


while getopts d:efc:v: flag
do
    case "${flag}" in
        d) function_path=${OPTARG};;
        e) demo=--profile="demodb";;
        f) fhir=--profile="fhir";;
        c) compose="--file ${OPTARG}";;
        v) version=${OPTARG}
    esac
done


if [ -n "$function_path" ]; then
    dev="--file $node_modules_path/docker-compose-local.yml --env-file .env.local"
    export D2E_FUNCTIONS=$function_path
    export PROJECT_NAME=${PROJECT_NAME:-alp}
    export PORT=${PORT:-41100}
else
    dev="--env-file .env"
fi


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

dockerbasecmd="docker --log-level $DOCKER_LOG_LEVEL compose --file $node_modules_path/docker-compose.yml $demo $fhir $dev $compose"

case $cmd in
    start)
        cmd="$dockerbasecmd up --wait"
        echo $cmd
        $cmd
        ;;
    stop)
        cmd="$dockerbasecmd stop"
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
        cmd="$dockerbasecmd logs -f -t"
        echo $cmd
        $cmd
        ;;
    clean)
        read -p "This action will delete all docker containers and volumnes. Continue (y/n)?" choice
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
    patchdemodb)
        docker exec -u postgres broadsea-atlasdb psql -f /cohort_patch.sql
        ;;
    init)
        cp -a $node_modules_path/deploy .deploy &&
        $node_modules_path/scripts/gen-dotenv.sh && $node_modules_path/scripts/gen-tls.sh && $node_modules_path/scripts/gen-resource-limits.sh &&
        docker pull ghcr.io/data2evidence/d2e-flow/base:${DOCKER_TAG_NAME:-develop}
        ;;
    *)
        if [ -z ${cmd:-} ]; then
            echo "d2e: command is missing"
        else
            echo "d2e: $cmd is not a d2e command."
        fi
        echo ""
        echo "Usage: d2e [OPTIONS] COMMAND"
        echo ""
        echo "Commands:"
        echo "  init        Initializes D2E directory and generates .env file"
        echo "  start       Starts d2e services. Requires d2e init and d2e setup to be run."
        echo "  stop        Stops d2e services"
        echo "  clean       Removes d2e docker containers and volumnes"
        echo ""
        echo "Options:"
        echo " -e           Include demo database"
        echo " -f           Include FHIR Server"
        echo " -d [PATH]    Development mode. [PATH] is the path to functions"
        echo " -c [PATH]    [PATH] is path to an additional docker compose file"
        echo " -v [VERSION] Version of the d2e services to use"
        ;;
esac
