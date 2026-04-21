import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { readSeedReport, summarizeReport, writeSeedReport } from '../src/output/report.js';

let tempDir = '';

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = '';
  }
});

describe('report output', () => {
  it('writes and reads report json', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ado-seed-report-'));
    const path = join(tempDir, 'seed-report.json');
    await writeSeedReport(path, {
      seed: 1,
      dryRun: false,
      startedAtIso: new Date().toISOString(),
      elapsedMs: 10,
      createdIdsByType: { Task: [1, 2] },
      hierarchy: [{ childId: 2, parentId: 1 }],
      skippedItems: [],
      failures: [],
    });

    const report = await readSeedReport(path);
    expect(report.createdIdsByType.Task).toEqual([1, 2]);
    expect(summarizeReport(report)).toContain('Task: 2');
  });
});
