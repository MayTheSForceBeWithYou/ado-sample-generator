import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { configSchema, type AppConfig } from '../models/config.js';

export const loadConfig = async (configPath: string): Promise<AppConfig> => {
  const fullPath = resolve(configPath);
  const raw = await readFile(fullPath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  return configSchema.parse(parsed);
};

export const resolvePatToken = (config: AppConfig): string => {
  const token = process.env[config.auth.tokenEnvVar];
  if (!token) {
    throw new Error(`Missing Azure DevOps PAT in env var ${config.auth.tokenEnvVar}`);
  }
  return token;
};
