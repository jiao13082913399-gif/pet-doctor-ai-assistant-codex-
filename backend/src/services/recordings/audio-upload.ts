import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, relative, resolve } from 'node:path';
import type { Request } from 'express';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/api-error.js';

export type SupportedAudioFormat = 'mp3' | 'wav' | 'm4a';

export interface ParsedAudioUpload {
  file: {
    buffer: Buffer;
    filename: string;
    contentType: string | null;
    format: SupportedAudioFormat;
    sizeBytes: number;
    sha256: string;
  };
  fields: Record<string, string>;
  durationSeconds: number | null;
}

export interface StoredAudioFile {
  audioUrl: string;
  audioFilePath: string;
  storageKey: string;
}

const supportedMimeTypes = new Map<string, SupportedAudioFormat>([
  ['audio/mpeg', 'mp3'],
  ['audio/mp3', 'mp3'],
  ['audio/wav', 'wav'],
  ['audio/wave', 'wav'],
  ['audio/x-wav', 'wav'],
  ['audio/mp4', 'm4a'],
  ['audio/m4a', 'm4a'],
  ['audio/x-m4a', 'm4a'],
]);

const supportedExtensions = new Map<string, SupportedAudioFormat>([
  ['.mp3', 'mp3'],
  ['.wav', 'wav'],
  ['.m4a', 'm4a'],
]);

const rejectedVideoExtensions = new Set(['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v']);

function maxAudioBytes(): number {
  return Math.floor(env.maxAudioSizeMb * 1024 * 1024);
}

function normalizeFieldValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readDurationField(fields: Record<string, string>): number | null {
  const rawValue = fields.durationSeconds ?? fields.duration_seconds ?? fields.audioDuration;
  if (!rawValue) {
    return null;
  }

  const duration = Number(rawValue);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new ApiError(400, 'INVALID_AUDIO_DURATION', '音频时长必须是正数秒');
  }

  return Math.round(duration);
}

function validateDuration(durationSeconds: number | null): void {
  if (durationSeconds !== null && durationSeconds > env.maxAudioDurationSeconds) {
    throw new ApiError(
      413,
      'AUDIO_DURATION_TOO_LONG',
      `音频时长不能超过 ${env.maxAudioDurationSeconds} 秒`,
      {
        maxAudioDurationSeconds: env.maxAudioDurationSeconds,
        durationSeconds,
      },
    );
  }
}

function isMp3(buffer: Buffer): boolean {
  return (
    buffer.subarray(0, 3).toString('ascii') === 'ID3' ||
    (buffer.length >= 2 && buffer[0] === 0xff && [0xfb, 0xf3, 0xf2].includes(buffer[1] ?? 0))
  );
}

function isWav(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WAVE'
  );
}

function isM4a(buffer: Buffer): boolean {
  if (buffer.length < 12 || buffer.subarray(4, 8).toString('ascii') !== 'ftyp') {
    return false;
  }

  const brands = buffer.subarray(8, Math.min(buffer.length, 32)).toString('ascii');
  return /M4A|mp42|isom|iso2/.test(brands);
}

function inferWavDuration(buffer: Buffer): number | null {
  if (!isWav(buffer) || buffer.length < 44) {
    return null;
  }

  const byteRate = buffer.readUInt32LE(28);
  const dataIndex = buffer.indexOf('data', 12, 'ascii');
  if (byteRate <= 0 || dataIndex < 0 || dataIndex + 8 > buffer.length) {
    return null;
  }

  const dataSize = buffer.readUInt32LE(dataIndex + 4);
  return Math.max(1, Math.round(dataSize / byteRate));
}

function detectAudioFormat(
  buffer: Buffer,
  filename: string,
  contentType: string | null,
): SupportedAudioFormat {
  const normalizedContentType = contentType?.split(';')[0]?.trim().toLowerCase() ?? null;
  const extension = extname(filename).toLowerCase();

  if (normalizedContentType?.startsWith('video/') || rejectedVideoExtensions.has(extension)) {
    throw new ApiError(
      415,
      'VIDEO_FILE_NOT_SUPPORTED',
      '不支持上传视频文件，请上传 MP3 / WAV / M4A 音频',
    );
  }

  if (isWav(buffer)) {
    return 'wav';
  }

  if (isMp3(buffer)) {
    return 'mp3';
  }

  if (isM4a(buffer) && (extension === '.m4a' || normalizedContentType?.startsWith('audio/'))) {
    return 'm4a';
  }

  const mimeFormat = normalizedContentType ? supportedMimeTypes.get(normalizedContentType) : null;
  const extensionFormat = supportedExtensions.get(extension);

  if (mimeFormat && (!extensionFormat || extensionFormat === mimeFormat)) {
    return mimeFormat;
  }

  if (
    extensionFormat &&
    (!normalizedContentType || normalizedContentType === 'application/octet-stream')
  ) {
    return extensionFormat;
  }

  throw new ApiError(415, 'UNSUPPORTED_AUDIO_FORMAT', '仅支持 MP3 / WAV / M4A 音频文件');
}

async function readRequestBuffer(req: Request, limitBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > limitBytes) {
      throw new ApiError(413, 'AUDIO_FILE_TOO_LARGE', `音频文件不能超过 ${env.maxAudioSizeMb} MB`, {
        maxAudioSizeMb: env.maxAudioSizeMb,
      });
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

function parseContentDisposition(value: string | undefined): Record<string, string> {
  if (!value) {
    return {};
  }

  return value.split(';').reduce<Record<string, string>>((result, part) => {
    const [rawKey, ...rawValueParts] = part.trim().split('=');
    const key = rawKey.trim();
    const value = rawValueParts.join('=').trim().replace(/^"|"$/g, '');

    if (key && value) {
      result[key] = value;
    }

    return result;
  }, {});
}

function parseMultipart(
  buffer: Buffer,
  boundary: string,
): {
  fields: Record<string, string>;
  file: { buffer: Buffer; filename: string; contentType: string | null } | null;
} {
  const fields: Record<string, string> = {};
  let file: { buffer: Buffer; filename: string; contentType: string | null } | null = null;
  const delimiter = `--${boundary}`;
  const body = buffer.toString('latin1');
  const parts = body.split(delimiter).slice(1, -1);

  for (const rawPart of parts) {
    const part = rawPart.replace(/^\r\n/, '').replace(/\r\n$/, '');
    const headerEndIndex = part.indexOf('\r\n\r\n');

    if (headerEndIndex < 0) {
      continue;
    }

    const rawHeaders = part.slice(0, headerEndIndex);
    const rawContent = part.slice(headerEndIndex + 4);
    const headers = rawHeaders.split('\r\n').reduce<Record<string, string>>((result, header) => {
      const separatorIndex = header.indexOf(':');
      if (separatorIndex < 0) {
        return result;
      }

      result[header.slice(0, separatorIndex).trim().toLowerCase()] = header
        .slice(separatorIndex + 1)
        .trim();
      return result;
    }, {});
    const disposition = parseContentDisposition(headers['content-disposition']);
    const fieldName = disposition.name;

    if (!fieldName) {
      continue;
    }

    if (disposition.filename) {
      file = {
        buffer: Buffer.from(rawContent, 'latin1'),
        filename: basename(disposition.filename),
        contentType: headers['content-type'] ?? null,
      };
      continue;
    }

    fields[fieldName] = rawContent.trim();
  }

  return { fields, file };
}

function parseJsonUpload(body: unknown): {
  fields: Record<string, string>;
  file: { buffer: Buffer; filename: string; contentType: string | null };
} {
  const payload = body as Record<string, unknown> | undefined;
  const audioBase64 = normalizeFieldValue(payload?.audioBase64 ?? payload?.audio_base64);
  const filename = normalizeFieldValue(payload?.filename) ?? `upload-${Date.now()}.m4a`;
  const contentType = normalizeFieldValue(
    payload?.mimeType ?? payload?.mime_type ?? payload?.contentType,
  );

  if (!audioBase64) {
    throw new ApiError(400, 'INVALID_AUDIO_UPLOAD_PAYLOAD', '请提供音频文件或 audioBase64');
  }

  const base64Content = audioBase64.includes(',')
    ? audioBase64.slice(audioBase64.indexOf(',') + 1)
    : audioBase64;

  return {
    fields: Object.entries(payload ?? {}).reduce<Record<string, string>>((result, [key, value]) => {
      const normalizedValue = normalizeFieldValue(value);
      if (normalizedValue && !['audioBase64', 'audio_base64'].includes(key)) {
        result[key] = normalizedValue;
      }
      return result;
    }, {}),
    file: {
      buffer: Buffer.from(base64Content, 'base64'),
      filename,
      contentType,
    },
  };
}

function parseQueryFields(req: Request): Record<string, string> {
  return Object.entries(req.query).reduce<Record<string, string>>((result, [key, value]) => {
    const normalizedValue = Array.isArray(value)
      ? normalizeFieldValue(value[0])
      : normalizeFieldValue(value);
    if (normalizedValue) {
      result[key] = normalizedValue;
    }
    return result;
  }, {});
}

export async function parseAudioUploadRequest(req: Request): Promise<ParsedAudioUpload> {
  const contentType = req.headers['content-type'] ?? '';
  const readLimitBytes = maxAudioBytes() + 1024 * 1024;
  let parsed: {
    fields: Record<string, string>;
    file: { buffer: Buffer; filename: string; contentType: string | null };
  };

  if (contentType.includes('application/json')) {
    parsed = parseJsonUpload(req.body);
  } else if (contentType.includes('multipart/form-data')) {
    const boundary =
      contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[1] ??
      contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[2];
    if (!boundary) {
      throw new ApiError(400, 'INVALID_MULTIPART_UPLOAD', 'multipart/form-data 缺少 boundary');
    }

    const body = await readRequestBuffer(req, readLimitBytes);
    const multipart = parseMultipart(body, boundary);
    if (!multipart.file) {
      throw new ApiError(400, 'INVALID_AUDIO_UPLOAD_PAYLOAD', '请上传音频文件字段 file');
    }

    parsed = {
      fields: multipart.fields,
      file: multipart.file,
    };
  } else if (contentType.startsWith('audio/')) {
    parsed = {
      fields: parseQueryFields(req),
      file: {
        buffer: await readRequestBuffer(req, maxAudioBytes()),
        filename:
          normalizeFieldValue(req.headers['x-file-name']) ??
          normalizeFieldValue(req.query.filename) ??
          `upload-${Date.now()}`,
        contentType,
      },
    };
  } else {
    throw new ApiError(
      415,
      'UNSUPPORTED_UPLOAD_CONTENT_TYPE',
      '请使用 multipart/form-data、audio/* 或 JSON audioBase64 上传音频',
    );
  }

  if (parsed.file.buffer.length === 0) {
    throw new ApiError(400, 'EMPTY_AUDIO_FILE', '音频文件不能为空');
  }

  if (parsed.file.buffer.length > maxAudioBytes()) {
    throw new ApiError(413, 'AUDIO_FILE_TOO_LARGE', `音频文件不能超过 ${env.maxAudioSizeMb} MB`, {
      maxAudioSizeMb: env.maxAudioSizeMb,
    });
  }

  const format = detectAudioFormat(
    parsed.file.buffer,
    parsed.file.filename,
    parsed.file.contentType,
  );
  const durationSeconds = readDurationField(parsed.fields) ?? inferWavDuration(parsed.file.buffer);
  validateDuration(durationSeconds);

  return {
    file: {
      ...parsed.file,
      format,
      sizeBytes: parsed.file.buffer.length,
      sha256: createHash('sha256').update(parsed.file.buffer).digest('hex'),
    },
    fields: parsed.fields,
    durationSeconds,
  };
}

export function readUploadField(
  fields: Record<string, string>,
  camelCaseKey: string,
  snakeCaseKey?: string,
): string | null {
  return fields[camelCaseKey] ?? (snakeCaseKey ? fields[snakeCaseKey] : undefined) ?? null;
}

export async function storeAudioFile(
  userId: string,
  upload: ParsedAudioUpload,
): Promise<StoredAudioFile> {
  const storageKey = `recordings/${userId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${upload.file.format}`;
  const storageRoot = resolve(process.cwd(), env.localStorageDir);
  const audioFilePath = resolve(storageRoot, storageKey);

  await mkdir(dirname(audioFilePath), { recursive: true });
  await writeFile(audioFilePath, upload.file.buffer, { flag: 'wx' });

  return {
    audioUrl: `internal://${storageKey}`,
    audioFilePath,
    storageKey,
  };
}

export function resolveStoredAudioFilePath(audioUrl: string): string {
  if (!audioUrl.startsWith('internal://recordings/')) {
    throw new ApiError(400, 'AUDIO_FILE_NOT_UPLOADED', '该录音尚未完成音频上传');
  }

  const storageKey = audioUrl.slice('internal://'.length);
  const storageRoot = resolve(process.cwd(), env.localStorageDir);
  const audioFilePath = resolve(storageRoot, storageKey);
  const relativePath = relative(storageRoot, audioFilePath);

  if (relativePath.startsWith('..') || relativePath === '' || relativePath.startsWith('/')) {
    throw new ApiError(400, 'INVALID_AUDIO_STORAGE_PATH', '录音音频路径非法');
  }

  return audioFilePath;
}
