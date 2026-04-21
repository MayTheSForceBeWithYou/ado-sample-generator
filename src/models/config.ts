import { z } from 'zod';

export const configSchema = z.object({
  organizationUrl: z.url(),
  project: z.string().min(1),
  auth: z.object({
    type: z.literal('pat'),
    tokenEnvVar: z.string().min(1),
  }),
  dataset: z.object({
    epics: z.number().int().min(0),
    featuresPerEpic: z.number().int().min(0),
    userStoriesPerFeature: z.number().int().min(0),
    tasksPerUserStory: z.number().int().min(0),
    bugs: z.number().int().min(0),
    issues: z.number().int().min(0),
  }),
  seed: z.number().int().nonnegative(),
  options: z.object({
    createComments: z.boolean(),
    createAttachments: z.boolean(),
    createRelatedLinks: z.boolean(),
    createTags: z.boolean(),
    dryRun: z.boolean(),
    markerTag: z.string().min(1).default('SeededByMigratorTestApp'),
  }),
});

export type AppConfig = z.infer<typeof configSchema>;
