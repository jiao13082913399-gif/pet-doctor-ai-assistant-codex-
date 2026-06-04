import { Router } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { getPromptVersion } from '../services/ai/prompt-version.js';
import { generateWithLLM } from '../services/ai/llm-service.js';
import { transcribeAudio } from '../services/ai/transcription-service.js';
import type { MockGenerationResponse, MockTranscriptionResponse } from '../types/api.js';
import { generationResultTypes } from '../types/domain.js';
import type { GenerationResultType } from '../types/domain.js';
import { ApiError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';

export const aiRouter = Router();

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readGenerationType(value: unknown): GenerationResultType | null {
  if (typeof value !== 'string') {
    return null;
  }

  if (!generationResultTypes.includes(value as GenerationResultType)) {
    return null;
  }

  return value as GenerationResultType;
}

aiRouter.post('/ai/transcriptions', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;
    const recordingId = readString(req.body?.recordingId ?? req.body?.recording_id);
    const audioFilePath = readString(req.body?.audioFilePath ?? req.body?.audio_file_path);
    const audioFormat = readString(req.body?.audioFormat ?? req.body?.audio_format);

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    if (!recordingId || !audioFilePath || !audioFormat) {
      throw new ApiError(
        400,
        'INVALID_TRANSCRIPTION_PAYLOAD',
        'recordingId、audioFilePath、audioFormat 不能为空',
      );
    }

    const recording = await prisma.recording.findFirst({
      where: {
        id: recordingId,
        userId: currentUser.id,
        deletedAt: null,
      },
    });

    if (!recording) {
      throw new ApiError(404, 'RECORDING_NOT_FOUND', '录音不存在或无权访问');
    }

    const result = await transcribeAudio(
      {
        recordingId,
        audioFilePath,
        audioFormat,
      },
      {
        userId: currentUser.id,
      },
    );

    await prisma.recording.update({
      where: { id: recordingId },
      data: {
        transcriptText: result.transcriptText,
        audioDuration: result.duration,
        processingStatus: 'completed',
      },
    });

    sendSuccess<MockTranscriptionResponse>(res, {
      provider: env.transcriptionProvider,
      modelName: env.transcriptionModelName,
      recordingId,
      transcriptText: result.transcriptText,
      detectedSpeakers: result.detectedSpeakers ?? [],
      duration: result.duration ?? null,
    });
  } catch (error) {
    next(error);
  }
});

aiRouter.post('/ai/generations', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;
    const prompt = readString(req.body?.prompt);
    const generationType = readGenerationType(
      req.body?.generationType ?? req.body?.generation_type,
    );
    const modelName = readString(req.body?.modelName ?? req.body?.model_name);
    const recordingId = readString(req.body?.recordingId ?? req.body?.recording_id);
    const generationResultId = readString(
      req.body?.generationResultId ?? req.body?.generation_result_id,
    );

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    if (!prompt || !generationType) {
      throw new ApiError(
        400,
        'INVALID_GENERATION_PAYLOAD',
        'prompt 和 generationType 不能为空，generationType 必须是已支持的生成类型',
      );
    }

    if (recordingId) {
      const recording = await prisma.recording.findFirst({
        where: {
          id: recordingId,
          userId: currentUser.id,
          deletedAt: null,
        },
      });

      if (!recording) {
        throw new ApiError(404, 'RECORDING_NOT_FOUND', '录音不存在或无权访问');
      }
    }

    if (generationResultId) {
      const generationResult = await prisma.generationResult.findFirst({
        where: {
          id: generationResultId,
          userId: currentUser.id,
          deletedAt: null,
        },
      });

      if (!generationResult) {
        throw new ApiError(404, 'GENERATION_RESULT_NOT_FOUND', '生成结果不存在或无权访问');
      }
    }

    const promptVersion = getPromptVersion(generationType);
    const result = await generateWithLLM(
      {
        prompt,
        context: req.body?.context,
        modelName: modelName ?? undefined,
        generationType,
      },
      {
        userId: currentUser.id,
        recordingId: recordingId ?? undefined,
        generationResultId: generationResultId ?? undefined,
        promptVersion,
      },
    );

    sendSuccess<MockGenerationResponse>(res, {
      provider: env.llmProvider,
      modelName: modelName ?? env.llmModelName,
      generationType,
      promptVersion,
      contentJson: result.contentJson,
      contentText: result.contentText,
      tokens: result.tokens,
      latency: result.latency,
    });
  } catch (error) {
    next(error);
  }
});
