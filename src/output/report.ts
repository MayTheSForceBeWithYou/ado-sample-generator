import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { SeedReport } from '../models/report.js';

export const writeSeedReport = async (reportPath: string, report: SeedReport): Promise<void> => {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
};

export const readSeedReport = async (reportPath: string): Promise<SeedReport> => {
  const text = await readFile(reportPath, 'utf-8');
  return JSON.parse(text) as SeedReport;
};

export const summarizeReport = (report: SeedReport): string => {
  const typeSummary = Object.entries(report.createdIdsByType)
    .map(([type, ids]) => `${type}: ${ids.length}`)
    .join(', ');

  return [
    `Seed: ${report.seed}`,
    `Dry run: ${report.dryRun}`,
    `Elapsed ms: ${report.elapsedMs}`,
    `Created: ${typeSummary || 'none'}`,
    `Hierarchy links: ${report.hierarchy.length}`,
    `Skipped: ${report.skippedItems.length}`,
    `Failures: ${report.failures.length}`,
  ].join('\n');
};
