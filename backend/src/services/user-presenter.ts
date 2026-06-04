import type { User } from '@prisma/client';
import type { UserProfile } from '../types/api.js';

export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    username: user.username,
    phone: user.phone,
    nickname: user.nickname,
    avatar: user.avatar,
    role: user.role,
    position: user.position,
    city: user.city,
    currentStoreId: user.currentStoreId,
    isDirector: user.isDirector,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toCurrentUser(user: User): Express.CurrentUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    currentStoreId: user.currentStoreId,
    isDirector: user.isDirector,
    status: user.status,
  };
}
