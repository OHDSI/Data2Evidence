#!/usr/bin/env bash
set -o nounset
set -o errexit

TEAM_FILE="CODEOWNERS.teams"
TEMPLATE_FILE="CODEOWNERS.src"
OUTPUT_FILE="CODEOWNERS"

# Ensure required files exist
if [ ! -f "$TEAM_FILE" ]; then
  echo "Error: $TEAM_FILE not found."
  exit 1
fi

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "Error: $TEMPLATE_FILE not found."
  exit 1
fi

cp "$TEMPLATE_FILE" "${OUTPUT_FILE}.tmp"

if [[ "$(uname)" == "Darwin" ]]; then
  SED_INPLACE=("sed" "-i" "")
else
  SED_INPLACE=("sed" "-i")
fi

while IFS='|' read -r team members || [ -n "$team" ]; do
  team=$(echo "$team" | xargs)
  members=$(echo "$members" | xargs)  
  "${SED_INPLACE[@]}" "s|${team}|${members}|g" "${OUTPUT_FILE}.tmp"
done < "$TEAM_FILE"

mv "${OUTPUT_FILE}.tmp" "$OUTPUT_FILE"

echo "CODEOWNERS file has been generated using teams from ${TEAM_FILE}."