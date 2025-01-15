#!/usr/bin/env bash

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
export CADDY__CONFIG=./deploy/caddy-config
export ENV_TYPE=${ENV_TYPE:-remote}
DOCKER_LOG_LEVEL=${DOCKER_LOG_LEVEL:-ERROR}

export ENV_EXAMPLE=$node_modules_path/env.example
export GIT_BASE_DIR=.
export ENVFILE=.env

case $cmd in
    start)
        docker --log-level $DOCKER_LOG_LEVEL compose --file $node_modules_path/docker-compose.yml --env-file .env up --wait
        ;;
    startdemo)
        docker --log-level $DOCKER_LOG_LEVEL compose --file $node_modules_path/docker-compose.yml --file $node_modules_path/docker-compose-atlas.yml --env-file .env up --wait
        ;;
    stop)
        docker --log-level $DOCKER_LOG_LEVEL compose --file $node_modules_path/docker-compose.yml --env-file .env stop
        ;;
    stopdemo)
        docker --log-level $DOCKER_LOG_LEVEL compose --file $node_modules_path/docker-compose.yml --file $node_modules_path/docker-compose-atlas.yml --env-file .env stop
        ;;
    clean)
        read -p "This action will delete all docker containers and volumnes. Continue (y/n)?" choice
        case "$choice" in
            y|Y)
                docker --log-level $DOCKER_LOG_LEVEL compose --file $node_modules_path/docker-compose.yml --env-file .env down --volumes --remove-orphans
                ;;
            *)
                echo "Aborting";;
        esac
        ;;
    cleandemo)
        read -p "This action will delete all docker containers and volumnes. Continue (y/n)?" choice
        case "$choice" in
            y|Y)
                docker --log-level $DOCKER_LOG_LEVEL compose --file $node_modules_path/docker-compose.yml --file $node_modules_path/docker-compose-atlas.yml --env-file .env down --volumes --remove-orphans
                ;;
            *)
                echo "Aborting";;
        esac
        ;;
    patchdemodb)
        docker exec -u postgres broadsea-atlasdb psql -f /cohort_patch.sql
        ;;
    setup)
        docker --log-level $DOCKER_LOG_LEVEL compose --file $node_modules_path/docker-compose.yml --env-file .env up alp-minerva-postgres alp-logto --wait && sleep 10 &&
        docker --log-level $DOCKER_LOG_LEVEL compose --file $node_modules_path/docker-compose.yml --env-file .env up alp-logto-post-init
        ;;
    init)
        sed '3d' $node_modules_path/README.md > README.md &&
        cp -a $node_modules_path/docs . &&
        cp -a $node_modules_path/deploy . &&
        $node_modules_path/scripts/gen-dotenv.sh && $node_modules_path/scripts/gen-tls.sh && $node_modules_path/scripts/gen-resource-limits.sh
        ;;
    login)
        source .env
        docker login -u $GH_USERNAME -p $GH_TOKEN ghcr.io
        ;;
    *)
        if [ -z ${cmd:-} ]; then
            echo "d2e: command is missing"
        else
            echo "d2e: $cmd is not a d2e command."
        fi
        echo ""
        echo "Usage: d2e COMMAND"
        echo ""
        echo "Commands:"
        echo "  init        Initializes D2E directory and generates .env file"
        echo "  login       Login into github. It's required to login to pull the docker images."
        echo "  setup       Initializes d2e IDP DB. Requires d2e init to be run."
        echo "  start       Starts d2e services. Requires d2e init and d2e setup to be run."
        echo "  stop        Stops d2e services"
        echo "  clean       Removes d2e docker containers and volumnes"
        echo "  startdemo   Starts d2e services incl. demo database"
        echo "  stopdemo    Stops d2e services incl. demo database"
        echo "  cleandemo   Removes d2e docker containers and volumnes incl. demo database"
        ;;
esac


#docker --log-level $DOCKER_LOG_LEVEL compose --file $node_modules_path/docker-compose.yml --env-file .env up --wait
