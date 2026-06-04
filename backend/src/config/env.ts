import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { llmProviders, transcriptionProviders } from '../types/domain.js';
import type { LLMProviderName, TranscriptionProviderName } from '../types/domain.js';

dotenv.config({ path: resolve(process.cwd(), '../.env') });
dotenv.config();

export interface AppEnv {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  localStorageDir: string;
  maxAudioSizeMb: number;
  maxAudioDurationSeconds: number;
  transcriptionProvider: TranscriptionProviderName;
  transcriptionModelName: string;
  llmProvider: LLMProviderName;
  llmModelName: string;
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? 3000);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  return port;
}

function parsePositiveNumber(value: string | undefined, fallback: number, envName: string): number {
  const parsedValue = Number(value ?? fallback);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`${envName} must be a positive number`);
  }

  return parsedValue;
}

function parseEnumValue<T extends readonly string[]>(
  value: string | undefined,
  allowedValues: T,
  fallback: T[number],
  envName: string,
): T[number] {
  const parsedValue = value ?? fallback;

  if (!allowedValues.includes(parsedValue)) {
    throw new Error(`${envName} must be one of: ${allowedValues.join(', ')}`);
  }

  return parsedValue;
}

export const env: AppEnv = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parsePort(process.env.PORT),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL ?? 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  localStorageDir: process.env.LOCAL_STORAGE_DIR ?? './storage/private',
  maxAudioSizeMb: parsePositiveNumber(process.env.MAX_AUDIO_SIZE_MB, 100, 'MAX_AUDIO_SIZE_MB'),
  maxAudioDurationSeconds: parsePositiveNumber(
    process.env.MAX_AUDIO_DURATION_SECONDS,
    1800,
    'MAX_AUDIO_DURATION_SECONDS',
  ),
  transcriptionProvider: parseEnumValue(
    process.env.TRANSCRIPTION_PROVIDER,
    transcriptionProviders,
    'mock',
    'TRANSCRIPTION_PROVIDER',
  ),
  transcriptionModelName: process.env.TRANSCRIPTION_MODEL_NAME ?? 'mock-transcription-v1',
  llmProvider: parseEnumValue(process.env.LLM_PROVIDER, llmProviders, 'mock', 'LLM_PROVIDER'),
  llmModelName: process.env.LLM_MODEL_NAME ?? 'mock-llm-v1',
};

if (!env.jwtSecret) {
  throw new Error('JWT_SECRET is required');
}
