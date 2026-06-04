import { Prisma, type Memory, type MemoryUpdateSuggestion } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type {
  MemoryDetailResponse,
  MemoryResponse,
  MemorySuggestionResponse,
  MemorySuggestionsResponse,
} from '../types/api.js';
import { ApiError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';

const personalMemoryType = 'personal_memory';
const memoryTitle = '个人 Memory';

interface MemoryInitPayload {
  city: string;
  store: string;
  position: string;
  personalBackground: string;
  workScenarios: string[];
  commonTasks: string[];
  preferences: string;
}

export const memoryRouter = Router();

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const rawValue = readString(value);
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(/\n|,|，|;|；/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readInitPayload(body: unknown): MemoryInitPayload | null {
  const payload = body as Record<string, unknown> | undefined;
  const city = readString(payload?.city);
  const store = readString(payload?.store);
  const position = readString(payload?.position);
  const personalBackground = readString(
    payload?.personalBackground ?? payload?.personal_background,
  );
  const workScenarios = readStringList(payload?.workScenarios ?? payload?.work_scenarios);
  const commonTasks = readStringList(payload?.commonTasks ?? payload?.common_tasks);
  const preferences = readString(payload?.preferences);

  if (
    !city ||
    !store ||
    !position ||
    !personalBackground ||
    workScenarios.length === 0 ||
    commonTasks.length === 0 ||
    !preferences
  ) {
    return null;
  }

  return {
    city,
    store,
    position,
    personalBackground,
    workScenarios,
    commonTasks,
    preferences,
  };
}

function toMarkdownList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function buildPersonalMemoryMarkdown(payload: MemoryInitPayload): string {
  return [
    '# 个人 Memory',
    '',
    '## 基础信息',
    `- 城市：${payload.city}`,
    `- 门店：${payload.store}`,
    `- 岗位：${payload.position}`,
    '',
    '## 工作背景',
    `- 个人背景：${payload.personalBackground}`,
    '',
    '## 常见任务',
    toMarkdownList(payload.commonTasks),
    '',
    '## 沟通偏好',
    `- ${payload.preferences}`,
    '',
    '## 长期有效信息',
    toMarkdownList(payload.workScenarios.map((item) => `工作场景：${item}`)),
  ].join('\n');
}

function toMemoryResponse(memory: Memory): MemoryResponse {
  return {
    id: memory.id,
    userId: memory.userId,
    storeId: memory.storeId,
    memoryType: memory.memoryType,
    title: memory.title,
    contentJson: memory.contentJson,
    contentText: memory.contentText,
    status: memory.status,
    createdAt: memory.createdAt.toISOString(),
    updatedAt: memory.updatedAt.toISOString(),
  };
}

function toSuggestionResponse(suggestion: MemoryUpdateSuggestion): MemorySuggestionResponse {
  return {
    id: suggestion.id,
    memoryId: suggestion.memoryId,
    userId: suggestion.userId,
    recordingId: suggestion.recordingId,
    generationResultId: suggestion.generationResultId,
    suggestionType: suggestion.suggestionType,
    beforeData: suggestion.beforeData,
    afterData: suggestion.afterData,
    reason: suggestion.reason,
    status: suggestion.status,
    createdAt: suggestion.createdAt.toISOString(),
    updatedAt: suggestion.updatedAt.toISOString(),
  };
}

async function findCurrentMemory(userId: string): Promise<Memory | null> {
  return prisma.memory.findFirst({
    where: {
      userId,
      memoryType: personalMemoryType,
      status: 'active',
      deletedAt: null,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });
}

async function findPendingSuggestions(userId: string): Promise<MemoryUpdateSuggestion[]> {
  return prisma.memoryUpdateSuggestion.findMany({
    where: {
      userId,
      status: 'pending',
      suggestionType: 'personal_memory_update',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

function hasLongTermSignal(value: string): boolean {
  const normalized = value.trim();

  if (!normalized) {
    return false;
  }

  const signals = [
    '长期',
    '固定',
    '以后',
    '一直',
    '习惯',
    '偏好',
    '常用',
    '常见任务',
    '工作场景',
    '沟通偏好',
    '岗位',
    '门店',
  ];

  return signals.some((signal) => normalized.includes(signal));
}

function readSuggestionCandidate(body: unknown): {
  longTermInfo: string | null;
  reason: string;
  recordingId: string | null;
  generationResultId: string | null;
} {
  const payload = body as Record<string, unknown> | undefined;
  const explicitLongTermInfo = readString(
    payload?.longTermInfo ?? payload?.long_term_info ?? payload?.persistentInfo,
  );
  const sourceText = readString(payload?.sourceText ?? payload?.source_text ?? payload?.chatText);
  const longTermInfo =
    explicitLongTermInfo ?? (sourceText && hasLongTermSignal(sourceText) ? sourceText : null);

  return {
    longTermInfo,
    reason:
      readString(payload?.reason) ?? '识别到可能长期有效的个人工作信息，需用户确认后写入 Memory。',
    recordingId: readString(payload?.recordingId ?? payload?.recording_id),
    generationResultId: readString(payload?.generationResultId ?? payload?.generation_result_id),
  };
}

function appendLongTermInfo(memory: Memory | null, longTermInfo: string): string {
  const baseContent =
    memory?.contentText ??
    [
      '# 个人 Memory',
      '',
      '## 基础信息',
      '',
      '## 工作背景',
      '',
      '## 常见任务',
      '',
      '## 沟通偏好',
      '',
      '## 长期有效信息',
    ].join('\n');
  const nextItem = `- ${longTermInfo}`;

  if (baseContent.includes(nextItem)) {
    return baseContent;
  }

  if (baseContent.includes('## 长期有效信息')) {
    return baseContent.replace(
      /(## 长期有效信息\s*)/,
      (heading) => `${heading}${heading.endsWith('\n') ? '' : '\n'}${nextItem}\n`,
    );
  }

  return `${baseContent.trim()}\n\n## 长期有效信息\n${nextItem}\n`;
}

function readAfterContent(afterData: unknown): string | null {
  if (!afterData || typeof afterData !== 'object') {
    return null;
  }

  const value = (afterData as Record<string, unknown>).contentText;
  return readString(value);
}

memoryRouter.get('/memory', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const [memory, pendingSuggestions] = await Promise.all([
      findCurrentMemory(currentUser.id),
      findPendingSuggestions(currentUser.id),
    ]);

    sendSuccess<MemoryDetailResponse>(res, {
      memory: memory ? toMemoryResponse(memory) : null,
      pendingSuggestions: pendingSuggestions.map(toSuggestionResponse),
    });
  } catch (error) {
    next(error);
  }
});

memoryRouter.post('/memory/init', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;
    const payload = readInitPayload(req.body);

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    if (!payload) {
      throw new ApiError(
        400,
        'INVALID_MEMORY_INIT_PAYLOAD',
        '城市、门店、岗位、个人背景、工作场景、常见任务、个人偏好不能为空',
      );
    }

    const existingMemory = await findCurrentMemory(currentUser.id);
    if (existingMemory) {
      throw new ApiError(409, 'MEMORY_ALREADY_EXISTS', '个人 Memory 已存在，可直接编辑保存');
    }

    const contentText = buildPersonalMemoryMarkdown(payload);
    const memory = await prisma.memory.create({
      data: {
        userId: currentUser.id,
        storeId: currentUser.currentStoreId,
        memoryType: personalMemoryType,
        title: memoryTitle,
        contentJson: payload as unknown as Prisma.InputJsonObject,
        contentText,
        status: 'active',
      },
    });

    sendSuccess<MemoryResponse>(res, toMemoryResponse(memory), 201);
  } catch (error) {
    next(error);
  }
});

memoryRouter.put('/memory', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;
    const contentText = readString(req.body?.contentText ?? req.body?.content_text);

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    if (!contentText) {
      throw new ApiError(400, 'INVALID_MEMORY_PAYLOAD', 'contentText 不能为空');
    }

    const memory = await findCurrentMemory(currentUser.id);
    if (!memory) {
      throw new ApiError(404, 'MEMORY_NOT_FOUND', '请先初始化个人 Memory');
    }

    const updatedMemory = await prisma.memory.update({
      where: {
        id: memory.id,
      },
      data: {
        contentText,
      },
    });

    sendSuccess<MemoryResponse>(res, toMemoryResponse(updatedMemory));
  } catch (error) {
    next(error);
  }
});

memoryRouter.post('/memory/suggestions', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const memory = await findCurrentMemory(currentUser.id);
    const candidate = readSuggestionCandidate(req.body);
    let createdSuggestion: MemoryUpdateSuggestion | null = null;

    if (candidate.recordingId) {
      const recording = await prisma.recording.findFirst({
        where: {
          id: candidate.recordingId,
          userId: currentUser.id,
          deletedAt: null,
        },
      });

      if (!recording) {
        throw new ApiError(404, 'RECORDING_NOT_FOUND', '录音不存在或无权访问');
      }
    }

    if (candidate.generationResultId) {
      const generationResult = await prisma.generationResult.findFirst({
        where: {
          id: candidate.generationResultId,
          userId: currentUser.id,
          deletedAt: null,
        },
      });

      if (!generationResult) {
        throw new ApiError(404, 'GENERATION_RESULT_NOT_FOUND', '生成结果不存在或无权访问');
      }
    }

    if (candidate.longTermInfo) {
      const nextContentText = appendLongTermInfo(memory, candidate.longTermInfo);
      createdSuggestion = await prisma.memoryUpdateSuggestion.create({
        data: {
          memoryId: memory?.id,
          userId: currentUser.id,
          recordingId: candidate.recordingId,
          generationResultId: candidate.generationResultId,
          suggestionType: 'personal_memory_update',
          beforeData: {
            contentText: memory?.contentText ?? null,
          },
          afterData: {
            contentText: nextContentText,
            longTermInfo: candidate.longTermInfo,
          },
          reason: candidate.reason,
          status: 'pending',
        },
      });
    }

    const pendingSuggestions = await findPendingSuggestions(currentUser.id);

    sendSuccess<MemorySuggestionsResponse>(res, {
      created: Boolean(createdSuggestion),
      suggestion: createdSuggestion ? toSuggestionResponse(createdSuggestion) : null,
      pendingSuggestions: pendingSuggestions.map(toSuggestionResponse),
    });
  } catch (error) {
    next(error);
  }
});

memoryRouter.post('/memory/suggestions/:id/accept', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;
    const suggestionId = req.params.id;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const suggestion = await prisma.memoryUpdateSuggestion.findFirst({
      where: {
        id: suggestionId,
        userId: currentUser.id,
        status: 'pending',
      },
    });

    if (!suggestion) {
      throw new ApiError(404, 'MEMORY_SUGGESTION_NOT_FOUND', '建议不存在、无权访问或已处理');
    }

    const contentText = readAfterContent(suggestion.afterData);
    if (!contentText) {
      throw new ApiError(400, 'INVALID_MEMORY_SUGGESTION', '建议内容为空，无法写入 Memory');
    }

    const memory = suggestion.memoryId
      ? await prisma.memory.findFirst({
          where: {
            id: suggestion.memoryId,
            userId: currentUser.id,
            deletedAt: null,
          },
        })
      : await findCurrentMemory(currentUser.id);

    const result = await prisma.$transaction(async (tx) => {
      const updatedMemory = memory
        ? await tx.memory.update({
            where: {
              id: memory.id,
            },
            data: {
              contentText,
              status: 'active',
            },
          })
        : await tx.memory.create({
            data: {
              userId: currentUser.id,
              storeId: currentUser.currentStoreId,
              memoryType: personalMemoryType,
              title: memoryTitle,
              contentText,
              status: 'active',
            },
          });

      const updatedSuggestion = await tx.memoryUpdateSuggestion.update({
        where: {
          id: suggestion.id,
        },
        data: {
          memoryId: updatedMemory.id,
          status: 'accepted',
        },
      });

      return {
        memory: updatedMemory,
        suggestion: updatedSuggestion,
      };
    });

    sendSuccess(res, {
      memory: toMemoryResponse(result.memory),
      suggestion: toSuggestionResponse(result.suggestion),
    });
  } catch (error) {
    next(error);
  }
});

memoryRouter.post('/memory/suggestions/:id/reject', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;
    const suggestionId = req.params.id;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const suggestion = await prisma.memoryUpdateSuggestion.findFirst({
      where: {
        id: suggestionId,
        userId: currentUser.id,
        status: 'pending',
      },
    });

    if (!suggestion) {
      throw new ApiError(404, 'MEMORY_SUGGESTION_NOT_FOUND', '建议不存在、无权访问或已处理');
    }

    const updatedSuggestion = await prisma.memoryUpdateSuggestion.update({
      where: {
        id: suggestion.id,
      },
      data: {
        status: 'rejected',
      },
    });

    sendSuccess<MemorySuggestionResponse>(res, toSuggestionResponse(updatedSuggestion));
  } catch (error) {
    next(error);
  }
});
