<template>
  <view class="page">
    <view class="profile-panel">
      <text class="eyebrow">我的</text>
      <text class="title">{{ userDisplayName }}</text>
      <text class="subtitle">账号 ID：{{ currentUser?.id || '未登录' }}</text>
      <button class="secondary-button" @click="refreshPage">刷新信息</button>
    </view>

    <view v-if="error" class="state state-error">
      <text>{{ error }}</text>
    </view>

    <view class="section">
      <text class="section-title">个人信息</text>
      <view class="info-grid">
        <view class="info-row">
          <text class="info-label">角色</text>
          <text class="info-value">{{ currentUser?.role || '--' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">岗位</text>
          <text class="info-value">{{ currentUser?.position || '--' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">城市</text>
          <text class="info-value">{{ currentUser?.city || '--' }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">Memory Markdown 文件</text>
        <button class="link-button" @click="loadMemory">重新加载</button>
      </view>
      <view class="memory-card">
        <text v-if="memoryLoading" class="memory-text">正在加载 Memory...</text>
        <text v-else class="memory-text">{{ memoryText }}</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">账号设置</text>
      <view class="entry-list">
        <button class="entry-row" @click="showComingSoon('账号设置')">
          <text>账号与门店设置</text>
          <text class="entry-status">占位</text>
        </button>
        <button class="entry-row" @click="goOralAi">
          <text>口述 AI 生成助手</text>
          <text class="entry-status">进入 AI 页</text>
        </button>
        <button class="entry-row" @click="showComingSoon('看板模块')">
          <text>看板模块</text>
          <text class="entry-status">暂未开放</text>
        </button>
      </view>
    </view>

    <button class="logout-button" @click="logout">退出当前账号</button>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { MemoryDetailResponse, UserProfile } from '../../types/mini-api';
import { apiRequest } from '../../utils/api';
import { goLogin, readStoredToken, writeStoredToken } from '../../utils/auth';

const currentUser = ref<UserProfile | null>(null);
const memory = ref<MemoryDetailResponse | null>(null);
const loading = ref(false);
const memoryLoading = ref(false);
const error = ref('');

const userDisplayName = computed(() => {
  return currentUser.value?.nickname || currentUser.value?.username || '未登录用户';
});

const memoryText = computed(() => {
  return (
    memory.value?.memory?.contentText ||
    '尚未初始化个人 Memory，可先在 Web 端或后续小程序 Memory 编辑页补充。'
  );
});

function ensureAuthed(): boolean {
  if (!readStoredToken()) {
    goLogin();
    return false;
  }

  return true;
}

async function loadCurrentUser(): Promise<void> {
  if (!ensureAuthed()) {
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    currentUser.value = await apiRequest<UserProfile>('/auth/me');
  } catch (currentError) {
    error.value = `加载个人信息失败：${currentError instanceof Error ? currentError.message : '未知错误'}`;
  } finally {
    loading.value = false;
  }
}

async function loadMemory(): Promise<void> {
  if (!ensureAuthed()) {
    return;
  }

  memoryLoading.value = true;
  error.value = '';

  try {
    memory.value = await apiRequest<MemoryDetailResponse>('/memory');
  } catch (currentError) {
    error.value = `加载 Memory 失败：${currentError instanceof Error ? currentError.message : '未知错误'}`;
  } finally {
    memoryLoading.value = false;
  }
}

async function refreshPage(): Promise<void> {
  await loadCurrentUser();
  await loadMemory();
}

function goOralAi(): void {
  uni.switchTab({
    url: '/pages/ai/ai',
  });
}

function showComingSoon(title: string): void {
  uni.showToast({
    title: `${title}暂未开放`,
    icon: 'none',
  });
}

function logout(): void {
  writeStoredToken('');
  goLogin();
}

onMounted(() => {
  void refreshPage();
});
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 18px;
  background: #f6f8fb;
}

.profile-panel,
.section {
  margin-bottom: 16px;
}

.profile-panel,
.memory-card,
.info-grid,
.entry-list {
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
}

.profile-panel {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 16px;
}

.eyebrow {
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
}

.title {
  color: #101828;
  font-size: 24px;
  font-weight: 700;
  line-height: 32px;
}

.subtitle,
.info-label,
.entry-status {
  color: #667085;
  font-size: 13px;
  line-height: 21px;
}

.secondary-button,
.logout-button {
  width: 100%;
  margin: 6px 0 0;
  border-radius: 6px;
  font-size: 14px;
  line-height: 38px;
}

.secondary-button {
  color: #0f3d3e;
  border: 1px solid #9cc9c2;
  background: #f0fdfa;
}

.logout-button {
  color: #b42318;
  border: 1px solid #fecaca;
  background: #fff4f2;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title {
  display: block;
  margin-bottom: 10px;
  color: #344054;
  font-size: 15px;
  font-weight: 700;
  line-height: 23px;
}

.section-header .section-title {
  margin-bottom: 0;
}

.link-button {
  margin: 0;
  padding: 0 10px;
  color: #0f766e;
  font-size: 13px;
  line-height: 30px;
  background: transparent;
}

.state {
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 22px;
}

.state-error {
  margin-bottom: 12px;
  color: #b42318;
  background: #fff4f2;
}

.info-grid {
  overflow: hidden;
}

.info-row,
.entry-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 46px;
  padding: 0 14px;
  border-bottom: 1px solid #eef2f6;
}

.info-row:last-child,
.entry-row:last-child {
  border-bottom: 0;
}

.info-value,
.entry-row {
  color: #101828;
  font-size: 14px;
  line-height: 22px;
}

.memory-card {
  max-height: 280px;
  padding: 14px;
  overflow: hidden;
}

.memory-text {
  white-space: pre-wrap;
  color: #344054;
  font-size: 13px;
  line-height: 21px;
}

.entry-list {
  overflow: hidden;
}

.entry-row {
  width: 100%;
  margin: 0;
  border-radius: 0;
  background: #ffffff;
  text-align: left;
}
</style>
