import { Prisma, type Todo } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { TodoResponse } from '../types/api.js';
import { todoStatuses, type TodoStatus } from '../types/domain.js';
import { ApiError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';

export const todosRouter = Router();

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function hasOwn(body: unknown, key: string): boolean {
  return (
    Boolean(body) && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, key)
  );
}

function readOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ApiError(400, 'INVALID_TODO_PAYLOAD', 'dueTime 必须是 ISO 时间字符串');
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiError(400, 'INVALID_TODO_PAYLOAD', 'dueTime 必须是有效时间');
  }

  return parsedDate;
}

function readStatus(value: unknown): TodoStatus | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !todoStatuses.includes(value as TodoStatus)) {
    throw new ApiError(400, 'INVALID_TODO_STATUS', '待办状态不合法', {
      allowedStatuses: todoStatuses,
    });
  }

  return value as TodoStatus;
}

function toTodoResponse(todo: Todo): TodoResponse {
  return {
    id: todo.id,
    userId: todo.userId,
    recordingId: todo.recordingId,
    generationResultId: todo.generationResultId,
    title: todo.title,
    description: todo.description,
    petOwnerName: todo.petOwnerName,
    petName: todo.petName,
    dueTime: todo.dueTime?.toISOString() ?? null,
    status: todo.status,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}

async function findTodoForCurrentUser(todoId: string, userId: string): Promise<Todo> {
  const todo = await prisma.todo.findFirst({
    where: {
      id: todoId,
      userId,
    },
  });

  if (!todo) {
    throw new ApiError(404, 'TODO_NOT_FOUND', '待办不存在或无权访问');
  }

  return todo;
}

async function resolveRecordingId(input: {
  userId: string;
  recordingId: string | null;
  generationResultId: string | null;
}): Promise<string | null> {
  let recordingId = input.recordingId;

  if (input.generationResultId) {
    const generationResult = await prisma.generationResult.findFirst({
      where: {
        id: input.generationResultId,
        userId: input.userId,
        deletedAt: null,
      },
    });

    if (!generationResult) {
      throw new ApiError(404, 'GENERATION_RESULT_NOT_FOUND', '生成结果不存在或无权访问');
    }

    if (recordingId && recordingId !== generationResult.recordingId) {
      throw new ApiError(
        400,
        'TODO_RELATION_MISMATCH',
        'recordingId 与 generationResultId 不属于同一条录音',
      );
    }

    recordingId = generationResult.recordingId;
  }

  if (recordingId) {
    const recording = await prisma.recording.findFirst({
      where: {
        id: recordingId,
        userId: input.userId,
        deletedAt: null,
      },
    });

    if (!recording) {
      throw new ApiError(404, 'RECORDING_NOT_FOUND', '录音不存在或无权访问');
    }
  }

  return recordingId;
}

todosRouter.post('/todos', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const title = readString(req.body?.title);
    if (!title) {
      throw new ApiError(400, 'INVALID_TODO_PAYLOAD', 'title 不能为空');
    }

    const generationResultId = readString(
      req.body?.generationResultId ?? req.body?.generation_result_id,
    );
    const recordingId = await resolveRecordingId({
      userId: currentUser.id,
      recordingId: readString(req.body?.recordingId ?? req.body?.recording_id),
      generationResultId,
    });
    const dueTime = readOptionalDate(
      hasOwn(req.body, 'dueTime') ? req.body?.dueTime : req.body?.due_time,
    );

    const todo = await prisma.todo.create({
      data: {
        userId: currentUser.id,
        recordingId,
        generationResultId,
        title,
        description: readString(req.body?.description),
        petOwnerName: readString(req.body?.petOwnerName ?? req.body?.pet_owner_name),
        petName: readString(req.body?.petName ?? req.body?.pet_name),
        dueTime: dueTime === undefined ? null : dueTime,
        status: readStatus(req.body?.status) ?? 'pending',
      },
    });

    sendSuccess<TodoResponse>(res, toTodoResponse(todo), 201);
  } catch (error) {
    next(error);
  }
});

todosRouter.get('/todos', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const todos = await prisma.todo.findMany({
      where: {
        userId: currentUser.id,
      },
      orderBy: [{ status: 'asc' }, { dueTime: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });

    sendSuccess<TodoResponse[]>(res, todos.map(toTodoResponse));
  } catch (error) {
    next(error);
  }
});

todosRouter.put('/todos/:id', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const todo = await findTodoForCurrentUser(req.params.id, currentUser.id);
    const generationResultId = hasOwn(req.body, 'generationResultId')
      ? readString(req.body?.generationResultId)
      : hasOwn(req.body, 'generation_result_id')
        ? readString(req.body?.generation_result_id)
        : todo.generationResultId;
    const requestedRecordingId = hasOwn(req.body, 'recordingId')
      ? readString(req.body?.recordingId)
      : hasOwn(req.body, 'recording_id')
        ? readString(req.body?.recording_id)
        : todo.recordingId;
    const recordingId = await resolveRecordingId({
      userId: currentUser.id,
      recordingId: requestedRecordingId,
      generationResultId,
    });
    const dueTime = readOptionalDate(
      hasOwn(req.body, 'dueTime')
        ? req.body?.dueTime
        : hasOwn(req.body, 'due_time')
          ? req.body?.due_time
          : undefined,
    );
    const title = hasOwn(req.body, 'title') ? readString(req.body?.title) : todo.title;

    if (!title) {
      throw new ApiError(400, 'INVALID_TODO_PAYLOAD', 'title 不能为空');
    }

    const updatedTodo = await prisma.todo.update({
      where: {
        id: todo.id,
      },
      data: {
        title,
        description: hasOwn(req.body, 'description')
          ? readString(req.body?.description)
          : todo.description,
        petOwnerName:
          hasOwn(req.body, 'petOwnerName') || hasOwn(req.body, 'pet_owner_name')
            ? readString(req.body?.petOwnerName ?? req.body?.pet_owner_name)
            : todo.petOwnerName,
        petName:
          hasOwn(req.body, 'petName') || hasOwn(req.body, 'pet_name')
            ? readString(req.body?.petName ?? req.body?.pet_name)
            : todo.petName,
        dueTime: dueTime === undefined ? todo.dueTime : dueTime,
        recordingId,
        generationResultId,
        status: readStatus(req.body?.status) ?? todo.status,
      },
    });

    sendSuccess<TodoResponse>(res, toTodoResponse(updatedTodo));
  } catch (error) {
    next(error);
  }
});

todosRouter.post('/todos/:id/complete', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const todo = await findTodoForCurrentUser(req.params.id, currentUser.id);
    const updatedTodo = await prisma.todo.update({
      where: {
        id: todo.id,
      },
      data: {
        status: 'completed',
      },
    });

    sendSuccess<TodoResponse>(res, toTodoResponse(updatedTodo));
  } catch (error) {
    next(error);
  }
});

todosRouter.delete('/todos/:id', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const todo = await findTodoForCurrentUser(req.params.id, currentUser.id);
    const result = await prisma.$transaction(async (tx) => {
      const deletedTodo = await tx.todo.delete({
        where: {
          id: todo.id,
        },
      });

      const auditLog = await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'todo.delete',
          targetType: 'todo',
          targetId: todo.id,
          beforeData: {
            id: todo.id,
            userId: todo.userId,
            recordingId: todo.recordingId,
            generationResultId: todo.generationResultId,
            title: todo.title,
            description: todo.description,
            petOwnerName: todo.petOwnerName,
            petName: todo.petName,
            dueTime: todo.dueTime?.toISOString() ?? null,
            status: todo.status,
          } satisfies Prisma.InputJsonObject,
          afterData: {
            deleted: true,
            deletedAt: new Date().toISOString(),
          },
          ip: req.ip,
          userAgent: req.headers['user-agent'] ?? null,
        },
      });

      return { deletedTodo, auditLog };
    });

    sendSuccess(res, {
      todo: toTodoResponse(result.deletedTodo),
      auditLogId: result.auditLog.id,
    });
  } catch (error) {
    next(error);
  }
});
