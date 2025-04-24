#!/usr/bin/env bash
# generate env-vars.md
set -o nounset
set -o errexit

# vars
SCRIPTS_DIR=$(dirname $0)
GIT_BASE_DIR="$(git rev-parse --show-toplevel)"
DOC_YML_IN=$GIT_BASE_DIR/internal/docs/env-vars.yml
README_FILE_OUT=$GIT_BASE_DIR/env-vars.md

# clear $README_FILE_OUT
[ -e $README_FILE_OUT ] && rm $README_FILE_OUT

# generate README file
echo -e "\n${README_FILE_OUT}\n---"
echo "# Environment Variables" | tee $README_FILE_OUT
echo "key | type | comment " | tee -a $README_FILE_OUT
echo "--- | --- | --- " | tee -a $README_FILE_OUT
cat $DOC_YML_IN | yq 'to_entries | .[] | select(.value.publish == "true") | "`" + .key + "` | " + .value.type  + " | " + (.value.comment // "") ' | tee -a $README_FILE_OUT
echo -e "\n"