export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';
export const TOKEN_STORAGE_KEY = 'pet_doctor_ai_assistant_token';
export const PRIVACY_ACK_STORAGE_PREFIX = 'pet_doctor_ai_assistant_privacy_ack_';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  phone?: string | null;
  nickname: string | null;
  avatar?: string | null;
  role?: string;
  position?: string | null;
  city?: string | null;
  currentStoreId?: string | null;
  isDirector?: boolean;
  lastLoginAt?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokenResponse {
  token: string;
  user: UserProfile;
}

export function readStoredToken(): string {
  const value = uni.getStorageSync(TOKEN_STORAGE_KEY);
  return typeof value === 'string' ? value : '';
}

export function writeStoredToken(value: string): void {
  if (value) {
    uni.setStorageSync(TOKEN_STORAGE_KEY, value);
    return;
  }

  uni.removeStorageSync(TOKEN_STORAGE_KEY);
}

function getPrivacyAcknowledgementKey(userId: string): string {
  return `${PRIVACY_ACK_STORAGE_PREFIX}${userId}`;
}

export function hasAcknowledgedPrivacy(userId: string): boolean {
  return uni.getStorageSync(getPrivacyAcknowledgementKey(userId)) === 'true';
}

export function writePrivacyAcknowledgement(userId: string): void {
  // TODO: Extend this to sync with a backend user privacy acknowledgement field.
  uni.setStorageSync(getPrivacyAcknowledgementKey(userId), 'true');
}

export function goLogin(): void {
  uni.reLaunch({
    url: '/pages/login/login',
  });
}

export function goWorkspace(): void {
  // #ifdef MP-WEIXIN
  uni.switchTab({
    url: '/pages/home/home',
  });
  return;
  // #endif

  uni.reLaunch({
    url: '/pages/index/index',
  });
}
