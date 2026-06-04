import { env } from '../../config/env.js';
import type { LLMProviderName, TranscriptionProviderName } from '../../types/domain.js';
import { ApiError } from '../../utils/api-error.js';
import { createMockGenerationData } from './mock-data.js';
import type {
  LLMGenerationInput,
  LLMGenerationOutput,
  LLMProvider,
  TranscriptionInput,
  TranscriptionOutput,
  TranscriptionProvider,
} from './types.js';

function estimateTokens(value: string): number {
  return Math.max(1, Math.ceil(value.length / 2));
}

class MockTranscriptionProvider implements TranscriptionProvider {
  public readonly name = 'mock' as const;

  public constructor(public readonly modelName: string) {}

  public async transcribe(input: TranscriptionInput): Promise<TranscriptionOutput> {
    if (input.forceFailure) {
      throw new ApiError(502, 'MOCK_TRANSCRIPTION_FAILED', 'Mock 转写失败，用于验证失败重试流程');
    }

    return {
      transcriptText: [
        `【Mock 转写】录音 ${input.recordingId} 已完成转写。`,
        '医生：小布这几天抓挠频率有没有比之前少一点？',
        '宠主：有少一些，但晚上偶尔还是会挠，我担心是不是又复发。',
        '医生：目前看更像恢复期的轻度刺激，继续按原方案用药，注意观察红肿、渗出和精神食欲。',
        '宠主：那我三天后再跟你们反馈一下。',
      ].join('\n'),
      detectedSpeakers: ['医生', '宠主'],
      duration: 128,
    };
  }
}

class UnsupportedTranscriptionProvider implements TranscriptionProvider {
  public constructor(
    public readonly name: TranscriptionProviderName,
    public readonly modelName: string,
  ) {}

  public async transcribe(): Promise<TranscriptionOutput> {
    throw new ApiError(
      501,
      'TRANSCRIPTION_PROVIDER_NOT_IMPLEMENTED',
      `转写 provider ${this.name} 已预留，当前尚未接入真实服务`,
    );
  }
}

class MockLLMProvider implements LLMProvider {
  public readonly name = 'mock' as const;

  public constructor(public readonly modelName: string) {}

  public async generate(input: LLMGenerationInput): Promise<LLMGenerationOutput> {
    const startedAt = Date.now();
    const mockData = createMockGenerationData(input.generationType);
    const contextText =
      typeof input.context === 'string' ? input.context : JSON.stringify(input.context ?? {});
    const inputTokens = estimateTokens(`${input.prompt}\n${contextText}`);
    const outputTokens = estimateTokens(mockData.contentText);

    return {
      contentJson: mockData.contentJson,
      contentText: mockData.contentText,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      latency: Math.max(1, Date.now() - startedAt),
    };
  }
}

class UnsupportedLLMProvider implements LLMProvider {
  public constructor(
    public readonly name: LLMProviderName,
    public readonly modelName: string,
  ) {}

  public async generate(): Promise<LLMGenerationOutput> {
    throw new ApiError(
      501,
      'LLM_PROVIDER_NOT_IMPLEMENTED',
      `LLM provider ${this.name} 已预留，当前尚未接入真实服务`,
    );
  }
}

export function createTranscriptionProvider(
  providerName = env.transcriptionProvider,
): TranscriptionProvider {
  if (providerName === 'mock') {
    return new MockTranscriptionProvider(env.transcriptionModelName);
  }

  return new UnsupportedTranscriptionProvider(providerName, env.transcriptionModelName);
}

export function createLLMProvider(providerName = env.llmProvider): LLMProvider {
  if (providerName === 'mock') {
    return new MockLLMProvider(env.llmModelName);
  }

  return new UnsupportedLLMProvider(providerName, env.llmModelName);
}
