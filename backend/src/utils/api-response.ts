import type { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
    requestId: res.req.requestId,
    timestamp: new Date().toISOString(),
  });
}
