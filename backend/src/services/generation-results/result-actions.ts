import { Prisma, type GenerationResult, type Recording } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import type { GenerationResultResponse } from '../../types/api.js';
import { generationRejectReasons, type GenerationRejectReason } from '../../types/domain.js';
import { ApiError } from '../../utils/api-error.js';
import { generateWithLLM } from '../ai/llm-service.js';
import { getPromptVersion } from '../ai/prompt-version.js';
import { buildGenerationContext, buildGenerationPrompt } from '../recordings/default-generation.js';

type GenerationResultWithRecording = GenerationResult & {
  recording: Recording;
};

export interface GenerationResultContentUpdate {
  title?: string;
  contentText?: string;
  hasContentJson: boolean;
  contentJson?: unknown;
  hasConfirmedByUser: boolean;
  confirmedByUser?: boolean;
  confirmedAt?: Date | null;
}

export interface AuditContext {
  ip?: string | null;
  userAgent?: string | null;
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

export function toGenerationResultResponse(
  generationResult: GenerationResult,
): GenerationResultResponse {
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

export function isGenerationRejectReason(value: string | null): value is GenerationRejectReason {
  return Boolean(value && generationRejectReasons.includes(value as GenerationRejectReason));
}

function toPrismaJson(value: unknown): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

function buildConfirmationUpdate(input: {
  generationResult: GenerationResult;
  hasConfirmedByUser: boolean;
  confirmedByUser?: boolean;
  confirmedAt?: Date | null;
}): Pick<Prisma.GenerationResultUpdateInput, 'confirmedByUser' | 'confirmedAt'> {
  if (!input.hasConfirmedByUser) {
    return {};
  }

  if (!input.confirmedByUser) {
    return {
      confirmedByUser: false,
      confirmedAt: null,
    };
  }

  return {
    confirmedByUser: true,
    confirmedAt: input.confirmedAt ?? input.generationResult.confirmedAt ?? new Date(),
  };
}

export async function findGenerationResultForCurrentUser(input: {
  generationResultId: string;
  userId: string;
  recordingId?: string;
}): Promise<GenerationResult> {
  const generationResult = await prisma.generationResult.findFirst({
    where: {
      id: input.generationResultId,
      recordingId: input.recordingId,
      userId: input.userId,
      deletedAt: null,
      recording: {
        deletedAt: null,
      },
    },
  });

  if (!generationResult) {
    throw new ApiError(404, 'GENERATION_RESULT_NOT_FOUND', '生成结果不存在或无权访问');
  }

  return generationResult;
}

async function findGenerationResultWithRecordingForCurrentUser(input: {
  generationResultId: string;
  userId: string;
}): Promise<GenerationResultWithRecording> {
  const generationResult = await prisma.generationResult.findFirst({
    where: {
      id: input.generationResultId,
      userId: input.userId,
      deletedAt: null,
      recording: {
        deletedAt: null,
      },
    },
    include: {
      recording: true,
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

export async function saveGenerationResultContent(input: {
  generationResultId: string;
  userId: string;
  recordingId?: string;
  update: GenerationResultContentUpdate;
  audit?: AuditContext;
}): Promise<GenerationResult> {
  const generationResult = await findGenerationResultForCurrentUser({
    generationResultId: input.generationResultId,
    userId: input.userId,
    recordingId: input.recordingId,
  });
  const data: Prisma.GenerationResultUpdateInput = {
    status: 'saved',
    ...buildConfirmationUpdate({
      generationResult,
      hasConfirmedByUser: input.update.hasConfirmedByUser,
      confirmedByUser: input.update.confirmedByUser,
      confirmedAt: input.update.confirmedAt,
    }),
  };

  if (input.update.title) {
    data.title = input.update.title;
  }

  if (typeof input.update.contentText === 'string') {
    data.contentText = input.update.contentText;
  }

  if (input.update.hasContentJson) {
    data.contentJson = toPrismaJson(input.update.contentJson);
  }

  return prisma.$transaction(async (tx) => {
    const updatedGenerationResult = await tx.generationResult.update({
      where: {
        id: generationResult.id,
      },
      data,
    });

    await tx.auditLog.create({
      data: {
        userId: input.userId,
        action: 'generation_result.update',
        targetType: 'generation_result',
        targetId: generationResult.id,
        beforeData: toAuditGenerationResult(generationResult),
        afterData: toAuditGenerationResult(updatedGenerationResult),
        ip: input.audit?.ip ?? null,
        userAgent: input.audit?.userAgent ?? null,
      },
    });

    return updatedGenerationResult;
  });
}

export async function applyGenerationFeedback(input: {
  generationResultId: string;
  userId: string;
  recordingId?: string;
  action: 'adopt' | 'reject';
  reason: string | null;
  customReason: string | null;
  audit?: AuditContext;
}): Promise<GenerationResult> {
  if (input.action === 'reject' && !isGenerationRejectReason(input.reason)) {
    throw new ApiError(400, 'GENERATION_REJECT_REASON_REQUIRED', '不采纳时必须提交有效 reason', {
      allowedReasons: generationRejectReasons,
    });
  }

  const generationResult = await findGenerationResultForCurrentUser({
    generationResultId: input.generationResultId,
    userId: input.userId,
    recordingId: input.recordingId,
  });
  const now = new Date();
  const nextStatus = input.action === 'adopt' ? 'adopted' : 'rejected';

  return prisma.$transaction(async (tx) => {
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
        ip: input.audit?.ip ?? null,
        userAgent: input.audit?.userAgent ?? null,
      },
    });

    return updatedGenerationResult;
  });
}

export async function regenerateGenerationResult(input: {
  generationResultId: string;
  userId: string;
  reason: string | null;
  customReason: string | null;
  audit?: AuditContext;
}): Promise<GenerationResult> {
  const generationResult = await findGenerationResultWithRecordingForCurrentUser({
    generationResultId: input.generationResultId,
    userId: input.userId,
  });

  if (!generationResult.recording.transcriptText?.trim()) {
    throw new ApiError(409, 'RECORDING_TRANSCRIPT_REQUIRED', '录音还没有转写文本，暂不能重新生成');
  }

  const user = await findActiveUser(input.userId);
  const context = await buildGenerationContext({
    recording: generationResult.recording,
    user,
  });

  await prisma.generationResult.update({
    where: {
      id: generationResult.id,
    },
    data: {
      moduleStatus: 'generating',
    },
  });

  try {
    const generated = await generateWithLLM(
      {
        prompt: buildGenerationPrompt(generationResult.resultType),
        context,
        generationType: generationResult.resultType,
      },
      {
        userId: input.userId,
        recordingId: generationResult.recordingId,
        generationResultId: generationResult.id,
        promptVersion: getPromptVersion(generationResult.resultType),
      },
    );

    return prisma.$transaction(async (tx) => {
      const updatedGenerationResult = await tx.generationResult.update({
        where: {
          id: generationResult.id,
        },
        data: {
          contentJson: toPrismaJson(generated.contentJson),
          contentText: generated.contentText,
          moduleStatus: 'completed',
          status: 'regenerated',
          version: {
            increment: 1,
          },
          confirmedByUser: false,
          confirmedAt: null,
        },
      });

      await tx.generationFeedback.create({
        data: {
          generationResultId: generationResult.id,
          userId: input.userId,
          action: 'regenerate',
          reason: input.reason,
          customReason: input.customReason,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: input.userId,
          action: 'generation_result.regenerate',
          targetType: 'generation_result',
          targetId: generationResult.id,
          beforeData: toAuditGenerationResult(generationResult),
          afterData: toAuditGenerationResult(updatedGenerationResult),
          ip: input.audit?.ip ?? null,
          userAgent: input.audit?.userAgent ?? null,
        },
      });

      return updatedGenerationResult;
    });
  } catch (error) {
    await prisma.generationResult.update({
      where: {
        id: generationResult.id,
      },
      data: {
        moduleStatus: 'failed',
      },
    });

    throw error;
  }
}

export async function deleteGenerationResult(input: {
  generationResultId: string;
  userId: string;
  audit?: AuditContext;
}): Promise<GenerationResult> {
  const generationResult = await findGenerationResultForCurrentUser({
    generationResultId: input.generationResultId,
    userId: input.userId,
  });
  const deletedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const deletedGenerationResult = await tx.generationResult.update({
      where: {
        id: generationResult.id,
      },
      data: {
        deletedAt,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: input.userId,
        action: 'generation_result.delete',
        targetType: 'generation_result',
        targetId: generationResult.id,
        beforeData: toAuditGenerationResult(generationResult),
        afterData: toAuditGenerationResult(deletedGenerationResult),
        ip: input.audit?.ip ?? null,
        userAgent: input.audit?.userAgent ?? null,
      },
    });

    return deletedGenerationResult;
  });
}
