<template>
  <view class="page">
    <view class="header">
      <text class="eyebrow">AI 录音</text>
      <text class="title">接诊录音与结果查看</text>
      <text class="subtitle">录音、上传、转写和七个结果 Tab 均复用 Web 端同一套后端 API。</text>
    </view>

    <view v-if="error" class="state state-error">
      <text>{{ error }}</text>
      <button
        v-if="retryAction"
        class="primary-button retry-button"
        :disabled="busy"
        @click="runRetryAction"
      >
        {{ retryAction.label }}
      </button>
    </view>

    <view class="action-panel">
      <button class="primary-button" :disabled="busy" @click="toggleRecording">
        {{ isRecording ? '结束录音' : '开始录音' }}
      </button>
      <button class="secondary-button" :disabled="busy || isRecording" @click="chooseAudio">
        上传音频
      </button>
      <text class="permission-note">请先取得沟通对象同意录音，并遵守门店及当地隐私要求。</text>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">最近录音记录</text>
        <button class="link-button" :disabled="busy" @click="loadRecordings">刷新</button>
      </view>

      <view v-if="loadingRecordings" class="state">
        <text>正在加载录音...</text>
      </view>
      <view v-else-if="recordings.length === 0" class="state">
        <text>暂无录音，完成录音或上传音频后会显示在这里。</text>
      </view>
      <view v-else class="recording-list">
        <view
          v-for="recording in recordings"
          :key="recording.id"
          class="recording-row"
          :class="{ active: selectedRecordingId === recording.id }"
          @click="selectRecording(recording.id)"
        >
          <view class="recording-main">
            <text class="recording-title">{{ formatRecordingTitle(recording) }}</text>
            <text class="recording-meta">{{ formatDate(recording.createdAt) }}</text>
          </view>
          <text class="status-pill">{{ statusLabel(recording.processingStatus) }}</text>
          <button
            v-if="recording.processingStatus === 'failed'"
            class="link-button retry-link"
            :disabled="busy"
            @click.stop="retryRecordingProcess(recording.id)"
          >
            重新尝试
          </button>
        </view>
      </view>
    </view>

    <view v-if="recordingDetail" class="section detail-section">
      <text class="section-title">录音结果查看</text>
      <view class="detail-card">
        <text class="detail-title">{{ formatRecordingTitle(recordingDetail.recording) }}</text>
        <text class="detail-meta"
          >状态：{{ statusLabel(recordingDetail.recording.processingStatus) }}</text
        >
        <text class="detail-meta">转写：</text>
        <text class="transcript">{{ recordingDetail.transcriptText || '暂无转写文本' }}</text>
      </view>

      <scroll-view class="tabs" scroll-x>
        <button
          v-for="tab in generationTabs"
          :key="tab.type"
          class="tab-button"
          :class="{ active: activeGenerationType === tab.type }"
          @click="activeGenerationType = tab.type"
        >
          {{ tab.label }}
        </button>
      </scroll-view>

      <view class="result-card">
        <text class="safety-note">AI 生成内容仅供辅助，需人工确认。</text>
        <text v-if="requiresStrongSafetyPrompt" class="strong-safety-note">
          {{ strongSafetyPrompt }}
        </text>
        <text class="result-title">{{ activeGeneration?.title || activeGenerationLabel }}</text>
        <text v-if="activeGeneration" class="result-status">
          {{ moduleStatusLabel(activeGeneration.moduleStatus) }} · v{{ activeGeneration.version }}
        </text>
        <text class="result-body">{{ activeGenerationText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type {
  GenerationResultResponse,
  RecordingDefaultGenerationResponse,
  RecordingDetailResponse,
  RecordingResponse,
} from '../../types/mini-api';
import { MiniApiError, apiRequest, uploadAudioFile } from '../../utils/api';
import { goLogin, readStoredToken } from '../../utils/auth';

type GenerationTabType =
  | 'medical_record'
  | 'communication_review'
  | 'customer_profile'
  | 'upsell_opportunities'
  | 'smart_followup'
  | 'medical_risk_control'
  | 'team_knowledge';

const generationTabs: Array<{ type: GenerationTabType; label: string }> = [
  { type: 'medical_record', label: '病历自动生成' },
  { type: 'communication_review', label: '沟通复盘' },
  { type: 'customer_profile', label: '客户画像' },
  { type: 'upsell_opportunities', label: '升单机会' },
  { type: 'smart_followup', label: '智能回访' },
  { type: 'medical_risk_control', label: '风险防控' },
  { type: 'team_knowledge', label: '团队经验' },
];

const error = ref('');
const retryAction = ref<{ label: string; run: () => Promise<void> | void } | null>(null);
const busy = ref(false);
const isRecording = ref(false);
const loadingRecordings = ref(false);
const recordings = ref<RecordingResponse[]>([]);
const selectedRecordingId = ref('');
const recordingDetail = ref<RecordingDetailResponse | null>(null);
const activeGenerationType = ref<GenerationTabType>('medical_record');
let recorderManager: any = null;
let recordStartTime = 0;

const activeGeneration = computed<GenerationResultResponse | null>(() => {
  return (
    recordingDetail.value?.generationResults.find(
      (result) => result.resultType === activeGenerationType.value,
    ) ?? null
  );
});

const activeGenerationLabel = computed(() => {
  return generationTabs.find((tab) => tab.type === activeGenerationType.value)?.label ?? '生成结果';
});

const activeGenerationText = computed(() => {
  if (!activeGeneration.value) {
    return activeGenerationType.value === 'medical_risk_control' ||
      activeGenerationType.value === 'team_knowledge'
      ? '该模块需主动生成，第一版小程序端先展示入口和状态。'
      : '暂无生成结果，请先完成录音转写和默认生成。';
  }

  return activeGeneration.value.contentText || '该结果暂无文本内容。';
});

const requiresStrongSafetyPrompt = computed(() => {
  if (
    activeGenerationType.value === 'medical_record' ||
    activeGenerationType.value === 'medical_risk_control'
  ) {
    return true;
  }

  const text = `${activeGeneration.value?.title ?? ''}\n${activeGeneration.value?.contentText ?? ''}\n${JSON.stringify(
    activeGeneration.value?.contentJson ?? {},
  )}`;
  return /用药|药物|剂量|处方|禁忌/.test(text);
});

const strongSafetyPrompt = computed(() =>
  activeGenerationType.value === 'medical_risk_control'
    ? '该内容涉及医疗风险识别，只能作为风险提醒，请由具备资质的兽医或负责人确认后使用。'
    : '该内容涉及病历、风险或用药相关判断，请由具备资质的兽医或负责人确认后使用。',
);

function formatErrorMessage(currentError: unknown, fallback: string): string {
  if (currentError instanceof MiniApiError) {
    if (currentError.code === 'NETWORK_INTERRUPTED') {
      return '网络中断，请检查网络连接后重新尝试。';
    }

    if (currentError.code === 'UNAUTHORIZED') {
      goLogin();
      return '登录已过期，请重新登录后再继续处理。';
    }

    if (
      currentError.code === 'UNSUPPORTED_AUDIO_FORMAT' ||
      currentError.code === 'VIDEO_FILE_NOT_SUPPORTED'
    ) {
      return '文件格式不支持，请上传 MP3 / WAV / M4A 音频文件。';
    }

    return currentError.message;
  }

  return currentError instanceof Error && currentError.message.trim()
    ? currentError.message
    : fallback;
}

function setError(
  message: string,
  action: { label: string; run: () => Promise<void> | void } | null = null,
): void {
  error.value = message;
  retryAction.value = action;
}

function clearError(): void {
  clearError();
  retryAction.value = null;
}

async function runRetryAction(): Promise<void> {
  await retryAction.value?.run();
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    uploading: '上传中',
    uploaded: '已上传',
    transcribing: '转写中',
    generating: '生成中',
    completed: '已完成',
    failed: '失败',
  };

  return labels[status] ?? status;
}

function moduleStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '等待生成',
    generating: '生成中',
    completed: '已完成',
    failed: '生成失败',
    regenerated: '已重新生成',
  };

  return labels[status] ?? status;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

function formatRecordingTitle(recording: RecordingResponse): string {
  const owner = recording.petOwnerName || '未绑定宠主';
  const pet = recording.petName || '未绑定宠物';
  return `${owner} · ${pet}`;
}

function ensureAuthed(): boolean {
  if (!readStoredToken()) {
    goLogin();
    return false;
  }

  return true;
}

function getRecorderManager(): any {
  if (!recorderManager) {
    recorderManager = uni.getRecorderManager();
    recorderManager.onStop((result: { tempFilePath: string; duration?: number }) => {
      isRecording.value = false;
      const durationSeconds =
        typeof result.duration === 'number'
          ? result.duration / 1000
          : (Date.now() - recordStartTime) / 1000;
      void uploadRecordedAudio(result.tempFilePath, durationSeconds);
    });
    recorderManager.onError((result: { errMsg?: string }) => {
      isRecording.value = false;
      setError(`录音失败：${result.errMsg || '请重新尝试或改为上传音频。'}`, {
        label: '重新尝试录音',
        run: toggleRecording,
      });
    });
  }

  return recorderManager;
}

function authorizeRecord(): Promise<void> {
  // 微信小程序录音必须使用 scope.record 授权；上线前还需要在小程序后台和隐私弹窗中说明录音用途。
  return new Promise((resolve, reject) => {
    uni.authorize({
      scope: 'scope.record',
      success: () => resolve(),
      fail: () => reject(new Error('未获得录音权限，请在微信设置中允许麦克风权限')),
    });
  });
}

async function toggleRecording(): Promise<void> {
  if (!ensureAuthed() || busy.value) {
    return;
  }

  error.value = '';

  if (isRecording.value) {
    getRecorderManager().stop();
    return;
  }

  try {
    const consentConfirmed = await confirmModal(
      '录音同意确认',
      '开始录音前，请确认已取得沟通对象同意，并会遵守门店及当地隐私要求。是否继续？',
    );
    if (!consentConfirmed) {
      return;
    }

    await authorizeRecord();
    recordStartTime = Date.now();
    getRecorderManager().start({
      duration: 10 * 60 * 1000,
      format: 'mp3',
    });
    isRecording.value = true;
  } catch (currentError) {
    setError(`录音失败：${formatErrorMessage(currentError, '录音权限获取失败。')}`, {
      label: '重新尝试录音',
      run: toggleRecording,
    });
  }
}

function confirmModal(title: string, content: string): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      success: (result) => resolve(Boolean(result.confirm)),
      fail: () => resolve(false),
    });
  });
}

async function uploadRecordedAudio(filePath: string, durationSeconds: number): Promise<void> {
  await uploadAndProcessAudio(
    filePath,
    'mini-program-recording.mp3',
    durationSeconds,
    'mp_weixin_recording',
  );
}

async function chooseAudio(): Promise<void> {
  if (!ensureAuthed() || busy.value) {
    return;
  }

  const chooseMessageFile = (uni as any).chooseMessageFile as
    | ((options: {
        count: number;
        type: string;
        success: (result: {
          tempFiles: Array<{ path: string; name?: string; size?: number }>;
        }) => void;
        fail: (error: { errMsg?: string }) => void;
      }) => void)
    | undefined;

  if (!chooseMessageFile) {
    setError('上传失败：当前平台暂不支持选择本地音频文件。');
    return;
  }

  chooseMessageFile({
    count: 1,
    type: 'file',
    success: (result) => {
      const file = result.tempFiles[0];
      if (!file?.path) {
        setError('上传失败：未选择音频文件。', {
          label: '重新选择文件',
          run: chooseAudio,
        });
        return;
      }

      const fileName = file.name || 'mini-program-upload.mp3';
      if (!/\.(mp3|wav|m4a)$/i.test(fileName)) {
        setError('文件格式不支持：仅支持 MP3 / WAV / M4A 音频文件。', {
          label: '重新选择文件',
          run: chooseAudio,
        });
        return;
      }

      void uploadAndProcessAudio(file.path, fileName, null, 'mp_weixin_upload');
    },
    fail: (currentError) => {
      setError(`上传失败：${currentError.errMsg || '选择音频失败。'}`, {
        label: '重新选择文件',
        run: chooseAudio,
      });
    },
  });
}

async function uploadAndProcessAudio(
  filePath: string,
  fileName: string,
  durationSeconds: number | null,
  uploadType: string,
): Promise<void> {
  busy.value = true;
  clearError();

  try {
    const recording = await uploadAudioFile<RecordingResponse>({
      filePath,
      fileName,
      durationSeconds,
      uploadType,
    });

    await transcribeAndGenerate(recording.id);
    await loadRecordings();
    await selectRecording(recording.id);
  } catch (currentError) {
    if (!retryAction.value) {
      setError(`上传失败：${formatErrorMessage(currentError, '处理音频失败。')}`, {
        label: '重新上传',
        run: chooseAudio,
      });
    }
  } finally {
    busy.value = false;
  }
}

async function transcribeAndGenerate(recordingId: string): Promise<void> {
  try {
    await apiRequest(`/recordings/${recordingId}/transcribe`, { method: 'POST' });
  } catch (currentError) {
    setError(`转写失败：${formatErrorMessage(currentError, '语音转写失败。')}`, {
      label: '重新处理',
      run: () => retryRecordingProcess(recordingId),
    });
    throw currentError;
  }

  try {
    await apiRequest<RecordingDefaultGenerationResponse>(
      `/recordings/${recordingId}/generate-default-results`,
      { method: 'POST' },
    );
  } catch (currentError) {
    setError(`AI 生成失败：${formatErrorMessage(currentError, 'AI 生成失败。')}`, {
      label: '重新处理',
      run: () => retryRecordingProcess(recordingId),
    });
    throw currentError;
  }
}

async function retryRecordingProcess(recordingId: string): Promise<void> {
  busy.value = true;
  clearError();

  try {
    await apiRequest(`/recordings/${recordingId}/retry`, { method: 'POST' });
    await transcribeAndGenerate(recordingId);
    await loadRecordings();
    await selectRecording(recordingId);
  } catch (currentError) {
    if (!retryAction.value) {
      setError(`重新处理失败：${formatErrorMessage(currentError, '重新处理失败。')}`, {
        label: '再次重新处理',
        run: () => retryRecordingProcess(recordingId),
      });
    }
  } finally {
    busy.value = false;
  }
}

async function loadRecordings(): Promise<void> {
  if (!ensureAuthed()) {
    return;
  }

  loadingRecordings.value = true;
  clearError();

  try {
    recordings.value = await apiRequest<RecordingResponse[]>('/recordings');
    if (!selectedRecordingId.value && recordings.value[0]) {
      await selectRecording(recordings.value[0].id);
    }
  } catch (currentError) {
    setError(`加载录音失败：${formatErrorMessage(currentError, '加载录音失败。')}`, {
      label: '重新加载',
      run: loadRecordings,
    });
  } finally {
    loadingRecordings.value = false;
  }
}

async function selectRecording(id: string): Promise<void> {
  selectedRecordingId.value = id;

  try {
    recordingDetail.value = await apiRequest<RecordingDetailResponse>(`/recordings/${id}`);
  } catch (currentError) {
    setError(`加载录音详情失败：${formatErrorMessage(currentError, '加载录音详情失败。')}`, {
      label: '重新加载详情',
      run: () => selectRecording(id),
    });
  }
}

onMounted(() => {
  void loadRecordings();
});

onUnmounted(() => {
  if (isRecording.value && recorderManager) {
    recorderManager.stop();
  }
});
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 18px;
  background: #f6f8fb;
}

.header,
.section,
.action-panel {
  margin-bottom: 16px;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
.permission-note,
.recording-meta,
.detail-meta,
.result-status {
  color: #667085;
  font-size: 13px;
  line-height: 21px;
}

.action-panel,
.detail-card,
.result-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
}

.primary-button,
.secondary-button {
  width: 100%;
  margin: 0;
  border-radius: 6px;
  font-size: 15px;
  line-height: 42px;
}

.primary-button {
  color: #ffffff;
  background: #0f766e;
}

.secondary-button {
  color: #0f3d3e;
  border: 1px solid #9cc9c2;
  background: #f0fdfa;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title {
  color: #344054;
  font-size: 15px;
  font-weight: 700;
  line-height: 23px;
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
  color: #475467;
  font-size: 14px;
  line-height: 22px;
  background: #ffffff;
}

.state-error {
  margin-bottom: 12px;
  color: #b42318;
  background: #fff4f2;
}

.retry-button {
  margin-top: 10px;
}

.recording-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recording-row {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
  text-align: left;
}

.retry-link {
  flex-shrink: 0;
  color: #b42318;
}

.recording-row.active {
  border-color: #0f766e;
  background: #f0fdfa;
}

.recording-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.recording-title,
.detail-title,
.result-title {
  color: #101828;
  font-size: 15px;
  font-weight: 700;
  line-height: 23px;
}

.status-pill {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  color: #0f766e;
  font-size: 12px;
  line-height: 18px;
  background: #ccfbf1;
}

.transcript,
.result-body {
  white-space: pre-wrap;
  color: #344054;
  font-size: 14px;
  line-height: 22px;
}

.safety-note,
.strong-safety-note {
  display: block;
  padding: 9px 10px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 20px;
}

.safety-note {
  color: #075985;
  border: 1px solid #bae6fd;
  background: #f0f9ff;
}

.strong-safety-note {
  color: #7a4b00;
  border: 1px solid #f6d7a8;
  background: #fff7e6;
}

.tabs {
  width: 100%;
  margin: 12px 0;
  white-space: nowrap;
}

.tab-button {
  display: inline-flex;
  width: auto;
  margin: 0 8px 0 0;
  padding: 0 12px;
  border: 1px solid #d8dee9;
  border-radius: 999px;
  color: #475467;
  font-size: 13px;
  line-height: 32px;
  background: #ffffff;
}

.tab-button.active {
  color: #ffffff;
  border-color: #0f766e;
  background: #0f766e;
}
</style>
