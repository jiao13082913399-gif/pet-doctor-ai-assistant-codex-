import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api-error.js';

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(new ApiError(404, 'NOT_FOUND', `接口不存在：${req.method} ${req.originalUrl}`));
}
