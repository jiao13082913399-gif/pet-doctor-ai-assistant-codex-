import type { ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/api-error.js';

export const errorHandlerMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  const apiError =
    error instanceof ApiError
      ? error
      : new ApiError(500, 'INTERNAL_SERVER_ERROR', '服务器内部错误');

  if (!(error instanceof ApiError)) {
    console.error(`[${req.requestId}]`, error);
  }

  res.status(apiError.statusCode).json({
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details === undefined ? {} : { details: apiError.details }),
    },
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
};
