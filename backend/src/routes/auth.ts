import { createHash, randomBytes } from 'node:crypto';
import type { User } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../services/password.js';
import { signJwtToken } from '../services/jwt.js';
import { toUserProfile } from '../services/user-presenter.js';
import type { AuthTokenResponse } from '../types/api.js';
import { ApiError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';

const wechatProvider = 'wechat_mock';

export const authRouter = Router();

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function createAuthResponse(user: User): AuthTokenResponse {
  return {
    token: signJwtToken({ id: user.id, username: user.username }),
    user: toUserProfile(user),
  };
}

function createWechatUsername(openid: string): string {
  const digest = createHash('sha256').update(openid).digest('hex').slice(0, 12);
  return `wechat_${digest}`;
}

authRouter.post('/auth/login', async (req, res, next) => {
  try {
    const username = readString(req.body?.username);
    const password = readString(req.body?.password);

    if (!username || !password) {
      throw new ApiError(400, 'INVALID_LOGIN_PAYLOAD', '用户名和密码不能为空');
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || user.status !== 'active') {
      throw new ApiError(401, 'INVALID_CREDENTIALS', '用户名或密码错误');
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', '用户名或密码错误');
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    sendSuccess(res, createAuthResponse(updatedUser));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/auth/logout', requireAuth, (_req, res) => {
  sendSuccess(res, { loggedOut: true });
});

authRouter.get('/auth/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.currentUser?.id,
        status: 'active',
      },
    });

    if (!user) {
      throw new ApiError(401, 'UNAUTHORIZED', '登录已过期，请重新登录');
    }

    sendSuccess(res, toUserProfile(user));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/auth/wechat-login', async (req, res, next) => {
  try {
    const openid = readString(req.body?.openid);
    const unionid = readString(req.body?.unionid);
    const userId = readString(req.body?.userId);
    const nickname = readString(req.body?.nickname);
    const avatar = readString(req.body?.avatar);

    if (!openid) {
      throw new ApiError(400, 'INVALID_WECHAT_PAYLOAD', 'openid 不能为空');
    }

    const existingBinding = await prisma.userAuthBinding.findUnique({
      where: {
        provider_providerUserId: {
          provider: wechatProvider,
          providerUserId: openid,
        },
      },
      include: {
        user: true,
      },
    });

    if (existingBinding && existingBinding.user.status !== 'active') {
      throw new ApiError(401, 'WECHAT_USER_DISABLED', '该微信身份绑定的用户已停用');
    }

    if (existingBinding) {
      const updatedUser = await prisma.user.update({
        where: { id: existingBinding.userId },
        data: { lastLoginAt: new Date() },
      });

      sendSuccess(res, createAuthResponse(updatedUser));
      return;
    }

    const user = await prisma.$transaction(async (tx) => {
      if (userId) {
        const targetUser = await tx.user.findFirst({
          where: {
            id: userId,
            status: 'active',
          },
        });

        if (!targetUser) {
          throw new ApiError(404, 'USER_NOT_FOUND', '指定用户不存在或已停用');
        }

        await tx.userAuthBinding.create({
          data: {
            userId: targetUser.id,
            authType: 'wechat',
            provider: wechatProvider,
            providerUserId: openid,
            unionId: unionid,
            status: 'active',
          },
        });

        return tx.user.update({
          where: { id: targetUser.id },
          data: { lastLoginAt: new Date() },
        });
      }

      const createdUser = await tx.user.create({
        data: {
          username: createWechatUsername(openid),
          passwordHash: await hashPassword(randomBytes(32).toString('hex')),
          nickname,
          avatar,
          role: 'doctor',
          status: 'active',
          lastLoginAt: new Date(),
        },
      });

      await tx.userAuthBinding.create({
        data: {
          userId: createdUser.id,
          authType: 'wechat',
          provider: wechatProvider,
          providerUserId: openid,
          unionId: unionid,
          status: 'active',
        },
      });

      return createdUser;
    });

    sendSuccess(res, createAuthResponse(user));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/auth/bind-wechat', requireAuth, async (req, res, next) => {
  try {
    const currentUser = req.currentUser;
    const openid = readString(req.body?.openid);
    const unionid = readString(req.body?.unionid);

    if (!currentUser) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    if (!openid) {
      throw new ApiError(400, 'INVALID_WECHAT_PAYLOAD', 'openid 不能为空');
    }

    const existingBinding = await prisma.userAuthBinding.findUnique({
      where: {
        provider_providerUserId: {
          provider: wechatProvider,
          providerUserId: openid,
        },
      },
    });

    if (existingBinding && existingBinding.userId !== currentUser.id) {
      throw new ApiError(409, 'WECHAT_ALREADY_BOUND', '该微信身份已绑定其他用户');
    }

    const binding = existingBinding
      ? await prisma.userAuthBinding.update({
          where: { id: existingBinding.id },
          data: {
            unionId: unionid,
            status: 'active',
          },
        })
      : await prisma.userAuthBinding.create({
          data: {
            userId: currentUser.id,
            authType: 'wechat',
            provider: wechatProvider,
            providerUserId: openid,
            unionId: unionid,
            status: 'active',
          },
        });

    sendSuccess(res, {
      id: binding.id,
      userId: binding.userId,
      authType: binding.authType,
      provider: binding.provider,
      providerUserId: binding.providerUserId,
      unionId: binding.unionId,
      status: binding.status,
      createdAt: binding.createdAt.toISOString(),
      updatedAt: binding.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});
