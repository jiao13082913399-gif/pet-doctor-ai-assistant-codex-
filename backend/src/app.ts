import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandlerMiddleware } from './middleware/error-handler.js';
import { notFoundMiddleware } from './middleware/not-found.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { aiRouter } from './routes/ai.js';
import { auditLogsRouter } from './routes/audit-logs.js';
import { authRouter } from './routes/auth.js';
import { customToolsRouter } from './routes/custom-tools.js';
import { generationResultsRouter } from './routes/generation-results.js';
import { healthRouter } from './routes/health.js';
import { memoryRouter } from './routes/memory.js';
import { projectsRouter } from './routes/projects.js';
import { recordingsRouter } from './routes/recordings.js';
import { resourcesRouter } from './routes/resources.js';
import { todosRouter } from './routes/todos.js';

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(requestIdMiddleware);

  app.use('/api', healthRouter);
  app.use('/api', authRouter);
  app.use('/api', auditLogsRouter);
  app.use('/api', aiRouter);
  app.use('/api', memoryRouter);
  app.use('/api', generationResultsRouter);
  app.use('/api', recordingsRouter);
  app.use('/api', todosRouter);
  app.use('/api', customToolsRouter);
  app.use('/api', projectsRouter);
  app.use('/api', resourcesRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
