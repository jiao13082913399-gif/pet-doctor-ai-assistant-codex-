import { Router } from 'express';
import { sendSuccess } from '../utils/api-response.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  sendSuccess(res, {
    status: 'ok',
    service: 'pet-doctor-ai-assistant-api',
    timestamp: new Date().toISOString(),
  });
});
