import { describe, expect, it } from 'vitest';
import { generateDataset } from '../src/generator/dataset-generator.js';
import type { AppConfig } from '../src/models/config.js';

const baseConfig: AppConfig = {
  organizationUrl: 'https://dev.azure.com/org',
  project: 'proj',
  auth: { type: 'pat', tokenEnvVar: 'ADO_PAT' },
  dataset: {
    epics: 1,
    featuresPerEpic: 1,
    userStoriesPerFeature: 2,
    tasksPerUserStory: 1,
    bugs: 1,
    issues: 1,
  },
  seed: 42,
  options: {
    createComments: true,
    createAttachments: false,
    createRelatedLinks: true,
    createTags: true,
    dryRun: false,
    markerTag: 'SeededByMigratorTestApp',
  },
};

const context = {
  availableTypes: ['Epic', 'Feature', 'User Story', 'Task', 'Bug', 'Issue'],
  markerTag: 'SeededByMigratorTestApp',
};

describe('dataset generator', () => {
  it('is deterministic with same seed', () => {
    const one = generateDataset(baseConfig, context);
    const two = generateDataset(baseConfig, context);
    expect(one).toEqual(two);
  });

  it('differs with different seed', () => {
    const one = generateDataset(baseConfig, context);
    const two = generateDataset({ ...baseConfig, seed: 999 }, context);
    expect(one.items[0]?.title).not.toEqual(two.items[0]?.title);
  });

  it('creates parent-child hierarchy', () => {
    const generated = generateDataset(baseConfig, context);
    const parentRelations = generated.relations.filter((relation) => relation.relationType === 'parent');
    expect(parentRelations.length).toBeGreaterThan(0);
    expect(parentRelations.some((relation) => relation.sourceLogicalId.startsWith('story-'))).toBe(true);
  });
});
