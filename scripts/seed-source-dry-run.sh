#!/usr/bin/env bash
set -euo pipefail

: "${ADO_PAT:?ADO_PAT must be set}"

ORG_URL="https://dev.azure.com/YOUR_ORG_HERE"
SOURCE_PROJECT="YOUR_SOURCE_PROJECT_HERE"
SEED="${SEED:-12345}"

CONFIG_FILE="${CONFIG_FILE:-./config.source.dryrun.json}"

cat > "$CONFIG_FILE" <<EOF
{
  "organizationUrl": "${ORG_URL}",
  "project": "${SOURCE_PROJECT}",
  "auth": {
    "type": "pat",
    "tokenEnvVar": "ADO_PAT"
  },
  "dataset": {
    "epics": 2,
    "featuresPerEpic": 2,
    "userStoriesPerFeature": 3,
    "tasksPerUserStory": 2,
    "bugs": 6,
    "issues": 3
  },
  "seed": ${SEED},
  "options": {
    "createComments": true,
    "createAttachments": false,
    "createRelatedLinks": true,
    "createTags": true,
    "dryRun": true,
    "markerTag": "SeededByMigratorTestApp"
  }
}
EOF

npm install
npm run build

npx tsx src/cli/index.ts validate-connection --config "$CONFIG_FILE"
npx tsx src/cli/index.ts generate --config "$CONFIG_FILE" --dry-run
