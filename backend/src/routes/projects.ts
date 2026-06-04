import { type Project, type ProjectItem } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { ProjectDetailResponse, ProjectItemResponse, ProjectResponse } from '../types/api.js';
import { ApiError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';

export const projectsRouter = Router();

const projectItemTypes = [
  'note',
  'recording',
  'conversation',
  'file',
  'resource',
  'todo',
  'memory',
  'tool_output',
] as const;

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function hasOwn(body: unknown, key: string): boolean {
  return (
    Boolean(body) && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, key)
  );
}

function readOptionalSortOrder(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ApiError(400, 'INVALID_PROJECT_ITEM_PAYLOAD', 'sortOrder 必须是整数');
  }

  return value;
}

function readItemType(value: unknown): (typeof projectItemTypes)[number] {
  const itemType = readString(value) ?? 'note';
  if (!projectItemTypes.includes(itemType as (typeof projectItemTypes)[number])) {
    throw new ApiError(400, 'INVALID_PROJECT_ITEM_TYPE', '项目条目类型不合法', {
      allowedTypes: projectItemTypes,
    });
  }

  return itemType as (typeof projectItemTypes)[number];
}

function toProjectResponse(project: Project): ProjectResponse {
  return {
    id: project.id,
    userId: project.userId,
    storeId: project.storeId,
    name: project.name,
    description: project.description,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    deletedAt: project.deletedAt?.toISOString() ?? null,
  };
}

function toProjectItemResponse(item: ProjectItem): ProjectItemResponse {
  return {
    id: item.id,
    projectId: item.projectId,
    userId: item.userId,
    title: item.title,
    description: item.description,
    itemType: item.itemType,
    status: item.status,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    deletedAt: item.deletedAt?.toISOString() ?? null,
  };
}

async function findProjectForCurrentUser(projectId: string, userId: string): Promise<Project> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
      deletedAt: null,
    },
  });

  if (!project) {
    throw new ApiError(404, 'PROJECT_NOT_FOUND', '项目不存在或无权访问');
  }

  return project;
}

projectsRouter.get('/projects', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const projects = await prisma.project.findMany({
      where: {
        userId: currentUser.id,
        deletedAt: null,
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    sendSuccess<ProjectResponse[]>(res, projects.map(toProjectResponse));
  } catch (error) {
    next(error);
  }
});

projectsRouter.post('/projects', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const name = readString(req.body?.name ?? req.body?.title);
    if (!name) {
      throw new ApiError(400, 'INVALID_PROJECT_PAYLOAD', 'name 不能为空');
    }

    const project = await prisma.project.create({
      data: {
        userId: currentUser.id,
        storeId: currentUser.currentStoreId,
        name,
        description: readString(req.body?.description),
        status: readString(req.body?.status) ?? 'active',
      },
    });

    sendSuccess<ProjectResponse>(res, toProjectResponse(project), 201);
  } catch (error) {
    next(error);
  }
});

projectsRouter.get('/projects/:id', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const project = await findProjectForCurrentUser(req.params.id, currentUser.id);
    const items = await prisma.projectItem.findMany({
      where: {
        projectId: project.id,
        deletedAt: null,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });

    sendSuccess<ProjectDetailResponse>(res, {
      project: toProjectResponse(project),
      items: items.map(toProjectItemResponse),
      futureAssociations: ['recording', 'conversation', 'file', 'resource', 'todo', 'memory'],
    });
  } catch (error) {
    next(error);
  }
});

projectsRouter.put('/projects/:id', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const project = await findProjectForCurrentUser(req.params.id, currentUser.id);
    const name = hasOwn(req.body, 'name') ? readString(req.body?.name) : project.name;

    if (!name) {
      throw new ApiError(400, 'INVALID_PROJECT_PAYLOAD', 'name 不能为空');
    }

    const updatedProject = await prisma.project.update({
      where: {
        id: project.id,
      },
      data: {
        name,
        description: hasOwn(req.body, 'description')
          ? readString(req.body?.description)
          : project.description,
        status: hasOwn(req.body, 'status')
          ? (readString(req.body?.status) ?? 'active')
          : project.status,
      },
    });

    sendSuccess<ProjectResponse>(res, toProjectResponse(updatedProject));
  } catch (error) {
    next(error);
  }
});

projectsRouter.post('/projects/:id/items', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const project = await findProjectForCurrentUser(req.params.id, currentUser.id);
    const title = readString(req.body?.title);
    if (!title) {
      throw new ApiError(400, 'INVALID_PROJECT_ITEM_PAYLOAD', 'title 不能为空');
    }

    const item = await prisma.projectItem.create({
      data: {
        projectId: project.id,
        userId: currentUser.id,
        title,
        description: readString(req.body?.description),
        itemType: readItemType(req.body?.itemType ?? req.body?.item_type),
        status: readString(req.body?.status) ?? 'active',
        sortOrder: readOptionalSortOrder(req.body?.sortOrder ?? req.body?.sort_order) ?? 0,
      },
    });

    sendSuccess<ProjectItemResponse>(res, toProjectItemResponse(item), 201);
  } catch (error) {
    next(error);
  }
});

projectsRouter.get('/projects/:id/items', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const project = await findProjectForCurrentUser(req.params.id, currentUser.id);
    const items = await prisma.projectItem.findMany({
      where: {
        projectId: project.id,
        deletedAt: null,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });

    sendSuccess<ProjectItemResponse[]>(res, items.map(toProjectItemResponse));
  } catch (error) {
    next(error);
  }
});
