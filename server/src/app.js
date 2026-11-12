import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { prisma } from './db/prisma.js';
import { verifyCsrf } from './middleware/csrf.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiters.js';
import { enforceHttps, securityHeaders } from './middleware/security.js';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import settingsRoutes from './routes/settings.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(enforceHttps);
  app.use(securityHeaders);

  const allowedOrigins = [
    env.frontendUrl,
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000',
  ].filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api/', apiLimiter);
  app.use(verifyCsrf);

  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return res.json({ status: 'ok', database: 'connected' });
    } catch {
      return res.status(503).json({ status: 'degraded', database: 'disconnected' });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
