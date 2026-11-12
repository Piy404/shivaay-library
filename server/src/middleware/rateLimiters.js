import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 250,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 200 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please wait 15 minutes and try again.' },
});

export const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 200 : 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many sensitive requests. Please try again later.' },
});
