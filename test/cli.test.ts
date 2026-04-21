import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../src/cli/run.js';
import type { SeedReport } from '../src/models/report.js';
import type { AppConfig } from '../src/models/config.js';
import type { AzureDevOpsClient } from '../src/ado/client.js';
import type { CliLogger } from '../src/cli/run.js';

let tempDir = '';

const createConfigFile = async (dryRun = true): Promise<string> => {
  tempDir = await mkdtemp(join(tmpdir(), 'ado-seed-cli-'));
  const path = join(tempDir, 'config.json');
  const config: AppConfig = {
    organizationUrl: 'https://dev.azure.com/org',
    project: 'proj',
    auth: { type: 'pat', tokenEnvVar: 'ADO_PAT' },
    dataset: { epics: 1, featuresPerEpic: 1, userStoriesPerFeature: 1, tasksPerUserStory: 1, bugs: 1, issues: 1 },
    seed: 7,
    options: { createComments: true, createAttachments: false, createRelatedLinks: true, createTags: true, dryRun, markerTag: 'SeededByMigratorTestApp' },
  };
  await writeFile(path, JSON.stringify(config), 'utf-8');
  return path;
};

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = '';
  }
  vi.restoreAllMocks();
});

describe('cli', () => {
  it('runs generate in dry-run mode', async () => {
    const configPath = await createConfigFile(true);
    const output: string[] = [];

    const client: AzureDevOpsClient = {
      validateConnection: vi.fn(async () => undefined),
      getWorkItemTypes: vi.fn(async () => ['Epic', 'Feature', 'User Story', 'Task', 'Bug', 'Issue']),
      createWorkItem: vi.fn(),
      addRelation: vi.fn(),
      addComment: vi.fn(),
      queryWorkItemIdsByTag: vi.fn(async () => []),
      deleteWorkItem: vi.fn(async () => undefined),
    };

    const writeReport = vi.fn(async (_path: string, _report: SeedReport) => undefined);
    const logger: CliLogger = { info: vi.fn(), error: vi.fn() };

    const code = await runCli(['node', 'cli', 'generate', '--config', configPath, '--dry-run'], {
      createClient: () => client,
      writeReport,
      stdout: (message: string) => output.push(message),
      logger,
    });

    expect(code).toBe(0);
    expect(client.validateConnection).toHaveBeenCalledTimes(1);
    expect(client.createWorkItem).toHaveBeenCalledTimes(0);
    expect(writeReport).toHaveBeenCalledTimes(1);
    expect(output.join('\n')).toContain('Dry run: true');
  });

  it('validates connection command', async () => {
    const configPath = await createConfigFile();
    const output: string[] = [];
    const validateConnection = vi.fn(async () => undefined);
    const logger: CliLogger = { info: vi.fn(), error: vi.fn() };

    const code = await runCli(['node', 'cli', 'validate-connection', '--config', configPath], {
      createClient: () => ({
        validateConnection,
        getWorkItemTypes: vi.fn(async () => []),
        createWorkItem: vi.fn(),
        addRelation: vi.fn(),
        addComment: vi.fn(),
        queryWorkItemIdsByTag: vi.fn(async () => []),
        deleteWorkItem: vi.fn(async () => undefined),
      }),
      stdout: (message: string) => output.push(message),
      logger,
    });

    expect(code).toBe(0);
    expect(validateConnection).toHaveBeenCalledTimes(1);
    expect(output.join('\n')).toContain('Connection validated successfully.');
  });
});
