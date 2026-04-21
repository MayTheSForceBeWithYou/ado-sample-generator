export interface ApiFailure {
  stage: string;
  logicalId?: string;
  message: string;
}

export interface SeedReport {
  seed: number;
  dryRun: boolean;
  startedAtIso: string;
  elapsedMs: number;
  createdIdsByType: Record<string, number[]>;
  hierarchy: Array<{ childId: number; parentId: number }>;
  skippedItems: string[];
  failures: ApiFailure[];
}
