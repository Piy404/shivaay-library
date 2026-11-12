import { env } from '../config/env.js';

export function notFoundHandler(req, res) {
  return res.status(404).json({ message: 'Endpoint not found' });
}

export function errorHandler(err, req, res, _next) {
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Origin not permitted by CORS policy' });
  }

  if (err?.code === 'P2002') {
    return res.status(409).json({ message: 'A record with this unique value already exists' });
  }

  if (err?.code === 'P2025') {
    return res.status(404).json({ message: 'Requested record not found' });
  }

  if (!env.isTest) {
    console.error('[API Error]', err);
  }

  const status = err.statusCode || err.status || 500;
  return res.status(status).json({
    message: status >= 500 ? 'Internal server error' : err.message || 'Request failed',
  });
}
