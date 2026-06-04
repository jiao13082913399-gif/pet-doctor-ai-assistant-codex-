import { createTranscriptionProvider } from './providers.js';
import { logAiCall } from './ai-call-logger.js';
import type { TranscriptionCallOptions, TranscriptionInput, TranscriptionOutput } from './types.js';

export async function transcribeAudio(
  input: TranscriptionInput,
  options: TranscriptionCallOptions = {},
): Promise<TranscriptionOutput> {
  const provider = createTranscriptionProvider();
  const startedAt = Date.now();

  try {
    const result = await provider.transcribe(input);
    await logAiCall({
      userId: options.userId,
      recordingId: input.recordingId,
      callType: 'transcription',
      provider: provider.name,
      modelName: provider.modelName,
      latencyMs: Date.now() - startedAt,
      status: 'success',
    });

    return result;
  } catch (error) {
    await logAiCall({
      userId: options.userId,
      recordingId: input.recordingId,
      callType: 'transcription',
      provider: provider.name,
      modelName: provider.modelName,
      latencyMs: Date.now() - startedAt,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown transcription error',
    });

    throw error;
  }
}
