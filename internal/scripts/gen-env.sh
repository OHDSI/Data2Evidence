#!/usr/bin/env bash
# generate dotenv file
set -o nounset
set -o errexit

# inputs
GIT_BASE_DIR=$(git rev-parse --show-toplevel)
ENV_NAME=${ENV_NAME:-local}
ENV_TYPE=${ENV_TYPE:-local}
PRIVATE_ONLY=${PRIVATE_ONLY:-false}

echo ENV_NAME=$ENV_NAME
echo ENV_TYPE=$ENV_TYPE

# vars
DOTENV_FILE=$GIT_BASE_DIR/.env.$ENV_TYPE

cd $GIT_BASE_DIR

# functions
function merge-yml () {
    yq eval-all '. as $item ireduce ({}; . * $item ) | sort_keys(..)' ${@}
}

# build array of dotenv
if [ $PRIVATE_ONLY = true ]; then
    DOTENV_YMLS=(.env.private.yml)
elif [ $ENV_TYPE = local ]; then
    DOTENV_YMLS=(.env.base-all.yml .env.base-$ENV_TYPE.yml .env.$ENV_NAME.yml .env.private.yml)
elif [ $ENV_TYPE = remote ]; then
    DOTENV_YMLS=(.env.base-all.yml .env.base-$ENV_TYPE.yml .env.$ENV_NAME.yml)
fi
for file in ${DOTENV_YMLS[@]}; do touch $file; done

# convert maps & arrays to strings
merge-yml ${DOTENV_YMLS[@]} | yq 'with_entries(select(.value|tag|test("!!map|!!seq"))|.value|=(.|@json))' | sed -e 's/{}//' > .env.tmp.yml

# export vars for envsubst
merge-yml ${DOTENV_YMLS[@]} | yq -o shell > .env.tmp; set -a; source .env.tmp; set +a

# generate DOTENV_FILE
echo "# ${DOTENV_FILE##*/} $ENV_NAME" > $DOTENV_FILE
[ ! -z ${GITHUB_REPOSITORY+x} ] && echo "# https://github.com/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID" >> $DOTENV_FILE
merge-yml ${DOTENV_YMLS[@]} .env.tmp.yml | yq -o sh | envsubst >> $DOTENV_FILE
merge-yml ${DOTENV_YMLS[@]} .env.tmp.yml | yq 'keys | .[]' > $DOTENV_FILE.keys

sed -i.bak 's/localhost:41100/localhost/' $DOTENV_FILE # workaround until source value in 1password updated

echo "${DOTENV_YMLS[@]} => $(wc -l $DOTENV_FILE)"
rm .env.tmp .env.tmp.yml

source $GIT_BASE_DIR/scripts/lib.sh
# add logto secrets if not already present
KEYS=(LOGTO__ALP_APP__CLIENT_ID LOGTO__ALP_APP__CLIENT_SECRET LOGTO__ALP_DATA__CLIENT_ID LOGTO__ALP_DATA__CLIENT_SECRET LOGTO__ALP_SVC__CLIENT_ID LOGTO__ALP_SVC__CLIENT_SECRET LOGTO_API_M2M_CLIENT_ID LOGTO_API_M2M_CLIENT_SECRET)
for KEY in ${KEYS[@]}; do
	# echo KEY=$KEY
	[[ $KEY =~ ID ]] && LENGTH=21
	[[ $KEY =~ SECRET ]] && LENGTH=30
	grep -q $KEY $DOTENV_FILE || echo $KEY=$(random-password $LENGTH) >> $DOTENV_FILE
done
source $DOTENV_FILE
grep -q LOGTO__CLIENTID_PASSWORD__BASIC_AUTH $DOTENV_FILE || echo LOGTO__CLIENTID_PASSWORD__BASIC_AUTH=$(echo -n "${LOGTO_API_M2M_CLIENT_ID}:${LOGTO_API_M2M_CLIENT_SECRET}" | base64) >> $DOTENV_FILE

gen-tls-internal
set-cpu-limit
set-memory-limit