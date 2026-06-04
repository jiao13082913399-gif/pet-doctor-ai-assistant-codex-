import {
  API_BASE_URL,
  type ApiErrorResponse,
  type ApiSuccessResponse,
  readStoredToken,
} from './auth';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: RequestMethod;
  data?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
}

interface UploadAudioOptions {
  filePath: string;
  fileName?: string;
  durationSeconds?: number | null;
  uploadType: string;
  petOwnerName?: string;
  petName?: string;
}

export class MiniApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number | null;

  constructor(message: string, options: { code: string; statusCode?: number | null }) {
    super(message);
    this.code = options.code;
    this.statusCode = options.statusCode ?? null;
  }
}

function buildAuthHeaders(
  headers: Record<string, string> = {},
  auth = true,
): Record<string, string> {
  const token = readStoredToken();
  return {
    ...headers,
    ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function readApiPayload<T>(statusCode: number, data: unknown): T {
  const result = data as ApiSuccessResponse<T> | ApiErrorResponse;

  if (statusCode < 200 || statusCode >= 300 || !result?.success) {
    const message =
      result && !result.success ? result.error.message : `接口请求失败：HTTP ${statusCode}`;
    throw new MiniApiError(message, {
      code: result && !result.success ? result.error.code : `HTTP_${statusCode}`,
      statusCode,
    });
  }

  return result.data;
}

export function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method,
      data: options.data as string | AnyObject | ArrayBuffer | undefined,
      header: buildAuthHeaders(options.headers, options.auth),
      success: (response) => {
        try {
          resolve(readApiPayload<T>(response.statusCode, response.data));
        } catch (error) {
          reject(error);
        }
      },
      fail: (error) =>
        reject(
          new MiniApiError(error.errMsg || '网络请求失败', {
            code: 'NETWORK_INTERRUPTED',
          }),
        ),
    });
  });
}

export function uploadAudioFile<T>(options: UploadAudioOptions): Promise<T> {
  const formData: Record<string, string> = {
    uploadType: options.uploadType,
  };

  if (typeof options.durationSeconds === 'number' && Number.isFinite(options.durationSeconds)) {
    formData.durationSeconds = String(Math.max(1, Math.round(options.durationSeconds)));
  }

  if (options.petOwnerName?.trim()) {
    formData.petOwnerName = options.petOwnerName.trim();
  }

  if (options.petName?.trim()) {
    formData.petName = options.petName.trim();
  }

  return new Promise<T>((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}/recordings/upload`,
      filePath: options.filePath,
      name: 'file',
      fileName: options.fileName ?? 'mini-program-recording.mp3',
      formData,
      header: buildAuthHeaders(),
      success: (response) => {
        try {
          const parsed =
            typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
          resolve(readApiPayload<T>(response.statusCode, parsed));
        } catch (error) {
          reject(error);
        }
      },
      fail: (error) =>
        reject(
          new MiniApiError(error.errMsg || '音频上传失败', {
            code: 'NETWORK_INTERRUPTED',
          }),
        ),
    });
  });
}
