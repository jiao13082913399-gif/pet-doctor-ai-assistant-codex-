import { randomUUID } from 'node:crypto';
import { Prisma, type CustomToolRequirement } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type {
  CustomToolConversationResponse,
  CustomToolMessageResponse,
  CustomToolRequirementResponse,
} from '../types/api.js';
import { ApiError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';

export const customToolsRouter = Router();

type ConversationMessageRole = 'user' | 'assistant';

interface ConversationMessage {
  id: string;
  role: ConversationMessageRole;
  content: string;
  createdAt: string;
}

interface CustomToolConversation {
  id: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

const conversations = new Map<string, CustomToolConversation>();

const questionBank = [
  '这个工具主要给谁使用？是医生、前台、院长，还是运营同事？',
  '你希望它解决的核心问题是什么？请用一个具体场景描述现在最麻烦的地方。',
  '现在人工处理这件事大概分几步？哪些步骤最耗时或最容易出错？',
  '你希望用户输入哪些信息？例如录音、病例、客户资料、商品方案或门店规则。',
  '工具最终应该输出什么？例如表格、话术、提醒、报告、待办或可直接复制的文本。',
  '这个工具多久会用一次？每天、每周、每次接诊后，还是遇到特定情况才用？',
  '它需要调用哪些已有资料？例如个人 Memory、录音转写、客户画像、资源库或门店知识。',
  '你会用什么标准判断这个工具已经好用？请给出 2 到 3 条验收标准。',
];

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function hasOwn(body: unknown, key: string): boolean {
  return (
    Boolean(body) && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, key)
  );
}

function createMessage(role: ConversationMessageRole, content: string): ConversationMessage {
  return {
    id: randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function getNextQuestion(answerCount: number): string {
  return questionBank[Math.min(answerCount, questionBank.length - 1)];
}

function findConversation(conversationId: string, userId: string): CustomToolConversation {
  const conversation = conversations.get(conversationId);

  if (!conversation || conversation.userId !== userId) {
    throw new ApiError(404, 'CUSTOM_TOOL_CONVERSATION_NOT_FOUND', '自建工具对话不存在或无权访问');
  }

  return conversation;
}

function userMessages(conversation: CustomToolConversation): string[] {
  return conversation.messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content);
}

function pickAnswer(answers: string[], index: number, fallback: string): string {
  return answers[index]?.trim() || fallback;
}

function buildRequirementFromConversation(conversation: CustomToolConversation): {
  title: string;
  requirementJson: Prisma.InputJsonObject;
  requirementText: string;
} {
  const answers = userMessages(conversation);
  const firstAnswer = pickAnswer(answers, 0, '自建工具');
  const title = firstAnswer.length > 28 ? `${firstAnswer.slice(0, 28)}...` : firstAnswer;
  const role = pickAnswer(answers, 1, '宠物医院一线人员');
  const problem = pickAnswer(answers, 2, firstAnswer);
  const scenario = pickAnswer(answers, 3, '接诊、回访或门店运营中需要快速整理信息的场景');
  const currentFlow = pickAnswer(answers, 4, '当前主要依赖人工记录、人工整理和人工复制粘贴');
  const expectedInput = pickAnswer(answers, 5, '用户描述、录音转写、客户资料或门店规则');
  const expectedOutput = pickAnswer(answers, 6, '结构化结果、可复制话术、待办或报告草稿');
  const frequency = pickAnswer(answers, 7, '按需使用');
  const dataSources = pickAnswer(answers, 8, '个人 Memory、录音结果、客户画像、资源库或门店知识');
  const acceptance = pickAnswer(
    answers,
    9,
    '输出内容结构清晰；用户可以直接复制或保存；关键医疗内容有人工确认提示',
  );
  const requirementJson: Prisma.InputJsonObject = {
    userRole: role,
    problem,
    scenario,
    currentFlow,
    expectedInput,
    expectedOutput,
    frequency,
    dataSources,
    acceptanceCriteria: acceptance,
    sourceConversationId: conversation.id,
  };
  const requirementText = `# 工具需求文档

## 使用者角色
${role}

## 想解决的问题
${problem}

## 使用场景
${scenario}

## 当前流程
${currentFlow}

## 期望输入
${expectedInput}

## 期望输出
${expectedOutput}

## 触发频率
${frequency}

## 需要调用的数据或资料
${dataSources}

## 验收标准
${acceptance}`;

  return {
    title: title || '自建工具需求',
    requirementJson,
    requirementText,
  };
}

function toRequirementResponse(requirement: CustomToolRequirement): CustomToolRequirementResponse {
  return {
    id: requirement.id,
    userId: requirement.userId,
    recordingId: requirement.recordingId,
    generationResultId: requirement.generationResultId,
    title: requirement.title,
    description: requirement.description,
    requirementJson: requirement.requirementJson,
    requirementText: requirement.requirementText,
    status: requirement.status,
    createdAt: requirement.createdAt.toISOString(),
    updatedAt: requirement.updatedAt.toISOString(),
    deletedAt: requirement.deletedAt?.toISOString() ?? null,
  };
}

async function findRequirementForCurrentUser(
  requirementId: string,
  userId: string,
): Promise<CustomToolRequirement> {
  const requirement = await prisma.customToolRequirement.findFirst({
    where: {
      id: requirementId,
      userId,
      deletedAt: null,
    },
  });

  if (!requirement) {
    throw new ApiError(404, 'CUSTOM_TOOL_REQUIREMENT_NOT_FOUND', '需求文档不存在或无权访问');
  }

  return requirement;
}

customToolsRouter.post('/custom-tools/conversations', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const initialMessage = readString(
      req.body?.initialMessage ?? req.body?.initial_message ?? req.body?.message,
    );
    if (!initialMessage) {
      throw new ApiError(400, 'INVALID_CUSTOM_TOOL_PAYLOAD', 'initialMessage 不能为空');
    }

    const now = new Date().toISOString();
    const conversation: CustomToolConversation = {
      id: randomUUID(),
      userId: currentUser.id,
      messages: [
        createMessage('user', initialMessage),
        createMessage('assistant', getNextQuestion(0)),
      ],
      createdAt: now,
      updatedAt: now,
    };

    conversations.set(conversation.id, conversation);

    sendSuccess<CustomToolConversationResponse>(res, conversation, 201);
  } catch (error) {
    next(error);
  }
});

customToolsRouter.post(
  '/custom-tools/conversations/:id/message',
  requireAuth,
  async (req, res, next) => {
    try {
      const currentUser = req.currentUser;

      if (!currentUser) {
        throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
      }

      const content = readString(req.body?.content ?? req.body?.message);
      if (!content) {
        throw new ApiError(400, 'INVALID_CUSTOM_TOOL_PAYLOAD', 'content 不能为空');
      }

      const conversation = findConversation(req.params.id, currentUser.id);
      const userMessage = createMessage('user', content);
      const assistantMessage = createMessage(
        'assistant',
        getNextQuestion(userMessages(conversation).length),
      );

      conversation.messages.push(userMessage, assistantMessage);
      conversation.updatedAt = new Date().toISOString();

      sendSuccess<CustomToolMessageResponse>(res, {
        conversationId: conversation.id,
        userMessage,
        assistantMessage,
        messages: conversation.messages,
      });
    } catch (error) {
      next(error);
    }
  },
);

customToolsRouter.post(
  '/custom-tools/conversations/:id/generate-requirement',
  requireAuth,
  async (req, res, next) => {
    try {
      const currentUser = req.currentUser;

      if (!currentUser) {
        throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
      }

      const conversation = findConversation(req.params.id, currentUser.id);
      const generated = buildRequirementFromConversation(conversation);

      const requirement = await prisma.customToolRequirement.create({
        data: {
          userId: currentUser.id,
          title: generated.title || '自建工具需求',
          description: userMessages(conversation)[0] ?? null,
          requirementJson: generated.requirementJson,
          requirementText: generated.requirementText,
          status: 'generated',
        },
      });

      sendSuccess<CustomToolRequirementResponse>(res, toRequirementResponse(requirement), 201);
    } catch (error) {
      next(error);
    }
  },
);

customToolsRouter.get('/custom-tools/requirements', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const requirements = await prisma.customToolRequirement.findMany({
      where: {
        userId: currentUser.id,
        deletedAt: null,
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    sendSuccess<CustomToolRequirementResponse[]>(res, requirements.map(toRequirementResponse));
  } catch (error) {
    next(error);
  }
});

customToolsRouter.get('/custom-tools/requirements/:id', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const requirement = await findRequirementForCurrentUser(req.params.id, currentUser.id);

    sendSuccess<CustomToolRequirementResponse>(res, toRequirementResponse(requirement));
  } catch (error) {
    next(error);
  }
});

customToolsRouter.put('/custom-tools/requirements/:id', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const requirement = await findRequirementForCurrentUser(req.params.id, currentUser.id);
    const title = hasOwn(req.body, 'title') ? readString(req.body?.title) : requirement.title;
    const requirementText = hasOwn(req.body, 'requirementText')
      ? readString(req.body?.requirementText)
      : hasOwn(req.body, 'requirement_text')
        ? readString(req.body?.requirement_text)
        : requirement.requirementText;

    if (!title) {
      throw new ApiError(400, 'INVALID_CUSTOM_TOOL_PAYLOAD', 'title 不能为空');
    }

    const updatedRequirement = await prisma.customToolRequirement.update({
      where: {
        id: requirement.id,
      },
      data: {
        title,
        description: hasOwn(req.body, 'description')
          ? readString(req.body?.description)
          : requirement.description,
        requirementText,
        requirementJson:
          hasOwn(req.body, 'requirementJson') || hasOwn(req.body, 'requirement_json')
            ? ((req.body?.requirementJson ?? req.body?.requirement_json) as Prisma.InputJsonValue)
            : requirement.requirementJson === null
              ? Prisma.JsonNull
              : (requirement.requirementJson as Prisma.InputJsonValue),
        status: 'generated',
      },
    });

    sendSuccess<CustomToolRequirementResponse>(res, toRequirementResponse(updatedRequirement));
  } catch (error) {
    next(error);
  }
});
