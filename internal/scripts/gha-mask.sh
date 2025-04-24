#!/usr/bin/env bash
# generate GitHubActions mask text
set -o nounset
set -o errexit
echo ${0} ...

DOTENV_FILE=${DOTENV_FILE:-.env.remote}
GIT_BASE_DIR="$(git rev-parse --show-toplevel)"
DC_YMLS=($(ls $GIT_BASE_DIR/docker-compose*.yml))

# allow level-1 FQDN yml keys as non-sensitive
export KEYS_ALLOW="CADDY__ALP__PUBLIC_FQDN"
# mask secrets as sensitive
STRINGS_MASK="password|host|secret|http|PRIVATE"
# allow container names as non-sensitive
SERVICE_NAMES=($(yq eval-all --no-doc '.services | to_entries | .[] | .key' ${DC_YMLS[@]} | sort -u)); # echo SERVICE_NAMES=${SERVICE_NAMES[@]}
CONTAINER_NAMES=($(yq eval-all --no-doc '[.services[].container_name] | filter (. != null) | .[] |= envsubst | .[]' ${DC_YMLS[@]})); # echo CONTAINER_NAMES=${CONTAINER_NAMES[@]}
STRINGS_ALLOW=$(echo ${CONTAINER_NAMES[@]} ${SERVICE_NAMES[@]} | sed -e 's/ /|/g'); # echo STRINGS_ALLOW=${STRINGS_ALLOW}

# mask level-1 sensitive values
yq -o props -N eval-all 'with_entries(select(.value|@json|test("^\"\{|^\"\[")|not) | select(.key|test(env(KEYS_ALLOW))|not))' $(ls .env.*.yml|grep -Ev "generated|private") | grep -Ev "${STRINGS_ALLOW}" | grep -iE "${STRINGS_MASK}" | awk -F' = ' '{if (length($2) > 0) { print "::add-mask::"$2}}' | sort -u
# mask level-2 sensitive values in nested json strings
yq -o props -N eval-all 'to_entries | .[] | select(.value|@json|test("^\"\{|^\"\["))|.value|@jsond' $(ls .env.*.yml|grep -Ev "generated|private") | grep -Ev "${STRINGS_ALLOW}" | grep -iE "${STRINGS_MASK}" | awk -F' = ' '{if (length($2) > 0) { print "::add-mask::"$2}}' | sort -u