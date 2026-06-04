<template>
  <view class="login-page">
    <view class="login-card">
      <view class="brand">
        <text class="brand-title">宠物医生 AI 医助</text>
        <text class="brand-subtitle">一线接诊沟通工作台</text>
      </view>

      <view class="form">
        <!-- #ifdef MP-WEIXIN -->
        <button class="primary-button" :disabled="loading" @click="wechatLogin">
          {{ loading ? '微信登录中...' : '微信 mock 登录' }}
        </button>
        <view class="hint">
          <text
            >小程序第一版对接后端 mock wechat-login，真实审核上线前再接微信 code 换 openid
            服务。</text
          >
        </view>
        <!-- #endif -->

        <!-- #ifndef MP-WEIXIN -->
        <label class="field">
          <text>账号</text>
          <input v-model="loginForm.username" class="input" placeholder="请输入账号" />
        </label>
        <label class="field">
          <text>密码</text>
          <input
            v-model="loginForm.password"
            class="input"
            password
            placeholder="请输入密码"
            @confirm="login"
          />
        </label>
        <view v-if="error" class="state state-error">
          <text>{{ error }}</text>
        </view>
        <button class="primary-button" :disabled="loading" @click="login">
          {{ loading ? '登录中...' : '登录并进入工作台' }}
        </button>
        <!-- #endif -->
      </view>

      <!-- #ifndef MP-WEIXIN -->
      <view class="hint">
        <text>测试账号：demo_doctor / demo_password</text>
      </view>
      <!-- #endif -->
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import {
  API_BASE_URL,
  type ApiErrorResponse,
  type ApiSuccessResponse,
  type AuthTokenResponse,
  type UserProfile,
  goWorkspace,
  readStoredToken,
  writeStoredToken,
} from '../../utils/auth';
import { apiRequest } from '../../utils/api';

const loading = ref(false);
const error = ref('');
const WECHAT_OPENID_STORAGE_KEY = 'pet_doctor_ai_assistant_mock_wechat_openid';
const loginForm = reactive({
  username: 'demo_doctor',
  password: 'demo_password',
});

async function requestLogin(): Promise<AuthTokenResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(loginForm),
  });
  const result = (await response.json()) as
    | ApiSuccessResponse<AuthTokenResponse>
    | ApiErrorResponse;

  if (!response.ok || !result.success) {
    throw new Error(result.success ? `HTTP ${response.status}` : result.error.message);
  }

  return result.data;
}

async function login(): Promise<void> {
  if (!loginForm.username.trim() || !loginForm.password.trim()) {
    error.value = '请输入账号和密码';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const result = await requestLogin();
    writeStoredToken(result.token);
    goWorkspace();
  } catch (currentError) {
    error.value = `登录失败：${currentError instanceof Error ? currentError.message : '未知错误'}`;
  } finally {
    loading.value = false;
  }
}

function requestWechatCode(): Promise<string> {
  return new Promise((resolve) => {
    uni.login({
      provider: 'weixin',
      success: (result) => resolve(result.code || ''),
      fail: () => resolve(''),
    });
  });
}

function readOrCreateMockOpenid(code: string): string {
  const stored = uni.getStorageSync(WECHAT_OPENID_STORAGE_KEY);
  if (typeof stored === 'string' && stored.trim()) {
    return stored;
  }

  const openid = `mock-mp-${code || Date.now()}`;
  uni.setStorageSync(WECHAT_OPENID_STORAGE_KEY, openid);
  return openid;
}

async function readCurrentUserIfPossible(): Promise<UserProfile | null> {
  if (!readStoredToken()) {
    return null;
  }

  try {
    return await apiRequest<UserProfile>('/auth/me');
  } catch {
    return null;
  }
}

async function wechatLogin(): Promise<void> {
  loading.value = true;
  error.value = '';

  try {
    const [code, currentUser] = await Promise.all([
      requestWechatCode(),
      readCurrentUserIfPossible(),
    ]);
    const openid = readOrCreateMockOpenid(code);
    const result = await apiRequest<AuthTokenResponse>('/auth/wechat-login', {
      method: 'POST',
      auth: false,
      data: {
        openid,
        unionid: `${openid}-union`,
        userId: currentUser?.id,
        nickname: currentUser?.nickname || '微信小程序用户',
        avatar: currentUser?.avatar || undefined,
      },
    });
    writeStoredToken(result.token);
    goWorkspace();
  } catch (currentError) {
    error.value = `微信登录失败：${currentError instanceof Error ? currentError.message : '未知错误'}`;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (readStoredToken()) {
    goWorkspace();
    return;
  }

  // #ifdef MP-WEIXIN
  void wechatLogin();
  // #endif
});
</script>

<style scoped lang="scss">
.login-page {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f5f7fb;
}

.login-card {
  width: min(420px, 100%);
  padding: 28px;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 24px;
}

.brand-title {
  color: #101828;
  font-size: 24px;
  font-weight: 700;
  line-height: 32px;
}

.brand-subtitle,
.hint {
  color: #667085;
  font-size: 14px;
  line-height: 22px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #344054;
  font-size: 14px;
  line-height: 22px;
}

.input {
  box-sizing: border-box;
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #cfd7e3;
  border-radius: 6px;
  color: #101828;
  font-size: 14px;
  line-height: 22px;
  background: #ffffff;
}

.primary-button {
  margin: 0;
  padding: 0 14px;
  border: 0;
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  line-height: 40px;
  background: #0f766e;
}

.state {
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  line-height: 22px;
}

.state-error {
  color: #b42318;
  background: #fff4f2;
}

.hint {
  margin-top: 18px;
}
</style>
