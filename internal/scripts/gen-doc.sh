#!/usr/bin/env bash
# generate env.example & README-vars.md
set -o nounset
set -o errexit

# vars
SCRIPTS_DIR=$(dirname $0)
GIT_BASE_DIR="$(git rev-parse --show-toplevel)"
ENVEG_FILE=$GIT_BASE_DIR/env.example
README_FILE=$GIT_BASE_DIR/docs/1-setup/env-vars.md
VARS_YML=$SCRIPTS_DIR/env-vars.yml
USER_YML=env.user.yml

# clear
[ -e $README_FILE ] && rm $README_FILE

echo  . parse env.example file
cat $ENVEG_FILE | awk -F= '/=/ {print $1}' | sort -u
# generate env.example file
# [ -e $ENVEG_FILE ] && rm $ENVEG_FILE
# code $ENVEG_FILE
# echo "# ${ENVEG_FILE##*/}" | tee $ENVEG_FILE
# echo "---"
# cat $VARS_YML | yq 'to_entries | .[] | select(.value.example != "false") | .key + "=${" + .key + "} # " + (.value.comment // "" )+ " " + .value.type' | sed -e "s/\${/'\${/" -e "s/}/}'/" -e 's/  / /g' | tee -a $ENVEG_FILE
# yq -o sh $USER_YML | tee -a $ENVEG_FILE
# echo -e "\n"

# generate README file
echo -e "\n${README_FILE}\n---"
echo "# Environment Variables" | tee $README_FILE
echo "key | type | comment " | tee -a $README_FILE
echo "--- | --- | --- " | tee -a $README_FILE
cat $VARS_YML | yq 'to_entries | .[] | select(.value.readme != "false") | .key + " | " + .value.type  + " | " + (.value.comment // "") ' | tee -a $README_FILE
echo -e "\n"