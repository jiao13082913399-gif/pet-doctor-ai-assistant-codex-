import { createLLMProvider } from './providers.js';
import { logAiCall } from './ai-call-logger.js';
import { getPromptVersion } from './prompt-version.js';
import type { LLMCallOptions, LLMGenerationInput, LLMGenerationOutput } from './types.js';

export async function generateWithLLM(
  input: LLMGenerationInput,
  options: LLMCallOptions = {},
): Promise<LLMGenerationOutput> {
  const provider = createLLMProvider();
  const promptVersion = options.promptVersion ?? getPromptVersion(input.generationType);
  const startedAt = Date.now();

  try {
    const result = await provider.generate({
      ...input,
      modelName: input.modelName ?? provider.modelName,
    });

    await logAiCall({
      userId: options.userId,
      recordingId: options.recordingId,
      generationResultId: options.generationResultId,
      callType: 'generation',
      provider: provider.name,
      modelName: input.modelName ?? provider.modelName,
      promptVersion,
      inputTokens: result.tokens.input,
      outputTokens: result.tokens.output,
      latencyMs: result.latency,
      status: 'success',
    });

    return result;
  } catch (error) {
    await logAiCall({
      userId: options.userId,
      recordingId: options.recordingId,
      generationResultId: options.generationResultId,
      callType: 'generation',
      provider: provider.name,
      modelName: input.modelName ?? provider.modelName,
      promptVersion,
      latencyMs: Date.now() - startedAt,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown generation error',
    });

    throw error;
  }
}
