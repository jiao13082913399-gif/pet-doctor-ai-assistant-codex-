import type {
  GenerationResultType,
  LLMProviderName,
  PromptVersion,
  TranscriptionProviderName,
} from '../../types/domain.js';

export interface TranscriptionInput {
  recordingId: string;
  audioFilePath: string;
  audioFormat: string;
  forceFailure?: boolean;
}

export interface TranscriptionOutput {
  transcriptText: string;
  detectedSpeakers?: string[];
  duration?: number;
}

export interface TranscriptionProvider {
  readonly name: TranscriptionProviderName;
  readonly modelName: string;
  transcribe(input: TranscriptionInput): Promise<TranscriptionOutput>;
}

export interface LLMGenerationInput {
  prompt: string;
  context?: unknown;
  modelName?: string;
  generationType: GenerationResultType;
}

export interface LLMTokens {
  input: number;
  output: number;
  total: number;
}

export interface LLMGenerationOutput {
  contentJson: unknown;
  contentText: string;
  tokens: LLMTokens;
  latency: number;
}

export interface LLMProvider {
  readonly name: LLMProviderName;
  readonly modelName: string;
  generate(input: LLMGenerationInput): Promise<LLMGenerationOutput>;
}

export interface TranscriptionCallOptions {
  userId?: string;
}

export interface LLMCallOptions {
  userId?: string;
  recordingId?: string;
  generationResultId?: string;
  promptVersion?: PromptVersion;
}
