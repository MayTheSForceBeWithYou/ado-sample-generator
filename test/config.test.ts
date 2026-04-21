import { describe, expect, it } from 'vitest';
import { configSchema } from '../src/models/config.js';

describe('config schema', () => {
  it('accepts valid config', () => {
    const parsed = configSchema.parse({
      organizationUrl: 'https://dev.azure.com/demo',
      project: 'Demo',
      auth: { type: 'pat', tokenEnvVar: 'ADO_PAT' },
      dataset: {
        epics: 1,
        featuresPerEpic: 2,
        userStoriesPerFeature: 3,
        tasksPerUserStory: 4,
        bugs: 5,
        issues: 6,
      },
      seed: 1,
      options: {
        createComments: true,
        createAttachments: false,
        createRelatedLinks: true,
        createTags: true,
        dryRun: false,
      },
    });
    expect(parsed.project).toBe('Demo');
  });

  it('rejects invalid seed', () => {
    expect(() => configSchema.parse({
      organizationUrl: 'https://dev.azure.com/demo',
      project: 'Demo',
      auth: { type: 'pat', tokenEnvVar: 'ADO_PAT' },
      dataset: {
        epics: 1,
        featuresPerEpic: 1,
        userStoriesPerFeature: 1,
        tasksPerUserStory: 1,
        bugs: 1,
        issues: 1,
      },
      seed: -1,
      options: {
        createComments: true,
        createAttachments: false,
        createRelatedLinks: true,
        createTags: true,
        dryRun: false,
      },
    })).toThrowError();
  });
});
