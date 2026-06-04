import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  applyGenerationFeedback,
  deleteGenerationResult,
  regenerateGenerationResult,
  saveGenerationResultContent,
  toGenerationResultResponse,
  type GenerationResultContentUpdate,
} from '../services/generation-results/result-actions.js';
import type { GenerationResultResponse } from '../types/api.js';
import { generationRejectReasons } from '../types/domain.js';
import { ApiError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';

export const generationResultsRouter = Router();

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function hasOwn(body: unknown, key: string): boolean {
  return (
    Boolean(body) && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, key)
  );
}

function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }

  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false;
  }

  throw new ApiError(400, 'INVALID_CONFIRMATION_PAYLOAD', 'confirmedByUser 必须是布尔值');
}

function readOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ApiError(400, 'INVALID_CONFIRMATION_PAYLOAD', 'confirmedAt 必须是 ISO 时间字符串');
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiError(400, 'INVALID_CONFIRMATION_PAYLOAD', 'confirmedAt 必须是有效时间');
  }

  return parsedDate;
}

function readContentUpdate(body: unknown): GenerationResultContentUpdate {
  const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const contentText = payload.contentText ?? payload.content_text;
  if (contentText !== undefined && typeof contentText !== 'string') {
    throw new ApiError(400, 'INVALID_GENERATION_RESULT_PAYLOAD', 'contentText 必须是字符串');
  }

  const hasContentJson = hasOwn(payload, 'contentJson') || hasOwn(payload, 'content_json');
  const confirmedByUser = readOptionalBoolean(payload.confirmedByUser ?? payload.confirmed_by_user);
  const confirmedAt = readOptionalDate(payload.confirmedAt ?? payload.confirmed_at);

  return {
    title: readString(payload.title) ?? undefined,
    contentText,
    hasContentJson,
    contentJson: hasOwn(payload, 'contentJson') ? payload.contentJson : payload.content_json,
    hasConfirmedByUser: confirmedByUser !== undefined,
    confirmedByUser,
    confirmedAt,
  };
}

async function saveGenerationResult(req: Request, res: Response) {
  const currentUser = req.currentUser;

  if (!currentUser) {
    throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
  }

  const result = await saveGenerationResultContent({
    generationResultId: req.params.id,
    userId: currentUser.id,
    update: readContentUpdate(req.body),
    audit: {
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    },
  });

  sendSuccess<GenerationResultResponse>(res, toGenerationResultResponse(result));
}

generationResultsRouter.put('/generation-results/:id', requireAuth, async (req, res, next) => {
  try {
    await saveGenerationResult(req, res);
  } catch (error) {
    next(error);
  }
});

generationResultsRouter.post(
  '/generation-results/:id/save',
  requireAuth,
  async (req, res, next) => {
    try {
      await saveGenerationResult(req, res);
    } catch (error) {
      next(error);
    }
  },
);

generationResultsRouter.post(
  '/generation-results/:id/adopt',
  requireAuth,
  async (req, res, next) => {
    try {
      const currentUser = req.currentUser;

      if (!currentUser) {
        throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
      }

      const result = await applyGenerationFeedback({
        generationResultId: req.params.id,
        userId: currentUser.id,
        action: 'adopt',
        reason: readString(req.body?.reason),
        customReason: readString(req.body?.customReason ?? req.body?.custom_reason),
        audit: {
          ip: req.ip,
          userAgent: req.headers['user-agent'] ?? null,
        },
      });

      sendSuccess<GenerationResultResponse>(res, toGenerationResultResponse(result));
    } catch (error) {
      next(error);
    }
  },
);

generationResultsRouter.post(
  '/generation-results/:id/reject',
  requireAuth,
  async (req, res, next) => {
    try {
      const currentUser = req.currentUser;

      if (!currentUser) {
        throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
      }

      const result = await applyGenerationFeedback({
        generationResultId: req.params.id,
        userId: currentUser.id,
        action: 'reject',
        reason: readString(req.body?.reason),
        customReason: readString(req.body?.customReason ?? req.body?.custom_reason),
        audit: {
          ip: req.ip,
          userAgent: req.headers['user-agent'] ?? null,
        },
      });

      sendSuccess<GenerationResultResponse>(res, toGenerationResultResponse(result));
    } catch (error) {
      next(error);
    }
  },
);

generationResultsRouter.post(
  '/generation-results/:id/regenerate',
  requireAuth,
  async (req, res, next) => {
    try {
      const currentUser = req.currentUser;

      if (!currentUser) {
        throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
      }

      const result = await regenerateGenerationResult({
        generationResultId: req.params.id,
        userId: currentUser.id,
        reason: readString(req.body?.reason) ?? '重新生成',
        customReason: readString(req.body?.customReason ?? req.body?.custom_reason),
        audit: {
          ip: req.ip,
          userAgent: req.headers['user-agent'] ?? null,
        },
      });

      sendSuccess<GenerationResultResponse>(res, toGenerationResultResponse(result));
    } catch (error) {
      next(error);
    }
  },
);

generationResultsRouter.delete('/generation-results/:id', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const result = await deleteGenerationResult({
      generationResultId: req.params.id,
      userId: currentUser.id,
      audit: {
        ip: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      },
    });

    sendSuccess<GenerationResultResponse>(res, toGenerationResultResponse(result));
  } catch (error) {
    next(error);
  }
});

generationResultsRouter.get('/generation-results/reject-reasons', requireAuth, (_req, res) => {
  sendSuccess(res, {
    reasons: generationRejectReasons,
  });
});
