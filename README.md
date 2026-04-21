# ado-sample-generator

A Node.js + TypeScript CLI that generates deterministic, realistic Azure DevOps work item datasets for migration testing.

## Requirements

- Node.js 20+
- npm (pnpm-compatible project layout)
- Azure DevOps PAT with work item read/write permissions

## Setup

```bash
npm install
npm run build
```

## Authentication

Set the PAT in the environment variable referenced by your config.

Example:

```bash
export ADO_PAT="<your-pat-token>"
```

### Creating a PAT

1. In Azure DevOps, open **User Settings** > **Personal access tokens**.
2. Create a token with scope for Work Items read/write (and project read metadata).
3. Store it in a secure secret store or shell environment variable.

## Configuration

Use a config file like `config.example.json`:

```json
{
  "organizationUrl": "https://dev.azure.com/my-org",
  "project": "SampleMigrationProject",
  "auth": {
    "type": "pat",
    "tokenEnvVar": "ADO_PAT"
  },
  "dataset": {
    "epics": 2,
    "featuresPerEpic": 3,
    "userStoriesPerFeature": 4,
    "tasksPerUserStory": 3,
    "bugs": 10,
    "issues": 5
  },
  "seed": 12345,
  "options": {
    "createComments": true,
    "createAttachments": false,
    "createRelatedLinks": true,
    "createTags": true,
    "dryRun": false,
    "markerTag": "SeededByMigratorTestApp"
  }
}
```

Config is validated with Zod.

## CLI Usage

### Validate connection

```bash
npx tsx src/cli/index.ts validate-connection --config ./config.example.json
```

### Dry run

Builds dataset, validates connection, writes report, but does not create work items.

```bash
npx tsx src/cli/index.ts generate --config ./config.example.json --dry-run
```

### Generate sample data

```bash
npx tsx src/cli/index.ts generate --config ./config.example.json
```

### Cleanup

Lists seeded work items by marker tag:

```bash
npx tsx src/cli/index.ts cleanup --config ./config.example.json --created-by-seeder
```

Attempt deletion (hard delete API may be permission- or process-dependent):

```bash
npx tsx src/cli/index.ts cleanup --config ./config.example.json --created-by-seeder --delete
```

### Report

```bash
npx tsx src/cli/index.ts report --path ./output/seed-report.json
```

## Output report

Generation writes `./output/seed-report.json` with:

- per-type created work item IDs
- hierarchy link summary
- skipped item types
- API failures
- seed and elapsed time

This file can be consumed by migration test workflows.

## Determinism

The generator uses a seeded RNG. Using the same seed and config produces the same logical dataset shape/content.

## Testing

```bash
npm test
npm run typecheck
npm run build
```

Tests use Vitest with mocked Azure DevOps clients (no live ADO dependency in CI).

## Notes / limitations

- Attachments are configurable but not currently uploaded by default flow.
- Cleanup uses the configured `options.markerTag` (default: `SeededByMigratorTestApp`).
- Hard delete support depends on Azure DevOps permissions and project settings.
