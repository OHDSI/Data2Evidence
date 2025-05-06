#!/usr/bin/env bash
set -o errexit

version=0.6.0 #default version

cmd=""
script_full_path=$(dirname "$0")

if [[ -n "$D2ECLI_NODE_MODULES_PATH" ]]; then
  node_modules_path=$D2ECLI_NODE_MODULES_PATH
elif [ -d "$script_full_path/../lib/node_modules/d2e/" ]; then
  node_modules_path=$script_full_path/../lib/node_modules/d2e/
elif [ -d "$script_full_path/../d2e/" ]; then
  node_modules_path=$script_full_path/../d2e/
elif [ -d "$script_full_path/../lib/node_modules/@ohdsi/d2e/" ]; then
  node_modules_path=$script_full_path/../lib/node_modules/@ohdsi/d2e/
elif [ -d "$script_full_path/../@ohdsi/d2e/" ]; then
  node_modules_path=$script_full_path/../@ohdsi/d2e/
elif [ -d "$script_full_path/../lib/node_modules/@data2evidence/cli/" ]; then
  node_modules_path=$script_full_path/../lib/node_modules/@data2evidence/cli/
elif [ -d "$script_full_path/../@data2evidence/cli/" ]; then
  node_modules_path=$script_full_path/../@data2evidence/cli/
elif [[ "$(basename "$0")" == "cli.sh" || "$(basename "$(dirname "$0")")" == "scripts" ]]; then
  node_modules_path=$script_full_path/..
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
jupyter=""
compose=""
args=""
services=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--function-path) function_path="$2"; shift ;;
        -e|--demo) demo=--profile="demodb" ;;
        -f|--fhir) fhir=--profile="fhir" ;;
        -i|--dicom) dicom=--profile="dicom" ;;
        -j|--jupyter) jupyter=--profile="jupyter" ;;
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
else
    dev="--env-file $env"
fi
export ENVFILE=$env
export PROJECT_NAME=${PROJECT_NAME:-d2e}

if [[ $version = "develop" ]]; then
  export PLUGINS_API_VERSION=${PLUGINS_API_VERSION:-latest}
  export DOCKER_TAG_NAME=${DOCKER_TAG_NAME:-develop}
  export DOCKER_TREX_TAG_NAME=${DOCKER_TREX_TAG_NAME:-develop}
  export PLUGINS_IMAGE_TAG=${PLUGINS_IMAGE_TAG:-develop}
  export DOCKER_IMAGE_PREFIX=ghcr.io/ohdsi/
  export PLUGINS_REGISTRY=${PLUGINS_REGISTRY:-https://pkgs.dev.azure.com/data2evidence/d2e/_packaging/d2e/npm/registry/}
  DOCKER_LOG_LEVEL=INFO
else
  export PLUGINS_API_VERSION=${PLUGINS_API_VERSION:-~$version}
  export DOCKER_TAG_NAME=${DOCKER_TAG_NAME:-$version-beta}
  export DOCKER_TREX_TAG_NAME=${DOCKER_TREX_TAG_NAME:-$version-beta}
  export PLUGINS_IMAGE_TAG=${PLUGINS_IMAGE_TAG:-$version-beta}
  export PLUGINS_REGISTRY=${PLUGINS_REGISTRY:-https://pkgs.dev.azure.com/data2evidence/d2e/_packaging/stable/npm/registry/}
fi

dockerbasecmd="docker $context --log-level $DOCKER_LOG_LEVEL compose --file $node_modules_path/docker-compose.yml $demo $fhir $dicom $jupyter $dev $compose $args"

case $cmd in
    start)
        cmd="$dockerbasecmd up --force-recreate --wait"
        if [ -n "$services" ]; then
            cmd="$cmd --no-deps $services"
        fi
        echo . $cmd
        $cmd
        ;;
    stop)
        cmd="$dockerbasecmd stop"
        if [ -n "$services" ]; then
            cmd="$cmd $services"
        fi
        echo . $cmd
        $cmd
        ;;
    build)
        cmd="$dockerbasecmd build"
        echo . $cmd
        $cmd
        ;;
    status)
        cmd="$dockerbasecmd ps"
        echo . $cmd
        $cmd
        ;;
    logs)
        cmd="$dockerbasecmd logs -t"
        if [ -n "$services" ]; then
            cmd="$cmd $services"
        fi
        echo . $cmd
        $cmd
        ;;
    config)
        cmd="$dockerbasecmd config"
        echo "# $cmd"
        $cmd 2> /dev/null
        ;;
    clean)
        read -p "This action will delete all docker containers and volumes. Continue (y/n)?" choice
        case "$choice" in
            y|Y)
                cmd="$dockerbasecmd down --volumes --remove-orphans"
                echo . $cmd
                $cmd
                ;;
            *)
                echo "Aborting";;
        esac
        ;;
    cleanci)
        cmd="$dockerbasecmd down --volumes --remove-orphans"
        echo . $cmd
        $cmd
        ;;
    patchdemodb)
        database_host=${PROJECT_NAME:-d2e}-demodb
        docker exec $database_host psql -h localhost -U postgres -c "SET search_path TO demo_cdm; CREATE TABLE IF NOT EXISTS cohort (cohort_definition_id integer NOT NULL,subject_id integer NOT NULL,cohort_start_date DATE NOT NULL,cohort_end_date DATE NOT NULL)"
        ;;
    init)
        CADDY__ALP__PUBLIC_FQDN=${CADDY__ALP__PUBLIC_FQDN:-localhost}
        DOCKER_TAG_NAME=${DOCKER_TAG_NAME:-develop}
        DOCKER_TREX_TAG_NAME=${DOCKER_TREX_TAG_NAME:-develop}
        ENV_TYPE=${ENV_TYPE:-local}
        TLS__CADDY_DIRECTIVE=${TLS__CADDY_DIRECTIVE:-tls internal}
        [ -v DOTENV_FILE ] || DOTENV_FILE=$env
        DOTENV_KEYS=$DOTENV_FILE.keys

        echo . INPUTS TLS__CADDY_DIRECTIVE=\"$TLS__CADDY_DIRECTIVE\" DOTENV_FILE=$DOTENV_FILE

        # vars
        [ $ENV_TYPE = local ] && [ -z DOCKER_TAG_NAME ] && DOCKER_TAG_NAME=local

        source $node_modules_path/scripts/lib.sh # functions here

        echo ". INFO generate public & private keys - DB_CREDENTIALS__INTERNAL"
        DB_CREDENTIALS__INTERNAL__PRIVATE_KEY_PASSPHRASE=$(random-password 41)
        DB_CREDENTIALS__INTERNAL__PRIVATE_KEY="$(DB_CREDENTIALS__INTERNAL__PRIVATE_KEY_PASSPHRASE=$DB_CREDENTIALS__INTERNAL__PRIVATE_KEY_PASSPHRASE openssl genpkey -algorithm RSA -aes-256-cbc -pkeyopt rsa_keygen_bits:4096 -pass env:DB_CREDENTIALS__INTERNAL__PRIVATE_KEY_PASSPHRASE -quiet)"
        DB_CREDENTIALS__INTERNAL__DECRYPT_PRIVATE_KEY="$(DB_CREDENTIALS__INTERNAL__PRIVATE_KEY_PASSPHRASE=$DB_CREDENTIALS__INTERNAL__PRIVATE_KEY_PASSPHRASE openssl rsa -in <(echo "${DB_CREDENTIALS__INTERNAL__PRIVATE_KEY}") -passin env:DB_CREDENTIALS__INTERNAL__PRIVATE_KEY_PASSPHRASE)"
        DB_CREDENTIALS__INTERNAL__PUBLIC_KEY="$(DB_CREDENTIALS__INTERNAL__PRIVATE_KEY_PASSPHRASE=$DB_CREDENTIALS__INTERNAL__PRIVATE_KEY_PASSPHRASE openssl rsa -in <(echo "${DB_CREDENTIALS__INTERNAL__PRIVATE_KEY}") -pubout -passin env:DB_CREDENTIALS__INTERNAL__PRIVATE_KEY_PASSPHRASE)"

        # action
        echo -n '' > $DOTENV_FILE
        echo CADDY__ALP__PUBLIC_FQDN=$CADDY__ALP__PUBLIC_FQDN >> $DOTENV_FILE
        echo DOCKER_TAG_NAME=$DOCKER_TAG_NAME >> $DOTENV_FILE
        echo DOCKER_TREX_TAG_NAME=$DOCKER_TREX_TAG_NAME >> $DOTENV_FILE
        echo ENV_TYPE=$ENV_TYPE >> $DOTENV_FILE
        echo FHIR__CLIENT_ID=$(random-uuid) >> $DOTENV_FILE
        echo FHIR__CLIENT_SECRET=$(random-password 64) >> $DOTENV_FILE
        echo LOGTO__ALP_APP__CLIENT_ID=$(random-password 21) >> $DOTENV_FILE
        echo LOGTO__ALP_APP__CLIENT_SECRET=$(random-password 30) >> $DOTENV_FILE
        echo LOGTO__ALP_DATA__CLIENT_ID=$(random-password 21) >> $DOTENV_FILE
        echo LOGTO__ALP_DATA__CLIENT_SECRET=$(random-password 30) >> $DOTENV_FILE
        echo LOGTO__ALP_SVC__CLIENT_ID=$(random-password 21) >> $DOTENV_FILE
        echo LOGTO__ALP_SVC__CLIENT_SECRET=$(random-password 30) >> $DOTENV_FILE
        echo LOGTO_API_M2M_CLIENT_ID=$(random-password 21) >> $DOTENV_FILE
        echo LOGTO_API_M2M_CLIENT_SECRET=$(random-password 30) >> $DOTENV_FILE
        echo MINIO__SECRET_KEY=$(random-uuid) >> $DOTENV_FILE
        echo PG_ADMIN_PASSWORD=$(random-password $DEFAULT_PASSWORD_LENGTH) >> $DOTENV_FILE
        echo PG_SUPER_PASSWORD=$(random-password $DEFAULT_PASSWORD_LENGTH) >> $DOTENV_FILE
        echo PG_WRITE_PASSWORD=$(random-password $DEFAULT_PASSWORD_LENGTH) >> $DOTENV_FILE
        echo REDIS_PASSWORD=$(random-uuid) >> $DOTENV_FILE
        echo DICOM__HEALTH_CHECK_PASSWORD=$(random-password $DEFAULT_PASSWORD_LENGTH) >> $DOTENV_FILE
        echo TLS__CADDY_DIRECTIVE=\'"$TLS__CADDY_DIRECTIVE"\' >> $DOTENV_FILE

        source $DOTENV_FILE && echo LOGTO__CLIENTID_PASSWORD__BASIC_AUTH=$(echo -n "${LOGTO_API_M2M_CLIENT_ID}:${LOGTO_API_M2M_CLIENT_SECRET}" | base64) >> $DOTENV_FILE
        #echo PG__LOGTO_MANAGER_USER=postgres >> $DOTENV_FILE
        echo PG__LOGTO_MANAGER_PASSWORD=$(random-password $DEFAULT_PASSWORD_LENGTH) >> $DOTENV_FILE

        set-cpu-limit
        set-memory-limit
        gen-tls-internal

        # echo DB_CREDENTIALS__INTERNAL__PRIVATE_KEY_PASSPHRASE=\'"$DB_CREDENTIALS__INTERNAL__PRIVATE_KEY_PASSPHRASE"\' >> $DOTENV_FILE
        # echo DB_CREDENTIALS__INTERNAL__PRIVATE_KEY=\'"$DB_CREDENTIALS__INTERNAL__PRIVATE_KEY"\' >> $DOTENV_FILE
        echo DB_CREDENTIALS__INTERNAL__DECRYPT_PRIVATE_KEY=\'"$DB_CREDENTIALS__INTERNAL__DECRYPT_PRIVATE_KEY"\' >> $DOTENV_FILE
        echo DB_CREDENTIALS__INTERNAL__PUBLIC_KEY=\'"$DB_CREDENTIALS__INTERNAL__PUBLIC_KEY"\' >> $DOTENV_FILE

        # finalize
        cat $DOTENV_FILE | grep = | awk -F= '{print $1}' | grep _ | sort -u > $DOTENV_KEYS
        echo . INFO linecounts
        wc -l $DOTENV_FILE $DOTENV_KEYS | sed '$d'
        ;;
    pull)
        cmd="docker pull --platform linux/amd64 ghcr.io/ohdsi/d2e/flow-base:${DOCKER_TAG_NAME:-develop}" # not part of dc.yml
        echo . $cmd
        $cmd
        cmd="$dockerbasecmd pull"
        echo . $cmd
        $cmd
        ;;
    setupdemo)
        npx zx $node_modules_path/scripts/load-demodatabase.mjs -v $version -d $function_path &&
        npx zx $node_modules_path/scripts/load-demodataset.mjs
        ;;
    checkflow) 
        npx zx $node_modules_path/scripts/check-setupdemo-flow.mjs
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
  setupdemo   Load d2e services. Requires d2e init and d2e setup to be run.

Options:
 -d, --function-path [PATH] Development mode. [PATH] is the path to functions
 -e, --demo                 Include demo database
 -f, --fhir                 Include FHIR Server
 -i, --dicom                Include DICOM Server
 -j, --jupyter              Include jupyter
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
