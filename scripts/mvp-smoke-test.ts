import { createRequire } from 'node:module';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Server } from 'node:http';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const tempRoot = resolve('/private/tmp', `pet-doctor-ai-assistant-smoke-${Date.now()}`);
const dbPath = resolve(tempRoot, 'smoke.db');
const storageDir = resolve(tempRoot, 'storage');
const databaseUrl = `file:${dbPath}`;

process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = 'smoke-test-secret-with-enough-length';
process.env.JWT_EXPIRES_IN = '1h';
process.env.LOCAL_STORAGE_DIR = storageDir;
process.env.TRANSCRIPTION_PROVIDER = 'mock';
process.env.TRANSCRIPTION_MODEL_NAME = 'mock-transcription-v1';
process.env.LLM_PROVIDER = 'mock';
process.env.LLM_MODEL_NAME = 'mock-llm-v1';
process.env.MAX_AUDIO_SIZE_MB = '100';
process.env.MAX_AUDIO_DURATION_SECONDS = '1800';

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface AuthResponse {
  token: string;
}

interface RecordingResponse {
  id: string;
  processingStatus: string;
  transcriptText: string | null;
}

interface GenerationResultResponse {
  id: string;
  resultType: string;
  moduleStatus: string;
  status: string;
  version: number;
  contentText: string | null;
}

interface RecordingDetailResponse {
  recording: RecordingResponse;
  generationResults: GenerationResultResponse[];
}

interface DefaultGenerationResponse {
  generationResults: GenerationResultResponse[];
  succeededTypes: string[];
}

interface TodoResponse {
  id: string;
  generationResultId: string | null;
  status: string;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });
  const payload = (await response.json()) as
    | ApiSuccess<T>
    | { success: false; error: { message: string } };

  if (!response.ok || !payload.success) {
    const message = payload.success ? `HTTP ${response.status}` : payload.error.message;
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${message}`);
  }

  return payload.data;
}

function createTinyWav(): Buffer {
  const sampleRate = 8000;
  const seconds = 1;
  const dataSize = sampleRate * seconds * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

async function applyMigration(): Promise<void> {
  await mkdir(tempRoot, { recursive: true });
  await mkdir(storageDir, { recursive: true });

  const require = createRequire(import.meta.url);
  const Database = require('better-sqlite3');
  const db = new Database(dbPath);
  const migrationSql = await readFile(
    resolve(rootDir, 'backend/prisma/migrations/20260529030855_init_schema/migration.sql'),
    'utf8',
  );

  db.exec(migrationSql);
  db.close();
}

async function seedDemoUser(): Promise<void> {
  const { hashPassword } = await import('../backend/src/services/password.js');
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const store = await prisma.store.create({
      data: {
        name: '宠一科技测试门店',
        code: 'SMOKE_STORE_001',
        city: '宁波',
        status: 'active',
      },
    });
    const user = await prisma.user.create({
      data: {
        username: 'demo_doctor',
        passwordHash: await hashPassword('demo_password'),
        phone: '18800000000',
        nickname: '测试医生',
        role: 'doctor',
        position: '主治医生',
        city: '宁波',
        currentStoreId: store.id,
        status: 'active',
      },
    });

    await prisma.userStoreRelation.create({
      data: {
        userId: user.id,
        storeId: store.id,
        role: 'doctor',
        position: '主治医生',
        isDefault: true,
        status: 'active',
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function startServer(): Promise<{ baseUrl: string; server: Server }> {
  const { createApp } = await import('../backend/src/app.js');
  const app = createApp();

  return await new Promise((resolvePromise) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert(address && typeof address === 'object', '无法读取 smoke test 服务端口');
      resolvePromise({
        baseUrl: `http://127.0.0.1:${address.port}/api`,
        server,
      });
    });
  });
}

async function stopServer(server: Server): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    server.close((error) => (error ? reject(error) : resolvePromise()));
  });
}

async function main(): Promise<void> {
  await applyMigration();
  await seedDemoUser();

  const { prisma } = await import('../backend/src/db/prisma.js');
  const { baseUrl, server } = await startServer();

  try {
    const health = await request<{ status: string }>(baseUrl, '/health');
    assert(health.status === 'ok', '健康检查未返回 ok');

    const auth = await request<AuthResponse>(baseUrl, '/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'demo_doctor', password: 'demo_password' }),
    });
    assert(auth.token, '登录未返回 token');

    const token = auth.token;
    const memory = await request<{ memory: { id: string } | null }>(baseUrl, '/memory', { token });
    if (!memory.memory) {
      const initialized = await request<{ id: string }>(baseUrl, '/memory/init', {
        method: 'POST',
        token,
        body: JSON.stringify({
          city: '宁波',
          store: '宠一科技测试门店',
          position: '主治医生',
          personalBackground: '擅长皮肤病复诊和慢病沟通',
          workScenarios: ['复诊沟通'],
          commonTasks: ['生成病历草稿'],
          preferences: '先结论后依据',
        }),
      });
      assert(initialized.id, 'Memory 初始化失败');
    }

    const audioBase64 = createTinyWav().toString('base64');
    const recording = await request<RecordingResponse>(baseUrl, '/recordings/upload', {
      method: 'POST',
      token,
      body: JSON.stringify({
        audioBase64,
        fileName: 'smoke.wav',
        durationSeconds: 1,
        uploadType: 'web_upload',
        petOwnerName: '王女士',
        petName: '小布',
      }),
    });
    assert(recording.id, '音频上传未创建 recording');

    const transcribed = await request<{ recording: RecordingResponse }>(
      baseUrl,
      `/recordings/${recording.id}/transcribe`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({}),
      },
    );
    assert(transcribed.recording.transcriptText, '转写未写入 transcriptText');

    const generated = await request<DefaultGenerationResponse>(
      baseUrl,
      `/recordings/${recording.id}/generate-default-results`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({}),
      },
    );
    assert(generated.generationResults.length === 6, '默认生成结果数量不是 6');
    assert(generated.succeededTypes.length >= 2, '默认生成成功模块不足');

    const risk = await request<{ generationResult: GenerationResultResponse }>(
      baseUrl,
      `/recordings/${recording.id}/generate-risk-control`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({}),
      },
    );
    const team = await request<{ generationResult: GenerationResultResponse }>(
      baseUrl,
      `/recordings/${recording.id}/generate-team-knowledge`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({}),
      },
    );

    const detail = await request<RecordingDetailResponse>(baseUrl, `/recordings/${recording.id}`, {
      token,
    });
    const resultTypes = new Set(detail.generationResults.map((result) => result.resultType));
    for (const type of [
      'medical_record',
      'communication_review',
      'customer_profile',
      'upsell_opportunities',
      'smart_followup',
      'medical_risk_control',
      'team_knowledge',
    ]) {
      assert(resultTypes.has(type), `缺少七大 Tab 结果：${type}`);
    }

    const medicalRecord = detail.generationResults.find(
      (result) => result.resultType === 'medical_record',
    );
    assert(medicalRecord, '缺少病历生成结果');
    const saved = await request<GenerationResultResponse>(
      baseUrl,
      `/generation-results/${medicalRecord.id}/save`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({
          contentText: `${medicalRecord.contentText ?? ''}\n\nSmoke edited.`,
          contentJson: medicalRecord,
          confirmedByUser: true,
          confirmedAt: new Date().toISOString(),
        }),
      },
    );
    assert(saved.status === 'saved', '编辑保存后状态不是 saved');

    const adopted = await request<GenerationResultResponse>(
      baseUrl,
      `/generation-results/${medicalRecord.id}/adopt`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({ reason: 'smoke adopt' }),
      },
    );
    assert(adopted.status === 'adopted' && adopted.confirmedByUser, '采纳结果状态异常');

    const communication = detail.generationResults.find(
      (result) => result.resultType === 'communication_review',
    );
    assert(communication, '缺少沟通复盘结果');
    const rejected = await request<GenerationResultResponse>(
      baseUrl,
      `/generation-results/${communication.id}/reject`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({ reason: '信息不完整' }),
      },
    );
    assert(rejected.status === 'rejected', '不采纳结果状态异常');

    const regenerated = await request<GenerationResultResponse>(
      baseUrl,
      `/generation-results/${communication.id}/regenerate`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({ reason: 'smoke regenerate' }),
      },
    );
    assert(regenerated.version > communication.version, '重新生成没有递增版本');

    assert(risk.generationResult.moduleStatus === 'completed', '医疗风险防控主动生成失败');
    assert(team.generationResult.moduleStatus === 'completed', '团队经验共享主动生成失败');

    const followup = detail.generationResults.find(
      (result) => result.resultType === 'smart_followup',
    );
    assert(followup, '缺少智能回访结果');
    const todo = await request<TodoResponse>(baseUrl, '/todos', {
      method: 'POST',
      token,
      body: JSON.stringify({
        title: 'Smoke 回访',
        description: '来自 smoke test 的智能回访待办',
        generationResultId: followup.id,
        dueTime: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
    assert(todo.generationResultId === followup.id, '智能回访转待办未关联生成结果');

    const todos = await request<TodoResponse[]>(baseUrl, '/todos', { token });
    assert(
      todos.some((item) => item.id === todo.id),
      '历史待办列表未返回 smoke 待办',
    );

    const recordings = await request<RecordingResponse[]>(baseUrl, '/recordings', { token });
    assert(
      recordings.some((item) => item.id === recording.id),
      '历史记录列表未返回 smoke 录音',
    );

    const exportSource = await request<RecordingDetailResponse>(
      baseUrl,
      `/recordings/${recording.id}`,
      { token },
    );
    assert(
      exportSource.generationResults.some(
        (result) => result.resultType === 'customer_profile' && result.contentText,
      ),
      '客户画像导出数据源缺失',
    );

    console.log('MVP smoke test passed.');
  } finally {
    await stopServer(server);
    await prisma.$disconnect();
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch(async (error) => {
  console.error(error);
  await rm(tempRoot, { recursive: true, force: true });
  process.exit(1);
});
