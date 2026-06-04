import type { RequestHandler } from 'express';
import { prisma } from '../db/prisma.js';
import { toCurrentUser } from '../services/user-presenter.js';
import { verifyJwtToken } from '../services/jwt.js';
import { ApiError } from '../utils/api-error.js';

function getBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
    }

    const payload = verifyJwtToken(token);
    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        status: 'active',
      },
    });

    if (!user) {
      throw new ApiError(401, 'UNAUTHORIZED', '登录已过期，请重新登录');
    }

    req.currentUser = toCurrentUser(user);
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }

    next(new ApiError(401, 'UNAUTHORIZED', '登录已过期，请重新登录'));
  }
};
