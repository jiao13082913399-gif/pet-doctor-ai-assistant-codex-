import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';

export interface AiCallLogInput {
  userId?: string;
  recordingId?: string;
  generationResultId?: string;
  callType: 'transcription' | 'generation';
  provider: string;
  modelName: string;
  promptVersion?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  status: 'success' | 'failed';
  errorMessage?: string;
  estimatedCost?: string;
}

export async function logAiCall(input: AiCallLogInput): Promise<void> {
  await prisma.aiCallLog.create({
    data: {
      userId: input.userId,
      recordingId: input.recordingId,
      generationResultId: input.generationResultId,
      callType: input.callType,
      provider: input.provider,
      modelName: input.modelName,
      promptVersion: input.promptVersion,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      latencyMs: input.latencyMs,
      status: input.status,
      errorMessage: input.errorMessage,
      estimatedCost: input.estimatedCost ? new Prisma.Decimal(input.estimatedCost) : undefined,
    },
  });
}
