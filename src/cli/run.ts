import { resolve } from 'node:path';
import { Command } from 'commander';
import pino from 'pino';
import { loadConfig, resolvePatToken } from '../config/load-config.js';
import { AzureDevOpsRestClient, type AzureDevOpsClient } from '../ado/client.js';
import { generateDataset } from '../generator/dataset-generator.js';
import { buildCreatePatch, toAdoRelationType } from '../ado/payload.js';
import type { AppConfig } from '../models/config.js';
import type { ApiFailure, SeedReport } from '../models/report.js';
import { readSeedReport, summarizeReport, writeSeedReport } from '../output/report.js';

export interface CliLogger {
  info(payload: object, message: string): void;
  error(payload: object, message: string): void;
}

export interface CliDependencies {
  now(): Date;
  createClient(config: AppConfig): AzureDevOpsClient;
  writeReport(path: string, report: SeedReport): Promise<void>;
  readReport(path: string): Promise<SeedReport>;
  logger: CliLogger;
  stdout(message: string): void;
}

const defaultDependencies = (): CliDependencies => ({
  now: () => new Date(),
  createClient: (config: AppConfig): AzureDevOpsClient => new AzureDevOpsRestClient(config, resolvePatToken(config)),
  writeReport: writeSeedReport,
  readReport: readSeedReport,
  logger: pino({ level: process.env.LOG_LEVEL ?? 'info' }),
  stdout: (message: string): void => {
    process.stdout.write(`${message}\n`);
  },
});

const createSeedReport = (seed: number, dryRun: boolean, startedAtIso: string): SeedReport => ({
  seed,
  dryRun,
  startedAtIso,
  elapsedMs: 0,
  createdIdsByType: {},
  hierarchy: [],
  skippedItems: [],
  failures: [],
});

const applyGeneration = async (config: AppConfig, deps: CliDependencies): Promise<SeedReport> => {
  const startedAt = deps.now();
  const report = createSeedReport(config.seed, config.options.dryRun, startedAt.toISOString());
  const client = deps.createClient(config);

  await client.validateConnection();
  const availableTypes = await client.getWorkItemTypes();
  const dataset = generateDataset(config, { availableTypes, markerTag: config.options.markerTag });
  report.skippedItems = dataset.skippedTypes;

  if (config.options.dryRun) {
    deps.logger.info({ itemCount: dataset.items.length }, 'Dry-run complete; no work items created.');
    report.elapsedMs = deps.now().getTime() - startedAt.getTime();
    return report;
  }

  const idByLogicalId = new Map<string, number>();

  for (const item of dataset.items) {
    try {
      const patch = buildCreatePatch(item);
      const created = await client.createWorkItem(item.type, patch);
      idByLogicalId.set(item.logicalId, created.id);
      const typeIds = report.createdIdsByType[item.type] ?? [];
      typeIds.push(created.id);
      report.createdIdsByType[item.type] = typeIds;

      if (config.options.createComments) {
        for (const comment of item.comments) {
          await client.addComment(created.id, comment);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failure: ApiFailure = { stage: 'create-item', logicalId: item.logicalId, message };
      report.failures.push(failure);
    }
  }

  for (const relation of dataset.relations) {
    const sourceId = idByLogicalId.get(relation.sourceLogicalId);
    const targetId = idByLogicalId.get(relation.targetLogicalId);
    if (!sourceId || !targetId) {
      report.failures.push({
        stage: 'create-relation',
        logicalId: relation.sourceLogicalId,
        message: `Missing source/target IDs for ${relation.sourceLogicalId} -> ${relation.targetLogicalId}`,
      });
      continue;
    }

    try {
      await client.addRelation(sourceId, toAdoRelationType(relation), targetId, 'Seeded relation');
      if (relation.relationType === 'parent') {
        report.hierarchy.push({ childId: sourceId, parentId: targetId });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report.failures.push({ stage: 'create-relation', logicalId: relation.sourceLogicalId, message });
    }
  }

  report.elapsedMs = deps.now().getTime() - startedAt.getTime();
  return report;
};

export const runCli = async (argv: string[], providedDeps?: Partial<CliDependencies>): Promise<number> => {
  const deps = { ...defaultDependencies(), ...providedDeps } as CliDependencies;
  const program = new Command();
  program.name('ado-sample-generator').description('Generate deterministic Azure DevOps sample data for migration testing');

  program
    .command('generate')
    .requiredOption('--config <path>', 'Path to config json file')
    .option('--dry-run', 'Override config and run without creating items', false)
    .action(async (options: { config: string; dryRun: boolean }) => {
      const config = await loadConfig(options.config);
      if (options.dryRun) {
        config.options.dryRun = true;
      }
      const report = await applyGeneration(config, deps);
      const reportPath = resolve('output/seed-report.json');
      await deps.writeReport(reportPath, report);
      deps.stdout(summarizeReport(report));
    });

  program
    .command('validate-connection')
    .requiredOption('--config <path>', 'Path to config json file')
    .action(async (options: { config: string }) => {
      const config = await loadConfig(options.config);
      const client = deps.createClient(config);
      await client.validateConnection();
      deps.stdout('Connection validated successfully.');
    });

  program
    .command('cleanup')
    .requiredOption('--config <path>', 'Path to config json file')
    .option('--created-by-seeder', 'Only target seeder-tagged work items', true)
    .option('--delete', 'Attempt deletion for tagged work items', false)
    .action(async (options: { config: string; createdBySeeder: boolean; delete: boolean }) => {
      const config = await loadConfig(options.config);
      const client = deps.createClient(config);
      await client.validateConnection();

      const ids = options.createdBySeeder ? await client.queryWorkItemIdsByTag(config.options.markerTag) : [];
      deps.stdout(`Found ${ids.length} candidate seeded work items.`);
      if (options.delete) {
        for (const id of ids) {
          await client.deleteWorkItem(id);
        }
        deps.stdout(`Deleted ${ids.length} seeded work items.`);
      } else {
        deps.stdout(`IDs: ${ids.join(', ') || 'none'}`);
      }
    });

  program
    .command('report')
    .option('--path <path>', 'Path to report json', 'output/seed-report.json')
    .action(async (options: { path: string }) => {
      const report = await deps.readReport(resolve(options.path));
      deps.stdout(summarizeReport(report));
    });

  try {
    await program.parseAsync(argv);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    deps.logger.error({ err: message }, 'Command failed');
    deps.stdout(`Error: ${message}`);
    return 1;
  }
};
