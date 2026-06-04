import { Prisma, type GenerationResult, type Memory, type Recording } from '@prisma/client';
import { Router } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import {
  parseAudioUploadRequest,
  readUploadField,
  resolveStoredAudioFilePath,
  storeAudioFile,
  type ParsedAudioUpload,
} from '../services/recordings/audio-upload.js';
import {
  generateDefaultResultsForRecording,
  generateSingleProactiveResultForRecording,
} from '../services/recordings/default-generation.js';
import { transcribeAudio } from '../services/ai/transcription-service.js';
import type {
  GenerationResultResponse,
  RecordingDefaultGenerationResponse,
  RecordingDetailResponse,
  RecordingBindingUpdateResponse,
  RecordingListItemResponse,
  RecordingProactiveGenerationResponse,
  RecordingResponse,
  RecordingTranscriptResponse,
  RecordingTranscriptionResponse,
} from '../types/api.js';
import { generationRejectReasons, type GenerationRejectReason } from '../types/domain.js';
import { ApiError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';

export const recordingsRouter = Router();

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function readObject(value: unknown): Record<string, unknown> | null {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toRecordingResponse(recording: Recording): RecordingResponse {
  return {
    id: recording.id,
    userId: recording.userId,
    storeId: recording.storeId,
    audioUrl: recording.audioUrl,
    audioFormat: recording.audioFormat,
    audioDuration: recording.audioDuration,
    uploadType: recording.uploadType,
    transcriptText: recording.transcriptText,
    aiDetectedScene: recording.aiDetectedScene,
    processingStatus: recording.processingStatus,
    petOwnerName: recording.petOwnerName,
    petName: recording.petName,
    errorMessage: recording.errorMessage,
    createdAt: recording.createdAt.toISOString(),
    updatedAt: recording.updatedAt.toISOString(),
    deletedAt: recording.deletedAt?.toISOString() ?? null,
  };
}

function toAuditRecording(recording: Recording): Prisma.InputJsonObject {
  return {
    id: recording.id,
    userId: recording.userId,
    storeId: recording.storeId,
    audioUrl: recording.audioUrl,
    audioFormat: recording.audioFormat,
    audioDuration: recording.audioDuration,
    uploadType: recording.uploadType,
    transcriptText: recording.transcriptText,
    aiDetectedScene: recording.aiDetectedScene,
    processingStatus: recording.processingStatus,
    petOwnerName: recording.petOwnerName,
    petName: recording.petName,
    errorMessage: recording.errorMessage,
    createdAt: recording.createdAt.toISOString(),
    updatedAt: recording.updatedAt.toISOString(),
    deletedAt: recording.deletedAt?.toISOString() ?? null,
  };
}

function toAuditGenerationResult(generationResult: GenerationResult): Prisma.InputJsonObject {
  return {
    id: generationResult.id,
    recordingId: generationResult.recordingId,
    userId: generationResult.userId,
    resultType: generationResult.resultType,
    title: generationResult.title,
    contentJson:
      generationResult.contentJson === null
        ? null
        : (generationResult.contentJson as Prisma.JsonValue),
    contentText: generationResult.contentText,
    moduleStatus: generationResult.moduleStatus,
    status: generationResult.status,
    isDefaultGenerated: generationResult.isDefaultGenerated,
    version: generationResult.version,
    confirmedByUser: generationResult.confirmedByUser,
    confirmedAt: generationResult.confirmedAt?.toISOString() ?? null,
    createdAt: generationResult.createdAt.toISOString(),
    updatedAt: generationResult.updatedAt.toISOString(),
    deletedAt: generationResult.deletedAt?.toISOString() ?? null,
  };
}

function toRecordingListItem(recording: Recording): RecordingListItemResponse {
  return {
    ...toRecordingResponse(recording),
    transcriptText: recording.transcriptText ? recording.transcriptText.slice(0, 200) : null,
  };
}

function toRecordingTranscriptResponse(recording: Recording): RecordingTranscriptResponse {
  return {
    recordingId: recording.id,
    transcriptText: recording.transcriptText,
    processingStatus: recording.processingStatus,
    errorMessage: recording.errorMessage,
    updatedAt: recording.updatedAt.toISOString(),
  };
}

function toGenerationResultResponse(generationResult: GenerationResult) {
  return {
    id: generationResult.id,
    recordingId: generationResult.recordingId,
    userId: generationResult.userId,
    resultType: generationResult.resultType,
    title: generationResult.title,
    contentJson: generationResult.contentJson,
    contentText: generationResult.contentText,
    moduleStatus: generationResult.moduleStatus,
    status: generationResult.status,
    isDefaultGenerated: generationResult.isDefaultGenerated,
    version: generationResult.version,
    confirmedByUser: generationResult.confirmedByUser,
    confirmedAt: generationResult.confirmedAt?.toISOString() ?? null,
    createdAt: generationResult.createdAt.toISOString(),
    updatedAt: generationResult.updatedAt.toISOString(),
  };
}

function toMemoryBindingResponse(memory: Memory) {
  return {
    id: memory.id,
    memoryType: memory.memoryType,
    title: memory.title,
    petOwnerName: memory.petOwnerName,
    petName: memory.petName,
    status: memory.status,
    createdAt: memory.createdAt.toISOString(),
    updatedAt: memory.updatedAt.toISOString(),
  };
}

function readUploadType(upload: ParsedAudioUpload): string {
  return readUploadField(upload.fields, 'uploadType', 'upload_type') ?? 'web_upload';
}

function readPetOwnerName(upload: ParsedAudioUpload): string | null {
  return readUploadField(upload.fields, 'petOwnerName', 'pet_owner_name');
}

function readPetName(upload: ParsedAudioUpload): string | null {
  return readUploadField(upload.fields, 'petName', 'pet_name');
}

async function findRecordingForCurrentUser(
  recordingId: string,
  userId: string,
): Promise<Recording> {
  const recording = await prisma.recording.findFirst({
    where: {
      id: recordingId,
      userId,
      deletedAt: null,
    },
  });

  if (!recording) {
    throw new ApiError(404, 'RECORDING_NOT_FOUND', '录音不存在或无权访问');
  }

  return recording;
}

async function findGenerationResultForCurrentUser(input: {
  recordingId: string;
  generationResultId: string;
  userId: string;
}): Promise<GenerationResult> {
  const generationResult = await prisma.generationResult.findFirst({
    where: {
      id: input.generationResultId,
      recordingId: input.recordingId,
      userId: input.userId,
      deletedAt: null,
    },
  });

  if (!generationResult) {
    throw new ApiError(404, 'GENERATION_RESULT_NOT_FOUND', '生成结果不存在或无权访问');
  }

  return generationResult;
}

async function findActiveUser(userId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      status: 'active',
    },
  });

  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', '登录已过期，请重新登录');
  }

  return user;
}

recordingsRouter.post('/recordings/upload', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const upload = await parseAudioUploadRequest(req);
    const storedAudio = await storeAudioFile(currentUser.id, upload);
    const recording = await prisma.recording.create({
      data: {
        userId: currentUser.id,
        storeId: currentUser.currentStoreId,
        audioUrl: storedAudio.audioUrl,
        audioFormat: upload.file.format,
        audioDuration: upload.durationSeconds,
        uploadType: readUploadType(upload),
        processingStatus: 'uploaded',
        petOwnerName: readPetOwnerName(upload),
        petName: readPetName(upload),
      },
    });

    sendSuccess<RecordingResponse>(res, toRecordingResponse(recording), 201);
  } catch (error) {
    next(error);
  }
});

recordingsRouter.post('/recordings/start', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const recording = await prisma.recording.create({
      data: {
        userId: currentUser.id,
        storeId: currentUser.currentStoreId,
        audioUrl: `internal://pending/recordings/${currentUser.id}/${Date.now()}`,
        audioFormat: readString(req.body?.audioFormat ?? req.body?.audio_format),
        audioDuration: null,
        uploadType: readString(req.body?.uploadType ?? req.body?.upload_type) ?? 'web_recording',
        processingStatus: 'uploading',
        petOwnerName: readString(req.body?.petOwnerName ?? req.body?.pet_owner_name),
        petName: readString(req.body?.petName ?? req.body?.pet_name),
      },
    });

    sendSuccess<RecordingResponse>(res, toRecordingResponse(recording), 201);
  } catch (error) {
    next(error);
  }
});

recordingsRouter.post('/recordings/finish', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const contentType = req.headers['content-type'] ?? '';
    const hasJsonAudioPayload = Boolean(req.body?.audioBase64 ?? req.body?.audio_base64);
    if (contentType.includes('application/json') && !hasJsonAudioPayload) {
      const recordingId = readString(req.body?.recordingId ?? req.body?.recording_id);
      if (!recordingId) {
        throw new ApiError(400, 'INVALID_RECORDING_FINISH_PAYLOAD', 'recordingId 不能为空');
      }

      const recording = await findRecordingForCurrentUser(recordingId, currentUser.id);
      const durationSecondsRaw = req.body?.durationSeconds ?? req.body?.duration_seconds;
      const durationSeconds =
        typeof durationSecondsRaw === 'number' && Number.isFinite(durationSecondsRaw)
          ? Math.round(durationSecondsRaw)
          : null;

      if (durationSeconds !== null && durationSeconds <= 0) {
        throw new ApiError(400, 'INVALID_AUDIO_DURATION', '音频时长必须是正数秒');
      }

      if (durationSeconds !== null && durationSeconds > env.maxAudioDurationSeconds) {
        throw new ApiError(
          413,
          'AUDIO_DURATION_TOO_LONG',
          `音频时长不能超过 ${env.maxAudioDurationSeconds} 秒`,
          {
            maxAudioDurationSeconds: env.maxAudioDurationSeconds,
            durationSeconds,
          },
        );
      }

      if (recording.audioUrl.startsWith('internal://pending/')) {
        throw new ApiError(
          400,
          'AUDIO_FILE_REQUIRED',
          '该录音尚未上传音频文件，finish 时请携带音频文件',
        );
      }

      const updatedRecording = await prisma.recording.update({
        where: { id: recording.id },
        data: {
          audioDuration: durationSeconds ?? recording.audioDuration,
          processingStatus: 'uploaded',
          errorMessage: null,
        },
      });

      sendSuccess<RecordingResponse>(res, toRecordingResponse(updatedRecording));
      return;
    }

    const upload = await parseAudioUploadRequest(req);
    const recordingId = readUploadField(upload.fields, 'recordingId', 'recording_id');
    if (!recordingId) {
      throw new ApiError(400, 'INVALID_RECORDING_FINISH_PAYLOAD', 'recordingId 不能为空');
    }

    const recording = await findRecordingForCurrentUser(recordingId, currentUser.id);
    const storedAudio = await storeAudioFile(currentUser.id, upload);
    const updatedRecording = await prisma.recording.update({
      where: { id: recording.id },
      data: {
        audioUrl: storedAudio.audioUrl,
        audioFormat: upload.file.format,
        audioDuration: upload.durationSeconds,
        uploadType: readUploadType(upload),
        processingStatus: 'uploaded',
        petOwnerName: readPetOwnerName(upload) ?? recording.petOwnerName,
        petName: readPetName(upload) ?? recording.petName,
        errorMessage: null,
      },
    });

    sendSuccess<RecordingResponse>(res, toRecordingResponse(updatedRecording));
  } catch (error) {
    next(error);
  }
});

recordingsRouter.get('/recordings', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const recordings = await prisma.recording.findMany({
      where: {
        userId: currentUser.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    sendSuccess<RecordingListItemResponse[]>(res, recordings.map(toRecordingListItem));
  } catch (error) {
    next(error);
  }
});

recordingsRouter.put('/recordings/:id', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const recording = await findRecordingForCurrentUser(req.params.id, currentUser.id);
    const petOwnerName = req.body?.petOwnerName ?? req.body?.pet_owner_name;
    const petName = req.body?.petName ?? req.body?.pet_name;

    if (petOwnerName !== undefined && petOwnerName !== null && typeof petOwnerName !== 'string') {
      throw new ApiError(400, 'INVALID_RECORDING_BINDING_PAYLOAD', 'petOwnerName 必须是字符串');
    }

    if (petName !== undefined && petName !== null && typeof petName !== 'string') {
      throw new ApiError(400, 'INVALID_RECORDING_BINDING_PAYLOAD', 'petName 必须是字符串');
    }

    const updatedRecording = await prisma.recording.update({
      where: {
        id: recording.id,
      },
      data: {
        petOwnerName:
          typeof petOwnerName === 'string' ? petOwnerName.trim() || null : recording.petOwnerName,
        petName: typeof petName === 'string' ? petName.trim() || null : recording.petName,
      },
    });

    sendSuccess<RecordingBindingUpdateResponse>(res, {
      recording: toRecordingResponse(updatedRecording),
      petBinding: {
        petOwnerName: updatedRecording.petOwnerName,
        petName: updatedRecording.petName,
      },
    });
  } catch (error) {
    next(error);
  }
});

recordingsRouter.post('/recordings/:id/transcribe', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const recording = await findRecordingForCurrentUser(req.params.id, currentUser.id);
    if (recording.audioUrl.startsWith('internal://pending/') || !recording.audioFormat) {
      throw new ApiError(409, 'RECORDING_AUDIO_NOT_READY', '录音音频尚未上传完成，暂不能转写');
    }

    if (recording.processingStatus === 'transcribing') {
      throw new ApiError(409, 'RECORDING_TRANSCRIPTION_IN_PROGRESS', '该录音正在转写中');
    }

    const audioFilePath = resolveStoredAudioFilePath(recording.audioUrl);
    await prisma.recording.update({
      where: {
        id: recording.id,
      },
      data: {
        processingStatus: 'transcribing',
        errorMessage: null,
      },
    });

    try {
      const result = await transcribeAudio(
        {
          recordingId: recording.id,
          audioFilePath,
          audioFormat: recording.audioFormat,
          forceFailure: readBoolean(req.body?.forceFail ?? req.body?.force_fail),
        },
        {
          userId: currentUser.id,
        },
      );

      const updatedRecording = await prisma.recording.update({
        where: {
          id: recording.id,
        },
        data: {
          transcriptText: result.transcriptText,
          audioDuration: result.duration ?? recording.audioDuration,
          processingStatus: 'uploaded',
          errorMessage: null,
        },
      });

      sendSuccess<RecordingTranscriptionResponse>(res, {
        recording: toRecordingResponse(updatedRecording),
        transcript: toRecordingTranscriptResponse(updatedRecording),
        provider: env.transcriptionProvider,
        modelName: env.transcriptionModelName,
        detectedSpeakers: result.detectedSpeakers ?? [],
        duration: result.duration ?? null,
      });
    } catch (error) {
      await prisma.recording.update({
        where: {
          id: recording.id,
        },
        data: {
          processingStatus: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown transcription error',
        },
      });

      next(error);
    }
  } catch (error) {
    next(error);
  }
});

recordingsRouter.get('/recordings/:id/transcript', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const recording = await findRecordingForCurrentUser(req.params.id, currentUser.id);

    sendSuccess<RecordingTranscriptResponse>(res, toRecordingTranscriptResponse(recording));
  } catch (error) {
    next(error);
  }
});

recordingsRouter.put('/recordings/:id/transcript', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const transcriptText = req.body?.transcriptText ?? req.body?.transcript_text;
    if (typeof transcriptText !== 'string') {
      throw new ApiError(400, 'INVALID_TRANSCRIPT_PAYLOAD', 'transcriptText 必须是字符串');
    }

    const recording = await findRecordingForCurrentUser(req.params.id, currentUser.id);
    const updatedRecording = await prisma.recording.update({
      where: {
        id: recording.id,
      },
      data: {
        transcriptText,
        processingStatus: 'uploaded',
        errorMessage: null,
      },
    });

    sendSuccess<RecordingTranscriptResponse>(res, toRecordingTranscriptResponse(updatedRecording));
  } catch (error) {
    next(error);
  }
});

recordingsRouter.post(
  '/recordings/:id/generate-default-results',
  requireAuth,
  async (req, res, next) => {
    try {
      const currentUser = req.currentUser;

      if (!currentUser) {
        throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
      }

      const recording = await findRecordingForCurrentUser(req.params.id, currentUser.id);
      if (!recording.transcriptText?.trim()) {
        throw new ApiError(
          409,
          'RECORDING_TRANSCRIPT_REQUIRED',
          '录音还没有转写文本，暂不能生成默认结果',
        );
      }

      if (recording.processingStatus === 'transcribing') {
        throw new ApiError(409, 'RECORDING_TRANSCRIPTION_IN_PROGRESS', '该录音正在转写中');
      }

      if (recording.processingStatus === 'generating') {
        throw new ApiError(409, 'RECORDING_GENERATION_IN_PROGRESS', '该录音正在生成中');
      }

      const user = await findActiveUser(currentUser.id);
      const result = await generateDefaultResultsForRecording({
        recording,
        user,
      });

      sendSuccess<RecordingDefaultGenerationResponse>(res, {
        recording: toRecordingResponse(result.recording),
        generationResults: result.generationResults.map(toGenerationResultResponse),
        moduleResults: result.moduleResults.map((moduleResult) => ({
          generationResultId: moduleResult.generationResult.id,
          resultType: moduleResult.resultType,
          moduleStatus: moduleResult.moduleStatus,
          errorMessage: moduleResult.errorMessage,
        })),
        succeededTypes: result.succeededTypes,
        failedTypes: result.failedTypes,
        petBinding: {
          petOwnerName: result.petOwnerName,
          petName: result.petName,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

async function generateProactiveModule(input: {
  recordingId: string;
  userId: string;
  resultType: 'medical_risk_control' | 'team_knowledge';
}): Promise<RecordingProactiveGenerationResponse> {
  const recording = await findRecordingForCurrentUser(input.recordingId, input.userId);
  if (!recording.transcriptText?.trim()) {
    throw new ApiError(
      409,
      'RECORDING_TRANSCRIPT_REQUIRED',
      '录音还没有转写文本，暂不能生成主动模块',
    );
  }

  if (recording.processingStatus === 'transcribing') {
    throw new ApiError(409, 'RECORDING_TRANSCRIPTION_IN_PROGRESS', '该录音正在转写中');
  }

  if (recording.processingStatus === 'generating') {
    throw new ApiError(409, 'RECORDING_GENERATION_IN_PROGRESS', '该录音正在默认生成中');
  }

  const user = await findActiveUser(input.userId);
  const moduleResult = await generateSingleProactiveResultForRecording({
    recording,
    user,
    generationType: input.resultType,
  });

  return {
    generationResult: toGenerationResultResponse(moduleResult.generationResult),
    moduleResult: {
      generationResultId: moduleResult.generationResult.id,
      resultType: moduleResult.resultType,
      moduleStatus: moduleResult.moduleStatus,
      errorMessage: moduleResult.errorMessage,
    },
  };
}

recordingsRouter.post(
  '/recordings/:id/generate-risk-control',
  requireAuth,
  async (req, res, next) => {
    try {
      const currentUser = req.currentUser;

      if (!currentUser) {
        throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
      }

      const result = await generateProactiveModule({
        recordingId: req.params.id,
        userId: currentUser.id,
        resultType: 'medical_risk_control',
      });

      sendSuccess<RecordingProactiveGenerationResponse>(res, result);
    } catch (error) {
      next(error);
    }
  },
);

recordingsRouter.post(
  '/recordings/:id/generate-team-knowledge',
  requireAuth,
  async (req, res, next) => {
    try {
      const currentUser = req.currentUser;

      if (!currentUser) {
        throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
      }

      const result = await generateProactiveModule({
        recordingId: req.params.id,
        userId: currentUser.id,
        resultType: 'team_knowledge',
      });

      sendSuccess<RecordingProactiveGenerationResponse>(res, result);
    } catch (error) {
      next(error);
    }
  },
);

recordingsRouter.put(
  '/recordings/:id/generation-results/:resultId',
  requireAuth,
  async (req, res, next) => {
    try {
      const currentUser = req.currentUser;

      if (!currentUser) {
        throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
      }

      await findRecordingForCurrentUser(req.params.id, currentUser.id);
      const generationResult = await findGenerationResultForCurrentUser({
        recordingId: req.params.id,
        generationResultId: req.params.resultId,
        userId: currentUser.id,
      });
      const contentText = req.body?.contentText ?? req.body?.content_text;
      if (typeof contentText !== 'string') {
        throw new ApiError(400, 'INVALID_GENERATION_RESULT_PAYLOAD', 'contentText 必须是字符串');
      }

      const title = readString(req.body?.title) ?? generationResult.title;
      const contentJson = readObject(req.body?.contentJson ?? req.body?.content_json);
      const updatedGenerationResult = await prisma.$transaction(async (tx) => {
        const updated = await tx.generationResult.update({
          where: {
            id: generationResult.id,
          },
          data: {
            title,
            contentText,
            contentJson: contentJson
              ? (contentJson as Prisma.InputJsonValue)
              : generationResult.contentJson === null
                ? Prisma.JsonNull
                : (generationResult.contentJson as Prisma.InputJsonValue),
            status: 'saved',
          },
        });

        await tx.auditLog.create({
          data: {
            userId: currentUser.id,
            action: 'generation_result.update',
            targetType: 'generation_result',
            targetId: generationResult.id,
            beforeData: toAuditGenerationResult(generationResult),
            afterData: toAuditGenerationResult(updated),
            ip: req.ip,
            userAgent: req.headers['user-agent'] ?? null,
          },
        });

        return updated;
      });

      sendSuccess<GenerationResultResponse>(
        res,
        toGenerationResultResponse(updatedGenerationResult),
      );
    } catch (error) {
      next(error);
    }
  },
);

async function applyGenerationFeedback(input: {
  recordingId: string;
  generationResultId: string;
  userId: string;
  action: 'adopt' | 'reject';
  reason: string | null;
  customReason: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<GenerationResult> {
  if (
    input.action === 'reject' &&
    (!input.reason || !generationRejectReasons.includes(input.reason as GenerationRejectReason))
  ) {
    throw new ApiError(400, 'GENERATION_REJECT_REASON_REQUIRED', '不采纳时必须提交有效 reason', {
      allowedReasons: generationRejectReasons,
    });
  }

  await findRecordingForCurrentUser(input.recordingId, input.userId);
  const generationResult = await findGenerationResultForCurrentUser({
    recordingId: input.recordingId,
    generationResultId: input.generationResultId,
    userId: input.userId,
  });
  const nextStatus = input.action === 'adopt' ? 'adopted' : 'rejected';
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const updatedGenerationResult = await tx.generationResult.update({
      where: {
        id: generationResult.id,
      },
      data: {
        status: nextStatus,
        confirmedByUser: input.action === 'adopt',
        confirmedAt: input.action === 'adopt' ? now : null,
      },
    });

    await tx.generationFeedback.create({
      data: {
        generationResultId: generationResult.id,
        userId: input.userId,
        action: input.action,
        reason: input.reason,
        customReason: input.customReason,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: input.userId,
        action: `generation_result.${input.action}`,
        targetType: 'generation_result',
        targetId: generationResult.id,
        beforeData: toAuditGenerationResult(generationResult),
        afterData: toAuditGenerationResult(updatedGenerationResult),
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });

    return updatedGenerationResult;
  });

  return result;
}

recordingsRouter.post(
  '/recordings/:id/generation-results/:resultId/adopt',
  requireAuth,
  async (req, res, next) => {
    try {
      const currentUser = req.currentUser;

      if (!currentUser) {
        throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
      }

      const result = await applyGenerationFeedback({
        recordingId: req.params.id,
        generationResultId: req.params.resultId,
        userId: currentUser.id,
        action: 'adopt',
        reason: readString(req.body?.reason),
        customReason: readString(req.body?.customReason ?? req.body?.custom_reason),
        ip: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      });

      sendSuccess<GenerationResultResponse>(res, toGenerationResultResponse(result));
    } catch (error) {
      next(error);
    }
  },
);

recordingsRouter.post(
  '/recordings/:id/generation-results/:resultId/reject',
  requireAuth,
  async (req, res, next) => {
    try {
      const currentUser = req.currentUser;

      if (!currentUser) {
        throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
      }

      const result = await applyGenerationFeedback({
        recordingId: req.params.id,
        generationResultId: req.params.resultId,
        userId: currentUser.id,
        action: 'reject',
        reason: readString(req.body?.reason),
        customReason: readString(req.body?.customReason ?? req.body?.custom_reason),
        ip: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      });

      sendSuccess<GenerationResultResponse>(res, toGenerationResultResponse(result));
    } catch (error) {
      next(error);
    }
  },
);

recordingsRouter.get('/recordings/:id', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const recording = await prisma.recording.findFirst({
      where: {
        id: req.params.id,
        userId: currentUser.id,
        deletedAt: null,
      },
      include: {
        generationResults: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        memories: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
    });

    if (!recording) {
      throw new ApiError(404, 'RECORDING_NOT_FOUND', '录音不存在或无权访问');
    }

    sendSuccess<RecordingDetailResponse>(res, {
      recording: toRecordingResponse(recording),
      transcriptText: recording.transcriptText,
      petBinding: {
        petOwnerName: recording.petOwnerName,
        petName: recording.petName,
        memories: recording.memories.map(toMemoryBindingResponse),
      },
      generationResults: recording.generationResults.map(toGenerationResultResponse),
    });
  } catch (error) {
    next(error);
  }
});

recordingsRouter.delete('/recordings/:id', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const recording = await findRecordingForCurrentUser(req.params.id, currentUser.id);
    const deletedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const updatedRecording = await tx.recording.update({
        where: {
          id: recording.id,
        },
        data: {
          deletedAt,
        },
      });

      const auditLog = await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'recording.delete',
          targetType: 'recording',
          targetId: recording.id,
          beforeData: {
            ...toAuditRecording(recording),
          },
          afterData: toAuditRecording(updatedRecording),
          ip: req.ip,
          userAgent: req.headers['user-agent'] ?? null,
        },
      });

      return { updatedRecording, auditLog };
    });

    sendSuccess(res, {
      recording: toRecordingResponse(result.updatedRecording),
      auditLogId: result.auditLog.id,
    });
  } catch (error) {
    next(error);
  }
});

recordingsRouter.post('/recordings/:id/retry', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const recording = await findRecordingForCurrentUser(req.params.id, currentUser.id);
    const updatedRecording = await prisma.recording.update({
      where: {
        id: recording.id,
      },
      data: {
        processingStatus: 'uploaded',
        errorMessage: null,
      },
    });

    sendSuccess<RecordingResponse>(res, toRecordingResponse(updatedRecording));
  } catch (error) {
    next(error);
  }
});
