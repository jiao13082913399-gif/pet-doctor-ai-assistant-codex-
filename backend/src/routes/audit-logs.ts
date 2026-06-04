import type { AuditLog } from '@prisma/client';
import { Router } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuditLogResponse } from '../types/api.js';
import { ApiError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';

export const auditLogsRouter = Router();

function toAuditLogResponse(auditLog: AuditLog): AuditLogResponse {
  return {
    id: auditLog.id,
    userId: auditLog.userId,
    action: auditLog.action,
    targetType: auditLog.targetType,
    targetId: auditLog.targetId,
    beforeData: auditLog.beforeData,
    afterData: auditLog.afterData,
    createdAt: auditLog.createdAt.toISOString(),
    ip: auditLog.ip,
    userAgent: auditLog.userAgent,
  };
}

function readPositiveInteger(value: unknown, fallback: number, max: number): number {
  const parsedValue = Number(value ?? fallback);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.min(parsedValue, max);
}

auditLogsRouter.get('/audit-logs', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const canAccessAuditLogs =
      env.nodeEnv === 'development' || currentUser.role === 'admin' || currentUser.isDirector;
    if (!canAccessAuditLogs) {
      throw new ApiError(403, 'AUDIT_LOGS_FORBIDDEN', '审计日志仅允许管理员或开发环境访问');
    }

    const limit = readPositiveInteger(req.query.limit, 100, 200);
    const auditLogs = await prisma.auditLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    sendSuccess<AuditLogResponse[]>(res, auditLogs.map(toAuditLogResponse));
  } catch (error) {
    next(error);
  }
});
