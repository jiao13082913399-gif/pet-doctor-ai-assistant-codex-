import { type Resource } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type {
  DirectorDashboardPlaceholderResponse,
  ResourceResponse,
  ResourcesPlaceholderResponse,
} from '../types/api.js';
import { ApiError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';

export const resourcesRouter = Router();

const futureResourceTypes = [
  'copywriting',
  'image',
  'report',
  'tool_generated_asset',
  'skill_package_output',
] as const;

const directorMetricCards = [
  { key: 'recordingCount', label: '录音次数' },
  { key: 'medicalRecordGenerationCount', label: '病历生成次数' },
  { key: 'followupSuggestionCount', label: '回访建议数' },
  { key: 'upsellOpportunityCount', label: '升单机会数' },
  { key: 'todoCount', label: '待办事项数' },
  { key: 'pendingFollowupCustomerCount', label: '待回访客户数' },
] as const;

function toResourceResponse(resource: Resource): ResourceResponse {
  return {
    id: resource.id,
    userId: resource.userId,
    storeId: resource.storeId,
    projectId: resource.projectId,
    title: resource.title,
    resourceType: resource.resourceType,
    url: resource.url,
    contentText: resource.contentText,
    metadataJson: resource.metadataJson,
    status: resource.status,
    createdAt: resource.createdAt.toISOString(),
    updatedAt: resource.updatedAt.toISOString(),
    deletedAt: resource.deletedAt?.toISOString() ?? null,
  };
}

resourcesRouter.get('/resources', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const resources = await prisma.resource.findMany({
      where: {
        userId: currentUser.id,
        deletedAt: null,
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    sendSuccess<ResourcesPlaceholderResponse>(res, {
      status: 'placeholder',
      message: '资源库暂未开放，未来用于存放工具生成内容。',
      futureTypes: [...futureResourceTypes],
      resources: resources.map(toResourceResponse),
    });
  } catch (error) {
    next(error);
  }
});

resourcesRouter.get('/director-dashboard', requireAuth, async (req, res, next) => {
  try {
    if (!req.currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    sendSuccess<DirectorDashboardPlaceholderResponse>(res, {
      status: 'placeholder',
      message: '数据统计能力即将上线',
      metrics: directorMetricCards.map((metric) => ({
        ...metric,
        value: null,
        placeholder: true,
      })),
    });
  } catch (error) {
    next(error);
  }
});
